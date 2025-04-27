-- supabase/migrations/<timestamp>_create_assigned_tasks_table.sql

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
    student_id uuid NOT NULL, -- FK added later or handled by application logic initially
    assigned_by_id uuid NOT NULL, -- FK added later
    assigned_date timestamptz NOT NULL DEFAULT now(),
    task_title text NOT NULL,
    task_description text NOT NULL, -- Assuming required
    task_base_points integer NOT NULL CHECK (task_base_points >= 0),
    is_complete boolean NOT NULL DEFAULT false,
    completed_date timestamptz NULL,
    verification_status public.verification_status NULL, -- Uses the ENUM type
    verified_by_id uuid NULL, -- FK added later
    verified_date timestamptz NULL,
    actual_points_awarded integer NULL CHECK (actual_points_awarded >= 0),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
    -- Potential FKs to add later:
    -- CONSTRAINT fk_assigned_tasks_student FOREIGN KEY (student_id) REFERENCES public.profiles(id) ON DELETE CASCADE, -- Or SET NULL?
    -- CONSTRAINT fk_assigned_tasks_assigner FOREIGN KEY (assigned_by_id) REFERENCES public.profiles(id) ON DELETE SET NULL,
    -- CONSTRAINT fk_assigned_tasks_verifier FOREIGN KEY (verified_by_id) REFERENCES public.profiles(id) ON DELETE SET NULL
    -- CONSTRAINT fk_assigned_tasks_challenge FOREIGN KEY (source_challenge_id) REFERENCES public.challenges(id) ON DELETE SET NULL -- If challenges implemented
);

-- == Comments ==
COMMENT ON TABLE public.assigned_tasks IS 'Stores specific task instances assigned to students.';
COMMENT ON COLUMN public.assigned_tasks.student_id IS 'ID of the student the task is assigned to (FK TBD).';
COMMENT ON COLUMN public.assigned_tasks.assigned_by_id IS 'ID of the user (teacher/admin) who assigned the task (FK TBD).';
COMMENT ON COLUMN public.assigned_tasks.is_complete IS 'Flag indicating if the student marked the task as done.';
COMMENT ON COLUMN public.assigned_tasks.verification_status IS 'Status set by teacher/admin upon review.';
COMMENT ON COLUMN public.assigned_tasks.verified_by_id IS 'ID of the user who verified the task (FK TBD).';
COMMENT ON COLUMN public.assigned_tasks.actual_points_awarded IS 'Actual tickets awarded after verification.';

-- == Enable RLS ==
ALTER TABLE public.assigned_tasks ENABLE ROW LEVEL SECURITY;

-- == Updated At Trigger ==
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'handle_updated_at') THEN
    CREATE TRIGGER on_assigned_task_update
    BEFORE UPDATE ON public.assigned_tasks
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();
  ELSE
    RAISE WARNING 'Function handle_updated_at() not found. Skipping trigger creation for assigned_tasks table.';
  END IF;
END $$;

-- == Indexes ==
CREATE INDEX idx_assigned_tasks_student_id ON public.assigned_tasks (student_id);
CREATE INDEX idx_assigned_tasks_status ON public.assigned_tasks (is_complete, verification_status); -- For finding pending tasks
CREATE INDEX idx_assigned_tasks_assigned_by_id ON public.assigned_tasks (assigned_by_id);


-- == Row Level Security (RLS) Policies ==
-- WARNING: TEMPORARY DEVELOPMENT POLICIES - Allow anonymous access. MUST BE REPLACED.

-- 1. TEMP Anon Select
DROP POLICY IF EXISTS "TEMP Allow anon select on assigned_tasks" ON public.assigned_tasks;
CREATE POLICY "TEMP Allow anon select on assigned_tasks"
ON public.assigned_tasks FOR SELECT
TO anon
USING (true);
COMMENT ON POLICY "TEMP Allow anon select on assigned_tasks" ON public.assigned_tasks IS 'TEMP DEV ONLY: Allows anon read access. MUST BE REPLACED.';

-- 2. TEMP Anon Write (Insert/Update/Delete)
DROP POLICY IF EXISTS "TEMP Allow anon write on assigned_tasks" ON public.assigned_tasks;
CREATE POLICY "TEMP Allow anon write on assigned_tasks"
ON public.assigned_tasks FOR ALL
TO anon
USING (true)
WITH CHECK (true);
COMMENT ON POLICY "TEMP Allow anon write on assigned_tasks" ON public.assigned_tasks IS 'TEMP DEV ONLY: Allows anon write access. MUST BE REPLACED.';