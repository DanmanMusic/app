-- /supabase/sql/instrument-icons.sql
-- ======================================================
-- SECURE RLS Policies for 'instrument-icons' Storage Bucket
-- ======================================================
-- These policies are intended for production use AFTER user authentication
-- and role management (specifically an 'admin' role) are implemented.
-- They restrict write operations (upload, update, delete) to authenticated
-- users identified as administrators.
--
-- Requirements:
-- 1. The 'instrument-icons' bucket must exist.
-- 2. A mechanism to identify admin users must be in place. The placeholder
--    function `public.is_active_admin()` is used here and would need to be created,
--    likely checking user metadata or a roles table linked to auth.uid().
--    Alternatively, you could check custom claims in auth.jwt().
-- ======================================================

-- Placeholder function definition (EXAMPLE ONLY - IMPLEMENTATION NEEDED)
-- This function would need to be created in your database.
-- Its logic depends on how you store user roles.
/*
CREATE OR REPLACE FUNCTION public.is_active_admin(user_id uuid)
RETURNS boolean AS $$
DECLARE
  is_active_admin_user boolean;
BEGIN
  -- Example: Check a 'profiles' table with a 'role' column
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = user_id AND role = 'admin' AND status = 'active' -- Ensure user is active admin
  ) INTO is_active_admin_user;
  RETURN is_active_admin_user;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; -- Use SECURITY DEFINER carefully

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION public.is_active_admin(uuid) TO authenticated;
*/
-- ======================================================

-- POLICY 1: Allow ADMIN INSERT (Upload) into 'instrument-icons' bucket
-- Ensures only authenticated admins can upload.
DROP POLICY IF EXISTS "Allow admin uploads to instrument-icons" ON storage.objects;
CREATE POLICY "Allow admin uploads to instrument-icons"
ON storage.objects FOR INSERT
TO authenticated -- Grant to any authenticated user...
WITH CHECK (
  bucket_id = 'instrument-icons' AND
  auth.role() = 'authenticated' AND -- Redundant but explicit
  public.is_active_admin(auth.uid()) -- ...but check if they are an admin using the helper function
);

COMMENT ON POLICY "Allow admin uploads to instrument-icons" ON storage.objects
IS 'Allows authenticated admin users to upload objects to the instrument-icons bucket.';


-- POLICY 2: Allow ADMIN UPDATE on 'instrument-icons' bucket
-- Ensures only authenticated admins can update (overwrite) objects.
DROP POLICY IF EXISTS "Allow admin updates in instrument-icons" ON storage.objects;
CREATE POLICY "Allow admin updates in instrument-icons"
ON storage.objects FOR UPDATE
TO authenticated -- Grant to any authenticated user...
USING (
  bucket_id = 'instrument-icons' AND
  auth.role() = 'authenticated' AND
  public.is_active_admin(auth.uid()) -- ...but check if they are an admin
)
WITH CHECK ( -- Also apply the check condition
  bucket_id = 'instrument-icons' AND
  public.is_active_admin(auth.uid())
);

COMMENT ON POLICY "Allow admin updates in instrument-icons" ON storage.objects
IS 'Allows authenticated admin users to update objects in the instrument-icons bucket.';


-- POLICY 3: Allow ADMIN DELETE from 'instrument-icons' bucket
-- Ensures only authenticated admins can delete objects.
DROP POLICY IF EXISTS "Allow admin deletes from instrument-icons" ON storage.objects;
CREATE POLICY "Allow admin deletes from instrument-icons"
ON storage.objects FOR DELETE
TO authenticated -- Grant to any authenticated user...
USING (
  bucket_id = 'instrument-icons' AND
  auth.role() = 'authenticated' AND
  public.is_active_admin(auth.uid()) -- ...but check if they are an admin
);

COMMENT ON POLICY "Allow admin deletes from instrument-icons" ON storage.objects
IS 'Allows authenticated admin users to delete objects from the instrument-icons bucket.';


-- POLICY 4: Allow PUBLIC READ Access (SELECT)
-- This remains the same as the bucket content (icons) needs to be publicly viewable.
-- Requires the bucket to be marked as "Public" in Storage settings.
DROP POLICY IF EXISTS "Allow public reads on instrument-icons" ON storage.objects;
CREATE POLICY "Allow public reads on instrument-icons"
ON storage.objects FOR SELECT
USING (bucket_id = 'instrument-icons');

COMMENT ON POLICY "Allow public reads on instrument-icons" ON storage.objects
IS 'Allows public read access (SELECT) to objects in the instrument-icons bucket.';