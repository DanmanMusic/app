-- V2 Golden Migration: Create the journey_locations table
CREATE TABLE public.journey_locations (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    name text NOT NULL,
    description text NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT journey_locations_pkey PRIMARY KEY (id),
    CONSTRAINT journey_locations_company_id_name_key UNIQUE (company_id, name)
);
ALTER TABLE public.journey_locations ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER on_journey_location_update BEFORE UPDATE ON public.journey_locations FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Now link the task_library to it
ALTER TABLE public.task_library
ADD CONSTRAINT fk_task_library_journey_location FOREIGN KEY (journey_location_id) REFERENCES public.journey_locations(id) ON DELETE SET NULL;