-- Fix Data menu permissions for topic-new access
-- Run this SQL in your Supabase SQL Editor

-- 1. Check if Data menu exists
DO $$
DECLARE
    v_data_menu_id INTEGER;
    v_role_id INTEGER;
BEGIN
    -- Check/Insert Data parent menu
    SELECT menu_id INTO v_data_menu_id 
    FROM menus 
    WHERE menu_path = '/data'
    LIMIT 1;

    IF v_data_menu_id IS NULL THEN
        -- Create Data parent menu if not exists
        INSERT INTO menus (menu_name, menu_path, menu_icon, menu_order, menu_parent_id)
        VALUES ('Data', '/data', 'database', 20, NULL)
        RETURNING menu_id INTO v_data_menu_id;
        
        RAISE NOTICE 'Created Data menu with ID: %', v_data_menu_id;
    ELSE
        RAISE NOTICE 'Data menu exists with ID: %', v_data_menu_id;
    END IF;

    -- 2. Grant permission to ALL roles (you can modify this to specific roles only)
    FOR v_role_id IN 
        SELECT role_id FROM role WHERE role_name != 'Student'  -- Exclude Student role
    LOOP
        -- Insert permission if not exists
        INSERT INTO menu_permissions (menu_id, role_id)
        VALUES (v_data_menu_id, v_role_id)
        ON CONFLICT DO NOTHING;
        
        RAISE NOTICE 'Granted Data menu access to role_id: %', v_role_id;
    END LOOP;

    -- 3. Check if Topic submenu exists
    IF NOT EXISTS (SELECT 1 FROM menus WHERE menu_path = '/data/topic-new') THEN
        INSERT INTO menus (menu_name, menu_path, menu_icon, menu_order, menu_parent_id)
        VALUES ('Unit Planner', '/data/topic-new', 'book', 21, v_data_menu_id);
        
        RAISE NOTICE 'Created Unit Planner submenu';
    END IF;

END $$;

-- 4. View current permissions for Data menu
SELECT 
    m.menu_name,
    m.menu_path,
    r.role_name,
    r.is_admin,
    CASE WHEN mp.permissions_id IS NOT NULL THEN 'YES' ELSE 'NO' END as has_access
FROM menus m
CROSS JOIN role r
LEFT JOIN menu_permissions mp ON mp.menu_id = m.menu_id AND mp.role_id = r.role_id
WHERE m.menu_path IN ('/data', '/data/topic-new')
ORDER BY m.menu_path, r.role_name;
