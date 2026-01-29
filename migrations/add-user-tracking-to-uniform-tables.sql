-- Migration: Add user tracking columns to uniform tables
-- Created: 2026-01-29
-- Purpose: Track which user created/processed each transaction

-- =====================================================
-- 1. uniform_purchase: Track who created the PO
-- =====================================================
ALTER TABLE uniform_purchase 
ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(user_id) ON DELETE SET NULL;

COMMENT ON COLUMN uniform_purchase.created_by IS 'User yang membuat Purchase Order';

CREATE INDEX IF NOT EXISTS idx_uniform_purchase_created_by 
ON uniform_purchase(created_by);

-- =====================================================
-- 2. uniform_purchase_receipt: Track who received goods
-- =====================================================
ALTER TABLE uniform_purchase_receipt 
ADD COLUMN IF NOT EXISTS received_by INTEGER REFERENCES users(user_id) ON DELETE SET NULL;

COMMENT ON COLUMN uniform_purchase_receipt.received_by IS 'User yang menerima barang';

CREATE INDEX IF NOT EXISTS idx_uniform_purchase_receipt_received_by 
ON uniform_purchase_receipt(received_by);

-- =====================================================
-- 3. uniform_sale: Track who processed the sale
-- =====================================================
-- Note: user_id yang sudah ada = pembeli (parent/siswa)
-- processed_by = staff yang memproses transaksi
ALTER TABLE uniform_sale 
ADD COLUMN IF NOT EXISTS processed_by INTEGER REFERENCES users(user_id) ON DELETE SET NULL;

COMMENT ON COLUMN uniform_sale.user_id IS 'User pembeli (parent/siswa)';
COMMENT ON COLUMN uniform_sale.processed_by IS 'Staff yang memproses penjualan';

CREATE INDEX IF NOT EXISTS idx_uniform_sale_processed_by 
ON uniform_sale(processed_by);

-- =====================================================
-- 4. uniform_stock_txn: Track who created stock transactions
-- =====================================================
ALTER TABLE uniform_stock_txn 
ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(user_id) ON DELETE SET NULL;

COMMENT ON COLUMN uniform_stock_txn.created_by IS 'User yang melakukan transaksi stock (untuk manual adjustment)';

CREATE INDEX IF NOT EXISTS idx_uniform_stock_txn_created_by 
ON uniform_stock_txn(created_by);

-- =====================================================
-- Verification Query (optional)
-- =====================================================
-- Run this to verify the columns were added:
/*
SELECT 
  'uniform_purchase' as table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'uniform_purchase' AND column_name = 'created_by'

UNION ALL

SELECT 
  'uniform_purchase_receipt',
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'uniform_purchase_receipt' AND column_name = 'received_by'

UNION ALL

SELECT 
  'uniform_sale',
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'uniform_sale' AND column_name = 'processed_by'

UNION ALL

SELECT 
  'uniform_stock_txn',
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'uniform_stock_txn' AND column_name = 'created_by';
*/
