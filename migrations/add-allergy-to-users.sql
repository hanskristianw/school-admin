-- Migration: Add allergy and special_health_conditions to users table
-- Description: Stores permanent student medical alerts and allergies directly on the user profile.

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS allergy TEXT,
ADD COLUMN IF NOT EXISTS special_health_conditions TEXT;

COMMENT ON COLUMN public.users.allergy IS 'Medical allergy warnings (e.g. seafood, peanuts, dust, fur, drugs)';
COMMENT ON COLUMN public.users.special_health_conditions IS 'Special chronic or notable health conditions (e.g. Asthma, Sinus, Eczema, Seizure history)';
