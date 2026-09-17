# Panduan Pemasangan: Sistem Persewaan Lapangan CCS di cPanel / Hostinger

File `index.php` di dalam folder ini adalah aplikasi mandiri (*All-in-One Standalone*) berbasis **PHP dan HTML5**. 
Aplikasi ini sudah dilengkapi dengan sistem database otomatis (SQLite bawaan PHP), antarmuka modern yang responsif di HP/komputer, proteksi keamanan, dan panel admin internal.

---

## 🚀 Cara Pemasangan di cPanel / Hostinger (Sangat Mudah)

### Opsi A: Menggunakan Folder Khusus (Direkomendasikan)
Contoh URL hasil: `https://namadomainsekolah.sch.id/sewa-lapangan/`

1. Buka **cPanel** atau **hPanel Hostinger** sekolah Anda.
2. Masuk ke menu **File Manager** (Pengelola File).
3. Buka direktori **`public_html`**.
4. Buat folder baru dengan nama: **`sewa-lapangan`**.
5. Masuk ke dalam folder `sewa-lapangan` tersebut, lalu **Upload** file `index.php` ke dalamnya.
6. **Selesai!** 
   - Halaman formulir publik langsung bisa dibuka di:  
     👉 `https://namadomainsekolah.sch.id/sewa-lapangan/`

---

### Opsi B: Sebagai File Tunggal
Contoh URL hasil: `https://namadomainsekolah.sch.id/sewa-lapangan.php`

1. Buka **File Manager** -> **`public_html`**.
2. Rename file `index.php` menjadi `sewa-lapangan.php`, lalu upload langsung ke dalam `public_html`.
3. Halaman dapat diakses di:  
   👉 `https://namadomainsekolah.sch.id/sewa-lapangan.php`

---

## ⚙️ Apa yang Terjadi Saat File Pertama Kali Dibuka?

Begitu file `index.php` diakses pertama kali di browser, sistem PHP akan secara otomatis:
1. Membuat folder **`data/`** dan mengisinya dengan file database SQLite `sewa_lapangan.db`.
2. Membuat folder **`uploads/`** sebagai tempat penyimpanan foto bukti transfer penyewa.
3. Membuat file keamanan **`.htaccess`** di dalam folder `data` dan `uploads` sehingga database tidak bisa di-download sembarangan oleh publik dan script berbahaya tidak bisa dijalankan di folder uploads.

> *Catatan:* Jika server cPanel Anda meminta izin folder, pastikan izin (permission) folder adalah `755` (standar default cPanel).

---

## 🔐 Cara Mengakses Panel Admin Petugas Lapangan

Petugas atau staf admin sekolah dapat melihat daftar pemesanan dan bukti transfer tanpa perlu setup tambahan:

1. Buka URL:  
   👉 `https://namadomainsekolah.sch.id/sewa-lapangan/?admin=1`
2. Masukkan password default:  
   **`adminccs2026`**
3. Di dalam panel admin ini, staf dapat:
   - Melihat semua pesanan sewa yang masuk beserta rincian kontak pemesan.
   - Melihat foto bukti transfer yang diunggah penyewa.
   - Mengubah status pesanan (*Menunggu Bayar*, *Perlu Verifikasi*, *Disetujui*, *Ditolak*, *Selesai*).
   - Menghubungi penyewa langsung via WhatsApp dengan tombol **"Chat WA"** (pesan konfirmasi sudah otomatis terketik rapi).
   - Menambahkan **Jadwal Kegiatan Sekolah (Blackout Dates)**: Jika ada kegiatan sekolah mendadak, admin tinggal masukkan tanggalnya di panel ini, maka tanggal/slot tersebut **otomatis tidak akan muncul / tidak bisa dipilih** oleh penyewa di website booking.

---

## 🛠️ Pengaturan & Kustomisasi (Opsional)

Jika Anda ingin mengubah password admin, nomor rekening, atau kontak person, buka file `index.php` menggunakan fitur **Edit** di cPanel File Manager, lalu sesuaikan di bagian paling atas (baris 11-16):

```php
define('APP_NAME', 'Persewaan Lapangan CCS');
define('ORG_NAME', 'Yayasan Pendidikan Mayapada');
define('BANK_NAME', 'Bank Mayapada');
define('BANK_REK', '100-3000-3853');
define('BANK_AN', 'Yayasan Pendidikan Mayapada');
define('CONTACT_PERSON', '+62 859-5986-0430');
define('ADMIN_PASS', 'adminccs2026'); // Ganti password admin di sini
```

---

## ✨ Fitur-fitur Lengkap yang Tersedia di Halaman Ini

1. **Pilihan Paket Sesuai Price List Resmi**:
   - **Paket 1**: Rp 550.000 / 2 jam (Sport hall, Lampu, AC 2 unit)
   - **Paket 2**: Rp 350.000 / 2 jam (Sport hall, Lampu, Tanpa AC)
2. **Pilihan Slot Jam Realtime (Sesi 2 Jam)**:
   - Senin–Jumat (di luar jam sekolah): `16:00 - 18:00`, `18:00 - 20:00`, `20:00 - 22:00`
   - Sabtu & Minggu: Sesi Pagi, Siang/Sore, dan Malam.
   - Slot yang sudah dipesan otomatis bertuliskan **"Sudah Dipesan"** dan tidak bisa diklik.
3. **15 Poin Ketentuan Sewa Lapangan**:
   - Denda kebersihan Rp 50.000, larangan merokok, ganti rugi kerusakan, aturan email, jam operasional Senin–Jumat 08.00–16.00, dll.
   - Dilengkapi checkbox wajib persetujuan sebelum mengirimkan permohonan.
4. **Instruksi Transfer Otomatis**:
   - Memberikan Kode Booking unik (misal: `CCS-260918-A1B2`).
   - Berita transfer wajib: `KodeBooking_NamaPenyewa`.
   - Tombol satu klik untuk **Salin Nomor Rekening**.
5. **Upload Bukti Transfer**:
   - Form upload foto struk transfer langsung di layar konfirmasi (mendukung JPG, PNG, WEBP, PDF).
6. **Menu "Cek Status Booking"**:
   - Penyewa yang belum sempat upload bukti bayar bisa mengecek status kapan saja menggunakan Kode Booking mereka dan mengunggah buktinya di sana.
