-- Migration: Creates a temporary debugging function to inspect the raw data
-- that the company streak statistics function is operating on.

CREATE OR REPLACE FUNCTION public.debug_get_all_practice_logs_for_company(p_company_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result_jsonb jsonb;
BEGIN
  -- This query will:
  -- 1. Find all active students in the given company.
  -- 2. For each student, it will LEFT JOIN their practice logs.
  -- 3. It will aggregate all of this information into a single JSON object for us to inspect.
  SELECT
    jsonb_agg(
      jsonb_build_object(
        'student_id', p.id,
        'student_name', p.first_name,
        'practice_logs', (
          SELECT COALESCE(jsonb_agg(pl.*), '[]'::jsonb)
          FROM public.practice_logs pl
          WHERE pl.student_id = p.id
        )
      )
    )
  INTO result_jsonb
  FROM public.profiles p
  WHERE
    p.company_id = p_company_id AND p.role = 'student' AND p.status = 'active';

  RETURN COALESCE(result_jsonb, '[]'::jsonb);
END;
$$;

-- Grant permission for authenticated users to call this new function.
GRANT EXECUTE ON FUNCTION public.debug_get_all_practice_logs_for_company(uuid) TO authenticated;