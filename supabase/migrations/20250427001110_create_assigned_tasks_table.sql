-- supabase/migrations/20250427001110_create_assigned_tasks_table.sql

-- Define ENUM type for verification status
CREATE TYPE public.verification_status AS ENUM (
    'pending',
    'verified',
    'partial',
    'incomplete'
);

-- == Create Assigned Tasks Table ==
CREATE TABLE public.assigned_tasks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id uuid NOT NULL, -- FK added below
    assigned_by_id uuid NOT NULL, -- FK added below
    assigned_date timestamptz NOT NULL DEFAULT now(),
    task_title text NOT NULL,
    task_description text NOT NULL, -- Assuming NOT NULL based on model, adjust if needed
    task_link_url TEXT NULL,
    task_attachment_path TEXT NULL,
    task_base_points integer NOT NULL CHECK (task_base_points >= 0),
    is_complete boolean NOT NULL DEFAULT false,
    completed_date timestamptz NULL,
    verification_status public.verification_status NULL,
    verified_by_id uuid NULL, -- FK added below
    verified_date timestamptz NULL,
    actual_points_awarded integer NULL CHECK (actual_points_awarded >= 0),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- == Comments ==
COMMENT ON TABLE public.assigned_tasks IS 'Stores specific task instances assigned to students.';
COMMENT ON COLUMN public.assigned_tasks.student_id IS 'ID of the student the task is assigned to.';
COMMENT ON COLUMN public.assigned_tasks.assigned_by_id IS 'ID of the user (teacher/admin) who assigned the task.';
COMMENT ON COLUMN public.assigned_tasks.is_complete IS 'Flag indicating if the student/parent marked the task as done.';
COMMENT ON COLUMN public.assigned_tasks.task_link_url IS 'Optional URL copied from task library or added for ad-hoc tasks.';
COMMENT ON COLUMN public.assigned_tasks.task_attachment_path IS 'Path to attachment copied from task library, if applicable.';
COMMENT ON COLUMN public.assigned_tasks.verification_status IS 'Status set by teacher/admin upon review.';
COMMENT ON COLUMN public.assigned_tasks.verified_by_id IS 'ID of the user who verified the task.';
COMMENT ON COLUMN public.assigned_tasks.actual_points_awarded IS 'Actual tickets awarded after verification.';

-- == Enable RLS ==
ALTER TABLE public.assigned_tasks ENABLE ROW LEVEL SECURITY;

-- == Add Foreign Key Constraints ==
-- Link student_id to profiles, cascade delete tasks if student deleted
ALTER TABLE public.assigned_tasks
ADD CONSTRAINT fk_assigned_tasks_student
  FOREIGN KEY (student_id) REFERENCES public.profiles(id)
  ON DELETE CASCADE;
COMMENT ON CONSTRAINT fk_assigned_tasks_student ON public.assigned_tasks IS 'Ensures assigned task references a valid student profile. Deletes task if student is deleted.';

-- Link assigned_by_id to profiles, set null if assigner deleted
ALTER TABLE public.assigned_tasks
ADD CONSTRAINT fk_assigned_tasks_assigner
  FOREIGN KEY (assigned_by_id) REFERENCES public.profiles(id)
  ON DELETE SET NULL;
COMMENT ON CONSTRAINT fk_assigned_tasks_assigner ON public.assigned_tasks IS 'Ensures assigned task references a valid assigner profile. Sets assigner to NULL if profile is deleted.';

-- Link verified_by_id to profiles, set null if verifier deleted
ALTER TABLE public.assigned_tasks
ADD CONSTRAINT fk_assigned_tasks_verifier
  FOREIGN KEY (verified_by_id) REFERENCES public.profiles(id)
  ON DELETE SET NULL;
COMMENT ON CONSTRAINT fk_assigned_tasks_verifier ON public.assigned_tasks IS 'Ensures assigned task references a valid verifier profile. Sets verifier to NULL if profile is deleted.';


-- == Updated At Trigger ==
-- Assumes handle_updated_at function exists from a previous migration
CREATE TRIGGER on_assigned_task_update
BEFORE UPDATE ON public.assigned_tasks
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();


-- == Indexes ==
CREATE INDEX idx_assigned_tasks_student_id ON public.assigned_tasks (student_id);
CREATE INDEX idx_assigned_tasks_status ON public.assigned_tasks (is_complete, verification_status);
CREATE INDEX idx_assigned_tasks_assigned_by_id ON public.assigned_tasks (assigned_by_id);

-- == Helper Function for RLS ==
-- Function: can_student_or_parent_mark_task_complete
-- Checks if the current user is the student OR a linked parent for the given task ID
CREATE OR REPLACE FUNCTION public.can_student_or_parent_mark_task_complete(task_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    -- Case 1: Current user is the student themselves
    SELECT 1
    FROM public.assigned_tasks at
    WHERE at.id = task_id AND at.student_id = auth.uid()
  ) OR EXISTS (
    -- Case 2: Current user is a linked parent
    SELECT 1
    FROM public.assigned_tasks at
    JOIN public.parent_students ps ON at.student_id = ps.student_id
    WHERE at.id = task_id AND ps.parent_id = auth.uid()
  );
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.can_student_or_parent_mark_task_complete(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_student_or_parent_mark_task_complete(uuid) TO service_role; -- Grant to service_role too if EFs might call it


-- ==================
-- RLS SELECT Policies
-- ==================
CREATE POLICY "Assigned Tasks: Allow admin read access" ON public.assigned_tasks
  FOR SELECT TO authenticated USING (public.is_active_admin(auth.uid()));
CREATE POLICY "Assigned Tasks: Allow students read own" ON public.assigned_tasks
  FOR SELECT TO authenticated USING (auth.uid() = student_id);
CREATE POLICY "Assigned Tasks: Allow parents read children" ON public.assigned_tasks
  FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.parent_students ps WHERE ps.parent_id = auth.uid() AND ps.student_id = assigned_tasks.student_id));
CREATE POLICY "Assigned Tasks: Allow teachers read linked students" ON public.assigned_tasks
  FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.student_teachers st WHERE st.teacher_id = auth.uid() AND st.student_id = assigned_tasks.student_id));

-- ==================
-- RLS INSERT Policies (Admin handled by Admin Full Access Policy below)
-- ==================
-- Allow teachers to insert tasks only for students they are linked to,
-- and ensure the assigned_by_id matches the authenticated teacher.
CREATE POLICY "Assigned Tasks: Allow teachers insert for linked students" ON public.assigned_tasks
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = assigned_by_id -- Ensure the inserter is the assigner
    AND EXISTS ( -- Ensure the assigner is a teacher linked to the student
      SELECT 1 FROM public.student_teachers st
      WHERE st.teacher_id = auth.uid() AND st.student_id = assigned_tasks.student_id
    )
    AND EXISTS ( -- Ensure the assigner is actually a teacher
        SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'teacher' AND p.status = 'active'
    )
  );

-- ==================
-- RLS UPDATE Policies (Admin handled by Admin Full Access Policy below)
-- ==================

-- Use the helper function for student/parent marking task complete
CREATE POLICY "Student/Parent Update - Mark Complete Via Function"
ON public.assigned_tasks FOR UPDATE
TO authenticated
USING ( public.can_student_or_parent_mark_task_complete(id) ) -- Check if user is student or linked parent
WITH CHECK (
  public.can_student_or_parent_mark_task_complete(id) -- Re-check permission
  AND is_complete = true -- Can only set to true
  AND verification_status = 'pending' -- Must set status to pending
  AND completed_date IS NOT NULL -- Must set completed date
  -- Prevent changing other critical fields
  AND student_id = (SELECT at.student_id FROM public.assigned_tasks at WHERE at.id = assigned_tasks.id)
  AND assigned_by_id = (SELECT at.assigned_by_id FROM public.assigned_tasks at WHERE at.id = assigned_tasks.id)
  AND task_title = (SELECT at.task_title FROM public.assigned_tasks at WHERE at.id = assigned_tasks.id)
  AND task_base_points = (SELECT at.task_base_points FROM public.assigned_tasks at WHERE at.id = assigned_tasks.id)
  AND verified_by_id IS NULL -- Cannot set verifier
  AND verified_date IS NULL -- Cannot set verified date
  AND actual_points_awarded IS NULL -- Cannot set points
);
COMMENT ON POLICY "Student/Parent Update - Mark Complete Via Function" ON public.assigned_tasks
IS 'Allows the student or their linked parent to update a task ONLY to mark it complete (sets is_complete=true, completed_date, verification_status=pending).';


-- Teachers can update (verify) tasks for their linked students.
-- The Edge Function `verifyTask` handles the actual logic and field setting.
-- This RLS policy just ensures the teacher *can* target the row.
CREATE POLICY "Assigned Tasks: Allow teachers update linked students verification" ON public.assigned_tasks
  FOR UPDATE TO authenticated
  USING (
      EXISTS ( -- Check if the caller is a teacher linked to the task's student
          SELECT 1 FROM public.student_teachers st
          WHERE st.teacher_id = auth.uid() AND st.student_id = assigned_tasks.student_id
      )
      AND EXISTS ( -- Ensure the caller is actually an active teacher
          SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'teacher' AND p.status = 'active'
      )
  )
  WITH CHECK ( -- Re-assert the condition
      EXISTS (
          SELECT 1 FROM public.student_teachers st
          WHERE st.teacher_id = auth.uid() AND st.student_id = assigned_tasks.student_id
      )
  );
COMMENT ON POLICY "Assigned Tasks: Allow teachers update linked students verification" ON public.assigned_tasks
IS 'Allows active teachers to update tasks assigned to their linked students (verification logic handled by Edge Function).';

-- ==================
-- RLS DELETE Policies (Admin handled by Admin Full Access Policy below)
-- ==================
-- Allow teachers to delete tasks they assigned, but ONLY if the task hasn't been verified yet.
CREATE POLICY "Assigned Tasks: Allow teachers delete own assignments (pre-verification)" ON public.assigned_tasks
  FOR DELETE TO authenticated
  USING (
    auth.uid() = assigned_by_id -- Caller is the assigner
    AND EXISTS ( -- Ensure the caller is an active teacher linked to the student
        SELECT 1 FROM public.student_teachers st
        JOIN public.profiles p ON st.teacher_id = p.id
        WHERE st.teacher_id = auth.uid()
          AND st.student_id = assigned_tasks.student_id
          AND p.role = 'teacher'
          AND p.status = 'active'
    )
    AND (verification_status IS NULL OR verification_status = 'pending') -- Task is not yet verified/processed
  );
COMMENT ON POLICY "Assigned Tasks: Allow teachers delete own assignments (pre-verification)" ON public.assigned_tasks
IS 'Allows active teachers to delete tasks they assigned to linked students, only if the task has not yet been verified.';


-- ==================
-- Admin Full Access (Catch-all for Admins)
-- ==================
-- This policy grants full CRUD access to active admins, simplifying other policies.
CREATE POLICY "Assigned Tasks: Allow admin full access" ON public.assigned_tasks
  FOR ALL TO authenticated -- Applies to SELECT, INSERT, UPDATE, DELETE
  USING (public.is_active_admin(auth.uid())) -- Check if the user IS an active admin
  WITH CHECK (public.is_active_admin(auth.uid())); -- Ensure they remain an active admin during write operations

COMMENT ON POLICY "Assigned Tasks: Allow admin full access" ON public.assigned_tasks
IS 'Allows active Admins full CRUD access to all assigned tasks.';