-- Migration: Fixes a logical error in the get_company_streak_stats function
-- where the company_id was not being correctly filtered. Also enhances the
-- function to use the company's specific timezone for monthly calculations.

CREATE OR REPLACE FUNCTION public.get_company_streak_stats(p_company_id uuid)
RETURNS TABLE (
  total_active_streaks bigint,
  streaks_over_7_days bigint,
  milestone_earners_this_month bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  company_timezone TEXT;
BEGIN
  -- Get the company's timezone for accurate monthly calculations
  SELECT c.timezone INTO company_timezone FROM public.companies c WHERE c.id = p_company_id;

  -- If no timezone is found, default to UTC to prevent errors
  IF company_timezone IS NULL THEN
    company_timezone := 'UTC';
  END IF;

  RETURN QUERY
  WITH student_streaks AS (
    SELECT
      p.id as student_id,
      COALESCE((details.current_streak), 0) as current_streak_val
    FROM
      public.profiles p
    LEFT JOIN LATERAL public.get_student_streak_details(p.id) details ON true
    WHERE
      p.company_id = p_company_id AND p.role = 'student' -- <<< THE FIX: Correctly use the p_company_id parameter
  ),
  monthly_milestones AS (
    SELECT count(DISTINCT t.student_id) as milestone_count
    FROM public.ticket_transactions t
    WHERE t.company_id = p_company_id
      AND t.type = 'streak_award'
      -- Use the company's specific timezone to define the start of the current month
      AND t.timestamp >= date_trunc('month', now() AT TIME ZONE company_timezone)
  )
  SELECT
    count(*) FILTER (WHERE ss.current_streak_val > 0) as total_active_streaks,
    count(*) FILTER (WHERE ss.current_streak_val >= 7) as streaks_over_7_days,
    COALESCE((SELECT milestone_count FROM monthly_milestones), 0) as milestone_earners_this_month
  FROM student_streaks ss;
END;
$$;

-- Re-grant permission as we've replaced the function.
GRANT EXECUTE ON FUNCTION public.get_company_streak_stats(uuid) TO authenticated;