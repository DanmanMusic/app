-- /supabase/sql/reward-icons.sql
-- ======================================================
-- SECURE RLS Policies for 'reward-icons' Storage Bucket
-- ======================================================
-- These policies are intended for production use AFTER user authentication
-- and role management (specifically an 'admin' role) are implemented.
-- They restrict write operations (upload, update, delete) to authenticated
-- users identified as administrators.
--
-- Requirements:
-- 1. The 'reward-icons' bucket must exist.
-- 2. A mechanism to identify admin users must be in place. The placeholder
--    function `public.is_active_admin()` is used here and would need to be created,
--    likely checking user metadata or a roles table linked to auth.uid().
-- ======================================================

-- Ensure the is_active_admin function (or equivalent) exists before applying policies that use it.
-- See instrument-icons.sql for an example placeholder function definition.
-- DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_active_admin') THEN RAISE EXCEPTION 'Function public.is_active_admin(uuid) not found. Please create it before applying these policies.'; END IF; END $$;


-- POLICY 1: Allow ADMIN INSERT (Upload) into 'reward-icons' bucket
-- Ensures only authenticated admins can upload reward images.
DROP POLICY IF EXISTS "Allow admin uploads to reward-icons" ON storage.objects;
CREATE POLICY "Allow admin uploads to reward-icons"
ON storage.objects FOR INSERT
TO authenticated -- Grant to any authenticated user...
WITH CHECK (
  bucket_id = 'reward-icons' AND
  auth.role() = 'authenticated' AND
  public.is_active_admin(auth.uid()) -- ...but check if they are an admin
);

COMMENT ON POLICY "Allow admin uploads to reward-icons" ON storage.objects
IS 'Allows authenticated admin users to upload objects to the reward-icons bucket.';


-- POLICY 2: Allow ADMIN UPDATE on 'reward-icons' bucket
-- Ensures only authenticated admins can update (overwrite) reward images.
DROP POLICY IF EXISTS "Allow admin updates in reward-icons" ON storage.objects;
CREATE POLICY "Allow admin updates in reward-icons"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'reward-icons' AND
  auth.role() = 'authenticated' AND
  public.is_active_admin(auth.uid())
)
WITH CHECK ( -- Also apply the check condition
  bucket_id = 'reward-icons' AND
  public.is_active_admin(auth.uid())
);

COMMENT ON POLICY "Allow admin updates in reward-icons" ON storage.objects
IS 'Allows authenticated admin users to update objects in the reward-icons bucket.';


-- POLICY 3: Allow ADMIN DELETE from 'reward-icons' bucket
-- Ensures only authenticated admins can delete reward images.
DROP POLICY IF EXISTS "Allow admin deletes from reward-icons" ON storage.objects;
CREATE POLICY "Allow admin deletes from reward-icons"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'reward-icons' AND
  auth.role() = 'authenticated' AND
  public.is_active_admin(auth.uid())
);

COMMENT ON POLICY "Allow admin deletes from reward-icons" ON storage.objects
IS 'Allows authenticated admin users to delete objects from the reward-icons bucket.';


-- POLICY 4: Allow PUBLIC READ Access (SELECT) for 'reward-icons'
-- This remains the same as reward images need to be publicly viewable.
-- Requires the bucket to be marked as "Public" in Storage settings.
DROP POLICY IF EXISTS "Allow public reads on reward-icons" ON storage.objects;
CREATE POLICY "Allow public reads on reward-icons"
ON storage.objects FOR SELECT
USING (bucket_id = 'reward-icons');

COMMENT ON POLICY "Allow public reads on reward-icons" ON storage.objects
IS 'Allows public read access (SELECT) to objects in the reward-icons bucket.';