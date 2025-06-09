CREATE TABLE IF NOT EXISTS public.practice_logs ( -- MODIFIED
    id bigserial PRIMARY KEY,
    student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    log_date date NOT NULL DEFAULT (now() at time zone 'utc')::date,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT practice_logs_student_id_log_date_key UNIQUE (student_id, log_date)
);
ALTER TABLE public.practice_logs ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.push_tokens ( -- MODIFIED
    id bigserial PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    token text NOT NULL UNIQUE,
    created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;