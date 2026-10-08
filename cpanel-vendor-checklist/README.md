# Sistem Checklist Kebersihan Ruangan Vendor (cPanel Hostinger Deployment)

Aplikasi web standalone berbasis PHP ini dipasang di hosting Hostinger Chung Chung Christian School (`ccs.sch.id`), berfungsi sebagai portal mobile bagi petugas vendor kebersihan saat melakukan scan QR code pintu ruangan.

---

## 📁 Struktur Direktori
```
cpanel-vendor-checklist/
├── config.php          # Konfigurasi token keamanan dan URL API Next.js
├── config.sample.php   # Contoh konfigurasi cadangan
├── index.php           # Aplikasi utama (Mobile UI, camera capture, upload, proxy)
├── uploads/            # Direktori penyimpanan foto (Before, After, Revision)
│   ├── .htaccess       # Proteksi keamanan (mencegah eksekusi script)
│   └── index.html      # 403 Forbidden default
└── README.md           # Panduan deployment ini
```

---

## 🚀 Panduan Pemasangan di Hostinger cPanel

1. **Buka File Manager Hostinger (`public_html`)**:
   - Masuk ke dashboard Hostinger cPanel / hPanel sekolah `ccs.sch.id`.
   - Buka direktori `public_html/`.

2. **Buat Folder Baru**:
   - Buat sub-folder bernama:
     ```
     checklist
     ```
     *(Sehingga URL publiknya adalah `https://ccs.sch.id/checklist/`)*.

3. **Unggah File**:
   - Unggah file berikut ke dalam folder `public_html/checklist/`:
     - `index.php`
     - `config.php`
     - Folder `uploads/` (atau biarkan otomatis dibuat oleh script PHP saat upload pertama).

4. **Verifikasi Izin Folder (Permissions)**:
   - Pastikan folder `public_html/checklist/uploads/` memiliki permission **755** atau **775** agar PHP dapat menyimpan file foto.

5. **Pengaturan Token `config.php`**:
   - Pastikan token di `config.php`:
     ```php
     define('API_SECRET_TOKEN', 'ccs_vendor_auth_2026_v9x2k7p4');
     define('NEXTJS_API_URL', 'https://www.manageccs.online/api/public/vendor-checklist');
     ```
   - Token ini sama dengan environment variable `VENDOR_CHECKLIST_SECRET_KEY` di server Next.js.

---

## 🔍 Alur Kerja Petugas (Mobile UI)

1. Petugas vendor memindai QR code di pintu ruangan:
   - URL: `https://ccs.sch.id/checklist/?room=rm_xxxxxxxx`
2. **Nama Petugas Tersimpan Otomatis**:
   - Petugas hanya perlu mengetik nama sekali. Browser HP menyimpannya di `localStorage` sehingga ruangan berikutnya otomatis terisi.
3. **Tahap 1 (Mulai Bersihkan)**:
   - Petugas mengambil foto kondisi sebelum dibersihkan (**Foto Before**).
   - Foto otomatis dikompresi di browser (canvas ~300KB) agar hemat kuota dan upload cepat.
   - Status ruangan berubah menjadi `Sedang Dikerjakan` (`in_progress`) dengan timestamp mulai.
4. **Tahap 2 (Selesai)**:
   - Setelah membersihkan, petugas mengambil foto hasil ruangan (**Foto After**).
   - Klik **Selesai & Kirim**.
   - Status berubah menjadi `Menunggu Review` (`pending_review`).
5. **Tahap Revisi (Jika Diminta Supervisor)**:
   - Jika supervisor meminta revisi, petugas memindai ulang QR code, melihat instruksi perbaikan dari supervisor, mengambil foto perbaikan revisi, dan mengirim ulang.
