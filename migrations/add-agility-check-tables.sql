-- ============================================================================
-- MIGRATION: Agility Check Module (Questions, Results, Answers & Menu)
-- Jalankan script ini di Supabase Dashboard -> SQL Editor
-- ============================================================================

-- 1. Master Bank Soal Agility Check (HR dapat kelola lewat UI /data/agility-check)
CREATE TABLE IF NOT EXISTS public.agility_questions (
  id SERIAL PRIMARY KEY,
  question_no INTEGER NOT NULL,
  dimension VARCHAR(100) NOT NULL DEFAULT 'Dimensi 1',
  question_text TEXT NOT NULL,
  option_a TEXT NOT NULL,
  option_b TEXT NOT NULL,
  option_c TEXT NOT NULL,
  option_d TEXT NOT NULL,
  correct_answer VARCHAR(1) NOT NULL CHECK (correct_answer IN ('A', 'B', 'C', 'D')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agility_questions_active_no
  ON public.agility_questions (is_active, question_no, id);

-- 2. Header Hasil Pengerjaan Peserta
CREATE TABLE IF NOT EXISTS public.agility_results (
  id SERIAL PRIMARY KEY,
  nama VARCHAR(200) NOT NULL,
  posisi VARCHAR(200) NOT NULL,
  tanggal DATE NOT NULL,
  total_score INTEGER NOT NULL DEFAULT 0,
  max_score INTEGER NOT NULL DEFAULT 16,
  interpretation VARCHAR(120),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agility_results_tanggal_id
  ON public.agility_results (tanggal DESC, id DESC);

-- 3. Detail Jawaban Peserta per Soal
CREATE TABLE IF NOT EXISTS public.agility_answers (
  id SERIAL PRIMARY KEY,
  result_id INTEGER NOT NULL REFERENCES public.agility_results(id) ON DELETE CASCADE,
  question_id INTEGER REFERENCES public.agility_questions(id) ON DELETE SET NULL,
  question_no INTEGER NOT NULL,
  selected_option VARCHAR(1) CHECK (selected_option IN ('A', 'B', 'C', 'D')),
  is_correct BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agility_answers_result_qno
  ON public.agility_answers (result_id, question_no);

-- 4. Seed 16 Soal Resmi Agility Check (hanya jika tabel masih kosong)
INSERT INTO public.agility_questions (
  question_no, dimension, question_text,
  option_a, option_b, option_c, option_d,
  correct_answer, is_active
)
SELECT v.question_no, v.dimension, v.question_text, v.option_a, v.option_b, v.option_c, v.option_d, v.correct_answer, true
FROM (
  VALUES
  (1, 'Dimensi 1',
   'Anda diminta menggantikan rekan untuk memimpin sebuah kegiatan yang belum pernah Anda tangani. Waktu persiapan terbatas. Apa langkah terbaik?',
   'Menolak karena kegiatan tersebut bukan bagian dari tanggung jawab rutin Anda.',
   'Mengumpulkan informasi penting, mengidentifikasi hal yang belum dipahami, lalu meminta arahan spesifik dari pihak terkait.',
   'Menyalin rencana kegiatan sebelumnya tanpa memeriksa kesesuaiannya.',
   'Menunggu sampai rekan tersebut dapat kembali bekerja.',
   'B'),
  (2, 'Dimensi 1',
   'Anda menemukan sumber belajar atau metode kerja baru yang mungkin meningkatkan hasil, tetapi belum pernah digunakan di sekolah. Apa yang sebaiknya dilakukan?',
   'Langsung menerapkannya kepada semua pihak agar perubahan cepat terjadi.',
   'Mengabaikannya karena belum menjadi praktik umum di sekolah.',
   'Menilai relevansi dan risikonya, mencoba dalam skala kecil, lalu mengevaluasi hasilnya.',
   'Meminta orang lain memutuskan tanpa mempelajari manfaatnya.',
   'C'),
  (3, 'Dimensi 1',
   'Setelah mengerjakan tugas, Anda mengetahui bahwa ada persyaratan penting yang sebelumnya tidak Anda pahami. Apa respons terbaik?',
   'Mengakui kesenjangan pemahaman, mengklarifikasi persyaratan, dan memperbaiki hasil kerja berdasarkan informasi tersebut.',
   'Menjelaskan bahwa instruksi awal kurang lengkap dan mempertahankan hasil yang sudah dibuat.',
   'Mengubah bagian yang terlihat tanpa memastikan persyaratan sebenarnya.',
   'Menunggu orang lain menunjukkan kesalahan secara rinci.',
   'A'),
  (4, 'Dimensi 1',
   'Rekan kerja menunjukkan cara yang lebih efisien untuk menyelesaikan tugas yang selama ini Anda kerjakan dengan cara berbeda. Apa yang Anda lakukan?',
   'Mempertahankan cara sendiri karena sudah terbiasa.',
   'Menggunakan cara baru hanya ketika rekan tersebut mengawasi.',
   'Menggabungkan kedua cara tanpa memeriksa apakah hasilnya lebih baik.',
   'Memahami alasan di balik cara baru, membandingkan hasilnya, dan mengadopsinya jika terbukti lebih efektif.',
   'D'),
  (5, 'Dimensi 2',
   'Dalam rapat, tiga pihak memberikan penjelasan yang berbeda mengenai penyebab keterlambatan sebuah proyek. Bagaimana Anda melanjutkan analisis?',
   'Memilih penjelasan dari pihak yang paling senior.',
   'Menyusun urutan kejadian, memeriksa bukti dari setiap pihak, dan membedakan fakta dari asumsi.',
   'Menganggap semua pihak memiliki kontribusi kesalahan yang sama.',
   'Menghentikan pembahasan sampai semua pihak sepakat.',
   'B'),
  (6, 'Dimensi 2',
   'Anda diminta memberikan rekomendasi, tetapi data yang tersedia belum cukup untuk mendukung satu kesimpulan. Apa tindakan paling tepat?',
   'Memberikan rekomendasi yang paling umum agar keputusan tidak tertunda.',
   'Menggunakan pengalaman pribadi sebagai satu-satunya dasar keputusan.',
   'Menjelaskan keterbatasan data, mencari informasi tambahan yang paling relevan, dan menyampaikan opsi beserta risikonya.',
   'Menunda rekomendasi tanpa memberi penjelasan atau langkah lanjutan.',
   'C'),
  (7, 'Dimensi 2',
   'Sebuah kegiatan sekolah memiliki tujuan yang baik, tetapi evaluasi menunjukkan bahwa pendekatannya tidak sesuai dengan kebutuhan peserta. Apa yang sebaiknya dilakukan?',
   'Meninjau kembali kebutuhan peserta dan tujuan kegiatan, kemudian merancang pendekatan yang lebih sesuai.',
   'Mempertahankan kegiatan karena persiapannya sudah menghabiskan banyak waktu.',
   'Mengubah tujuan agar sesuai dengan kegiatan yang sudah dirancang.',
   'Menghentikan kegiatan tanpa mencari alternatif.',
   'A'),
  (8, 'Dimensi 2',
   'Anda harus memilih antara dua vendor. Vendor pertama lebih murah, sedangkan vendor kedua lebih mahal tetapi menawarkan layanan purna jual yang lebih baik. Bagaimana Anda menentukan pilihan?',
   'Memilih vendor termurah karena penghematan selalu menjadi prioritas.',
   'Memilih vendor yang sudah dikenal tanpa membandingkan penawaran.',
   'Meminta keputusan pihak lain tanpa menyiapkan analisis.',
   'Membandingkan total biaya, kualitas, risiko, kebutuhan, dan dampak jangka panjang sebelum merekomendasikan pilihan.',
   'D'),
  (9, 'Dimensi 3',
   'Seorang anggota tim kunci tiba-tiba tidak dapat hadir pada hari pelaksanaan kegiatan. Apa tindakan paling efektif?',
   'Membatalkan kegiatan karena pembagian tugas awal tidak dapat dipenuhi.',
   'Menilai tugas yang terdampak, mengatur ulang peran berdasarkan kapasitas anggota yang tersedia, dan mengomunikasikan perubahan.',
   'Membebankan seluruh tugas anggota tersebut kepada satu orang yang paling berpengalaman.',
   'Menjalankan kegiatan seperti biasa tanpa menyesuaikan pembagian tugas.',
   'B'),
  (10, 'Dimensi 3',
   'Sekolah memperkenalkan standar dokumentasi baru di tengah semester. Sebagian pekerjaan sudah menggunakan format lama. Apa respons terbaik?',
   'Mengubah semua dokumen lama sekaligus tanpa menilai prioritas.',
   'Menggunakan format lama sampai akhir tahun ajaran.',
   'Memastikan tanggal penerapan dan dokumen yang terdampak, menyusun urutan penyesuaian, serta meminta klarifikasi atas bagian yang belum jelas.',
   'Membiarkan setiap anggota tim memilih format masing-masing.',
   'C'),
  (11, 'Dimensi 3',
   'Jadwal kegiatan siswa berubah karena kondisi yang tidak dapat dikendalikan sekolah. Bagaimana Anda menjaga agar tujuan kegiatan tetap tercapai?',
   'Mengidentifikasi tujuan yang harus dipertahankan, menyesuaikan jadwal atau metode, dan memberi informasi yang jelas kepada pihak terkait.',
   'Menghapus tujuan yang sulit dicapai tanpa konsultasi.',
   'Memaksakan jadwal awal meskipun situasinya sudah berubah.',
   'Menunggu sampai ada instruksi baru tanpa menyiapkan alternatif.',
   'A'),
  (12, 'Dimensi 3',
   'Anda dipindahkan sementara ke tim yang memiliki alur komunikasi dan kebiasaan kerja berbeda. Apa pendekatan terbaik?',
   'Meminta tim mengikuti seluruh cara kerja Anda sebelumnya.',
   'Bekerja sendiri agar tidak perlu menyesuaikan diri.',
   'Menghindari tugas yang memerlukan koordinasi sampai masa penugasan selesai.',
   'Memahami peran, alur komunikasi, dan ekspektasi tim, lalu menyepakati cara koordinasi yang efektif.',
   'D'),
  (13, 'Dimensi 4',
   'Anda diminta memperbaiki proses pendaftaran siswa yang sering mengalami keterlambatan. Apa langkah yang paling berorientasi hasil?',
   'Menambah jumlah formulir pemeriksaan untuk semua tahap.',
   'Memetakan tahapan proses, mengidentifikasi titik keterlambatan utama, menetapkan ukuran perbaikan, dan menguji solusi.',
   'Meminta staf bekerja lebih cepat tanpa mengubah proses.',
   'Mengurangi informasi yang diminta tanpa memeriksa kebutuhan administrasi.',
   'B'),
  (14, 'Dimensi 4',
   'Setelah sebuah program selesai, peserta memberikan umpan balik yang beragam. Bagaimana Anda menentukan tindak lanjut?',
   'Hanya menggunakan komentar yang paling positif untuk laporan.',
   'Menganggap umpan balik negatif sebagai hal yang tidak dapat dihindari.',
   'Mengelompokkan umpan balik, membandingkannya dengan tujuan program, dan menentukan perbaikan yang dapat ditindaklanjuti.',
   'Mengulang program dengan format sama agar konsisten.',
   'C'),
  (15, 'Dimensi 4',
   'Tim Anda berhasil mencapai target waktu, tetapi beberapa pihak yang menerima hasil pekerjaan harus melakukan banyak koreksi. Apa tindakan terbaik?',
   'Menelaah sumber koreksi, menyepakati standar kualitas, dan menambahkan pemeriksaan pada titik proses yang tepat.',
   'Menyatakan target tercapai karena pekerjaan diselesaikan tepat waktu.',
   'Meminta penerima hasil pekerjaan menyesuaikan ekspektasi.',
   'Menambah waktu kerja tim tanpa meninjau prosesnya.',
   'A'),
  (16, 'Dimensi 4',
   'Anda memiliki sumber daya terbatas untuk menjalankan tiga inisiatif, sementara semuanya dianggap penting. Bagaimana Anda menentukan alokasi?',
   'Membagi sumber daya sama rata tanpa melihat kebutuhan masing-masing.',
   'Memprioritaskan inisiatif yang paling mudah diselesaikan.',
   'Menjalankan ketiganya sekaligus meskipun kapasitas tidak mencukupi.',
   'Membandingkan dampak, urgensi, kesesuaian dengan tujuan sekolah, kebutuhan sumber daya, dan risiko; kemudian mengomunikasikan prioritas.',
   'D')
) AS v(question_no, dimension, question_text, option_a, option_b, option_c, option_d, correct_answer)
WHERE NOT EXISTS (SELECT 1 FROM public.agility_questions LIMIT 1);

-- 5. Daftarkan Menu & Copy Role Permissions dari Psikotest (Idempotent)
DO $$
DECLARE
  v_parent_id INTEGER;
  v_agility_menu_id INTEGER;
  v_psiko_menu_id INTEGER;
BEGIN
  SELECT menu_id, menu_parent_id
    INTO v_psiko_menu_id, v_parent_id
  FROM public.menus
  WHERE menu_path = '/data/psikotest'
  LIMIT 1;

  IF v_parent_id IS NULL THEN
    v_parent_id := 112;
  END IF;

  SELECT menu_id INTO v_agility_menu_id
  FROM public.menus
  WHERE menu_path = '/data/agility-check'
  LIMIT 1;

  IF v_agility_menu_id IS NULL THEN
    INSERT INTO public.menus (menu_name, menu_path, menu_icon, menu_order, menu_parent_id, menu_show_dashboard)
    VALUES ('Agility Check', '/data/agility-check', 'fas fa-bolt', 9, v_parent_id, false)
    RETURNING menu_id INTO v_agility_menu_id;
  END IF;

  IF v_psiko_menu_id IS NOT NULL AND v_agility_menu_id IS NOT NULL THEN
    INSERT INTO public.menu_permissions (menu_id, role_id)
    SELECT v_agility_menu_id, mp.role_id
    FROM public.menu_permissions mp
    WHERE mp.menu_id = v_psiko_menu_id
      AND NOT EXISTS (
        SELECT 1 FROM public.menu_permissions existing
        WHERE existing.menu_id = v_agility_menu_id AND existing.role_id = mp.role_id
      );
  END IF;
END $$;
