-- ============================================================
-- MIGRATION: Redesign FPB Approval - Role-Based Approvers
-- Jalankan di: Supabase SQL Editor
-- ============================================================

-- ── 1. Hapus semua data FPB lama (masih tahap coba-coba) ───────────────────────
TRUNCATE TABLE fpb_approvals CASCADE;
TRUNCATE TABLE fpb_revisions CASCADE;
TRUNCATE TABLE fpb_items CASCADE;
TRUNCATE TABLE fpb CASCADE;
TRUNCATE TABLE fpb_approval_steps CASCADE;

-- ── 2. Buat tabel fpb_role_approvers ──────────────────────────────────────────
-- Menyimpan siapa saja (1-3 user) yang bisa mewakili sebuah role sebagai approver FPB
CREATE TABLE IF NOT EXISTS fpb_role_approvers (
  id           SERIAL PRIMARY KEY,
  role_id      INTEGER NOT NULL REFERENCES role(role_id) ON DELETE CASCADE,
  approver1_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
  approver2_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
  approver3_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (role_id)
);

-- RLS
ALTER TABLE fpb_role_approvers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fpb_role_approvers_select" ON fpb_role_approvers
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "fpb_role_approvers_all_service" ON fpb_role_approvers
  FOR ALL TO service_role USING (true);

-- Auto-update updated_at
DROP TRIGGER IF EXISTS trg_fpb_role_approvers_updated_at ON fpb_role_approvers;
CREATE TRIGGER trg_fpb_role_approvers_updated_at
  BEFORE UPDATE ON fpb_role_approvers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── 3. Modifikasi fpb_approval_steps ──────────────────────────────────────────
-- Ganti approver_user_id (FK ke users) → approver_role_id (FK ke role)
ALTER TABLE fpb_approval_steps
  DROP COLUMN IF EXISTS approver_user_id,
  ADD COLUMN IF NOT EXISTS approver_role_id INTEGER REFERENCES role(role_id) ON DELETE SET NULL;

-- ── 4. Modifikasi fpb_approvals ───────────────────────────────────────────────
-- Tambah kolom approver_role_id untuk tracking dari role mana approver ini berasal
ALTER TABLE fpb_approvals
  ADD COLUMN IF NOT EXISTS approver_role_id INTEGER REFERENCES role(role_id) ON DELETE SET NULL;

-- ── 5. Verifikasi ─────────────────────────────────────────────────────────────
SELECT 'fpb_role_approvers created' AS status
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'fpb_role_approvers');

SELECT 'fpb_approval_steps has approver_role_id' AS status
WHERE EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fpb_approval_steps' AND column_name = 'approver_role_id');

SELECT 'fpb_approvals has approver_role_id' AS status
WHERE EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fpb_approvals' AND column_name = 'approver_role_id');

SELECT 'Migration redesign-fpb-role-approvers selesai' AS status;
