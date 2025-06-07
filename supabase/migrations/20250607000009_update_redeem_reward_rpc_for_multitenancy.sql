-- Migration: Update redeem_reward_for_student RPC to be multi-tenant aware.

-- Drop the old function signature
DROP FUNCTION IF EXISTS public.redeem_reward_for_student(uuid, uuid, uuid);

-- Recreate the function with a new 'p_company_id' parameter
CREATE OR REPLACE FUNCTION public.redeem_reward_for_student(
    p_redeemer_id uuid,
    p_student_id uuid,
    p_reward_id uuid,
    p_company_id uuid -- NEW: The company scope for the transaction
)
RETURNS TABLE (
    success boolean,
    message text,
    new_balance integer
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_reward_cost integer;
  v_current_balance integer;
  v_reward_name text;
  v_transaction_amount integer;
BEGIN
  -- Get reward details (now ensuring it's in the correct company)
  SELECT cost, name INTO v_reward_cost, v_reward_name
  FROM public.rewards
  WHERE id = p_reward_id AND company_id = p_company_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Reward not found in this company.', NULL::integer;
    RETURN;
  END IF;

  -- Get current balance (this function is already implicitly secure by RLS on the table)
  v_current_balance := public.get_student_balance(p_student_id);

  -- Check if balance is sufficient
  IF v_current_balance < v_reward_cost THEN
    RETURN QUERY SELECT false, 'Insufficient ticket balance.', v_current_balance;
    RETURN;
  END IF;

  -- Perform redemption: Insert transaction record WITH company_id
  v_transaction_amount := -v_reward_cost;

  INSERT INTO public.ticket_transactions (student_id, amount, type, source_id, notes, company_id)
  VALUES (p_student_id, v_transaction_amount, 'redemption'::public.transaction_type, p_reward_id::text, 'Redeemed: ' || v_reward_name, p_company_id);

  -- Calculate new balance
  v_current_balance := v_current_balance + v_transaction_amount;

  -- Return success
  RETURN QUERY SELECT true, 'Reward redeemed successfully.', v_current_balance;

EXCEPTION
  WHEN others THEN
    RAISE WARNING 'Error during redeem_reward_for_student: %', SQLERRM;
    RETURN QUERY SELECT false, 'An unexpected error occurred during redemption: ' || SQLERRM, NULL::integer;
END;
$$;

-- Grant execute permission ONLY to service_role for the new function signature
GRANT EXECUTE ON FUNCTION public.redeem_reward_for_student(uuid, uuid, uuid, uuid) TO service_role;