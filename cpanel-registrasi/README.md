# Panduan Pemasangan: Portal Registrasi Siswa Baru CCS di cPanel (`ccs.sch.id`)

Aplikasi PHP di dalam folder ini adalah antarmuka web (*Frontend Client*) yang **100% terhubung langsung ke database Supabase sekolah** melalui API Next.js (persis seperti sistem sewa lapangan).

Aplikasi ini **TIDAK menggunakan database terpisah / SQLite lokal**. Seluruh data pendaftar baru, tarif formulir, dan status verifikasi pembayaran tersimpan terpusat di **Supabase**:
1. **Tahap 1 - Registrasi Ringkas Tanpa Tampilan Harga**: Orang tua cukup mengisi 4 kolom penting (Jenjang, Nama Siswa, Email, No. WhatsApp). Formulir web **tidak menampilkan nominal harga formulir**.
2. **Tahap 2 - Penentuan Biaya Berdasarkan Tanggal & Email Instruksi**: Backend API otomatis menentukan harga formulir sesuai tanggal hari ini dari tabel `admission_form_fee` (100% *date-driven*, tanpa toggle aktif manual). Rincian biaya dan nomor rekening resmi Bank Mayapada (`100-3000-3853` a/n `Yayasan Pendidikan Mayapada School`) dikirimkan langsung ke email orang tua bersama tautan unggah bukti transfer.
3. **Tahap 3 - Upload Bukti & Approval Admin**: Orang tua mengunggah bukti transfer melalui web. Berkas bukti disimpan di direktori hosting `uploads/` (terproteksi) dan status terupdate di Supabase (`form_fee_status = 'proof_uploaded'`). Admin sekolah memverifikasi dan menyetujui bukti pembayaran secara terpusat di dashboard aplikasi sekolah (`/data/admission`).
4. **Tahap 4 - Pembukaan Formulir Lengkap**: HANYA SETELAH pembayaran formulir disetujui (Status `verified`), formulir biodata lengkap siswa dibuka untuk diisi oleh orang tua (`is_form_completed = true`). Data tidak terbuang sia-sia bagi pendaftar yang belum melunasi biaya formulir.

---

## 🚀 Cara Pemasangan di cPanel `ccs.sch.id`

### 1. Buat Folder di cPanel File Manager
1. Buka **cPanel** website `ccs.sch.id`.
2. Masuk ke **File Manager** -> buka direktori **`public_html`**.
3. Buat folder baru bernama **`registrasi`** (sehingga dapat diakses di `https://ccs.sch.id/registrasi/`).

### 2. Unggah File
Upload 3 file berikut ke dalam folder `public_html/registrasi/`:
- **`index.php`** (Halaman formulir pendaftaran siswa baru / PPDB awal)
- **`status.php`** (Halaman cek status pendaftaran, info rekening, upload bukti bayar, dan biodata lengkap)
- **`config.php`** (File konfigurasi token API & URL sekolah)

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
