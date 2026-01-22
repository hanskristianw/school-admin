-- Migration: Add void/cancel mechanism to uniform_purchase
-- This allows canceling posted orders with proper stock reversal

-- Add voided status columns
ALTER TABLE uniform_purchase 
ADD COLUMN IF NOT EXISTS is_voided BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS voided_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS voided_by TEXT,
ADD COLUMN IF NOT EXISTS void_reason TEXT;

-- Add index for filtering active orders
CREATE INDEX IF NOT EXISTS idx_uniform_purchase_is_voided 
ON uniform_purchase(is_voided);

-- Add comments
COMMENT ON COLUMN uniform_purchase.is_voided IS 'TRUE if this purchase order has been voided/cancelled';
COMMENT ON COLUMN uniform_purchase.voided_at IS 'Timestamp when the order was voided';
COMMENT ON COLUMN uniform_purchase.voided_by IS 'User who voided the order';
COMMENT ON COLUMN uniform_purchase.void_reason IS 'Reason for voiding the order';

-- Update existing queries to exclude voided orders by default
-- Note: Application code should filter with WHERE is_voided = FALSE
