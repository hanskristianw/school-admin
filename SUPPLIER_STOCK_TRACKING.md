# Supplier-Based Stock Tracking System

## Overview
Sistem tracking stock seragam yang membedakan stock berdasarkan supplier asal. Memungkinkan:
- Tracking stock dari berbagai supplier untuk barang yang sama
- Input stock awal/lama (legacy stock) dengan atau tanpa supplier
- Manual selection supplier saat stock keluar
- Historical tracking supplier per transaksi

## Database Changes

### 1. uniform_stock_txn - Tambah kolom supplier_id

```sql
ALTER TABLE uniform_stock_txn 
ADD COLUMN supplier_id INT4;

ALTER TABLE uniform_stock_txn 
ADD CONSTRAINT uniform_stock_txn_supplier_id_fkey 
FOREIGN KEY (supplier_id) REFERENCES uniform_supplier(supplier_id)
ON DELETE SET NULL;
```

**Penjelasan:**
- `supplier_id` NULL = stock awal/lama tanpa supplier, atau stock yang tidak diketahui suppliernya
- `supplier_id` NOT NULL = stock dari supplier tertentu
- Foreign key dengan ON DELETE SET NULL agar tidak error jika supplier dihapus

### 2. Index untuk Performance

```sql
CREATE INDEX idx_uniform_stock_txn_supplier_id 
ON uniform_stock_txn(supplier_id);
```

## Transaction Types (txn_type)

| Type | Deskripsi | Qty Delta | Supplier ID |
|------|-----------|-----------|-------------|
| `purchase` | Pembelian dari PO | Positif (+) | Dari uniform_purchase |
| `initial` | Stock awal sistem | Positif (+) | NULL atau dari supplier |
| `out` | Stock keluar (manual) | Negatif (-) | Dipilih user |
| `sale` | Penjualan | Negatif (-) | Dipilih user |
| `adjustment` | Penyesuaian | +/- | NULL atau dari supplier |

## Features Implemented

### 1. Purchase Receipt - Auto Track Supplier (/stock/uniform/add)

**Flow:**
1. User buat Purchase Order dengan supplier_id
2. Saat terima barang (receipt), sistem otomatis:
   - Create stock transaction dengan `txn_type='purchase'`
   - **Ambil supplier_id dari header Purchase Order**
   - Insert ke uniform_stock_txn dengan supplier_id

**Code Changes:**
```javascript
// File: /src/app/stock/uniform/add/page.jsx
const postReceipt = async () => {
  // Get supplier_id from purchase header
  const { data: purchaseHeader } = await supabase
    .from('uniform_purchase')
    .select('supplier_id')
    .eq('purchase_id', purchaseId)
    .single()
  
  const supplierId = purchaseHeader?.supplier_id || null
  
  // Insert stock transaction WITH supplier_id
  await supabase.from('uniform_stock_txn').insert([{ 
    uniform_id, size_id, qty_delta,
    txn_type: 'purchase',
    supplier_id: supplierId,  // <-- NEW
    ...
  }])
}
```

### 2. Initial Stock Input (/stock/uniform/initial)

**Fitur:**
- Input stock lama yang sudah ada di gudang
- Bisa pilih supplier (jika diketahui) atau kosongkan (NULL)
- Batch input multiple items
- Transaction type: `initial`

**UI Flow:**
1. Klik "Tambah Item"
2. Pilih: Unit, Seragam, Ukuran
3. Pilih Supplier (optional - boleh kosong)
4. Isi Qty dan Keterangan
5. Tambahkan ke daftar (bisa multiple items)
6. Submit semua sekaligus

**Transaction Created:**
```javascript
{
  uniform_id: Number,
  size_id: Number,
  supplier_id: Number | null,  // NULL jika tidak dipilih
  qty_delta: Number (positive),
  txn_type: 'initial',
  ref_table: 'manual',
  ref_id: null,
  notes: 'Stock awal sistem'
}
```

### 3. Stock Out - Manual Supplier Selection (/sales/uniform/stock-out)

**Fitur:**
- Lihat stock available per supplier untuk barang tertentu
- User **pilih manual** dari supplier mana stock yang mau dikeluarkan
- Bisa keluarkan dari multiple suppliers sekaligus
- Transaction type: `out`

**UI Flow:**
1. Filter: Pilih Unit, Seragam, Ukuran
2. Sistem tampilkan stock available per supplier:
   ```
   Supplier A: 40 pcs
   Supplier B: 30 pcs
   Stock Awal (Tanpa Supplier): 20 pcs
   Total: 90 pcs
   ```
3. User input qty yang mau keluar dari tiap supplier
4. Isi alasan/keterangan
5. Submit → sistem create negative transactions per supplier

**Query Stock per Supplier:**
```sql
SELECT 
  supplier_id,
  SUM(qty_delta) as available_qty
FROM uniform_stock_txn
WHERE uniform_id = ? AND size_id = ?
GROUP BY supplier_id
HAVING SUM(qty_delta) > 0
```

**Transaction Created:**
```javascript
// Jika user input: Supplier A = 10 pcs, Supplier B = 5 pcs
[
  {
    uniform_id, size_id,
    supplier_id: supplierA_id,
    qty_delta: -10,  // Negative
    txn_type: 'out',
    notes: 'Penjualan - 2026-01-12'
  },
  {
    uniform_id, size_id,
    supplier_id: supplierB_id,
    qty_delta: -5,
    txn_type: 'out',
    notes: 'Penjualan - 2026-01-12'
  }
]
```

## Query Examples

### 1. Stock Available per Item per Supplier
```sql
SELECT 
  u.uniform_name,
  s.size_name,
  COALESCE(sup.supplier_name, 'Stock Awal') as supplier,
  SUM(txn.qty_delta) as stock_available
FROM uniform_stock_txn txn
JOIN uniform u ON txn.uniform_id = u.uniform_id
JOIN uniform_size s ON txn.size_id = s.size_id
LEFT JOIN uniform_supplier sup ON txn.supplier_id = sup.supplier_id
GROUP BY u.uniform_name, s.size_name, sup.supplier_name, txn.supplier_id
HAVING SUM(txn.qty_delta) > 0
ORDER BY u.uniform_name, s.size_name, supplier;
```

### 2. Stock Movement by Supplier
```sql
SELECT 
  txn.created_at,
  u.uniform_name,
  s.size_name,
  COALESCE(sup.supplier_name, 'N/A') as supplier,
  txn.qty_delta,
  txn.txn_type,
  txn.notes
FROM uniform_stock_txn txn
JOIN uniform u ON txn.uniform_id = u.uniform_id
JOIN uniform_size s ON txn.size_id = s.size_id
LEFT JOIN uniform_supplier sup ON txn.supplier_id = sup.supplier_id
WHERE txn.uniform_id = ?
ORDER BY txn.created_at DESC;
```

### 3. Total Stock per Supplier (All Items)
```sql
SELECT 
  COALESCE(sup.supplier_name, 'Stock Awal') as supplier,
  COUNT(DISTINCT (txn.uniform_id, txn.size_id)) as item_variants,
  SUM(txn.qty_delta) as total_qty
FROM uniform_stock_txn txn
LEFT JOIN uniform_supplier sup ON txn.supplier_id = sup.supplier_id
GROUP BY sup.supplier_name, txn.supplier_id
HAVING SUM(txn.qty_delta) > 0;
```

## Migration Steps

### Step 1: Backup Data
```sql
-- Backup current stock transactions
CREATE TABLE uniform_stock_txn_backup AS 
SELECT * FROM uniform_stock_txn;
```

### Step 2: Run Migrations (in order)
1. `add-supplier-to-stock-txn.sql` - Add supplier_id column
2. `add-stock-management-menus.sql` - Add menu entries

### Step 3: Verify
```sql
-- Check column exists
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'uniform_stock_txn' 
  AND column_name = 'supplier_id';

-- Check existing purchase transactions got supplier_id
SELECT 
  COUNT(*) as total,
  COUNT(supplier_id) as with_supplier,
  COUNT(*) - COUNT(supplier_id) as without_supplier
FROM uniform_stock_txn
WHERE txn_type = 'purchase';
```

## Business Rules

1. **Purchase Receipt:**
   - HARUS ada supplier_id (dari PO header)
   - Tidak boleh NULL kecuali data lama

2. **Initial Stock:**
   - Supplier_id BOLEH NULL (stock lama tanpa supplier)
   - Supplier_id bisa diisi jika diketahui asalnya

3. **Stock Out:**
   - User WAJIB pilih dari supplier mana
   - Qty tidak boleh melebihi available per supplier
   - Bisa dari multiple suppliers sekaligus

4. **Stock Query:**
   - Group by supplier_id untuk lihat per supplier
   - NULL supplier ditampilkan sebagai "Stock Awal" atau "Tanpa Supplier"

## UI/UX Guidelines

### Stock Display
```
Seragam SD - Merah, Size M
┌─────────────────────────────────┐
│ Supplier A        :    40 pcs   │
│ Supplier B        :    30 pcs   │
│ Stock Awal        :    20 pcs   │
├─────────────────────────────────┤
│ Total             :    90 pcs   │
└─────────────────────────────────┘
```

### Stock Out Modal
```
Stock Keluar - Seragam SD Merah M

Pilih dari Supplier:
┌─────────────────────────────────┐
│ ☑ Supplier A  [  10  ] / 40 pcs │
│ ☑ Supplier B  [   5  ] / 30 pcs │
│ ☐ Stock Awal  [   0  ] / 20 pcs │
└─────────────────────────────────┘

Total Keluar: 15 pcs
Alasan: [Penjualan ke TK A        ]

[Batal] [✓ Proses Stock Keluar]
```

## Troubleshooting

### Issue: Stock tidak berkurang setelah keluar
**Solusi:** Check apakah transaction created dengan qty_delta negatif

### Issue: Supplier tidak muncul di list
**Solusi:** 
1. Pastikan supplier is_active = true
2. Check apakah ada stock dengan supplier tersebut (SUM qty_delta > 0)

### Issue: Total stock tidak match dengan stock fisik
**Solusi:**
1. Create adjustment transaction
2. Use txn_type = 'adjustment'
3. Bisa positive atau negative
4. Supplier_id sesuai supplier yang disesuaikan

## Future Enhancements

1. **FIFO Automation:** Auto-pilih supplier tertua saat stock keluar
2. **Stock Opname:** Halaman untuk stock taking dan adjustment
3. **Supplier Report:** Laporan performa per supplier (kualitas, kecepatan)
4. **Low Stock Alert:** Notifikasi jika stock dari supplier tertentu menipis
5. **Batch/Lot Tracking:** Track batch number dari supplier (lebih detail)

## Testing Checklist

- [ ] Purchase Order → Receipt → Stock Transaction memiliki supplier_id
- [ ] Input Initial Stock dengan supplier
- [ ] Input Initial Stock tanpa supplier (NULL)
- [ ] Stock Out: pilih satu supplier
- [ ] Stock Out: pilih multiple suppliers
- [ ] Stock Out: qty tidak boleh exceed available
- [ ] Query stock per supplier menampilkan dengan benar
- [ ] Menu muncul di sidebar untuk role yang sesuai
- [ ] Migration berjalan tanpa error

## Related Files

### Migrations
- `/migrations/add-supplier-to-stock-txn.sql`
- `/migrations/add-stock-management-menus.sql`

### Pages
- `/src/app/stock/uniform/add/page.jsx` (updated)
- `/src/app/stock/uniform/initial/page.jsx` (new)
- `/src/app/sales/uniform/stock-out/page.jsx` (new)

### Database Tables
- `uniform_stock_txn` (modified - added supplier_id)
- `uniform_supplier` (existing)
- `uniform_purchase` (existing)

## Support

Untuk pertanyaan atau issue, refer ke:
- MAIN_DOCUMENTATION.md (uniform stock section)
- Database schema di Supabase
- Code comments di page files
