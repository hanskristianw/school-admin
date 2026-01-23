-- Fix negative stock issue caused by orphaned or corrupt transactions
-- This script identifies and removes problematic stock transactions

-- ========== DIAGNOSTIC QUERIES ==========

-- 1. Show all stock transactions with their purchase info
SELECT 
  txn.txn_id,
  txn.uniform_id,
  txn.size_id,
  txn.qty_delta,
  txn.txn_type,
  txn.ref_table,
  txn.ref_id,
  txn.supplier_id,
  txn.notes,
  r.purchase_id,
  p.is_voided,
  p.status
FROM uniform_stock_txn txn
LEFT JOIN uniform_purchase_receipt r ON r.receipt_id = txn.ref_id AND txn.ref_table = 'uniform_purchase_receipt'
LEFT JOIN uniform_purchase p ON p.purchase_id = r.purchase_id
WHERE txn.txn_type = 'purchase'
ORDER BY txn.txn_id DESC
LIMIT 50;

-- 2. Show transactions with NULL supplier_id
SELECT 
  txn.txn_id,
  txn.uniform_id,
  txn.size_id,
  txn.qty_delta,
  txn.supplier_id,
  txn.notes,
  txn.created_at
FROM uniform_stock_txn txn
WHERE txn.supplier_id IS NULL
ORDER BY txn.created_at DESC;

-- 3. Show current stock summary (to see negative values)
SELECT 
  u.uniform_name,
  s.size_name,
  sup.supplier_name,
  SUM(txn.qty_delta) as total_stock
FROM uniform_stock_txn txn
JOIN uniform u ON u.uniform_id = txn.uniform_id
JOIN uniform_size s ON s.size_id = txn.size_id
LEFT JOIN uniform_supplier sup ON sup.supplier_id = txn.supplier_id
GROUP BY u.uniform_name, s.size_name, sup.supplier_name
HAVING SUM(txn.qty_delta) < 0
ORDER BY total_stock;

-- ========== CLEANUP OPTIONS ==========

-- OPTION 1: Delete ALL purchase-type transactions and start fresh
-- USE THIS if you want to reset all purchase history
-- WARNING: This will delete all stock from purchases, keeping only 'init' stock

-- DELETE FROM uniform_stock_txn 
-- WHERE txn_type = 'purchase';

-- OPTION 2: Delete only transactions from voided purchases
DELETE FROM uniform_stock_txn
WHERE txn_id IN (
  SELECT txn.txn_id
  FROM uniform_stock_txn txn
  JOIN uniform_purchase_receipt r ON r.receipt_id = txn.ref_id
  JOIN uniform_purchase p ON p.purchase_id = r.purchase_id
  WHERE txn.ref_table = 'uniform_purchase_receipt'
    AND p.is_voided = true
);

-- OPTION 3: Delete orphaned transactions (receipt doesn't exist)
DELETE FROM uniform_stock_txn
WHERE ref_table = 'uniform_purchase_receipt'
  AND ref_id NOT IN (SELECT receipt_id FROM uniform_purchase_receipt);

-- OPTION 4: Delete transactions with NULL supplier_id (if not intentional)
-- DELETE FROM uniform_stock_txn
-- WHERE supplier_id IS NULL AND txn_type != 'init';

-- ========== VERIFICATION ==========

-- After cleanup, check if any negative stock remains
SELECT 
  u.uniform_name,
  s.size_name,
  sup.supplier_name,
  SUM(txn.qty_delta) as total_stock
FROM uniform_stock_txn txn
JOIN uniform u ON u.uniform_id = txn.uniform_id
JOIN uniform_size s ON s.size_id = txn.size_id
LEFT JOIN uniform_supplier sup ON sup.supplier_id = txn.supplier_id
GROUP BY u.uniform_name, s.size_name, sup.supplier_name
HAVING SUM(txn.qty_delta) < 0
ORDER BY total_stock;
