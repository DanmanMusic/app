-- Migration: Implement multi-tenant avatar storage policies

-- First, drop all old policies to ensure a clean state.
DROP POLICY IF EXISTS "Allow users to read their own or admins to read any avatar" ON storage.objects;
DROP POLICY IF EXISTS "Allow user to upload own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Allow user to update own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Allow user to delete own avatar" ON storage.objects;

-- Helper function to get the company_id for a given user from their profile.
-- This is secure because it's defined by the superuser.
CREATE OR REPLACE FUNCTION public.get_user_company_id(p_user_id uuid)
RETURNS uuid AS $$
  SELECT company_id FROM public.profiles WHERE id = p_user_id;
$$ LANGUAGE sql SECURITY DEFINER;


-- POLICY 1: Allow any authenticated user to VIEW/SELECT any avatar from THEIR OWN company.
-- This makes features like "Announcements" possible.
-- It checks if the first folder in the path (the company_id) matches the caller's company_id.
CREATE POLICY "Allow authenticated view within own company"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = public.get_user_company_id(auth.uid())::text
);

-- POLICY 2: Allow a user to UPLOAD/INSERT an avatar only for THEMSELVES.
-- This is the crucial security check.
-- It verifies the path is {their_company_id}/{their_user_id}/...
CREATE POLICY "Allow user to upload their own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = public.get_user_company_id(auth.uid())::text AND
  (storage.foldername(name))[2] = auth.uid()::text
);

-- POLICY 3: Allow a user to UPDATE their OWN avatar. (Same check as insert)
CREATE POLICY "Allow user to update their own avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = public.get_user_company_id(auth.uid())::text AND
  (storage.foldername(name))[2] = auth.uid()::text
);

-- POLICY 4: Allow a user to DELETE their OWN avatar. (Same check as insert)
CREATE POLICY "Allow user to delete their own avatar"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = public.get_user_company_id(auth.uid())::text AND
  (storage.foldername(name))[2] = auth.uid()::text
);