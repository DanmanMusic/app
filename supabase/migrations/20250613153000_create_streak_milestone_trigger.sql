-- Migration: Create a trigger to automatically generate an announcement for streak milestones.
-- File: supabase/migrations/20250613153000_create_streak_milestone_trigger.sql

-- Step 1: Add the new 'streak_milestone' type to our existing ENUM.
-- The IF NOT EXISTS clause makes this safe to re-run.
ALTER TYPE public.announcement_type ADD VALUE IF NOT EXISTS 'streak_milestone';

-- Step 2: Create the trigger function.
-- This function will run AFTER a new row is inserted into ticket_transactions.
CREATE OR REPLACE FUNCTION public.handle_streak_milestone_announcement()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER -- The function runs with the permissions of the user who defined it (the superuser).
AS $$
DECLARE
  student_name TEXT;
  streak_description TEXT;
BEGIN
  -- We only care about transactions of type 'streak_award'.
  IF NEW.type = 'streak_award' THEN
    
    -- Get the student's display name for the announcement message.
    SELECT COALESCE(p.nickname, p.first_name, 'A Student')
    INTO student_name
    FROM public.profiles p
    WHERE p.id = NEW.student_id;
    
    -- Extract the number from the description, e.g., "Awarded for 14-day practice streak!" -> "14-day"
    -- This is a bit of a hack but works for our current description format.
    streak_description := (regexp_matches(NEW.notes, '(\d+)-day'))[1] || '-day';

    -- Insert a new row into the announcements table.
    INSERT INTO public.announcements (company_id, type, title, message, related_student_id)
    VALUES (
      NEW.company_id,
      'streak_milestone',
      'Practice Streak Achievement!',
      student_name || ' just reached a ' || streak_description || ' practice streak! 🎉 Keep it up!',
      NEW.student_id -- Link the announcement to the student for avatar display.
    );

  END IF;
  
  -- Return the new row to complete the trigger process.
  RETURN NEW;
END;
$$;

-- Step 3: Create the trigger itself.
-- This tells the database to run our function AFTER every INSERT on ticket_transactions.
CREATE TRIGGER on_streak_award_create_announcement
AFTER INSERT ON public.ticket_transactions
FOR EACH ROW
EXECUTE FUNCTION public.handle_streak_milestone_announcement();