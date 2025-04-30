-- Migration: create_onetime_pins_table
-- Purpose: Creates a table to store temporary, single-use PINs for initial login.

-- == Create Onetime Pins Table ==
CREATE TABLE public.onetime_pins (
    pin TEXT PRIMARY KEY,
    user_id uuid NOT NULL,
    target_role TEXT NOT NULL CHECK (target_role IN ('student', 'parent', 'teacher', 'admin')),
    expires_at timestamptz NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    claimed_at timestamptz NULL,

    CONSTRAINT fk_onetime_pins_user FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- == Comments ==
COMMENT ON TABLE public.onetime_pins IS 'Stores temporary PINs. RLS enabled, access controlled ONLY via service_role (Edge Functions).'; -- Updated comment
COMMENT ON COLUMN public.onetime_pins.pin IS 'The short-lived, plain-text PIN provided to the user.';
COMMENT ON COLUMN public.onetime_pins.user_id IS 'The profile ID of the user this PIN is for.';
COMMENT ON COLUMN public.onetime_pins.target_role IS 'The role (student/parent/teacher/admin) the user should assume upon claiming the PIN.';
COMMENT ON COLUMN public.onetime_pins.expires_at IS 'Timestamp after which this PIN is no longer valid.';
COMMENT ON COLUMN public.onetime_pins.claimed_at IS 'Timestamp when the PIN was successfully claimed (used for cleanup/prevention).';

-- == Enable RLS ==
ALTER TABLE public.onetime_pins ENABLE ROW LEVEL SECURITY;
-- NO EXPLICIT RLS POLICIES ADDED - Access restricted to service_role (Edge Functions)

-- == Indexes ==
CREATE INDEX idx_onetime_pins_user_id ON public.onetime_pins (user_id);
CREATE INDEX idx_onetime_pins_expires_at ON public.onetime_pins (expires_at);