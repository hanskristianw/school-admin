-- Migration: Cleanup Unused Purchasing Dashboard Functions
-- Purpose: Remove RPC functions that are no longer used after switching to direct queries
-- Note: Views (v_current_stock, v_low_stock_items) are kept as they are still used

-- ============================================================================
-- Drop Unused Functions
-- ============================================================================

-- Drop dashboard metrics function (replaced with direct queries)
DROP FUNCTION IF EXISTS get_purchasing_dashboard_metrics(DATE);

-- Drop best sellers function (replaced with direct query + client aggregation)
DROP FUNCTION IF EXISTS get_best_sellers_month(DATE, INTEGER);

-- Drop top suppliers function (replaced with direct query + client aggregation)
DROP FUNCTION IF EXISTS get_top_suppliers_month(DATE, INTEGER);

-- ============================================================================
-- Verification
-- ============================================================================

-- Verify functions are removed
-- SELECT proname FROM pg_proc WHERE proname LIKE 'get_%_month' OR proname LIKE 'get_purchasing%';
-- Should return 0 rows

-- Verify views still exist (these are still used)
-- SELECT viewname FROM pg_views WHERE viewname IN ('v_current_stock', 'v_low_stock_items');
-- Should return 2 rows
