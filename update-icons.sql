-- Update icon names in menus table to use FontAwesome default names
-- This will make icon mapping consistent and simpler

UPDATE menus SET menu_icon = 'faTachometerAlt' WHERE menu_icon = 'fas fa-tachometer-alt';
UPDATE menus SET menu_icon = 'faDatabase' WHERE menu_icon = 'fas fa-database';
UPDATE menus SET menu_icon = 'faUser' WHERE menu_icon = 'fas fa-user';
UPDATE menus SET menu_icon = 'faEye' WHERE menu_icon = 'fas fa-eye';
UPDATE menus SET menu_icon = 'faUsers' WHERE menu_icon = 'users';
UPDATE menus SET menu_icon = 'faGraduationCap' WHERE menu_icon = 'graduation-cap';
UPDATE menus SET menu_icon = 'faBook' WHERE menu_icon = 'book';

-- Check the results
SELECT menu_id, menu_name, menu_icon FROM menus ORDER BY menu_order;
