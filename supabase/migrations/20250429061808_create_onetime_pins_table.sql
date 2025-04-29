-- Migration: create_onetime_pins_table
-- Purpose: Creates a table to store temporary, single-use PINs for initial login.

-- == Create Onetime Pins Table ==
CREATE TABLE public.onetime_pins (
    pin TEXT PRIMARY KEY, -- The PIN itself, acts as unique identifier while active
    user_id uuid NOT NULL,
    target_role TEXT NOT NULL CHECK (target_role IN ('student', 'parent')),
    expires_at timestamptz NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    claimed_at timestamptz NULL, -- Timestamp when the PIN was successfully used

    -- Foreign key constraint to link to user profiles
    CONSTRAINT fk_onetime_pins_user FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- == Comments ==
COMMENT ON TABLE public.onetime_pins IS 'Stores temporary, single-use PINs for initial device/user association.';
COMMENT ON COLUMN public.onetime_pins.pin IS 'The short-lived, plain-text PIN provided to the user.';
COMMENT ON COLUMN public.onetime_pins.user_id IS 'The profile ID of the user this PIN is for.';
COMMENT ON COLUMN public.onetime_pins.target_role IS 'The role (student/parent) the user should assume upon claiming the PIN.';
COMMENT ON COLUMN public.onetime_pins.expires_at IS 'Timestamp after which this PIN is no longer valid.';
COMMENT ON COLUMN public.onetime_pins.claimed_at IS 'Timestamp when the PIN was successfully claimed (used for cleanup/prevention).';

-- == Enable RLS ==
ALTER TABLE public.onetime_pins ENABLE ROW LEVEL SECURITY;
-- NOTE: Strict RLS policies allowing access ONLY to specific Edge Functions will be added later.
--       No default SELECT/INSERT/UPDATE/DELETE policies are added here.

-- == Indexes ==
-- Primary key index on `pin` is created automatically.
CREATE INDEX idx_onetime_pins_user_id ON public.onetime_pins (user_id);
CREATE INDEX idx_onetime_pins_expires_at ON public.onetime_pins (expires_at); -- Useful for cleanup jobs