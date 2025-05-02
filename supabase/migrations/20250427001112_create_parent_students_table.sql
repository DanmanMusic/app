-- supabase/migrations/<timestamp>_create_parent_students_table.sql

CREATE TABLE public.parent_students (
    parent_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (parent_id, student_id)
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

-- SELECT Policy: Allow Admins, the linked Parent, or the linked Student to read.
CREATE POLICY "Parent Students: Allow related read access"
ON public.parent_students
FOR SELECT
TO authenticated
USING (
    public.is_admin(auth.uid()) -- Admins can read all
    OR
    auth.uid() = parent_id     -- The parent can see their own links
    OR
    auth.uid() = student_id    -- The student can see their own links
);

COMMENT ON POLICY "Parent Students: Allow related read access" ON public.parent_students
IS 'Allows admins, the specific parent, or the specific student in the link to read the record.';


-- WRITE Policy (INSERT, UPDATE, DELETE): Allow ONLY admins.
CREATE POLICY "Parent Students: Allow admin write access"
ON public.parent_students
FOR ALL -- Covers INSERT, UPDATE, DELETE
TO authenticated
USING (public.is_admin(auth.uid())) -- Allow if the user IS an admin
WITH CHECK (public.is_admin(auth.uid())); -- Ensure they remain admin during the operation

COMMENT ON POLICY "Parent Students: Allow admin write access" ON public.parent_students
IS 'Allows users with the admin role to create, update, and delete parent-student links.';