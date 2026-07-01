-- ============================================================
-- CREATE TABLE: user_position_history
-- Menyimpan riwayat posisi/jabatan tiap karyawan per periode
-- ============================================================

CREATE TABLE IF NOT EXISTS user_position_history (
  id             SERIAL PRIMARY KEY,
  user_id        INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  position_title TEXT    NOT NULL,
  start_date     DATE    NOT NULL,
  end_date       DATE    DEFAULT NULL,  -- NULL = posisi masih aktif
  notes          TEXT    DEFAULT NULL,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_uph_user_id ON user_position_history(user_id);
CREATE INDEX IF NOT EXISTS idx_uph_dates   ON user_position_history(user_id, start_date, end_date);

-- Verifikasi
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'user_position_history'
ORDER BY ordinal_position;
