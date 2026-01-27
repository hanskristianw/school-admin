# Fitur Tanggal Pengambilan Seragam

## Overview
Fitur untuk mencatat kapan seragam diambil oleh siswa/orang tua setelah transaksi dibayar.

## Database Schema

### Kolom Baru di `uniform_sale`
```sql
pickup_date DATE NULL
```
- **NULL**: Seragam belum diambil
- **Filled**: Tanggal seragam sudah diambil

### Migration File
`migrations/add-pickup-date-to-uniform-sale.sql`

## Fitur UI

### 1. Tab History - Tampilan Pickup Date
- Menampilkan badge hijau dengan tanggal pengambilan jika sudah diambil:
  ```
  ✅ Diambil: 27 Jan 2026
  ```
- Untuk transaksi yang belum diambil, tidak menampilkan badge

### 2. Button "Tandai Diambil"
- **Kondisi**: Muncul untuk transaksi dengan status `paid` yang belum memiliki `pickup_date`
- **Warna**: Purple (bg-purple-600)
- **Icon**: 📦
- **Lokasi**: Tab History, di sebelah button "Cetak Kwitansi"

### 3. Modal Pickup Date
- **Judul**: 📦 Tandai Seragam Diambil
- **Input**: Date picker (max: hari ini)
- **Validasi**: Tanggal harus diisi
- **Action**: Menyimpan pickup_date ke database

### 4. Tab Laporan Penjualan
- **Kolom baru**: "Diambil"
- **Tampilan**: 
  - Jika sudah diambil: `✓ 27 Jan` (warna hijau)
  - Jika belum: `-` (abu-abu)

### 5. Excel Export
- Kolom "Tgl Diambil" ditambahkan di sheet "Detail Penjualan"
- Format: `27 Jan 2026` atau `-` jika belum diambil

## Flow Penggunaan

1. **Transaksi Dibuat** → Status: Pending, Pickup: NULL
2. **Mark Paid** → Status: Paid, Pickup: NULL (Button "Tandai Diambil" muncul)
3. **Tandai Diambil** → Status: Paid, Pickup: [Date] (Badge hijau muncul)

## States yang Ditambahkan

```javascript
const [showPickupModal, setShowPickupModal] = useState(false)
const [selectedSaleForPickup, setSelectedSaleForPickup] = useState(null)
const [pickupDate, setPickupDate] = useState(new Date().toISOString().slice(0, 10))
const [markingPickup, setMarkingPickup] = useState(false)
```

## Function yang Ditambahkan

```javascript
const handleMarkAsPickedUp = async () => {
  // Update pickup_date di database
  // Refresh history
  // Show success message
}
```

## Query Updates

### fetchSalesHistory
```javascript
.select('..., pickup_date')
```

### fetchSalesReport
```javascript
.select('..., pickup_date')
```

## UI Components

### Badge Display (History Tab)
```jsx
{sale.pickup_date && (
  <div className="flex items-center gap-2 text-green-700 bg-green-50 px-2 py-1 rounded inline-block">
    <span>✅</span>
    <span>Diambil: {formattedDate}</span>
  </div>
)}
```

### Button Tandai Diambil
```jsx
{sale.status === 'paid' && !sale.is_voided && !sale.pickup_date && (
  <Button onClick={openPickupModal}>
    📦 Tandai Diambil
  </Button>
)}
```

### Report Table Column
```jsx
<td className="py-3 px-3 text-center">
  {sale.pickup_date ? (
    <span className="text-xs text-green-700 font-medium">
      ✓ {formattedDate}
    </span>
  ) : (
    <span className="text-xs text-gray-400">-</span>
  )}
</td>
```

## Benefits
1. ✅ Tracking lengkap dari pemesanan hingga pengambilan
2. ✅ Mengetahui transaksi yang sudah dibayar tapi belum diambil
3. ✅ Data untuk analisis waktu pengambilan seragam
4. ✅ Bukti administrasi pengambilan barang
