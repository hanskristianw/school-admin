-- ============================================================
-- CLEAN SLATE: Hapus semua transaksi stok, PO, dan penjualan
-- Data yang DIHAPUS : uniform_stock_txn, uniform_purchase_*,
--                     uniform_sale_*, PO sequence
-- Data yang DIPERTAHANKAN: uniform, uniform_size, uniform_supplier,
--                           uniform_variant (harga/hpp), uniform_po_settings prefix
-- ============================================================

-- 1. Hapus detail penerimaan barang
DELETE FROM uniform_purchase_receipt_item;

-- 2. Hapus header penerimaan barang
DELETE FROM uniform_purchase_receipt;

-- 3. Hapus item PO / purchase order
DELETE FROM uniform_purchase_item;

-- 4. Hapus header PO / purchase order
DELETE FROM uniform_purchase;

-- 5. Hapus item penjualan
DELETE FROM uniform_sale_item;

-- 6. Hapus header penjualan
DELETE FROM uniform_sale;

-- 7. Hapus semua transaksi stok (init, purchase, sale, adjust, dll)
DELETE FROM uniform_stock_txn;

-- 8. Reset PO sequence ke 0 (prefix tetap)
UPDATE uniform_po_settings
SET last_sequence  = 0,
    last_reset_date = CURRENT_DATE,
    updated_at      = NOW()
WHERE id = 1;
