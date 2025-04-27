-- supabase/migrations/YYYYMMDDHHMMSS_create_task_library_table.sql -- Replace YYYY... with actual timestamp

-- == Create Task Library Table ==

CREATE TABLE public.task_library (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL,
    description text NULL, -- Keeping description nullable as per current model/spec discussion
    base_tickets integer NOT NULL CHECK (base_tickets >= 0),
    -- Potential future field (Decision Pending in SPEC): link_url text NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- == Comments ==
COMMENT ON TABLE public.task_library IS 'Stores predefined, reusable tasks that can be assigned.';
COMMENT ON COLUMN public.task_library.title IS 'Short, display title of the task.';
COMMENT ON COLUMN public.task_library.description IS 'Longer description or instructions for the task.';
COMMENT ON COLUMN public.task_library.base_tickets IS 'Default number of tickets awarded for completing this task.';
-- COMMENT ON COLUMN public.task_library.link_url IS 'Optional external URL related to the task.';

-- == Enable RLS ==
ALTER TABLE public.task_library ENABLE ROW LEVEL SECURITY;

-- == Updated At Trigger ==
-- Apply the existing updated_at trigger function
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'handle_updated_at') THEN
    CREATE TRIGGER on_task_library_update
    BEFORE UPDATE ON public.task_library
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();
  ELSE
    RAISE WARNING 'Function handle_updated_at() not found. Skipping trigger creation for task_library table.';
  END IF;
END $$;

-- == Row Level Security (RLS) Policies ==
-- WARNING: TEMPORARY DEVELOPMENT POLICIES - Allow anonymous access. MUST BE REPLACED.

-- 1. Public Read Access (Allow anyone, including students/teachers, to see the library)
DROP POLICY IF EXISTS "Allow public read access on task_library" ON public.task_library;
CREATE POLICY "Allow public read access on task_library"
ON public.task_library
FOR SELECT
USING (true);

COMMENT ON POLICY "Allow public read access on task_library" ON public.task_library
IS 'Allows anyone (publicly) to read the task library.';

-- 2. Anonymous Insert Access (TEMPORARY)
DROP POLICY IF EXISTS "TEMP Allow anon insert access on task_library" ON public.task_library;
CREATE POLICY "TEMP Allow anon insert access on task_library"
ON public.task_library
FOR INSERT
TO anon -- Grant to anonymous role
WITH CHECK (true);

COMMENT ON POLICY "TEMP Allow anon insert access on task_library" ON public.task_library
IS 'TEMP DEV ONLY: Allows anonymous users to add task library items. MUST BE REPLACED with authenticated admin policy.';

-- 3. Anonymous Update Access (TEMPORARY)
DROP POLICY IF EXISTS "TEMP Allow anon update access on task_library" ON public.task_library;
CREATE POLICY "TEMP Allow anon update access on task_library"
ON public.task_library
FOR UPDATE
TO anon -- Grant to anonymous role
USING (true)
WITH CHECK (true);

COMMENT ON POLICY "TEMP Allow anon update access on task_library" ON public.task_library
IS 'TEMP DEV ONLY: Allows anonymous users to update task library items. MUST BE REPLACED with authenticated admin policy.';

-- 4. Anonymous Delete Access (TEMPORARY)
DROP POLICY IF EXISTS "TEMP Allow anon delete access on task_library" ON public.task_library;
CREATE POLICY "TEMP Allow anon delete access on task_library"
ON public.task_library
FOR DELETE
TO anon -- Grant to anonymous role
USING (true);

COMMENT ON POLICY "TEMP Allow anon delete access on task_library" ON public.task_library
IS 'TEMP DEV ONLY: Allows anonymous users to delete task library items. MUST BE REPLACED with authenticated admin policy.';