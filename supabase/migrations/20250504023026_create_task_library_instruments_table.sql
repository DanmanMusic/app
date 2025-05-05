-- supabase/migrations/20250504023026_create_task_library_instruments_table.sql

-- == Create Task Library Instruments Link Table ==
CREATE TABLE public.task_library_instruments (
    task_library_id uuid NOT NULL REFERENCES public.task_library(id) ON DELETE CASCADE,
    instrument_id uuid NOT NULL REFERENCES public.instruments(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (task_library_id, instrument_id)
);

-- == Comments ==
COMMENT ON TABLE public.task_library_instruments IS 'Links task library items to specific instruments.';
COMMENT ON COLUMN public.task_library_instruments.task_library_id IS 'FK to the task library item.';
COMMENT ON COLUMN public.task_library_instruments.instrument_id IS 'FK to the instrument.';

-- == Enable RLS ==
ALTER TABLE public.task_library_instruments ENABLE ROW LEVEL SECURITY;

-- == Indexes ==
CREATE INDEX idx_task_lib_inst_task_id ON public.task_library_instruments (task_library_id);
CREATE INDEX idx_task_lib_inst_instrument_id ON public.task_library_instruments (instrument_id);

-- == RLS Policies ==

-- SELECT Policy: Allow active Admins or active Teachers to read the links.
-- This is needed so they can see which instruments are associated with a task library item.
CREATE POLICY "Task Library Instruments: Allow admin/teacher read access"
ON public.task_library_instruments
FOR SELECT
TO authenticated
USING (
    -- Check if the user is either an active admin or an active teacher
    public.is_active_admin_or_teacher(auth.uid())
);
COMMENT ON POLICY "Task Library Instruments: Allow admin/teacher read access" ON public.task_library_instruments
IS 'Allows active Admins or Teachers to read the links between tasks and instruments.';


-- WRITE Policy (INSERT, UPDATE, DELETE): Allow ONLY active Admins.
-- Linking/unlinking is handled implicitly by the create/update task library Edge Functions,
-- which run with service_role. Direct manipulation should be restricted to Admins if ever needed.
CREATE POLICY "Task Library Instruments: Allow admin write access"
ON public.task_library_instruments
FOR ALL -- Covers INSERT, UPDATE, DELETE
TO authenticated
USING (public.is_active_admin(auth.uid())) -- Allow if the user IS an active admin
WITH CHECK (public.is_active_admin(auth.uid())); -- Ensure they remain active admin during the operation

COMMENT ON POLICY "Task Library Instruments: Allow admin write access" ON public.task_library_instruments
IS 'Allows active Admins to directly create, update, or delete links (primarily for maintenance; main logic is via Edge Functions).';

-- End of Migration