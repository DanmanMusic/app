-- Migration: Create an RPC function to create a task library item and all its related links in a single transaction.

CREATE OR REPLACE FUNCTION public.create_task_with_details(
    p_title text,
    p_description text,
    p_base_tickets integer,
    p_created_by_id uuid,
    p_company_id uuid,
    p_can_self_assign boolean,
    p_journey_location_id uuid,
    p_instrument_ids uuid[],
    p_urls jsonb,
    p_attachments jsonb
)
RETURNS uuid -- Returns the ID of the newly created task
LANGUAGE plpgsql
AS $$
DECLARE
  new_task_id uuid;
  url_record jsonb;
  attachment_record jsonb;
BEGIN
  -- 1. Insert the main task library item
  INSERT INTO public.task_library (
    title, description, base_tickets, created_by_id, company_id, can_self_assign, journey_location_id
  ) VALUES (
    p_title, p_description, p_base_tickets, p_created_by_id, p_company_id, p_can_self_assign, p_journey_location_id
  ) RETURNING id INTO new_task_id;

  -- 2. Insert instrument links if any are provided
  IF array_length(p_instrument_ids, 1) > 0 THEN
    INSERT INTO public.task_library_instruments (task_library_id, instrument_id)
    SELECT new_task_id, unnest(p_instrument_ids);
  END IF;

  -- 3. Insert URL links by iterating through the JSONB array
  IF jsonb_array_length(p_urls) > 0 THEN
    FOR url_record IN SELECT * FROM jsonb_array_elements(p_urls)
    LOOP
      INSERT INTO public.task_library_urls (task_library_id, url, label)
      VALUES (new_task_id, url_record->>'url', url_record->>'label');
    END LOOP;
  END IF;

  -- 4. Insert attachment links by iterating through the JSONB array
  IF jsonb_array_length(p_attachments) > 0 THEN
    FOR attachment_record IN SELECT * FROM jsonb_array_elements(p_attachments)
    LOOP
      INSERT INTO public.task_library_attachments (task_library_id, file_path, file_name)
      VALUES (new_task_id, attachment_record->>'path', attachment_record->>'name');
    END LOOP;
  END IF;

  -- 5. Return the ID of the new task
  RETURN new_task_id;
END;
$$;

-- Grant permission for authenticated users to call this new function
-- (though it will be called via an Edge Function with service_role)
GRANT EXECUTE ON FUNCTION public.create_task_with_details(text, text, integer, uuid, uuid, boolean, uuid, uuid[], jsonb, jsonb) TO authenticated;