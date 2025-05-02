-- supabase/migrations/YYYYMMDDHHMMSS_create_task_library_table.sql -- Replace YYYY... with actual timestamp

-- == Create Task Library Table ==

-- == Create Task Library Table ==
CREATE TABLE public.task_library (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL,
    description text NULL,
    base_tickets integer NOT NULL CHECK (base_tickets >= 0),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- == Comments ==
COMMENT ON TABLE public.task_library IS 'Stores predefined, reusable tasks that can be assigned.';
COMMENT ON COLUMN public.task_library.title IS 'Short, display title of the task.';
COMMENT ON COLUMN public.task_library.description IS 'Longer description or instructions for the task.';
COMMENT ON COLUMN public.task_library.base_tickets IS 'Default number of tickets awarded for completing this task.';

-- == Enable RLS ==
ALTER TABLE public.task_library ENABLE ROW LEVEL SECURITY;

-- == Foreign Key Constraints for assigned_tasks (Moved here as it depends on profiles) ==
-- Ensure this runs AFTER profiles table is created if separating migrations strictly
-- ALTER TABLE public.assigned_tasks
--   ADD CONSTRAINT fk_assigned_tasks_student FOREIGN KEY (student_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
-- ALTER TABLE public.assigned_tasks
--   ADD CONSTRAINT fk_assigned_tasks_assigner FOREIGN KEY (assigned_by_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
-- ALTER TABLE public.assigned_tasks
--   ADD CONSTRAINT fk_assigned_tasks_verifier FOREIGN KEY (verified_by_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
-- Note: It's generally better practice to put FK constraints in their own migration
--       or in the migration of the table containing the FK column (`assigned_tasks` in this case).
--       Leaving commented out here, assuming they are handled in the `assigned_tasks` migration.


-- == Updated At Trigger ==
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'handle_updated_at') THEN
    CREATE TRIGGER on_task_library_update
    BEFORE UPDATE ON public.task_library
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();
  ELSE
    RAISE WARNING 'Function handle_updated_at() not found. Skipping trigger creation for task_library table.';
  END IF;
END $$;


-- SELECT Policy: Allow ANY authenticated user to read the task library.
CREATE POLICY "Task Library: Allow authenticated read access"
ON public.task_library
FOR SELECT
TO authenticated -- Grant read access to any logged-in user
USING (true); -- Allows reading all library rows

COMMENT ON POLICY "Task Library: Allow authenticated read access" ON public.task_library
IS 'Allows any logged-in user (admin, teacher, student, parent) to view the task library.';


-- WRITE Policy (INSERT, UPDATE, DELETE): Allow ONLY admins.
CREATE POLICY "Task Library: Allow admin write access"
ON public.task_library
FOR ALL -- Covers INSERT, UPDATE, DELETE
TO authenticated -- Check only authenticated users
USING (public.is_admin(auth.uid())) -- Allow if the user IS an admin
WITH CHECK (public.is_admin(auth.uid())); -- Ensure they remain admin during the operation

COMMENT ON POLICY "Task Library: Allow admin write access" ON public.task_library
IS 'Allows users with the admin role to create, update, and delete task library items.';