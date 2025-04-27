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
    id bigserial PRIMARY KEY, -- Using bigserial for simple ordering and guaranteed uniqueness
    student_id uuid NOT NULL, -- FK added later or handled by application logic initially
    "timestamp" timestamptz NOT NULL DEFAULT now(), -- Use quoted "timestamp" as it's a reserved word
    amount integer NOT NULL, -- Can be positive (award/add) or negative (subtract/redemption)
    type public.transaction_type NOT NULL,
    source_id text NULL, -- ID of related record (assigned_task id, reward id, user id of adjuster)
    notes text NULL
    -- Potential FKs to add later:
    -- CONSTRAINT fk_transactions_student FOREIGN KEY (student_id) REFERENCES public.profiles(id) ON DELETE CASCADE -- Cascade delete history? Or SET NULL? Needs decision.
);

-- == Comments ==
COMMENT ON TABLE public.ticket_transactions IS 'Logs all changes to student ticket balances.';
COMMENT ON COLUMN public.ticket_transactions.id IS 'Unique identifier for the transaction.';
COMMENT ON COLUMN public.ticket_transactions.student_id IS 'ID of the student whose balance changed (FK TBD).';
COMMENT ON COLUMN public.ticket_transactions."timestamp" IS 'Timestamp when the transaction occurred.';
COMMENT ON COLUMN public.ticket_transactions.amount IS 'The change in ticket balance (+/-).';
COMMENT ON COLUMN public.ticket_transactions.type IS 'The category of the transaction.';
COMMENT ON COLUMN public.ticket_transactions.source_id IS 'Identifier of the originating record (task, reward, user etc.).';
COMMENT ON COLUMN public.ticket_transactions.notes IS 'Optional details about the transaction.';

-- == Enable RLS ==
ALTER TABLE public.ticket_transactions ENABLE ROW LEVEL SECURITY;

-- == Indexes ==
CREATE INDEX idx_transactions_student_id_timestamp ON public.ticket_transactions (student_id, "timestamp" DESC); -- Common query pattern
CREATE INDEX idx_transactions_type ON public.ticket_transactions (type);

-- == Row Level Security (RLS) Policies ==
-- WARNING: TEMPORARY DEVELOPMENT POLICIES - Allow anonymous access. MUST BE REPLACED.
-- Transaction history is sensitive, anonymous access should be heavily restricted.

-- 1. TEMP Anon Select
DROP POLICY IF EXISTS "TEMP Allow anon select on ticket_transactions" ON public.ticket_transactions;
CREATE POLICY "TEMP Allow anon select on ticket_transactions"
ON public.ticket_transactions FOR SELECT
TO anon
USING (true);
COMMENT ON POLICY "TEMP Allow anon select on ticket_transactions" ON public.ticket_transactions IS 'TEMP DEV ONLY: Allows anon read access. MUST BE REPLACED.';

-- 2. TEMP Anon Write (Insert/Update/Delete) - Highly discouraged even for dev
DROP POLICY IF EXISTS "TEMP Allow anon write on ticket_transactions" ON public.ticket_transactions;
CREATE POLICY "TEMP Allow anon write on ticket_transactions"
ON public.ticket_transactions FOR ALL
TO anon
USING (true)
WITH CHECK (true);
COMMENT ON POLICY "TEMP Allow anon write on ticket_transactions" ON public.ticket_transactions IS 'TEMP DEV ONLY: Allows anon write access. EXTREMELY INSECURE. MUST BE REPLACED.';