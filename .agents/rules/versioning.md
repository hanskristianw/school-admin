---
trigger: always_on
description: Mandatory semantic versioning rules (0.x.y during active development) and release guidelines for school-admin.
---

# Semantic Versioning (SemVer) & Release Guidelines

## 1. Development Phase Versioning (`0.x.y`)
- **INITIAL DEVELOPMENT DIRECTIVE**: Selama sistem masih dalam tahap pengembangan aktif (*initial development / in-progress*), nomor versi **WAJIB diawali dengan `0` (`0.x.y`)**.
- **PROHIBITION**: Dilarang menggunakan atau meloncat ke versi `1.x.x` selama modul-modul sistem belum 100% lengkap dan stabil.

## 2. Increment Rules: `0.MINOR.PATCH`
- **MINOR (`0.Y.0`)**: Dinaikkan saat rilis modul atau fitur baru yang signifikan (misal: penambahan modul kurikulum baru, sistem tiket customer support, integrasi bot baru).
- **PATCH (`0.y.Z`)**: Dinaikkan saat rilis perbaikan kendala (*bug fixes*), *hotfix*, penyesuaian tata letak UI, atau pembenahan teks kamus bahasa/i18n.
- **MAJOR (`1.0.0`)**: Milestone rilis resmi pertama (*General Availability* / GA). Hanya dinaikkan ketika seluruh fondasi dan modul sekolah (Akademik, PYP/MYP, Presensi, Rapor, Pengaturan Akun, Keuangan) sudah lengkap, stabil, dan teruji penuh tanpa perubahan arsitektur yang merusak.

## 3. Weekly Single Version Rule (PERATURAN KERAS: Maksimal 1 Versi Per Minggu)
- **STRICT DIRECTIVE — NO SAME-WEEK VERSION BUMP**: DILARANG KERAS menaikkan nomor versi (`0.x.y`) selama pekerjaan/perubahan masih terjadi pada **minggu kalender yang sama** (Senin–Minggu / *ISO week* yang sama) dengan rilis terbaru (`isLatest: true`) di `src/data/changelog.js`.
- **Mandatory Consolidation**: Semua penambahan fitur (`added`), perubahan (`changed`), dan perbaikan bug (`fixed`) pada minggu yang sama **WAJIB digabungkan (*consolidated*) ke dalam entri versi terbaru yang sedang aktif** pada minggu tersebut (cukup perbarui `date`, `summary`, dan `sections` pada entri `isLatest: true`), **TANPA** membuat entri versi baru dan **TANPA** mengubah `"version"` di `package.json`.
- Kenaikan versi baru (`0.MINOR.0` atau `0.y.PATCH`) **HANYA diperbolehkan** apabila sudah memasuki **minggu kalender baru** dibandingkan `date` rilis terakhir (atau jika user secara eksplisit meminta rilis versi baru). Jangan mengulangi pembuatan versi beruntun seperti `0.6.1`, `0.6.2`, `0.6.3` di minggu yang sama.

## 4. Synchronized Version Files
Setiap kali ada rilis baru atau perubahan pada `SYSTEM_RELEASES`:
1. Perbarui daftar rilis di `src/data/changelog.js` (`SYSTEM_RELEASES`).
2. Selaraskan field `"version"` di file `package.json`.
