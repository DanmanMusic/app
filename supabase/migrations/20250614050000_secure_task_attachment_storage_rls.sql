-- Migration: Implement multi-tenant RLS policies for the task attachments bucket.
-- File: supabase/migrations/20250614050000_secure_task_attachment_storage_rls.sql

-- First, drop all old, insecure policies on the bucket to ensure a clean slate.
DROP POLICY IF EXISTS "Allow active admin/teacher uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow active admin uploads" ON storage.objects; -- Older name
DROP POLICY IF EXISTS "Allow active authenticated reads" ON storage.objects;
DROP POLICY IF EXISTS "Allow active admin/teacher updates" ON storage.objects;
DROP POLICY IF EXISTS "Allow active admin updates" ON storage.objects; -- Older name
DROP POLICY IF EXISTS "Allow active admin deletes" ON storage.objects;
DROP POLICY IF EXISTS "Allow active admin/teacher deletes" ON storage.objects; -- Older name

-- Recall: get_user_company_id(uuid) function was created in the avatar migration. We will reuse it.
-- CREATE OR REPLACE FUNCTION public.get_user_company_id(p_user_id uuid) ...

-- POLICY 1: Allow active, authenticated users to VIEW/SELECT any attachment from THEIR OWN company.
-- This is secure and necessary for students/parents to view attachments for their assigned tasks.
CREATE POLICY "Allow authenticated read access within own company"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'task-library-attachments' AND
  (storage.foldername(name))[1] = public.get_user_company_id(auth.uid())::text
);

-- POLICY 2: Allow an active admin or teacher to UPLOAD/INSERT an attachment into THEIR OWN company folder.
-- The path must be `{their_company_id}/{any_subfolders...}`
CREATE POLICY "Allow admin/teacher to upload to their own company folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'task-library-attachments' AND
  (storage.foldername(name))[1] = public.get_user_company_id(auth.uid())::text AND
  public.is_active_admin_or_teacher(auth.uid())
);

-- POLICY 3: Allow an active admin or teacher to UPDATE an attachment in THEIR OWN company folder.
CREATE POLICY "Allow admin/teacher to update in their own company folder"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'task-library-attachments' AND
  (storage.foldername(name))[1] = public.get_user_company_id(auth.uid())::text AND
  public.is_active_admin_or_teacher(auth.uid())
);

-- POLICY 4: Allow an active admin or teacher to DELETE an attachment in THEIR OWN company folder.
CREATE POLICY "Allow admin/teacher to delete from their own company folder"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'task-library-attachments' AND
  (storage.foldername(name))[1] = public.get_user_company_id(auth.uid())::text AND
  public.is_active_admin_or_teacher(auth.uid())
);