-- ============================================================
-- FIX: Nonaktifkan RLS untuk fpb_role_approvers
-- (Sistem pakai custom auth bukan Supabase Auth,
--  sehingga policy TO authenticated tidak berlaku)
-- Jalankan di: Supabase SQL Editor
-- ============================================================

-- Hapus semua policy yang ada
DROP POLICY IF EXISTS "fpb_role_approvers_select" ON fpb_role_approvers;
DROP POLICY IF EXISTS "fpb_role_approvers_insert" ON fpb_role_approvers;
DROP POLICY IF EXISTS "fpb_role_approvers_update" ON fpb_role_approvers;
DROP POLICY IF EXISTS "fpb_role_approvers_delete" ON fpb_role_approvers;
DROP POLICY IF EXISTS "fpb_role_approvers_all_service" ON fpb_role_approvers;

-- Nonaktifkan RLS (konsisten dengan tabel lain yang pakai anon key + custom auth)
ALTER TABLE fpb_role_approvers DISABLE ROW LEVEL SECURITY;

SELECT 'Done - RLS disabled for fpb_role_approvers' AS status;
