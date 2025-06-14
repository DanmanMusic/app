-- Migration: Update RLS policy on profiles to allow parents to update their children's goals.
-- File: supabase/migrations/20250613160000_fix_parent_update_profile_rls.sql

-- First, drop the old, overly restrictive policy.
DROP POLICY IF EXISTS "Allow user to update their own profile" ON public.profiles;

-- Create the new, more permissive policy.
CREATE POLICY "Allow user to update own profile or parent to update child's" ON public.profiles
  FOR UPDATE
  USING (
    -- Condition 1: You can update your own profile.
    auth.uid() = id
    OR
    -- Condition 2: You can update a profile IF you are a parent linked to that profile's ID.
    (
      EXISTS (
        SELECT 1
        FROM public.parent_students ps
        WHERE
          ps.student_id = public.profiles.id AND ps.parent_id = auth.uid()
      )
    )
  );

-- Add a comment for clarity.
COMMENT ON POLICY "Allow user to update own profile or parent to update child's" ON public.profiles
IS 'Allows a user to update their own profile, or allows a parent to update the profile of a student they are linked to.';