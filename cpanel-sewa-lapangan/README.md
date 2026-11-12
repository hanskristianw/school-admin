# Panduan Pemasangan: Sistem Persewaan Lapangan CCS di cPanel / Hostinger

File `index.php` dan `config.php` di dalam folder ini adalah portal publik **Sewa Lapangan (Sport Hall CCS)** yang terhubung langsung (**100% Real-Time**) ke database **Supabase** melalui API aplikasi utama (`manageccs.online`), dengan pola yang sama seperti sistem *Vendor Checklist* dan *Report Facility*.

Server **Hostinger / cPanel** hanya digunakan untuk:
1. Menampilkan antarmuka formulir publik (`https://ccs.sch.id/sewa-lapangan`).
2. Menyimpan file fisik bukti transfer (`JPG`, `PNG`, `WEBP`, `PDF`) di dalam folder terproteksi `uploads/`.

Seluruh data pemesanan (`court_rentals`) dan penutupan jadwal kegiatan sekolah (`court_blackout_dates`) disimpan terpusat di **Supabase** (tanpa SQLite lokal).

---

## Cara Pemasangan di cPanel / Hostinger

1. Buka **File Manager** di Hostinger / cPanel -> masuk ke **`public_html/sewa-lapangan/`**.
2. Upload file **`index.php`** dan **`config.php`** ke dalam folder tersebut.
3. Saat diakses pertama kali, sistem otomatis membuat folder **`uploads/`** beserta `.htaccess` (`Deny from all`) sehingga file bukti transfer aman dari akses publik dan hanya dapat di-*stream* oleh dashboard Admin Next.js (`/data/court-rental`) menggunakan `API_SECRET_TOKEN`.
