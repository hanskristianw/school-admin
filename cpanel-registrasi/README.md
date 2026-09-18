# Panduan Pemasangan: Portal Registrasi Siswa Baru CCS di cPanel (`ccs.sch.id`)

Aplikasi PHP di dalam folder ini adalah antarmuka web (*Frontend Client*) yang **100% terhubung langsung ke database Supabase sekolah** melalui API Next.js (persis seperti sistem sewa lapangan).

Aplikasi ini **TIDAK menggunakan database terpisah / SQLite lokal**. Seluruh data pendaftar baru, tarif formulir, dan status verifikasi pembayaran tersimpan terpusat di **Supabase**:
1. **Tahap 1 - Registrasi Super Ringkas**: Orang tua cukup mengisi 4 kolom penting (Email, No WhatsApp, Nama Siswa, Jenjang). Tidak dibebani formulir panjang di awal.
2. **Tahap 2 - Instruksi Bayar & Portal Login**: Orang tua menerima rincian rekening Bank Mayapada dan nominal formulir sesuai gelombang aktif (dari tabel `admission_form_fee`). Untuk login ke portal, cukup menggunakan kombinasi **Email + Nomor WhatsApp**.
3. **Tahap 3 - Upload Bukti & Approval Admin**: Orang tua mengunggah bukti transfer di portal. Bukti disimpan di hosting `uploads/` dan status terupdate ke Supabase. Admin sekolah memverifikasi dan menyetujui bukti pembayaran secara terpusat di dashboard aplikasi sekolah (`/data/admission`).
4. **Tahap 4 - Pembukaan Formulir Lengkap**: HANYA SETELAH pembayaran formulir disetujui (Approved), formulir biodata lengkap dibuka untuk diisi oleh orang tua. Data tidak terbuang sia-sia bagi yang belum melunasi formulir.

---

## 🚀 Cara Pemasangan di cPanel `ccs.sch.id`

### 1. Buat Folder di cPanel File Manager
1. Buka **cPanel** website `ccs.sch.id`.
2. Masuk ke **File Manager** -> buka direktori **`public_html`**.
3. Buat folder baru bernama **`registrasi`** (sehingga dapat diakses di `https://ccs.sch.id/registrasi/`).

### 2. Unggah File
Upload 2 file berikut ke dalam folder `public_html/registrasi/`:
- **`index.php`**
- **`config.php`**

### 3. Konfigurasi `config.php`
Buka file `config.php` di File Manager (klik kanan -> Edit):
1. **`API_SECRET_TOKEN`**: Isi dengan token rahasia yang sama dengan yang ada di `.env.local` Next.js (`ADMISSION_SECRET_KEY` atau `COURT_RENTAL_SECRET_KEY`).
2. **`NEXTJS_API_URL`**: Pastikan mengarah ke: `https://www.manageccs.online/api/public/admission`.
3. **`HOSTING_URL`**: `https://ccs.sch.id/registrasi`.

---

## 🔐 Manajemen Admin Terpusat
Website di cPanel `ccs.sch.id/registrasi` murni diperuntukkan bagi **orang tua/calon siswa**. 

Semua proses verifikasi bukti bayar, persetujuan formulir, dan data pendaftar dikelola secara terpusat oleh admin sekolah melalui dashboard aplikasi Next.js di:
👉 **Menu Admission / Penerimaan Siswa (`/data/admission`)**
