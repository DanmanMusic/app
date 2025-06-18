-- DESTRUCTIVE ACTION (Corrected with explicit type cast)

DO $$
DECLARE
  orphaned_files_to_delete TEXT[];
BEGIN
  -- 1. Identify the orphaned files.
  WITH all_stored_files AS (
    SELECT name AS file_path FROM storage.objects WHERE bucket_id = 'task-library-attachments'
  ),
  all_referenced_files AS (
    SELECT DISTINCT tla.file_path FROM public.task_library_attachments tla WHERE tla.file_path IS NOT NULL
    UNION
    SELECT DISTINCT (attachment_obj ->> 'path')::text as file_path
    FROM public.assigned_tasks, jsonb_array_elements(task_attachments) AS attachment_obj
    WHERE jsonb_typeof(task_attachments) = 'array' AND attachment_obj ->> 'path' IS NOT NULL
  )
  SELECT
    array_agg(sf.file_path)
  INTO
    orphaned_files_to_delete
  FROM
    all_stored_files sf
  LEFT JOIN
    all_referenced_files rf ON sf.file_path = rf.file_path
  WHERE
    rf.file_path IS NULL;

  -- 2. If orphaned files were found, log the names and then delete them.
  IF array_length(orphaned_files_to_delete, 1) > 0 THEN
    RAISE NOTICE 'Orphaned files to be deleted: %', orphaned_files_to_delete;
    
    -- *** THIS IS THE CORRECTED LINE ***
    PERFORM storage.delete_objects('task-library-attachments'::text, orphaned_files_to_delete);

    RAISE NOTICE 'Deletion of % file(s) complete.', array_length(orphaned_files_to_delete, 1);
  ELSE
    RAISE NOTICE 'No orphaned files found to delete.';
  END IF;

END $$;