-- supabase/migrations/<timestamp>_create_task_library_instruments_table.sql

CREATE TABLE public.task_library_instruments (
    task_library_id uuid NOT NULL REFERENCES public.task_library(id) ON DELETE CASCADE,
    instrument_id uuid NOT NULL REFERENCES public.instruments(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (task_library_id, instrument_id)
);

COMMENT ON TABLE public.task_library_instruments IS 'Links task library items to specific instruments.';

ALTER TABLE public.task_library_instruments ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_task_lib_inst_task_id ON public.task_library_instruments (task_library_id);
CREATE INDEX idx_task_lib_inst_instrument_id ON public.task_library_instruments (instrument_id);