-- Migration: Add start_date and end_date to year table
-- Ensures each academic year has a date range, no overlaps allowed

-- Add columns
ALTER TABLE public.year ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE public.year ADD COLUMN IF NOT EXISTS end_date DATE;

-- Add check constraint: start_date must be before end_date
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_year_date_range'
  ) THEN
    ALTER TABLE public.year ADD CONSTRAINT chk_year_date_range CHECK (start_date < end_date);
  END IF;
END $$;

-- Create a function to check for overlapping year date ranges
CREATE OR REPLACE FUNCTION check_year_date_overlap()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.year
    WHERE year_id <> NEW.year_id
      AND NEW.start_date < end_date
      AND NEW.end_date > start_date
      AND start_date IS NOT NULL
      AND end_date IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Tanggal tahun ajaran tumpang tindih dengan tahun ajaran lain';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to enforce no overlap on insert/update
DROP TRIGGER IF EXISTS trg_year_no_overlap ON public.year;
CREATE TRIGGER trg_year_no_overlap
  BEFORE INSERT OR UPDATE ON public.year
  FOR EACH ROW
  WHEN (NEW.start_date IS NOT NULL AND NEW.end_date IS NOT NULL)
  EXECUTE FUNCTION check_year_date_overlap();
