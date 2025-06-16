-- Migration: Definitive fix for the "ambiguous column" error in get_self_assignable_tasks.
-- This version explicitly qualifies EVERY column with a table alias to remove all ambiguity.

-- Drop the old function so we can replace it.
DROP FUNCTION IF EXISTS public.get_self_assignable_tasks(uuid);

-- Create the new, hyper-explicit version.
CREATE OR REPLACE FUNCTION public.get_self_assignable_tasks(p_student_id uuid)
RETURNS TABLE (
  id uuid,
  title text,
  description text,
  base_tickets integer,
  attachment_path text,
  reference_url text,
  journey_location_id uuid,
  journey_location_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_company_id uuid;
BEGIN
  -- Get the student's company ID
  SELECT p.company_id INTO v_company_id FROM public.profiles p WHERE p.id = p_student_id;

  RETURN QUERY
  SELECT
    tl.id,
    tl.title,
    tl.description,
    tl.base_tickets,
    tl.attachment_path,
    tl.reference_url,
    tl.journey_location_id,
    jl.name
  FROM
    public.task_library AS tl
  JOIN
    public.journey_locations AS jl ON tl.journey_location_id = jl.id
  WHERE
    tl.company_id = v_company_id
    AND tl.can_self_assign = true
    -- Condition 1: Exclude locations where the student has an active task.
    AND tl.journey_location_id NOT IN (
      SELECT
        t_lib.journey_location_id
      FROM
        public.assigned_tasks AS a_t
      JOIN
        public.task_library AS t_lib ON a_t.task_library_id = t_lib.id
      WHERE
        a_t.student_id = p_student_id
        AND a_t.is_complete = false
        AND t_lib.journey_location_id IS NOT NULL
    )
    -- Condition 2: For non-repeatable locations, exclude if a task has been verified.
    AND NOT (
      jl.can_reassign_tasks = false AND EXISTS (
        SELECT 1
        FROM public.assigned_tasks AS a_t
        -- JOIN is not needed here, we just need to check the FK
        WHERE
          a_t.student_id = p_student_id
          AND a_t.task_library_id = tl.id -- Unambiguous: comparing inner a_t.task_library_id to outer tl.id
          AND a_t.verification_status = 'verified'
      )
    )
  ORDER BY
    jl.name, tl.title;
END;
$$;

-- Re-grant permission to the new function.
GRANT EXECUTE ON FUNCTION public.get_self_assignable_tasks(uuid) TO authenticated;