-- Migration: Enhances the student list RPC to also return an array of
-- linked teacher names, making the Admin view even more informative.

-- Drop the old function so we can replace its signature
DROP FUNCTION IF EXISTS public.get_student_list_with_stats(uuid, uuid, text, text, int, int);

-- Create the new version with the teacher_names column
CREATE OR REPLACE FUNCTION public.get_student_list_with_stats(
    p_company_id uuid,
    p_teacher_id uuid DEFAULT NULL,
    p_status TEXT DEFAULT 'all',
    p_search_term TEXT DEFAULT '',
    p_page INT DEFAULT 1,
    p_limit INT DEFAULT 20
)
RETURNS TABLE (
    id uuid,
    first_name text,
    last_name text,
    nickname text,
    status text,
    avatar_path text,
    company_id uuid,
    instrument_ids uuid[],
    balance bigint,
    current_streak integer,
    goal_reward_name text,
    goal_reward_cost integer,
    teacher_names text[], -- NEW: Array of teacher names
    total_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH student_list AS (
        SELECT
            p.id, p.first_name, p.last_name, p.nickname, p.status, p.avatar_path, p.company_id, p.current_goal_reward_id,
            ARRAY(SELECT si.instrument_id FROM public.student_instruments si WHERE si.student_id = p.id) as instrument_ids,
            -- NEW: Aggregate teacher names into an array
            ARRAY(
                SELECT COALESCE(tp.nickname, tp.first_name || ' ' || tp.last_name)
                FROM public.student_teachers st
                JOIN public.profiles tp ON st.teacher_id = tp.id
                WHERE st.student_id = p.id
            ) AS teacher_names
        FROM public.profiles p
        WHERE
            p.company_id = p_company_id
            AND p.role = 'student'
            AND (p_teacher_id IS NULL OR p.id IN (SELECT st.student_id FROM public.student_teachers st WHERE st.teacher_id = p_teacher_id))
            AND (p_status = 'all' OR p.status = p_status)
            AND (p_search_term = '' OR (p.first_name || ' ' || p.last_name || ' ' || COALESCE(p.nickname, '')) ILIKE '%' || p_search_term || '%')
    )
    SELECT
        sl.id, sl.first_name, sl.last_name, sl.nickname, sl.status, sl.avatar_path, sl.company_id, sl.instrument_ids,
        COALESCE((SELECT sum(tt.amount) FROM public.ticket_transactions tt WHERE tt.student_id = sl.id), 0)::bigint AS balance,
        COALESCE(streak.current_streak, 0) AS current_streak,
        r.name AS goal_reward_name,
        r.cost AS goal_reward_cost,
        sl.teacher_names, -- Return the new array
        count(*) OVER() AS total_count
    FROM
        student_list sl
    LEFT JOIN
        public.rewards r ON sl.current_goal_reward_id = r.id
    LEFT JOIN LATERAL
        public.get_student_streak_details(sl.id) streak ON true
    ORDER BY
        sl.status, sl.last_name, sl.first_name
    LIMIT p_limit
    OFFSET (p_page - 1) * p_limit;
END;
$$;

-- Re-grant permission to the new function signature
GRANT EXECUTE ON FUNCTION public.get_student_list_with_stats(uuid, uuid, text, text, int, int) TO authenticated;