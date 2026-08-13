-- Migration: Add `keterangan` column to `pypkcunit` for Key Concept unit notes
-- Date: 2026-08-13

ALTER TABLE public.pypkcunit ADD COLUMN IF NOT EXISTS keterangan text;
