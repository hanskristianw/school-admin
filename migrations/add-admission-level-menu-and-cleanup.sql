-- =====================================================
-- Migration: Clean old test data + Seed admission levels
-- =====================================================

-- 1. Clean old test application data
-- Delete application_discount first (FK dependency)
DELETE FROM application_discount;

-- Delete application_installment if exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'application_installment') THEN
    EXECUTE 'DELETE FROM application_installment';
  END IF;
END $$;

-- Delete all student_applications (old test data)
DELETE FROM student_applications;

-- Reset sequences
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'student_applications_application_id_seq') THEN
    ALTER SEQUENCE student_applications_application_id_seq RESTART WITH 1;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'application_discount_app_discount_id_seq') THEN
    ALTER SEQUENCE application_discount_app_discount_id_seq RESTART WITH 1;
  END IF;
END $$;

-- 3. Seed default admission levels
-- (Only insert if table is empty)
DO $$
DECLARE
  v_pyp_id INTEGER;
  v_myp_id INTEGER;
  v_dp_id INTEGER;
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count FROM admission_level;
  IF v_count > 0 THEN
    RAISE NOTICE 'admission_level already has data, skipping seed';
    RETURN;
  END IF;

  -- Get unit IDs
  SELECT unit_id INTO v_pyp_id FROM unit WHERE unit_name ILIKE '%PYP%' LIMIT 1;
  SELECT unit_id INTO v_myp_id FROM unit WHERE unit_name ILIKE '%MYP%' LIMIT 1;
  SELECT unit_id INTO v_dp_id  FROM unit WHERE unit_name ILIKE '%DP%'  LIMIT 1;

  -- PYP levels
  IF v_pyp_id IS NOT NULL THEN
    INSERT INTO admission_level (unit_id, level_name, level_order, is_active) VALUES
      (v_pyp_id, 'Nursery 1',      1, true),
      (v_pyp_id, 'Nursery 2',      2, true),
      (v_pyp_id, 'Kindergarten 1', 3, true),
      (v_pyp_id, 'Kindergarten 2', 4, true),
      (v_pyp_id, 'Elementary 1',   5, true),
      (v_pyp_id, 'Elementary 2',   6, true),
      (v_pyp_id, 'Elementary 3',   7, true),
      (v_pyp_id, 'Elementary 4',   8, true),
      (v_pyp_id, 'Elementary 5',   9, true),
      (v_pyp_id, 'Elementary 6',  10, true);
  END IF;

  -- MYP levels
  IF v_myp_id IS NOT NULL THEN
    INSERT INTO admission_level (unit_id, level_name, level_order, is_active) VALUES
      (v_myp_id, 'Junior High School', 11, true);
  END IF;

  -- DP levels
  IF v_dp_id IS NOT NULL THEN
    INSERT INTO admission_level (unit_id, level_name, level_order, is_active) VALUES
      (v_dp_id, 'Senior High School', 12, true);
  END IF;

  RAISE NOTICE 'Seeded admission levels';
END $$;
