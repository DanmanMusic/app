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

-- Trigger function for updated_at (Assuming it's defined elsewhere or created here if first time)
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


-- SELECT Policy: Allow ANYONE (public) to read instruments.
CREATE POLICY "Instruments: Allow public read access"
ON public.instruments
FOR SELECT
-- TO public -- Implicitly public
USING (true); -- Allows reading all instrument rows

COMMENT ON POLICY "Instruments: Allow public read access" ON public.instruments
IS 'Allows anyone (logged in or anonymous) to view the list of instruments.';

-- INSERT Policy: Allow ONLY admins to create new instruments.
CREATE POLICY "Instruments: Allow admin insert access"
ON public.instruments
FOR INSERT
TO authenticated
WITH CHECK (public.is_active_admin(auth.uid()));

COMMENT ON POLICY "Instruments: Allow admin insert access" ON public.instruments
IS 'Allows users with the admin role to create instruments.';

-- UPDATE Policy: Allow ONLY admins to update existing instruments.
CREATE POLICY "Instruments: Allow admin update access"
ON public.instruments
FOR UPDATE
TO authenticated
USING (public.is_active_admin(auth.uid()))
WITH CHECK (public.is_active_admin(auth.uid()));

COMMENT ON POLICY "Instruments: Allow admin update access" ON public.instruments
IS 'Allows users with the admin role to update existing instruments.';

-- DELETE Policy: Allow ONLY admins to delete instruments.
CREATE POLICY "Instruments: Allow admin delete access"
ON public.instruments
FOR DELETE
TO authenticated
USING (public.is_active_admin(auth.uid()));

COMMENT ON POLICY "Instruments: Allow admin delete access" ON public.instruments
IS 'Allows users with the admin role to delete instruments.';