-- supabase/migrations/20250426232946_create_announcements_table.sql -- Replace YYYY... with actual timestamp

-- Define ENUM type for announcement types
DROP TYPE IF EXISTS public.announcement_type;
CREATE TYPE public.announcement_type AS ENUM (
    'announcement',
    'challenge',
    'redemption_celebration'
);

-- == Create Announcements Table ==
CREATE TABLE public.announcements (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    type public.announcement_type NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    date timestamptz NOT NULL DEFAULT now(),
    related_student_id uuid NULL, -- Create the column, but NO foreign key constraint yet
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
    -- Constraint to be added later if profiles table and feature are confirmed:
    -- CONSTRAINT fk_announcements_related_student FOREIGN KEY (related_student_id) REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- == Comments ==
COMMENT ON TABLE public.announcements IS 'Stores announcements, challenges, or celebrations displayed in the app.';
COMMENT ON COLUMN public.announcements.type IS 'Categorizes the announcement.';
COMMENT ON COLUMN public.announcements.title IS 'The headline of the announcement.';
COMMENT ON COLUMN public.announcements.message IS 'The main content body of the announcement.';
COMMENT ON COLUMN public.announcements.date IS 'The primary date associated with the announcement (e.g., publish date).';
COMMENT ON COLUMN public.announcements.related_student_id IS 'Optional link to a student profile (FK to profiles table TBD).'; -- Updated comment

-- == Enable RLS ==
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- == Updated At Trigger ==
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'handle_updated_at') THEN
    CREATE TRIGGER on_announcement_update
    BEFORE UPDATE ON public.announcements
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();
  ELSE
    RAISE WARNING 'Function handle_updated_at() not found. Skipping trigger creation for announcements table.';
  END IF;
END $$;

-- == Indexes ==
CREATE INDEX idx_announcements_type_date ON public.announcements (type, date DESC);
CREATE INDEX idx_announcements_related_student ON public.announcements (related_student_id); -- Index is still useful even without FK


-- == Row Level Security (RLS) Policies ==
-- WARNING: TEMPORARY DEVELOPMENT POLICIES - Allow anonymous access. MUST BE REPLACED.

-- 1. Public Read Access
DROP POLICY IF EXISTS "Allow public read access on announcements" ON public.announcements;
CREATE POLICY "Allow public read access on announcements"
ON public.announcements
FOR SELECT
USING (true);
COMMENT ON POLICY "Allow public read access on announcements" ON public.announcements IS 'Allows anyone (publicly) to read announcements.';

-- 2. Anonymous Insert Access (TEMPORARY)
DROP POLICY IF EXISTS "TEMP Allow anon insert access on announcements" ON public.announcements;
CREATE POLICY "TEMP Allow anon insert access on announcements"
ON public.announcements
FOR INSERT
TO anon
WITH CHECK (true);
COMMENT ON POLICY "TEMP Allow anon insert access on announcements" ON public.announcements IS 'TEMP DEV ONLY: Allows anonymous users to add announcements. MUST BE REPLACED with authenticated admin policy.';

-- 3. Anonymous Update Access (TEMPORARY)
DROP POLICY IF EXISTS "TEMP Allow anon update access on announcements" ON public.announcements;
CREATE POLICY "TEMP Allow anon update access on announcements"
ON public.announcements
FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);
COMMENT ON POLICY "TEMP Allow anon update access on announcements" ON public.announcements IS 'TEMP DEV ONLY: Allows anonymous users to update announcements. MUST BE REPLACED with authenticated admin policy.';

-- 4. Anonymous Delete Access (TEMPORARY)
DROP POLICY IF EXISTS "TEMP Allow anon delete access on announcements" ON public.announcements;
CREATE POLICY "TEMP Allow anon delete access on announcements"
ON public.announcements
FOR DELETE
TO anon
USING (true);
COMMENT ON POLICY "TEMP Allow anon delete access on announcements" ON public.announcements IS 'TEMP DEV ONLY: Allows anonymous users to delete announcements. MUST BE REPLACED with authenticated admin policy.';