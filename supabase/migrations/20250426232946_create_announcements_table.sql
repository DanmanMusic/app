-- supabase/migrations/YYYYMMDDHHMMSS_create_announcements_table.sql

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
    related_student_id uuid NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    -- Add FK constraint now that profiles table exists
    CONSTRAINT fk_announcements_related_student FOREIGN KEY (related_student_id) REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- == Comments ==
COMMENT ON TABLE public.announcements IS 'Stores announcements, challenges, or celebrations displayed in the app.';
COMMENT ON COLUMN public.announcements.type IS 'Categorizes the announcement.';
COMMENT ON COLUMN public.announcements.title IS 'The headline of the announcement.';
COMMENT ON COLUMN public.announcements.message IS 'The main content body of the announcement.';
COMMENT ON COLUMN public.announcements.date IS 'The primary date associated with the announcement (e.g., publish date).';
COMMENT ON COLUMN public.announcements.related_student_id IS 'Optional link to a student profile (e.g., for redemption celebrations).';

-- == Enable RLS ==
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- == Updated At Trigger ==
DO $$
BEGIN
  -- Ensure the handle_updated_at function exists before creating the trigger.
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'handle_updated_at' AND pg_namespace.nspname = 'public') THEN
    CREATE TRIGGER on_announcement_update
    BEFORE UPDATE ON public.announcements
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();
     RAISE NOTICE 'Trigger on_announcement_update created for public.announcements.';
  ELSE
    RAISE WARNING 'Function public.handle_updated_at() not found. Skipping trigger creation for announcements table.';
  END IF;
END $$;

-- == Indexes ==
CREATE INDEX idx_announcements_type_date ON public.announcements (type, date DESC);
CREATE INDEX idx_announcements_related_student ON public.announcements (related_student_id);

-- Remove potentially existing policies first (including old TEMP/authenticated ones)
DROP POLICY IF EXISTS "Announcements: Allow authenticated read access" ON public.announcements;
DROP POLICY IF EXISTS "Announcements: Allow public read access" ON public.announcements;
DROP POLICY IF EXISTS "Announcements: Allow admin insert access" ON public.announcements;
DROP POLICY IF EXISTS "Announcements: Allow admin update access" ON public.announcements;
DROP POLICY IF EXISTS "Announcements: Allow admin delete access" ON public.announcements;
DROP POLICY IF EXISTS "TEMP Allow anon select on announcements" ON public.announcements;
DROP POLICY IF EXISTS "TEMP Allow anon write on announcements" ON public.announcements;
DROP POLICY IF EXISTS "TEMP Allow anon insert access on announcements" ON public.announcements;
DROP POLICY IF EXISTS "TEMP Allow anon update access on announcements" ON public.announcements;
DROP POLICY IF EXISTS "TEMP Allow anon delete access on announcements" ON public.announcements;


-- SELECT Policy: Allow ANYONE (public) to read announcements.
CREATE POLICY "Announcements: Allow public read access"
ON public.announcements
FOR SELECT
-- TO public -- Implicitly public if no TO clause and USING (true)
USING (true); -- Allows reading all announcement rows

COMMENT ON POLICY "Announcements: Allow public read access" ON public.announcements
IS 'Allows anyone (logged in or anonymous) to view announcements.';

-- INSERT Policy: Allow ONLY admins to create new announcements.
CREATE POLICY "Announcements: Allow admin insert access"
ON public.announcements
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

COMMENT ON POLICY "Announcements: Allow admin insert access" ON public.announcements
IS 'Allows users with the admin role to create announcements.';

-- UPDATE Policy: Allow ONLY admins to update existing announcements.
CREATE POLICY "Announcements: Allow admin update access"
ON public.announcements
FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

COMMENT ON POLICY "Announcements: Allow admin update access" ON public.announcements
IS 'Allows users with the admin role to update existing announcements.';

-- DELETE Policy: Allow ONLY admins to delete announcements.
CREATE POLICY "Announcements: Allow admin delete access"
ON public.announcements
FOR DELETE
TO authenticated
USING (public.is_admin(auth.uid()));

COMMENT ON POLICY "Announcements: Allow admin delete access" ON public.announcements
IS 'Allows users with the admin role to delete announcements.';