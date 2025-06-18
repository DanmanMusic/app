-- Migration: Create a trigger to notify teachers when a student marks a task as complete.

ALTER TYPE public.notification_trigger_event ADD VALUE IF NOT EXISTS 'task_needs_verification';

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
    IF (TG_OP = 'UPDATE') THEN
        IF OLD.is_complete = false AND NEW.is_complete = true THEN

            SELECT COALESCE(p.nickname, p.first_name, 'A student')
            INTO v_student_name
            FROM public.profiles p
            WHERE p.id = NEW.student_id;
            
            v_task_title := NEW.task_title;
            v_notification_message := v_student_name || ' has marked the task "' || v_task_title || '" as complete.';

            -- REMOVED: The ALTER TYPE command is no longer here.
            
            FOR v_teacher_id IN
                SELECT st.teacher_id
                FROM public.student_teachers st
                JOIN public.profiles p ON st.teacher_id = p.id
                WHERE st.student_id = NEW.student_id AND p.status = 'active'
            LOOP
                PERFORM public.send_push_notification(
                    p_recipient_user_id := v_teacher_id,
                    p_title := v_notification_title,
                    p_message := v_notification_message,
                    p_data_payload := jsonb_build_object('studentId', NEW.student_id, 'taskId', NEW.id),
                    p_trigger_event := 'task_needs_verification' -- This now works because the value was added in a prior transaction.
                );
            END LOOP;

        END IF;
    END IF;

    RETURN NEW;
END;
$$;


-- Step 2: Create the trigger itself.
DROP TRIGGER IF EXISTS on_task_completion_notify_teacher ON public.assigned_tasks;
CREATE TRIGGER on_task_completion_notify_teacher
AFTER UPDATE OF is_complete ON public.assigned_tasks
FOR EACH ROW
EXECUTE FUNCTION public.notify_teacher_on_task_complete();

COMMENT ON TRIGGER on_task_completion_notify_teacher ON public.assigned_tasks
IS 'Sends a push notification to linked teachers when a student marks a task as complete.';