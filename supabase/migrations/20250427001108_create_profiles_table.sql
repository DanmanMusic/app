-- supabase/migrations/20250427001108_create_profiles_table.sql
-- Creates profiles table, helper functions, and RLS policies

-- == Create Profiles Table ==
CREATE TABLE public.profiles (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role text NOT NULL CHECK (role IN ('admin', 'teacher', 'student', 'parent')),
    first_name text NOT NULL,
    last_name text NOT NULL,
    nickname text NULL,
    status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    current_goal_reward_id uuid NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT fk_profiles_goal_reward FOREIGN KEY (current_goal_reward_id) REFERENCES public.rewards(id) ON DELETE SET NULL
);

-- == Comments ==
COMMENT ON TABLE public.profiles IS 'Stores user profile information, extending Supabase auth.users.';
COMMENT ON COLUMN public.profiles.id IS 'Matches the id from auth.users.';
COMMENT ON COLUMN public.profiles.role IS 'Defines the user role within the application.';
COMMENT ON COLUMN public.profiles.status IS 'Indicates if the user account is active or inactive.';
COMMENT ON COLUMN public.profiles.nickname IS 'Optional display name chosen by the user.';
COMMENT ON COLUMN public.profiles.current_goal_reward_id IS 'The ID of the reward item the student has set as their current goal.';

-- == Enable RLS First ==
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- == Helper Functions ==

-- Drop functions if they exist to ensure clean creation/update
DROP FUNCTION IF EXISTS public.is_active_admin(uuid);
DROP FUNCTION IF EXISTS public.is_active_admin_or_teacher(uuid);
DROP FUNCTION IF EXISTS public.can_student_or_parent_update_profile_limited(uuid);

-- Function: is_active_admin
CREATE OR REPLACE FUNCTION public.is_active_admin(user_id uuid)
RETURNS boolean AS $$
DECLARE
  is_admin_user boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = user_id
      AND role = 'admin'
      AND status = 'active'
  ) INTO is_admin_user;
  RETURN is_admin_user;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: is_active_admin_or_teacher
CREATE OR REPLACE FUNCTION public.is_active_admin_or_teacher(user_id uuid)
RETURNS boolean AS $$
DECLARE
  user_role text;
BEGIN
  SELECT role INTO user_role
  FROM public.profiles
  WHERE id = user_id AND status = 'active';
  RETURN user_role IN ('admin', 'teacher');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: can_student_or_parent_update_profile_limited
CREATE OR REPLACE FUNCTION public.can_student_or_parent_update_profile_limited(profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    -- Case 1: Current user is the student themselves (and must be active to update)
    SELECT 1
    FROM public.profiles p
    WHERE p.id = profile_id
      AND auth.uid() = p.id -- Check ownership
      AND p.status = 'active'

    UNION ALL

    -- Case 2: Current user is a linked parent (and parent must be active)
    SELECT 1
    FROM public.parent_students ps
    JOIN public.profiles parent_profile ON ps.parent_id = parent_profile.id
    WHERE ps.student_id = profile_id
      AND auth.uid() = ps.parent_id -- Current user is the linked parent
      AND parent_profile.status = 'active' -- Parent is active
  )
  -- Ensure the target profile being updated isn't an admin profile (redundant check, but safe)
  AND EXISTS (SELECT 1 FROM public.profiles target WHERE target.id = profile_id AND target.role <> 'admin');

$$;

-- == Grant Execute Permissions ==
GRANT EXECUTE ON FUNCTION public.is_active_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_active_admin(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.is_active_admin_or_teacher(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_active_admin_or_teacher(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.can_student_or_parent_update_profile_limited(uuid) TO authenticated;


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
CREATE INDEX idx_profiles_current_goal ON public.profiles (current_goal_reward_id);

-- ==================
-- RLS SELECT Policies
-- ==================

CREATE POLICY "Profiles: Allow admin read access" ON public.profiles
  FOR SELECT TO authenticated
  USING (public.is_active_admin(auth.uid()));
COMMENT ON POLICY "Profiles: Allow admin read access" ON public.profiles IS 'Allows active admins to read all profiles.';

CREATE POLICY "Profiles: Allow individual read own profile" ON public.profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id);
COMMENT ON POLICY "Profiles: Allow individual read own profile" ON public.profiles IS 'Allows authenticated users to read their own profile.';

CREATE POLICY "Profiles: Allow teachers read linked students" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    public.is_active_admin_or_teacher(auth.uid())
    AND role = 'student'
    AND EXISTS (
      SELECT 1 FROM public.student_teachers st
      WHERE st.teacher_id = auth.uid() AND st.student_id = public.profiles.id
    )
  );
COMMENT ON POLICY "Profiles: Allow teachers read linked students" ON public.profiles IS 'Allows active teachers to read the profiles of students linked to them.';

CREATE POLICY "Profiles: Allow parents read linked children" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    role = 'student'
    AND EXISTS (
      SELECT 1 FROM public.parent_students ps
      WHERE ps.parent_id = auth.uid() AND ps.student_id = public.profiles.id
    )
    -- Add check for parent status using the new function structure
    AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.status = 'active')
  );
COMMENT ON POLICY "Profiles: Allow parents read linked children" ON public.profiles IS 'Allows active parents to read the profiles of students linked to them as children.';

CREATE POLICY "Profiles: Allow users read Active Admin/Teacher info"
ON public.profiles
FOR SELECT TO authenticated
USING (
    (role = 'admin' AND status = 'active')
    OR
    (role = 'teacher' AND status = 'active')
);
COMMENT ON POLICY "Profiles: Allow users read Active Admin/Teacher info" ON public.profiles
IS 'Allows any authenticated user to read basic info of ACTIVE Admin or ACTIVE Teacher profiles (e.g., for name lookups).';


-- ==================
-- RLS UPDATE Policy
-- ==================

-- Use the dedicated function for student/parent updates
CREATE POLICY "Profiles: Allow student/parent update limited fields"
ON public.profiles FOR UPDATE
TO authenticated
USING (
    public.can_student_or_parent_update_profile_limited(id) -- Check if current user is the student or linked parent (and active)
)
WITH CHECK (
    (id = id)    
    -- public.can_student_or_parent_update_profile_limited(id) -- Re-check permission
    AND role = (SELECT p.role FROM public.profiles p WHERE p.id = profiles.id) -- Use profiles.id here
    AND status = (SELECT p.status FROM public.profiles p WHERE p.id = profiles.id)
    -- AND first_name = (SELECT p.first_name FROM public.profiles p WHERE p.id = profiles.id)
    -- AND last_name = (SELECT p.last_name FROM public.profiles p WHERE p.id = profiles.id)
    -- AND current_goal_reward_id = (SELECT p.current_goal_reward_id FROM public.profiles p WHERE p.id = profiles.id)
    -- AND nickname = (SELECT p.nickname FROM public.profiles p WHERE p.id = profiles.id)
);
COMMENT ON POLICY "Profiles: Allow student/parent update limited fields" ON public.profiles
IS 'Allows active students or their active linked parents to update ONLY the nickname or current_goal_reward_id of the student profile.';

-- Note: Active Admins perform updates via Edge Functions which bypass RLS by default.
-- Note: Teachers currently cannot update student profiles directly via RLS. They use updateUserWithLinks Edge Function.