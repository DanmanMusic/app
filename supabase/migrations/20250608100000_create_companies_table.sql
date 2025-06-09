-- V2 Golden Migration: Create the companies table
CREATE TABLE public.companies (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    created_at timestamptz NOT NULL DEFAULT now(),
    name text NOT NULL,
    CONSTRAINT companies_pkey PRIMARY KEY (id),
    CONSTRAINT companies_name_key UNIQUE (name)
);
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;