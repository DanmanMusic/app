-- Migration: Fix RLS policies for public, logged-out access

-- The hardcoded UUID for the "Danmans Music" company.
-- This should match the ID you copied after creating the company row.
-- Replace it if yours is different.
-- We can't use a variable here, so we just paste the UUID directly.

----------------------------------------------------
-- REWARDS Table
----------------------------------------------------
-- Drop the old, restrictive read policy
DROP POLICY IF EXISTS "Allow users to read rewards in their company" ON public.rewards;
DROP POLICY IF EXISTS "Rewards: Allow public read access" ON public.rewards; -- Drop legacy policy just in case

-- Create a policy that allows ANYONE to read rewards from the Danmans company.
CREATE POLICY "Allow public read access to Danmans rewards" ON public.rewards
  FOR SELECT
  USING (company_id = '1f4b72a7-d648-478c-b529-acfae0ff9c84');


----------------------------------------------------
-- ANNOUNCEMENTS Table
----------------------------------------------------
-- Drop the old, restrictive read policy
DROP POLICY IF EXISTS "Allow users to read announcements in their company" ON public.announcements;
DROP POLICY IF EXISTS "Announcements: Allow public read access" ON public.announcements; -- Drop legacy policy

-- Create a policy that allows ANYONE to read announcements from the Danmans company.
CREATE POLICY "Allow public read access to Danmans announcements" ON public.announcements
  FOR SELECT
  USING (company_id = '1f4b72a7-d648-478c-b529-acfae0ff9c84');


----------------------------------------------------
-- INSTRUMENTS Table
----------------------------------------------------
-- Drop the old, restrictive read policy
DROP POLICY IF EXISTS "Allow users to read entities in their company" ON public.instruments;
DROP POLICY IF EXISTS "Instruments: Allow public read access" ON public.instruments; -- Drop legacy policy

-- Create a policy that allows ANYONE to read instruments from the Danmans company.
CREATE POLICY "Allow public read access to Danmans instruments" ON public.instruments
  FOR SELECT
  USING (company_id = '1f4b72a7-d648-478c-b529-acfae0ff9c84');