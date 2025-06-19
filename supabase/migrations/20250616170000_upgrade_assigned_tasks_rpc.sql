-- Migration: Upgrade the get_assigned_tasks_filtered RPC to include student's linked teachers

-- First, drop the old function since we are changing its return signature
DROP FUNCTION IF EXISTS public.get_assigned_tasks_filtered(integer, integer, text, text, uuid, uuid);

-- Create the new, more powerful version of the function
CREATE OR REPLACE FUNCTION public.get_assigned_tasks_filtered(
    p_page integer DEFAULT 1,
    p_limit integer DEFAULT 15,
    p_assignment_status text DEFAULT 'all',
    p_student_status text DEFAULT 'all',
    p_student_id uuid DEFAULT NULL,
    p_teacher_id uuid DEFAULT NULL
)
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
    task_links jsonb,
    task_attachments jsonb,
    student_profile_status text,
    student_linked_teacher_ids uuid[], -- NEW COLUMN
    assigner_first_name text,
    assigner_last_name text,
    assigner_nickname text,
    verifier_first_name text,
    verifier_last_name text,
    verifier_nickname text,
    total_count bigint
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    WITH filtered_tasks AS (
        SELECT
            at.id,
            count(*) OVER() AS full_count
        FROM
            public.assigned_tasks at
        LEFT JOIN public.profiles p_student ON at.student_id = p_student.id
        WHERE
            (p_student_id IS NULL OR at.student_id = p_student_id) AND
            (p_teacher_id IS NULL OR at.student_id IN (SELECT st.student_id FROM public.student_teachers st WHERE st.teacher_id = p_teacher_id)) AND
            (p_student_status = 'all' OR p_student.status = p_student_status) AND
            (
                (p_assignment_status = 'all') OR
                (p_assignment_status = 'assigned' AND at.is_complete = false) OR
                (p_assignment_status = 'pending' AND at.is_complete = true AND at.verification_status = 'pending') OR
                (p_assignment_status = 'completed' AND at.is_complete = true AND at.verification_status IN ('verified', 'partial', 'incomplete'))
            )
        ORDER BY at.assigned_date DESC
        LIMIT p_limit
        OFFSET (p_page - 1) * p_limit
    )
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
        at.task_links,
        at.task_attachments,
        p_student.status AS student_profile_status,
        (SELECT array_agg(st.teacher_id) FROM public.student_teachers st WHERE st.student_id = at.student_id) AS student_linked_teacher_ids, -- NEW LINE
        p_assigner.first_name AS assigner_first_name,
        p_assigner.last_name AS assigner_last_name,
        p_assigner.nickname AS assigner_nickname,
        p_verifier.first_name AS verifier_first_name,
        p_verifier.last_name AS verifier_last_name,
        p_verifier.nickname AS verifier_nickname,
        ft.full_count
    FROM
        public.assigned_tasks at
    JOIN filtered_tasks ft ON at.id = ft.id
    LEFT JOIN public.profiles p_student ON at.student_id = p_student.id
    LEFT JOIN public.profiles p_assigner ON at.assigned_by_id = p_assigner.id
    LEFT JOIN public.profiles p_verifier ON at.verified_by_id = p_verifier.id
    ORDER BY at.assigned_date DESC;
END;
$$;

-- Re-grant permission to the new function signature
GRANT EXECUTE ON FUNCTION public.get_assigned_tasks_filtered(integer, integer, text, text, uuid, uuid) TO authenticated;