-- Add ATL Descriptors menu to menu table
-- ATL (Approaches to Learning) management page for IB MYP program

-- First, check current menu structure for Data parent menu
-- Assuming Data menu exists with path '/data'

-- Insert ATL menu as child of Data menu
INSERT INTO menu (menu_nama, menu_path, menu_icon, menu_role, menu_parent_id, menu_order, is_active)
SELECT 
  'ATL Descriptors' AS menu_nama,
  '/data/atl' AS menu_path,
  'fas fa-lightbulb' AS menu_icon, -- Lightbulb represents learning/thinking skills
  'admin,super_admin' AS menu_role, -- Only admin and super_admin can access
  m.menu_id AS menu_parent_id, -- Parent is Data menu
  (SELECT COALESCE(MAX(menu_order), 0) + 1 FROM menu WHERE menu_parent_id = m.menu_id) AS menu_order,
  true AS is_active
FROM menu m
WHERE m.menu_path = '/data' 
  AND m.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM menu WHERE menu_path = '/data/atl'
  );

-- Verify the insertion
SELECT 
  m.menu_id,
  m.menu_nama,
  m.menu_path,
  m.menu_icon,
  m.menu_role,
  m.menu_parent_id,
  p.menu_nama AS parent_menu,
  m.menu_order,
  m.is_active
FROM menu m
LEFT JOIN menu p ON m.menu_parent_id = p.menu_id
WHERE m.menu_path = '/data/atl';

-- Alternative icons to consider:
-- 'fas fa-brain' - Brain icon for thinking/cognitive skills
-- 'fas fa-list-check' - Checklist for skill descriptors
-- 'fas fa-book-open-reader' - Reader for learning approaches
-- 'fas fa-graduation-cap' - Academic/learning icon (already used elsewhere)
