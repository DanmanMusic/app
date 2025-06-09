-- Migration: Fix the RLS policy for avatar uploads.

-- Drop the old, potentially faulty policy
DROP POLICY IF EXISTS "Allow user to upload own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Allow user to read own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Allow user to update own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Allow user to delete own avatar" ON storage.objects;

-- Recreate all policies with a more robust check.

-- SELECT/READ Policy
CREATE POLICY "Allow users to read their own or admins to read any avatar"
ON storage.objects FOR SELECT TO authenticated
USING (
    bucket_id = 'avatars' AND
    (
        -- You can read your own avatar
        (storage.foldername(name))[1] = auth.uid()::text
        OR
        -- An admin can read any avatar in their company
        (
            public.is_active_admin(auth.uid()) AND
            EXISTS (
                SELECT 1 FROM public.profiles p
                WHERE p.id = ((storage.foldername(name))[1])::uuid
                AND p.company_id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid
            )
        )
    )
);

-- INSERT/UPLOAD Policy
CREATE POLICY "Allow user to upload own avatar"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = auth.uid()::text
);

-- UPDATE Policy
CREATE POLICY "Allow user to update own avatar"
ON storage.objects FOR UPDATE TO authenticated
USING (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = auth.uid()::text
);

-- DELETE Policy
CREATE POLICY "Allow user to delete own avatar"
ON storage.objects FOR DELETE TO authenticated
USING (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = auth.uid()::text
);