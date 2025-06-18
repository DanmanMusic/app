-- Migration: Correct the timezone logic within the get_student_streak_details RPC.

-- First, drop the old function definition completely to ensure a clean update.
DROP FUNCTION IF EXISTS public.get_student_streak_details(uuid);

-- Now, create the new, fully timezone-aware version of the function.
CREATE OR REPLACE FUNCTION public.get_student_streak_details(p_student_id uuid)
RETURNS TABLE (
  has_logged_practice_today boolean,
  current_streak integer,
  longest_streak integer,
  last_log_date date
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  company_timezone TEXT;
  v_last_log_date DATE;
  v_company_today DATE;
  v_company_yesterday DATE;
BEGIN
  -- Get the company's timezone for the student
  SELECT c.timezone INTO company_timezone
  FROM public.companies c
  JOIN public.profiles p ON p.company_id = c.id
  WHERE p.id = p_student_id;

  -- Default to UTC if not found for any reason
  IF company_timezone IS NULL THEN
    company_timezone := 'UTC';
  END IF;

  -- Define "today" and "yesterday" in the company's local timezone
  v_company_today := (now() AT TIME ZONE company_timezone)::date;
  v_company_yesterday := v_company_today - interval '1 day';

  -- Get the most recent log date for the student
  SELECT max(pl.log_date) INTO v_last_log_date
  FROM public.practice_logs pl
  WHERE pl.student_id = p_student_id;

  -- Perform all date comparisons using the company's timezone dates
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
      -- THIS IS THE FIX: Compare against the company's yesterday, not UTC's
      (SELECT sl.streak_length FROM streak_lengths sl WHERE sl.last_day_of_streak >= v_company_yesterday ORDER BY sl.last_day_of_streak DESC LIMIT 1) AS current_s,
      (SELECT max(sl.streak_length) FROM streak_lengths sl) AS longest_s
  )
  SELECT
    (v_last_log_date >= v_company_today), -- Correct boolean check
    COALESCE(fd.current_s, 0)::integer,
    COALESCE(fd.longest_s, 0)::integer,
    v_last_log_date
  FROM final_data fd;
END;
$$;


-- Re-grant permission as we've created a new function object.
GRANT EXECUTE ON FUNCTION public.get_student_streak_details(uuid) TO authenticated;