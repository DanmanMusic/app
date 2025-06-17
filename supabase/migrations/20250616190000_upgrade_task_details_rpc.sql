-- Migration: Upgrade the get_assigned_task_details RPC to use the new JSONB columns

-- First, drop the old function since we are changing its return signature
DROP FUNCTION IF EXISTS public.get_assigned_task_details(uuid);

-- Create the new, corrected version of the function
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
    -- MODIFIED: REMOVED OLD COLUMNS, ADDED NEW JSONB COLUMNS
    task_links jsonb,
    task_attachments jsonb,
    -- Joined Data remains the same
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
        -- MODIFIED: Select the new JSONB columns
        at.task_links,
        at.task_attachments,
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
    LEFT JOIN public.profiles p_student ON at.student_id = p_student.id
    LEFT JOIN public.profiles p_assigner ON at.assigned_by_id = p_assigner.id
    LEFT JOIN public.profiles p_verifier ON at.verified_by_id = p_verifier.id
    WHERE
        at.id = p_assignment_id;
END;
$$ LANGUAGE plpgsql;

-- Re-grant permission to the new function.
GRANT EXECUTE ON FUNCTION public.get_assigned_task_details(uuid) TO authenticated;