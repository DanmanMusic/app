-- V2 Golden Migration: Create the rewards table
CREATE TABLE public.rewards (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    name text NOT NULL,
    cost integer NOT NULL CHECK (cost >= 0),
    image_path text NULL,
    description text NULL,
    is_goal_eligible boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.rewards ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER on_reward_update BEFORE UPDATE ON public.rewards FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Now that the rewards table exists, we can add the foreign key constraint to the profiles table.
ALTER TABLE public.profiles
ADD CONSTRAINT fk_profiles_goal_reward FOREIGN KEY (current_goal_reward_id) REFERENCES public.rewards(id) ON DELETE SET NULL;