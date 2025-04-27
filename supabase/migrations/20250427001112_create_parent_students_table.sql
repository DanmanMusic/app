-- supabase/migrations/<timestamp>_create_parent_students_table.sql

-- == Create Parent Students Link Table ==
-- Many-to-Many relationship between parents and students (both profiles)

CREATE TABLE public.parent_students (
    parent_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (parent_id, student_id)
    -- Add constraint to ensure roles are correct (optional but good practice)
    -- Deferring role check constraints for now.
    -- CONSTRAINT check_parent_role CHECK (is_profile_role(parent_id, 'parent')),
    -- CONSTRAINT check_student_role_in_parent CHECK (is_profile_role(student_id, 'student'))
);

-- == Comments ==
COMMENT ON TABLE public.parent_students IS 'Links parents to their children (students).';
COMMENT ON COLUMN public.parent_students.parent_id IS 'FK to the parent profile.';
COMMENT ON COLUMN public.parent_students.student_id IS 'FK to the student profile.';

-- == Enable RLS ==
ALTER TABLE public.parent_students ENABLE ROW LEVEL SECURITY;

-- == Indexes ==
CREATE INDEX idx_parent_students_parent_id ON public.parent_students (parent_id);
CREATE INDEX idx_parent_students_student_id ON public.parent_students (student_id);

-- == Row Level Security (RLS) Policies ==
-- WARNING: TEMPORARY DEVELOPMENT POLICIES - Allow anonymous access. MUST BE REPLACED.

-- 1. TEMP Anon Select
DROP POLICY IF EXISTS "TEMP Allow anon select on parent_students" ON public.parent_students;
CREATE POLICY "TEMP Allow anon select on parent_students"
ON public.parent_students FOR SELECT
TO anon
USING (true);
COMMENT ON POLICY "TEMP Allow anon select on parent_students" ON public.parent_students IS 'TEMP DEV ONLY: Allows anon read access. MUST BE REPLACED.';

-- 2. TEMP Anon Write (Insert/Delete/Update)
DROP POLICY IF EXISTS "TEMP Allow anon write on parent_students" ON public.parent_students;
CREATE POLICY "TEMP Allow anon write on parent_students"
ON public.parent_students FOR ALL
TO anon
USING (true)
WITH CHECK (true);
COMMENT ON POLICY "TEMP Allow anon write on parent_students" ON public.parent_students IS 'TEMP DEV ONLY: Allows anon write access. MUST BE REPLACED.';