CREATE TABLE IF NOT EXISTS public.student_teachers ( -- MODIFIED
    student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    teacher_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (student_id, teacher_id)
);
ALTER TABLE public.student_teachers ENABLE ROW LEVEL SECURITY;