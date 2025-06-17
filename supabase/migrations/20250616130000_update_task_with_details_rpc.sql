-- Migration: Create an RPC function to atomically update a task and its links.

CREATE OR REPLACE FUNCTION public.update_task_with_details(
    p_task_id uuid,
    p_title text,
    p_description text,
    p_base_tickets integer,
    p_can_self_assign boolean,
    p_journey_location_id uuid,
    p_instrument_ids uuid[],
    p_urls jsonb,
    p_attachments jsonb
)
RETURNS void -- This function doesn't need to return anything
LANGUAGE plpgsql
AS $$
BEGIN
  -- 1. Update the main task library item
  UPDATE public.task_library
  SET
    title = p_title,
    description = p_description,
    base_tickets = p_base_tickets,
    can_self_assign = p_can_self_assign,
    journey_location_id = p_journey_location_id,
    updated_at = now()
  WHERE id = p_task_id;

  -- 2. Sync instrument links (delete all, then re-insert)
  DELETE FROM public.task_library_instruments WHERE task_library_id = p_task_id;
  IF array_length(p_instrument_ids, 1) > 0 THEN
    INSERT INTO public.task_library_instruments (task_library_id, instrument_id)
    SELECT p_task_id, unnest(p_instrument_ids);
  END IF;

  -- 3. Sync URL links (delete all, then re-insert)
  DELETE FROM public.task_library_urls WHERE task_library_id = p_task_id;
  IF jsonb_array_length(p_urls) > 0 THEN
    INSERT INTO public.task_library_urls (task_library_id, url, label)
    SELECT p_task_id, item->>'url', item->>'label'
    FROM jsonb_array_elements(p_urls) AS item;
  END IF;
  
  -- 4. Sync attachment links (delete all, then re-insert)
  DELETE FROM public.task_library_attachments WHERE task_library_id = p_task_id;
  IF jsonb_array_length(p_attachments) > 0 THEN
    INSERT INTO public.task_library_attachments (task_library_id, file_path, file_name)
    SELECT p_task_id, item->>'path', item->>'name'
    FROM jsonb_array_elements(p_attachments) AS item;
  END IF;

END;
$$;

-- Grant permission
GRANT EXECUTE ON FUNCTION public.update_task_with_details(uuid, text, text, integer, boolean, uuid, uuid[], jsonb, jsonb) TO authenticated;