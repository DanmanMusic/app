-- supabase/migrations/20250427001114_create_ticket_transactions_table.sql

-- Define ENUM type for transaction types (idempotent)
DO $$ BEGIN
    CREATE TYPE public.transaction_type AS ENUM (
        'task_award',
        'manual_add',
        'manual_subtract',
        'redemption'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;


-- == Create Ticket Transactions Table ==
CREATE TABLE public.ticket_transactions (
    id bigserial PRIMARY KEY,
    student_id uuid NOT NULL, -- FK added below
    "timestamp" timestamptz NOT NULL DEFAULT now(),
    amount integer NOT NULL,
    type public.transaction_type NOT NULL,
    source_id text NULL,
    notes text NULL
);

-- == Comments ==
COMMENT ON TABLE public.ticket_transactions IS 'Logs all ticket changes. RLS enabled. Read access based on role/links. Writes ONLY via Edge Functions.';
COMMENT ON COLUMN public.ticket_transactions.id IS 'Unique identifier for the transaction.';
COMMENT ON COLUMN public.ticket_transactions.student_id IS 'ID of the student whose balance changed.';
COMMENT ON COLUMN public.ticket_transactions."timestamp" IS 'Timestamp when the transaction occurred.';
COMMENT ON COLUMN public.ticket_transactions.amount IS 'The change in ticket balance (+/-).';
COMMENT ON COLUMN public.ticket_transactions.type IS 'The category of the transaction.';
COMMENT ON COLUMN public.ticket_transactions.source_id IS 'Identifier of the originating record (task, reward, user etc.).';
COMMENT ON COLUMN public.ticket_transactions.notes IS 'Optional details about the transaction.';

-- == Enable RLS ==
ALTER TABLE public.ticket_transactions ENABLE ROW LEVEL SECURITY;

-- == Add Foreign Key Constraint ==
-- Link student_id to profiles, cascade delete transactions if student deleted
ALTER TABLE public.ticket_transactions
ADD CONSTRAINT fk_ticket_transactions_student
  FOREIGN KEY (student_id) REFERENCES public.profiles(id)
  ON DELETE CASCADE;
COMMENT ON CONSTRAINT fk_ticket_transactions_student ON public.ticket_transactions IS 'Ensures ticket transaction references a valid student profile. Deletes transaction if student is deleted.';


-- == Indexes ==
CREATE INDEX idx_transactions_student_id_timestamp ON public.ticket_transactions (student_id, "timestamp" DESC);
CREATE INDEX idx_transactions_type ON public.ticket_transactions (type);

-- == Helper Functions (Integrated from redeem_rewards.sql) ==

-- Function: get_student_balance
-- Calculates the current ticket balance for a student by summing transactions.
CREATE OR REPLACE FUNCTION public.get_student_balance(p_student_id uuid)
RETURNS integer
LANGUAGE sql
STABLE -- Does not modify the database
AS $$
  SELECT COALESCE(SUM(amount), 0)::integer
  FROM public.ticket_transactions
  WHERE student_id = p_student_id;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_student_balance(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_student_balance(uuid) TO service_role;


-- Function: redeem_reward_for_student
-- Atomically checks balance, inserts redemption transaction if sufficient funds.
CREATE OR REPLACE FUNCTION public.redeem_reward_for_student(
    p_redeemer_id uuid, -- The admin performing the action
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

-- Grant execute permission ONLY to service_role (for the Edge Function)
GRANT EXECUTE ON FUNCTION public.redeem_reward_for_student(uuid, uuid, uuid) TO service_role;


-- === RLS for public.ticket_transactions ===

-- SELECT Policies
CREATE POLICY "Ticket Transactions: Allow admin read access" ON public.ticket_transactions
  FOR SELECT TO authenticated USING (public.is_active_admin(auth.uid()));
CREATE POLICY "Ticket Transactions: Allow students read own" ON public.ticket_transactions
  FOR SELECT TO authenticated USING (auth.uid() = student_id);
CREATE POLICY "Ticket Transactions: Allow parents read children" ON public.ticket_transactions
  FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.parent_students ps WHERE ps.parent_id = auth.uid() AND ps.student_id = ticket_transactions.student_id));
CREATE POLICY "Ticket Transactions: Allow teachers read linked students" ON public.ticket_transactions
  FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.student_teachers st WHERE st.teacher_id = auth.uid() AND st.student_id = ticket_transactions.student_id));

-- NO INSERT/UPDATE/DELETE policies are defined here, as writes are handled EXCLUSIVELY by Edge Functions (verifyTask, redeemReward, adjustTickets) using the service_role key.