-- V2 Golden Migration: Create the assigned_tasks table

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'verification_status') THEN
        CREATE TYPE public.verification_status AS ENUM ('pending', 'verified', 'partial', 'incomplete');
    END IF;
END$$;

CREATE TABLE IF NOT EXISTS public.assigned_tasks (
    -- ... all columns remain the same ...
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    assigned_by_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
    assigned_date timestamptz NOT NULL DEFAULT now(),
    task_title text NOT NULL,
    task_description text NULL,
    task_link_url text NULL,
    task_attachment_path text NULL,
    task_base_points integer NOT NULL CHECK (task_base_points >= 0),
    is_complete boolean NOT NULL DEFAULT false,
    completed_date timestamptz NULL,
    verification_status public.verification_status NULL,
    verified_by_id uuid NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
    verified_date timestamptz NULL,
    actual_points_awarded integer NULL CHECK (actual_points_awarded >= 0),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.assigned_tasks ENABLE ROW LEVEL SECURITY;

-- Make trigger creation idempotent
DROP TRIGGER IF EXISTS on_assigned_task_update ON public.assigned_tasks; -- NEW
CREATE TRIGGER on_assigned_task_update BEFORE UPDATE ON public.assigned_tasks FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();