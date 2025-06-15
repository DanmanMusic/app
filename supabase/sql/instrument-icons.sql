-- /supabase/sql/instrument-icons.sql
-- ======================================================
-- SECURE RLS Policies for 'instrument-icons' Storage Bucket (Multi-Tenant)
-- ======================================================

-- First, drop all old policies to ensure a clean state.
DROP POLICY IF EXISTS "Allow admin uploads to instrument-icons" ON storage.objects;
DROP POLICY IF EXISTS "Allow admin to upload to their company folder" ON storage.objects;
DROP POLICY IF EXISTS "Allow admin updates in instrument-icons" ON storage.objects;
DROP POLICY IF EXISTS "Allow admin to update in their company folder" ON storage.objects;
DROP POLICY IF EXISTS "Allow admin deletes from instrument-icons" ON storage.objects;
DROP POLICY IF EXISTS "Allow admin to delete from their company folder" ON storage.objects;
DROP POLICY IF EXISTS "Allow public reads on instrument-icons" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access to all instrument icons" ON storage.objects;

-- POLICY 1: Allow PUBLIC READ Access.
-- This is appropriate as instrument icons are not sensitive data.
CREATE POLICY "Allow public read access to all instrument icons"
ON storage.objects FOR SELECT
USING (bucket_id = 'instrument-icons');

-- POLICY 2: Allow ADMIN INSERT (Upload) into their OWN company's folder.
-- Path must be `{company_id}/*` and the user must be an admin of that company.
CREATE POLICY "Allow admin to upload to their company folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'instrument-icons' AND
  public.is_active_admin(auth.uid()) AND
  (storage.foldername(name))[1] = public.get_user_company_id(auth.uid())::text
);

-- POLICY 3: Allow ADMIN UPDATE in their OWN company's folder.
CREATE POLICY "Allow admin to update in their company folder"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'instrument-icons' AND
  public.is_active_admin(auth.uid()) AND
  (storage.foldername(name))[1] = public.get_user_company_id(auth.uid())::text
)
WITH CHECK (
    bucket_id = 'instrument-icons' AND
    public.is_active_admin(auth.uid()) AND
    (storage.foldername(name))[1] = public.get_user_company_id(auth.uid())::text
);


-- POLICY 4: Allow ADMIN DELETE from their OWN company's folder.
CREATE POLICY "Allow admin to delete from their company folder"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'instrument-icons' AND
  public.is_active_admin(auth.uid()) AND
  (storage.foldername(name))[1] = public.get_user_company_id(auth.uid())::text
);