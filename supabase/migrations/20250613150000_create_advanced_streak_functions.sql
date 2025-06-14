-- Migration: Create advanced RPC functions for calculating student and company streak statistics.
-- File: supabase/migrations/20250613150000_create_advanced_streak_functions.sql

-- First, drop the old, simpler function if it exists to avoid conflicts.
DROP FUNCTION IF EXISTS public.get_student_streak(uuid);
DROP FUNCTION IF EXISTS public.get_student_streak_details(uuid); -- Drop the faulty one too

-- Function 1: Get detailed streak info for a single student.
-- This version is corrected to ALWAYS return a single row, even for users with no practice logs.
CREATE OR REPLACE FUNCTION public.get_student_streak_details(p_student_id uuid)
RETURNS TABLE (
  current_streak integer,
  longest_streak integer,
  last_log_date date
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH all_logs AS (
    -- Get all practice logs for the student with a row number
    SELECT
      pl.log_date,
      row_number() OVER (ORDER BY pl.log_date) as rn
    FROM public.practice_logs pl
    WHERE pl.student_id = p_student_id
  ),
  streaks AS (
    -- Identify streak groups by subtracting the row number (as days) from the log date.
    -- Consecutive days will result in the same 'streak_group' date.
    SELECT
      log_date,
      (log_date - (rn || ' day')::interval)::date as streak_group
    FROM all_logs
  ),
  streak_lengths AS (
    -- Calculate the length of each streak group
    SELECT
      streak_group,
      count(*) as streak_length,
      max(log_date) as last_day_of_streak
    FROM streaks
    GROUP BY streak_group
  ),
  -- FINAL CALCULATION an a separate CTE to make it cleaner
  final_data as (
    SELECT
      -- Current streak is the length of the streak that ended today or yesterday
      (SELECT sl.streak_length FROM streak_lengths sl WHERE sl.last_day_of_streak >= (now() at time zone 'utc')::date - interval '1 day' ORDER BY sl.last_day_of_streak DESC LIMIT 1) AS current_s,
      -- Longest streak is the max length of any streak
      (SELECT max(sl.streak_length) FROM streak_lengths sl) AS longest_s,
      -- Last log date is the max of any log date
      (SELECT max(al.log_date) FROM all_logs al) as last_log_d
  )
  -- This is the key change: we select from the final_data CTE, which will have one row
  -- of either calculated values or NULLs, and we use COALESCE to handle the NULLs.
  SELECT
    COALESCE(fd.current_s, 0)::integer,
    COALESCE(fd.longest_s, 0)::integer,
    fd.last_log_d
  FROM final_data fd;
END;
$$;


-- Function 2: Get aggregate streak statistics for an entire company.
-- This function is likely okay but let's make it more robust too.
CREATE OR REPLACE FUNCTION public.get_company_streak_stats(p_company_id uuid)
RETURNS TABLE (
  total_active_streaks bigint,
  streaks_over_7_days bigint,
  milestone_earners_this_month bigint
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH student_streaks AS (
    -- For each student in the company, get their streak details.
    SELECT
      p.id as student_id,
      -- Use a COALESCE here just in case the lateral join produces nulls
      COALESCE((details.current_streak), 0) as current_streak_val
    FROM
      public.profiles p
    -- Use a LATERAL join to call the function for each student row.
    LEFT JOIN LATERAL public.get_student_streak_details(p.id) details ON true
    WHERE
      p.company_id = p_company_id AND p.role = 'student'
  ),
  monthly_milestones AS (
    -- Separately, count students who received a streak award this month.
    SELECT count(DISTINCT t.student_id) as milestone_count
    FROM public.ticket_transactions t
    WHERE t.company_id = p_company_id
      AND t.type = 'streak_award'
      AND t.timestamp >= date_trunc('month', now() AT TIME ZONE 'utc')
  )
  SELECT
    count(*) FILTER (WHERE ss.current_streak_val > 0) as total_active_streaks,
    count(*) FILTER (WHERE ss.current_streak_val >= 7) as streaks_over_7_days,
    COALESCE((SELECT milestone_count FROM monthly_milestones), 0) as milestone_earners_this_month
  FROM student_streaks ss;
END;
$$;


-- Grant permissions for authenticated users to call these functions.
GRANT EXECUTE ON FUNCTION public.get_student_streak_details(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_company_streak_stats(uuid) TO authenticated;