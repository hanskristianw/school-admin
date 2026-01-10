# Multi-Unit Purchase Order Feature

## Overview
Feature ini memungkinkan pembuatan Purchase Order (PO) yang bisa mencakup item dari berbeda unit dalam satu transaksi. Berguna ketika memesan ke supplier yang sama untuk beberapa unit sekaligus (misal: baju TK + baju SD dalam 1 PO).

## Database Changes

### Migration: `add-unit-to-uniform-purchase-item.sql`

**Perubahan Schema:**
- Menambahkan kolom `unit_id` ke tabel `uniform_purchase_item`
- Menambahkan foreign key constraint ke tabel `unit`
- Migrasi data dari `uniform_purchase.unit_id` ke level item
- Set `unit_id` NOT NULL

**Cara Apply Migration:**
```sql
-- Jalankan file: /migrations/add-unit-to-uniform-purchase-item.sql
-- di Supabase SQL Editor atau psql
```

**Impact:**
- ✅ Memungkinkan setiap item dalam PO memiliki unit berbeda
- ✅ Data existing akan di-migrate otomatis
- ⚠️ `uniform_purchase.unit_id` tetap ada untuk backward compatibility (akan berisi unit dari item pertama)

## UI/UX Changes

### Halaman: `/stock/uniform/add`

#### 1. Tab "Receive" (Terima Barang)

**Perubahan:**
- ✅ Query tidak lagi filter by `unit_id` (load semua pending orders)
- ✅ Kolom **Unit** ditambahkan dengan badge untuk menampilkan unit per PO
- ✅ Auto-load saat switch ke tab ini
- ✅ Refresh button tidak perlu parameter unit

**Tampilan:**
- Table menampilkan badge unit (bisa multiple jika PO multi-unit)
- Badge: `<span className="bg-blue-100 text-blue-800">TK</span>`

#### 2. Tab "History" (Riwayat Transaksi Selesai)

**Perubahan:**
- ✅ Query tidak lagi filter by `unit_id` (load semua completed orders)
- ✅ Kolom **Unit** ditambahkan dengan badge untuk menampilkan unit per PO
- ✅ Auto-load saat switch ke tab ini
- ✅ Refresh button tidak perlu parameter unit

**Tampilan:**
- Table menampilkan badge unit (bisa multiple jika PO multi-unit)
- Format sama dengan tab Receive

#### 3. Step 2 - Item Yang Dipesan

**Sebelum:**
- Unit dipilih sekali di level header PO
- Semua item dalam PO otomatis untuk unit yang sama
- Dropdown unit terpisah dari modal add item

**Sesudah:**
- ❌ Tidak ada dropdown unit di level header
- ✅ Unit dipilih per item dalam modal "Tambah Item"
- ✅ Setiap item bisa untuk unit berbeda
- ✅ Info box menjelaskan bahwa PO bisa multi-unit

**Perubahan Visual:**
- Table menampilkan kolom **Unit** dengan badge biru
- Modal "Tambah Item" menampilkan dropdown **Unit** di posisi pertama
- Review (Step 3) menampilkan unit per item dalam table

#### 2. Modal: Tambah Item Baru

**Field Order:**
1. **Unit** (required) - Dropdown list school units
2. **Seragam** (required) - Filtered by selected unit
3. **Ukuran** (required) - Filtered by selected unit
4. **Quantity** (required) - Minimal 1
5. **Harga/Unit** - Optional, auto-filled dari HPP
6. **Update HPP** - Checkbox untuk update master data

**Behavior:**
- Saat pilih unit → load uniforms & sizes untuk unit tersebut
- Saat ganti unit → reset seragam & ukuran
- Saat add item → keep unit selection untuk item berikutnya (convenience)
- Success message muncul 2 detik saat item berhasil ditambahkan

## Technical Implementation

### State Management

```javascript
// New states for caching
const [uniformsByUnit, setUniformsByUnit] = useState({}) // unit_id -> uniforms[]
const [sizesByUnit, setSizesByUnit] = useState({})       // unit_id -> sizes[]

// All uniforms/sizes for display in table
const [uniforms, setUniforms] = useState([])  // All uniforms
const [sizes, setSizes] = useState([])        // All sizes

// Item now includes unit_id
const [items, setItems] = useState([]) 
// Item structure: { unit_id, uniform_id, size_id, qty, unit_cost, update_hpp }
```

### Data Loading Strategy

1. **Initial Load** (on mount):
   - Load ALL uniforms, sizes, variants from all units
   - Cache in `uniforms`, `sizes`, `variants` states
   - Used for displaying in table (items can have different units)

2. **Unit Selection in Modal**:
   - Load uniforms & sizes for selected unit
   - Cache in `uniformsByUnit[unit_id]` and `sizesByUnit[unit_id]`
   - Avoid re-fetching if already cached

3. **Display Logic**:
   - Modal dropdowns use `uniformsByUnit[newItem.unit_id]` and `sizesByUnit[newItem.unit_id]`
   - Table displays use global `uniforms` and `sizes` arrays

4. **Tab Switching** (Auto-load):
   - Switch to "Receive" tab → `loadPending()` called automatically
   - Switch to "History" tab → `loadCompleted()` called automatically
   - All transactions loaded (not filtered by unit) for multi-unit support

### Validation Changes

**validateStep(2) now checks:**
```javascript
for (let i = 0; i < items.length; i++) {
  const it = items[i]
  if (!it.unit_id) missing.push(`Item #${i+1}: Unit belum dipilih`)
  if (!it.uniform_id) missing.push(`Item #${i+1}: Seragam belum dipilih`)
  if (!it.size_id) missing.push(`Item #${i+1}: Ukuran belum dipilih`)
  if (!Number(it.qty) || Number(it.qty) <= 0) missing.push(`Item #${i+1}: Qty harus lebih dari 0`)
}
```

### Save Logic

```javascript
const save = async () => {
  // 1. Create header with first item's unit_id (backward compatibility)
  const firstUnitId = items[0]?.unit_id || unitId
  const { data: header } = await supabase
    .from('uniform_purchase')
    .insert([{ 
      unit_id: Number(firstUnitId), 
      supplier_id, 
      purchase_date, 
      invoice_no, 
      notes, 
      status: 'draft' 
    }])
    .select('purchase_id')
    .single()

  // 2. Upload attachment (if any)
  
  // 3. Insert items with unit_id per item
  const payload = items.map(it => ({ 
    purchase_id: header.purchase_id, 
    unit_id: Number(it.unit_id),      // ← New field
    uniform_id: it.uniform_id, 
    size_id: it.size_id, 
    qty: Number(it.qty), 
    unit_cost: Number(it.unit_cost || 0) 
  }))
  
  await supabase.from('uniform_purchase_item').insert(payload)
}
```

## User Flow

### Creating Multi-Unit Purchase Order

1. **Step 1: Info Pembelian**
   - Pilih supplier
   - Pilih tanggal order
   - (Optional) Invoice number, notes, attachment

2. **Step 2: Tambah Item**
   - Klik "Tambah Item" → Modal muncul
   - **Pilih Unit** (TK, SD, SMP, dll)
   - Pilih Seragam (filtered by unit)
   - Pilih Ukuran (filtered by unit)
   - Input Qty & Harga
   - Klik "Tambahkan" → Success message muncul
   - **Ulangi untuk unit lain jika perlu**
   - Table menampilkan semua item dengan badge unit
   - Klik "Lanjut ke Review"

3. **Step 3: Review & Simpan**
   - Review semua item beserta unit masing-masing
   - Lihat total nilai PO
   - Klik "Simpan Order"

### Example Use Case

**Scenario:** Memesan seragam dari Supplier "Konveksi ABC" untuk 3 unit sekaligus

**Items:**
- TK Putra - Baju Batik - Size S - Qty 20 pcs
- TK Putri - Rok Batik - Size M - Qty 15 pcs
- SD Putra - Baju Olahraga - Size L - Qty 30 pcs
- SD Putri - Celana Olahraga - Size M - Qty 25 pcs

**Benefit:** 
- ✅ Satu PO untuk banyak unit (efisien)
- ✅ Satu invoice dari supplier
- ✅ Tracking lebih mudah

## Testing Checklist

### Before Migration
- [ ] Backup database
- [ ] Test migration script di development/staging dulu

### After Migration
- [ ] Verifikasi data existing masih bisa ditampilkan
- [ ] Test create PO untuk single unit (legacy flow)
- [ ] Test create PO untuk multi unit (new flow)
- [ ] Test validation messages
- [ ] Test modal behavior (unit change resets other fields)
- [ ] Test table display shows correct unit badges
- [ ] Test review step shows all units correctly
- [ ] Test save process (check data di database)
- [ ] Test receive barang flow (pastikan unit_id terbawa ke receive_rows)

### Edge Cases
- [ ] PO dengan 100 items dari 5 unit berbeda
- [ ] PO dengan 1 item (single unit)
- [ ] Ganti unit di tengah add item (reset behavior)
- [ ] Close modal sebelum save item
- [ ] Add item → success → langsung add item lagi

## Common Issues & Solutions

### Issue: "Tab Riwayat Transaksi kosong padahal sudah complete PO"
**Cause:** Fungsi `loadPending` dan `loadCompleted` masih filter berdasarkan `unit_id` dari header (legacy single-unit logic)
**Solution:** ✅ **SUDAH DIPERBAIKI** - Query sekarang load semua transaksi tanpa filter unit, dan auto-load saat switch tab

### Issue: "Uniform not found in dropdown"
**Cause:** Unit selected doesn't have any active uniforms
**Solution:** Check `uniform` table, pastikan ada data dengan `unit_id` yang dipilih dan `is_active = true`

### Issue: "Size not found in dropdown"
**Cause:** Unit selected doesn't have any active sizes
**Solution:** Check `uniform_size` table, pastikan ada data dengan `unit_id` yang dipilih dan `is_active = true`

### Issue: "Data tidak muncul setelah save"
**Cause:** Mungkin tab "Receive" tidak refresh atau unit_id tidak sesuai
**Solution:** 
- Check `uniform_purchase_item` apakah `unit_id` tersimpan
- Reload page untuk clear cache
- Check filter di tab "Receive"

### Issue: "Migration failed: null value in column unit_id"
**Cause:** Ada data di `uniform_purchase` yang tidak punya `unit_id`
**Solution:** 
```sql
-- Before migration, check:
SELECT purchase_id, unit_id FROM uniform_purchase WHERE unit_id IS NULL;

-- Fix null values first:
UPDATE uniform_purchase SET unit_id = 1 WHERE unit_id IS NULL;
```

## Future Enhancements

1. **Bulk Edit Unit**: Allow changing unit for multiple items at once
2. **Copy from Previous PO**: Clone PO structure for recurring orders
3. **Unit Summary**: Show subtotal per unit in review step
4. **Filter by Unit in History**: Filter completed POs by unit
5. **Export PO by Unit**: Generate separate PDF per unit from one PO

## Related Files

- **Migration:** `/migrations/add-unit-to-uniform-purchase-item.sql`
- **Frontend:** `/src/app/stock/uniform/add/page.jsx`
- **Documentation:** This file

## Database Schema Reference

### Before (Old Schema)
```
uniform_purchase (header level)
├─ purchase_id
├─ unit_id              ← Unit di level header
├─ supplier_id
├─ purchase_date
└─ ...

uniform_purchase_item (item level)
├─ item_id
├─ purchase_id
├─ uniform_id
├─ size_id
├─ qty
└─ unit_cost
```

### After (New Schema)
```
uniform_purchase (header level)
├─ purchase_id
├─ unit_id              ← For backward compatibility (first item's unit)
├─ supplier_id
├─ purchase_date
└─ ...

uniform_purchase_item (item level)
├─ item_id
├─ purchase_id
├─ unit_id              ← NEW! Unit per item
├─ uniform_id
├─ size_id
├─ qty
└─ unit_cost
```

## Notes

- `uniform_purchase.unit_id` akan diisi dengan unit dari item pertama (backward compatibility)
- Untuk query yang perlu group by unit, gunakan `uniform_purchase_item.unit_id`
- Tab "Receive" dan "History" perlu diupdate untuk support multi-unit di future iteration
