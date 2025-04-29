-- Migration: create_active_refresh_tokens_table
-- Purpose: Stores hashed refresh tokens for long-lived user sessions initiated via custom flows (e.g., PIN login).

-- == Create Active Refresh Tokens Table ==
CREATE TABLE public.active_refresh_tokens (
    id bigserial PRIMARY KEY, -- Simple unique ID for the row
    user_id uuid NOT NULL,
    token_hash text NOT NULL UNIQUE, -- Ensures no duplicate active token hashes
    expires_at timestamptz NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    last_used_at timestamptz NULL, -- Optional: Track last usage
    metadata jsonb NULL, -- Optional: Store non-sensitive info like device type/browser

    -- Foreign key constraint to link to user profiles
    CONSTRAINT fk_active_refresh_tokens_user FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- == Comments ==
COMMENT ON TABLE public.active_refresh_tokens IS 'Stores active, hashed refresh tokens for custom authentication flows.';
COMMENT ON COLUMN public.active_refresh_tokens.user_id IS 'The profile ID of the user this token belongs to.';
COMMENT ON COLUMN public.active_refresh_tokens.token_hash IS 'Secure SHA-256 hash of the opaque refresh token issued to the client.';
COMMENT ON COLUMN public.active_refresh_tokens.expires_at IS 'Timestamp after which this refresh token is no longer valid.';
COMMENT ON COLUMN public.active_refresh_tokens.last_used_at IS 'Timestamp when the token was last successfully used for refreshing.';
COMMENT ON COLUMN public.active_refresh_tokens.metadata IS 'Optional JSONB field for storing non-sensitive session metadata (e.g., device info).';

-- == Enable RLS ==
ALTER TABLE public.active_refresh_tokens ENABLE ROW LEVEL SECURITY;
-- NOTE: Strict RLS policies allowing access ONLY to specific Edge Functions will be added later.
--       No default SELECT/INSERT/UPDATE/DELETE policies are added here.

-- == Indexes ==
-- Primary key index on `id` is created automatically.
CREATE INDEX idx_active_refresh_tokens_user_id ON public.active_refresh_tokens (user_id);
-- UNIQUE index on `token_hash` is created automatically due to UNIQUE constraint.
CREATE INDEX idx_active_refresh_tokens_expires_at ON public.active_refresh_tokens (expires_at); -- Useful for cleanup jobs