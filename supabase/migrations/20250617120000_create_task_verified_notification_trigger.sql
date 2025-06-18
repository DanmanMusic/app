-- Migration: Create a trigger to notify students and parents when a task is verified.

-- Step 1: Create the trigger function.
CREATE OR REPLACE FUNCTION public.notify_family_on_task_verified()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_student_id uuid;
    v_student_name text; -- NEW: To store the student's name
    v_task_title text;
    v_points_awarded integer;
    v_parent_id uuid;
    v_notification_title text;
    v_student_message text; -- NEW: Specific message for the student
    v_parent_message text;  -- NEW: Specific message for the parent
BEGIN
    IF (TG_OP = 'UPDATE') THEN
        -- Only fire if the task is moving out of 'pending' status
        IF OLD.verification_status = 'pending' AND NEW.verification_status IN ('verified', 'partial') THEN

            -- Gather the necessary details from the updated row.
            v_student_id := NEW.student_id;
            v_task_title := NEW.task_title;
            v_points_awarded := NEW.actual_points_awarded;

            -- Get the student's display name once for both messages.
            SELECT COALESCE(p.nickname, p.first_name, 'Your child')
            INTO v_student_name
            FROM public.profiles p
            WHERE p.id = v_student_id;

            -- Construct the two different notification messages
            v_notification_title := 'Task Verified! ✨';
            v_student_message := 'Your task "' || v_task_title || '" was verified! You earned ' || v_points_awarded || ' tickets.';
            v_parent_message := v_student_name || '''s task "' || v_task_title || '" was verified! They earned ' || v_points_awarded || ' tickets.';
            
            -- Send notification to the STUDENT using the student-specific message.
            PERFORM public.send_push_notification(
                p_recipient_user_id := v_student_id,
                p_title := v_notification_title,
                p_message := v_student_message,
                p_trigger_event := 'task_verified'
            );

            -- Find and send notification to any LINKED PARENTS using the parent-specific message.
            FOR v_parent_id IN
                SELECT ps.parent_id
                FROM public.parent_students ps
                JOIN public.profiles p ON ps.parent_id = p.id
                WHERE ps.student_id = v_student_id AND p.status = 'active'
            LOOP
                PERFORM public.send_push_notification(
                    p_recipient_user_id := v_parent_id,
                    p_title := v_notification_title,
                    p_message := v_parent_message,
                    p_trigger_event := 'task_verified'
                );
            END LOOP;

        END IF;
    END IF;

    -- Return the new row to complete the trigger process.
    RETURN NEW;
END;
$$;


-- Step 2: Create the trigger itself (this part is unchanged).
DROP TRIGGER IF EXISTS on_task_verification_notify_family ON public.assigned_tasks;
CREATE TRIGGER on_task_verification_notify_family
AFTER UPDATE OF verification_status ON public.assigned_tasks
FOR EACH ROW
EXECUTE FUNCTION public.notify_family_on_task_verified();

COMMENT ON TRIGGER on_task_verification_notify_family ON public.assigned_tasks
IS 'Sends a personalized push notification to the student and their parents upon task verification.';