-- V2 Golden Migration: Create the announcements table

-- Use a DO block to create the type only if it doesn't exist.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'announcement_type') THEN
        CREATE TYPE public.announcement_type AS ENUM (
            'announcement', 
            'redemption_celebration', 
            'streak_milestone'
        );
    END IF;
END$$;

-- Create the table itself
CREATE TABLE public.announcements (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    type public.announcement_type NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    date timestamptz NOT NULL DEFAULT now(),
    related_student_id uuid NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER on_announcement_update BEFORE UPDATE ON public.announcements FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();