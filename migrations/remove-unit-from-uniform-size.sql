-- Migration: Remove unit_id from uniform_size table
-- Reason: Uniform sizes (S, M, L, XL, etc.) should be universal across all units
-- Date: 2026-01-12

-- Step 1: Drop foreign key constraint if exists
ALTER TABLE uniform_size 
DROP CONSTRAINT IF EXISTS uniform_size_unit_id_fkey;

-- Step 2: Remove unit_id column
ALTER TABLE uniform_size 
DROP COLUMN IF EXISTS unit_id;

-- Step 3: Add unique constraint on size_name to prevent duplicates
ALTER TABLE uniform_size 
ADD CONSTRAINT uniform_size_size_name_unique UNIQUE (size_name);

-- Step 4: Clean up any duplicate size names (keep the one with lowest size_id)
DELETE FROM uniform_size a
USING uniform_size b
WHERE a.size_id > b.size_id
AND a.size_name = b.size_name;

COMMENT ON TABLE uniform_size IS 'Universal uniform sizes applicable to all units';
