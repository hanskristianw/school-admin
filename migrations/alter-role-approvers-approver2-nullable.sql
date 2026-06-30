-- ============================================================
-- Buat approver2_id di role_approvers menjadi nullable
-- Agar jabatan bisa dikonfigurasi dengan hanya 1 approver
-- ============================================================

ALTER TABLE role_approvers
  ALTER COLUMN approver2_id DROP NOT NULL;

-- Verifikasi
SELECT column_name, is_nullable
FROM information_schema.columns
WHERE table_name = 'role_approvers'
  AND column_name = 'approver2_id';
