-- ============================================================
-- MIGRATION: Tambah qty_rejected & reject_reason ke uniform_purchase_receipt_item
-- NON-DESTRUCTIVE: DEFAULT 0 / NULL — data existing tidak terpengaruh
-- Jalankan di: Supabase SQL Editor
-- ============================================================

-- 1) Tambah kolom ke receipt item
ALTER TABLE uniform_purchase_receipt_item
  ADD COLUMN IF NOT EXISTS qty_rejected INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reject_reason TEXT;

-- 2) Tambah constraint: qty_rejected tidak boleh negatif
ALTER TABLE uniform_purchase_receipt_item
  DROP CONSTRAINT IF EXISTS chk_qty_rejected_non_negative;

ALTER TABLE uniform_purchase_receipt_item
  ADD CONSTRAINT chk_qty_rejected_non_negative CHECK (qty_rejected >= 0);

-- 3) Update view v_uniform_purchase_item_progress agar hitung qty_rejected
--    qty_remaining = qty_ordered - SUM(qty_received) - SUM(qty_rejected)
DROP VIEW IF EXISTS v_uniform_purchase_item_progress;

CREATE OR REPLACE VIEW v_uniform_purchase_item_progress AS
SELECT
  pi.purchase_id,
  pi.item_id        AS purchase_item_id,
  pi.uniform_id,
  pi.size_id,
  pi.qty            AS qty_ordered,
  COALESCE(SUM(ri.qty_received),  0)::INTEGER AS qty_received,
  COALESCE(SUM(ri.qty_rejected), 0)::INTEGER  AS qty_rejected,
  GREATEST(
    0,
    pi.qty
    - COALESCE(SUM(ri.qty_received), 0)
    - COALESCE(SUM(ri.qty_rejected), 0)
  )::INTEGER AS qty_remaining
FROM uniform_purchase_item pi
LEFT JOIN uniform_purchase_receipt pr ON pr.purchase_id = pi.purchase_id
LEFT JOIN uniform_purchase_receipt_item ri
  ON ri.receipt_id = pr.receipt_id
  AND ri.purchase_item_id = pi.item_id
GROUP BY pi.purchase_id, pi.item_id, pi.uniform_id, pi.size_id, pi.qty;

-- 4) Verifikasi
SELECT
  column_name,
  data_type,
  column_default
FROM information_schema.columns
WHERE table_name = 'uniform_purchase_receipt_item'
  AND column_name IN ('qty_rejected', 'reject_reason');

SELECT 'Migration add-reject-to-receipt-item selesai' AS status;
