-- ========================================================
-- MASTER DATA SOAL DISC: psychotest_questions
-- Jalankan script ini di Supabase SQL Editor
-- ========================================================

-- 1. Pastikan kolom p_mean dan k_mean sudah ada
ALTER TABLE public.psychotest_questions 
ADD COLUMN IF NOT EXISTS p_mean integer,
ADD COLUMN IF NOT EXISTS k_mean integer;

-- 2. Bersihkan data lama jika ada
TRUNCATE TABLE public.psychotest_questions RESTART IDENTITY CASCADE;

-- 3. Masukkan 96 data soal resmi (24 kelompok)
INSERT INTO public.psychotest_questions (id, group_no, statement_text, p_icon, k_icon, p_mean, k_mean) VALUES
(1, 1, 'Kind
Baik hati', '▲', '▲', 3, 3),
(2, 1, 'Can convince, influence others
Bisa meyakinkan, mempengaruhi orang lain', '*', 'N', 4, 1),
(3, 1, 'Humble
Rendah hati', '<<', '<<', 2, 2),
(4, 1, 'Dislikes imitating
Tidak senang meniru', 'N', 'Z', 1, 5),
(5, 2, 'Attractive, pleasant
Menarik, menyenangkan', '*', '*', 4, 4),
(6, 2, 'God-fearing, cautious
Takut akan Allah, waspada', '<<', '<<', 2, 2),
(7, 2, 'Stubborn, does not give up easily
Keras kepala, tidak mudah menyerah', 'Z', 'Z', 5, 5),
(8, 2, 'Friendly, gentle in manner
Ramah, manis budi bahasanya', 'N', '▲', 1, 3),
(9, 3, 'Easily led
Mudah dipimpin', 'N', '<<', 1, 2),
(10, 3, 'Dare to take risks
Berani mengambil risiko', 'Z', 'Z', 5, 5),
(11, 3, 'Loyal
Setia', '▲', 'N', 3, 1),
(12, 3, 'Attractive
Menarik', '*', '*', 4, 4),
(13, 4, 'Not narrow-minded, open-minded
Tidak picik, berpikiran terbuka', '*', 'N', 4, 1),
(14, 4, 'Ready to help
Siap membantu', '<<', '<<', 2, 2),
(15, 4, 'Strong-willed
Berkemauan keras', 'N', 'Z', 1, 5),
(16, 4, 'Cheerful
Periang', '▲', '▲', 3, 3),
(17, 5, 'Humorous, funny
Humoris, kocak', 'N', '*', 1, 4),
(18, 5, 'Not reckless, thorough
Tidak sembrono, teliti', '<<', '<<', 2, 2),
(19, 5, 'Speaks frankly
Berbicara ceplas-ceplos', 'N', 'Z', 1, 5),
(20, 5, 'Calm demeanor
Berpembawaan tenang', '▲', '▲', 3, 3),
(21, 6, 'Enjoys competing, always tries to surpass others
Senang bersaing, selalu berusaha mengungguli orang lain', 'Z', 'Z', 5, 5),
(22, 6, 'Tolerant, considerate of others
Tenggang rasa, perhatian pada orang lain', '▲', '▲', 3, 3),
(23, 6, 'Joyful and carefree
Gembira dan tanpa beban', 'N', '*', 1, 4),
(24, 6, 'Likes harmony, loves peace
Suka kerukunan, cinta damai', 'N', '<<', 1, 2),
(25, 7, 'Fussy, everything must be exactly as desired
Rewel, segala sesuatu harus tepat seperti keinginannya', 'N', '<<', 1, 2),
(26, 7, 'Obedient
Patuh', '▲', 'N', 3, 1),
(27, 7, 'Invincible
Tidak terkalahkan', 'Z', 'Z', 5, 5),
(28, 7, 'Always wants to joke
Maunya bercanda terus', '*', '*', 4, 4),
(29, 8, 'Brave
Pemberani', 'Z', 'N', 5, 1),
(30, 8, 'Able to motivate people to do something
Mampu menggerakkan orang untuk melakukan sesuatu', '*', 'N', 4, 1),
(31, 8, 'Never argues, submissive
Tidak pernah membantah, tunduk', 'N', '▲', 1, 3),
(32, 8, 'Shy and hesitant
Pemalu dan ragu-ragu', 'N', '<<', 1, 2),
(33, 9, 'Friendly
Ramah', '*', '*', 4, 4),
(34, 9, 'Patient
Sabar', '▲', '▲', 3, 3),
(35, 9, 'Independent, self-confident
Mandiri, percaya diri', 'Z', 'Z', 5, 5),
(36, 9, 'Soft-spoken
Lembut tutur katanya', '<<', 'N', 2, 1),
(37, 10, 'Adventurous
Petualang', 'Z', 'Z', 5, 5),
(38, 10, 'Open-minded
Berpikir terbuka', '<<', 'N', 2, 1),
(39, 10, 'Warm, friendly
Hangat, bersahabat', 'N', '*', 1, 4),
(40, 10, 'Moderate, not extreme
Moderat, tidak ekstrim', '▲', '▲', 3, 3),
(41, 11, 'Talkative
Banyak bicara', '*', '*', 4, 4),
(42, 11, 'Full of self-control, good at hiding feelings
Penuh pengendalian diri, pandai menyembunyikan perasaan', '▲', '▲', 3, 3),
(43, 11, 'Dislikes strange things
Tidak suka yang aneh-aneh', 'N', '<<', 1, 2),
(44, 11, 'Dare to make decisions
Berani mengambil keputusan', 'Z', 'Z', 5, 5),
(45, 12, 'Full of etiquette
Penuh tata krama', 'N', '*', 1, 4),
(46, 12, 'Brave to act
Berani bertindak', 'Z', 'Z', 5, 5),
(47, 12, 'Good at building relationships
Pandai membangun relasi', '<<', 'N', 2, 1),
(48, 12, 'Easily satisfied
Mudah puas', '▲', '▲', 3, 3),
(49, 13, 'Aggressive
Agresif', 'Z', 'N', 5, 1),
(50, 13, 'Full of enthusiasm, can liven up the atmosphere
Penuh semangat, bisa menghidupkan suasana', '*', '*', 4, 4),
(51, 13, 'Obedient
Penurut', '▲', '▲', 3, 3),
(52, 13, 'Cowardly
Penakut', 'N', '<<', 1, 2),
(53, 14, 'Careful
Hati-hati', '<<', '<<', 2, 2),
(54, 14, 'Firm in conviction
Berpendirian teguh', 'Z', 'N', 5, 1),
(55, 14, 'Convincing
Meyakinkan', '*', '*', 4, 4),
(56, 14, 'Kind
Baik hati', '▲', 'N', 3, 1),
(57, 15, 'Likes to help
Suka menolong', '▲', 'N', 3, 1),
(58, 15, 'Eager to try new things
Berhasrat mencoba hal-hal baru', 'Z', 'Z', 5, 5),
(59, 15, 'Easily gets along with others
Mudah cocok dengan orang lain', '<<', '<<', 2, 2),
(60, 15, 'Lively, fiery spirit
Lincah, semangat berapi-api', 'N', '*', 1, 4),
(61, 16, 'Self-confident
Percaya diri', '*', 'N', 4, 1),
(62, 16, 'Understands others'' feelings
Mengerti perasaan orang lain', 'N', '▲', 1, 3),
(63, 16, 'Tolerant, able to accept others'' opinions
Toleran, dapat menerima pendapat orang lain', 'N', '<<', 1, 2),
(64, 16, 'Assertive, likes to impose personal opinions
Tegas, suka memaksakan pendapat pribadinya', 'Z', 'Z', 5, 5),
(65, 17, 'Disciplined
Disiplin', '<<', 'N', 2, 1),
(66, 17, 'Not selfish, generous
Tidak egois, murah hati', '▲', '▲', 3, 3),
(67, 17, 'Lively, expressive
Lincah, ekspresif', 'N', '*', 1, 4),
(68, 17, 'Never gives up, persistent
Pantang menyerah, gigih', 'Z', 'Z', 5, 5),
(69, 18, 'Respected
Dihormati', '*', 'N', 4, 1),
(70, 18, 'Kind
Baik hati', '▲', 'N', 3, 1),
(71, 18, 'Easily gives up
Mudah menyerah', 'N', '<<', 1, 2),
(72, 18, 'Strong conviction, not easily influenced
Berkeyakinan kuat, tidak mudah terpengaruh', 'Z', 'Z', 5, 5),
(73, 19, 'Respects others
Menghormati orang lain', '<<', 'N', 2, 1),
(74, 19, 'Likes to try new ideas
Suka mencoba ide baru', 'Z', 'Z', 5, 5),
(75, 19, 'Optimistic
Optimis', '*', '*', 4, 4),
(76, 19, 'Likes to please others
Suka menyenangkan orang lain', '▲', '▲', 3, 3),
(77, 20, 'Likes to quarrel, argue
Suka cekcok, berdebat', 'Z', 'Z', 5, 5),
(78, 20, 'Easily adapts
Mudah menyesuaikan diri', '<<', 'N', 2, 1),
(79, 20, 'Indifferent, cold
Acuh tak acuh, dingin', 'N', '▲', 1, 3),
(80, 20, 'Cheerful
Periang', '*', '*', 4, 4),
(81, 21, 'Trusts others
Percaya pada orang lain', '*', '*', 4, 4),
(82, 21, 'Easily satisfied
Mudah puas', 'N', '▲', 1, 3),
(83, 21, 'Confident
Yakin', 'Z', 'Z', 5, 5),
(84, 21, 'Fearless
Bebas dari rasa takut', '<<', '<<', 2, 2),
(85, 22, 'Good at socializing
Pandai bergaul', '*', '*', 4, 4),
(86, 22, 'Cultured
Berbudaya', 'N', '<<', 1, 2),
(87, 22, 'Fiery
Berapi-api', 'Z', 'Z', 5, 5),
(88, 22, 'Permissive
Serba membolehkan', '▲', '▲', 3, 3),
(89, 23, 'Makes others feel comfortable
Membuat orang lain merasa nyaman', '*', '*', 4, 4),
(90, 23, 'Not careless, thorough
Tidak ceroboh, teliti', '<<', 'N', 2, 1),
(91, 23, 'Speaks bluntly, frankly
Bicara blak-blakan, terus terang', 'Z', 'Z', 5, 5),
(92, 23, 'Loner, reserved
Penyendiri, tertutup', 'N', '▲', 1, 3),
(93, 24, 'Bored easily
Pembosan', 'Z', 'Z', 5, 5),
(94, 24, 'Likes to socialize
Suka bergaul', '▲', '▲', 3, 3),
(95, 24, 'Popular, liked by people
Populer, disukai orang', '*', '*', 4, 4),
(96, 24, 'Faithful, pious
Beriman, saleh', '<<', '<<', 2, 2);

-- Reset sequence agar id berikutnya lanjut 97
SELECT setval(pg_get_serial_sequence('public.psychotest_questions', 'id'), coalesce(max(id), 1), max(id) IS NOT null) FROM public.psychotest_questions;