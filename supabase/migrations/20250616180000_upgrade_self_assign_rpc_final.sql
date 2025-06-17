-- Migration: Final upgrade for get_self_assignable_tasks RPC to include multiple URLs/attachments

-- Drop the old function to ensure a clean replacement of the return signature
DROP FUNCTION IF EXISTS public.get_self_assignable_tasks(uuid);

-- Create the new, correct version of the function
CREATE OR REPLACE FUNCTION public.get_self_assignable_tasks(p_student_id uuid)
RETURNS TABLE (
  id uuid,
  title text,
  description text,
  base_tickets integer,
  journey_location_id uuid,
  journey_location_name text,
  -- NEW: The arrays of related data
  urls jsonb,
  attachments jsonb
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
    tl.journey_location_id,
    jl.name,
    -- NEW: Aggregate URLs and Attachments into JSON arrays
    COALESCE(
      (SELECT jsonb_agg(jsonb_build_object('id', tu.id, 'url', tu.url, 'label', tu.label))
       FROM public.task_library_urls tu
       WHERE tu.task_library_id = tl.id),
      '[]'::jsonb
    ) as urls,
    COALESCE(
      (SELECT jsonb_agg(jsonb_build_object('id', ta.id, 'file_path', ta.file_path, 'file_name', ta.file_name))
       FROM public.task_library_attachments ta
       WHERE ta.task_library_id = tl.id),
      '[]'::jsonb
    ) as attachments
  FROM
    public.task_library AS tl
  JOIN
    public.journey_locations AS jl ON tl.journey_location_id = jl.id
  WHERE
    tl.company_id = v_company_id
    AND tl.can_self_assign = true
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
    AND NOT (
      jl.can_reassign_tasks = false AND EXISTS (
        SELECT 1
        FROM public.assigned_tasks AS a_t
        WHERE
          a_t.student_id = p_student_id
          AND a_t.task_library_id = tl.id
          AND a_t.verification_status = 'verified'
      )
    )
  ORDER BY
    jl.name, tl.title;
END;
$$;

-- Re-grant permission to the new function.
GRANT EXECUTE ON FUNCTION public.get_self_assignable_tasks(uuid) TO authenticated;