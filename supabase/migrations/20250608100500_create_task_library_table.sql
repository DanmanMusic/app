-- V2 Golden Migration: Create the task_library table
CREATE TABLE public.task_library (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    title text NOT NULL,
    description text NULL,
    base_tickets integer NOT NULL CHECK (base_tickets >= 0),
    created_by_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
    attachment_path text NULL,
    reference_url text NULL,
    can_self_assign boolean NOT NULL DEFAULT false,
    journey_location_id uuid NULL, -- FK added after journey_locations is created
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.task_library ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER on_task_library_update BEFORE UPDATE ON public.task_library FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();