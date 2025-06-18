-- Migration: Create the core RPC function for sending push notifications (Vault Version)

-- Drop the function if it exists to ensure a clean update
DROP FUNCTION IF EXISTS public.send_push_notification(uuid, text, text, jsonb, public.notification_trigger_event);

-- Create the function that will be called by our triggers and cron jobs.
CREATE OR REPLACE FUNCTION public.send_push_notification(
    p_recipient_user_id uuid,
    p_title text,
    p_message text,
    p_data_payload jsonb DEFAULT '{}'::jsonb,
    p_trigger_event public.notification_trigger_event DEFAULT 'manual_admin_announcement'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_company_id uuid;
    v_push_tokens text[];
    log_id bigint;
    -- Variables to hold secrets from the Vault
    v_project_url TEXT;
    v_service_role_key TEXT;
    v_edge_function_url TEXT;
BEGIN
    -- === THE FIX: Load secrets from the Vault ===
    SELECT decrypted_secret INTO v_project_url FROM vault.decrypted_secrets WHERE name = 'project_url';
    SELECT decrypted_secret INTO v_service_role_key FROM vault.decrypted_secrets WHERE name = 'service_role_key';

    IF v_project_url IS NULL OR v_service_role_key IS NULL THEN
        RAISE EXCEPTION 'Could not find required secrets (project_url, service_role_key) in Vault.';
    END IF;
    
    -- Construct the correct Edge Function URL
    v_edge_function_url := v_project_url || '/functions/v1/send-notification';
    -- ==========================================

    -- 1. Get the recipient's company_id for logging purposes.
    SELECT company_id INTO v_company_id
    FROM public.profiles
    WHERE id = p_recipient_user_id;

    IF v_company_id IS NULL THEN
        RAISE WARNING '[send_push_notification] Could not find company for user_id: %', p_recipient_user_id;
        RETURN;
    END IF;

    -- 2. Find all valid push tokens for the user.
    SELECT array_agg(token) INTO v_push_tokens
    FROM public.push_tokens
    WHERE user_id = p_recipient_user_id;

    -- 3. If no tokens are found, log it and exit.
    IF v_push_tokens IS NULL OR array_length(v_push_tokens, 1) = 0 THEN
        INSERT INTO public.notification_log
            (company_id, recipient_profile_id, push_token_used, trigger_event, title, message, data_payload, status)
        VALUES
            (v_company_id, p_recipient_user_id, NULL, p_trigger_event, p_title, p_message, p_data_payload, 'token_not_found');
        RETURN;
    END IF;

    -- 4. Create the log entry and trigger the Edge Function webhook.
    INSERT INTO public.notification_log
        (company_id, recipient_profile_id, push_token_used, trigger_event, title, message, data_payload, status)
    VALUES
        (v_company_id, p_recipient_user_id, array_to_string(v_push_tokens, ','), p_trigger_event, p_title, p_message, p_data_payload, 'pending')
    RETURNING id INTO log_id;

    -- === THE FIX: Use the variables loaded from the Vault ===
    PERFORM net.http_post(
        url := v_edge_function_url,
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || v_service_role_key -- Use the real key
        ),
        body := jsonb_build_object(
            'tokens', v_push_tokens,
            'title', p_title,
            'message', p_message,
            'data', p_data_payload,
            'log_id', log_id
        )
    );
    -- =======================================================

END;
$$;


-- Grant permission to authenticated users (and by extension, other functions/triggers)
GRANT EXECUTE ON FUNCTION public.send_push_notification(uuid, text, text, jsonb, public.notification_trigger_event) TO authenticated;