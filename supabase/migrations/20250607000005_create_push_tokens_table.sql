-- Migration: Create the push_tokens table for handling push notifications.
-- This table stores the unique Expo Push Token for each device a user logs into.

CREATE TABLE public.push_tokens (
    id bigserial PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    token text NOT NULL UNIQUE,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Add comments for clarity
COMMENT ON TABLE public.push_tokens IS 'Stores Expo Push Tokens for user devices to receive notifications.';
COMMENT ON COLUMN public.push_tokens.user_id IS 'The user associated with this device token.';
COMMENT ON COLUMN public.push_tokens.company_id IS 'The company the user belongs to, for data isolation.';
COMMENT ON COLUMN public.push_tokens.token IS 'The unique Expo Push Token string for a specific device.';

-- Enable Row Level Security
ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;

-- Create Indexes for performance
CREATE INDEX idx_push_tokens_user_id ON public.push_tokens (user_id);
-- The UNIQUE constraint on 'token' automatically creates an index for it.


-- RLS Policies
-- A user should have full control over their own push tokens (e.g., to add on login, remove on logout).
-- No other user, including admins (via RLS), should be able to see or manage another user's tokens.
-- Edge Functions will use the service_role key to bypass RLS when sending notifications.
CREATE POLICY "Users can manage their own push tokens"
ON public.push_tokens
FOR ALL
TO authenticated
USING (
    user_id = auth.uid() AND
    company_id = public.get_current_user_company_id()
)
WITH CHECK (
    user_id = auth.uid() AND
    company_id = public.get_current_user_company_id()
);

COMMENT ON POLICY "Users can manage their own push tokens" ON public.push_tokens
IS 'Allows a user to insert, update, or delete push tokens associated with their own account.';