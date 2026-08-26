-- Migration: Document & ensure procurement columns on public.fpb
-- Adds procurement_status, procurement_by, procurement_at, procurement_note if not exists

ALTER TABLE IF EXISTS public.fpb 
  ADD COLUMN IF NOT EXISTS procurement_status VARCHAR(50) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS procurement_by INTEGER REFERENCES public.users(user_id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS procurement_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS procurement_note TEXT DEFAULT NULL;

-- Optional comment explaining procurement_status values
COMMENT ON COLUMN public.fpb.procurement_status IS 'Status of procurement fulfillment: ordered (funds disbursed/purchased), cancelled (tidak jadi dipesan), or NULL (pending action)';
