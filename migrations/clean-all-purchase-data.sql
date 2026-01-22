-- Clean All Purchase Order Data
-- Use this to start fresh with purchase orders and stock transactions

-- Delete receipt items first (if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'uniform_purchase_receipt_item') THEN
        DELETE FROM uniform_purchase_receipt_item;
    END IF;
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'uniform_receipt') THEN
        DELETE FROM uniform_receipt;
    END IF;
END $$;

-- Delete purchase items
DELETE FROM uniform_purchase_item;

-- Delete purchases
DELETE FROM uniform_purchase;

-- Delete stock transactions related to purchases only (keep initial stock)
-- Keep: txn_type = 'init' (stok awal)
-- Delete: txn_type = 'purchase', 'adjust' (from void), etc.
DELETE FROM uniform_stock_txn 
WHERE txn_type != 'init';

-- Reset sequences to start from 1
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_class WHERE relname = 'uniform_purchase_purchase_id_seq') THEN
        ALTER SEQUENCE uniform_purchase_purchase_id_seq RESTART WITH 1;
    END IF;
    IF EXISTS (SELECT FROM pg_class WHERE relname = 'uniform_purchase_item_purchase_item_id_seq') THEN
        ALTER SEQUENCE uniform_purchase_item_purchase_item_id_seq RESTART WITH 1;
    END IF;
    IF EXISTS (SELECT FROM pg_class WHERE relname = 'uniform_receipt_receipt_id_seq') THEN
        ALTER SEQUENCE uniform_receipt_receipt_id_seq RESTART WITH 1;
    END IF;
END $$;
-- Don't reset uniform_stock_txn_txn_id_seq to preserve initial stock sequence

-- Verify all tables are empty
SELECT 'uniform_purchase' as table_name, COUNT(*) as row_count FROM uniform_purchase
UNION ALL
SELECT 'uniform_purchase_item', COUNT(*) FROM uniform_purchase_item
UNION ALL
SELECT 'uniform_stock_txn (non-init)', COUNT(*) FROM uniform_stock_txn WHERE txn_type != 'init';
