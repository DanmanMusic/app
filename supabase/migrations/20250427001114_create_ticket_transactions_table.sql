-- supabase/migrations/<timestamp>_create_ticket_transactions_table.sql

-- Define ENUM type for transaction types
DROP TYPE IF EXISTS public.transaction_type;
CREATE TYPE public.transaction_type AS ENUM (
    'task_award',
    'manual_add',
    'manual_subtract',
    'redemption'
);

-- == Create Ticket Transactions Table ==
CREATE TABLE public.ticket_transactions (
    id bigserial PRIMARY KEY,
    student_id uuid NOT NULL, -- FK should be added later
    "timestamp" timestamptz NOT NULL DEFAULT now(),
    amount integer NOT NULL,
    type public.transaction_type NOT NULL,
    source_id text NULL,
    notes text NULL
);

-- == Comments ==
COMMENT ON TABLE public.ticket_transactions IS 'Logs all ticket changes. RLS enabled. Read access based on role/links. Writes ONLY via Edge Functions.'; -- Updated Comment
COMMENT ON COLUMN public.ticket_transactions.id IS 'Unique identifier for the transaction.';
COMMENT ON COLUMN public.ticket_transactions.student_id IS 'ID of the student whose balance changed.';
COMMENT ON COLUMN public.ticket_transactions."timestamp" IS 'Timestamp when the transaction occurred.';
COMMENT ON COLUMN public.ticket_transactions.amount IS 'The change in ticket balance (+/-).';
COMMENT ON COLUMN public.ticket_transactions.type IS 'The category of the transaction.';
COMMENT ON COLUMN public.ticket_transactions.source_id IS 'Identifier of the originating record (task, reward, user etc.).';
COMMENT ON COLUMN public.ticket_transactions.notes IS 'Optional details about the transaction.';

-- == Enable RLS ==
ALTER TABLE public.ticket_transactions ENABLE ROW LEVEL SECURITY;

-- == Indexes ==
CREATE INDEX idx_transactions_student_id_timestamp ON public.ticket_transactions (student_id, "timestamp" DESC);
CREATE INDEX idx_transactions_type ON public.ticket_transactions (type);


-- === RLS for public.ticket_transactions ===

-- Clean up existing policies (including TEMP/old ones)
DROP POLICY IF EXISTS "Ticket Transactions: Allow admin read access" ON public.ticket_transactions;
DROP POLICY IF EXISTS "Ticket Transactions: Allow students read own" ON public.ticket_transactions;
DROP POLICY IF EXISTS "Ticket Transactions: Allow parents read children" ON public.ticket_transactions;
DROP POLICY IF EXISTS "Ticket Transactions: Allow teachers read linked students" ON public.ticket_transactions;
DROP POLICY IF EXISTS "Ticket Transactions: Block direct writes" ON public.ticket_transactions;
DROP POLICY IF EXISTS "TEMP Allow anon select on ticket_transactions" ON public.ticket_transactions;
DROP POLICY IF EXISTS "TEMP Allow anon write on ticket_transactions" ON public.ticket_transactions;


-- SELECT Policies
CREATE POLICY "Ticket Transactions: Allow admin read access" ON public.ticket_transactions
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Ticket Transactions: Allow students read own" ON public.ticket_transactions
  FOR SELECT TO authenticated USING (auth.uid() = student_id);
CREATE POLICY "Ticket Transactions: Allow parents read children" ON public.ticket_transactions
  FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.parent_students ps WHERE ps.parent_id = auth.uid() AND ps.student_id = ticket_transactions.student_id));
CREATE POLICY "Ticket Transactions: Allow teachers read linked students" ON public.ticket_transactions
  FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.student_teachers st WHERE st.teacher_id = auth.uid() AND st.student_id = ticket_transactions.student_id));
