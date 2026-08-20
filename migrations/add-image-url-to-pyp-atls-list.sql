-- ==============================================================================
-- Migration: Add image_url and icon columns to pyp_atls_list
-- Purpose: Enable custom image/icon upload for each ATL (Approaches to Learning) Skill
-- Run in Supabase SQL Editor:
-- ==============================================================================

ALTER TABLE pyp_atls_list ADD COLUMN IF NOT EXISTS image_url text;
ALTER TABLE pyp_atls_list ADD COLUMN IF NOT EXISTS icon text;

-- Optional index for faster lookup if queried by image_url
CREATE INDEX IF NOT EXISTS idx_pyp_atls_list_image_url ON pyp_atls_list(image_url);