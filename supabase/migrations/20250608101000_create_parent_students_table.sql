CREATE TABLE IF NOT EXISTS public.parent_students ( -- MODIFIED
    parent_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (parent_id, student_id)
);
ALTER TABLE public.parent_students ENABLE ROW LEVEL SECURITY;