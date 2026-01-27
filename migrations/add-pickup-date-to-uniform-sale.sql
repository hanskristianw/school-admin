-- Add pickup_date column to uniform_sale table
-- This tracks when the uniform was picked up by the student/parent

ALTER TABLE public.uniform_sale
ADD COLUMN IF NOT EXISTS pickup_date DATE NULL;

COMMENT ON COLUMN public.uniform_sale.pickup_date IS 'Tanggal seragam diambil oleh siswa/orang tua. NULL = belum diambil';

-- Create index for filtering by pickup status
CREATE INDEX IF NOT EXISTS idx_uniform_sale_pickup_date 
ON public.uniform_sale (pickup_date) 
WHERE pickup_date IS NOT NULL;
