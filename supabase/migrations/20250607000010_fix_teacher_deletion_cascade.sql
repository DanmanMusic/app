-- Migration: Fix teacher deletion by adding ON DELETE CASCADE to student_teachers foreign key.
-- This ensures that when a teacher's profile is deleted, all of their links
-- to students in the student_teachers table are automatically removed,
-- allowing the teacher deletion to succeed.

-- Step 1: Drop the existing foreign key constraint.
-- We need to find the name of the constraint first. You can find this in your
-- Supabase Studio Table Editor, or we can assume a standard name.
-- Let's try to drop a potential name. If this fails, you'll need to find the exact name.
-- The name is often 'student_teachers_teacher_id_fkey'.
ALTER TABLE public.student_teachers
DROP CONSTRAINT IF EXISTS student_teachers_teacher_id_fkey;


-- Step 2: Re-add the foreign key constraint with the ON DELETE CASCADE rule.
ALTER TABLE public.student_teachers
ADD CONSTRAINT student_teachers_teacher_id_fkey
FOREIGN KEY (teacher_id)
REFERENCES public.profiles(id)
ON DELETE CASCADE;

-- Add a comment to document this behavior
COMMENT ON CONSTRAINT student_teachers_teacher_id_fkey ON public.student_teachers
IS 'When a teacher profile is deleted, also delete their links to students.';