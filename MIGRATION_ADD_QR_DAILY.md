# Migration: Menambahkan 'qr_daily' ke constraint absen_method

## Problem
Error saat insert ke tabel `absen`:
```
new row for relation "absen" violates check constraint "absen_absen_method_check"
```

Constraint check saat ini hanya menerima: `('manual', 'qr', 'import')`
Kita perlu menambahkan `'qr_daily'` untuk mendukung QR harian.

## Solusi

### Cara 1: Via Supabase Dashboard (RECOMMENDED)

1. Buka Supabase Dashboard: https://gzucqoupjfnwkesgyybc.supabase.co
2. Login
3. Klik **SQL Editor** di sidebar kiri
4. Klik **New Query**
5. Copy-paste SQL berikut:

```sql
-- Drop the old constraint
ALTER TABLE absen DROP CONSTRAINT IF EXISTS absen_absen_method_check;

-- Add new constraint with 'qr_daily' included
ALTER TABLE absen ADD CONSTRAINT absen_absen_method_check 
  CHECK (absen_method IN ('manual', 'qr', 'qr_daily', 'import'));
```

6. Klik **Run** (atau tekan Ctrl+Enter)
7. Pastikan muncul pesan sukses

### Cara 2: Via psql (Jika punya akses langsung)

```bash
psql "postgresql://postgres:[PASSWORD]@db.gzucqoupjfnwkesgyybc.supabase.co:5432/postgres" -f add-qr-daily-method.sql
```

## Verifikasi

Setelah migration, coba scan QR lagi dari aplikasi siswa. Seharusnya sudah berhasil.

Untuk memastikan constraint sudah terupdate, jalankan query ini di SQL Editor:

```sql
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conname = 'absen_absen_method_check';
```

Hasil yang diharapkan:
```
absen_absen_method_check | CHECK ((absen_method = ANY (ARRAY['manual'::text, 'qr'::text, 'qr_daily'::text, 'import'::text])))
```

## Catatan

Nilai `absen_method` yang valid setelah migration:
- `'manual'` - Absen manual oleh admin/guru
- `'qr'` - Scan QR session-based (legacy)
- `'qr_daily'` - Scan QR harian (new static daily QR)
- `'import'` - Import dari Excel/CSV
