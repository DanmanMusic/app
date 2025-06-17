-- Migration: Upgrade RPCs for task_library to include multiple URLs and attachments

-- First, drop the old function if it exists to allow for signature changes.
DROP FUNCTION IF EXISTS public.get_full_task_library();

-- Create the new, more powerful version of get_full_task_library
CREATE OR REPLACE FUNCTION public.get_full_task_library()
RETURNS TABLE (
    id uuid,
    title text,
    description text,
    base_tickets integer,
    created_by_id uuid,
    can_self_assign boolean,
    journey_location_id uuid,
    instrument_ids uuid[],
    urls jsonb,
    attachments jsonb
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
        tl.can_self_assign,
        tl.journey_location_id,
        ARRAY(
            SELECT tli.instrument_id
            FROM public.task_library_instruments tli
            WHERE tli.task_library_id = tl.id
        ) as instrument_ids,
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
        public.task_library tl
    GROUP BY
        tl.id
    ORDER BY
        tl.title;
END;
$$ LANGUAGE plpgsql;

-- Grant permission again
GRANT EXECUTE ON FUNCTION public.get_full_task_library() TO authenticated;


-- --- THIS IS THE FIX ---
-- Explicitly DROP the old version of get_single_task_library_item before creating the new one.
DROP FUNCTION IF EXISTS public.get_single_task_library_item(uuid);

-- Create the new function to get a single item efficiently
CREATE OR REPLACE FUNCTION public.get_single_task_library_item(p_task_id uuid)
RETURNS TABLE (
    id uuid,
    title text,
    description text,
    base_tickets integer,
    created_by_id uuid,
    can_self_assign boolean,
    journey_location_id uuid,
    instrument_ids uuid[],
    urls jsonb,
    attachments jsonb
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
        tl.can_self_assign,
        tl.journey_location_id,
        ARRAY(SELECT tli.instrument_id FROM public.task_library_instruments tli WHERE tli.task_library_id = tl.id) as instrument_ids,
        COALESCE((SELECT jsonb_agg(jsonb_build_object('id', tu.id, 'url', tu.url, 'label', tu.label)) FROM public.task_library_urls tu WHERE tu.task_library_id = tl.id), '[]'::jsonb) as urls,
        COALESCE((SELECT jsonb_agg(jsonb_build_object('id', ta.id, 'file_path', ta.file_path, 'file_name', ta.file_name)) FROM public.task_library_attachments ta WHERE ta.task_library_id = tl.id), '[]'::jsonb) as attachments
    FROM
        public.task_library tl
    WHERE tl.id = p_task_id
    GROUP BY tl.id;
END;
$$ LANGUAGE plpgsql;

-- Grant permission
GRANT EXECUTE ON FUNCTION public.get_single_task_library_item(uuid) TO authenticated;