-- supabase/migrations/YYYYMMDDHHMMSS_create_rewards_table.sql -- Replace YYYY... with actual timestamp

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
-- Apply the existing updated_at trigger function (should exist from instruments migration)
-- Ensure the function exists before creating the trigger
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'handle_updated_at') THEN
    CREATE TRIGGER on_reward_update
    BEFORE UPDATE ON public.rewards
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();
  ELSE
    RAISE WARNING 'Function handle_updated_at() not found. Skipping trigger creation for rewards table.';
  END IF;
END $$;

-- == Row Level Security (RLS) Policies ==
-- WARNING: TEMPORARY DEVELOPMENT POLICIES - Allow anonymous access. MUST BE REPLACED.

-- 1. Public Read Access
DROP POLICY IF EXISTS "Allow public read access on rewards" ON public.rewards;
CREATE POLICY "Allow public read access on rewards"
ON public.rewards
FOR SELECT
USING (true);

COMMENT ON POLICY "Allow public read access on rewards" ON public.rewards
IS 'Allows anyone (publicly) to read the list of rewards.';

-- 2. Anonymous Insert Access (TEMPORARY)
DROP POLICY IF EXISTS "TEMP Allow anon insert access on rewards" ON public.rewards;
CREATE POLICY "TEMP Allow anon insert access on rewards"
ON public.rewards
FOR INSERT
TO anon -- Grant to anonymous role
WITH CHECK (true); -- No specific check for anon insert yet

COMMENT ON POLICY "TEMP Allow anon insert access on rewards" ON public.rewards
IS 'TEMP DEV ONLY: Allows anonymous users to add rewards. MUST BE REPLACED with authenticated admin policy.';

-- 3. Anonymous Update Access (TEMPORARY)
DROP POLICY IF EXISTS "TEMP Allow anon update access on rewards" ON public.rewards;
CREATE POLICY "TEMP Allow anon update access on rewards"
ON public.rewards
FOR UPDATE
TO anon -- Grant to anonymous role
USING (true)
WITH CHECK (true);

COMMENT ON POLICY "TEMP Allow anon update access on rewards" ON public.rewards
IS 'TEMP DEV ONLY: Allows anonymous users to update rewards. MUST BE REPLACED with authenticated admin policy.';

-- 4. Anonymous Delete Access (TEMPORARY)
DROP POLICY IF EXISTS "TEMP Allow anon delete access on rewards" ON public.rewards;
CREATE POLICY "TEMP Allow anon delete access on rewards"
ON public.rewards
FOR DELETE
TO anon -- Grant to anonymous role
USING (true);

COMMENT ON POLICY "TEMP Allow anon delete access on rewards" ON public.rewards
IS 'TEMP DEV ONLY: Allows anonymous users to delete rewards. MUST BE REPLACED with authenticated admin policy.';