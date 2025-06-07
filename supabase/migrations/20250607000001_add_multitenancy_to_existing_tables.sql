-- Migration: Add company_id to all relevant tables for multi-tenancy.
-- This script alters existing tables to add a foreign key to the 'companies' table,
-- effectively scoping all data to a specific tenant. It also backfills existing
-- data to belong to the 'Danmans Music' company created in the previous migration.

-- Use a DO block to declare the company_id variable once for use throughout the script.
DO $$
DECLARE
  danmans_company_id uuid := '1d6a7a40-5b7c-41c4-b7c4-2794a34b2f1d';
BEGIN

  -- 1. Alter 'profiles' table
  ALTER TABLE public.profiles
  ADD COLUMN company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE;
  COMMENT ON COLUMN public.profiles.company_id IS 'The company this profile belongs to.';
  -- Backfill existing profiles
  UPDATE public.profiles SET company_id = danmans_company_id;
  -- Now that it's populated, make the column NOT NULL
  ALTER TABLE public.profiles
  ALTER COLUMN company_id SET NOT NULL;


  -- 2. Alter 'user_credentials' table (if it's still in use)
  -- This table is tightly coupled with 'profiles'
  ALTER TABLE public.user_credentials
  ADD COLUMN company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE;
  COMMENT ON COLUMN public.user_credentials.company_id IS 'The company this credential set belongs to.';
  -- Backfill existing credentials
  UPDATE public.user_credentials uc SET company_id = (
    SELECT p.company_id FROM public.profiles p WHERE p.id = uc.user_id
  );
  ALTER TABLE public.user_credentials
  ALTER COLUMN company_id SET NOT NULL;


  -- 3. Alter 'instruments' table
  ALTER TABLE public.instruments
  ADD COLUMN company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE;
  COMMENT ON COLUMN public.instruments.company_id IS 'The company that owns this instrument definition.';
  UPDATE public.instruments SET company_id = danmans_company_id;
  ALTER TABLE public.instruments
  ALTER COLUMN company_id SET NOT NULL;


  -- 4. Alter 'rewards' table
  ALTER TABLE public.rewards
  ADD COLUMN company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE;
  COMMENT ON COLUMN public.rewards.company_id IS 'The company that offers this reward.';
  UPDATE public.rewards SET company_id = danmans_company_id;
  ALTER TABLE public.rewards
  ALTER COLUMN company_id SET NOT NULL;


  -- 5. Alter 'task_library' table
  ALTER TABLE public.task_library
  ADD COLUMN company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE;
  COMMENT ON COLUMN public.task_library.company_id IS 'The company that owns this task library item.';
  UPDATE public.task_library SET company_id = danmans_company_id;
  ALTER TABLE public.task_library
  ALTER COLUMN company_id SET NOT NULL;


  -- 6. Alter 'announcements' table
  ALTER TABLE public.announcements
  ADD COLUMN company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE;
  COMMENT ON COLUMN public.announcements.company_id IS 'The company that published this announcement.';
  UPDATE public.announcements SET company_id = danmans_company_id;
  ALTER TABLE public.announcements
  ALTER COLUMN company_id SET NOT NULL;


  -- 7. Alter 'assigned_tasks' table
  ALTER TABLE public.assigned_tasks
  ADD COLUMN company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE;
  COMMENT ON COLUMN public.assigned_tasks.company_id IS 'The company scope for this assigned task.';
  UPDATE public.assigned_tasks SET company_id = danmans_company_id;
  ALTER TABLE public.assigned_tasks
  ALTER COLUMN company_id SET NOT NULL;


  -- 8. Alter 'ticket_transactions' table
  ALTER TABLE public.ticket_transactions
  ADD COLUMN company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE;
  COMMENT ON COLUMN public.ticket_transactions.company_id IS 'The company scope for this ticket transaction.';
  UPDATE public.ticket_transactions SET company_id = danmans_company_id;
  ALTER TABLE public.ticket_transactions
  ALTER COLUMN company_id SET NOT NULL;


  -- 9. Alter 'onetime_pins' table
  ALTER TABLE public.onetime_pins
  ADD COLUMN company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE;
  COMMENT ON COLUMN public.onetime_pins.company_id IS 'The company scope for this one-time PIN.';
  -- Backfill existing pins
  UPDATE public.onetime_pins op SET company_id = (
    SELECT p.company_id FROM public.profiles p WHERE p.id = op.user_id
  );
  ALTER TABLE public.onetime_pins
  ALTER COLUMN company_id SET NOT NULL;


  -- 10. Alter 'active_refresh_tokens' table
  ALTER TABLE public.active_refresh_tokens
  ADD COLUMN company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE;
  COMMENT ON COLUMN public.active_refresh_tokens.company_id IS 'The company scope for this refresh token.';
  -- Backfill existing tokens
  UPDATE public.active_refresh_tokens art SET company_id = (
    SELECT p.company_id FROM public.profiles p WHERE p.id = art.user_id
  );
  ALTER TABLE public.active_refresh_tokens
  ALTER COLUMN company_id SET NOT NULL;


END $$;