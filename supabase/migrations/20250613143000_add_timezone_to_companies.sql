-- Migration: Add timezone to companies table
-- File: supabase/migrations/20250613143000_add_timezone_to_companies.sql

-- Step 1: Add the timezone column, allowing NULLs initially so it can be added to a table with existing data.
-- We use TEXT as it's the standard for storing IANA timezone names (e.g., 'America/New_York').
ALTER TABLE public.companies
ADD COLUMN timezone TEXT NULL;

-- Step 2: Populate the timezone for the existing "Danmans Music" company.
-- This ensures our seed/existing data is valid before we add the NOT NULL constraint.
-- We'll assume Danmans is in California for this example.
UPDATE public.companies
SET timezone = 'America/Los_Angeles'
WHERE name = 'Danmans Music';

-- Step 3: Now that all existing rows have a value, add the NOT NULL constraint.
-- All new companies created in the future will be required to have a timezone.
ALTER TABLE public.companies
ALTER COLUMN timezone SET NOT NULL;

-- Step 4 (Optional but good practice): Add a comment to the column for future developers.
COMMENT ON COLUMN public.companies.timezone IS 'The IANA timezone name for the company, e.g., America/New_York';