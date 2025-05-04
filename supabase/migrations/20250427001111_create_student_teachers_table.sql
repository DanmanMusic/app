-- supabase/migrations/<timestamp>_create_student_teachers_table.sql

-- == Create Student Teachers Link Table ==
-- Many-to-Many relationship between students and teachers (both profiles)
CREATE TABLE public.student_teachers (
    student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    teacher_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (student_id, teacher_id)
    -- Optional role check constraints deferred
    -- CONSTRAINT check_student_role CHECK (is_profile_role(student_id, 'student')),
    -- CONSTRAINT check_teacher_role CHECK (is_profile_role(teacher_id, 'teacher'))
);

-- == Comments ==
COMMENT ON TABLE public.student_teachers IS 'Links students to their assigned teachers.';
COMMENT ON COLUMN public.student_teachers.student_id IS 'FK to the student profile.';
COMMENT ON COLUMN public.student_teachers.teacher_id IS 'FK to the teacher profile.';

-- == Enable RLS ==
ALTER TABLE public.student_teachers ENABLE ROW LEVEL SECURITY;

-- == Indexes ==
CREATE INDEX idx_student_teachers_student_id ON public.student_teachers (student_id);
CREATE INDEX idx_student_teachers_teacher_id ON public.student_teachers (teacher_id);

-- SELECT Policy: Allow Admins and related users (student, teacher, linked parent) to read.
CREATE POLICY "Student Teachers: Allow related read access"
ON public.student_teachers
FOR SELECT
TO authenticated
USING (
    public.is_active_admin(auth.uid()) -- Admins can read all
    OR
    auth.uid() = student_id     -- Student can see their teacher links
    OR
    auth.uid() = teacher_id     -- Teacher can see their student links
    OR
    EXISTS ( -- Parent can see their children's teacher links
        SELECT 1 FROM public.parent_students ps
        WHERE ps.parent_id = auth.uid() AND ps.student_id = student_teachers.student_id
    )
);

COMMENT ON POLICY "Student Teachers: Allow related read access" ON public.student_teachers
IS 'Allows admins, the student, the teacher, or the student''s linked parents to read the link.';


-- WRITE Policy (INSERT, UPDATE, DELETE): Allow ONLY admins.
-- Managed via updateUserWithLinks Edge Function.
CREATE POLICY "Student Teachers: Allow admin write access"
ON public.student_teachers
FOR ALL -- Covers INSERT, UPDATE, DELETE
TO authenticated
USING (public.is_active_admin(auth.uid())) -- Allow if the user IS an admin
WITH CHECK (public.is_active_admin(auth.uid())); -- Ensure they remain admin during the operation

COMMENT ON POLICY "Student Teachers: Allow admin write access" ON public.student_teachers
IS 'Allows users with the admin role to create, update, and delete student-teacher links.';