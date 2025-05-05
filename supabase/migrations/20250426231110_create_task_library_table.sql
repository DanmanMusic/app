-- supabase/migrations/20250426231110_create_task_library_table.sql

-- == Create Task Library Table ==
-- Includes columns for creator tracking, attachments, and reference URLs
CREATE TABLE public.task_library (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL,
    description text NULL,
    base_tickets integer NOT NULL CHECK (base_tickets >= 0),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    created_by_id uuid NOT NULL, -- FK added below
    attachment_path text NULL,
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
-- Index the foreign key
CREATE INDEX IF NOT EXISTS idx_task_library_created_by ON public.task_library (created_by_id);
-- Add index for potential filtering on title if needed often
-- CREATE INDEX IF NOT EXISTS idx_task_library_title ON public.task_library USING gin (to_tsvector('english', title));

-- == Updated At Trigger ==
-- Assumes handle_updated_at function exists from a previous migration
-- Create the trigger function first (idempotent) if not already present
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply the trigger
CREATE TRIGGER on_task_library_update
BEFORE UPDATE ON public.task_library
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();


-- == RLS Policies ==

-- SELECT Policy: Allow any active Admin or Teacher to read all tasks.
CREATE POLICY "Task Library: Allow active admin/teacher read access"
ON public.task_library
FOR SELECT
TO authenticated
USING (public.is_active_admin_or_teacher(auth.uid())); -- Use the combined active check

COMMENT ON POLICY "Task Library: Allow active admin/teacher read access" ON public.task_library
IS 'Allows active Admins or Teachers to view all task library items.';


-- WRITE Policy (INSERT, UPDATE, DELETE):
-- Allow active Admins full control.
-- Allow active Teachers control ONLY for tasks they created.
-- NOTE: Edge Functions handle the primary write logic using service_role.
--       This RLS acts as a safeguard for direct API access.
CREATE POLICY "Task Library: Allow admin/owner write access"
ON public.task_library
FOR ALL -- Covers INSERT, UPDATE, DELETE
TO authenticated
USING (
    -- Allow if user is an active admin
    public.is_active_admin(auth.uid())
    OR
    -- OR Allow if user is an active teacher AND owns the task (for UPDATE/DELETE)
    (
        public.is_active_admin_or_teacher(auth.uid()) -- Check if active teacher
        AND created_by_id = auth.uid() -- Check ownership
    )
)
WITH CHECK (
    -- For INSERT: Must be admin OR (teacher AND setting created_by_id to self)
    -- For UPDATE/DELETE: Must be admin OR (teacher AND owns the existing row)
    public.is_active_admin(auth.uid())
    OR
    (
        public.is_active_admin_or_teacher(auth.uid())
        AND created_by_id = auth.uid() -- Ensures teacher sets creator correctly on INSERT and owns on UPDATE/DELETE
    )
);

COMMENT ON POLICY "Task Library: Allow admin/owner write access" ON public.task_library
IS 'Allows active Admins full write access, and allows active Teachers write access ONLY for tasks they created.';

-- End of Migration