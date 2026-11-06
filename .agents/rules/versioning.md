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
- **PATCH (`0.y.Z`)**: Dinaikkan saat rilis perbaikan kendala (*bug fixes*), *hotfix*, penyesuaian tata letak UI, atau pembenahan teks kamus bahasa/i18n (misal dari `0.5.0` ke `0.5.1`).
- **MAJOR (`1.0.0`)**: Milestone rilis resmi pertama (*General Availability* / GA). Hanya dinaikkan ketika seluruh fondasi dan modul sekolah (Akademik, PYP/MYP, Presensi, Rapor, Pengaturan Akun, Keuangan) sudah lengkap, stabil, dan teruji penuh tanpa perubahan arsitektur yang merusak.

## 3. Synchronized Version Files
Setiap kali ada nomor rilis baru:
1. Perbarui daftar rilis di `src/data/changelog.js` (`SYSTEM_RELEASES`).
2. Selaraskan field `"version"` di file `package.json`.
