-- Migration: Add is_pastoral_care flag to role table
ALTER TABLE role ADD COLUMN IF NOT EXISTS is_pastoral_care BOOLEAN DEFAULT false;
