-- Add void mechanism to uniform_sale table
-- This allows sales transactions to be voided with audit trail
-- Stock will be automatically reversed when voiding

-- Add void columns to uniform_sale
ALTER TABLE uniform_sale 
ADD COLUMN is_voided boolean NOT NULL DEFAULT false,
ADD COLUMN voided_at timestamp with time zone NULL,
ADD COLUMN voided_by text NULL,
ADD COLUMN void_reason text NULL;

-- Create index for void lookups
CREATE INDEX IF NOT EXISTS idx_uniform_sale_is_voided 
ON uniform_sale(is_voided);

-- Add comment for documentation
COMMENT ON COLUMN uniform_sale.is_voided IS 'Flag indicating if this sale has been voided/cancelled';
COMMENT ON COLUMN uniform_sale.voided_at IS 'Timestamp when the sale was voided';
COMMENT ON COLUMN uniform_sale.voided_by IS 'User who voided the sale';
COMMENT ON COLUMN uniform_sale.void_reason IS 'Reason for voiding the sale (required)';
