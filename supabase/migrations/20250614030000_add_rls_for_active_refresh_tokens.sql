-- Migration: Add RLS policy to allow Admins to read active_refresh_tokens.
-- File: supabase/migrations/20250614030000_add_rls_for_active_refresh_tokens.sql

-- By default, RLS blocks all access. We need to explicitly grant
-- SELECT permission to active admins so they can check for sessions.
CREATE POLICY "Allow active admins to read refresh tokens in their company"
ON public.active_refresh_tokens
FOR SELECT
USING (
  -- An admin can only see tokens belonging to their own company.
  company_id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid
  AND
  -- The check to ensure the caller is actually an admin.
  public.is_active_admin(auth.uid())
);

COMMENT ON POLICY "Allow active admins to read refresh tokens in their company" ON public.active_refresh_tokens
IS 'Permits active admins to view/count active PIN refresh tokens for users within their own company.';