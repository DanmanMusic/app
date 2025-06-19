-- Migration: Create the master function to trigger all daily notifications

CREATE OR REPLACE FUNCTION trigger_daily_notifications()
RETURNS void
LANGUAGE plpgsql
-- CRITICAL: This function must run with the permissions of its owner (the superuser)
-- to be able to call the other SECURITY DEFINER functions and bypass RLS.
SECURITY DEFINER
AS $$
DECLARE
    company_record RECORD;
    admin_record RECORD;
    teacher_record RECORD;
    reminder_record RECORD;
    briefing_data RECORD;
    teacher_briefing_data RECORD;
    admin_message TEXT;
    teacher_message TEXT;
    parent_message_parts TEXT[];
    child_detail JSONB;
BEGIN
    -- Loop through every company in the system
    FOR company_record IN SELECT id, timezone FROM public.companies
    LOOP
        -- Staff Briefing at 9 AM local time
        IF EXTRACT(HOUR FROM now() AT TIME ZONE company_record.timezone) = 9 THEN
            
            -- --- Admin Briefings ---
            -- Get the summary data for the entire company
            SELECT * INTO briefing_data FROM get_admin_daily_briefing_data(company_record.id);
            -- Format the message
            admin_message := 'Yesterday: ' || briefing_data.tasks_completed_yesterday || ' tasks completed, ' || briefing_data.rewards_redeemed_yesterday || ' rewards redeemed, ' || briefing_data.students_practiced_yesterday || ' students practiced. Today: ' || briefing_data.tasks_pending_verification || ' tasks pending verification.';
            
            -- Find all active admins in this company and send them the notification
            FOR admin_record IN SELECT id FROM public.profiles WHERE company_id = company_record.id AND role = 'admin' AND status = 'active'
            LOOP
                PERFORM send_push_notification(
                    p_recipient_user_id := admin_record.id,
                    p_title := 'Admin Daily Briefing 📈',
                    p_message := admin_message,
                    p_data_payload := '{"type":"admin_briefing"}',
                    p_trigger_event := 'cron_staff_daily_briefing'
                );
            END LOOP;

            -- --- Teacher Briefings ---
            -- Find all active teachers in this company
            FOR teacher_record IN SELECT id FROM public.profiles WHERE company_id = company_record.id AND role = 'teacher' AND status = 'active'
            LOOP
                -- Get personalized data FOR EACH teacher
                SELECT * INTO teacher_briefing_data FROM get_teacher_daily_briefing_data(teacher_record.id);
                -- Format their specific message
                teacher_message := 'For your students yesterday: ' || teacher_briefing_data.tasks_completed_yesterday || ' tasks completed, ' || teacher_briefing_data.students_practiced_yesterday || ' logged practice. You have ' || teacher_briefing_data.tasks_pending_verification || ' tasks pending your verification.';
                PERFORM send_push_notification(
                    p_recipient_user_id := teacher_record.id,
                    p_title := 'Your Student Update 🎵',
                    p_message := teacher_message,
                    p_data_payload := '{"type":"teacher_briefing"}',
                    p_trigger_event := 'cron_staff_daily_briefing'
                );
            END LOOP;
        END IF;

        -- Streak Reminders at 3 PM local time
        IF EXTRACT(HOUR FROM now() AT TIME ZONE company_record.timezone) = 15 THEN
            FOR reminder_record IN SELECT * FROM get_students_for_streak_reminder(company_record.id)
            LOOP
                IF reminder_record.recipient_role = 'student' THEN
                    -- Student message (only ever has one element in the array)
                    PERFORM send_push_notification(
                        p_recipient_user_id := reminder_record.recipient_id,
                        p_title := 'Keep Your Streak Going! 🔥',
                        p_message := 'You''re on a roll with a ' || (reminder_record.reminder_details->0->>'streak') || '-day streak! Don''t forget to log your practice today.',
                        p_data_payload := '{"type":"practice_reminder"}',
                        p_trigger_event := 'cron_student_practice_reminder'
                    );
                
                ELSIF reminder_record.recipient_role = 'parent' THEN
                    -- Parent message (can have multiple children)
                    parent_message_parts := ARRAY[]::TEXT[];
                    FOR child_detail IN SELECT * FROM jsonb_array_elements(reminder_record.reminder_details)
                    LOOP
                        parent_message_parts := array_append(parent_message_parts, (child_detail->>'name') || ' (' || (child_detail->>'streak') || '-day streak)');
                    END LOOP;
                    
                    PERFORM send_push_notification(
                        p_recipient_user_id := reminder_record.recipient_id,
                        p_title := 'Practice Reminder 🎵',
                        p_message := 'Help keep the streak alive for: ' || array_to_string(parent_message_parts, ', ') || '.',
                        p_data_payload := '{"type":"practice_reminder"}',
                        p_trigger_event := 'cron_parent_practice_reminder'
                    );
                END IF;
            END LOOP;
        END IF;
    END LOOP;
END;
$$;