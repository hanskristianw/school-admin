-- Quick diagnostic: Find negative stock transactions without supplier

SELECT 
  txn_id,
  uniform_id,
  size_id,
  qty_delta,
  txn_type,
  supplier_id,
  ref_table,
  ref_id,
  notes,
  created_at
FROM uniform_stock_txn
WHERE qty_delta < 0
  AND supplier_id IS NULL
ORDER BY created_at DESC;
