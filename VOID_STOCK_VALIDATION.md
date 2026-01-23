# Void Purchase Order - Stock Validation System

## Problem Statement

**Edge Case yang Harus Diatasi:**
Ketika user mencoba void/cancel purchase order yang barangnya sudah terjual sebagian atau seluruhnya, sistem void otomatis akan membuat reverse transaction yang menyebabkan stok menjadi **NEGATIF**.

### Example Scenario:
```
1. Purchase Order #1: Terima 100 pcs Polo Shirt ukuran 20
2. Sale Transaction: Jual 60 pcs
3. Current Stock: 40 pcs
4. User mencoba VOID PO #1
5. System akan reverse -100 pcs
6. Result: Stock menjadi -60 pcs ❌ MASALAH!
```

## Solution: Stock Validation Before Void

### Implementation

Sebelum melakukan void, sistem akan:

1. **Query stok saat ini** untuk setiap item yang akan di-reverse
2. **Hitung total stock** = SUM(qty_delta) dari uniform_stock_txn
3. **Bandingkan** dengan qty_received yang perlu di-reverse
4. **Block void** jika stok tidak cukup
5. **Tampilkan error detail** untuk membantu user

### Validation Code Location

File: `/src/app/stock/uniform/add/page.jsx`
Function: `voidPurchase()`

```javascript
// ========== STOCK VALIDATION BEFORE VOID ==========
for (const item of receiptItems || []) {
  if (item.qty_received > 0) {
    // Get current stock
    const { data: stockData } = await supabase
      .from('uniform_stock_txn')
      .select('qty_delta')
      .eq('uniform_id', item.uniform_id)
      .eq('size_id', item.size_id)
    
    const currentStock = stockData?.reduce((sum, txn) => 
      sum + (txn.qty_delta || 0), 0) || 0
    
    // Validate
    if (currentStock < item.qty_received) {
      // Add to error list with details
      stockValidationErrors.push({
        uniform_name, size_name,
        qty_to_reverse: item.qty_received,
        current_stock: currentStock,
        shortage: item.qty_received - currentStock
      })
    }
  }
}

if (stockValidationErrors.length > 0) {
  // BLOCK VOID and show detailed error
  setError(detailedErrorMessage)
  return
}
```

## Error Message Format

Ketika void ditolak, user akan melihat pesan detail:

```
⚠️ TIDAK BISA VOID: Stok tidak cukup untuk dikembalikan!

Detail masalah:
1. Polo Shirt (20):
   • Perlu dikembalikan: 100 pcs
   • Stok saat ini: 40 pcs
   • Kurang: 60 pcs

2. Blazer (M):
   • Perlu dikembalikan: 50 pcs
   • Stok saat ini: 25 pcs
   • Kurang: 25 pcs

💡 Kemungkinan penyebab:
• Barang sudah terjual sebagian/seluruhnya
• Ada adjustment stok keluar
• Ada return ke supplier

🔧 Solusi:
1. Pastikan stok mencukupi sebelum void
2. Atau buat adjustment manual untuk balance stok
3. Hubungi admin jika perlu bantuan
```

## Scenario Analysis

### ✅ Scenario 1: Void BERHASIL (Stock Cukup)

**Timeline:**
- Purchase #1: Terima 100 pcs
- Current Stock: 100 pcs
- Void Attempt: **ALLOWED** ✅

**Result:**
- Reverse transaction: -100 pcs
- Final stock: 0 pcs
- Status: Voided

---

### ❌ Scenario 2: Void DITOLAK (Sudah Terjual Sebagian)

**Timeline:**
- Purchase #1: Terima 100 pcs
- Sale: Jual 60 pcs
- Current Stock: 40 pcs
- Void Attempt: **BLOCKED** ❌

**Error:**
```
Perlu dikembalikan: 100 pcs
Stok saat ini: 40 pcs
Kurang: 60 pcs
```

---

### ❌ Scenario 3: Void DITOLAK (Sudah Terjual Semua)

**Timeline:**
- Purchase #1: Terima 100 pcs
- Sale: Jual 100 pcs
- Current Stock: 0 pcs
- Void Attempt: **BLOCKED** ❌

**Error:**
```
Perlu dikembalikan: 100 pcs
Stok saat ini: 0 pcs
Kurang: 100 pcs
```

---

### ❌ Scenario 4: Void DITOLAK (Ada Adjustment Keluar)

**Timeline:**
- Purchase #1: Terima 100 pcs
- Adjustment: -20 pcs (rusak/hilang)
- Current Stock: 80 pcs
- Void Attempt: **BLOCKED** ❌

**Error:**
```
Perlu dikembalikan: 100 pcs
Stok saat ini: 80 pcs
Kurang: 20 pcs
```

---

### ❌ Scenario 5: Void DITOLAK (Multiple PO, Stock Shared)

**Timeline:**
- Purchase #1: Terima 100 pcs
- Purchase #2: Terima 50 pcs
- Sale: Jual 120 pcs
- Current Stock: 30 pcs
- Void PO #1: **BLOCKED** ❌

**Error:**
```
Perlu dikembalikan: 100 pcs
Stok saat ini: 30 pcs
Kurang: 70 pcs
```

**Note:** Sistem tidak bisa tahu mana stock dari PO #1 atau #2 karena stock digabung per item.

---

### ✅ Scenario 6: Void BERHASIL (Ada Purchase Lain)

**Timeline:**
- Purchase #1: Terima 50 pcs
- Purchase #2: Terima 100 pcs
- Sale: Jual 30 pcs
- Current Stock: 120 pcs
- Void PO #1: **ALLOWED** ✅

**Result:**
- Reverse transaction: -50 pcs
- Final stock: 70 pcs
- Status: Voided

## Modal Warning Enhancement

Modal void sekarang menampilkan warning tambahan:

```
⚠️ Perhatian: Pembatalan akan mengembalikan stok yang sudah diterima.

🛡️ VALIDASI OTOMATIS:
Sistem akan mengecek apakah stok tersedia cukup untuk dikembalikan.
Jika barang sudah terjual/digunakan, void akan ditolak.
```

## Business Rules

### Void ALLOWED When:
✅ Status = 'posted'
✅ Alasan void diisi
✅ **Current stock >= qty yang perlu di-reverse**
✅ Belum pernah di-void sebelumnya

### Void BLOCKED When:
❌ Status = 'draft' (use delete instead)
❌ Already voided
❌ Empty void reason
❌ **Current stock < qty yang perlu di-reverse** ⚠️

## User Actions When Void is Blocked

### Option A: Wait for Stock Replenishment
- Tunggu sampai ada restock
- Purchase baru dari supplier
- Baru void PO lama

### Option B: Manual Stock Adjustment
1. Buat adjustment manual untuk tambah stok sementara
2. Lakukan void PO
3. Stok akan balance kembali

**Example:**
```
Current: 40 pcs
Need: 100 pcs
Shortage: 60 pcs

Action:
1. Manual adjustment: +60 pcs (temporary)
2. Void PO: -100 pcs
3. Final: 0 pcs (balanced)
```

### Option C: Accept the Loss
- Jangan void PO
- Biarkan tetap active
- Record sebagai loss di accounting
- Update notes dengan keterangan

### Option D: Contact Administrator
- Escalate ke admin/manager
- Admin review case-by-case
- Possible override dengan approval khusus
- Document exceptional case

## Testing Scenarios

### Test 1: Void dengan Stock Penuh
```sql
-- Setup
INSERT INTO uniform_stock_txn (txn_type, uniform_id, size_id, qty_delta)
VALUES ('purchase', 1, 1, 100);

-- Test
Void PO → Expected: SUCCESS ✅
```

### Test 2: Void setelah Partial Sale
```sql
-- Setup
INSERT INTO uniform_stock_txn (txn_type, uniform_id, size_id, qty_delta)
VALUES ('purchase', 1, 1, 100);

INSERT INTO uniform_stock_txn (txn_type, uniform_id, size_id, qty_delta)
VALUES ('sale', 1, 1, -60);

-- Test
Void PO → Expected: BLOCKED ❌
Error: Need 100, have 40, shortage 60
```

### Test 3: Void setelah Full Sale
```sql
-- Setup
INSERT INTO uniform_stock_txn (txn_type, uniform_id, size_id, qty_delta)
VALUES ('purchase', 1, 1, 100);

INSERT INTO uniform_stock_txn (txn_type, uniform_id, size_id, qty_delta)
VALUES ('sale', 1, 1, -100);

-- Test
Void PO → Expected: BLOCKED ❌
Error: Need 100, have 0, shortage 100
```

### Test 4: Multiple Items, Mixed Result
```sql
-- Setup
-- Item A: 100 pcs, sold 50 (have 50) - FAIL
-- Item B: 50 pcs, sold 0 (have 50) - OK

-- Test
Void PO → Expected: BLOCKED ❌
(Karena salah satu item tidak cukup)
```

## Integration with Existing Features

### Delete Draft (No Change)
- Draft orders tidak punya receipt
- Tidak ada stock impact
- Delete tetap berjalan tanpa validation

### Void Posted (Enhanced)
- Added stock validation
- Check each receipt item
- Block if any item insufficient
- Show detailed error message

### Stock Monitoring Page
- Shows all transactions including voids
- Void transactions visible dengan badge "Adjustment"
- Notes menjelaskan "Pembatalan Pesanan #X"

## Database Impact

### Queries Added
```sql
-- For each item in void:
SELECT qty_delta 
FROM uniform_stock_txn 
WHERE uniform_id = ? AND size_id = ?
```

### Performance Consideration
- Additional queries per void attempt
- One query per unique item in PO
- Minimal impact (typical PO has 5-20 items)
- Validation runs only when user clicks confirm

## Future Enhancements

### 1. Partial Void
Allow voiding only available quantity:
```
Need to reverse: 100 pcs
Current stock: 40 pcs
→ Void 40 pcs, keep 60 pcs in original PO
```

### 2. Override Permission
Admin role can override validation:
```
if (user.role === 'admin' && forceVoid === true) {
  // Skip validation, allow negative stock
  // Log as exceptional case
}
```

### 3. Stock Reservation
Reserve stock when creating PO:
```
- Mark 100 pcs as "reserved for PO #1"
- Block sale if it exceeds available (non-reserved) stock
- Guarantee void is always possible
```

### 4. Notification System
Alert when void fails:
```
- Email to user: "Void failed due to insufficient stock"
- Email to admin: "User X tried to void PO Y, blocked"
- Dashboard notification
```

## Summary

✅ **Problem Solved:** Prevent negative stock from void
✅ **User Experience:** Clear error messages with actionable steps
✅ **Data Integrity:** Stock accuracy maintained
✅ **Audit Trail:** All validation attempts logged
✅ **Business Logic:** Aligned with real-world inventory management

**Key Principle:** 
> "You can only give back what you still have."

Sistem ini memastikan bahwa void hanya bisa dilakukan jika barang yang akan dikembalikan masih tersedia di inventory.
