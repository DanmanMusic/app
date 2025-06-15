-- Migration: Ensure the 'streak_award' value exists in the transaction_type ENUM.
-- This is idempotent and safe to run even if the value already exists.
ALTER TYPE public.transaction_type ADD VALUE IF NOT EXISTS 'streak_award';

-- Add a missing description field to the ticket_transactions table for the streak award trigger
ALTER TABLE public.ticket_transactions
ADD COLUMN IF NOT EXISTS description TEXT NULL;