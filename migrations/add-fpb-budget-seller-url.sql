-- ============================================================
-- MIGRATION: FPB Budget Fields + Seller URL + Budget Roles
-- Jalankan di: Supabase SQL Editor
-- ============================================================

-- ── 1. Tambah kolom Budget ke tabel fpb ───────────────────────────────────────
ALTER TABLE fpb
  ADD COLUMN IF NOT EXISTS budget           NUMERIC(15,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS remaining_budget NUMERIC(15,2) DEFAULT NULL;

-- ── 2. Tambah kolom seller_url ke fpb_items ───────────────────────────────────
ALTER TABLE fpb_items
  ADD COLUMN IF NOT EXISTS seller_url TEXT DEFAULT NULL;

-- ── 3. Buat tabel fpb_budget_roles ────────────────────────────────────────────
-- Menyimpan role mana yang bisa mengisi/mengubah kolom Budget & Remaining Budget
CREATE TABLE IF NOT EXISTS fpb_budget_roles (
  role_id INTEGER PRIMARY KEY REFERENCES role(role_id) ON DELETE CASCADE
);

-- Nonaktifkan RLS (konsisten dengan sistem custom auth)
ALTER TABLE fpb_budget_roles DISABLE ROW LEVEL SECURITY;

-- ── 4. Verifikasi ─────────────────────────────────────────────────────────────
SELECT 'fpb.budget column exists' AS status
WHERE EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fpb' AND column_name = 'budget');

SELECT 'fpb.remaining_budget column exists' AS status
WHERE EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fpb' AND column_name = 'remaining_budget');

SELECT 'fpb_items.seller_url column exists' AS status
WHERE EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fpb_items' AND column_name = 'seller_url');

SELECT 'fpb_budget_roles table created' AS status
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'fpb_budget_roles');

SELECT 'Migration add-fpb-budget-seller-url selesai' AS status;
