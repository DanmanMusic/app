SELECT name
FROM storage.objects
WHERE
  bucket_id = 'task-library-attachments' AND
  name NOT IN (
    -- Subquery to find all *referenced* file paths
    SELECT DISTINCT file_path FROM (
      -- Paths from the task library's dedicated link table
      SELECT tla.file_path
      FROM public.task_library_attachments tla
      WHERE tla.file_path IS NOT NULL

      UNION

      -- Paths from the assigned tasks' JSONB array
      SELECT (attachment_obj ->> 'path')::text as file_path
      FROM public.assigned_tasks,
           jsonb_array_elements(task_attachments) AS attachment_obj
      WHERE
        jsonb_typeof(task_attachments) = 'array'
        AND attachment_obj ->> 'path' IS NOT NULL
    ) AS all_references
  );