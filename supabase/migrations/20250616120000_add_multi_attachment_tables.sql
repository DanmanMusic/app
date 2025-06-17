-- Migration: Add tables and columns for multiple task attachments/URLs (Expand Phase)

-- ========= TASK LIBRARY ADDITIONS =========

-- 1. Create the new table for multiple library attachments
CREATE TABLE public.task_library_attachments (
    id bigserial PRIMARY KEY,
    task_library_id uuid NOT NULL REFERENCES public.task_library(id) ON DELETE CASCADE,
    file_path text NOT NULL,
    file_name text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.task_library_attachments ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.task_library_attachments IS 'Links task library items to multiple file attachments.';

-- 2. Create the new table for multiple library URLs
CREATE TABLE public.task_library_urls (
    id bigserial PRIMARY KEY,
    task_library_id uuid NOT NULL REFERENCES public.task_library(id) ON DELETE CASCADE,
    url text NOT NULL,
    label text,
    created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.task_library_urls ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.task_library_urls IS 'Links task library items to multiple reference URLs.';


-- ========= ASSIGNED TASKS ADDITIONS =========

-- 3. Add the new JSONB columns to assigned_tasks. The old text columns remain for now.
ALTER TABLE public.assigned_tasks 
ADD COLUMN IF NOT EXISTS task_links jsonb,
ADD COLUMN IF NOT EXISTS task_attachments jsonb;

COMMENT ON COLUMN public.assigned_tasks.task_links IS 'Array of URL objects, e.g., [{"url": "...", "label": "..."}]';
COMMENT ON COLUMN public.assigned_tasks.task_attachments IS 'Array of attachment objects, e.g., [{"path": "...", "name": "..."}]';


-- ========= RLS POLICIES FOR NEW TABLES =========

CREATE POLICY "Allow users in company to read attachments" ON public.task_library_attachments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.task_library tl
      WHERE tl.id = task_library_id AND tl.company_id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid
    )
  );

CREATE POLICY "Allow users in company to read urls" ON public.task_library_urls
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.task_library tl
      WHERE tl.id = task_library_id AND tl.company_id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid
    )
  );

-- No INSERT/UPDATE/DELETE policies are needed as these will be handled by secure Edge Functions.