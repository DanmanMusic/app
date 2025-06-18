-- Migration: Create an RPC function to get a paginated list of teachers with their student counts.

-- Drop the function if it exists to ensure a clean update
DROP FUNCTION IF EXISTS public.get_teacher_list_with_stats(uuid, int, int);

CREATE OR REPLACE FUNCTION public.get_teacher_list_with_stats(
    p_company_id uuid,
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
    -- New fields for this specific RPC
    student_count bigint,
    total_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH teacher_base AS (
      SELECT
        p.id,
        p.first_name,
        p.last_name,
        p.nickname,
        p.status,
        p.avatar_path,
        p.company_id
      FROM public.profiles p
      WHERE
        p.company_id = p_company_id
        AND p.role = 'teacher'
    )
    SELECT
        tb.id,
        tb.first_name,
        tb.last_name,
        tb.nickname,
        tb.status,
        tb.avatar_path,
        tb.company_id,
        -- Subquery to count students for each teacher
        (SELECT count(*) FROM public.student_teachers st WHERE st.teacher_id = tb.id) as student_count,
        -- Window function to get the total count for pagination
        count(*) OVER() as total_count
    FROM
        teacher_base tb
    ORDER BY
        tb.last_name, tb.first_name
    LIMIT p_limit
    OFFSET (p_page - 1) * p_limit;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_teacher_list_with_stats(uuid, int, int) TO authenticated;