-- Fix RLS: izinkan authenticated user insert/update/delete special_day_rules
-- Jalankan di Supabase SQL Editor jika menggunakan direct client,
-- ATAU cukup pastikan semua write menggunakan service_role key via API route.

-- Tambahkan policy untuk authenticated user
DROP POLICY IF EXISTS "special_day_rules_insert_auth" ON special_day_rules;
DROP POLICY IF EXISTS "special_day_rules_update_auth" ON special_day_rules;
DROP POLICY IF EXISTS "special_day_rules_delete_auth" ON special_day_rules;

CREATE POLICY "special_day_rules_insert_auth" ON special_day_rules
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "special_day_rules_update_auth" ON special_day_rules
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "special_day_rules_delete_auth" ON special_day_rules
  FOR DELETE TO authenticated USING (true);

SELECT 'RLS policy special_day_rules berhasil diperbarui' AS status;
