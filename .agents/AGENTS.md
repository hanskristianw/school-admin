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
- **Weekly Single Version Rule (PERATURAN KERAS: 1 Versi Per Minggu — DILARANG NAIK VERSI DALAM MINGGU YANG SAMA)**:
  - DILARANG KERAS menaikkan nomor versi (`0.MINOR.PATCH`) apabila tanggal pembaruan **masih berada pada minggu kalender yang sama** (Senin–Minggu / *ISO week* yang sama) dengan rilis terbaru (`isLatest: true`) di `src/data/changelog.js`.
  - Seluruh perubahan baru (`added`, `changed`, `fixed`, dll.) yang dikerjakan pada **minggu yang sama** **WAJIB digabungkan (*consolidated*) langsung ke dalam entri versi terbaru yang sedang aktif** (cukup perbarui `date` ke tanggal pembaruan terkini dan perbarui `summary`/`sections`), **TANPA** membuat nomor versi baru di `src/data/changelog.js` dan **TANPA** mengubah `"version"` di `package.json`.
  - Nomor versi baru hanya boleh dinaikkan **maksimal 1 kali** ketika pekerjaan memasuki **minggu kalender baru** (atau jika user secara eksplisit memerintahkan rilis versi baru). Jangan pernah membuat versi beruntun dalam minggu yang sama (`0.6.1`, `0.6.2`, `0.6.3`, dst.).
- **Kaidah Penomoran: `0.MINOR.PATCH`**:
  - **MINOR (`0.Y.0`)**: Dinaikkan saat memasuki minggu rilis baru yang memuat penambahan fitur baru atau modul program yang signifikan (misal: rilis modul baru, penambahan dialog pelaporan bug terpadu, integrasi layanan eksternal).
  - **PATCH (`0.y.Z`)**: Dinaikkan saat memasuki minggu rilis baru yang hanya berisi perbaikan kendala (*bug fixes*), *hotfix*, penyesuaian tata letak UI, atau pembenahan teks bahasa/i18n.
  - **MAJOR (`1.0.0`)**: Hanya dideklarasikan ketika seluruh modul utama sistem sekolah telah selesai secara komprehensif, teruji penuh, dan ditutup masa pengembangannya untuk dipakai operasional resmi.
- Setiap rilis versi baru pada minggu baru di `SYSTEM_RELEASES` (`src/data/changelog.js`), agen **WAJIB menyelaraskan nomor versi di `package.json`**.

## Single Action / Anti-Duplication Button Rule
- **STRICT DIRECTIVE**: Dilarang membuat tombol duplikat (*duplicate/redundant buttons*) yang membuka modal, mengarahkan navigasi, atau memicu tindakan fungsionalitas yang sama pada satu halaman atau di dalam sub-modal/kartu anak (*child modal/drawer*).
- **Single Source of Truth UI Action**: Setiap fitur atau modal (misal: "Atur Petugas Ruangan", kelola data master, konfigurasi) hanya boleh memiliki **1 tombol akses utama** yang terpusat dan konsisten (misal di toolbar utama halaman).
- **Larangan Penyebaran Tombol Pintasan**: Dilarang menyebarkan tombol pintasan duplikat berulang kali di footer tabel, di dalam baris/kolom tabel, di bawah nama pengguna, maupun di dalam modal detail/pratinjau.
- Prinsip ini wajib ditaati untuk menjaga hierarki UI tetap bersih, konsisten, menghindari kebingungan pengguna (*reduce cognitive load*), serta mencegah potensi inkonsistensi status/state pada modal berlapis.
