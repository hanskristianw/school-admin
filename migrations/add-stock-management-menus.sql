-- Migration: Add new uniform stock management menu
-- Reason: Add menu for initial stock input page
-- Date: 2026-01-12

-- Add menu for Initial Stock Input under Stock
INSERT INTO menu (menu_name, menu_url, icon, parent_id, display_order)
SELECT 
  'Stock Awal',
  '/stock/uniform/initial',
  'fas fa-warehouse',
  parent.menu_id,
  (SELECT COALESCE(MAX(display_order), 0) + 1 FROM menu WHERE parent_id = parent.menu_id)
FROM menu parent
WHERE parent.menu_url = '/stock'
  AND NOT EXISTS (
    SELECT 1 FROM menu WHERE menu_url = '/stock/uniform/initial'
  );

-- Grant access to admin role for new menu (role_id = 1 typically for admin)
-- Adjust role_id if your admin has different ID
INSERT INTO menu_role (menu_id, role_id)
SELECT m.menu_id, 1
FROM menu m
WHERE m.menu_url = '/stock/uniform/initial'
  AND NOT EXISTS (
    SELECT 1 FROM menu_role mr 
    WHERE mr.menu_id = m.menu_id AND mr.role_id = 1
  );

COMMENT ON TABLE uniform_stock_txn IS 'Stock transactions with supplier tracking. NULL supplier_id = initial/legacy stock.';
