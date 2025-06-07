-- Migration: Create the practice_logs table for the streak feature.
-- This table will store a record for each day a student logs their practice.

CREATE TABLE public.practice_logs (
    id bigserial PRIMARY KEY,
    student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    log_date date NOT NULL DEFAULT (now() at time zone 'utc')::date,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Add a unique constraint to prevent a student from logging practice more than once per day.
ALTER TABLE public.practice_logs
ADD CONSTRAINT practice_logs_student_id_log_date_key UNIQUE (student_id, log_date);

-- Add comments for clarity
COMMENT ON TABLE public.practice_logs IS 'Stores daily practice logs for students to track streaks.';
COMMENT ON COLUMN public.practice_logs.student_id IS 'The student who logged the practice.';
COMMENT ON COLUMN public.practice_logs.company_id IS 'The company the student belongs to for data isolation.';
COMMENT ON COLUMN public.practice_logs.log_date IS 'The specific date the practice was logged for.';

-- Enable Row Level Security
ALTER TABLE public.practice_logs ENABLE ROW LEVEL SECURITY;

-- Create Indexes for performance
CREATE INDEX idx_practice_logs_student_date ON public.practice_logs (student_id, log_date DESC);


-- RLS Policies
-- Allow related users to read practice logs (student, parent, teacher, admin)
CREATE POLICY "Allow related users to read practice logs"
ON public.practice_logs
FOR SELECT
TO authenticated
USING (
    company_id = public.get_current_user_company_id() AND
    (
        public.is_active_admin(auth.uid()) OR
        student_id = auth.uid() OR
        EXISTS (SELECT 1 FROM public.parent_students ps WHERE ps.parent_id = auth.uid() AND ps.student_id = practice_logs.student_id) OR
        EXISTS (SELECT 1 FROM public.student_teachers st WHERE st.teacher_id = auth.uid() AND st.student_id = practice_logs.student_id)
    )
);

-- Allow a student or their linked parent to insert a log for that student.
CREATE POLICY "Allow student or parent to insert practice log"
ON public.practice_logs
FOR INSERT
TO authenticated
WITH CHECK (
    company_id = public.get_current_user_company_id() AND
    (
        -- The inserter is the student themselves
        student_id = auth.uid()
        OR
        -- The inserter is a linked parent of the student
        EXISTS (SELECT 1 FROM public.parent_students ps WHERE ps.parent_id = auth.uid() AND ps.student_id = practice_logs.student_id)
    )
);

-- No UPDATE or DELETE policies are needed. Logs should be immutable.
-- If a correction is needed, it would be a new transaction (manual adjustment) by an admin.