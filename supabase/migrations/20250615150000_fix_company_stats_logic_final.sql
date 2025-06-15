-- Migration: Final and definitive fix for the company streak stats function.
-- This version uses a procedural loop instead of a LATERAL join to ensure
-- correct data aggregation under SECURITY DEFINER context, bypassing the
-- RLS and SQL planner issues encountered previously.

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
  -- Variables to hold our running totals
  v_total_active_streaks bigint := 0;
  v_streaks_over_7_days bigint := 0;
  v_milestone_earners_this_month bigint := 0;
  -- Variable to hold each student's ID in the loop
  student_record RECORD;
  -- Variable to hold the result of the streak calculation for one student
  streak_details_record RECORD;
  company_timezone TEXT;
BEGIN
  -- 1. Get a list of all active students in the specified company
  FOR student_record IN
    SELECT id FROM public.profiles
    WHERE company_id = p_company_id AND role = 'student' AND status = 'active'
  LOOP
    -- 2. For each student, call the trusted get_student_streak_details function
    SELECT * INTO streak_details_record FROM public.get_student_streak_details(student_record.id);

    -- 3. Aggregate the results
    IF streak_details_record.current_streak > 0 THEN
      v_total_active_streaks := v_total_active_streaks + 1;
    END IF;

    IF streak_details_record.current_streak >= 7 THEN
      v_streaks_over_7_days := v_streaks_over_7_days + 1;
    END IF;
  END LOOP;

  -- 4. Calculate the monthly milestone earners separately (this part was already working)
  SELECT c.timezone INTO company_timezone FROM public.companies c WHERE c.id = p_company_id;
  IF company_timezone IS NULL THEN
    company_timezone := 'UTC';
  END IF;

  SELECT count(DISTINCT t.student_id)
  INTO v_milestone_earners_this_month
  FROM public.ticket_transactions t
  WHERE t.company_id = p_company_id
    AND t.type = 'streak_award'
    AND t.timestamp >= date_trunc('month', now() AT TIME ZONE company_timezone);

  -- 5. Return the final, aggregated data
  RETURN QUERY SELECT
    v_total_active_streaks,
    v_streaks_over_7_days,
    COALESCE(v_milestone_earners_this_month, 0);

END;
$$;


-- Re-grant permission as we've replaced the function.
GRANT EXECUTE ON FUNCTION public.get_company_streak_stats(uuid) TO authenticated;