-- Migration: Fix streak functions to run with definer-level permissions.
-- This allows them to bypass RLS on the practice_logs table to correctly
-- calculate streaks for all users in a company.

-- Function 1: Get detailed streak info for a single student.
-- Re-defined with SECURITY DEFINER.
CREATE OR REPLACE FUNCTION public.get_student_streak_details(p_student_id uuid)
RETURNS TABLE (
  current_streak integer,
  longest_streak integer,
  last_log_date date
)
LANGUAGE plpgsql
SECURITY DEFINER -- <<< THE FIX
AS $$
BEGIN
  RETURN QUERY
  WITH all_logs AS (
    SELECT
      pl.log_date,
      row_number() OVER (ORDER BY pl.log_date) as rn
    FROM public.practice_logs pl
    WHERE pl.student_id = p_student_id
  ),
  streaks AS (
    SELECT
      log_date,
      (log_date - (rn || ' day')::interval)::date as streak_group
    FROM all_logs
  ),
  streak_lengths AS (
    SELECT
      streak_group,
      count(*) as streak_length,
      max(log_date) as last_day_of_streak
    FROM streaks
    GROUP BY streak_group
  ),
  final_data as (
    SELECT
      (SELECT sl.streak_length FROM streak_lengths sl WHERE sl.last_day_of_streak >= (now() at time zone 'utc')::date - interval '1 day' ORDER BY sl.last_day_of_streak DESC LIMIT 1) AS current_s,
      (SELECT max(sl.streak_length) FROM streak_lengths sl) AS longest_s,
      (SELECT max(al.log_date) FROM all_logs al) as last_log_d
  )
  SELECT
    COALESCE(fd.current_s, 0)::integer,
    COALESCE(fd.longest_s, 0)::integer,
    fd.last_log_d
  FROM final_data fd;
END;
$$;


-- Function 2: Get aggregate streak statistics for an entire company.
-- Re-defined with SECURITY DEFINER.
CREATE OR REPLACE FUNCTION public.get_company_streak_stats(p_company_id uuid)
RETURNS TABLE (
  total_active_streaks bigint,
  streaks_over_7_days bigint,
  milestone_earners_this_month bigint
)
LANGUAGE plpgsql
SECURITY DEFINER -- <<< THE FIX
AS $$
BEGIN
  RETURN QUERY
  WITH student_streaks AS (
    SELECT
      p.id as student_id,
      COALESCE((details.current_streak), 0) as current_streak_val
    FROM
      public.profiles p
    LEFT JOIN LATERAL public.get_student_streak_details(p.id) details ON true
    WHERE
      p.company_id = p_company_id AND p.role = 'student'
  ),
  monthly_milestones AS (
    SELECT count(DISTINCT t.student_id) as milestone_count
    FROM public.ticket_transactions t
    WHERE t.company_id = p_company_id
      AND t.type = 'streak_award'
      AND t."timestamp" >= date_trunc('month', now() AT TIME ZONE 'utc')
  )
  SELECT
    count(*) FILTER (WHERE ss.current_streak_val > 0) as total_active_streaks,
    count(*) FILTER (WHERE ss.current_streak_val >= 7) as streaks_over_7_days,
    COALESCE((SELECT milestone_count FROM monthly_milestones), 0) as milestone_earners_this_month
  FROM student_streaks ss;
END;
$$;


-- Re-grant permissions since we've replaced the functions.
GRANT EXECUTE ON FUNCTION public.get_student_streak_details(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_company_streak_stats(uuid) TO authenticated;