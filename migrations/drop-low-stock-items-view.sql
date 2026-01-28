-- Migration: Drop Low Stock Items View
-- Purpose: Remove v_low_stock_items view as it's no longer needed in purchasing dashboard
-- Note: v_current_stock view is kept as it's still used for stock value calculation

-- ============================================================================
-- Drop Low Stock Items View
-- ============================================================================

DROP VIEW IF EXISTS v_low_stock_items;

-- ============================================================================
-- Verification
-- ============================================================================

-- Verify view is removed
-- SELECT viewname FROM pg_views WHERE viewname = 'v_low_stock_items';
-- Should return 0 rows

-- Verify v_current_stock still exists
-- SELECT viewname FROM pg_views WHERE viewname = 'v_current_stock';
-- Should return 1 row
