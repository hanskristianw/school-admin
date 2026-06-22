-- Migration: Add 'free' Payment Method Option
-- Created: 2026-06-22
-- Purpose: Add 'free' (Promo Free Seragam) as a valid payment method for uniform_sale

-- Drop old constraint
ALTER TABLE uniform_sale 
DROP CONSTRAINT IF EXISTS uniform_sale_payment_method_check;

-- Add new constraint including 'free'
ALTER TABLE uniform_sale 
ADD CONSTRAINT uniform_sale_payment_method_check 
CHECK (payment_method = ANY (ARRAY['transfer'::text, 'cash'::text, 'credit_card'::text, 'debit_card'::text, 'free'::text]));

-- Update comment
COMMENT ON COLUMN uniform_sale.payment_method IS 'Payment method: transfer, cash, credit_card, debit_card, free';
