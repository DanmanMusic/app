-- supabase/migrations/YYYYMMDDHHMMSS_create_rewards_table.sql

-- == Create Rewards Table ==

CREATE TABLE public.rewards (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    cost integer NOT NULL CHECK (cost >= 0),
    image_path text NULL, -- Path in Supabase Storage (e.g., public/reward_image.jpg)
    description text NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- == Comments ==
COMMENT ON TABLE public.rewards IS 'Stores items redeemable with virtual tickets.';
COMMENT ON COLUMN public.rewards.name IS 'Display name of the reward.';
COMMENT ON COLUMN public.rewards.cost IS 'Number of tickets required to redeem.';
COMMENT ON COLUMN public.rewards.image_path IS 'Path to the reward image in Supabase Storage bucket (e.g., reward-icons).';
COMMENT ON COLUMN public.rewards.description IS 'Optional longer description of the reward.';

-- == Enable RLS ==
ALTER TABLE public.rewards ENABLE ROW LEVEL SECURITY;

-- == Updated At Trigger ==
DO $$
BEGIN
  -- Ensure the handle_updated_at function exists before creating the trigger.
  -- This function should ideally be created in its own migration or a shared setup script.
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'handle_updated_at' AND pg_namespace.nspname = 'public') THEN
    CREATE TRIGGER on_reward_update
    BEFORE UPDATE ON public.rewards
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();
     RAISE NOTICE 'Trigger on_reward_update created for public.rewards.';
  ELSE
    RAISE WARNING 'Function public.handle_updated_at() not found. Skipping trigger creation for rewards table.';
  END IF;
END $$;

-- SELECT Policy: Allow ANYONE (public) to read the rewards catalog.
CREATE POLICY "Rewards: Allow public read access"
ON public.rewards
FOR SELECT
-- TO public -- Implicitly public
USING (true); -- Allows reading all reward rows

COMMENT ON POLICY "Rewards: Allow public read access" ON public.rewards
IS 'Allows anyone (logged in or anonymous) to view the rewards catalog.';

-- INSERT Policy: Allow ONLY admins to create new rewards.
CREATE POLICY "Rewards: Allow admin insert access"
ON public.rewards
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

COMMENT ON POLICY "Rewards: Allow admin insert access" ON public.rewards
IS 'Allows users with the admin role (checked via is_admin function) to create rewards.';

-- UPDATE Policy: Allow ONLY admins to update existing rewards.
CREATE POLICY "Rewards: Allow admin update access"
ON public.rewards
FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

COMMENT ON POLICY "Rewards: Allow admin update access" ON public.rewards
IS 'Allows users with the admin role to update existing rewards.';

-- DELETE Policy: Allow ONLY admins to delete rewards.
CREATE POLICY "Rewards: Allow admin delete access"
ON public.rewards
FOR DELETE
TO authenticated
USING (public.is_admin(auth.uid()));

COMMENT ON POLICY "Rewards: Allow admin delete access" ON public.rewards
IS 'Allows users with the admin role to delete rewards.';