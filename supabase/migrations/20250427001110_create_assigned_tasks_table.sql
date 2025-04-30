-- supabase/migrations/20250427001110_create_assigned_tasks_table.sql

-- Define ENUM type for verification status
DROP TYPE IF EXISTS public.verification_status;
CREATE TYPE public.verification_status AS ENUM (
    'pending',
    'verified',
    'partial',
    'incomplete'
);

-- == Create Assigned Tasks Table ==
CREATE TABLE public.assigned_tasks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id uuid NOT NULL,
    assigned_by_id uuid NOT NULL,
    assigned_date timestamptz NOT NULL DEFAULT now(),
    task_title text NOT NULL,
    task_description text NOT NULL,
    task_base_points integer NOT NULL CHECK (task_base_points >= 0),
    is_complete boolean NOT NULL DEFAULT false,
    completed_date timestamptz NULL,
    verification_status public.verification_status NULL,
    verified_by_id uuid NULL,
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
COMMENT ON COLUMN public.assigned_tasks.verification_status IS 'Status set by teacher/admin upon review.';
COMMENT ON COLUMN public.assigned_tasks.verified_by_id IS 'ID of the user who verified the task.';
COMMENT ON COLUMN public.assigned_tasks.actual_points_awarded IS 'Actual tickets awarded after verification.';

-- == Enable RLS ==
ALTER TABLE public.assigned_tasks ENABLE ROW LEVEL SECURITY;

-- == Updated At Trigger ==
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'handle_updated_at' AND pg_namespace.nspname = 'public') THEN
    CREATE TRIGGER on_assigned_task_update
    BEFORE UPDATE ON public.assigned_tasks
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();
     RAISE NOTICE 'Trigger on_assigned_task_update created for public.assigned_tasks.';
  ELSE
    RAISE WARNING 'Function public.handle_updated_at() not found. Skipping trigger creation for assigned_tasks table.';
  END IF;
END $$;

-- == Indexes ==
CREATE INDEX idx_assigned_tasks_student_id ON public.assigned_tasks (student_id);
CREATE INDEX idx_assigned_tasks_status ON public.assigned_tasks (is_complete, verification_status);
CREATE INDEX idx_assigned_tasks_assigned_by_id ON public.assigned_tasks (assigned_by_id);


-- === RLS for public.assigned_tasks ===
-- Assumes helper function public.is_admin(uuid) exists.
-- Assumes helper function public.can_student_or_parent_mark_task_complete(uuid) exists and checks ownership (student or linked parent).

-- Clean up potentially existing policies first
DROP POLICY IF EXISTS "Assigned Tasks: Allow admin full access" ON public.assigned_tasks;
DROP POLICY IF EXISTS "Assigned Tasks: Allow students read own" ON public.assigned_tasks;
DROP POLICY IF EXISTS "Assigned Tasks: Allow parents read children" ON public.assigned_tasks;
DROP POLICY IF EXISTS "Assigned Tasks: Allow teachers read linked students" ON public.assigned_tasks;
DROP POLICY IF EXISTS "Assigned Tasks: Allow teachers insert for linked students" ON public.assigned_tasks;
DROP POLICY IF EXISTS "Assigned Tasks: Allow students update own completion" ON public.assigned_tasks;
DROP POLICY IF EXISTS "Assigned Tasks: Allow parents update children completion" ON public.assigned_tasks;
DROP POLICY IF EXISTS "Assigned Tasks: Allow teachers update linked students verification" ON public.assigned_tasks;
DROP POLICY IF EXISTS "Assigned Tasks: Allow teachers delete own assignments (pre-verification)" ON public.assigned_tasks;
DROP POLICY IF EXISTS "TEMP Allow anon select on assigned_tasks" ON public.assigned_tasks;
DROP POLICY IF EXISTS "TEMP Allow anon write on assigned_tasks" ON public.assigned_tasks;
DROP POLICY IF EXISTS "_disabled_Assigned Tasks: Allow students update own completion" ON public.assigned_tasks;
DROP POLICY IF EXISTS "TEMP_Student_Update_Check_Only" ON public.assigned_tasks;
DROP POLICY IF EXISTS "Student Update - Check Only V2" ON public.assigned_tasks;
DROP POLICY IF EXISTS "Student/Parent Update - Mark Complete Check" ON public.assigned_tasks;
DROP POLICY IF EXISTS "Student Update - Via Function" ON public.assigned_tasks; -- Older name using only student check
DROP POLICY IF EXISTS "Student/Parent Update - Mark Complete Via Function" ON public.assigned_tasks; -- Drop potentially existing policy name


-- ==================
-- SELECT Policies
-- ==================
CREATE POLICY "Assigned Tasks: Allow admin read access" ON public.assigned_tasks
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Assigned Tasks: Allow students read own" ON public.assigned_tasks
  FOR SELECT TO authenticated USING (auth.uid() = student_id);
CREATE POLICY "Assigned Tasks: Allow parents read children" ON public.assigned_tasks
  FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.parent_students ps WHERE ps.parent_id = auth.uid() AND ps.student_id = assigned_tasks.student_id));
CREATE POLICY "Assigned Tasks: Allow teachers read linked students" ON public.assigned_tasks
  FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.student_teachers st WHERE st.teacher_id = auth.uid() AND st.student_id = assigned_tasks.student_id));

-- ==================
-- INSERT Policies (Admin handled by Admin Full Access)
-- ==================
CREATE POLICY "Assigned Tasks: Allow teachers insert for linked students" ON public.assigned_tasks
  FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.student_teachers st WHERE st.teacher_id = auth.uid() AND st.student_id = assigned_tasks.student_id) AND auth.uid() = assigned_by_id );

-- ==================
-- UPDATE Policies (Admin handled by Admin Full Access)
-- ==================

-- Use the helper function for student/parent marking task complete
CREATE POLICY "Student/Parent Update - Mark Complete Via Function"
ON public.assigned_tasks FOR UPDATE
TO authenticated
USING ( public.can_student_or_parent_mark_task_complete(id) )
WITH CHECK (
  public.can_student_or_parent_mark_task_complete(id)
  AND is_complete = true
  AND verification_status = 'pending' -- Enforce setting pending status
  AND completed_date IS NOT NULL -- Ensure date is set
);
COMMENT ON POLICY "Student/Parent Update - Mark Complete Via Function" ON public.assigned_tasks
IS 'Allows the student or their linked parent to update a task to mark it complete (sets is_complete, completed_date, verification_status).';


-- Teachers can update (verify) tasks for their linked students.
CREATE POLICY "Assigned Tasks: Allow teachers update linked students verification" ON public.assigned_tasks
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.student_teachers st WHERE st.teacher_id = auth.uid() AND st.student_id = assigned_tasks.student_id))
  WITH CHECK (EXISTS (SELECT 1 FROM public.student_teachers st WHERE st.teacher_id = auth.uid() AND st.student_id = assigned_tasks.student_id)); -- Allows update if teacher is linked. API/Edge function must handle *which* fields.

-- ==================
-- DELETE Policies (Admin handled by Admin Full Access)
-- ==================
CREATE POLICY "Assigned Tasks: Allow teachers delete own assignments (pre-verification)" ON public.assigned_tasks
  FOR DELETE TO authenticated
  USING (auth.uid() = assigned_by_id AND EXISTS ( SELECT 1 FROM public.student_teachers st WHERE st.teacher_id = auth.uid() AND st.student_id = assigned_tasks.student_id ) AND (verification_status IS NULL OR verification_status = 'pending'));

-- ==================
-- Admin Full Access (Catch-all for Admins)
-- ==================
CREATE POLICY "Assigned Tasks: Allow admin full access" ON public.assigned_tasks
  FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));