-- File: supabase/migrations/YYYYMMDDHHMMSS_create_streak_functions.sql

-- A function to calculate a student's current practice streak and last log date.
create or replace function get_student_streak(p_student_id uuid)
returns table (
  current_streak int,
  last_log_date date
)
language plpgsql
as $$
begin
  return query
  with recursive daily_streaks as (
    -- Anchor member: a practice log from today or yesterday
    select
      log.student_id,
      log.log_date,
      1 as streak
    from practice_logs as log
    where log.student_id = p_student_id
      and log.log_date >= (current_date - interval '1 day')
      and log.log_date <= current_date

    union all

    -- Recursive member: join to the previous day's log
    select
      prev_log.student_id,
      prev_log.log_date,
      ds.streak + 1
    from practice_logs as prev_log
    join daily_streaks ds on prev_log.student_id = ds.student_id
                          and prev_log.log_date = (ds.log_date - interval '1 day')
  )
  select
    coalesce(max(ds.streak), 0)::int as current_streak,
    max(pl.log_date) as last_log_date
  from practice_logs pl
  left join daily_streaks ds on pl.student_id = ds.student_id
  where pl.student_id = p_student_id;
end;
$$;