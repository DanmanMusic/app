-- supabase/migrations/<timestamp>_create_task_library_table.sql -- Replace with actual timestamp

-- == Create Task Library Table ==
-- Includes columns for creator tracking, attachments, and reference URLs
CREATE TABLE public.task_library (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL,
    description text NULL,
    base_tickets integer NOT NULL CHECK (base_tickets >= 0),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),

    -- Link to the user who created the task (Admin or Teacher)
    -- Made NOT NULL and requires a default for initial setup
    created_by_id uuid NOT NULL,
      -- Ensure you replace 'YOUR_DEFAULT_ADMIN_USER_ID' below
      -- DEFAULT 'YOUR_DEFAULT_ADMIN_USER_ID'::uuid, -- Set Default only if table is initially empty

    -- Path to optional attachment in Storage bucket 'task-library-attachments'
    attachment_path text NULL,

    -- Optional external URL related to the task
    reference_url text NULL
);

-- == Add Foreign Key Constraint Separately ==
-- Ensures the profiles table exists first
ALTER TABLE public.task_library
ADD CONSTRAINT fk_task_library_creator
  FOREIGN KEY (created_by_id) REFERENCES public.profiles(id)
  ON DELETE SET NULL; -- Set creator to NULL if the profile is deleted

-- == Comments ==
COMMENT ON TABLE public.task_library IS 'Stores predefined tasks. Creator tracked, optional attachments/URLs.';
COMMENT ON COLUMN public.task_library.title IS 'Short, display title of the task.';
COMMENT ON COLUMN public.task_library.description IS 'Longer description or instructions for the task.';
COMMENT ON COLUMN public.task_library.base_tickets IS 'Default number of tickets awarded for completing this task.';
COMMENT ON COLUMN public.task_library.created_by_id IS 'ID of the user (admin/teacher) who created this library item.';
COMMENT ON COLUMN public.task_library.attachment_path IS 'Path to an optional attachment in Storage (task-library-attachments bucket).';
COMMENT ON COLUMN public.task_library.reference_url IS 'Optional external URL related to the task.';

-- == Enable RLS ==
ALTER TABLE public.task_library ENABLE ROW LEVEL SECURITY;

-- == Indexes ==
-- Index the new foreign key
CREATE INDEX IF NOT EXISTS idx_task_library_created_by ON public.task_library (created_by_id);
-- Add index for potential filtering on title if needed often
-- CREATE INDEX IF NOT EXISTS idx_task_library_title ON public.task_library USING gin (to_tsvector('english', title));

-- == Updated At Trigger ==
-- Assumes handle_updated_at function exists from a previous migration
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'handle_updated_at' AND pg_namespace.nspname = 'public') THEN
    CREATE TRIGGER on_task_library_update
    BEFORE UPDATE ON public.task_library
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();
    RAISE NOTICE 'Trigger on_task_library_update created for public.task_library.';
  ELSE
    RAISE WARNING 'Function public.handle_updated_at() not found. Skipping trigger creation for task_library table.';
  END IF;
END $$;


-- == RLS Policies ==
-- NOTE: These are initial policies. Writes (INSERT/UPDATE/DELETE) will
--       primarily be handled by Edge Functions later, especially for teachers.
--       The SELECT policy will need refinement based on the `created_by_id` role check.

-- Initial SELECT Policy: Allow any active Admin or Teacher to read everything for now.
-- Will be refined later to filter based on creator role.
CREATE POLICY "Task Library: Allow active admin/teacher read access"
ON public.task_library
FOR SELECT
TO authenticated
USING (public.is_active_admin_or_teacher(auth.uid())); -- Use the combined active check

COMMENT ON POLICY "Task Library: Allow active admin/teacher read access" ON public.task_library
IS 'Allows active Admins or Teachers to view all task library items (Initial Policy).';


-- Initial WRITE Policy (INSERT, UPDATE, DELETE): Allow ONLY Active Admins for now.
-- Teacher writes MUST go through Edge Functions later.
CREATE POLICY "Task Library: Allow active admin write access (Initial)"
ON public.task_library
FOR ALL -- Covers INSERT, UPDATE, DELETE
TO authenticated
USING (public.is_active_admin(auth.uid())) -- Allow if the user IS an active admin
WITH CHECK (public.is_active_admin(auth.uid())); -- Ensure they remain active admin

COMMENT ON POLICY "Task Library: Allow active admin write access (Initial)" ON public.task_library
IS 'Allows active Admins to create, update, and delete task library items directly (Initial Policy - Teacher writes via Edge Functions).';