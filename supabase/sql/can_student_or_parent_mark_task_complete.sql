CREATE OR REPLACE FUNCTION public.can_student_or_parent_mark_task_complete(task_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE -- Indicates the function doesn't modify the database
SECURITY DEFINER -- Allows the function to query tables even if the caller can't directly
AS $$
  -- Check if the current user is the student OR a linked parent for the given task ID
  SELECT EXISTS (
    SELECT 1
    FROM public.assigned_tasks at
    WHERE at.id = task_id AND at.student_id = auth.uid() -- User is the student
  ) OR EXISTS (
    SELECT 1
    FROM public.assigned_tasks at
    JOIN public.parent_students ps ON at.student_id = ps.student_id
    WHERE at.id = task_id AND ps.parent_id = auth.uid() -- User is a linked parent
  );
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.can_student_or_parent_mark_task_complete(uuid) TO authenticated;