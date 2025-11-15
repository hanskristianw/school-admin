-- =====================================================
-- Language Policy Knowledge Base Data
-- =====================================================

-- Category: Language - Philosophy & IB Perspective
INSERT INTO knowledge_base (category, subcategory, keywords, question_patterns, title, content, short_answer, source_section, priority) VALUES
(
  'language',
  'philosophy',
  ARRAY['language philosophy', 'language policy', 'why language important', 'language learning', 'filosofi bahasa', 'bagaimana language', 'tentang bahasa'],
  ARRAY['language philosophy', 'language policy', 'language policy CCS', 'why language important', 'language learning philosophy', 'pentingnya bahasa'],
  'CCS Language Philosophy',
  'At CCS, we believe **language is essential** to the development of children as active learners.

**Core Beliefs:**
• Language allows students to understand the world
• Fosters learning new perspectives and creativity
• **Transdisciplinary** - not just a single subject, but throughout curriculum
• Cornerstone for inquiry and medium of instruction for all subjects
• All teachers must be active participants in language learning

**How We Use Language:**
• Enhance communication skills (verbal & non-verbal)
• Strengthen literacy and media skills through research
• Analysis and evaluation of information
• Empower students to understand the world

**Teacher Role:**
Every teacher is a **language teacher** - teaching students through language and research. Language is one of the foundations of education at CCS.',
  'Language is essential for active learning, transdisciplinary across curriculum, and cornerstone for inquiry. Every teacher is a language teacher supporting communication and literacy.',
  'Language Policy - Philosophy',
  10
),
(
  'language',
  'ib_perspective',
  ARRAY['IB language', 'three aspects', 'learning language', 'learning through language', 'learning about language'],
  ARRAY['IB language perspective', 'three language aspects', 'learning language through about'],
  'IB Perspective on Language Learning',
  'The IB places emphasis on language across all programs, recognizing it as a powerful tool for global engagement and responsible citizenship.

**Three Categories of Language Learning:**

**1. Learning Language**
• Ability to engage with multiple languages
• Variety of approaches for learning new skills
• Practice skills in the classroom

**2. Learning Through Language**
• Understand new ideas through listening, reading, speaking, performing, writing, viewing
• Teachers create thoughtful conversations
• Draw on students'' prior knowledge

**3. Learning About Language**
• Forms, conventions, and context of text types
• How to create and understand texts
• How to use texts in work

**IB Goals:**
• Foster intercultural understanding
• Develop appreciation for various cultures
• Enhance communication skills
• Support learning multiple languages
• Develop critical thinking
• Promote global citizenship

These aspects are closely related and help students make connections and create meaning through language.',
  'IB emphasizes three aspects: (1) Learning language - skills practice, (2) Learning through language - understanding ideas, (3) Learning about language - forms and conventions.',
  'Language Policy - IB Perspective',
  9
);

-- Category: Language - Student Profile & Assessment
INSERT INTO knowledge_base (category, subcategory, keywords, question_patterns, title, content, short_answer, source_section, priority) VALUES
(
  'language',
  'student_profile',
  ARRAY['student language profile', 'indonesian students', 'home language', 'english proficiency'],
  ARRAY['student language background', 'home language', 'indonesian students language'],
  'Students Language Profile',
  'Understanding CCS students'' language backgrounds:

**Language Background:**
• All students from Indonesia
• Most families primarily use **Indonesian language and Surabaya dialect** at home
• Some families use English as primary language
• Most students have **English as an additional language (EAL)**

**Assessment & Placement:**
Internal assessments monitor progress, identify achievements, and address areas needing support. Placement assessments ensure MYP students are in appropriate language courses.

**Early Years (PYP):**
• Language data collected upon entry
• Determine proficiency levels
• Ensure comprehension of instructional language
• Support active participation
• Implement necessary interventions

**Elementary (PYP):**
• Assess language abilities
• Identify students needing additional support
• Implement differentiated language programs
• Support students facing language barriers

**MYP:**
• Essential for accurate placement
• English: Language Literature OR Language Acquisition
• Bahasa Indonesia: Language Literature (home language)
• Chinese: Language Acquisition (additional language for all)',
  'Most CCS students speak Indonesian/Surabaya dialect at home with English as additional language. Assessments determine proficiency and placement in appropriate programs.',
  'Language Policy - Student Profile & Assessment',
  8
);

-- Category: Language - Languages Offered (with examples)
INSERT INTO knowledge_base (category, subcategory, keywords, question_patterns, title, content, short_answer, examples, source_section, priority) VALUES
(
  'language',
  'languages_offered',
  ARRAY['languages offered', 'language policy', 'english chinese indonesian', 'language classes', 'teaching hours', 'bahasa indonesia chinese english', 'bahasa apa', 'language apa'],
  ARRAY['what languages taught', 'languages offered', 'language policy di CCS', 'teaching hours per language', 'bahasa chinese english'],
  'Languages Offered at CCS',
  'CCS offers **three languages** at all levels with specified teaching hours:

**Early Years (Nursery & Kindergarten):**
• **English** - Minimum 2 hours/week
• **Bahasa Indonesia** - Minimum 2 hours/week
• **Chinese** - Minimum 2 hours/week
*Focus:* Introducing language through play and songs

**Primary Years Program (PYP):**
• **English** - Minimum 4 hours/week
• **Bahasa Indonesia** - Minimum 4 hours/week
• **Chinese** - Minimum 4 hours/week
*Focus:* Natural authenticity, literature-rich environment

**Middle Years Program (MYP):**
• **English** - Minimum 50 hours/year (Language Acquisition OR Language Literature)
• **Bahasa Indonesia** - Minimum 50 hours/year (Language Literature)
• **Chinese** - Minimum 50 hours/year (Language Acquisition)
*Focus:* Two paths for English, specialized literature exposure

**Language of Instruction:**
• **Primary language:** English
• **Specialized classes:** Chinese and Bahasa Indonesia used accordingly
• **Principle:** "Every teacher is a language teacher"',
  'Three languages: English, Bahasa Indonesia, Chinese. EY: 2hrs/week each; PYP: 4hrs/week each; MYP: 50hrs/year each. English is primary instruction language.',
  ARRAY['Early Years learn through play and songs', 'PYP minimum 4 hours per week per language', 'MYP English has two paths: Literature or Acquisition'],
  'Language Policy - Languages Offered',
  10
);

-- Category: Language - Early Years & PYP (without examples)
INSERT INTO knowledge_base (category, subcategory, keywords, question_patterns, title, content, short_answer, source_section, priority) VALUES
(
  'language',
  'early_years',
  ARRAY['early years language', 'nursery kindergarten', 'play songs', 'EY language'],
  ARRAY['early years language', 'kindergarten language', 'EY language learning'],
  'Early Years Language Learning',
  'In Early Years, language learning focuses on **play-based introduction** and positive environment:

**Teaching Approach:**
• Introduce new language through **play and songs**
• Create habits and routines around activities
• Consistently achieve language goals
• Positive language environment

**Classroom Environment:**
• Display vocabulary and simple sentences
• **Multilingual displays** - Chinese, English, Bahasa Indonesia
• Encourage active participation in all three languages
• Visual support for comprehension

**Teacher Support:**
• **Two teachers per classroom** for individualized attention
• Model correct pronunciation and vocabulary
• Use gestures and visuals
• Storybooks read in different languages
• Flexible grouping and one-on-one instruction
• Label classroom items in multiple languages

**Focus Skills:**
• Building foundation of communication
• Expressing thoughts and ideas confidently
• Making connections between words and meaning',
  'Early Years learns through play, songs, and routines. Multilingual displays in classroom. Two teachers per class provide individualized attention with visual support.',
  'Language Policy - Early Years',
  8
),
(
  'language',
  'pyp_language',
  ARRAY['PYP language', 'primary years language', 'phonemic awareness', 'literacy PYP'],
  ARRAY['PYP language learning', 'primary years language', 'elementary language'],
  'Primary Years Programme (PYP) Language',
  'In PYP, we encourage **natural authenticity** of language learning:

**Learning Environment:**
• Challenge students in literature-rich environment
• Many opportunities to inquire about new topics
• Connect with wide range of ideas
• Learning through language

**Specialized Classes Include:**
• Phonemic awareness
• Reading
• Writing
• Listening
• Speaking

**Transdisciplinary Literacy:**
• Become literate in **all classes**, not just language class
• Explore texts that connect the world around them
• **Word walls** in English, Bahasa Indonesia, Chinese
• Support vocabulary development

**Teacher Responsibilities:**
• Integrate language into all subjects and units of inquiry
• Model academic language
• Encourage subject-specific vocabulary
• Plan experiences for reading, writing, communicating
• Ask open-ended questions
• Provide opportunities for discussion and reflection

**Example:** Students may research in home language and present findings in English.',
  'PYP emphasizes literature-rich environment with specialized classes (phonemic, reading, writing, listening, speaking). Literacy integrated across all subjects with multilingual word walls.',
  'Language Policy - PYP',
  9
),
(
  'language',
  'myp_language',
  ARRAY['MYP language', 'middle years language', 'language acquisition', 'language literature'],
  ARRAY['MYP language', 'language acquisition vs literature', 'middle years language'],
  'Middle Years Programme (MYP) Language',
  'MYP offers **two language paths** for English with specialized instruction:

**English Paths:**
1. **Language Literature** - For proficient English speakers
2. **Language Acquisition** - For English language learners
*Note:* Students tested before entry for accurate placement

**All Languages:**
• **Bahasa Indonesia:** Language Literature (home language)
• **Chinese:** Language Acquisition (additional language for all)
• **English:** Literature OR Acquisition (based on proficiency)

**Teaching Focus:**
• Exposure to different types of literature
• Use language as learning tool
• Every teacher actively teaches subject-related language
• Primary language: English
• Specialized classes: Chinese and Bahasa Indonesia

**Teacher Support:**
• Design lessons with extended communication (essays, debates, presentations)
• Differentiate instruction for Literature vs. Acquisition learners
• Guide analysis of how language influences meaning
• Use language to deepen inquiry, reflection, critical thinking
• Differentiated classrooms by proficiency levels

**Skills Developed:**
• Higher levels of language proficiency
• Academic expression
• Critical analysis
• Communication across contexts',
  'MYP English has two paths: Language Literature (proficient) or Language Acquisition (learners). Bahasa Indonesia: Literature. Chinese: Acquisition for all. Students tested for placement.',
  'Language Policy - MYP',
  10
);

-- Category: Language - Home Language Support
INSERT INTO knowledge_base (category, subcategory, keywords, question_patterns, title, content, short_answer, source_section, priority) VALUES
(
  'language',
  'home_language',
  ARRAY['home language', 'bahasa indonesia support', 'mother tongue', 'native language', 'cultural learning'],
  ARRAY['home language support', 'mother tongue', 'native language', 'bahasa indonesia class'],
  'Home Language and Culture Support',
  'CCS recognizes the importance of students'' **home language** and actively encourages its use:

**Why Home Language Matters:**
• Fosters sense of belonging and inclusivity
• Students feel respected and valued
• Increases engagement in classroom
• Celebrates culture and heritage
• Creates environment where students thrive

**How We Support:**
• Actively encourage home language use within classroom
• Practice routines incorporating home languages
• Students express themselves in native language alongside English
• Respect for home language creates positive culture

**Bahasa Indonesia Classes:**
• Weekly classes for all students
• Learn language skills
• Learn importance of background and heritage
• Cultural learning embedded in units of inquiry (EY & PYP)
• Specialized language lessons (MYP)

**Teacher Support:**
• Teachers specialized in ensuring home language continuation
• Cultural learning integrated into curriculum
• Multilingual classroom displays
• Research in home language, present in English (encouraged)',
  'Home language actively encouraged in classroom. Weekly Bahasa Indonesia classes teach language skills and cultural heritage. Creates inclusive environment where students thrive.',
  'Language Policy - Home Language Support',
  9
);

-- Category: Language - Teacher Responsibilities
INSERT INTO knowledge_base (category, subcategory, keywords, question_patterns, title, content, short_answer, examples, source_section, priority) VALUES
(
  'language',
  'teacher_responsibilities',
  ARRAY['teacher responsibilities', 'every teacher language teacher', 'teacher role language', 'language instruction'],
  ARRAY['teacher language responsibilities', 'every teacher language teacher', 'teacher role in language'],
  'Teacher Responsibilities in Language Learning',
  'At CCS, **every teacher is a language teacher** - all play important role in developing communication skills.

**Universal Teacher Responsibilities:**
• Model effective language use
• Provide opportunities for reading, writing, listening, speaking
• Intentionally create language-rich environment
• Support growth in understanding and using language
• Integrate language learning into all subjects

**Early Years Teachers:**
• Build foundation through play, songs, stories, routines
• Model pronunciation and vocabulary
• Use gestures and visuals for comprehension
• Create multilingual environment
• Label classroom items in multiple languages
• Read storybooks in different languages
• Work closely for balanced language exposure

**PYP Teachers:**
• Integrate language into all subjects and inquiry units
• Model academic language
• Encourage subject-specific vocabulary
• Plan experiences for reading, writing, communicating
• Display word walls in three languages
• Ask open-ended questions
• Provide discussion and reflection opportunities

**MYP Teachers:**
• Support higher language proficiency development
• Design extended communication lessons
• Differentiate for Literature vs. Acquisition learners
• Guide analysis of language influence on meaning
• Use language to deepen inquiry and critical thinking

**Collaboration:**
Teachers across all levels collaborate to ensure consistency in language goals and share effective strategies.',
  'Every teacher is a language teacher. All model language use, create language-rich environments, integrate language into subjects, and collaborate across levels for consistency.',
  ARRAY['Label items in three languages', 'Model academic vocabulary in all subjects', 'Ask open-ended questions for discussion'],
  'Language Policy - Teacher Responsibilities',
  9
);

-- Category: Language - Differentiation & Support
INSERT INTO knowledge_base (category, subcategory, keywords, question_patterns, title, content, short_answer, source_section, priority) VALUES
(
  'language',
  'differentiation',
  ARRAY['differentiation', 'language support', 'additional help', 'pull-out system', 'EAL support'],
  ARRAY['language support', 'help with english', 'differentiation', 'pull-out program', 'EAL support'],
  'Language Differentiation and Support',
  'CCS provides **differentiated instruction** to meet diverse language needs:

**Philosophy:**
Every student brings unique background knowledge, experiences, culture, language, and learning preferences. Teachers modify content, process, product, and affect to meet individual language abilities.

**Early Years Support:**
• **Two teachers per classroom** for individualized attention
• Flexible grouping
• One-on-one instructional support
• Develop foundational language skills
• Visual and gestural support

**PYP Support:**
• Students with significant English difficulty receive additional support
• **Pull-out system:** Temporarily withdrawn from Chinese for focused English instruction
• Ensures curriculum access and ability to follow instructions
• Small group work
• One-on-one instruction

**MYP Support:**
• **Differentiated classrooms** by proficiency level
• Tailored learning experiences
• Small group work
• One-on-one instruction
• Project-based learning
• Separate Language Acquisition and Language Literature classes

**Support Strategies:**
• Flexible grouping
• Scaffolded instruction
• Visual aids and gestures
• Multilingual resources
• Modified assessments',
  'Differentiation includes: EY - two teachers per class; PYP - pull-out English support (students withdrawn from Chinese); MYP - differentiated classrooms by proficiency with small groups.',
  'Language Policy - Differentiation',
  8
),
(
  'language',
  'pull_out',
  ARRAY['pull-out', 'withdrawn from chinese', 'english support program', 'extra english help'],
  ARRAY['pull-out system', 'withdrawn from chinese', 'extra english help', 'english support program'],
  'Pull-Out English Support System (PYP)',
  'The **pull-out system** provides focused English language support for PYP students:

**Who Receives Pull-Out Support:**
• PYP students with **significant difficulty with English**
• Students unable to access curriculum effectively
• Students struggling to follow classroom instructions

**How It Works:**
• Students **temporarily withdrawn from Chinese lessons**
• Participate in **focused English language instruction** instead
• Individualized or small group support
• Targeted skill development

**Purpose:**
• Ensure students can access the curriculum
• Enable effective following of classroom instructions
• Build foundational English skills
• Support participation in all subjects

**Duration:**
• Temporary intervention
• Continues until sufficient English proficiency achieved
• Regular assessment to monitor progress

**Important Note:**
This is a supportive intervention to help students succeed, not a punishment. Students return to regular Chinese classes once English proficiency improves.',
  'Pull-out system: PYP students with significant English difficulty are temporarily withdrawn from Chinese lessons for focused English instruction to ensure curriculum access.',
  'Language Policy - Pull-Out System',
  7
);

-- Category: Language - Resources
INSERT INTO knowledge_base (category, subcategory, keywords, question_patterns, title, content, short_answer, source_section, priority) VALUES
(
  'language',
  'library_resources',
  ARRAY['library', 'books', 'resources', 'e-books', 'reading materials', 'perpustakaan'],
  ARRAY['library resources', 'books available', 'reading materials', 'e-books', 'perpustakaan'],
  'Language Learning Resources',
  'CCS provides **two libraries** dedicated to supporting education and inquiry:

**Library Collections:**
• Books in **English, Chinese, and Bahasa Indonesia**
• Majority of books in English
• Many genres and backgrounds
• E-books for lessons and units of inquiry

**Purpose:**
• Create space for students to delve into studies
• Support research and inquiry
• Develop reading skills in multiple languages
• Explore diverse perspectives and cultures

**Library Team Support:**
• Works closely with teachers
• Curate resources aligned with:
  - Transdisciplinary themes
  - Subject areas
  - Units of inquiry
• Support development of research skills
• Promote academic integrity
• Develop information literacy

**Resource Types:**
• Fiction and non-fiction books
• Reference materials
• Digital resources and e-books
• Multimedia materials
• Age-appropriate materials for all levels

**Access:**
Students can use library resources for classroom learning, independent reading, research projects, and personal interest exploration.',
  'Two libraries with books in English, Chinese, and Bahasa Indonesia (majority English). E-books available. Library team curates resources for inquiry, research skills, and information literacy.',
  'Language Policy - Library Resources',
  8
);

-- Category: Language - Placement & Testing
INSERT INTO knowledge_base (category, subcategory, keywords, question_patterns, title, content, short_answer, source_section, priority) VALUES
(
  'language',
  'placement',
  ARRAY['language placement', 'testing', 'language acquisition vs literature', 'assessment placement'],
  ARRAY['how placement works', 'language testing', 'acquisition or literature', 'language assessment'],
  'Language Assessment and Placement',
  'Internal assessments and placement tests ensure appropriate language instruction:

**Purpose of Assessment:**
• Monitor student progress
• Identify areas of achievement
• Address areas requiring support
• Ensure appropriate course placement (MYP)

**Early Years Assessment:**
• Language data collected upon entry
• Determine proficiency levels
• Ensure comprehension of instructional language
• Support active participation
• Identify necessary interventions

**Elementary (PYP) Assessment:**
• Understand each student''s language abilities
• Identify students needing additional support
• Determine need for differentiated programs
• Monitor participation and engagement
• Implement interventions for language barriers

**MYP Placement:**
• **Essential for accurate placement** in Language courses
• Students **tested before entering school**
• Placement in either:
  - **Language Literature** (proficient speakers)
  - **Language Acquisition** (language learners)

**English Placement:**
• Based on proficiency assessment results
• Ensures students in appropriate level
• Allows for best learning experience

**Bahasa Indonesia & Chinese:**
• All students: Bahasa Indonesia Literature (home language)
• All students: Chinese Acquisition (additional language)',
  'Assessments monitor progress and determine placement. MYP students tested before entry for English placement in Literature (proficient) or Acquisition (learners). Regular monitoring continues.',
  'Language Policy - Placement & Testing',
  9
);

-- Category: Language - Key Concepts
INSERT INTO knowledge_base (category, subcategory, keywords, question_patterns, title, content, short_answer, source_section, priority) VALUES
(
  'language',
  'key_concepts',
  ARRAY['language of instruction', 'primary language', 'medium of instruction', 'english instruction'],
  ARRAY['language of instruction', 'what language used', 'primary language', 'teaching language'],
  'Language of Instruction',
  'Understanding which languages are used for instruction at CCS:

**Primary Language of Instruction:**
• **English** is used as primary language of instruction across all subjects
• Provides common ground for communication
• Prepares students for international opportunities

**Why English:**
• International curriculum (IB PYP/MYP)
• Global opportunities and higher education
• Common language for diverse student body
• Access to international resources

**Other Languages in Instruction:**
• **Bahasa Indonesia** actively encouraged in classroom
• **Chinese** actively encouraged in classroom
• Specialized language classes use respective languages

**Balanced Approach:**
• Honor students'' heritage through home language
• Promote cross-cultural exchange
• Create inclusive environment
• Allow learners to express comfortably
• Develop proficiency in multiple languages

**Goal:**
Nurture well-rounded individuals who can navigate both local and global contexts with confidence while celebrating cultural diversity and linguistic richness.

**Important Principle:**
"**Every teacher is a language teacher**" - language is integral to all learning and teaching.',
  'English is primary language of instruction for all subjects. Bahasa Indonesia and Chinese actively encouraged. Specialized language classes use respective languages.',
  'Language Policy - Language of Instruction',
  10
),
(
  'language',
  'collaboration',
  ARRAY['teacher collaboration', 'language goals', 'consistency', 'multilingualism', 'language team'],
  ARRAY['teacher collaboration language', 'language goals', 'teacher teamwork language'],
  'Teacher Collaboration in Language Learning',
  'Teachers across all programs **collaborate** to ensure effective language instruction:

**Collaboration Goals:**
• Ensure consistency in language goals
• Share effective strategies supporting multilingualism
• Design purposeful learning experiences
• Encourage confident language use across all areas

**What Teachers Collaborate On:**
• Language development strategies
• Assessment approaches
• Differentiation techniques
• Resource sharing
• Best practices for multilingual learners
• Integration of language across subjects
• Transdisciplinary language learning

**Across Levels:**
• Early Years, PYP, and MYP teachers work together
• Vertical alignment of language goals
• Smooth transitions between programs
• Consistent support for multilingualism

**Outcomes:**
• Strengthens belief that language is heart of learning
• Every teacher contributes to student development
• Students become capable communicators
• Prepares global citizens
• Creates cohesive language learning experience

**Team Approach:**
Language teachers, homeroom teachers, and subject teachers all collaborate to support each student''s language development journey.',
  'Teachers across EY, PYP, and MYP collaborate to ensure consistency in language goals, share strategies, and design experiences supporting multilingualism and confident communication.',
  'Language Policy - Teacher Collaboration',
  7
);
