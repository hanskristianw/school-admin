-- =====================================================
-- DASHBOARD TYPE SYSTEM MIGRATION
-- =====================================================
-- Purpose: Create master dashboard_type table and link to role table
-- Date: 2026-01-27
-- =====================================================

-- Step 1: Create master dashboard_type table
CREATE TABLE IF NOT EXISTS dashboard_type (
    dashboard_type_id SERIAL PRIMARY KEY,
    type_code VARCHAR(50) UNIQUE NOT NULL,
    type_name VARCHAR(100) NOT NULL,
    type_description TEXT,
    default_route VARCHAR(200) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 2: Insert default dashboard types
INSERT INTO dashboard_type (type_code, type_name, type_description, default_route) VALUES
('student', 'Student Dashboard', 'Dashboard for students with QR attendance, schedule, and chatbot', '/dashboard/student'),
('teacher', 'Teacher/Staff Dashboard', 'Dashboard for teachers and staff with stats, calendar, and assessments', '/dashboard/teacher')
ON CONFLICT (type_code) DO NOTHING;

-- Step 3: Add dashboard_type_id and role_priority columns to role table (nullable first)
ALTER TABLE role 
ADD COLUMN IF NOT EXISTS dashboard_type_id INT,
ADD COLUMN IF NOT EXISTS role_priority INT DEFAULT 50;

COMMENT ON COLUMN role.role_priority IS 'Priority/weight for role selection when user has multiple roles. Higher = higher priority. Default: 50';

-- Step 4: Set initial role priorities based on common hierarchy
UPDATE role SET role_priority = CASE 
    WHEN is_student = true THEN 10          -- Lowest priority
    WHEN is_teacher = true AND is_principal = false AND is_admin = false THEN 50
    WHEN is_counselor = true THEN 60
    WHEN is_principal = true THEN 80
    WHEN is_admin = true THEN 100           -- Highest priority
    ELSE 50                                  -- Default
END
WHERE role_priority IS NULL OR role_priority = 50;

-- Step 5: Set default dashboard_type_id based on existing is_student flag
UPDATE role 
SET dashboard_type_id = (
    SELECT dashboard_type_id 
    FROM dashboard_type 
    WHERE type_code = CASE 
        WHEN role.is_student = true THEN 'student'
        ELSE 'teacher'
    END
)
WHERE dashboard_type_id IS NULL;

-- Step 6: Make dashboard_type_id NOT NULL and add foreign key constraint
-- Now all roles have dashboard_type_id, we can enforce NOT NULL
ALTER TABLE role 
ALTER COLUMN dashboard_type_id SET NOT NULL;

ALTER TABLE role 
ADD CONSTRAINT fk_role_dashboard_type 
    FOREIGN KEY (dashboard_type_id) 
    REFERENCES dashboard_type(dashboard_type_id);

-- Step 7: Create index for better performance
CREATE INDEX IF NOT EXISTS idx_role_dashboard_type 
ON role(dashboard_type_id);

CREATE INDEX IF NOT EXISTS idx_role_priority 
ON role(role_priority DESC);

-- Step 8: Add helpful comments
COMMENT ON TABLE dashboard_type IS 'Master table for dashboard types/variants';
COMMENT ON COLUMN dashboard_type.type_code IS 'Unique identifier code (e.g., student, teacher, parent, admin)';
COMMENT ON COLUMN dashboard_type.default_route IS 'Default Next.js route path for this dashboard type';
COMMENT ON COLUMN role.dashboard_type_id IS 'Links role to specific dashboard type';

-- =====================================================
-- VERIFICATION QUERIES (run these to check)
-- =====================================================

-- Check dashboard types created
-- SELECT * FROM dashboard_type ORDER BY dashboard_type_id;

-- Check roles updated correctly with priorities
-- SELECT r.role_id, r.role_name, r.role_priority, r.is_student, r.is_admin,
--        dt.type_code, dt.type_name, dt.default_route
-- FROM role r
-- LEFT JOIN dashboard_type dt ON r.dashboard_type_id = dt.dashboard_type_id
-- ORDER BY r.role_priority DESC, r.role_id;

-- Count users per dashboard type
-- SELECT dt.type_code, dt.type_name, COUNT(u.user_id) as user_count
-- FROM dashboard_type dt
-- LEFT JOIN role r ON dt.dashboard_type_id = r.dashboard_type_id
-- LEFT JOIN users u ON r.role_id = u.user_role_id
-- GROUP BY dt.dashboard_type_id, dt.type_code, dt.type_name
-- ORDER BY dt.dashboard_type_id;
