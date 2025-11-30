-- =====================================================
-- ADD ADMISSION MENU ENTRY
-- =====================================================
-- Purpose: Add menu entry for /data/admission page
--          This allows admin to access the student applications management

-- Insert menu entry for Admission Management
INSERT INTO menus (menu_path, menu_name, menu_parent_id, menu_order, menu_icon)
VALUES ('/data/admission', 'Student Admission', 
  (SELECT menu_id FROM menus WHERE menu_path = '/data' LIMIT 1), 
  15, 
  'faUserGraduate'
)
ON CONFLICT (menu_path) DO UPDATE SET
  menu_name = EXCLUDED.menu_name,
  menu_icon = EXCLUDED.menu_icon;

-- Grant permission to admin role (if menu_permissions table exists)
-- Admin role typically has access to all pages, but we add explicit permission
INSERT INTO menu_permissions (permission_menu_id, permission_role_id)
SELECT 
  (SELECT menu_id FROM menus WHERE menu_path = '/data/admission'),
  role_id
FROM role
WHERE role_name IN ('Admin', 'Principal', 'Sales')
ON CONFLICT DO NOTHING;

-- Verification
SELECT m.menu_id, m.menu_path, m.menu_name, m.menu_icon
FROM menus m
WHERE m.menu_path = '/data/admission';
