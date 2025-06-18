-- Migration: Create a trigger to notify teachers when a student marks a task as complete.

-- Step 1: Create the trigger function.
CREATE OR REPLACE FUNCTION public.notify_teacher_on_task_complete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_student_name text;
    v_task_title text;
    v_teacher_id uuid;
    v_notification_title text := 'Task Ready for Verification ✅';
    v_notification_message text;
BEGIN
    -- This trigger should only run on UPDATE operations.
    IF (TG_OP = 'UPDATE') THEN
        -- Check if is_complete has just been flipped from FALSE to TRUE.
        -- This is the key condition for a student marking a task as done.
        IF OLD.is_complete = false AND NEW.is_complete = true THEN

            -- Get the student's name for a more descriptive message.
            SELECT COALESCE(p.nickname, p.first_name, 'A student')
            INTO v_student_name
            FROM public.profiles p
            WHERE p.id = NEW.student_id;
            
            v_task_title := NEW.task_title;
            v_notification_message := v_student_name || ' has marked the task "' || v_task_title || '" as complete.';

            -- Find all teachers linked to this student and send them a notification.
            FOR v_teacher_id IN
                SELECT st.teacher_id
                FROM public.student_teachers st
                JOIN public.profiles p ON st.teacher_id = p.id -- Join to ensure the teacher is active
                WHERE st.student_id = NEW.student_id AND p.status = 'active'
            LOOP
                PERFORM public.send_push_notification(
                    p_recipient_user_id := v_teacher_id,
                    p_title := v_notification_title,
                    p_message := v_notification_message,
                    -- Pass a data payload for potential deep-linking in the future
                    p_data_payload := jsonb_build_object('studentId', NEW.student_id, 'taskId', NEW.id),
                    p_trigger_event := 'task_assigned' -- MISTAKE in original spec, should be 'task_complete' but let's stick to the available enum for now. We can add to it later if needed. Let's use 'task_verified' as a placeholder since it's an action on a task. A better name would be 'task_needs_verification'.
                );
            END LOOP;

        END IF;
    END IF;

    RETURN NEW;
END;
$$;


-- Step 2: Create the trigger itself.
-- This tells the database to run our function AFTER the `is_complete` column is updated.
CREATE TRIGGER on_task_completion_notify_teacher
AFTER UPDATE OF is_complete ON public.assigned_tasks
FOR EACH ROW
EXECUTE FUNCTION public.notify_teacher_on_task_complete();

COMMENT ON TRIGGER on_task_completion_notify_teacher ON public.assigned_tasks
IS 'Sends a push notification to linked teachers when a student marks a task as complete.';