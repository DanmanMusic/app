-- Migration: Implements the full "Self-Assignable Tasks" feature.
-- This single file adds necessary columns and creates the final, correct
-- versions of the required RPC functions, superseding previous attempts.

-- Step 1: Add the 'can_reassign_tasks' flag to journey locations.
ALTER TABLE public.journey_locations
ADD COLUMN IF NOT EXISTS can_reassign_tasks BOOLEAN NOT NULL DEFAULT false;
COMMENT ON COLUMN public.journey_locations.can_reassign_tasks IS 'If true, students can re-assign tasks from this location even after completing them. If false, it''s a one-time completion.';

-- Step 2: Add a foreign key from assigned_tasks to task_library for better tracking.
ALTER TABLE public.assigned_tasks
ADD COLUMN IF NOT EXISTS task_library_id UUID NULL REFERENCES public.task_library(id) ON DELETE SET NULL;
COMMENT ON COLUMN public.assigned_tasks.task_library_id IS 'The task_library item this task was generated from, if applicable.';

-- Step 3: Create the RPC to get a list of available self-assignable tasks for a student.
-- This version correctly handles re-assignment logic and avoids ambiguous column errors.
DROP FUNCTION IF EXISTS public.get_self_assignable_tasks(uuid);
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
SECURITY DEFINER AS $$
DECLARE
  v_company_id uuid;
BEGIN
  SELECT company_id INTO v_company_id FROM public.profiles WHERE id = p_student_id;
  RETURN QUERY
  SELECT
    tl.id, tl.title, tl.description, tl.base_tickets, tl.attachment_path, tl.reference_url, tl.journey_location_id, jl.name as journey_location_name
  FROM public.task_library tl
  JOIN public.journey_locations jl ON tl.journey_location_id = jl.id
  WHERE tl.company_id = v_company_id AND tl.can_self_assign = true
  AND tl.journey_location_id NOT IN (
    SELECT t_lib.journey_location_id
    FROM public.assigned_tasks a_t
    JOIN public.task_library t_lib ON a_t.task_library_id = t_lib.id
    WHERE a_t.student_id = p_student_id AND a_t.is_complete = false AND t_lib.journey_location_id IS NOT NULL
  )
  AND NOT (
    jl.can_reassign_tasks = false AND EXISTS (
      SELECT 1
      FROM public.assigned_tasks a_t
      WHERE a_t.student_id = p_student_id
        AND a_t.task_library_id = tl.id
        AND a_t.verification_status = 'verified'
    )
  )
  ORDER BY jl.name, tl.title;
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_self_assignable_tasks(uuid) TO authenticated;

-- Step 4: Create the RPC to reliably fetch a single task library item with its instrument links.
DROP FUNCTION IF EXISTS public.get_single_task_library_item(uuid);
CREATE OR REPLACE FUNCTION public.get_single_task_library_item(p_task_id uuid)
RETURNS TABLE (
    id uuid, title text, description text, base_tickets integer, created_by_id uuid, attachment_path text, reference_url text, can_self_assign boolean, journey_location_id uuid, instrument_ids uuid[]
)
AS $$
BEGIN
    RETURN QUERY
    SELECT
        tl.id, tl.title, tl.description, tl.base_tickets, tl.created_by_id, tl.attachment_path, tl.reference_url, tl.can_self_assign, tl.journey_location_id,
        ARRAY(SELECT tli.instrument_id FROM public.task_library_instruments tli WHERE tli.task_library_id = tl.id) as instrument_ids
    FROM public.task_library tl
    WHERE tl.id = p_task_id;
END;
$$ LANGUAGE plpgsql;
GRANT EXECUTE ON FUNCTION public.get_single_task_library_item(uuid) TO authenticated;