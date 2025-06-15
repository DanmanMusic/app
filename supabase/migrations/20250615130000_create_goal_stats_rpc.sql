
-- Migration: Create an RPC function to get goal statistics for a company.
-- This will be used to show students how many others are saving for a reward.
CREATE OR REPLACE FUNCTION public.get_company_goal_stats(p_company_id uuid)
RETURNS TABLE (
  reward_id uuid,
  goal_count bigint
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.current_goal_reward_id as reward_id,
    count(p.id) as goal_count
  FROM
    public.profiles p
  WHERE
    p.company_id = p_company_id
    AND p.role = 'student'
    AND p.status = 'active'
    AND p.current_goal_reward_id IS NOT NULL
  GROUP BY
    p.current_goal_reward_id;
END;
$$;

-- Grant permission for authenticated users to call this new function.
GRANT EXECUTE ON FUNCTION public.get_company_goal_stats(uuid) TO authenticated;