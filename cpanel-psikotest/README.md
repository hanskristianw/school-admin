# Panduan Integrasi Psikotes cPanel ke Next.js & Supabase

Paket file ini disiapkan khusus untuk ditimpa langsung ke folder hosting psikotes di cPanel (misalnya: `public_html/psikotest/` pada domain `https://ccs.sch.id/psikotest/`).

---

## 📁 Daftar File

| Nama File | Deskripsi |
| :--- | :--- |
| **`config.php`** | Berisi kredensial internal (`API_SECRET_TOKEN`), URL endpoint Next.js (`NEXTJS_API_URL`), dan fungsi helper cURL `callNextJsApi()`. |
| **`submit.php`** | Menangkap data form jawaban peserta dan mengirimkannya langsung ke backend Next.js API melalui protokol aman. Menampilkan pesan sukses / error yang ramah. |
| **`index.php`** | Antarmuka formulir psikotes DISC (96 pernyataan / 24 nomor). Mengambil soal secara dinamis & real-time dari Supabase via Next.js API. |
| **`supabase_psychotest_questions.sql`** | Script SQL untuk dijalankan di Supabase SQL Editor agar tabel `psychotest_questions` memiliki master data lengkap beserta skor DISC (`p_mean` & `k_mean`). |

---

## 🚀 Langkah Instalasi

### Langkah 1: Sinkronisasi Master Soal ke Supabase
1. Buka dashboard **Supabase** Anda $\rightarrow$ masuk ke menu **SQL Editor**.
2. Salin seluruh isi file **[`supabase_psychotest_questions.sql`](file:///c:/Users/user/Documents/GitHub/school-admin/cpanel-psikotest/supabase_psychotest_questions.sql)** dan jalankan (**Run**).
3. Script ini akan:
   - Menambahkan kolom scoring DISC `p_mean` dan `k_mean` ke tabel `psychotest_questions`.
   - Mengisi 96 master soal resmi (24 kelompok) dengan data yang bersih dan tersentralisasi.

### Langkah 2: Unggah File ke cPanel (Hanya 3 File)
1. Buka **cPanel** $\rightarrow$ pilih **File Manager**.
2. Buka folder psikotes Anda (misal: `public_html/psikotest/`).
3. Unggah / timpa **3 file PHP** berikut dari folder `cpanel-psikotest/`:
   - `config.php`
   - `index.php`
   - `submit.php`

---

## 💡 Manajemen Data Tersentralisasi

- **Ubah Soal Langsung dari Supabase**: Jika Anda mengedit kalimat soal, icon, atau parameter di tabel `psychotest_questions` Supabase, form di `ccs.sch.id/psikotest` otomatis mengambil data terbaru seketika saat halaman dimuat/di-refresh!
- **Zero DB di Hosting**: Database MySQL lokal cPanel sudah tidak diperlukan lagi.
- **Scoring DISC Siap Pakai**: Kolom `p_mean` dan `k_mean` kini tersimpan di Supabase, siap digunakan untuk kalkulasi otomatis profil DISC peserta di Next.js!


