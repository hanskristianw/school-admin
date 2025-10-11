-- ============================================
-- ADD WEEKEND ATTENDANCE SECRETS
-- ============================================
-- This script adds Saturday and Sunday secrets
-- to the attendance system
-- ============================================

-- Check current secrets
SELECT 
  '📋 Current Secrets' as status,
  key,
  CASE 
    WHEN value IS NOT NULL AND value != '' THEN '✅ SET (' || LENGTH(value) || ' chars)'
    ELSE '❌ MISSING'
  END as status
FROM settings
WHERE key LIKE 'attendance_secret_%'
ORDER BY key;

-- Insert Saturday and Sunday secrets if not exist
INSERT INTO settings (key, value, description)
VALUES 
  ('attendance_secret_sat', '', 'Secret key untuk QR kehadiran Sabtu'),
  ('attendance_secret_sun', '', 'Secret key untuk QR kehadiran Minggu')
ON CONFLICT (key) DO NOTHING;

-- Generate random secrets if empty (uncomment to auto-generate)
/*
UPDATE settings 
SET value = encode(gen_random_bytes(16), 'hex')
WHERE key IN ('attendance_secret_sat', 'attendance_secret_sun')
  AND (value IS NULL OR value = '');
*/

-- Verify all 7 days exist
SELECT 
  '✅ All Daily Secrets' as status,
  key,
  CASE 
    WHEN value IS NOT NULL AND value != '' THEN '✅ SET'
    ELSE '⚠️ EMPTY (please set in /data/settings/daily_qr)'
  END as status,
  LENGTH(value) as secret_length,
  LEFT(value, 8) || '...' as preview
FROM settings
WHERE key IN (
  'attendance_secret_mon',
  'attendance_secret_tue',
  'attendance_secret_wed',
  'attendance_secret_thu',
  'attendance_secret_fri',
  'attendance_secret_sat',
  'attendance_secret_sun'
)
ORDER BY 
  CASE key
    WHEN 'attendance_secret_mon' THEN 1
    WHEN 'attendance_secret_tue' THEN 2
    WHEN 'attendance_secret_wed' THEN 3
    WHEN 'attendance_secret_thu' THEN 4
    WHEN 'attendance_secret_fri' THEN 5
    WHEN 'attendance_secret_sat' THEN 6
    WHEN 'attendance_secret_sun' THEN 7
  END;

-- Final summary
SELECT 
  '🎉 WEEKEND SUPPORT ADDED!' as message,
  json_build_object(
    'total_secrets', (SELECT COUNT(*) FROM settings WHERE key LIKE 'attendance_secret_%'),
    'secrets_set', (SELECT COUNT(*) FROM settings WHERE key LIKE 'attendance_secret_%' AND value IS NOT NULL AND value != ''),
    'secrets_empty', (SELECT COUNT(*) FROM settings WHERE key LIKE 'attendance_secret_%' AND (value IS NULL OR value = '')),
    'note', 'Visit /data/settings/daily_qr to generate secrets for Saturday and Sunday'
  ) as summary;
