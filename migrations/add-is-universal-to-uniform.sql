-- Add is_universal flag to uniform table
-- This allows items to be shared across all units (e.g., white shirt same for all grades)
-- vs unit-specific items (e.g., PE shirt with different colors per unit)

-- Add the column
ALTER TABLE public.uniform 
ADD COLUMN is_universal BOOLEAN NOT NULL DEFAULT FALSE;

-- Add comment
COMMENT ON COLUMN public.uniform.is_universal IS 
'TRUE = item can be sold to any unit (shared stock pool), FALSE = unit-specific item';

-- For universal items, unit_id should be set to NULL
-- For unit-specific items, unit_id references the specific unit

-- Index for filtering
CREATE INDEX idx_uniform_is_universal ON public.uniform(is_universal) WHERE is_universal = TRUE;

-- Note: Existing data will have is_universal = FALSE (unit-specific)
-- Admin can manually mark items as universal via UI
