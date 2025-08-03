-- SQL commands untuk disable RLS pada semua table
-- Jalankan di Supabase SQL Editor jika masih ada error "Invalid API key"

-- Disable RLS untuk semua table yang kita gunakan
ALTER TABLE role DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE menus DISABLE ROW LEVEL SECURITY;
ALTER TABLE menu_permissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE unit DISABLE ROW LEVEL SECURITY;
ALTER TABLE kelas DISABLE ROW LEVEL SECURITY;
ALTER TABLE subject DISABLE ROW LEVEL SECURITY;

-- Optional: Grant permissions untuk anon dan authenticated users
GRANT ALL ON role TO anon, authenticated;
GRANT ALL ON users TO anon, authenticated;
GRANT ALL ON menus TO anon, authenticated;
GRANT ALL ON menu_permissions TO anon, authenticated;
GRANT ALL ON unit TO anon, authenticated;
GRANT ALL ON kelas TO anon, authenticated;
GRANT ALL ON subject TO anon, authenticated;

-- Grant sequence permissions
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
