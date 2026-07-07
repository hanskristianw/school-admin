-- ============================================================
-- MIGRATION: Fix constraint qty_received agar boleh 0 jika ada qty_rejected
-- Jalankan di: Supabase SQL Editor
-- ============================================================

-- Hapus semua constraint lama yang mungkin ada di qty_received
ALTER TABLE uniform_purchase_receipt_item
  DROP CONSTRAINT IF EXISTS uniform_purchase_receipt_item_qty_received_check;

ALTER TABLE uniform_purchase_receipt_item
  DROP CONSTRAINT IF EXISTS chk_qty_received_positive;

-- Tambah constraint baru: qty_received >= 0 (bukan > 0)
-- Dan setidaknya salah satu (received atau rejected) > 0
ALTER TABLE uniform_purchase_receipt_item
  ADD CONSTRAINT chk_receipt_item_qty CHECK (
    qty_received >= 0
    AND qty_rejected >= 0
    AND (qty_received + qty_rejected) > 0
  );

SELECT 'Constraint updated successfully' AS status;
