-- Migration: create_instruments_table

-- Create the instruments table
CREATE TABLE public.instruments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL UNIQUE,
    image_path text NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.instruments ENABLE ROW LEVEL SECURITY;

-- Comments for table/columns...
COMMENT ON TABLE public.instruments IS 'Stores musical instruments offered or used in the school.';
-- ... other comments ...

-- Trigger function for updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply the trigger
CREATE TRIGGER on_instrument_update
BEFORE UPDATE ON public.instruments
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();


-- Define Row Level Security (RLS) Policies for instruments table
-- WARNING: These are overly permissive for development ONLY allowing anon access.
-- TODO: MUST be replaced with role-specific checks (e.g., is_admin()) before production.

-- Allow public read access (Remains the same)
CREATE POLICY "Allow public read access"
ON public.instruments
FOR SELECT
USING (true);

COMMENT ON POLICY "Allow public read access" ON public.instruments
IS 'Allows anyone to read the list of instruments.';

-- *** MODIFIED: Allow INSERT for anon/authenticated users (TEMP) ***
DROP POLICY IF EXISTS "Allow authenticated insert access" ON public.instruments; -- Drop old one if exists
CREATE POLICY "TEMP Allow anon or auth insert access"
ON public.instruments
FOR INSERT
WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'anon');

COMMENT ON POLICY "TEMP Allow anon or auth insert access" ON public.instruments
IS 'TEMP DEV ONLY: Allows anon/auth users to add instruments. TODO: Restrict to admin role.';

-- *** MODIFIED: Allow UPDATE for anon/authenticated users (TEMP) ***
DROP POLICY IF EXISTS "Allow authenticated update access" ON public.instruments; -- Drop old one if exists
CREATE POLICY "TEMP Allow anon or auth update access"
ON public.instruments
FOR UPDATE
USING (auth.role() = 'authenticated' OR auth.role() = 'anon')
WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'anon');

COMMENT ON POLICY "TEMP Allow anon or auth update access" ON public.instruments
IS 'TEMP DEV ONLY: Allows anon/auth users to update instruments. TODO: Restrict to admin role.';

-- *** MODIFIED: Allow DELETE for anon/authenticated users (TEMP) ***
DROP POLICY IF EXISTS "Allow authenticated delete access" ON public.instruments; -- Drop old one if exists
CREATE POLICY "TEMP Allow anon or auth delete access"
ON public.instruments
FOR DELETE
USING (auth.role() = 'authenticated' OR auth.role() = 'anon');

COMMENT ON POLICY "TEMP Allow anon or auth delete access" ON public.instruments
IS 'TEMP DEV ONLY: Allows anon/auth users to delete instruments. TODO: Restrict to admin role.';