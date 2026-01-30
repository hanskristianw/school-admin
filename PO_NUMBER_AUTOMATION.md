# Sistem Penomoran PO Otomatis

## Overview
Sistem penomoran Purchase Order (PO) otomatis untuk pembelian seragam menggunakan format:
```
PO/CCS/{Bulan Romawi}/{Tahun 2 digit}/{Nomor urut 4 digit}
```

**Contoh:** `PO/CCS/I/26/0001`

## Features
- ✅ Auto-generate PO number saat membuat pesanan baru
- ✅ Format standar dengan bulan romawi dan tahun
- ✅ Sequence continuous (tidak restart otomatis per bulan)
- ✅ Manual reset capability untuk academic year
- ✅ Display PO number di history table
- ✅ Print PO dengan nomor otomatis

## Database Schema

### Table: `uniform_po_settings`
Settings table untuk penomoran PO (singleton pattern - hanya 1 row dengan id=1).

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER PRIMARY KEY | Always 1 (enforced by CHECK constraint) |
| last_sequence | INTEGER NOT NULL | Nomor urut terakhir yang digunakan |
| last_reset_date | DATE | Tanggal terakhir counter direset |
| prefix | TEXT NOT NULL | Prefix PO number (default: 'PO/CCS') |
| notes | TEXT | Catatan |
| created_at | TIMESTAMP | Waktu dibuat |
| updated_at | TIMESTAMP | Waktu update terakhir |

**Constraints:**
- `only_one_row CHECK (id = 1)` - Hanya boleh 1 row

### Table: `uniform_purchase`
Updated dengan kolom `po_number`.

**New Column:**
- `po_number TEXT` - Nomor PO otomatis (unique)

**Constraints:**
- `uniform_purchase_po_number_unique UNIQUE (po_number)`

**Index:**
- `idx_uniform_purchase_po_number` untuk fast lookup

## Migration

File: `migrations/add-po-number-system.sql`

**Langkah Eksekusi:**
1. Backup database (recommended)
2. Jalankan migration:
   ```bash
   psql -U [username] -d [database] -f migrations/add-po-number-system.sql
   ```
3. Verifikasi:
   ```sql
   SELECT * FROM uniform_po_settings;
   ```

**Expected Result:**
```
 id | last_sequence | last_reset_date |  prefix  |            notes             |     created_at      |     updated_at      
----+---------------+-----------------+----------+-----------------------------+---------------------+---------------------
  1 |             0 |                 | PO/CCS   | Initial setup - PO numbering | 2026-01-30 ...     | 2026-01-30 ...
```

## Frontend Implementation

### Function: `generatePONumber()`
Location: `src/app/stock/uniform/add/page.jsx`

```javascript
const generatePONumber = async (poDate) => {
  // Get current sequence from settings
  const { data: settings } = await supabase
    .from('uniform_po_settings')
    .select('last_sequence, prefix')
    .eq('id', 1)
    .single()
  
  const newSequence = (settings?.last_sequence || 0) + 1
  
  // Format: PO/CCS/I/26/0001
  const monthRoman = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII']
  const date = new Date(poDate)
  const month = monthRoman[date.getMonth()]
  const year = String(date.getFullYear()).slice(-2)
  const seq = String(newSequence).padStart(4, '0')
  const prefix = settings?.prefix || 'PO/CCS'
  
  return {
    poNumber: `${prefix}/${month}/${year}/${seq}`,
    sequence: newSequence
  }
}
```

### Integration Points

**1. Create PO (save function):**
```javascript
const save = async () => {
  // Generate PO number
  const { poNumber, sequence } = await generatePONumber(purchaseDate)
  
  // Insert purchase with po_number
  const { data: header } = await supabase
    .from('uniform_purchase')
    .insert([{ 
      ..., 
      po_number: poNumber 
    }])
  
  // Update sequence
  await supabase
    .from('uniform_po_settings')
    .update({ 
      last_sequence: sequence,
      updated_at: new Date().toISOString()
    })
    .eq('id', 1)
}
```

**2. Display PO Number:**
- History table: Shows PO number in dedicated column
- PO Modal: Uses `purchase.po_number` for printing

**3. POModal Component:**
Updated to display `purchase.po_number` with fallback:
```javascript
{purchase.po_number || `PO/CCS/-/-/${String(purchase.purchase_id).padStart(4, '0')}`}
```

## Manual Reset Procedure

### Via Admin UI (Recommended)

Akses halaman **Pengaturan Nomor PO** melalui:
1. Buka `/stock/uniform/add`
2. Klik button **⚙️ Pengaturan Nomor PO** di pojok kanan atas
3. Atau langsung akses: `/stock/uniform/po-settings`

**Fitur yang Tersedia:**
- ✅ View current PO settings (sequence, prefix, last reset date)
- ✅ Edit last_sequence secara manual
- ✅ Edit prefix untuk custom format
- ✅ Reset counter dengan konfirmasi
- ✅ Tambah catatan untuk audit

**Langkah Reset via UI:**
1. Klik button **🔄 Reset Counter**
2. Masukkan nilai reset (contoh: 0 untuk mulai dari awal)
3. Tambahkan catatan (contoh: "Reset untuk tahun ajaran 2026/2027")
4. Klik **Reset Sekarang**
5. PO berikutnya akan menggunakan sequence = nilai reset + 1

### Via SQL (Alternative)

Untuk mereset counter di awal tahun ajaran:

```sql
-- Option 1: Reset to 0
UPDATE uniform_po_settings 
SET 
  last_sequence = 0,
  last_reset_date = CURRENT_DATE,
  notes = 'Reset for Academic Year 2026/2027'
WHERE id = 1;

-- Option 2: Reset to specific number
UPDATE uniform_po_settings 
SET 
  last_sequence = 1000,
  last_reset_date = CURRENT_DATE,
  notes = 'Reset at 1000 for AY 2026/2027'
WHERE id = 1;
```

## Format Examples

| Tanggal Order | PO Number | Keterangan |
|---------------|-----------|------------|
| 15 Jan 2026 | PO/CCS/I/26/0001 | PO pertama di sequence |
| 20 Feb 2026 | PO/CCS/II/26/0002 | Bulan berubah, sequence lanjut |
| 5 Mar 2026 | PO/CCS/III/26/0003 | Continuous |
| 1 Dec 2026 | PO/CCS/XII/26/0125 | Akhir tahun |
| 10 Jan 2027 | PO/CCS/I/27/0126 | Tahun berubah, sequence lanjut (belum direset) |

## Race Condition Handling

Sistem ini vulnerable terhadap race condition jika 2 user membuat PO bersamaan. Solusi:

**Short term:** Acceptable risk (jarang terjadi)

**Future enhancement:** Use PostgreSQL transaction dengan row-level lock:
```sql
BEGIN;
SELECT last_sequence FROM uniform_po_settings WHERE id = 1 FOR UPDATE;
-- Generate PO number
UPDATE uniform_po_settings SET last_sequence = ... WHERE id = 1;
INSERT INTO uniform_purchase ...
COMMIT;
```

## Testing Checklist

- [ ] Migration executed successfully
- [ ] `uniform_po_settings` table created with id=1 row
- [ ] Create new PO generates auto PO number
- [ ] PO number format matches PO/CCS/I/26/0001
- [ ] PO number displayed in history table
- [ ] PO print shows correct PO number
- [ ] Sequence increments correctly
- [ ] Manual reset works

## Related Files

| File | Purpose |
|------|---------|
| `migrations/add-po-number-system.sql` | Database migration |
| `SUPPLIER SERAGAM STOCK.md` | Schema documentation |
| `src/app/stock/uniform/add/page.jsx` | PO creation page with auto-numbering |
| `src/app/stock/uniform/po-settings/page.jsx` | **Admin UI untuk manage PO settings** |
| `src/components/POModal.jsx` | PO print component |

## Future Enhancements

1. ~~**Admin UI untuk reset counter:**~~ ✅ **COMPLETED**
   - ✅ Settings page `/stock/uniform/po-settings`
   - ✅ Manual reset button dengan confirmation
   - ✅ Edit last_sequence dan prefix
   - ✅ Display next PO number preview

2. **Multiple PO types:**
   - Book PO: `PO/BOOK/...`
   - Equipment PO: `PO/EQUIP/...`
   - Use prefix field to differentiate

3. **Auto-reset per academic year:**
   - Detect academic year change (June/July)
   - Optional auto-reset configuration

4. **Audit log:**
   - Track PO number generation
   - Track manual resets
   - Track sequence updates

## Support

For questions or issues, contact development team or refer to:
- Main Documentation: `MAIN_DOCUMENTATION.md`
- Supplier Stock: `SUPPLIER SERAGAM STOCK.md`
