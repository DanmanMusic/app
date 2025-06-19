-- Migration: Create and consolidate all RPC functions for scheduled notifications.

----------------------------------------------------
-- Function 1: Admin Daily Briefing
----------------------------------------------------
CREATE OR REPLACE FUNCTION get_admin_daily_briefing_data(p_company_id uuid)
RETURNS TABLE (
  tasks_completed_yesterday bigint,
  rewards_redeemed_yesterday bigint,
  students_practiced_yesterday bigint,
  tasks_pending_verification bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  company_timezone TEXT;
  yesterday_start timestamptz;
  yesterday_end timestamptz;
BEGIN
  SELECT c.timezone INTO company_timezone FROM public.companies c WHERE c.id = p_company_id;
  IF company_timezone IS NULL THEN company_timezone := 'UTC'; END IF;

  yesterday_start := date_trunc('day', now() AT TIME ZONE company_timezone) - interval '1 day';
  yesterday_end := yesterday_start + interval '1 day' - interval '1 second';

  RETURN QUERY
  SELECT
    (SELECT count(*) FROM public.assigned_tasks WHERE company_id = p_company_id AND completed_date BETWEEN yesterday_start AND yesterday_end) as tasks_completed_yesterday,
    (SELECT count(*) FROM public.ticket_transactions WHERE company_id = p_company_id AND type = 'redemption' AND timestamp BETWEEN yesterday_start AND yesterday_end) as rewards_redeemed_yesterday,
    (SELECT count(*) FROM public.practice_logs WHERE company_id = p_company_id AND log_date = yesterday_start::date) as students_practiced_yesterday,
    (SELECT count(*) FROM public.assigned_tasks WHERE company_id = p_company_id AND is_complete = true AND verification_status = 'pending') as tasks_pending_verification;
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_admin_daily_briefing_data(uuid) TO authenticated;

----------------------------------------------------
-- Function 2: Teacher Daily Briefing
----------------------------------------------------
CREATE OR REPLACE FUNCTION get_teacher_daily_briefing_data(p_teacher_id uuid)
RETURNS TABLE (
  tasks_completed_yesterday bigint,
  students_practiced_yesterday bigint,
  tasks_pending_verification bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  company_timezone TEXT;
  yesterday_start timestamptz;
  yesterday_end timestamptz;
BEGIN
  SELECT c.timezone INTO company_timezone FROM public.companies c JOIN public.profiles p ON p.company_id = c.id WHERE p.id = p_teacher_id;
  IF company_timezone IS NULL THEN company_timezone := 'UTC'; END IF;

  yesterday_start := date_trunc('day', now() AT TIME ZONE company_timezone) - interval '1 day';
  yesterday_end := yesterday_start + interval '1 day' - interval '1 second';

  RETURN QUERY
  WITH my_students AS (
    SELECT st.student_id FROM public.student_teachers st WHERE st.teacher_id = p_teacher_id
  )
  SELECT
    (SELECT count(*) FROM public.assigned_tasks WHERE student_id IN (SELECT student_id FROM my_students) AND completed_date BETWEEN yesterday_start AND yesterday_end) as tasks_completed_yesterday,
    (SELECT count(*) FROM public.practice_logs WHERE student_id IN (SELECT student_id FROM my_students) AND log_date = yesterday_start::date) as students_practiced_yesterday,
    (SELECT count(*) FROM public.assigned_tasks WHERE student_id IN (SELECT student_id FROM my_students) AND is_complete = true AND verification_status = 'pending') as tasks_pending_verification;
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_teacher_daily_briefing_data(uuid) TO authenticated;


----------------------------------------------------
-- Function 3: Consolidated Streak Reminder
----------------------------------------------------
-- Drop the old function to ensure the return signature is updated correctly
DROP FUNCTION IF EXISTS public.get_students_for_streak_reminder(uuid);

CREATE OR REPLACE FUNCTION get_students_for_streak_reminder(p_company_id uuid)
RETURNS TABLE (
  recipient_id uuid,
  recipient_role text,
  reminder_details jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  company_timezone TEXT;
  company_today DATE;
BEGIN
  SELECT c.timezone INTO company_timezone FROM public.companies c WHERE c.id = p_company_id;
  IF company_timezone IS NULL THEN company_timezone := 'UTC'; END IF;
  company_today := (now() AT TIME ZONE company_timezone)::date;

  RETURN QUERY
  WITH students_to_remind AS (
    SELECT
        p.id as student_id,
        COALESCE(p.nickname, p.first_name) as student_name,
        (s.get_student_streak_details).current_streak as current_streak
    FROM
        public.profiles p,
        LATERAL public.get_student_streak_details(p.id) s
    WHERE
        p.company_id = p_company_id AND p.role = 'student' AND p.status = 'active'
        AND (s.get_student_streak_details).has_logged_practice_today = false
        AND (s.get_student_streak_details).current_streak > 0
  )
  -- Get the students themselves
  SELECT
    s.student_id,
    'student'::text,
    jsonb_build_array(jsonb_build_object('name', s.student_name, 'streak', s.current_streak))
  FROM students_to_remind s
  UNION ALL
  -- Get the parents, grouped to consolidate notifications
  SELECT
    ps.parent_id,
    'parent'::text,
    jsonb_agg(jsonb_build_object('name', s.student_name, 'streak', s.current_streak))
  FROM public.parent_students ps
  JOIN students_to_remind s ON ps.student_id = s.student_id
  JOIN public.profiles p_parent ON ps.parent_id = p_parent.id AND p_parent.status = 'active'
  GROUP BY ps.parent_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_students_for_streak_reminder(uuid) TO authenticated;