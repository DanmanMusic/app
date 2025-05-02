-- Function to check if the current user is the student OR a linked parent
-- AND the current user is not an admin
CREATE OR REPLACE FUNCTION public.can_student_or_parent_update_profile_limited(profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE -- Function does not modify data
SECURITY DEFINER -- Allows checking profiles/links table even if user can't directly select
AS $$
  SELECT EXISTS (
    -- Case 1: Current user is the student themselves AND not an admin
    SELECT 1
    FROM public.profiles p
    WHERE p.id = profile_id
      AND auth.uid() = p.id -- Check ownership
      AND p.role <> 'admin' -- Not an admin

    UNION ALL

    -- Case 2: Current user is a linked parent AND not an admin
    SELECT 1
    FROM public.parent_students ps
    JOIN public.profiles parent_profile ON ps.parent_id = parent_profile.id
    WHERE ps.student_id = profile_id
      AND auth.uid() = ps.parent_id -- Current user is the linked parent
      AND parent_profile.role <> 'admin' -- Parent is not an admin
  );
$$;

-- Grant necessary permission to use the function in policies
GRANT EXECUTE ON FUNCTION public.can_student_or_parent_update_profile_limited(uuid) TO authenticated;