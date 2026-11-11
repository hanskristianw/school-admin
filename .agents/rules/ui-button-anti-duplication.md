# Single Action / Anti-Duplication Button Rule

## 1. Zero Duplicate Action Buttons (Larangan Tombol Duplikat)
- **STRICT DIRECTIVE**: Dilarang keras menempatkan lebih dari satu tombol (*redundant/duplicate buttons*) yang membuka modal yang sama, membuka formulir yang sama, atau memicu tindakan fungsional yang identik pada satu halaman atau di dalam sub-modal anak (*child modal/dialog/drawer*).
- Setiap tindakan fungsional atau modal pengelolaan (misalnya: "Atur Petugas Ruangan", "Kelola Ruangan", pengelolaan data master, setting modal) **wajib memiliki HANYA SATU tombol akses utama (*Single Source of Truth Action*)** yang ditempatkan secara terpusat pada bilah alat (*toolbar*) atau header utama halaman.

## 2. Larangan Tombol Pintasan Berulang di Sub-Komponen
- **Dilarang di Baris/Nama Pengguna**: Dilarang meletakkan tombol pintasan (seperti "+ Kelola Ruangan") berulang di bawah setiap baris entitas jika fungsinya sama persis dengan tombol toolbar utama.
- **Dilarang di Footer / Bawah Tabel**: Dilarang menduplikasi tombol aksi toolbar ke bagian bawah tabel atau footer kontainer.
- **Dilarang di Dalam Modal Detail/Inspeksi**: Modal detail (seperti "Detail Tugas", "Inspeksi", "Pratinjau") berfungsi khusus untuk melihat informasi dan mengambil keputusan langsung terhadap item tersebut (tinjau/approve/reject). Dilarang menyisipkan tombol sekunder di dalam modal yang melompat ke modal pengelolaan konfigurasi yang sudah tersedia di halaman utama.

## 3. Tujuan dan Standar UI
- Menjaga kebersihan antarmuka (*clean, uncluttered minimalist UI*).
- Menghilangkan kebingungan pengguna (*reduce cognitive load*) akibat tombol yang tampak berbeda tetapi berujung pada dialog yang sama.
- Mencegah *stacking context bugs* dan inkonsistensi state akibat membuka modal di atas modal (*nested modals*).
