-- === Database Functions for Reward Redemption ===

-- 1. Function to calculate student balance
CREATE OR REPLACE FUNCTION public.get_student_balance(p_student_id uuid)
RETURNS integer
LANGUAGE sql
STABLE -- Does not modify the database
AS $$
  SELECT COALESCE(SUM(amount), 0)::integer
  FROM public.ticket_transactions
  WHERE student_id = p_student_id;
$$;

-- Grant execute permission to authenticated users (needed by redeem function)
-- And potentially service_role if called directly from Edge Functions sometimes
GRANT EXECUTE ON FUNCTION public.get_student_balance(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_student_balance(uuid) TO service_role;


-- 2. Function to perform the redemption atomically
CREATE OR REPLACE FUNCTION public.redeem_reward_for_student(
    p_redeemer_id uuid, -- The admin performing the action (for logging/auth later if needed)
    p_student_id uuid,
    p_reward_id uuid
)
RETURNS TABLE ( -- Returns a table structure indicating success/failure/new balance
    success boolean,
    message text,
    new_balance integer
)
LANGUAGE plpgsql
SECURITY DEFINER -- Run with elevated privileges to insert transaction
AS $$
DECLARE
  v_reward_cost integer;
  v_current_balance integer;
  v_reward_name text;
  v_transaction_amount integer;
BEGIN
  -- Get reward details
  SELECT cost, name INTO v_reward_cost, v_reward_name
  FROM public.rewards
  WHERE id = p_reward_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Reward not found.', NULL::integer;
    RETURN;
  END IF;

  -- Get current balance using the helper function
  v_current_balance := public.get_student_balance(p_student_id);

  -- Check if balance is sufficient
  IF v_current_balance < v_reward_cost THEN
    RETURN QUERY SELECT false, 'Insufficient ticket balance.', v_current_balance;
    RETURN;
  END IF;

  -- Perform redemption: Insert transaction record
  v_transaction_amount := -v_reward_cost; -- Negative amount for redemption

  INSERT INTO public.ticket_transactions (student_id, amount, type, source_id, notes)
  VALUES (p_student_id, v_transaction_amount, 'redemption'::public.transaction_type, p_reward_id::text, 'Redeemed: ' || v_reward_name);

  -- Calculate new balance (transaction log is source of truth)
  v_current_balance := v_current_balance + v_transaction_amount;

  -- Return success
  RETURN QUERY SELECT true, 'Reward redeemed successfully.', v_current_balance;

EXCEPTION
  WHEN others THEN
    -- Log error and return failure
    RAISE WARNING 'Error during redeem_reward_for_student: %', SQLERRM;
    RETURN QUERY SELECT false, 'An unexpected error occurred during redemption: ' || SQLERRM, NULL::integer;
END;
$$;

-- Grant execute permission ONLY to roles that should be able to trigger redemption
-- Initially, grant to service_role (for the Edge Function) and potentially admin role directly
GRANT EXECUTE ON FUNCTION public.redeem_reward_for_student(uuid, uuid, uuid) TO service_role;
-- Decide if admins should be able to call this RPC directly or only via the Edge Function
-- GRANT EXECUTE ON FUNCTION public.redeem_reward_for_student(uuid, uuid, uuid) TO authenticated; -- (If using with RLS check on who calls)