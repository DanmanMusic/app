-- Migration: Add is_goal_eligible flag to the rewards table.
-- This allows admins to control which rewards can be set as a long-term student goal.

-- Step 1: Alter the rewards table to add the new column.
-- It defaults to 'false' to ensure existing and new rewards are not
-- goal-eligible until an admin explicitly enables them.
ALTER TABLE public.rewards
ADD COLUMN is_goal_eligible boolean NOT NULL DEFAULT false;


-- Step 2: Add a comment for clarity.
COMMENT ON COLUMN public.rewards.is_goal_eligible IS 'If true, students can set this reward as their primary goal.';


-- Step 3 (Optional but Recommended): Backfill existing "major" rewards.
-- This is an example of how you might update your existing high-value items
-- to be goal-eligible immediately after the migration.
-- You can customize or remove this section based on your actual data.
-- UPDATE public.rewards
-- SET is_goal_eligible = true
-- WHERE cost >= 1000; -- Example threshold: any reward costing 1000 or more tickets.


-- Note: No RLS changes are needed. The existing policy that allows admins
-- to update rewards will automatically cover this new column. The logic for
-- filtering which rewards can be set as a goal will be handled on the client-side
-- (in the 'Set Goal' modal).