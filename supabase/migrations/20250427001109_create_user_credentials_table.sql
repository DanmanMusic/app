-- supabase/migrations/<timestamp>_create_user_credentials_table.sql

-- == Create User Credentials Table ==
-- Stores specific credential info, like PINs, linked to profiles
-- == Create User Credentials Table ==
CREATE TABLE public.user_credentials (
    user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    pin_hash text NULL -- Legacy hashed PIN storage
);

-- == Comments ==
COMMENT ON TABLE public.user_credentials IS 'Stores sensitive user credentials like hashed PINs (legacy). RLS enabled, access controlled ONLY via service_role (Edge Functions).'; -- Updated Comment
COMMENT ON COLUMN public.user_credentials.user_id IS 'Foreign key linking to the profiles table.';
COMMENT ON COLUMN public.user_credentials.pin_hash IS 'Securely hashed representation of the user PIN (Legacy - New flow uses onetime_pins).'; -- Updated Comment

-- == Enable RLS ==
ALTER TABLE public.user_credentials ENABLE ROW LEVEL SECURITY;
-- NO EXPLICIT RLS POLICIES ADDED - Access restricted to service_role (Edge Functions)

-- == Indexes ==
-- Primary key index is created automatically