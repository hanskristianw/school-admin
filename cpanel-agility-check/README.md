# Panduan Integrasi Agility Check Hostinger/cPanel ke Next.js & Supabase

Paket file ini disiapkan untuk diunggah ke hosting PHP (Hostinger / cPanel), misalnya di folder `public_html/agility-check/` (`https://ccs.sch.id/agility-check/`), mengikuti arsitektur yang sama dengan `cpanel-psikotest/`.

---

## 📁 Daftar File

| Nama File | Deskripsi |
| :--- | :--- |
| **`config.php`** | Kredensial internal (`API_SECRET_TOKEN`), URL endpoint Next.js (`NEXTJS_API_URL`), dan helper `callNextJsApi()`. |
| **`index.php`** | Formulir peserta Agility Check (pilihan ganda A–D) yang mengambil daftar soal aktif secara real-time dari Supabase melalui `/api/public/agility-check` tanpa mengekspos kunci jawaban. |
| **`submit.php`** | Menerima pengiriman jawaban form peserta dan meneruskannya melalui `POST` aman ke Next.js API untuk dinilai otomatis terhadap kunci jawaban di server. |

---

## 🚀 Langkah Instalasi

### Langkah 1: Jalankan Migrasi SQL di Supabase
1. Buka **Supabase Dashboard** $\rightarrow$ **SQL Editor**.
2. Jalankan isi file [`migrations/add-agility-check-tables.sql`](../migrations/add-agility-check-tables.sql).
3. Script tersebut akan membuat tabel `agility_questions`, `agility_results`, `agility_answers`, mengisi 16 soal resmi + kunci jawaban, dan mendaftarkan menu `/data/agility-check`.

### Langkah 2: Unggah File PHP ke Hostinger / cPanel
Unggah ke-3 file berikut ke folder `public_html/agility-check/`:
- `config.php`
- `index.php`
- `submit.php`

---

## 🔒 Keamanan & Pengelolaan
- **Kunci Jawaban Aman di Server**: Endpoint publik `GET /api/public/agility-check` tidak pernah mengirim kolom `correct_answer` ke HTML peserta. Penilaian penuh dilakukan di backend Next.js saat `POST`.
- **Kelola Soal dari Admin UI**: HR/Admin dapat menambah, mengubah soal/pilihan/dimensi/kunci jawaban, melihat skor pelamar per dimensi + interpretasi HR, dan mencetak PDF langsung dari menu `/data/agility-check`.
