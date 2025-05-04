-- supabase/migrations/<timestamp>_create_student_instruments_table.sql

-- == Create Student Instruments Link Table ==
-- Many-to-Many relationship between students (profiles) and instruments
CREATE TABLE public.student_instruments (
    student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    instrument_id uuid NOT NULL REFERENCES public.instruments(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (student_id, instrument_id)
);

-- == Comments ==
COMMENT ON TABLE public.student_instruments IS 'Links students to the instruments they play/learn.';
COMMENT ON COLUMN public.student_instruments.student_id IS 'FK to the student profile.';
COMMENT ON COLUMN public.student_instruments.instrument_id IS 'FK to the instrument.';

-- == Enable RLS ==
ALTER TABLE public.student_instruments ENABLE ROW LEVEL SECURITY;

-- == Indexes ==
CREATE INDEX idx_student_instruments_student_id ON public.student_instruments (student_id);
CREATE INDEX idx_student_instruments_instrument_id ON public.student_instruments (instrument_id);


-- SELECT Policy: Allow Admins and related users (student, linked teacher, linked parent) to read.
CREATE POLICY "Student Instruments: Allow related read access"
ON public.student_instruments
FOR SELECT
TO authenticated
USING (
    public.is_active_admin(auth.uid()) -- Admins can read all
    OR
    auth.uid() = student_id     -- Student can see their own instruments
    OR
    EXISTS ( -- Teacher can see their students' instruments
        SELECT 1 FROM public.student_teachers st
        WHERE st.teacher_id = auth.uid() AND st.student_id = student_instruments.student_id
    )
    OR
    EXISTS ( -- Parent can see their children's instruments
        SELECT 1 FROM public.parent_students ps
        WHERE ps.parent_id = auth.uid() AND ps.student_id = student_instruments.student_id
    )
);

COMMENT ON POLICY "Student Instruments: Allow related read access" ON public.student_instruments
IS 'Allows admins, the student, their linked teachers, or their linked parents to read the instrument link.';


-- WRITE Policy (INSERT, UPDATE, DELETE): Allow ONLY admins.
CREATE POLICY "Student Instruments: Allow admin write access"
ON public.student_instruments
FOR ALL -- Covers INSERT, UPDATE, DELETE
TO authenticated
USING (public.is_active_admin(auth.uid())) -- Allow if the user IS an admin
WITH CHECK (public.is_active_admin(auth.uid())); -- Ensure they remain admin during the operation

COMMENT ON POLICY "Student Instruments: Allow admin write access" ON public.student_instruments
IS 'Allows users with the admin role to create, update, and delete student-instrument links.';