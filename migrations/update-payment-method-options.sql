-- Migration: Update Payment Method Options
-- Created: 2026-01-30
-- Purpose: Add multiple payment method options (transfer, cash, credit_card, debit_card)

-- Drop old constraint
ALTER TABLE uniform_sale 
DROP CONSTRAINT IF EXISTS uniform_sale_payment_method_check;

-- Add new constraint with multiple options
ALTER TABLE uniform_sale 
ADD CONSTRAINT uniform_sale_payment_method_check 
CHECK (payment_method = ANY (ARRAY['transfer'::text, 'cash'::text, 'credit_card'::text, 'debit_card'::text]));

-- Add comment
COMMENT ON COLUMN uniform_sale.payment_method IS 'Payment method: transfer, cash, credit_card, debit_card';
