-- Migration: Create the notification_log table for auditing push notifications
-- File: supabase/migrations/20250613143500_create_notification_log_table.sql

-- Step 1: Create an ENUM type for the different events that can trigger a notification.
-- This is more robust than a free-text field and allows for easier querying.
CREATE TYPE public.notification_trigger_event AS ENUM (
    'cron_staff_daily_briefing',
    'cron_student_practice_reminder',
    'cron_parent_practice_reminder',
    'milestone_celebration_student',
    'milestone_celebration_parent',
    'manual_admin_announcement',
    'teacher_nudge', -- V3 Feature
    'task_assigned', -- Future Feature
    'task_verified'  -- Future Feature
);

-- Step 2: Create an ENUM type for the status of the notification send attempt.
CREATE TYPE public.notification_status AS ENUM (
    'pending',
    'sent',
    'error',
    'token_not_found'
);

-- Step 3: Create the main notification_log table.
CREATE TABLE public.notification_log (
    id bigserial PRIMARY KEY,
    company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    recipient_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    push_token_used text NULL, -- The actual Expo token that was targeted. NULL if not found.

    -- The "Why"
    trigger_event public.notification_trigger_event NOT NULL,

    -- The "What"
    title text NOT NULL,
    message text NOT NULL,
    data_payload jsonb NULL, -- Any extra data sent with the push notification (e.g., for deep linking)

    -- The "Result"
    status public.notification_status NOT NULL DEFAULT 'pending',
    provider_response jsonb NULL, -- Store the raw success/error response from Expo here.

    created_at timestamptz NOT NULL DEFAULT now()
);

-- Step 4: Enable Row Level Security.
ALTER TABLE public.notification_log ENABLE ROW LEVEL SECURITY;

-- Step 5: Add RLS policies. This table is for internal review by admins only.
-- No other role (teacher, student, parent) should ever be able to read this log.
CREATE POLICY "Allow Admins to read notification logs in their company"
    ON public.notification_log FOR SELECT
    TO authenticated
    USING (
        is_active_admin(auth.uid()) AND
        company_id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid
    );

-- Step 6 (Optional but good practice): Add comments to the table and columns.
COMMENT ON TABLE public.notification_log IS 'An audit log of all push notifications sent by the system.';
COMMENT ON COLUMN public.notification_log.trigger_event IS 'The system event that caused this notification to be generated.';
COMMENT ON COLUMN public.notification_log.provider_response IS 'The raw JSON response from the push notification provider (e.g., Expo).';