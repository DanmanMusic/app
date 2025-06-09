-- V2 Golden Migration: Create the ticket_transactions table

-- Use a DO block to create the type only if it doesn't exist.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transaction_type') THEN
        CREATE TYPE public.transaction_type AS ENUM ('task_award', 'manual_add', 'manual_subtract', 'redemption', 'streak_award');
    END IF;
END$$;

-- Create the table only IF IT DOES NOT EXIST
CREATE TABLE IF NOT EXISTS public.ticket_transactions (
    id bigserial PRIMARY KEY,
    company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    "timestamp" timestamptz NOT NULL DEFAULT now(),
    amount integer NOT NULL,
    type public.transaction_type NOT NULL,
    source_id text NULL,
    notes text NULL
);

-- This is safe to run again.
ALTER TABLE public.ticket_transactions ENABLE ROW LEVEL SECURITY;