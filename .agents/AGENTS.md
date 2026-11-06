# Project Agent Rules

## Git Push Rule
- **STRICT DIRECTIVE**: NEVER execute `git push` or auto-push code to Git under any circumstances.
- All code edits, builds, and verifications must remain strictly local until the user explicitly decides to commit/push manually.

## Supabase Query Limit & Batch Operations Rule
- **STRICT DIRECTIVE**: Supabase (PostgREST) limits queries to a hard cap of **1,000 rows** per request (`max-rows = 1000`).
- Calling `.range(0, 99999)` DOES NOT bypass the 1,000 row limit! It still silently truncates at 1,000 rows.
- Any query fetching history, cumulative calculations, or export reports (such as `kelas_attendance`, `assessment_grades`, etc.) MUST use chunked range pagination (`fetchAllRows`) in a loop.
- NEVER execute sequential save/upsert queries in a client/server loop (N+1 queries). Always use batch upsert with arrays and recalculate summaries once.

## Mandatory Changelog Maintenance Rule
- **STRICT DIRECTIVE**: Setiap kali agen melakukan perubahan kode berupa penambahan fitur baru, perombakan program, atau perbaikan bug / bug fixes, agen **WAJIB** memperbarui file changelog sistem di `src/data/changelog.js`.
- **EXCEPTION (Absensi / Data Rutin Operasional)**: Perubahan data operasional harian seperti menambahkan data absensi, merubah absensi, atau entri catatan rutin **TIDAK PERLU** dicatat ke dalam changelog.
- Aturan ini **STRICT** hanya untuk:
  - Penambahan fitur program baru (`Added`)
  - Modifikasi atau peningkatan fungsionalitas program (`Changed`)
  - Perbaikan bug dan fixes error program (`Fixed`)
- Format pencatatan wajib mengikuti struktur Keep a Changelog multilingual (`id`, `en`, `zh`) pada `SYSTEM_RELEASES` di `src/data/changelog.js`.

## Semantic Versioning (SemVer) & Release Guidelines Rule
- **STRICT DIRECTIVE**: Sistem ini masih berada dalam fase pengembangan aktif (*initial development / in-progress*). Seluruh penomoran versi rilis **WAJIB menggunakan skema `0.x.y`** dan dilarang meloncat ke `1.x.x` sebelum sistem dinyatakan resmi selesai, matang, dan stabil (General Availability / GA).
- **Kaidah Penomoran: `0.MINOR.PATCH`**:
  - **MINOR (`0.Y.0`)**: Dinaikkan saat ada penambahan fitur baru atau modul program yang signifikan (misal: rilis modul baru, penambahan dialog pelaporan bug terpadu, integrasi layanan eksternal).
  - **PATCH (`0.y.Z`)**: Dinaikkan saat perbaikan bug (bug fixes), hotfix, perapian UI/layout, atau pembenahan teks bahasa/i18n (misal dari `0.5.0` ke `0.5.1`).
  - **MAJOR (`1.0.0`)**: Hanya dideklarasikan ketika seluruh modul utama sistem sekolah telah selesai secara komprehensif, teruji penuh, dan ditutup masa pengembangannya untuk dipakai operasional resmi.
- Setiap rilis baru atau perubahan nomor versi pada `SYSTEM_RELEASES` di `src/data/changelog.js`, agen **WAJIB menyelaraskan nomor versi di `package.json`**.
