CREATE TABLE IF NOT EXISTS public.task_library_instruments ( -- MODIFIED
    task_library_id uuid NOT NULL REFERENCES public.task_library(id) ON DELETE CASCADE,
    instrument_id uuid NOT NULL REFERENCES public.instruments(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (task_library_id, instrument_id)
);
ALTER TABLE public.task_library_instruments ENABLE ROW LEVEL SECURITY;