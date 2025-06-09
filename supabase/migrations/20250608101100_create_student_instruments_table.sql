CREATE TABLE IF NOT EXISTS public.student_instruments ( -- MODIFIED
    student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    instrument_id uuid NOT NULL REFERENCES public.instruments(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (student_id, instrument_id)
);
ALTER TABLE public.student_instruments ENABLE ROW LEVEL SECURITY;