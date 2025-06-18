-- Migration: Create a trigger to notify students and parents when a task is verified.

-- Step 1: Create the trigger function.
-- This function contains the logic to be executed when the trigger fires.
CREATE OR REPLACE FUNCTION public.notify_family_on_task_verified()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with the permissions of the function owner.
AS $$
DECLARE
    v_student_id uuid;
    v_task_title text;
    v_points_awarded integer;
    v_parent_id uuid;
    v_notification_title text;
    v_notification_message text;
BEGIN
    -- This trigger should only run on UPDATE operations.
    IF (TG_OP = 'UPDATE') THEN
        -- Check if the verification_status has just changed FROM 'pending' TO something else.
        -- This prevents the trigger from firing on other updates to the row.
        IF OLD.verification_status = 'pending' AND NEW.verification_status <> 'pending' THEN

            -- Gather the necessary details from the updated row.
            v_student_id := NEW.student_id;
            v_task_title := NEW.task_title;
            v_points_awarded := NEW.actual_points_awarded;

            -- Construct the notification message based on the status.
            IF NEW.verification_status = 'verified' OR NEW.verification_status = 'partial' THEN
                v_notification_title := 'Task Verified! ✨';
                v_notification_message := 'Task "' || v_task_title || '" was verified! You earned ' || v_points_awarded || ' tickets.';
            ELSE -- 'incomplete'
                v_notification_title := 'Task Reviewed';
                v_notification_message := 'Task "' || v_task_title || '" was marked as incomplete. No tickets were awarded.';
            END IF;

            -- Send notification to the STUDENT.
            -- We pass the specific trigger event type for better logging.
            PERFORM public.send_push_notification(
                p_recipient_user_id := v_student_id,
                p_title := v_notification_title,
                p_message := v_notification_message,
                p_trigger_event := 'task_verified'
            );

            -- Find and send notification to any LINKED PARENTS.
            FOR v_parent_id IN
                SELECT ps.parent_id
                FROM public.parent_students ps
                JOIN public.profiles p ON ps.parent_id = p.id
                WHERE ps.student_id = v_student_id AND p.status = 'active'
            LOOP
                PERFORM public.send_push_notification(
                    p_recipient_user_id := v_parent_id,
                    p_title := v_notification_title,
                    p_message := v_notification_message,
                    p_trigger_event := 'task_verified'
                );
            END LOOP;

        END IF;
    END IF;

    -- Return the new row to complete the trigger process.
    RETURN NEW;
END;
$$;


-- Step 2: Create the trigger itself.
-- This tells the database to run our function AFTER every UPDATE on the assigned_tasks table.
CREATE TRIGGER on_task_verification_notify_family
AFTER UPDATE OF verification_status ON public.assigned_tasks
FOR EACH ROW
EXECUTE FUNCTION public.notify_family_on_task_verified();

COMMENT ON TRIGGER on_task_verification_notify_family ON public.assigned_tasks
IS 'Sends a push notification to the student and their parents upon task verification.';