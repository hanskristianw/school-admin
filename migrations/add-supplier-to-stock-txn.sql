-- Migration: Add supplier_id to uniform_stock_txn table
-- Reason: Track which supplier each stock transaction comes from
-- Date: 2026-01-12

-- Step 1: Add supplier_id column (nullable for initial/legacy stock)
ALTER TABLE uniform_stock_txn 
ADD COLUMN IF NOT EXISTS supplier_id INT4;

-- Step 2: Add foreign key constraint to uniform_supplier
ALTER TABLE uniform_stock_txn 
ADD CONSTRAINT uniform_stock_txn_supplier_id_fkey 
FOREIGN KEY (supplier_id) REFERENCES uniform_supplier(supplier_id)
ON DELETE SET NULL;

-- Step 3: Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_uniform_stock_txn_supplier_id 
ON uniform_stock_txn(supplier_id);

-- Step 4: Update existing purchase transactions to have supplier_id
-- Get supplier_id from uniform_purchase table via ref_id
UPDATE uniform_stock_txn txn
SET supplier_id = up.supplier_id
FROM uniform_purchase_item upi
JOIN uniform_purchase up ON upi.purchase_id = up.purchase_id
WHERE txn.txn_type = 'purchase' 
  AND txn.ref_table = 'uniform_purchase_receipt'
  AND txn.ref_id = upi.item_id
  AND txn.supplier_id IS NULL;

COMMENT ON COLUMN uniform_stock_txn.supplier_id IS 'Supplier source for this stock transaction. NULL for initial/legacy stock.';
