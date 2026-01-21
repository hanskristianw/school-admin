-- Clean slate: Delete all purchase orders and related data for fresh testing
-- This will help identify where bugs occur

-- 1. Delete all receipt items first (foreign key dependency)
DELETE FROM uniform_purchase_receipt_item;

-- 2. Delete all receipts
DELETE FROM uniform_purchase_receipt;

-- 3. Delete all purchase items
DELETE FROM uniform_purchase_item;

-- 4. Delete all purchase headers
DELETE FROM uniform_purchase;

-- 5. Reset sequences (optional, to start IDs from 1 again)
ALTER SEQUENCE IF EXISTS uniform_purchase_purchase_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS uniform_purchase_item_item_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS uniform_purchase_receipt_receipt_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS uniform_purchase_receipt_item_rec_item_id_seq RESTART WITH 1;

-- Verify all tables are empty
SELECT 'uniform_purchase' as table_name, COUNT(*) as row_count FROM uniform_purchase
UNION ALL
SELECT 'uniform_purchase_item', COUNT(*) FROM uniform_purchase_item
UNION ALL
SELECT 'uniform_purchase_receipt', COUNT(*) FROM uniform_purchase_receipt
UNION ALL
SELECT 'uniform_purchase_receipt_item', COUNT(*) FROM uniform_purchase_receipt_item;

-- Expected: all counts should be 0
