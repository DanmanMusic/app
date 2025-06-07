-- Migration: Add can_self_assign flag to the task_library table.
-- This allows admins/teachers to create tasks that students can assign to themselves.

-- Step 1: Alter the task_library table to add the new column.
-- It defaults to 'false'. Tasks are not self-assignable unless explicitly enabled.
ALTER TABLE public.task_library
ADD COLUMN can_self_assign boolean NOT NULL DEFAULT false;


-- Step 2: Add a comment for clarity.
COMMENT ON COLUMN public.task_library.can_self_assign IS 'If true, students can assign this task to themselves from the library.';


-- Note: No RLS changes are needed for the task_library table itself.
-- The existing policies that allow admins/teachers to manage the library
-- will cover this new column.

-- The logic for *how* a student self-assigns a task will be handled
-- by the 'assignTask' Edge Function. We will need to update that function
-- to allow a student to be the caller, but only for tasks where
-- can_self_assign is true.