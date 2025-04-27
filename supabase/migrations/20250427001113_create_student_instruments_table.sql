-- supabase/migrations/<timestamp>_create_student_instruments_table.sql

-- == Create Student Instruments Link Table ==
-- Many-to-Many relationship between students (profiles) and instruments

CREATE TABLE public.student_instruments (
    student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    instrument_id uuid NOT NULL REFERENCES public.instruments(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (student_id, instrument_id) -- Composite primary key prevents duplicates
);

-- == Comments ==
COMMENT ON TABLE public.student_instruments IS 'Links students to the instruments they play/learn.';
COMMENT ON COLUMN public.student_instruments.student_id IS 'FK to the student profile.';
COMMENT ON COLUMN public.student_instruments.instrument_id IS 'FK to the instrument.';

-- == Enable RLS ==
ALTER TABLE public.student_instruments ENABLE ROW LEVEL SECURITY;

-- == Indexes ==
-- Index for efficient lookup by student
CREATE INDEX idx_student_instruments_student_id ON public.student_instruments (student_id);
-- Index for efficient lookup by instrument (less common, but possible)
CREATE INDEX idx_student_instruments_instrument_id ON public.student_instruments (instrument_id);

-- == Row Level Security (RLS) Policies ==
-- WARNING: TEMPORARY DEVELOPMENT POLICIES - Allow anonymous access. MUST BE REPLACED.

-- 1. TEMP Anon Select
DROP POLICY IF EXISTS "TEMP Allow anon select on student_instruments" ON public.student_instruments;
CREATE POLICY "TEMP Allow anon select on student_instruments"
ON public.student_instruments FOR SELECT
TO anon
USING (true);
COMMENT ON POLICY "TEMP Allow anon select on student_instruments" ON public.student_instruments IS 'TEMP DEV ONLY: Allows anon read access. MUST BE REPLACED.';

-- 2. TEMP Anon Write (Insert/Delete/Update)
DROP POLICY IF EXISTS "TEMP Allow anon write on student_instruments" ON public.student_instruments;
CREATE POLICY "TEMP Allow anon write on student_instruments"
ON public.student_instruments FOR ALL
TO anon
USING (true)
WITH CHECK (true);
COMMENT ON POLICY "TEMP Allow anon write on student_instruments" ON public.student_instruments IS 'TEMP DEV ONLY: Allows anon write access. MUST BE REPLACED.';