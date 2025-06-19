-- Migration: Schedule the master notification function to run via pg_cron (Robust Version)

-- Use a DO block to safely attempt to unschedule the job.
-- This will prevent an error if the job doesn't exist on the first run.
DO $$
BEGIN
  -- Attempt to unschedule the job.
  PERFORM cron.unschedule('daily-notifications-job');
  -- If it doesn't exist, an exception is raised, but we catch it and do nothing.
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Job "daily-notifications-job" does not exist, scheduling it now.';
END;
$$;

-- Schedule the job to run every 10 minutes.
-- The syntax '*/10 * * * *' means "at minute 10, 20, 30, 40, 50, and 00 of every hour".
SELECT cron.schedule(
  'daily-notifications-job',
  '*/10 * * * *',
  $$ SELECT trigger_daily_notifications(); $$
);