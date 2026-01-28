-- Migration: Create Views for Purchasing Dashboard Performance
-- Purpose: Optimize dashboard queries by pre-calculating stock levels

-- ============================================================================
-- 1. Current Stock Per Variant View
-- ============================================================================
-- This view calculates current stock for each uniform variant
-- by summing all stock transactions

CREATE OR REPLACE VIEW v_current_stock AS
SELECT 
  uv.variant_id,
  uv.uniform_id,
  uv.size_id,
  uv.hpp,
  uv.price,
  u.uniform_name,
  u.uniform_code,
  u.gender,
  s.size_name,
  COALESCE(SUM(ust.qty_delta), 0) as current_stock,
  COALESCE(SUM(ust.qty_delta), 0) * uv.hpp as stock_value
FROM uniform_variant uv
INNER JOIN uniform u ON u.uniform_id = uv.uniform_id
INNER JOIN uniform_size s ON s.size_id = uv.size_id
LEFT JOIN uniform_stock_txn ust ON ust.uniform_id = uv.uniform_id 
  AND ust.size_id = uv.size_id
WHERE u.is_active = true
GROUP BY 
  uv.variant_id, 
  uv.uniform_id, 
  uv.size_id, 
  uv.hpp,
  uv.price,
  u.uniform_name,
  u.uniform_code,
  u.gender,
  s.size_name;

-- Add comment
COMMENT ON VIEW v_current_stock IS 'Current stock levels per uniform variant with stock value calculation';

-- ============================================================================
-- 2. Low Stock Items View
-- ============================================================================
-- Pre-filtered view for items with stock below threshold

CREATE OR REPLACE VIEW v_low_stock_items AS
SELECT 
  variant_id,
  uniform_id,
  size_id,
  hpp,
  price,
  uniform_name,
  uniform_code,
  gender,
  size_name,
  current_stock,
  stock_value,
  CASE 
    WHEN current_stock < 5 THEN 'critical'
    WHEN current_stock < 10 THEN 'low'
    ELSE 'normal'
  END as stock_status
FROM v_current_stock
WHERE current_stock < 10
ORDER BY current_stock ASC;

COMMENT ON VIEW v_low_stock_items IS 'Items with stock below 10 units, ordered by stock level';

-- ============================================================================
-- 3. Dashboard Metrics Function
-- ============================================================================
-- Single function call to get all key metrics

DROP FUNCTION IF EXISTS get_purchasing_dashboard_metrics(DATE);

CREATE OR REPLACE FUNCTION get_purchasing_dashboard_metrics(
  p_month_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  metric_name TEXT,
  metric_value NUMERIC,
  metric_count INTEGER,
  metric_label TEXT
) AS $$
DECLARE
  v_first_day DATE;
  v_last_day DATE;
BEGIN
  -- Calculate month boundaries
  v_first_day := DATE_TRUNC('month', p_month_date)::DATE;
  v_last_day := (DATE_TRUNC('month', p_month_date) + INTERVAL '1 month - 1 day')::DATE;

  -- Total Stock Value
  RETURN QUERY
  SELECT 
    'total_stock_value'::TEXT,
    COALESCE(SUM(stock_value), 0)::NUMERIC,
    COUNT(*)::INTEGER,
    'Total Stock Value'::TEXT
  FROM v_current_stock;

  -- Low Stock Count
  RETURN QUERY
  SELECT 
    'low_stock_count'::TEXT,
    0::NUMERIC,
    COUNT(*)::INTEGER,
    'Low Stock Items'::TEXT
  FROM v_low_stock_items;

  -- Pending Purchase Orders (posted but not fully received)
  RETURN QUERY
  SELECT 
    'pending_po_count'::TEXT,
    0::NUMERIC,
    COUNT(DISTINCT up.purchase_id)::INTEGER,
    'Pending Purchase Orders'::TEXT
  FROM uniform_purchase up
  LEFT JOIN uniform_purchase_receipt upr ON upr.purchase_id = up.purchase_id
  WHERE up.status = 'posted' 
    AND up.is_voided = false
    AND upr.receipt_id IS NULL;

  -- This Month Purchase Count & Value
  RETURN QUERY
  SELECT 
    'month_purchase_value'::TEXT,
    COALESCE(SUM(upi.qty * upi.unit_cost), 0)::NUMERIC,
    COUNT(DISTINCT up.purchase_id)::INTEGER,
    'This Month Purchases'::TEXT
  FROM uniform_purchase up
  INNER JOIN uniform_purchase_item upi ON upi.purchase_id = up.purchase_id
  WHERE up.purchase_date >= v_first_day
    AND up.purchase_date <= v_last_day
    AND up.is_voided = false;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_purchasing_dashboard_metrics IS 'Get all dashboard metrics in single function call';

-- ============================================================================
-- 4. Best Sellers This Month Function
-- ============================================================================

DROP FUNCTION IF EXISTS get_best_sellers_month(DATE, INTEGER);

CREATE OR REPLACE FUNCTION get_best_sellers_month(
  p_month_date DATE DEFAULT CURRENT_DATE,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  uniform_id INTEGER,
  size_id INTEGER,
  uniform_name TEXT,
  size_name TEXT,
  total_qty BIGINT,
  total_revenue NUMERIC
) AS $$
DECLARE
  v_first_day DATE;
  v_last_day DATE;
BEGIN
  v_first_day := DATE_TRUNC('month', p_month_date)::DATE;
  v_last_day := (DATE_TRUNC('month', p_month_date) + INTERVAL '1 month - 1 day')::DATE;

  RETURN QUERY
  SELECT 
    usi.uniform_id,
    usi.size_id,
    u.uniform_name::TEXT,
    s.size_name::TEXT,
    SUM(usi.qty)::BIGINT as total_qty,
    SUM(usi.subtotal)::NUMERIC as total_revenue
  FROM uniform_sale_item usi
  INNER JOIN uniform_sale us ON us.sale_id = usi.sale_id
  INNER JOIN uniform u ON u.uniform_id = usi.uniform_id
  INNER JOIN uniform_size s ON s.size_id = usi.size_id
  WHERE us.sale_date >= v_first_day
    AND us.sale_date <= v_last_day
    AND us.status != 'cancelled'
    AND us.is_voided = false
  GROUP BY usi.uniform_id, usi.size_id, u.uniform_name, s.size_name
  ORDER BY total_qty DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_best_sellers_month IS 'Get top selling items for specified month';

-- ============================================================================
-- 5. Top Suppliers This Month Function
-- ============================================================================

DROP FUNCTION IF EXISTS get_top_suppliers_month(DATE, INTEGER);

CREATE OR REPLACE FUNCTION get_top_suppliers_month(
  p_month_date DATE DEFAULT CURRENT_DATE,
  p_limit INTEGER DEFAULT 5
)
RETURNS TABLE (
  supplier_id INTEGER,
  supplier_name TEXT,
  purchase_count BIGINT,
  total_value NUMERIC
) AS $$
DECLARE
  v_first_day DATE;
  v_last_day DATE;
BEGIN
  v_first_day := DATE_TRUNC('month', p_month_date)::DATE;
  v_last_day := (DATE_TRUNC('month', p_month_date) + INTERVAL '1 month - 1 day')::DATE;

  RETURN QUERY
  SELECT 
    up.supplier_id,
    us.supplier_name::TEXT,
    COUNT(DISTINCT up.purchase_id)::BIGINT as purchase_count,
    SUM(upi.qty * upi.unit_cost)::NUMERIC as total_value
  FROM uniform_purchase up
  INNER JOIN uniform_supplier us ON us.supplier_id = up.supplier_id
  INNER JOIN uniform_purchase_item upi ON upi.purchase_id = up.purchase_id
  WHERE up.purchase_date >= v_first_day
    AND up.purchase_date <= v_last_day
    AND up.is_voided = false
  GROUP BY up.supplier_id, us.supplier_name
  ORDER BY total_value DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_top_suppliers_month IS 'Get top suppliers by purchase value for specified month';

-- ============================================================================
-- 6. Grant Permissions
-- ============================================================================

-- Grant SELECT on views to authenticated users
GRANT SELECT ON v_current_stock TO anon, authenticated;
GRANT SELECT ON v_low_stock_items TO anon, authenticated;

-- Grant EXECUTE on functions
GRANT EXECUTE ON FUNCTION get_purchasing_dashboard_metrics(DATE) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_best_sellers_month(DATE, INTEGER) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_top_suppliers_month(DATE, INTEGER) TO anon, authenticated;

-- ============================================================================
-- Verification Queries
-- ============================================================================

-- Test current stock view
-- SELECT * FROM v_current_stock LIMIT 5;

-- Test low stock view
-- SELECT * FROM v_low_stock_items;

-- Test dashboard metrics
-- SELECT * FROM get_purchasing_dashboard_metrics(CURRENT_DATE);

-- Test best sellers
-- SELECT * FROM get_best_sellers_month(CURRENT_DATE, 10);

-- Test top suppliers
-- SELECT * FROM get_top_suppliers_month(CURRENT_DATE, 5);
