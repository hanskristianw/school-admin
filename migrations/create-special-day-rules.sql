-- ============================================================
-- MIGRATION: special_day_rules
-- Aturan hari khusus: Sabtu wajib masuk, jam pulang lebih awal, dll.
-- Jalankan di: Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS special_day_rules (
  id              SERIAL PRIMARY KEY,
  tanggal         DATE        NOT NULL,
  scope_type      TEXT        NOT NULL DEFAULT 'all'
                  CHECK (scope_type IN ('all', 'role', 'user')),
  role_id         INTEGER     REFERENCES role(role_id) ON DELETE CASCADE,
  user_id         INTEGER     REFERENCES users(user_id) ON DELETE CASCADE,
  is_work_day     BOOLEAN     NOT NULL DEFAULT TRUE,
  custom_check_in TIME,
  custom_check_out TIME,
  keterangan      TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),

  -- Pastikan konsistensi scope
  CONSTRAINT chk_scope CHECK (
    (scope_type = 'all'  AND role_id IS NULL AND user_id IS NULL) OR
    (scope_type = 'role' AND role_id IS NOT NULL AND user_id IS NULL) OR
    (scope_type = 'user' AND user_id IS NOT NULL AND role_id IS NULL)
  )
);

-- Index untuk lookup cepat saat generate report
CREATE INDEX IF NOT EXISTS idx_special_day_tanggal ON special_day_rules (tanggal);

-- RLS: baca untuk authenticated, tulis untuk admin
ALTER TABLE special_day_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "special_day_rules_select" ON special_day_rules
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "special_day_rules_all" ON special_day_rules
  FOR ALL TO service_role USING (true);

-- Konfirmasi
SELECT 'Tabel special_day_rules berhasil dibuat' AS status;
