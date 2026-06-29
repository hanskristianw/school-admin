-- ============================================================
-- MIGRATION: Ganti unit_approvers → role_approvers
-- Approval surat keterangan kini dikonfigurasi per jabatan (role),
-- bukan per unit
-- Jalankan di: Supabase SQL Editor
-- ============================================================

-- ── 1. Hapus tabel lama (jika sudah ada) ─────────────────────────────────────
DROP TABLE IF EXISTS unit_approvers CASCADE;

-- ── 2. Buat tabel role_approvers ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS role_approvers (
  id            SERIAL PRIMARY KEY,
  role_id       INTEGER NOT NULL REFERENCES role(role_id) ON DELETE CASCADE,
  approver1_id  INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  approver2_id  INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (role_id)
);

-- ── 3. RLS ───────────────────────────────────────────────────────────────────
ALTER TABLE role_approvers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "role_approvers_select" ON role_approvers
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "role_approvers_all_service" ON role_approvers
  FOR ALL TO service_role USING (true);

-- ── 4. Auto-update updated_at ─────────────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_role_approvers_updated_at ON role_approvers;
CREATE TRIGGER trg_role_approvers_updated_at
  BEFORE UPDATE ON role_approvers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

SELECT 'Migration role_approvers berhasil' AS status;
