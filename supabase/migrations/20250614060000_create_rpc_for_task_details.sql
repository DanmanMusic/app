-- Migration: Create an RPC function to reliably fetch full details for a single assigned task.
-- File: supabase/migrations/20250614060000_create_rpc_for_task_details.sql

CREATE OR REPLACE FUNCTION public.get_assigned_task_details(p_assignment_id uuid)
RETURNS TABLE (
    id uuid,
    student_id uuid,
    assigned_by_id uuid,
    assigned_date timestamptz,
    task_title text,
    task_description text,
    task_base_points integer,
    is_complete boolean,
    completed_date timestamptz,
    verification_status public.verification_status,
    verified_by_id uuid,
    verified_date timestamptz,
    actual_points_awarded integer,
    task_link_url text,
    task_attachment_path text,
    -- Joined Data
    assigner_first_name text,
    assigner_last_name text,
    assigner_nickname text,
    verifier_first_name text,
    verifier_last_name text,
    verifier_nickname text,
    student_profile_status text
)
AS $$
BEGIN
    RETURN QUERY
    SELECT
        at.id,
        at.student_id,
        at.assigned_by_id,
        at.assigned_date,
        at.task_title,
        at.task_description,
        at.task_base_points,
        at.is_complete,
        at.completed_date,
        at.verification_status,
        at.verified_by_id,
        at.verified_date,
        at.actual_points_awarded,
        at.task_link_url,
        at.task_attachment_path,
        -- Joins to profiles table
        p_assigner.first_name as assigner_first_name,
        p_assigner.last_name as assigner_last_name,
        p_assigner.nickname as assigner_nickname,
        p_verifier.first_name as verifier_first_name,
        p_verifier.last_name as verifier_last_name,
        p_verifier.nickname as verifier_nickname,
        p_student.status as student_profile_status
    FROM
        public.assigned_tasks at
    -- Explicit LEFT JOINs are unambiguous and guaranteed to work
    LEFT JOIN public.profiles p_student ON at.student_id = p_student.id
    LEFT JOIN public.profiles p_assigner ON at.assigned_by_id = p_assigner.id
    LEFT JOIN public.profiles p_verifier ON at.verified_by_id = p_verifier.id
    WHERE
        at.id = p_assignment_id;
END;
$$ LANGUAGE plpgsql;

-- Grant permission for authenticated users to call this new function.
GRANT EXECUTE ON FUNCTION public.get_assigned_task_details(uuid) TO authenticated;