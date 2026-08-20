-- ==============================================================================
-- Migration: Add image_url and icon columns to pyp_kc_list
-- Purpose: Enable custom image/icon upload for each PYP Key Concept
-- Run in Supabase SQL Editor:
-- ==============================================================================

ALTER TABLE pyp_kc_list ADD COLUMN IF NOT EXISTS image_url text;
ALTER TABLE pyp_kc_list ADD COLUMN IF NOT EXISTS icon text;

-- Optional index for faster lookup
CREATE INDEX IF NOT EXISTS idx_pyp_kc_list_image_url ON pyp_kc_list(image_url);