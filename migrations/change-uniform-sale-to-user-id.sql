-- =========================================================
-- Migration: Change uniform_sale from detail_siswa_id to user_id
-- Purpose: Simplify sales by linking directly to users table
-- =========================================================

-- Step 1: Delete all stock transactions related to uniform sales
-- This ensures we don't have orphaned stock records
DELETE FROM public.uniform_stock_txn
WHERE ref_table = 'uniform_sale' AND txn_type = 'sale';

-- Step 2: Delete all sale items
-- (Will cascade delete automatically, but being explicit for clarity)
DELETE FROM public.uniform_sale_item;

-- Step 3: Delete all sales records
DELETE FROM public.uniform_sale;

-- Step 4: Drop the old foreign key constraint
ALTER TABLE public.uniform_sale
DROP CONSTRAINT IF EXISTS uniform_sale_detail_siswa_id_fkey;

-- Step 5: Drop the old index
DROP INDEX IF EXISTS public.idx_uniform_sale_detail_siswa;

-- Step 6: Rename column from detail_siswa_id to user_id
ALTER TABLE public.uniform_sale
RENAME COLUMN detail_siswa_id TO user_id;

-- Step 7: Change column type if needed (detail_siswa_id was integer, keeping as integer for user_id)
-- No type change needed as both are integer

-- Step 8: Add new foreign key constraint to users table
ALTER TABLE public.uniform_sale
ADD CONSTRAINT uniform_sale_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE RESTRICT;

-- Step 9: Create new index for performance
CREATE INDEX idx_uniform_sale_user 
ON public.uniform_sale USING btree (user_id);

-- Step 10: Add comment to document the change
COMMENT ON COLUMN public.uniform_sale.user_id IS 
'Foreign key to users table. Changed from detail_siswa_id to simplify sales tracking directly by user.';

-- =========================================================
-- Verification queries (run these to confirm changes):
-- =========================================================
-- SELECT COUNT(*) FROM uniform_sale; -- Should return 0
-- SELECT COUNT(*) FROM uniform_sale_item; -- Should return 0
-- SELECT COUNT(*) FROM uniform_stock_txn WHERE ref_table = 'uniform_sale'; -- Should return 0
-- 
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'uniform_sale' AND column_name = 'user_id';
-- =========================================================
