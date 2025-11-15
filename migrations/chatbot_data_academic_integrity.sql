-- =====================================================
-- Academic Integrity Policy Knowledge Base Data
-- =====================================================

-- Category: Definitions
INSERT INTO knowledge_base (category, subcategory, keywords, question_patterns, title, content, short_answer, priority, source_section) VALUES
(
  'definitions',
  'academic_integrity',
  ARRAY['academic integrity', 'integritas akademik', 'honest', 'jujur', 'honesty', 'kejujuran', 'ethical', 'etika'],
  ARRAY['apa itu academic integrity', 'definisi academic integrity', 'jelaskan academic integrity', 'what is academic integrity', 'pengertian integritas akademik'],
  'Academic Integrity Definition',
  'Academic Integrity is a guiding principle whereby staff and students act in an honest, responsible, fair, trustworthy and respectful manner in an academic context. The IB defines it as "a set of values and skills that promote personal integrity and good practice in teaching, learning and assessment."',
  'Academic Integrity adalah prinsip untuk bertindak jujur, bertanggung jawab, adil, dapat dipercaya dan penuh hormat dalam konteks akademik.',
  10,
  'Definitions - Academic Integrity'
),
(
  'definitions',
  'artificial_intelligence',
  ARRAY['AI', 'artificial intelligence', 'kecerdasan buatan', 'chatgpt', 'gemini', 'copilot', 'generative ai'],
  ARRAY['apa itu AI', 'definisi AI', 'artificial intelligence adalah', 'what is AI', 'pengertian kecerdasan buatan'],
  'Artificial Intelligence (AI) Definition',
  'Artificial Intelligence (AI) is the simulation of human intelligence by computer systems. AI encompasses the ability of computers to perform tasks that typically require human cognitive functions such as learning, reasoning, problem-solving, perception, and language understanding. Examples include ChatGPT, Gemini, Copilot, Claude, and other generative AI tools.',
  'AI adalah simulasi kecerdasan manusia oleh sistem komputer, seperti ChatGPT, Gemini, dan Copilot.',
  10,
  'Definitions - AI'
);

-- Category: Responsibilities - Teachers/Staff
INSERT INTO knowledge_base (category, subcategory, keywords, question_patterns, title, content, short_answer, examples, priority, source_section) VALUES
(
  'responsibilities',
  'teachers_staff',
  ARRAY['teacher responsibility', 'staff responsibility', 'tanggung jawab guru', 'tugas guru', 'kewajiban guru'],
  ARRAY['apa tanggung jawab guru', 'tugas guru dalam academic integrity', 'teacher responsibilities', 'kewajiban staff'],
  'Teachers and Staff Responsibilities',
  'Teachers and staff have the following responsibilities in promoting academic integrity:
1. Model academic honesty in all aspects of teaching and learning
2. Provide a variety of teaching and learning experiences appropriate to students'' needs
3. Promote a positive classroom environment for thinking, questioning, and learning
4. Clearly communicate assessment expectations and requirements
5. Teach students how to avoid plagiarism through proper citation
6. Promote ATL (Approaches to Learning) skills - particularly thinking, communication, and social skills
7. Use formative assessment to give feedback throughout the learning process
8. Ensure students understand IB expectations and Academic Integrity Policy
9. Maintain student confidentiality when dealing with malpractice cases
10. Report any suspected malpractice or maladministration to IB Coordinator',
  'Guru bertanggung jawab untuk menjadi model kejujuran akademik, mengajar cara sitasi yang benar, memberikan feedback, dan melaporkan kecurigaan malpraktik.',
  ARRAY['Mengajarkan cara mengutip sumber dengan benar', 'Memberikan rubrik penilaian yang jelas', 'Memantau proses pengerjaan tugas siswa'],
  8,
  'Responsibilities - Teachers/Staff'
);

-- Category: Responsibilities - Students
INSERT INTO knowledge_base (category, subcategory, keywords, question_patterns, title, content, short_answer, examples, priority, source_section) VALUES
(
  'responsibilities',
  'students',
  ARRAY['student responsibility', 'tanggung jawab siswa', 'kewajiban siswa', 'tugas siswa'],
  ARRAY['apa tanggung jawab siswa', 'tugas siswa dalam academic integrity', 'student responsibilities', 'kewajiban murid'],
  'Student Responsibilities',
  'Students are expected to:
1. Complete all assignments, tasks, examinations, and quizzes honestly and independently
2. Give credit to sources used in all work through proper citation
3. Acknowledge all forms of support received (tutors, parents, peers)
4. Seek clarification from teachers when unsure about assessment expectations
5. Use appropriate ATL skills when completing work
6. Not engage in any form of academic misconduct (plagiarism, collusion, fabrication)
7. Understand and follow the Academic Integrity Policy
8. Take responsibility for their own learning and academic honesty',
  'Siswa harus mengerjakan tugas dengan jujur, memberikan kredit pada sumber yang digunakan, dan tidak melakukan plagiarisme atau kecurangan.',
  ARRAY['Mencantumkan daftar pustaka pada setiap karya tulis', 'Mengerjakan ujian tanpa menyontek', 'Meminta bantuan guru jika tidak paham'],
  9,
  'Responsibilities - Students'
);

-- Category: Responsibilities - Parents
INSERT INTO knowledge_base (category, subcategory, keywords, question_patterns, title, content, short_answer, examples, priority, source_section) VALUES
(
  'responsibilities',
  'parents',
  ARRAY['parent responsibility', 'tanggung jawab orang tua', 'peran orang tua', 'kewajiban orang tua'],
  ARRAY['apa tanggung jawab orang tua', 'peran orang tua dalam academic integrity', 'parent responsibilities', 'tugas orang tua'],
  'Parent Responsibilities',
  'Parents play a crucial role in supporting academic integrity:
1. Familiarize themselves with IB expectations and school''s Academic Integrity Policy
2. Promote and encourage academic honesty at home
3. Support their child''s learning without completing work for them
4. Encourage proper time management and organization skills
5. Ensure their child understands the importance of citing sources
6. Contact teachers if clarification is needed about assignments
7. Model ethical behavior and integrity in daily life
8. Support the school in upholding academic integrity standards',
  'Orang tua harus memahami kebijakan Academic Integrity, mendorong kejujuran akademik, dan mendukung pembelajaran anak tanpa mengerjakan tugas untuk mereka.',
  ARRAY['Membantu anak membuat jadwal belajar', 'Mendiskusikan pentingnya kejujuran dengan anak', 'Menghubungi guru jika ada pertanyaan tentang tugas'],
  7,
  'Responsibilities - Parents'
);

-- Category: Practices Not Acceptable - Maladministration
INSERT INTO knowledge_base (category, subcategory, keywords, question_patterns, title, content, short_answer, examples, priority, source_section) VALUES
(
  'practices_not_acceptable',
  'maladministration',
  ARRAY['maladministration', 'malpraktik administrasi', 'teacher misconduct', 'kesalahan guru'],
  ARRAY['apa itu maladministration', 'contoh maladministration', 'kesalahan administrasi'],
  'Maladministration',
  'Maladministration refers to any departure from IB regulations and requirements by teachers, invigilators, or school administration. This includes:
- Providing unauthorized assistance to students
- Allowing students extra time without authorization
- Failing to keep assessment materials secure
- Not reporting suspected malpractice
- Disclosing confidential IB materials
- Falsifying records or attendance
- Failing to follow IB assessment procedures
Maladministration compromises the integrity of IB assessments and must be reported to the IB.',
  'Maladministration adalah pelanggaran prosedur IB oleh guru atau staff, seperti memberikan bantuan tidak sah atau tidak melaporkan kecurigaan malpraktik.',
  ARRAY['Guru memberikan jawaban kepada siswa saat ujian', 'Membocorkan soal ujian sebelum waktunya', 'Tidak melaporkan siswa yang menyontek'],
  6,
  'Practices Not Acceptable - Maladministration'
);

-- Category: Practices Not Acceptable - Plagiarism
INSERT INTO knowledge_base (category, subcategory, keywords, question_patterns, title, content, short_answer, examples, priority, source_section) VALUES
(
  'practices_not_acceptable',
  'plagiarism',
  ARRAY['plagiarism', 'plagiat', 'copy paste', 'menjiplak', 'mencuri karya', 'tidak mengutip', 'no citation'],
  ARRAY['apa itu plagiarism', 'plagiat adalah', 'contoh plagiarisme', 'what is plagiarism', 'definisi plagiat', 'plagiarism artinya'],
  'Plagiarism',
  'Plagiarism is representing the ideas, words, or work of another person as your own. This includes:
- Copying text without quotation marks and citation
- Paraphrasing someone else''s work without citation
- Using ideas, theories, or research findings without acknowledgment
- Submitting work done by someone else (parent, tutor, friend, or purchased online)
- Using AI-generated content without proper attribution
- Self-plagiarism (submitting the same work for multiple assessments)

ALL sources must be cited properly, including websites, books, articles, interviews, images, videos, and AI tools.',
  'Plagiarisme adalah menggunakan ide, kata-kata, atau karya orang lain sebagai milik sendiri tanpa memberikan kredit yang tepat.',
  ARRAY['Copy paste dari internet tanpa mencantumkan sumber', 'Menggunakan hasil ChatGPT tanpa menyebutkan', 'Menyalin pekerjaan teman', 'Membeli essay online dan submit sebagai karya sendiri'],
  10,
  'Practices Not Acceptable - Plagiarism'
);

-- Category: Practices Not Acceptable - Collusion
INSERT INTO knowledge_base (category, subcategory, keywords, question_patterns, title, content, short_answer, examples, priority, source_section) VALUES
(
  'practices_not_acceptable',
  'collusion',
  ARRAY['collusion', 'kolusi', 'kerja sama tidak sah', 'bekerja sama curang', 'collaboration unauthorized'],
  ARRAY['apa itu collusion', 'kolusi adalah', 'bedanya kolaborasi dan kolusi', 'contoh collusion', 'kapan boleh kerja sama'],
  'Collusion',
  'Collusion is unauthorized collaboration between students that results in work that is not independently produced. Key points:

COLLUSION (Not Allowed):
- Submitting substantially similar work when independent work is required
- Allowing your work to be copied by another student
- Sharing answers during individual assessments
- Writing or completing work for another student
- Jointly producing work that should be individual

COLLABORATION (Allowed):
- Group projects explicitly assigned by teacher
- Brainstorming ideas together (but writing independently)
- Peer feedback and editing (with acknowledgment)
- Discussing concepts and sharing resources

Always ask your teacher if you''re unsure whether collaboration is permitted for a specific task.',
  'Kolusi adalah kerja sama tidak sah antara siswa yang menghasilkan karya tidak independen. Berbeda dengan kolaborasi yang diizinkan guru.',
  ARRAY['Dua siswa mengerjakan essay dengan konten hampir identik', 'Memberikan jawaban homework kepada teman', 'Mengerjakan individual assessment bersama-sama'],
  9,
  'Practices Not Acceptable - Collusion'
);

-- Category: Practices Not Acceptable - Fabrication
INSERT INTO knowledge_base (category, subcategory, keywords, question_patterns, title, content, short_answer, examples, priority, source_section) VALUES
(
  'practices_not_acceptable',
  'fabrication',
  ARRAY['fabrication', 'fabrikasi', 'data palsu', 'fake data', 'membuat data', 'manipulasi data'],
  ARRAY['apa itu fabrication', 'fabrikasi adalah', 'contoh fabrication', 'boleh buat data sendiri'],
  'Fabrication and Falsification',
  'Fabrication is inventing or falsifying data, citations, or information. This includes:
- Making up experimental data or survey results
- Citing sources that don''t exist
- Inventing interview responses or quotations
- Creating fake bibliography entries
- Manipulating data to achieve desired results
- Falsifying CAS experiences or service hours
- Claiming to have completed work that was not done

All data, sources, and information must be authentic and verifiable. If you cannot obtain real data, discuss alternatives with your teacher.',
  'Fabrikasi adalah membuat data palsu atau memalsukan informasi dalam karya akademik.',
  ARRAY['Membuat hasil survey yang tidak pernah dilakukan', 'Menulis sumber buku yang tidak pernah dibaca', 'Membuat-buat hasil interview', 'Memanipulasi data eksperimen'],
  7,
  'Practices Not Acceptable - Fabrication'
);

-- Category: Practices Acceptable - Library Resources
INSERT INTO knowledge_base (category, subcategory, keywords, question_patterns, title, content, short_answer, examples, priority, source_section) VALUES
(
  'practices_acceptable',
  'library',
  ARRAY['library', 'perpustakaan', 'buku', 'books', 'library resources'],
  ARRAY['boleh pakai perpustakaan', 'cara pakai library', 'how to use library', 'sumber perpustakaan'],
  'Using Library Resources',
  'School library resources are excellent sources for research and must be properly cited:

Physical Books:
- Check out books relevant to your topic
- Take notes and cite properly
- Include in bibliography: Author, Title, Publisher, Year

Digital Library:
- Use school''s online library databases
- Access eBooks and digital resources
- Cite digital sources with URL and access date

Always ask librarians for help finding reliable sources!',
  'Perpustakaan menyediakan buku dan database online yang dapat digunakan untuk penelitian. Semua sumber harus dicantumkan dalam daftar pustaka.',
  ARRAY['Meminjam buku referensi dari perpustakaan', 'Mengakses JSTOR melalui library account', 'Meminta rekomendasi sumber dari pustakawan'],
  8,
  'Practices Acceptable - Library'
);

-- Category: Practices Acceptable - eBooks & Online Sources
INSERT INTO knowledge_base (category, subcategory, keywords, question_patterns, title, content, short_answer, examples, priority, source_section) VALUES
(
  'practices_acceptable',
  'ebooks_online',
  ARRAY['ebook', 'e-book', 'online books', 'buku online', 'buku digital', 'google books'],
  ARRAY['boleh pakai ebook', 'cara sitasi ebook', 'buku online boleh', 'how to cite ebooks'],
  'Using eBooks and Online Books',
  'eBooks and online books are acceptable sources when properly cited:

Acceptable eBook Sources:
- Google Books
- School library eBook collections
- Amazon Kindle (for reference, not copying)
- Academic publishers'' digital books
- Project Gutenberg (public domain books)

Citation Requirements:
- Author name
- Book title
- Publisher
- Publication year
- eBook format (Kindle, PDF, etc.)
- URL or DOI (if available)
- Date accessed

Remember: You must still paraphrase or quote properly - copying paragraphs from eBooks without citation is plagiarism.',
  'eBook dan buku online boleh digunakan sebagai sumber, tetapi harus disitasi dengan lengkap termasuk format digital dan tanggal akses.',
  ARRAY['Membaca artikel dari Google Books dan mencantumkan sumbernya', 'Mengutip buku digital dari perpustakaan sekolah', 'Menggunakan textbook PDF dengan proper citation'],
  8,
  'Practices Acceptable - eBooks'
);

-- Category: Practices Acceptable - Search Engines
INSERT INTO knowledge_base (category, subcategory, keywords, question_patterns, title, content, short_answer, examples, priority, source_section) VALUES
(
  'practices_acceptable',
  'search_engines',
  ARRAY['google', 'search engine', 'mesin pencari', 'bing', 'yahoo', 'duckduckgo', 'internet search'],
  ARRAY['boleh pakai google', 'boleh search di google', 'cara pakai search engine', 'google boleh tidak'],
  'Using Search Engines',
  'Search engines like Google are tools to FIND information, not sources themselves:

Proper Use:
✓ Use Google to find reliable websites, articles, and sources
✓ Evaluate source credibility (check author, date, publisher)
✓ Cite the ACTUAL SOURCE (the website/article), not "Google"
✓ Use advanced search techniques for better results

WRONG Citation: "Source: Google"
RIGHT Citation: "Source: National Geographic, www.nationalgeographic.com, accessed 10 Nov 2025"

Evaluating Online Sources:
- Check author credentials
- Look for publication date
- Verify with multiple sources
- Prefer .edu, .gov, or established organizations
- Avoid unreliable websites like Wikipedia for formal citations (use as starting point only)',
  'Search engine seperti Google boleh digunakan untuk mencari sumber, tetapi yang dicantumkan adalah sumber aslinya (website/artikel), bukan "Google".',
  ARRAY['Mencari artikel ilmiah melalui Google Scholar', 'Menggunakan Google untuk menemukan website resmi pemerintah', 'Evaluasi kredibilitas website yang ditemukan'],
  9,
  'Practices Acceptable - Search Engines'
);

-- Category: Practices Acceptable - Academic Journals
INSERT INTO knowledge_base (category, subcategory, keywords, question_patterns, title, content, short_answer, examples, priority, source_section) VALUES
(
  'practices_acceptable',
  'journals',
  ARRAY['journal', 'jurnal', 'academic journal', 'research paper', 'peer reviewed', 'scholarly articles'],
  ARRAY['boleh pakai jurnal', 'cara sitasi jurnal', 'journal boleh', 'how to cite journal'],
  'Using Academic Journals',
  'Academic journals and peer-reviewed articles are EXCELLENT sources for research:

Recommended Databases:
- Google Scholar
- JSTOR
- PubMed
- IEEE Xplore
- SpringerLink
- ScienceDirect

Benefits of Journal Articles:
- Peer-reviewed (quality checked by experts)
- Original research and data
- Credible and reliable
- Current information

Citation Requirements for Journals:
- Author(s) name
- Article title
- Journal name
- Volume and issue number
- Page numbers
- Publication year
- DOI or URL
- Date accessed (for online journals)

Always prefer peer-reviewed academic sources over blogs or opinion articles.',
  'Jurnal akademik dan artikel peer-reviewed adalah sumber yang sangat baik untuk penelitian dan harus disitasi dengan lengkap.',
  ARRAY['Menggunakan artikel dari JSTOR untuk research paper', 'Mencari studi ilmiah di Google Scholar', 'Mensitasi jurnal dengan DOI'],
  8,
  'Practices Acceptable - Journals'
);

-- Category: Practices Acceptable - AI Usage
INSERT INTO knowledge_base (category, subcategory, keywords, question_patterns, title, content, short_answer, examples, priority, source_section) VALUES
(
  'practices_acceptable',
  'ai_usage',
  ARRAY['AI usage', 'pakai AI', 'chatgpt', 'gemini', 'copilot', 'artificial intelligence', 'boleh pakai AI', 'can use AI'],
  ARRAY['boleh pakai AI', 'boleh pakai chatgpt', 'AI boleh tidak', 'can I use AI', 'chatgpt allowed', 'cara pakai AI yang benar'],
  'Using AI Tools Appropriately',
  'AI tools like ChatGPT, Gemini, and Copilot CAN be used for learning, but with important rules:

ALLOWED AI Uses:
✓ Brainstorming and generating ideas
✓ Understanding difficult concepts (as a tutor)
✓ Getting feedback on your draft work
✓ Learning grammar and vocabulary
✓ Checking your reasoning or logic
✓ Generating practice questions
✓ Translating for understanding (not for submission)

NOT ALLOWED:
✗ Submitting AI-generated text as your own work
✗ Having AI write your essays, reports, or assignments
✗ Using AI during assessments unless explicitly permitted
✗ Copy-pasting AI output without attribution

CITATION REQUIREMENT:
If you use AI for ANY part of your work (even just ideas), you MUST:
1. Clearly state which AI tool you used
2. Describe how you used it
3. Include the specific prompts you gave
4. Include in your bibliography

Example: "I used ChatGPT (GPT-4, OpenAI, 2024) to brainstorm initial ideas about climate change impacts. I then independently researched and wrote all content."

Remember: AI is a TOOL for learning, not a replacement for your own thinking and work.',
  'AI boleh digunakan untuk brainstorming, belajar, dan feedback, TETAPI tidak boleh untuk mengerjakan tugas. Semua penggunaan AI harus dicantumkan dan dijelaskan.',
  ARRAY['Menggunakan ChatGPT untuk memahami konsep sulit, lalu menulis sendiri', 'Meminta AI untuk memberikan feedback pada draft essay', 'Brainstorming ide dengan Gemini, kemudian develop sendiri'],
  10,
  'Practices Acceptable - AI Usage'
);

-- Category: Practices Acceptable - Citations
INSERT INTO knowledge_base (category, subcategory, keywords, question_patterns, title, content, short_answer, examples, priority, source_section) VALUES
(
  'practices_acceptable',
  'citations',
  ARRAY['citation', 'sitasi', 'kutipan', 'daftar pustaka', 'bibliography', 'reference', 'referensi', 'mla', 'apa', 'chicago'],
  ARRAY['cara sitasi', 'how to cite', 'format sitasi', 'cara mengutip', 'daftar pustaka', 'bibliography format', 'mla apa chicago'],
  'Proper Citation Methods',
  'Proper citation is ESSENTIAL to avoid plagiarism. Schools typically use MLA, APA, or Chicago styles:

When to Cite:
- Direct quotes (word-for-word copying)
- Paraphrasing (rewriting in your own words)
- Ideas, theories, or concepts from others
- Data, statistics, or research findings
- Images, charts, graphs, videos
- AI-generated content or assistance

Citation Styles:
1. MLA (Modern Language Association)
   - Common in humanities
   - In-text: (Author Page)
   - Works Cited at end

2. APA (American Psychological Association)
   - Common in sciences and social sciences
   - In-text: (Author, Year)
   - References at end

3. Chicago
   - Common in history
   - Footnotes or endnotes
   - Bibliography at end

Basic Components:
- Author name
- Title of work
- Publisher/Source
- Publication date
- URL (for online sources)
- Access date (for websites)

Citation Tools:
- Purdue OWL (online writing lab)
- Citation Machine
- EasyBib
- Zotero
- Mendeley

Ask your teacher which citation style to use for each assignment!',
  'Sitasi wajib dilakukan untuk semua sumber yang digunakan. Format umum: MLA, APA, atau Chicago. Komponen: author, title, publisher, date, URL.',
  ARRAY['MLA in-text: (Smith 45)', 'APA in-text: (Johnson, 2023)', 'Chicago: footnote dengan full citation'],
  10,
  'Practices Acceptable - Citations'
);

-- Category: Student Supports - ATL Skills
INSERT INTO knowledge_base (category, subcategory, keywords, question_patterns, title, content, short_answer, examples, priority, source_section) VALUES
(
  'supports',
  'atl_skills',
  ARRAY['ATL', 'approaches to learning', 'atl skills', 'thinking skills', 'communication skills', 'social skills'],
  ARRAY['apa itu ATL', 'ATL skills', 'approaches to learning', 'cara belajar yang baik'],
  'ATL Skills for Academic Integrity',
  'Approaches to Learning (ATL) skills help students maintain academic integrity:

1. THINKING SKILLS
   - Critical thinking: Evaluate source credibility
   - Creative thinking: Generate original ideas
   - Transfer: Apply knowledge across subjects

2. COMMUNICATION SKILLS
   - Reading: Understand sources deeply
   - Writing: Express ideas in own words
   - Speaking: Discuss and present original work

3. SOCIAL SKILLS
   - Collaboration: Work ethically in groups
   - Ethical decisions: Choose honest approaches

4. SELF-MANAGEMENT SKILLS
   - Time management: Avoid last-minute copying
   - Organization: Keep track of sources

5. RESEARCH SKILLS
   - Information literacy: Find reliable sources
   - Media literacy: Evaluate online content
   - Citation: Properly attribute sources

Developing strong ATL skills reduces temptation for academic misconduct!',
  'ATL skills (Approaches to Learning) membantu siswa belajar dengan jujur melalui critical thinking, komunikasi, kolaborasi, time management, dan research skills.',
  ARRAY['Menggunakan critical thinking untuk evaluasi sumber', 'Time management yang baik mengurangi tekanan untuk menyontek', 'Research skills untuk menemukan sumber terpercaya'],
  7,
  'Supports - ATL Skills'
);

-- Category: Student Supports - Citation Tools
INSERT INTO knowledge_base (category, subcategory, keywords, question_patterns, title, content, short_answer, examples, priority, source_section) VALUES
(
  'supports',
  'citation_tools',
  ARRAY['citation tools', 'tools sitasi', 'purdue owl', 'easybib', 'zotero', 'mendeley', 'citation machine'],
  ARRAY['tools untuk sitasi', 'website untuk citation', 'cara mudah sitasi', 'citation tools apa saja'],
  'Citation Tools and Resources',
  'Many free tools are available to help with proper citation:

Online Citation Generators:
1. Purdue OWL (https://owl.purdue.edu)
   - Comprehensive guide for MLA, APA, Chicago
   - Examples and explanations
   - FREE and reliable

2. Citation Machine
   - Auto-generate citations
   - Multiple formats
   - Free basic version

3. EasyBib
   - Simple interface
   - Scan book barcodes
   - Free for basic citations

Reference Management Software:
1. Zotero (FREE)
   - Store and organize sources
   - Auto-generate bibliographies
   - Browser extension

2. Mendeley (FREE)
   - PDF annotation
   - Collaboration features
   - Citation plugin for Word

3. Google Docs Citation Tool
   - Built-in to Google Docs
   - Simple and accessible

Browser Extensions:
- Zotero Connector
- MyBib
- Cite This For Me

Remember: These tools help format citations, but YOU must still:
- Include ALL sources used
- Check for accuracy
- Use your own words in writing',
  'Tools seperti Purdue OWL, Zotero, Mendeley, EasyBib, dan Citation Machine dapat membantu membuat sitasi yang benar dan terformat.',
  ARRAY['Menggunakan Zotero untuk menyimpan dan mensitasi semua sumber', 'Generate MLA citation dengan EasyBib', 'Belajar format APA dari Purdue OWL'],
  8,
  'Supports - Citation Tools'
);

-- Category: Student Supports - Monitoring
INSERT INTO knowledge_base (category, subcategory, keywords, question_patterns, title, content, short_answer, examples, priority, source_section) VALUES
(
  'supports',
  'monitoring',
  ARRAY['monitoring', 'check plagiarism', 'cek plagiat', 'turnitin', 'plagiarism checker', 'detection'],
  ARRAY['bagaimana sekolah cek plagiat', 'tools untuk detect plagiarism', 'turnitin apa', 'cara sekolah monitor'],
  'Academic Integrity Monitoring',
  'Schools use various methods to support and monitor academic integrity:

Plagiarism Detection Tools:
- Turnitin: Checks against internet sources, publications, and student papers
- Google Search: Teachers can search suspicious phrases
- AI Detection: Tools to identify AI-generated content
- Manual Checking: Teachers review student work patterns

Teacher Monitoring Methods:
- Regular check-ins during assignment process
- Draft submissions to track progress
- Class discussions about work
- Comparing writing styles across assignments
- Checking sources cited in bibliography

Process Verification:
- Research notes and outlines
- Bibliography development over time
- Rough drafts vs. final submissions
- In-class writing samples for comparison

Prevention Strategies:
- Clear rubrics and expectations
- Scaffolded assignments with checkpoints
- Teaching proper citation methods
- Discussion of case studies
- Student commitment forms

Remember: These tools exist to SUPPORT honest work, not to catch students. Focus on doing your work authentically from the start!',
  'Sekolah menggunakan Turnitin, AI detection, dan monitoring proses untuk mendukung academic integrity. Focus pada kerja jujur sejak awal.',
  ARRAY['Submit draft untuk mendapat feedback sebelum final', 'Menyimpan research notes sebagai bukti proses', 'Guru membandingkan writing style dengan in-class work'],
  6,
  'Supports - Monitoring'
);

-- Category: Policies - Discretionary Power
INSERT INTO knowledge_base (category, subcategory, keywords, question_patterns, title, content, short_answer, examples, priority, source_section) VALUES
(
  'policies',
  'discretionary_power',
  ARRAY['consequences', 'konsekuensi', 'punishment', 'hukuman', 'penalty', 'sanksi', 'disciplinary'],
  ARRAY['apa hukuman plagiat', 'konsekuensi menyontek', 'punishment for cheating', 'sanksi academic misconduct'],
  'Consequences and Discretionary Power',
  'The school and IB have authority to determine appropriate consequences for academic misconduct:

School-Level Consequences (may include):
- Warning and education about academic integrity
- Required resubmission of work
- Reduced grade or zero on assignment
- Parent conference
- Academic probation
- Disciplinary record
- Impact on honor roll or awards

IB-Level Consequences (for IB assessments):
- Investigation by IB
- No grade awarded for that component
- No diploma/certificate awarded
- Subject disqualification
- Examination session disqualification
- Ban from future IB examinations

Factors Considered:
- Severity of misconduct
- Intent (deliberate vs. misunderstanding)
- Student''s prior record
- Student''s acknowledgment and reflection
- Age and experience level

Important Notes:
- Each case is reviewed individually
- Students have opportunity to explain
- Confidentiality is maintained
- Focus is on learning and growth
- Repeat offenses have more serious consequences

Prevention is Better Than Consequences:
- Ask questions when unsure
- Start assignments early
- Use proper citation
- Seek help from teachers
- Be honest about challenges',
  'Konsekuensi academic misconduct bervariasi dari warning hingga tidak dapat diploma IB, tergantung tingkat keparahan dan apakah ada pengulangan.',
  ARRAY['First offense: warning dan edukasi', 'Serious plagiarism: zero pada assignment', 'IB exam cheating: dapat no diploma'],
  9,
  'Policies - Discretionary Power'
);

-- Category: Policies - How to Get Help
INSERT INTO knowledge_base (category, subcategory, keywords, question_patterns, title, content, short_answer, examples, priority, source_section) VALUES
(
  'policies',
  'getting_help',
  ARRAY['help', 'bantuan', 'ask teacher', 'tanya guru', 'support', 'dukungan', 'stuck', 'confused'],
  ARRAY['bagaimana minta bantuan', 'stuck dengan tugas', 'tidak paham assignment', 'how to get help', 'siapa yang bisa bantu'],
  'How to Get Help Appropriately',
  'When you need help with assignments, these are APPROPRIATE ways to get support:

From Teachers:
✓ Ask questions about assignment requirements
✓ Request clarification on expectations
✓ Get feedback on drafts and outlines
✓ Discuss research strategies
✓ Request extra time if needed (before deadline)
✓ Explain personal challenges affecting work

From Peers (for individual work):
✓ Discuss general concepts and ideas
✓ Share resources and sources
✓ Provide feedback on drafts (with acknowledgment)
✓ Study together for tests
✗ Do NOT: Copy work, share answers, or complete work for each other

From Tutors/Parents:
✓ Explain concepts and provide examples
✓ Help with understanding, not doing
✓ Guide research and organization
✓ Proofread for errors (not rewrite)
✓ MUST be acknowledged in work

From Online Resources:
✓ Use educational websites to learn
✓ Watch tutorial videos
✓ Use citation tools
✓ AI for understanding (not generating)
✓ MUST cite all sources used

Red Flags - These are NOT okay:
✗ "Can you write this for me?"
✗ "What did you write for question 3?"
✗ Asking AI to write your essay
✗ Buying essays online
✗ Copying from internet without citation

Remember: Teachers WANT to help you succeed honestly. It''s always better to submit work that''s truly yours, even if it''s not perfect, than to submit dishonest work.',
  'Cara tepat minta bantuan: tanya guru untuk klarifikasi, diskusi konsep dengan teman (bukan copy jawaban), tutor untuk penjelasan (bukan mengerjakan), dan acknowledge semua bantuan.',
  ARRAY['Email guru: "Saya tidak paham bagian X, bisa dijelaskan?"', 'Diskusi konsep dengan teman tanpa share jawaban spesifik', 'Orang tua membantu brainstorm ide, anak yang menulis'],
  10,
  'Policies - Getting Help'
);
