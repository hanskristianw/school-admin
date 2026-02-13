-- Allow fee_discount.year_id to be NULL (NULL = applies to all academic years)
-- Similar to how unit_id 'all' works but at DB level

-- 1. Drop the existing unique constraint that includes year_id as NOT NULL
ALTER TABLE public.fee_discount DROP CONSTRAINT IF EXISTS uq_discount_code;

-- 2. Make year_id nullable
ALTER TABLE public.fee_discount ALTER COLUMN year_id DROP NOT NULL;

-- 3. Re-create unique constraint that handles NULL year_id
--    Use a partial unique index: one for specific year, one for NULL year
--    Include level_id (via COALESCE) so same discount_code can exist for different levels
DROP INDEX IF EXISTS uq_discount_code_with_year;
CREATE UNIQUE INDEX IF NOT EXISTS uq_discount_code_with_year
  ON public.fee_discount(unit_id, COALESCE(level_id, -1), year_id, discount_code)
  WHERE year_id IS NOT NULL;

DROP INDEX IF EXISTS uq_discount_code_all_years;
CREATE UNIQUE INDEX IF NOT EXISTS uq_discount_code_all_years
  ON public.fee_discount(unit_id, COALESCE(level_id, -1), discount_code)
  WHERE year_id IS NULL;

-- 4. Recreate the index
DROP INDEX IF EXISTS idx_discount_unit_year;
CREATE INDEX IF NOT EXISTS idx_discount_unit_year ON public.fee_discount(unit_id, year_id);
