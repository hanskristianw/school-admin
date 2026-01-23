-- Cleanup stock transactions from voided purchases
-- This script removes stock transactions that belong to receipts of voided purchases

-- Step 1: Show voided purchases
SELECT 
  p.purchase_id,
  p.order_date,
  p.is_voided,
  p.voided_at,
  p.void_reason,
  COUNT(DISTINCT r.receipt_id) as receipt_count
FROM uniform_purchase p
LEFT JOIN uniform_purchase_receipt r ON r.purchase_id = p.purchase_id
WHERE p.is_voided = true
GROUP BY p.purchase_id, p.order_date, p.is_voided, p.voided_at, p.void_reason;

-- Step 2: Show stock transactions that need to be deleted
SELECT 
  txn.txn_id,
  txn.uniform_id,
  txn.size_id,
  txn.qty_delta,
  txn.txn_type,
  txn.ref_table,
  txn.ref_id,
  txn.notes,
  r.purchase_id,
  p.is_voided
FROM uniform_stock_txn txn
JOIN uniform_purchase_receipt r ON r.receipt_id = txn.ref_id
JOIN uniform_purchase p ON p.purchase_id = r.purchase_id
WHERE txn.ref_table = 'uniform_purchase_receipt'
  AND p.is_voided = true;

-- Step 3: Delete stock transactions from voided purchases
DELETE FROM uniform_stock_txn
WHERE txn_id IN (
  SELECT txn.txn_id
  FROM uniform_stock_txn txn
  JOIN uniform_purchase_receipt r ON r.receipt_id = txn.ref_id
  JOIN uniform_purchase p ON p.purchase_id = r.purchase_id
  WHERE txn.ref_table = 'uniform_purchase_receipt'
    AND p.is_voided = true
);

-- Step 4: Verify cleanup - should return 0 rows
SELECT 
  txn.txn_id,
  txn.uniform_id,
  txn.size_id,
  txn.qty_delta,
  r.purchase_id,
  p.is_voided
FROM uniform_stock_txn txn
JOIN uniform_purchase_receipt r ON r.receipt_id = txn.ref_id
JOIN uniform_purchase p ON p.purchase_id = r.purchase_id
WHERE txn.ref_table = 'uniform_purchase_receipt'
  AND p.is_voided = true;
