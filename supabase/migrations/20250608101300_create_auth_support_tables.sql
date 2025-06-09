CREATE TABLE IF NOT EXISTS public.onetime_pins ( -- MODIFIED
    pin TEXT PRIMARY KEY,
    company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    target_role TEXT NOT NULL CHECK (target_role IN ('student', 'parent', 'teacher', 'admin')),
    expires_at timestamptz NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    claimed_at timestamptz NULL
);
ALTER TABLE public.onetime_pins ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.active_refresh_tokens ( -- MODIFIED
    id bigserial PRIMARY KEY,
    company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    token_hash text NOT NULL UNIQUE,
    expires_at timestamptz NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    last_used_at timestamptz NULL,
    metadata jsonb NULL
);
ALTER TABLE public.active_refresh_tokens ENABLE ROW LEVEL SECURITY;