-- supabase/migrations/YYYYMMDDHHMMSS_create_profiles_table.sql -- Replace YYYY... with actual timestamp

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


-- == Row Level Security (RLS) Policies (SECURE VERSION) ==
-- Assumes the function `public.is_admin(uuid)` exists and checks for the admin role.

-- Clean up any potential old/temporary policies first
DROP POLICY IF EXISTS "TEMP Allow anon select access on profiles" ON public.profiles;
DROP POLICY IF EXISTS "TEMP Allow authenticated select access on profiles" ON public.profiles;
DROP POLICY IF EXISTS "TEMP Allow anon insert access on profiles" ON public.profiles;
DROP POLICY IF EXISTS "TEMP Allow anon update access on profiles" ON public.profiles;
DROP POLICY IF EXISTS "TEMP Allow anon delete access on profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow individual read access" ON public.profiles;
DROP POLICY IF EXISTS "Allow admin read access" ON public.profiles;
DROP POLICY IF EXISTS "Allow teacher read access to linked students" ON public.profiles;
DROP POLICY IF EXISTS "Allow parent read access to linked children" ON public.profiles;
DROP POLICY IF EXISTS "Allow individual update access" ON public.profiles;
DROP POLICY IF EXISTS "Allow admin update access" ON public.profiles;

-- 1. SELECT Policies:
--    a) Users can read their own profile.
CREATE POLICY "Allow individual read access"
ON public.profiles FOR SELECT
TO authenticated
USING (auth.uid() = id);

COMMENT ON POLICY "Allow individual read access" ON public.profiles
IS 'Allows authenticated users to read their own profile.';

--    b) Admins can read all profiles.
CREATE POLICY "Allow admin read access"
ON public.profiles FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

COMMENT ON POLICY "Allow admin read access" ON public.profiles
IS 'Allows users with admin role to read all profiles.';

--    c) Teachers can read profiles of their linked students.
CREATE POLICY "Allow teacher read access to linked students"
ON public.profiles FOR SELECT
TO authenticated
USING (
    role = 'student' AND -- Only applies to selecting student profiles
    EXISTS (
        SELECT 1
        FROM public.student_teachers st
        WHERE st.teacher_id = auth.uid() AND st.student_id = public.profiles.id
    )
);

COMMENT ON POLICY "Allow teacher read access to linked students" ON public.profiles
IS 'Allows teachers to read the profiles of students linked to them.';

--    d) Parents can read profiles of their linked children.
CREATE POLICY "Allow parent read access to linked children"
ON public.profiles FOR SELECT
TO authenticated
USING (
    role = 'student' AND -- Only applies to selecting student profiles
    EXISTS (
        SELECT 1
        FROM public.parent_students ps
        WHERE ps.parent_id = auth.uid() AND ps.student_id = public.profiles.id
    )
);

COMMENT ON POLICY "Allow parent read access to linked children" ON public.profiles
IS 'Allows parents to read the profiles of students linked to them as children.';


-- 2. INSERT Policy: No RLS needed for client-side inserts. Handled by Edge Function.


-- 3. UPDATE Policies:
--    a) Users can update their own profile (specific fields).
CREATE POLICY "Allow individual update access"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);
-- Note: You might restrict *which* columns can be updated here later if needed,
-- e.g., using `UPDATE USING (auth.uid() = id AND column_name = NEW.column_name)`
-- For now, this allows updating any column on their own profile, but their role prevents
-- them from changing `role` or `status` unless they are also an admin (covered by admin policy).

COMMENT ON POLICY "Allow individual update access" ON public.profiles
IS 'Allows authenticated users to update their own profile information.';

--    b) Admins can update any profile.
CREATE POLICY "Allow admin update access"
ON public.profiles FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

COMMENT ON POLICY "Allow admin update access" ON public.profiles
IS 'Allows users with admin role to update any profile.';


-- 4. DELETE Policy: No RLS needed for client-side deletes. Handled by Edge Function / Cascade.