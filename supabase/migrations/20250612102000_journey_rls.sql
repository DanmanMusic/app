-- FILE: supabase/migrations/xxxx_correct_journey_location_rls_policies.sql

-- For these policies, we use the CORRECT path to the company_id within the JWT.
-- The path is: (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid

-- 1. VIEW Policy: Allow any authenticated user in the company to read locations.
--    (Corrected path to company_id)
CREATE POLICY "Allow authenticated users to read locations for their company"
ON public.journey_locations
FOR SELECT
USING (company_id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid);


-- 2. CREATE Policy: Allow active admins to create locations for their company.
--    (Corrected path to company_id)
CREATE POLICY "Allow Admins to create locations for their company"
ON public.journey_locations
FOR INSERT
WITH CHECK (
  company_id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid AND
  public.is_active_admin(auth.uid())
);


-- 3. UPDATE Policy: Allow active admins to update locations in their company.
--    (Corrected path to company_id)
CREATE POLICY "Allow Admins to update locations in their company"
ON public.journey_locations
FOR UPDATE
USING (company_id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid)
WITH CHECK (public.is_active_admin(auth.uid()));


-- 4. DELETE Policy: Allow active admins to delete locations in their company.
--    (Corrected path to company_id)
CREATE POLICY "Allow Admins to delete locations in their company"
ON public.journey_locations
FOR DELETE
USING (
  company_id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid AND
  public.is_active_admin(auth.uid())
);