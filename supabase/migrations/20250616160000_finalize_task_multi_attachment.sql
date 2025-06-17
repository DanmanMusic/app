-- Migration: Finalize the move to multiple attachments/URLs for tasks by migrating any remaining data and dropping the old columns.

-- ========= TASK LIBRARY FINALIZATION =========

-- 1. Migrate any data from the old task_library.reference_url column
-- This logic prevents creating duplicate entries if the script is run more than once.
INSERT INTO public.task_library_urls (task_library_id, url, label)
SELECT 
    tl.id, 
    tl.reference_url, 
    'Reference Link'
FROM 
    public.task_library tl
WHERE 
    tl.reference_url IS NOT NULL 
    AND tl.reference_url <> ''
    AND NOT EXISTS (
        SELECT 1 
        FROM public.task_library_urls tlu 
        WHERE tlu.task_library_id = tl.id AND tlu.url = tl.reference_url
    );

-- 2. Migrate any data from the old task_library.attachment_path column
INSERT INTO public.task_library_attachments (task_library_id, file_path, file_name)
SELECT 
    tl.id, 
    tl.attachment_path, 
    COALESCE(split_part(tl.attachment_path, '/', 3), 'attachment')
FROM 
    public.task_library tl
WHERE 
    tl.attachment_path IS NOT NULL 
    AND tl.attachment_path <> ''
    AND NOT EXISTS (
        SELECT 1 
        FROM public.task_library_attachments tla 
        WHERE tla.task_library_id = tl.id AND tla.file_path = tl.attachment_path
    );

-- 3. Drop the old columns from task_library now that data is migrated
ALTER TABLE public.task_library DROP COLUMN IF EXISTS reference_url;
ALTER TABLE public.task_library DROP COLUMN IF EXISTS attachment_path;


-- ========= ASSIGNED TASKS FINALIZATION =========

-- 4. Migrate data from old assigned_tasks columns to new JSONB columns.
-- This UPDATE statement will only affect rows where the new columns are NULL 
-- but the old columns have data.
UPDATE public.assigned_tasks
SET
  task_links = COALESCE(task_links, '[]'::jsonb) || 
    CASE 
      WHEN task_link_url IS NOT NULL AND task_link_url <> '' THEN jsonb_build_array(jsonb_build_object('url', task_link_url, 'label', 'Reference Link'))
      ELSE '[]'::jsonb
    END,
  task_attachments = COALESCE(task_attachments, '[]'::jsonb) ||
    CASE
      WHEN task_attachment_path IS NOT NULL AND task_attachment_path <> '' THEN jsonb_build_array(jsonb_build_object('path', task_attachment_path, 'name', COALESCE(split_part(task_attachment_path, '/', 3), 'attachment')))
      ELSE '[]'::jsonb
    END
WHERE 
  task_links IS NULL OR task_attachments IS NULL;


-- 5. Drop the old columns from assigned_tasks
ALTER TABLE public.assigned_tasks DROP COLUMN IF EXISTS task_link_url;
ALTER TABLE public.assigned_tasks DROP COLUMN IF EXISTS task_attachment_path;