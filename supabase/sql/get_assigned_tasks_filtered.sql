-- Drop the function if it already exists
DROP FUNCTION IF EXISTS public.get_assigned_tasks_filtered(
    integer, integer, text, text, uuid, uuid
);

-- Recreate the function with total_count using a window function
CREATE OR REPLACE FUNCTION public.get_assigned_tasks_filtered(
    p_page integer DEFAULT 1,
    p_limit integer DEFAULT 15,
    p_assignment_status text DEFAULT 'all',
    p_student_status text DEFAULT 'all',
    p_student_id uuid DEFAULT NULL,
    p_teacher_id uuid DEFAULT NULL
)
RETURNS TABLE (
    -- Replicate the columns needed by the AssignedTask type
    id uuid, student_id uuid, assigned_by_id uuid, assigned_date timestamptz,
    task_title text, task_description text, task_base_points integer, is_complete boolean,
    completed_date timestamptz, verification_status public.verification_status,
    verified_by_id uuid, verified_date timestamptz, actual_points_awarded integer,
    task_link_url text, task_attachment_path text,
    -- Include profile data needed for display names/status
    student_profile_status text, assigner_first_name text, assigner_last_name text,
    assigner_nickname text, verifier_first_name text, verifier_last_name text,
    verifier_nickname text,
    -- Add the total count column BACK
    total_count bigint
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_offset integer;
    v_student_ids_for_teacher uuid[];
    base_query text;
BEGIN
    v_offset := (p_page - 1) * p_limit;

    -- Build the base query WITH joins and WHERE clauses but WITHOUT pagination/ordering yet
    base_query := '
        SELECT
            at.id, at.student_id, at.assigned_by_id, at.assigned_date, at.task_title, at.task_description,
            at.task_base_points, at.is_complete, at.completed_date, at.verification_status, at.verified_by_id,
            at.verified_date, at.actual_points_awarded, at.task_link_url, at.task_attachment_path,
            sp.status AS student_profile_status,
            ap.first_name AS assigner_first_name, ap.last_name AS assigner_last_name, ap.nickname AS assigner_nickname,
            vp.first_name AS verifier_first_name, vp.last_name AS verifier_last_name, vp.nickname AS verifier_nickname
        FROM
            public.assigned_tasks at
        JOIN
            public.profiles sp ON at.student_id = sp.id -- Ensures profile exists for status check
        LEFT JOIN
            public.profiles ap ON at.assigned_by_id = ap.id
        LEFT JOIN
            public.profiles vp ON at.verified_by_id = vp.id
        WHERE 1=1 ';

    -- Apply Teacher Filter (if applicable)
    IF p_teacher_id IS NOT NULL AND p_student_id IS NULL THEN
        SELECT array_agg(st.student_id) INTO v_student_ids_for_teacher
        FROM public.student_teachers st WHERE st.teacher_id = p_teacher_id;
        IF v_student_ids_for_teacher IS NULL OR array_length(v_student_ids_for_teacher, 1) = 0 THEN
            base_query := base_query || ' AND FALSE ';
        ELSE
            base_query := base_query || ' AND at.student_id = ANY(' || quote_literal(v_student_ids_for_teacher::text) || '::uuid[]) ';
        END IF;
    END IF;

    -- Apply Student ID Filter
    IF p_student_id IS NOT NULL THEN
        base_query := base_query || format(' AND at.student_id = %L ', p_student_id);
    END IF;

    -- Apply Assignment Status Filter
    IF p_assignment_status = 'assigned' THEN base_query := base_query || ' AND at.is_complete = false ';
    ELSIF p_assignment_status = 'pending' THEN base_query := base_query || ' AND at.is_complete = true AND at.verification_status = ''pending'' ';
    ELSIF p_assignment_status = 'completed' THEN base_query := base_query || ' AND at.is_complete = true AND at.verification_status != ''pending'' ';
    END IF;

    -- Apply Student Status Filter
    IF p_student_status != 'all' THEN
        base_query := base_query || format(' AND sp.status = %L ', p_student_status);
    END IF;

    -- Construct the final query using a Common Table Expression (CTE)
    -- and a window function to get the total count *after* filtering
    RETURN QUERY EXECUTE format('
        WITH filtered_tasks AS (
            %s -- Inject the base query with filters here
        )
        SELECT
            ft.*,
            count(*) OVER() AS total_count -- Window function calculates total count over the filtered set
        FROM
            filtered_tasks ft
        ORDER BY
            ft.assigned_date DESC
        LIMIT %s OFFSET %s;
    ', base_query, p_limit, v_offset);

END;
$$;

-- Grant execute permission again
GRANT EXECUTE ON FUNCTION public.get_assigned_tasks_filtered(integer, integer, text, text, uuid, uuid) TO authenticated;