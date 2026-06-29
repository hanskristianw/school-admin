-- ============================================================
-- MIGRATION: unit_approvers + attendance_excuses
-- Sistem surat keterangan keterlambatan dengan 2-level approval
-- Jalankan di: Supabase SQL Editor
-- ============================================================

-- ── 1. unit_approvers ─────────────────────────────────────────────────────────
-- Konfigurasi approver 1 dan 2 per unit
CREATE TABLE IF NOT EXISTS unit_approvers (
  id              SERIAL PRIMARY KEY,
  unit_id         INTEGER NOT NULL REFERENCES unit(unit_id) ON DELETE CASCADE,
  approver1_id    INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  approver2_id    INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (unit_id)
);

-- RLS unit_approvers
ALTER TABLE unit_approvers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "unit_approvers_select" ON unit_approvers
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "unit_approvers_all_service" ON unit_approvers
  FOR ALL TO service_role USING (true);


-- ── 2. attendance_excuses ──────────────────────────────────────────────────────
-- Form surat keterangan yang disubmit karyawan
CREATE TABLE IF NOT EXISTS attendance_excuses (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id           INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  excuse_type       TEXT NOT NULL DEFAULT 'late'
                    CHECK (excuse_type IN ('late', 'leave_early', 'absent')),
  attendance_date   DATE NOT NULL,
  late_minutes      INTEGER,          -- menit terlambat (untuk tipe late)
  category          TEXT NOT NULL,    -- kategori alasan (hardcode di frontend)
  other_reason      TEXT,             -- diisi jika category = 'other'

  -- Snapshot approver saat submit
  approver1_id      INTEGER REFERENCES users(user_id),
  approver2_id      INTEGER REFERENCES users(user_id),

  -- Status alur: pending → approved_1 → approved | rejected
  status            TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'approved_1', 'approved', 'rejected')),

  -- Tindakan Approver 1
  approver1_action  TEXT CHECK (approver1_action IN ('approved', 'rejected')),
  approver1_note    TEXT,
  approver1_at      TIMESTAMPTZ,

  -- Tindakan Approver 2
  approver2_action  TEXT CHECK (approver2_action IN ('approved', 'rejected')),
  approver2_note    TEXT,
  approver2_at      TIMESTAMPTZ,

  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),

  -- Satu karyawan hanya bisa submit satu excuse per tanggal per tipe
  UNIQUE (user_id, excuse_type, attendance_date)
);

-- Index untuk lookup cepat
CREATE INDEX IF NOT EXISTS idx_excuses_user_date ON attendance_excuses (user_id, attendance_date);
CREATE INDEX IF NOT EXISTS idx_excuses_status    ON attendance_excuses (status);
CREATE INDEX IF NOT EXISTS idx_excuses_approver1 ON attendance_excuses (approver1_id, status);
CREATE INDEX IF NOT EXISTS idx_excuses_approver2 ON attendance_excuses (approver2_id, status);

-- RLS attendance_excuses
ALTER TABLE attendance_excuses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "excuses_select" ON attendance_excuses
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "excuses_all_service" ON attendance_excuses
  FOR ALL TO service_role USING (true);


-- ── 3. Auto-update updated_at ─────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_unit_approvers_updated_at
  BEFORE UPDATE ON unit_approvers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_attendance_excuses_updated_at
  BEFORE UPDATE ON attendance_excuses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


SELECT 'Migration attendance_excuses dan unit_approvers berhasil' AS status;
