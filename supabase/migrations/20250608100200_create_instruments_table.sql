-- V2 Golden Migration: Create the instruments table
CREATE TABLE public.instruments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    name text NOT NULL,
    image_path text NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.instruments ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER on_instrument_update BEFORE UPDATE ON public.instruments FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();