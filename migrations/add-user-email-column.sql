-- ============================================
-- ADD user_email COLUMN TO users TABLE
-- ============================================
-- This migration adds an optional email field that can be updated from
-- the /profile page. The column allows NULL values so existing rows
-- remain valid, and we trim blank values after insertion when saving.
-- ============================================

-- ============================================
-- STEP 1: ADD COLUMN
-- ============================================

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS user_email TEXT;

COMMENT ON COLUMN users.user_email IS 'Optional email address for the user profile page';

-- ============================================
-- STEP 2: (OPTIONAL) CLEAN EXISTING DATA
-- ============================================
-- Uncomment if you want to convert empty strings to NULL for consistency.
-- UPDATE users SET user_email = NULL WHERE user_email = '';

-- ============================================
-- STEP 3: VERIFY SCHEMA
-- ============================================

SELECT 
  '✅ Column Added' AS status,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'users'
  AND column_name = 'user_email';

-- ============================================
-- SUMMARY
-- ============================================

SELECT 
  '🎉 MIGRATION COMPLETE!' AS message,
  json_build_object(
    'user_email_column_added', EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public'
        AND table_name = 'users'
        AND column_name = 'user_email'
    ),
    'ready_to_use', true
  ) AS result;
