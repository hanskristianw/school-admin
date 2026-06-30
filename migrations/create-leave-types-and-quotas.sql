-- ============================================================
-- Master tabel tipe cuti/ijin
-- Menggantikan hardcoded CATEGORIES_ABSENT di frontend
-- ============================================================

CREATE TABLE IF NOT EXISTS leave_types (
  id            SERIAL PRIMARY KEY,
  code          VARCHAR(50) UNIQUE NOT NULL,
  name_id       TEXT NOT NULL,
  name_en       TEXT NOT NULL,
  issue_types   TEXT[] NOT NULL DEFAULT '{absent}',
    -- 'late','leave_early','absent','no_checkin','no_checkout'
  max_days      INTEGER DEFAULT NULL,  -- NULL = unlimited
  requires_upload BOOLEAN DEFAULT FALSE,
  upload_label  TEXT DEFAULT NULL,
  deduct_quota  BOOLEAN DEFAULT FALSE,  -- apakah memotong jatah cuti
  is_paid       BOOLEAN DEFAULT TRUE,   -- cuti berbayar atau tidak
  sort_order    INTEGER DEFAULT 99,
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Seeding categories
INSERT INTO leave_types (code, name_id, name_en, issue_types, max_days, requires_upload, upload_label, deduct_quota, is_paid, sort_order) VALUES
-- Terlambat / Pulang Awal
('woke_up_late',    'Bangun Kesiangan',            'Woke Up Late',                                  '{late,leave_early}',    NULL, FALSE, NULL, FALSE, TRUE, 10),
('traffic_jam',     'Macet / Masalah Transportasi','Traffic Jam / Transportation Issue',            '{late,leave_early}',    NULL, FALSE, NULL, FALSE, TRUE, 11),
('sick',            'Sakit / Tidak Enak Badan',    'Sick / Unwell',                                 '{late,leave_early}',    NULL, FALSE, NULL, FALSE, TRUE, 12),
('family_personal', 'Urusan Keluarga / Pribadi',   'Family / Personal Matter',                      '{late,leave_early}',    NULL, FALSE, NULL, FALSE, TRUE, 13),
-- Absent - Sakit
('sick_no_letter',  'Sakit Tanpa Surat (Tanpa Gaji)', 'Sick without letter (unpaid)',               '{absent}',              NULL, FALSE, NULL, FALSE, FALSE, 20),
('sick_with_letter','Sakit dengan Surat Dokter',   'Sick with letter & diagnosis from doctor',      '{absent}',              NULL, TRUE,  'Upload surat dokter (wajib)', FALSE, TRUE, 21),
-- Absent - Cuti keluarga
('marriage_employee','Cuti Pernikahan Karyawan',   'Employee''s marriage leave',                    '{absent}',              3,    TRUE,  'Upload undangan pernikahan', TRUE, TRUE, 30),
('marriage_child',  'Cuti Pernikahan Anak',        'Employee''s child(ren) marriage',               '{absent}',              2,    TRUE,  'Upload undangan pernikahan anak', TRUE, TRUE, 31),
('bereavement_core','Cuti Duka - Keluarga Inti',   'Bereavement - father/mother/spouse/child/parent-in-law (max 2 days)', '{absent}', 2, FALSE, NULL, TRUE, TRUE, 32),
('bereavement_sibling','Cuti Duka - Saudara Kandung Serumah', 'Bereavement - sibling by blood, same house (max 1 day)', '{absent}', 1, FALSE, NULL, TRUE, TRUE, 33),
('childbirth',      'Istri Melahirkan/Keguguran', 'Wife gives birth or miscarriage',                '{absent}',              2,    FALSE, NULL, TRUE, TRUE, 34),
('circumcision_child','Khitanan Anak',             'Circumcise employee''s child',                  '{absent}',              2,    FALSE, NULL, TRUE, TRUE, 35),
('baptism_child',   'Baptis Anak',                 'Baptize employee''s child',                     '{absent}',              2,    FALSE, NULL, TRUE, TRUE, 36),
-- Absent - Tugas
('ib_trainer',      'Tugas Resmi IB Trainer/Examiner', 'Official IB Trainer / Examiner',           '{absent}',              NULL, TRUE,  'Upload IB assignment letter', FALSE, TRUE, 40),
('school_duty',     'Tugas Sekolah (Diklat/Workshop)', 'School Duty - Training / Workshop',         '{absent}',              NULL, TRUE,  'Upload surat tugas / undangan', FALSE, TRUE, 41),
-- Absent - Cuti
('annual_leave',    'Cuti Tahunan (12 hari)',       'Annual Leave (12 days)',                        '{absent}',              NULL, FALSE, NULL, TRUE, TRUE, 50),
('unpaid_leave',    'Cuti Tanpa Gaji',              'Unpaid Personal Leave',                         '{absent}',              NULL, FALSE, NULL, FALSE, FALSE, 51),
-- No scan
('forgot_scan',     'Lupa Absen',                   'Forgot to check in/out',                        '{no_checkin,no_checkout}', NULL, FALSE, NULL, FALSE, TRUE, 60),
('scanned_not_recorded','Sudah Scan Tapi Tidak Terekam', 'Already scanned but not recorded',       '{no_checkin,no_checkout}', NULL, FALSE, NULL, FALSE, TRUE, 61),
-- Common
('other',           'Lainnya',                      'Other',                                         '{late,leave_early,absent,no_checkin,no_checkout}', NULL, FALSE, NULL, FALSE, TRUE, 99)
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- Tabel jatah cuti per karyawan per tahun
-- ============================================================

CREATE TABLE IF NOT EXISTS leave_quotas (
  id              SERIAL PRIMARY KEY,
  user_id         INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  leave_type_code VARCHAR(50) NOT NULL REFERENCES leave_types(code),
  year            INTEGER NOT NULL,
  total_days      INTEGER NOT NULL DEFAULT 0,
  used_days       INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, leave_type_code, year)
);

-- Index untuk performa
CREATE INDEX IF NOT EXISTS idx_leave_quotas_user_year ON leave_quotas(user_id, year);

SELECT 'Migration leave_types dan leave_quotas berhasil' AS status;
