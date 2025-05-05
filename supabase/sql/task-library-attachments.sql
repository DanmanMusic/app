-- supabase/sql/task-library-attachments-rls.sql
-- Apply this using the Supabase Studio SQL Editor or via CLI apply

-- === Storage RLS for 'task-library-attachments' Bucket ===

-- POLICY 1: Allow Active Admin INSERT (Upload)
DROP POLICY IF EXISTS "Allow active admin/teacher uploads" ON storage.objects;
CREATE POLICY "Allow active admin/teacher uploads"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
    bucket_id = 'task-library-attachments'
    AND public.is_active_admin_or_teacher(auth.uid())
);
COMMENT ON POLICY "Allow active admin uploads" ON storage.objects IS 'Allows active Admins to upload to task-library-attachments.';

DROP POLICY IF EXISTS "Allow active authenticated reads" ON storage.objects;
CREATE POLICY "Allow active authenticated reads" ON storage.objects
FOR SELECT
TO authenticated -- Grant permission to any logged-in user...
USING (
  (bucket_id = 'task-library-attachments')
  AND
  EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid() AND status = 'active'
  )
);
COMMENT ON POLICY "Allow active authenticated reads" ON storage.objects
IS 'Allows any authenticated user with an active profile status to read objects from the task-library-attachments bucket.';

-- POLICY 3: Allow Active Admin UPDATE
DROP POLICY IF EXISTS "Allow active admin/teacher updates" ON storage.objects;
CREATE POLICY "Allow active admin/teacher updates"
ON storage.objects FOR UPDATE TO authenticated
USING (
    bucket_id = 'task-library-attachments'
    AND public.is_active_admin_or_teacher(auth.uid())
)
WITH CHECK (
    bucket_id = 'task-library-attachments'
    AND public.is_active_admin_or_teacher(auth.uid())
);
COMMENT ON POLICY "Allow active admin updates" ON storage.objects IS 'Allows active Admins to update objects in task-library-attachments.';


-- POLICY 4: Allow Active Admin DELETE
DROP POLICY IF EXISTS "Allow active admin/teacher deletes" ON storage.objects;
CREATE POLICY "Allow active admin deletes"
ON storage.objects FOR DELETE TO authenticated
USING (
    bucket_id = 'task-library-attachments'
    AND public.is_active_admin_or_teacher(auth.uid())
);
COMMENT ON POLICY "Allow active admin deletes" ON storage.objects IS 'Allows active Admins to delete objects from task-library-attachments.';