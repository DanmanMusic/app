-- Migration: Create the companies table for multi-tenancy.
-- This table will store the different music schools or organizations using the app.
-- It is the root table for the new multi-tenant architecture.

-- Step 1: Create the 'companies' table
CREATE TABLE public.companies (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    created_at timestamptz NOT NULL DEFAULT now(),
    name text NOT NULL,

    CONSTRAINT companies_pkey PRIMARY KEY (id),
    CONSTRAINT companies_name_key UNIQUE (name)
);

-- Add comments for clarity on columns
COMMENT ON TABLE public.companies IS 'Stores the different tenant organizations (e.g., music schools).';
COMMENT ON COLUMN public.companies.id IS 'Primary key for the company.';
COMMENT ON COLUMN public.companies.name IS 'The unique public name of the company.';


-- Step 2: Enable Row Level Security (RLS) on the new table.
-- This is crucial to ensure data isolation from the start.
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;


-- Step 3: Define RLS policies for the 'companies' table.
-- For now, we'll allow any authenticated user to see the list of companies.
-- Write access will be locked down, typically handled by super-admins or specific EFs in the future.
CREATE POLICY "Allow authenticated users to read company names"
ON public.companies
FOR SELECT
TO authenticated
USING (true);

-- A placeholder for admin-level modifications. This will be refined later.
-- For now, it effectively blocks all modifications through the standard API.
CREATE POLICY "Admins can manage companies (placeholder)"
ON public.companies
FOR ALL
USING (false)
WITH CHECK (false);


-- Step 4: Seed the first company: Danmans Music.
-- We use a fixed, pre-generated UUID for 'id' so that the next migration
-- script can reliably reference it to update all existing data.
INSERT INTO public.companies (id, name)
VALUES ('1d6a7a40-5b7c-41c4-b7c4-2794a34b2f1d', 'Danmans Music');