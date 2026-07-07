-- ============================================================
-- MIGRATION: Tambah kolom approver_order ke fpb_approvals
-- Untuk sequential approval: approver 2 tidak melihat FPB
-- sebelum approver 1 selesai approve
-- Jalankan di: Supabase SQL Editor
-- ============================================================

ALTER TABLE fpb_approvals
  ADD COLUMN IF NOT EXISTS approver_order SMALLINT NOT NULL DEFAULT 1;

-- Update existing rows: assign order based on approval_id within same fpb+step
-- (approver yang insert lebih awal = order lebih kecil)
WITH ranked AS (
  SELECT approval_id,
         ROW_NUMBER() OVER (PARTITION BY fpb_id, step_order ORDER BY approval_id) AS rn
  FROM fpb_approvals
)
UPDATE fpb_approvals
SET approver_order = ranked.rn
FROM ranked
WHERE fpb_approvals.approval_id = ranked.approval_id;

SELECT 'approver_order added and backfilled' AS status;
