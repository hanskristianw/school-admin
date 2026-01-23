-- Add 'void' transaction type to uniform_stock_txn
-- This allows tracking void history without affecting stock calculations

-- Drop the old constraint
ALTER TABLE uniform_stock_txn 
DROP CONSTRAINT IF EXISTS uniform_stock_txn_txn_type_check;

-- Add new constraint with 'void' type
ALTER TABLE uniform_stock_txn 
ADD CONSTRAINT uniform_stock_txn_txn_type_check 
CHECK (txn_type IN ('init','adjust','purchase','sale','return_in','return_out','void'));

-- Note: 'void' transactions will have qty_delta = 0 (for history tracking only, no stock impact)
