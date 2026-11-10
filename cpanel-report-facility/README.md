# Portal Pelaporan Keluhan & Fasilitas (QR General) — cPanel Hostinger Deployment

Aplikasi web standalone berbasis PHP ini dipasang di hosting Hostinger Chung Chung Christian School (`ccs.sch.id`), berfungsi sebagai **Portal Pelapor (QR General)** ketika warga sekolah/tamu memindai QR Code pelaporan keluhan fasilitas.

---

## 📁 Struktur Direktori
```
cpanel-report-facility/
├── config.php          # Konfigurasi token keamanan dan URL API Next.js
├── config.sample.php   # Contoh konfigurasi cadangan
├── index.php           # Aplikasi utama Pelapor (Upload foto kondisi wajib, deskripsi wajib, nama opsional)
├── uploads/            # Otomatis dibuat saat upload pertama (dilengkapi .htaccess & index.html)
└── README.md           # Panduan deployment ini
```

---

## 🚀 Panduan Pemasangan di Hostinger cPanel (`/reportfacility`)

1. **Buka File Manager Hostinger (`public_html`)**:
   - Masuk ke dashboard Hostinger cPanel / hPanel sekolah `ccs.sch.id`.
   - Buka direktori `public_html/`.

2. **Buat Folder Baru**:
   - Buat sub-folder bernama:
     ```
     reportfacility
     ```
     *(Sehingga URL publiknya adalah `https://ccs.sch.id/reportfacility` atau `https://ccs.sch.id/reportfacility/`)*.

3. **Unggah File**:
   - Unggah kedua file dari folder `cpanel-report-facility/` ini ke dalam `public_html/reportfacility/`:
     - `index.php`
     - `config.php`
   - Folder `uploads/` beserta proteksi `.htaccess` akan otomatis dibuat oleh `index.php`.

4. **Alur Pelapor**:
   - Pelapor memindai QR Code General (`https://ccs.sch.id/reportfacility`).
   - **Foto Kondisi** (Wajib) + **Deskripsi Keluhan** (Wajib) + **Nama Pelapor** (Opsional / Bisa Anonim).
   - Data dan foto otomatis masuk ke tab **Laporan & Komplain Pelapor** di `manageccs.online/data/vendor-checklist`.
