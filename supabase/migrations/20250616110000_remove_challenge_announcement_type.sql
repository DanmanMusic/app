-- Migration: Remove 'challenge' from announcement_type and ensure all V2 types exist.

-- Rename the old enum to a temporary name
ALTER TYPE public.announcement_type RENAME TO announcement_type_old;

-- Create the new, correct enum without 'challenge'
CREATE TYPE public.announcement_type AS ENUM (
  'announcement', 
  'redemption_celebration', 
  'streak_milestone'
);

-- Update the table to use the new enum, casting the old values.
-- This will fail if there are any 'challenge' types in your data.
-- If so, you must first UPDATE them to 'announcement' or DELETE them.
ALTER TABLE public.announcements 
ALTER COLUMN type TYPE public.announcement_type 
USING type::text::public.announcement_type;

-- Drop the old, temporary enum
DROP TYPE public.announcement_type_old;