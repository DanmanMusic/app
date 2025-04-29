-- supabase/migrations/<timestamp>_create_profiles_table.sql

-- == Create Profiles Table ==
-- Stores public user data, linked 1-to-1 with auth.users
-- Assumes Supabase Auth is enabled, providing the auth.users table.

CREATE TABLE public.profiles (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE, -- Links to Supabase Auth user, cascades delete
    role text NOT NULL CHECK (role IN ('admin', 'teacher', 'student', 'parent')),
    first_name text NOT NULL,
    last_name text NOT NULL,
    nickname text NULL,
    status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
    -- Note: Avatar path removed as per TBD status, can be added later.
    -- Note: Linking columns (instruments, teachers, students) are handled in separate link tables.
);

-- == Comments ==
COMMENT ON TABLE public.profiles IS 'Stores user profile information, extending Supabase auth.users.';
COMMENT ON COLUMN public.profiles.id IS 'Matches the id from auth.users.';
COMMENT ON COLUMN public.profiles.role IS 'Defines the user role within the application.';
COMMENT ON COLUMN public.profiles.status IS 'Indicates if the user account is active or inactive.';

-- == Enable RLS ==
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- == Updated At Trigger ==
-- Apply the existing updated_at trigger function
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'handle_updated_at') THEN
    CREATE TRIGGER on_profile_update
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();
  ELSE
    RAISE WARNING 'Function handle_updated_at() not found. Skipping trigger creation for profiles table.';
  END IF;
END $$;

-- == Indexes ==
CREATE INDEX idx_profiles_role ON public.profiles (role);
CREATE INDEX idx_profiles_status ON public.profiles (status);

-- == Row Level Security (RLS) Policies ==
-- WARNING: TEMPORARY DEVELOPMENT POLICIES - Allow anonymous access. MUST BE REPLACED with Auth checks.

-- 1. Allow Anon Select Access (TEMPORARY)
DROP POLICY IF EXISTS "TEMP Allow anon select access on profiles" ON public.profiles;
CREATE POLICY "TEMP Allow anon select access on profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (true);
COMMENT ON POLICY "TEMP Allow authenticated select access on profiles" ON public.profiles IS 'TEMP DEV ONLY: Allows anonymous read access. MUST BE REPLACED.';

-- 2. Allow Anon Insert Access (TEMPORARY - Needed for createUser API)
DROP POLICY IF EXISTS "TEMP Allow anon insert access on profiles" ON public.profiles;
CREATE POLICY "TEMP Allow anon insert access on profiles"
ON public.profiles FOR INSERT
TO anon
WITH CHECK (true);
COMMENT ON POLICY "TEMP Allow anon insert access on profiles" ON public.profiles IS 'TEMP DEV ONLY: Allows anonymous insert access. MUST BE REPLACED.';

-- 3. Allow Anon Update Access (TEMPORARY - Needed for updateUser API)
DROP POLICY IF EXISTS "TEMP Allow anon update access on profiles" ON public.profiles;
CREATE POLICY "TEMP Allow anon update access on profiles"
ON public.profiles FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);
COMMENT ON POLICY "TEMP Allow anon update access on profiles" ON public.profiles IS 'TEMP DEV ONLY: Allows anonymous update access. MUST BE REPLACED.';

-- 4. Allow Anon Delete Access (TEMPORARY - Needed for deleteUser API)
-- Note: Deleting from auth.users cascade deletes here, but direct profile delete might be needed.
DROP POLICY IF EXISTS "TEMP Allow anon delete access on profiles" ON public.profiles;
CREATE POLICY "TEMP Allow anon delete access on profiles"
ON public.profiles FOR DELETE
TO anon
USING (true);
COMMENT ON POLICY "TEMP Allow anon delete access on profiles" ON public.profiles IS 'TEMP DEV ONLY: Allows anonymous delete access. MUST BE REPLACED.';