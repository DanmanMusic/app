-- V2 Golden Migration: Create profiles table and core auth/RLS helper functions

CREATE TABLE public.profiles (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    role text NOT NULL CHECK (role IN ('admin', 'teacher', 'student', 'parent')),
    first_name text NOT NULL,
    last_name text NOT NULL,
    nickname text NULL,
    status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    avatar_path text NULL,
    current_goal_reward_id uuid NULL, -- Constraint added later
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create the standard "updated_at" trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_profile_update BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Create RLS helper functions
CREATE OR REPLACE FUNCTION public.is_active_admin(user_id uuid) RETURNS boolean AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = user_id AND role = 'admin' AND status = 'active');
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION public.is_active_teacher(user_id uuid) RETURNS boolean AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = user_id AND role = 'teacher' AND status = 'active');
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION public.is_active_admin_or_teacher(user_id uuid) RETURNS boolean AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = user_id AND role IN ('admin', 'teacher') AND status = 'active');
$$ LANGUAGE sql STABLE;

-- Create the trigger to sync profile data to auth.users for the JWT
CREATE OR REPLACE FUNCTION public.sync_profile_to_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE auth.users
  SET raw_app_meta_data = raw_app_meta_data || jsonb_build_object('company_id', NEW.company_id, 'role', NEW.role)
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_profile_create_or_update
AFTER INSERT OR UPDATE OF company_id, role ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.sync_profile_to_auth_user();