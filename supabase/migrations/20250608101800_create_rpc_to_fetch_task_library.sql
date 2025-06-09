-- Migration: Create an RPC function to fetch the task library with instruments.
-- This bypasses the failing relationship detection in the REST API.

CREATE OR REPLACE FUNCTION public.get_full_task_library()
RETURNS TABLE (
    id uuid,
    title text,
    description text,
    base_tickets integer,
    created_by_id uuid,
    attachment_path text,
    reference_url text,
    can_self_assign boolean,
    journey_location_id uuid,
    -- This function will return the instrument IDs as an array of UUIDs
    instrument_ids uuid[]
)
AS $$
BEGIN
    RETURN QUERY
    SELECT
        tl.id,
        tl.title,
        tl.description,
        tl.base_tickets,
        tl.created_by_id,
        tl.attachment_path,
        tl.reference_url,
        tl.can_self_assign,
        tl.journey_location_id,
        -- Use ARRAY_AGG to collect all matching instrument_id's into an array for each task.
        -- The FILTER clause handles tasks that have no instruments, resulting in an empty array or NULL.
        ARRAY_AGG(tli.instrument_id) FILTER (WHERE tli.instrument_id IS NOT NULL) as instrument_ids
    FROM
        public.task_library tl
    -- Perform a LEFT JOIN to include tasks that may not have any instrument links.
    LEFT JOIN
        public.task_library_instruments tli ON tl.id = tli.task_library_id
    -- Group the results by the task to aggregate the instrument IDs.
    GROUP BY
        tl.id
    ORDER BY
        tl.title;
END;
$$ LANGUAGE plpgsql;

-- Grant permission for authenticated users to call this new function.
GRANT EXECUTE ON FUNCTION public.get_full_task_library() TO authenticated;