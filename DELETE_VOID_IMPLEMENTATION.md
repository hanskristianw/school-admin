# Delete & Void Purchase Order Implementation

## Overview
Implementasi fitur untuk menghapus dan membatalkan purchase order seragam dengan dua mekanisme berbeda:
- **Opsi 1 (Delete)**: Hapus pesanan draft (belum ada dampak stok)
- **Opsi 2 (Void/Cancel)**: Batalkan pesanan posted dengan reversal stok otomatis

## Database Changes

### Migration: `add-void-status-to-purchase.sql`
```sql
ALTER TABLE uniform_purchase 
ADD COLUMN IF NOT EXISTS is_voided BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS voided_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS voided_by TEXT,
ADD COLUMN IF NOT EXISTS void_reason TEXT;
```

**Jalankan migration:**
```bash
psql $env:DATABASE_URL -f migrations/add-void-status-to-purchase.sql
```

## Frontend Implementation

### File: `/src/app/stock/uniform/add/page.jsx`

#### 1. State Management
```javascript
const [showVoidModal, setShowVoidModal] = useState(false)
const [voidingPurchase, setVoidingPurchase] = useState(null)
const [voidReason, setVoidReason] = useState('')
```

#### 2. Delete Draft Function
**Untuk pesanan status = 'draft'**
- Validasi status harus draft
- Hapus cascade: purchase_item → purchase
- Tidak ada dampak ke stok
- Refresh pending list

```javascript
const deleteDraftPurchase = async (purchaseId) => {
  // Konfirmasi user
  // Cek status = 'draft'
  // Delete items & purchase
  // Refresh data
}
```

**Tombol di tab "Terima Barang":**
```jsx
<button onClick={() => deleteDraftPurchase(p.purchase_id)}>
  🗑️ Hapus
</button>
```

#### 3. Void Posted Function
**Untuk pesanan status = 'posted'**
- Validasi status bukan draft
- Query semua receipt items
- Buat reverse transactions (qty_delta negatif)
- Update purchase: is_voided = true
- Refresh completed list

```javascript
const voidPurchase = async () => {
  // Validasi alasan diisi
  // Query receipt items
  // Buat reverse stock transactions
  // Mark as voided
  // Refresh data
}
```

**Tombol di tab "Transaksi Selesai":**
```jsx
<button onClick={() => { setVoidingPurchase(p); setShowVoidModal(true) }}>
  ⚠️ Batalkan
</button>
```

#### 4. Void Reason Modal
Modal untuk input alasan pembatalan:
- Field wajib diisi
- Menampilkan detail pesanan
- Warning tentang reversal stok
- Konfirmasi pembatalan

## Business Rules

### Delete (Draft Orders)
✅ **Allowed:**
- Status = 'draft'
- Belum ada penerimaan barang
- Belum ada dampak stok

❌ **Not Allowed:**
- Status = 'posted'
- Sudah ada receipt

### Void (Posted Orders)
✅ **Allowed:**
- Status = 'posted'
- Alasan pembatalan wajib diisi
- Auto-reversal stok

❌ **Not Allowed:**
- Status = 'draft' (gunakan delete)
- Already voided

## Stock Reversal Mechanism

Ketika void posted order:
1. Query semua `uniform_receipt_item` untuk purchase tersebut
2. Untuk setiap item yang sudah diterima (qty_received > 0):
   ```sql
   INSERT INTO uniform_stock_txn (
     uniform_id,
     size_id,
     supplier_id,
     txn_type,
     qty_delta,
     notes
   ) VALUES (
     item.uniform_id,
     item.size_id,
     item.supplier_id,
     'adjust',
     -item.qty_received,  -- Negative untuk reversal
     'Pembatalan Pesanan #123: Alasan...'
   )
   ```
3. Stok akan berkurang sesuai jumlah yang sudah diterima
4. Audit trail lengkap tersimpan

## UI/UX Flow

### Tab "Terima Barang" (Pending Orders)
| # | Tanggal | Supplier | Unit | Invoice | Aksi | Kelola |
|---|---------|----------|------|---------|------|--------|
| #1 | ... | ... | ... | ... | Terima Barang | 🗑️ Hapus |

### Tab "Transaksi Selesai" (Posted Orders)
| # | Tanggal | Supplier | Unit | Invoice | Aksi | Kelola |
|---|---------|----------|------|---------|------|--------|
| #1 | ... | ... | ... | ... | Lihat Detail | ⚠️ Batalkan |

### Void Modal
```
⚠️ Batalkan Pesanan
━━━━━━━━━━━━━━━━━━━━━━━━━━━
Pesanan: #123
Supplier: ABC Supplier
Tanggal: 2026-01-22
⚠️ Perhatian: Pembatalan akan mengembalikan stok yang sudah diterima.

Alasan Pembatalan *
[                                    ]
[  textarea untuk input alasan      ]
[                                    ]

              [ Batal ]  [ ⚠️ Ya, Batalkan Pesanan ]
```

## Safety Features

1. **Konfirmasi Delete**: Alert konfirmasi sebelum hapus
2. **Status Validation**: Cek status sebelum delete/void
3. **Required Reason**: Alasan void wajib diisi
4. **Atomic Operations**: Semua perubahan dalam satu transaction
5. **Audit Trail**: Simpan void_reason, voided_at, voided_by
6. **Stock Accuracy**: Reversal otomatis pastikan stok akurat
7. **Filter Voided**: Query exclude is_voided = true

## Error Handling

| Scenario | Action |
|----------|--------|
| Delete non-draft | Alert: "Hanya pesanan draft yang bisa dihapus" |
| Void draft | Alert: "Pesanan draft sebaiknya dihapus" |
| Void already voided | Alert: "Pesanan ini sudah dibatalkan" |
| Empty void reason | Alert: "Alasan pembatalan harus diisi" |
| Database error | Alert: "Gagal ... : [error message]" |

## Testing Checklist

- [ ] Jalankan migration add-void-status-to-purchase.sql
- [ ] Test delete draft order (should remove from list)
- [ ] Test void posted order (should ask for reason)
- [ ] Verify stock reversal after void
- [ ] Check voided orders excluded from completed list
- [ ] Test error: try to delete posted order
- [ ] Test error: try to void draft order
- [ ] Test error: submit void without reason
- [ ] Verify audit trail (voided_at, voided_by, void_reason)
- [ ] Check success messages display correctly

## Notes

- **Soft Delete**: Voided orders tetap ada di database (is_voided = true)
- **Restore**: Tidak ada fitur restore untuk voided orders
- **History**: Voided orders bisa di-query dengan filter is_voided = true
- **Reports**: Laporan harus mempertimbangkan voided orders

## Future Enhancements

1. Tab "Voided Orders" untuk lihat history pembatalan
2. Fitur restore voided orders (dengan approval)
3. Bulk void untuk multiple orders
4. Export voided orders untuk audit
5. Permission-based void (hanya admin/manager)
