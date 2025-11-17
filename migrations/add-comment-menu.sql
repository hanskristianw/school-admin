-- Add Comment menu to Data section
-- This migration adds a new menu item for /data/comment with the comments icon

BEGIN;

-- Find the parent menu ID for 'Data' section
DO $$
DECLARE
  v_data_menu_id INTEGER;
  v_new_menu_id INTEGER;
  v_admin_role_id INTEGER;
BEGIN
  -- Get the Data menu parent ID (menu with path '/data' or name containing 'Data')
  SELECT menu_id INTO v_data_menu_id
  FROM menus
  WHERE menu_path = '/data' OR (menu_name ILIKE '%data%' AND menu_parent_id IS NULL)
  LIMIT 1;

  -- If no Data parent menu exists, create it
  IF v_data_menu_id IS NULL THEN
    INSERT INTO menus (menu_name, menu_path, menu_icon, menu_order, menu_parent_id)
    VALUES ('Data', '/data', 'fas fa-database', 20, NULL)
    RETURNING menu_id INTO v_data_menu_id;
  END IF;

  -- Insert the Comment menu item if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM menus WHERE menu_path = '/data/comment') THEN
    INSERT INTO menus (menu_name, menu_path, menu_icon, menu_order, menu_parent_id)
    VALUES ('Comment', '/data/comment', 'fas fa-comments', 50, v_data_menu_id)
    RETURNING menu_id INTO v_new_menu_id;

    -- Get admin role ID
    SELECT role_id INTO v_admin_role_id
    FROM role
    WHERE is_admin = true OR role_name ILIKE '%admin%'
    LIMIT 1;

    -- Grant permission to admin role
    IF v_admin_role_id IS NOT NULL AND v_new_menu_id IS NOT NULL THEN
      INSERT INTO menu_permissions (menu_id, role_id)
      VALUES (v_new_menu_id, v_admin_role_id)
      ON CONFLICT DO NOTHING;
    END IF;

    RAISE NOTICE 'Comment menu added successfully with ID: %', v_new_menu_id;
  ELSE
    RAISE NOTICE 'Comment menu already exists';
  END IF;
END $$;

COMMIT;
