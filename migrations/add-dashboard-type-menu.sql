-- =====================================================
-- ADD DASHBOARD TYPE MENU TO SETTINGS
-- =====================================================
-- Purpose: Add menu item for Dashboard Type management under Settings
-- Date: 2026-01-27
-- =====================================================

-- Step 1: Find Settings parent menu ID (or create if not exists)
DO $$
DECLARE
  settings_menu_id INT;
  new_menu_order INT;
BEGIN
  -- Try to find existing Settings parent menu
  SELECT menu_id INTO settings_menu_id
  FROM menus
  WHERE menu_path LIKE '/settings%' AND menu_parent_id IS NULL
  LIMIT 1;

  -- If Settings menu doesn't exist, create it
  IF settings_menu_id IS NULL THEN
    INSERT INTO menus (menu_name, menu_path, menu_icon, menu_order, menu_parent_id)
    VALUES ('Settings', '/settings', 'fas fa-cogs', 999, NULL)
    RETURNING menu_id INTO settings_menu_id;
    
    RAISE NOTICE 'Created Settings parent menu with ID: %', settings_menu_id;
  ELSE
    RAISE NOTICE 'Found existing Settings menu with ID: %', settings_menu_id;
  END IF;

  -- Get next menu order for Settings submenu
  SELECT COALESCE(MAX(menu_order), 0) + 1 INTO new_menu_order
  FROM menus
  WHERE menu_parent_id = settings_menu_id;

  -- Insert Dashboard Type menu item (if not exists)
  IF NOT EXISTS (
    SELECT 1 FROM menus WHERE menu_path = '/settings/dashboard-type'
  ) THEN
    INSERT INTO menus (menu_name, menu_path, menu_icon, menu_order, menu_parent_id)
    VALUES (
      'Dashboard Type',
      '/settings/dashboard-type',
      'fas fa-gauge-high',
      new_menu_order,
      settings_menu_id
    );
    
    RAISE NOTICE 'Created Dashboard Type menu under Settings';
  ELSE
    RAISE NOTICE 'Dashboard Type menu already exists';
  END IF;
END $$;

-- Step 2: Grant access to admin role (role_id = 1)
-- Adjust if your admin role has different ID
INSERT INTO menu_permissions (menu_id, role_id)
SELECT m.menu_id, 1
FROM menus m
WHERE m.menu_path = '/settings/dashboard-type'
  AND NOT EXISTS (
    SELECT 1 FROM menu_permissions mp 
    WHERE mp.menu_id = m.menu_id AND mp.role_id = 1
  );

-- Step 3: Verification query
-- SELECT m.menu_id, m.menu_name, m.menu_path, m.menu_icon, m.menu_order, 
--        parent.menu_name as parent_menu
-- FROM menus m
-- LEFT JOIN menus parent ON m.menu_parent_id = parent.menu_id
-- WHERE m.menu_path LIKE '/settings%'
-- ORDER BY m.menu_parent_id NULLS FIRST, m.menu_order;
