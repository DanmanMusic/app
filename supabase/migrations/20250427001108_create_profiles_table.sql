-- supabase/migrations/20250427001108_create_profiles_table.sql

-- == Create Profiles Table ==
CREATE TABLE public.profiles (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role text NOT NULL CHECK (role IN ('admin', 'teacher', 'student', 'parent')),
    first_name text NOT NULL,
    last_name text NOT NULL,
    nickname text NULL,
    status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- == Comments ==
COMMENT ON TABLE public.profiles IS 'Stores user profile information, extending Supabase auth.users. Writes primarily handled by Edge Functions.'; -- Updated Comment
COMMENT ON COLUMN public.profiles.id IS 'Matches the id from auth.users.';
COMMENT ON COLUMN public.profiles.role IS 'Defines the user role within the application.';
COMMENT ON COLUMN public.profiles.status IS 'Indicates if the user account is active or inactive.';

-- == Enable RLS ==
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- == Updated At Trigger ==
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'handle_updated_at' AND pg_namespace.nspname = 'public') THEN
    CREATE TRIGGER on_profile_update
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();
     RAISE NOTICE 'Trigger on_profile_update created for public.profiles.';
  ELSE
    RAISE WARNING 'Function public.handle_updated_at() not found. Skipping trigger creation for profiles table.';
  END IF;
END $$;

-- == Indexes ==
CREATE INDEX idx_profiles_role ON public.profiles (role);
CREATE INDEX idx_profiles_status ON public.profiles (status);


-- === RLS for public.profiles (Revised for Edge Function Writes) ===
-- Assumes the function `public.is_admin(uuid)` exists.
-- Assumes INSERT, DELETE, and status UPDATEs are handled by Edge Functions.

-- Clean up ALL previous policies for profiles
DROP POLICY IF EXISTS "Profiles: Allow admin read access" ON public.profiles;
DROP POLICY IF EXISTS "Profiles: Allow individual read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Profiles: Allow teachers read linked students" ON public.profiles;
DROP POLICY IF EXISTS "Profiles: Allow parents read linked children" ON public.profiles;
DROP POLICY IF EXISTS "Profiles: Allow admin update access" ON public.profiles;
DROP POLICY IF EXISTS "Profiles: Allow individual update own non-critical fields" ON public.profiles;
DROP POLICY IF EXISTS "Allow individual read access" ON public.profiles; -- Older names
DROP POLICY IF EXISTS "Allow admin read access" ON public.profiles;
DROP POLICY IF EXISTS "Allow teacher read access to linked students" ON public.profiles;
DROP POLICY IF EXISTS "Allow parent read access to linked children" ON public.profiles;
DROP POLICY IF EXISTS "Allow individual update access" ON public.profiles;
DROP POLICY IF EXISTS "Allow admin update access" ON public.profiles;
DROP POLICY IF EXISTS "TEMP_Admin_Update_Direct_Role_Check" ON public.profiles; -- Temp debug policy


-- ==================
-- SELECT Policies (Remain largely the same)
-- ==================
CREATE POLICY "Profiles: Allow admin read access" ON public.profiles
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
COMMENT ON POLICY "Profiles: Allow admin read access" ON public.profiles IS 'Allows users with admin role to read all profiles.';

CREATE POLICY "Profiles: Allow individual read own profile" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);
COMMENT ON POLICY "Profiles: Allow individual read own profile" ON public.profiles IS 'Allows authenticated users to read their own profile.';

CREATE POLICY "Profiles: Allow teachers read linked students" ON public.profiles
  FOR SELECT TO authenticated USING (role = 'student' AND EXISTS (SELECT 1 FROM public.student_teachers st WHERE st.teacher_id = auth.uid() AND st.student_id = public.profiles.id));
COMMENT ON POLICY "Profiles: Allow teachers read linked students" ON public.profiles IS 'Allows teachers to read the profiles of students linked to them.';

CREATE POLICY "Profiles: Allow parents read linked children" ON public.profiles
  FOR SELECT TO authenticated USING (role = 'student' AND EXISTS (SELECT 1 FROM public.parent_students ps WHERE ps.parent_id = auth.uid() AND ps.student_id = public.profiles.id));
COMMENT ON POLICY "Profiles: Allow parents read linked children" ON public.profiles IS 'Allows parents to read the profiles of students linked to them as children.';


-- ==================
-- INSERT Policy
-- ==================
-- NO INSERT POLICY needed for client roles. Handled by 'createUser' Edge Function.


-- ==================
-- UPDATE Policy
-- ==================
-- Allow users to update ONLY specific, non-critical fields on their OWN profile.
-- Admins/Teachers updating others is handled by the 'updateUserWithLinks' Edge Function.
-- Status changes are handled by the 'toggleUserStatus' Edge Function.
CREATE POLICY "Profiles: Allow individual update own limited fields"
ON public.profiles FOR UPDATE
TO authenticated
USING (
    auth.uid() = id -- Must be their own profile
    AND
    NOT public.is_admin(auth.uid()) -- Policy does not apply to admins (they use Edge Func)
)
WITH CHECK (
    auth.uid() = id -- Re-check ownership on write
    AND
    -- Explicitly allow ONLY nickname to be changed by the user directly for now
    -- Check that role and status remain unchanged from the existing row's values
    role = (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()) AND
    status = (SELECT p.status FROM public.profiles p WHERE p.id = auth.uid()) AND
    first_name = (SELECT p.first_name FROM public.profiles p WHERE p.id = auth.uid()) AND
    last_name = (SELECT p.last_name FROM public.profiles p WHERE p.id = auth.uid())
    -- Only the 'nickname' column is implicitly allowed to change by not being checked here.
);
COMMENT ON POLICY "Profiles: Allow individual update own limited fields" ON public.profiles
IS 'Allows non-admin users to update ONLY their own nickname. Other updates via Edge Functions.';

-- NO specific Admin UPDATE policy needed here, as Admins use Edge Functions ('updateUserWithLinks', 'toggleUserStatus') which bypass RLS.


-- ==================
-- DELETE Policy
-- ==================
-- NO DELETE POLICY needed for client roles. Handled by 'deleteUser' Edge Function / Cascade.