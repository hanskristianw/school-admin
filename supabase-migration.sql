-- Supabase Migration Script
-- School Admin Database Schema Migration from Neon to Supabase

-- Enable Row Level Security for all tables
-- Disable RLS for now since we're using custom auth
-- We'll create tables with appropriate permissions

-- 1. Create Role Table
CREATE TABLE IF NOT EXISTS role (
    role_id SERIAL PRIMARY KEY,
    role_name VARCHAR(50) NOT NULL UNIQUE,
    is_admin BOOLEAN DEFAULT FALSE
);

-- 2. Create Unit Table (from your Go API)
CREATE TABLE IF NOT EXISTS unit (
    unit_id SERIAL PRIMARY KEY,
    unit_name VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Create Users Table
CREATE TABLE IF NOT EXISTS users (
    user_id SERIAL PRIMARY KEY,
    user_nama_depan VARCHAR(100) NOT NULL,
    user_nama_belakang VARCHAR(100) NOT NULL,
    user_username VARCHAR(50) UNIQUE NOT NULL,
    user_password VARCHAR(255) NOT NULL,
    user_role_id INTEGER NOT NULL REFERENCES role(role_id),
    user_unit_id INTEGER REFERENCES unit(unit_id),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Create Menus Table
CREATE TABLE IF NOT EXISTS menus (
    menu_id SERIAL PRIMARY KEY,
    menu_name VARCHAR(100) NOT NULL,
    menu_path VARCHAR(200),
    menu_icon VARCHAR(50),
    menu_order INTEGER DEFAULT 0,
    menu_parent_id INTEGER REFERENCES menus(menu_id)
);

-- 5. Create Menu Permissions Table
CREATE TABLE IF NOT EXISTS menu_permissions (
    permissions_id SERIAL PRIMARY KEY,
    menu_id INTEGER NOT NULL REFERENCES menus(menu_id),
    role_id INTEGER NOT NULL REFERENCES role(role_id),
    UNIQUE(menu_id, role_id)
);

-- 6. Create Kelas Table (from your Go API)
CREATE TABLE IF NOT EXISTS kelas (
    kelas_id SERIAL PRIMARY KEY,
    kelas_nama VARCHAR(255) NOT NULL,
    kelas_user_id INTEGER NOT NULL REFERENCES users(user_id),
    kelas_unit_id INTEGER NOT NULL REFERENCES unit(unit_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. Create Subject Table (from your Go API)
CREATE TABLE IF NOT EXISTS subject (
    subject_id SERIAL PRIMARY KEY,
    subject_name VARCHAR(255) NOT NULL,
    subject_user_id INTEGER NOT NULL REFERENCES users(user_id),
    subject_unit_id INTEGER NOT NULL REFERENCES unit(unit_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_users_username ON users(user_username);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(user_role_id);
CREATE INDEX IF NOT EXISTS idx_menu_permissions_menu ON menu_permissions(menu_id);
CREATE INDEX IF NOT EXISTS idx_menu_permissions_role ON menu_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_kelas_user ON kelas(kelas_user_id);
CREATE INDEX IF NOT EXISTS idx_kelas_unit ON kelas(kelas_unit_id);
CREATE INDEX IF NOT EXISTS idx_subject_user ON subject(subject_user_id);
CREATE INDEX IF NOT EXISTS idx_subject_unit ON subject(subject_unit_id);

-- Insert Default Roles
INSERT INTO role (role_id, role_name, is_admin) VALUES 
(1, 'admin', true),
(2, 'teacher', false),
(3, 'student', false),
(4, 'staff', false)
ON CONFLICT (role_id) DO NOTHING;

-- Insert Default Admin User (password: 123456)
INSERT INTO users (
    user_id, user_nama_depan, user_nama_belakang, 
    user_username, user_password, user_role_id, is_active
) VALUES (
    1, 'Administrator', 'System', 'admin',
    '$2a$10$qqE7esxoiQIKH8uU6xa6ieF5XCTC2q4Gtj3oNHpqZugVgRtbxXUke',
    1, true
) ON CONFLICT (user_id) DO NOTHING;

-- Insert Default Menus
INSERT INTO menus (menu_id, menu_name, menu_path, menu_icon, menu_order, menu_parent_id) VALUES 
(1, 'Dashboard', '/dashboard', 'fas fa-tachometer-alt', 1, NULL),
(2, 'Data Management', NULL, 'fas fa-database', 2, NULL),
(3, 'User Access', '/data/akses', 'fas fa-user', 1, 2),
(4, 'View Data', '/data/lihat', 'fas fa-eye', 2, 2),
(57, 'Data Management', NULL, 'fas fa-database', 50, NULL),
(58, 'User Management', '/data/user', 'users', 3, 57),
(59, 'Class Management', '/data/class', 'graduation-cap', 4, 57),
(60, 'Subject Management', '/data/subject', 'book', 5, 57)
ON CONFLICT (menu_id) DO NOTHING;

-- Grant admin access to all menus
INSERT INTO menu_permissions (menu_id, role_id) VALUES 
(1, 1), (2, 1), (3, 1), (4, 1), (57, 1), (58, 1), (59, 1), (60, 1)
ON CONFLICT (menu_id, role_id) DO NOTHING;

-- Insert sample units
INSERT INTO unit (unit_id, unit_name) VALUES 
(1, 'Elementary School'),
(2, 'Middle School'),
(3, 'High School')
ON CONFLICT (unit_id) DO NOTHING;

-- Reset sequences to prevent conflicts
SELECT setval('role_role_id_seq', (SELECT MAX(role_id) FROM role));
SELECT setval('users_user_id_seq', (SELECT MAX(user_id) FROM users));
SELECT setval('menus_menu_id_seq', (SELECT MAX(menu_id) FROM menus));
SELECT setval('menu_permissions_permissions_id_seq', (SELECT MAX(permissions_id) FROM menu_permissions));
SELECT setval('unit_unit_id_seq', (SELECT MAX(unit_id) FROM unit));

-- Enable RLS on all tables but allow all operations for now
-- We'll use service role key in Go API
ALTER TABLE role ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE unit ENABLE ROW LEVEL SECURITY;
ALTER TABLE kelas ENABLE ROW LEVEL SECURITY;
ALTER TABLE subject ENABLE ROW LEVEL SECURITY;

-- Create policies to allow service role to access everything
CREATE POLICY "Service role can do everything" ON role FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role can do everything" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role can do everything" ON menus FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role can do everything" ON menu_permissions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role can do everything" ON unit FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role can do everything" ON kelas FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role can do everything" ON subject FOR ALL USING (true) WITH CHECK (true);
