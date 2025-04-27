-- supabase/migrations/<timestamp>_create_student_teachers_table.sql

-- == Create Student Teachers Link Table ==
-- Many-to-Many relationship between students and teachers (both profiles)

CREATE TABLE public.student_teachers (
    student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    teacher_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (student_id, teacher_id)
    -- Add constraint to ensure roles are correct (optional but good practice)
    -- This requires helper functions or more complex checks, deferring for now.
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

-- == Row Level Security (RLS) Policies ==
-- WARNING: TEMPORARY DEVELOPMENT POLICIES - Allow anonymous access. MUST BE REPLACED.

-- 1. TEMP Anon Select
DROP POLICY IF EXISTS "TEMP Allow anon select on student_teachers" ON public.student_teachers;
CREATE POLICY "TEMP Allow anon select on student_teachers"
ON public.student_teachers FOR SELECT
TO anon
USING (true);
COMMENT ON POLICY "TEMP Allow anon select on student_teachers" ON public.student_teachers IS 'TEMP DEV ONLY: Allows anon read access. MUST BE REPLACED.';

-- 2. TEMP Anon Write (Insert/Delete/Update)
DROP POLICY IF EXISTS "TEMP Allow anon write on student_teachers" ON public.student_teachers;
CREATE POLICY "TEMP Allow anon write on student_teachers"
ON public.student_teachers FOR ALL
TO anon
USING (true)
WITH CHECK (true);
COMMENT ON POLICY "TEMP Allow anon write on student_teachers" ON public.student_teachers IS 'TEMP DEV ONLY: Allows anon write access. MUST BE REPLACED.';