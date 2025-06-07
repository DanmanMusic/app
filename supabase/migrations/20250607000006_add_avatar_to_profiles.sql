-- Migration: Add avatar_path column to the profiles table.
-- This will store the path to a user's uploaded avatar image in Supabase Storage.

-- Step 1: Alter the profiles table to add the new column.
-- It is nullable, as not all users may have an avatar.
ALTER TABLE public.profiles
ADD COLUMN avatar_path text NULL;


-- Step 2: Add a comment for clarity.
COMMENT ON COLUMN public.profiles.avatar_path IS 'Path to the user''s avatar image in the ''avatars'' storage bucket.';


-- Step 3: Create the 'avatars' storage bucket if it doesn't exist.
-- The RLS policies will handle access control.
INSERT INTO storage.buckets (id, name, public, owner)
VALUES ('avatars', 'avatars', false, null)
ON CONFLICT (id) DO NOTHING;


-- Step 4: Define RLS Policies for the 'avatars' storage bucket.
-- These policies ensure that users can only manage their own avatar.
-- The naming convention is assumed to be {user_id}/{filename}.

-- Policy for SELECT: A user can view their own avatar.
-- We also allow admins to view avatars for management purposes.
DROP POLICY IF EXISTS "Allow user to read own avatar" ON storage.objects;
CREATE POLICY "Allow user to read own avatar"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'avatars' AND
    (
        -- The user owns the avatar if the file name is in a folder matching their user ID.
        (storage.foldername(name))[1] = auth.uid()::text
        OR
        -- Or the user is an admin in the same company as the avatar's owner.
        (
            public.is_active_admin(auth.uid()) AND
            EXISTS (
                SELECT 1 FROM public.profiles p
                WHERE p.id = ((storage.foldername(name))[1])::uuid
                AND p.company_id = public.get_current_user_company_id()
            )
        )
    )
);

-- Policy for INSERT: A user can upload their own avatar.
DROP POLICY IF EXISTS "Allow user to upload own avatar" ON storage.objects;
CREATE POLICY "Allow user to upload own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy for UPDATE: A user can update (overwrite) their own avatar.
DROP POLICY IF EXISTS "Allow user to update own avatar" ON storage.objects;
CREATE POLICY "Allow user to update own avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy for DELETE: A user can delete their own avatar.
DROP POLICY IF EXISTS "Allow user to delete own avatar" ON storage.objects;
CREATE POLICY "Allow user to delete own avatar"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = auth.uid()::text
);