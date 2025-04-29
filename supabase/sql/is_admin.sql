-- Drop function if it exists to ensure clean creation
DROP FUNCTION IF EXISTS public.is_admin(user_id uuid);

-- Create the function to check the profiles table
CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid)
RETURNS boolean AS $$
DECLARE
  is_admin_user boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = user_id AND role = 'admin' -- Check ID and role directly
  ) INTO is_admin_user;
  RETURN is_admin_user;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- SECURITY DEFINER is needed to allow the function to query profiles table,
-- even if the calling user doesn't have direct select permission on profiles (though they likely should)
-- Ensure the owner of the function is appropriate (usually postgres superuser)

-- Grant execute permission to the authenticated role
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;

-- Optional: Grant to service_role as well if needed elsewhere
-- GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO service_role;