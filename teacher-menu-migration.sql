-- Teacher Menu Migration - SQL
-- Menambahkan menu Teacher dan Assessment Submission

-- 1. Menambahkan parent menu Teacher
INSERT INTO menus (menu_name, menu_path, menu_icon, menu_order, menu_parent_id) 
VALUES ('Teacher', NULL, 'fas fa-chalkboard-teacher', 3, NULL)
ON CONFLICT DO NOTHING;

-- 2. Menambahkan child menu Assessment Submission
INSERT INTO menus (menu_name, menu_path, menu_icon, menu_order, menu_parent_id) 
SELECT 'Assessment Submission', '/teacher/assessment_submission', 'fas fa-paper-plane', 1, m.menu_id
FROM menus m 
WHERE m.menu_name = 'Teacher'
ON CONFLICT DO NOTHING;

-- 3. Memberikan permission menu Teacher untuk role guru dan admin
INSERT INTO menu_permissions (menu_id, role_id)
SELECT m.menu_id, r.role_id
FROM menus m
CROSS JOIN role r
WHERE m.menu_name = 'Teacher'
  AND r.role_name IN ('guru', 'admin')
ON CONFLICT (menu_id, role_id) DO NOTHING;

-- 4. Memberikan permission Assessment Submission untuk role guru dan admin
INSERT INTO menu_permissions (menu_id, role_id)
SELECT m.menu_id, r.role_id
FROM menus m
CROSS JOIN role r
WHERE m.menu_path = '/teacher/assessment_submission'
  AND r.role_name IN ('guru', 'admin')
ON CONFLICT (menu_id, role_id) DO NOTHING;

-- 5. Verifikasi menu yang berhasil ditambahkan
SELECT 
    m.menu_id,
    m.menu_name,
    m.menu_path,
    m.menu_icon,
    m.menu_order,
    p.menu_name as parent_menu,
    mp.role_id,
    r.role_name
FROM menus m
LEFT JOIN menus p ON m.menu_parent_id = p.menu_id
LEFT JOIN menu_permissions mp ON m.menu_id = mp.menu_id
LEFT JOIN role r ON mp.role_id = r.role_id
WHERE m.menu_name IN ('Teacher', 'Assessment Submission')
ORDER BY m.menu_order, r.role_name;
