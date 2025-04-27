-- supabase/migrations/<timestamp>_create_user_credentials_table.sql

-- == Create User Credentials Table ==
-- Stores specific credential info, like PINs, linked to profiles

CREATE TABLE public.user_credentials (
    user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE, -- Links to profile, cascades delete
    pin_hash text NULL -- Store securely hashed PIN here. Nullable initially.
    -- Add other credential-related fields if needed later
);

-- == Comments ==
COMMENT ON TABLE public.user_credentials IS 'Stores sensitive user credentials like hashed PINs.';
COMMENT ON COLUMN public.user_credentials.user_id IS 'Foreign key linking to the profiles table.';
COMMENT ON COLUMN public.user_credentials.pin_hash IS 'Securely hashed representation of the user PIN.';

-- == Enable RLS ==
ALTER TABLE public.user_credentials ENABLE ROW LEVEL SECURITY;

-- == Indexes ==
-- Primary key index is created automatically

-- == Row Level Security (RLS) Policies ==
-- WARNING: THESE ARE TEMPORARY AND INSECURE. MUST BE REPLACED with strict policies.
-- Generally, only specific server-side functions (Edge Functions) or highly restricted roles
-- should interact with this table. Anonymous access is extremely dangerous here.

-- 1. TEMP Anon Select (Highly discouraged even for dev, but needed if client checks PIN status)
DROP POLICY IF EXISTS "TEMP Allow anon select on user_credentials" ON public.user_credentials;
CREATE POLICY "TEMP Allow anon select on user_credentials"
ON public.user_credentials FOR SELECT
TO anon
USING (true);
COMMENT ON POLICY "TEMP Allow anon select on user_credentials" ON public.user_credentials IS 'TEMP DEV ONLY: Allows anon select. EXTREMELY INSECURE. MUST BE REMOVED.';

-- 2. TEMP Anon Insert/Update/Delete (Needed temporarily for API testing without Edge Functions)
DROP POLICY IF EXISTS "TEMP Allow anon write on user_credentials" ON public.user_credentials;
CREATE POLICY "TEMP Allow anon write on user_credentials"
ON public.user_credentials FOR ALL -- Covers INSERT, UPDATE, DELETE
TO anon
USING (true)
WITH CHECK (true);
COMMENT ON POLICY "TEMP Allow anon write on user_credentials" ON public.user_credentials IS 'TEMP DEV ONLY: Allows anon write. EXTREMELY INSECURE. MUST BE REMOVED/REPLACED.';