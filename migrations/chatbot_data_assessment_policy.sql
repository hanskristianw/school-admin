-- =====================================================
-- Assessment Policy Knowledge Base Data
-- =====================================================

-- Category: Assessment - Philosophy & Principles
INSERT INTO knowledge_base (category, subcategory, keywords, question_patterns, title, content, short_answer, priority, source_section) VALUES
(
  'assessment',
  'philosophy',
  ARRAY['assessment philosophy', 'why assessment', 'assessment purpose', 'filosofi penilaian'],
  ARRAY['what is assessment philosophy', 'why do assessment', 'assessment purpose', 'tujuan penilaian'],
  'Assessment Philosophy',
  'CCS recognizes the **crucial role of assessment** in supporting student learning, personal growth, and achievement of learning goals. Our assessment policy aligns with IB philosophy.

**Core Beliefs:**
• Assessment is an **integral and ongoing process**
• Develops assessment-capable learners who are independent and self-aware
• Evaluates fairly and consistently across all subject areas
• Considers both **products** and **processes** of learning
• Provides holistic understanding of student progress

**Holistic Development:**
Assessment supports our vision to nurture students holistically - not just academic abilities, but also social and emotional competencies. We ensure every assessment is **meaningful, fair**, and serves students'' best interests.

**Assessment for Learning:**
We empower students to become confident, lifelong learners well-prepared for an ever-changing world through assessment that focuses on growth and development.',
  'Assessment is ongoing, integral to learning, and develops independent learners. We assess both products and processes holistically to support growth and prepare lifelong learners.',
  10,
  'Assessment Policy - Philosophy'
),
(
  'assessment',
  'principles',
  ARRAY['assessment principles', 'four principles', 'transfer', 'growth', 'feedback', 'validity'],
  ARRAY['assessment principles', 'four principles', 'what principles guide assessment'],
  'Four Fundamental Assessment Principles',
  'CCS embraces **four fundamental principles** of assessment (adopted from IB):

**1. Transfer**
• Design assessments challenging students to apply knowledge to new contexts
• Foster transferable understanding beyond the classroom
• Authentic application of skills

**2. Cultures of Growth**
• Cultivate growth mindset throughout school community
• Emphasize continuous improvement and lifelong learning
• Celebrate progress, effort, and perseverance
• Learning is an ongoing journey

**3. Feedback**
• **Two-way process** between teachers and students
• Timely, specific, and actionable feedback
• Students reflect, set goals, adjust strategies
• Students provide feedback to teachers
• Creates collaborative and reflective learning community

**4. Validity**
• Ensure assessments align with intended learning outcomes
• Fair and accurate representation of achievements
• Meaningful data that informs teaching practices
• Considers diverse needs and abilities',
  'Four principles: (1) Transfer - apply to new contexts, (2) Growth - continuous improvement mindset, (3) Feedback - two-way process, (4) Validity - aligned with outcomes.',
  9,
  'Assessment Policy - Principles'
);

-- Category: Assessment - PYP Assessment
INSERT INTO knowledge_base (category, subcategory, keywords, question_patterns, title, content, short_answer, examples, priority, source_section) VALUES
(
  'assessment',
  'pyp_dimensions',
  ARRAY['PYP assessment', 'four dimensions', 'assessment for learning', 'assessment as learning', 'assessment of learning'],
  ARRAY['PYP assessment', 'four dimensions', 'types of assessment PYP', 'monitoring documenting measuring'],
  'Four Dimensions of PYP Assessment',
  'PYP assessment is based on **four dimensions**: monitoring, documenting, measuring, and reporting. Each dimension serves different purposes across three types of assessment.

**Assessment FOR Learning (Formative):**
• **Monitoring:** Identify areas needing support, adapt teaching strategies
• **Documenting:** Student progress, feedback, observations
• **Measuring:** Gauge instruction effectiveness, data-driven decisions
• **Reporting:** Communicate progress to stakeholders

**Assessment AS Learning (Self-Assessment):**
• **Monitoring:** Students develop self-awareness of strengths/weaknesses
• **Documenting:** Reflective journals, portfolios, learning logs
• **Measuring:** Self-assessment and peer assessment against criteria
• **Reporting:** Individual reflection shared with parents termly

**Assessment OF Learning (Summative):**
• **Monitoring:** Evaluate teaching effectiveness and program success
• **Documenting:** Formal records (rubrics) for reporting
• **Measuring:** Projects, performances for comprehensive evaluation
• **Reporting:** Report cards summarizing student performance',
  'PYP has 4 dimensions (monitoring, documenting, measuring, reporting) across 3 types: FOR learning (formative), AS learning (self-assessment), OF learning (summative).',
  ARRAY['Formative assessment guides instruction', 'Self-assessment develops metacognition', 'Summative assessment evaluates outcomes'],
  9,
  'Assessment Policy - PYP Four Dimensions'
),
(
  'assessment',
  'pyp_types',
  ARRAY['rubric', 'checklist', 'self-assessment', 'anecdotal record', 'exemplars', 'assessment tools'],
  ARRAY['what is rubric', 'types of assessment tools', 'checklist assessment', 'self-assessment tool'],
  'Types of PYP Assessment Tools',
  'PYP uses various assessment tools to evaluate student learning:

**1. Rubric**
• Criteria and descriptors defining performance expectations
• Different levels of quality clearly outlined

**2. Checklist**
• List of specific criteria or tasks
• Track progress, accomplishments, or mastery

**3. Self-Assessment**
• Students evaluate their own work/progress
• Promotes reflection and metacognition

**4. Anecdotal Record**
• Brief, objective teacher notes
• Document specific observations of behavior, skills, progress over time

**5. Exemplars**
• Student work samples
• Analyzed to reveal patterns in understanding
• Identify areas of difficulty

**Assessment Strategies:**
• Observations
• Performance Assessment
• Process-Focused Assessment
• Selected Response
• Open-ended Tasks',
  'PYP tools: (1) Rubric - performance levels, (2) Checklist - track progress, (3) Self-Assessment - student reflection, (4) Anecdotal Record - teacher notes, (5) Exemplars - work samples.',
  ARRAY['Rubrics for quality levels', 'Checklists for skill mastery tracking', 'Self-assessment develops independence'],
  8,
  'Assessment Policy - PYP Types & Tools'
),
(
  'assessment',
  'pyp_achievement',
  ARRAY['PYP grading', 'beginning', 'developing', 'achieving', 'exceeding', 'BDAE', 'achievement levels'],
  ARRAY['PYP grading system', 'what is BDAE', 'beginning developing achieving', 'achievement levels PYP'],
  'PYP Achievement Levels (B-D-A-E)',
  'PYP uses **four achievement indicators** to represent different levels of student performance:

**B - Beginning**
• Just starting to acquire skills/knowledge
• Initial stages of development
• Requires additional support and guidance to progress

**D - Developing**
• Making progress and showing improvement
• In process of acquiring expected skills/knowledge
• May not have fully mastered yet

**A - Achieving**
• Successfully reached expected level of competence
• Met learning outcomes
• Performing at or near expected grade level

**E - Exceeding**
• Surpassed expected level of achievement
• Demonstrated higher level of mastery
• Going above and beyond typical expectations

These indicators are used collaboratively by teachers through moderation to ensure **consistency and fairness** across different classes and grade levels.',
  'PYP levels: B (Beginning - starting), D (Developing - progressing), A (Achieving - meeting expectations), E (Exceeding - surpassing expectations).',
  ARRAY['Student at "Achieving" meets grade-level expectations', 'Exceeding means going beyond requirements', 'Beginning students need additional support'],
  9,
  'Assessment Policy - PYP Achievement Levels'
);

-- Category: Assessment - PYP Reporting
INSERT INTO knowledge_base (category, subcategory, keywords, question_patterns, title, content, short_answer, examples, priority, source_section) VALUES
(
  'assessment',
  'pyp_reporting',
  ARRAY['PYP reporting', 'portfolio', 'sharing day', 'three-way conference', 'student-led conference', 'written report'],
  ARRAY['how PYP reports', 'PYP reporting methods', 'portfolio conference', 'student-led conference when'],
  'PYP Reporting Methods',
  'CCS uses **multiple methods** to report student learning in PYP:

**1. Portfolio (Digital & Binder)**
• HR: 2-3 works from various subjects per unit
• SS: 1-2 works per unit
• Student reflections from each unit
• IB Learner Profile demonstrations
• Achievement over time
• Shared with parents at year end

**2. Sharing Day**
• 30-minute event at end of unit (optional)
• Showcase individual/collaborative work
• Interaction and discussion
• Reward achievements

**3. 3-Way Conference (Term 1)**
• Interactive: student, teacher, parents
• Review progress, address challenges, set goals

**4. Student-Led Conference (Term 3)**
• Students demonstrate agency
• Lead the conference, reflect on progress
• Set future goals with adult support

**5. Parents-Teacher Meeting**
• Twice yearly (mid-term 1 & 2, optional)
• Share learning growth and achievement evidence
• Build relationships

**6. Written Report (Semester End)**
• Academic performance summary
• Progress and achievements across subjects
• Grades and teacher comments

**7. Unit Assessment (End of Each Unit)**
• Highlights accomplishments
• Comments on: done well, needs improvement, suggestions
• EL: peer feedback and self-reflection',
  'PYP reporting: Portfolio (year-end), Sharing Day (optional), 3-Way Conference (term 1), Student-Led Conference (term 3), Written Reports (semester), Unit Assessments (per unit).',
  ARRAY['3-Way Conference in term 1 - collaborative goal-setting', 'Student-Led Conference in term 3 - student agency', 'Written reports twice yearly with grades & comments'],
  10,
  'Assessment Policy - PYP Reporting'
);

-- Category: Assessment - MYP Assessment
INSERT INTO knowledge_base (category, subcategory, keywords, question_patterns, title, content, short_answer, priority, source_section) VALUES
(
  'assessment',
  'myp_criteria',
  ARRAY['MYP criteria', 'assessment criteria', 'four criteria', 'criterion A B C D', 'MYP grading'],
  ARRAY['MYP assessment criteria', 'what is criterion A', 'four criteria MYP', 'how MYP assess'],
  'MYP Assessment Criteria',
  'Each MYP subject uses **four distinct assessment criteria** (A, B, C, D), tailored to subject nature:

**Language & Literature:** Analysing | Organizing | Producing text | Using language
**Language Acquisition:** Listening | Reading | Speaking | Writing
**Individuals & Societies:** Knowing/understanding | Investigating | Communicating | Thinking critically
**Sciences:** Knowing/understanding | Inquiring/designing | Processing/evaluating | Reflecting on impacts
**Mathematics:** Knowing/understanding | Investigating patterns | Communicating | Applying in real-world
**Arts:** Knowing/understanding | Developing skills | Thinking creatively | Responding
**Physical & Health Ed:** Knowing/understanding | Planning | Applying/performing | Reflecting/improving
**Design:** Inquiring/analysing | Developing ideas | Creating solution | Evaluating
**Civics:** Analysing | Application | - | -
**Bible:** Knowing/Understanding | Knowing/Understanding | Knowing/Understanding | -

Each criterion is evaluated on **0-8 scale** (total 32 points maximum).',
  'MYP uses 4 criteria (A, B, C, D) specific to each subject, assessed on 0-8 scale. Total 32 points converted to 1-7 grade.',
  9,
  'Assessment Policy - MYP Criteria'
),
(
  'assessment',
  'myp_grading',
  ARRAY['MYP grading', '1-7 scale', 'grade boundaries', 'achievement levels', 'MYP scores'],
  ARRAY['MYP grading scale', 'what is grade 7', 'grade boundaries', 'how scores convert', '1-7 meaning'],
  'MYP Achievement Levels & Grade Boundaries',
  'MYP uses **0-8 scale** for each criterion (4 criteria × 8 = 32 points max), converted to **1-7 final grade**:

**Achievement Levels (per criterion):**
• **0:** Does not reach any standard
• **1-2:** Limited achievement
• **3-4:** Adequate achievement
• **5-6:** Substantial achievement
• **7-8:** Excellent achievement

**Grade Boundaries (total score → final grade):**
• **Grade 1 (1-5):** Very limited quality, lacks understanding
• **Grade 2 (6-9):** Limited quality, significant gaps
• **Grade 3 (10-14):** Acceptable quality, basic understanding
• **Grade 4 (15-18):** Good quality, basic understanding of most concepts
• **Grade 5 (19-23):** Generally high quality, secure understanding
• **Grade 6 (24-27):** High quality, extensive understanding, frequently innovative
• **Grade 7 (28-32):** High quality, comprehensive nuanced understanding, consistently sophisticated

Grade 7 = highest achievement, Grade 1 = lowest.',
  'MYP: 4 criteria × 8 points = 32 max. Converted to 1-7 scale. Grade 7 (28-32) = excellent, Grade 4 (15-18) = good, Grade 1 (1-5) = limited.',
  10,
  'Assessment Policy - MYP Achievement Levels'
);

-- Category: Assessment - Types
INSERT INTO knowledge_base (category, subcategory, keywords, question_patterns, title, content, short_answer, examples, priority, source_section) VALUES
(
  'assessment',
  'formative',
  ARRAY['formative assessment', 'assessment for learning', 'ongoing assessment', 'feedback during learning'],
  ARRAY['what is formative assessment', 'assessment for learning', 'formative vs summative', 'ongoing assessment'],
  'Formative Assessment (Assessment FOR Learning)',
  '**Formative assessment** occurs **during instruction** to guide learning and provide ongoing feedback.

**Purpose:**
• Monitor student understanding throughout learning
• Guide teaching and learning decisions
• Provide timely feedback for improvement
• Identify areas needing support
• Adapt instructional strategies

**Characteristics:**
• Ongoing and continuous
• Low-stakes (not for final grades)
• Diagnostic in nature
• Informs next steps in teaching

**Examples:**
• Exit tickets
• Quick quizzes
• Class discussions
• Observation notes
• Practice exercises
• Draft submissions
• Peer feedback sessions

**Teacher Use:**
Formative data helps teachers adjust instruction in real-time, differentiate learning, and provide targeted interventions.',
  'Formative assessment occurs during instruction to guide learning with ongoing feedback. It is low-stakes, helps teachers adjust teaching, and identifies areas needing support.',
  ARRAY['Exit tickets to check understanding', 'Draft feedback before final submission', 'Observation during group work'],
  9,
  'Assessment Policy - Formative Assessment'
),
(
  'assessment',
  'summative',
  ARRAY['summative assessment', 'assessment of learning', 'final assessment', 'end of unit', 'grading'],
  ARRAY['what is summative', 'assessment of learning', 'summative vs formative', 'final assessment', 'grading assessment'],
  'Summative Assessment (Assessment OF Learning)',
  '**Summative assessment** occurs **at the end of instruction** to evaluate what students learned and retained.

**Purpose:**
• Evaluate final learning outcomes
• Measure achievement against standards
• Provide evidence for grading
• Determine if learning goals met
• Make decisions about advancement

**Characteristics:**
• Happens at end of unit/semester
• High-stakes (counts toward grades)
• Evaluative in nature
• Comprehensive in scope

**Examples:**
• Unit tests/exams
• Final projects
• Presentations
• Essays and reports
• Portfolios
• Performance tasks
• End-of-year assessments

**Reporting:**
Summative results appear in report cards, progress reports, and official transcripts. Used for decision-making about student advancement and program effectiveness.',
  'Summative assessment occurs at end of instruction to evaluate final learning. It is high-stakes, counts toward grades, and measures achievement against standards.',
  ARRAY['End-of-unit tests', 'Final projects and presentations', 'Semester exams'],
  9,
  'Assessment Policy - Summative Assessment'
),
(
  'assessment',
  'self_assessment',
  ARRAY['self-assessment', 'assessment as learning', 'self-monitoring', 'student reflection', 'metacognition'],
  ARRAY['what is self-assessment', 'assessment as learning', 'student self-evaluation', 'reflection assessment'],
  'Self-Assessment (Assessment AS Learning)',
  '**Self-assessment** involves students monitoring and gathering information about their own learning progress.

**Purpose:**
• Develop metacognition (thinking about thinking)
• Build self-awareness of strengths/weaknesses
• Foster student agency and ownership
• Promote reflection and goal-setting
• Develop independent learning skills

**Key Activities:**
• Students evaluate own work against criteria
• Reflect on learning process
• Identify areas for improvement
• Set personal learning goals
• Track own progress over time

**Tools:**
• Reflection journals
• Self-assessment rubrics
• Portfolio reflections
• Learning logs
• Goal-setting sheets
• Peer feedback (giving and receiving)

**Benefits:**
• Increases student engagement
• Develops critical thinking
• Promotes lifelong learning skills
• Builds confidence and independence
• Enhances understanding of quality work',
  'Self-assessment involves students monitoring their own learning, developing self-awareness, and reflecting on progress. It builds metacognition and independent learning skills.',
  ARRAY['Students use rubrics to evaluate own work', 'Reflection journals document learning journey', 'Goal-setting based on self-identified needs'],
  8,
  'Assessment Policy - Self-Assessment'
);

-- Category: Assessment - MYP Special Assessments
INSERT INTO knowledge_base (category, subcategory, keywords, question_patterns, title, content, short_answer, priority, source_section) VALUES
(
  'assessment',
  'interdisciplinary',
  ARRAY['interdisciplinary', 'IDU', 'cross-subject', 'interdisciplinary unit', 'evaluating synthesizing reflecting'],
  ARRAY['what is interdisciplinary', 'IDU assessment', 'cross-subject assessment', 'interdisciplinary criteria'],
  'Interdisciplinary Assessment',
  '**Interdisciplinary learning** allows students to integrate concepts from **two or more subject groups** to deepen understanding and address real-world issues.

**Purpose:**
• Integrate knowledge across subjects
• Address complex real-world problems
• Develop interdisciplinary thinking
• Make connections between disciplines

**Three Interdisciplinary Criteria:**

**Criterion A: Evaluating**
• Evaluating disciplinary perspectives
• Understanding different subject viewpoints

**Criterion B: Synthesizing**
• Integrating disciplinary knowledge
• Combining concepts from multiple subjects
• Creating unified understanding

**Criterion C: Reflecting**
• Reflecting on interdisciplinary learning
• Understanding benefits of integrated approach
• Identifying personal growth

Unlike regular MYP subjects (4 criteria, 0-8 each), interdisciplinary units use these **3 special criteria** designed specifically for integrated learning.',
  'Interdisciplinary assessment uses 3 criteria: (A) Evaluating perspectives, (B) Synthesizing knowledge from multiple subjects, (C) Reflecting on integrated learning.',
  8,
  'Assessment Policy - Interdisciplinary'
),
(
  'assessment',
  'personal_project',
  ARRAY['personal project', 'MYP personal project', 'grade 10 project', 'year 5 project', 'independent project'],
  ARRAY['what is personal project', 'MYP personal project', 'grade 10 project requirements', 'personal project MYP 5'],
  'Personal Project (MYP Year 5)',
  'The **Personal Project** is a culminating experience for MYP students in **final year (Grade 10)** exploring personal interests over extended period.

**Key Objectives:**
• Consolidate learning from all MYP years
• Develop ATL skills independently
• Pursue personal interests in depth
• Build confidence as principled, lifelong learners
• Demonstrate readiness for next education phase

**What Students Do:**
• Choose topic of personal interest
• Work independently over extended period
• Apply ATL skills (research, self-management, thinking, communication, social)
• Create product or outcome
• Document process and learning
• Present/showcase final work

**Skills Developed:**
• Independent research
• Project management
• Time management
• Creative thinking
• Problem-solving
• Presentation skills

**Assessment:**
Personal Project assessed using specific criteria evaluating both process and product.',
  'Personal Project is MYP Year 5 (Grade 10) independent project where students explore personal interests, consolidate MYP learning, and develop ATL skills over extended period.',
  8,
  'Assessment Policy - Personal Project'
);

-- Category: Assessment - ATL Skills
INSERT INTO knowledge_base (category, subcategory, keywords, question_patterns, title, content, short_answer, examples, priority, source_section) VALUES
(
  'assessment',
  'atl_skills',
  ARRAY['ATL skills', 'approaches to learning', 'five ATL', 'communication social self-management research thinking'],
  ARRAY['what are ATL skills', 'five ATL categories', 'approaches to learning', 'ATL meaning'],
  'ATL Skills (Approaches to Learning)',
  '**ATL Skills** are essential skills for becoming independent, lifelong learner - "learning how to learn" skills.

**5 ATL Skill Categories:**

**1. Communication**
• Exchanging information
• Literacy skills
• Using language effectively
*Examples:* Presentations, essay writing, discussions

**2. Social**
• Collaboration
• Forming relationships
• Social-emotional intelligence
*Examples:* Team projects, peer feedback, conflict resolution

**3. Self-Management**
• Organization
• Affective skills (emotions)
• Reflection
*Examples:* Time management, goal setting, stress management

**4. Research**
• Information literacy
• Media literacy
• Critical thinking
*Examples:* Finding sources, evaluating information, citing properly

**5. Thinking**
• Critical thinking
• Creative thinking
• Transfer
*Examples:* Problem-solving, making connections, generating ideas

**Why ATL Matters:**
Prepares students for success beyond grades - adapting to challenges, working well with others, thinking independently. Essential for higher education and careers.',
  'ATL (Approaches to Learning) has 5 categories: (1) Communication, (2) Social, (3) Self-Management, (4) Research, (5) Thinking. Skills for lifelong learning.',
  ARRAY['Research projects assess Research + Self-management', 'Group work assesses Social + Communication', 'Problem-solving assesses Thinking + Research'],
  9,
  'Assessment Policy - ATL Skills'
);

-- Category: Assessment - Service as Action
INSERT INTO knowledge_base (category, subcategory, keywords, question_patterns, title, content, short_answer, priority, source_section) VALUES
(
  'assessment',
  'service_as_action',
  ARRAY['service as action', 'community service', 'MYP service', 'service learning', 'service requirements'],
  ARRAY['what is service as action', 'service requirements', 'how much service', 'MYP service learning'],
  'Service as Action',
  '**Service as Action** is MYP requirement connecting learning to community through meaningful service.

**Learning Outcomes (Students should be able to):**
• **Become more aware** - understand community needs
• **Undertake challenges** - step out of comfort zone
• **Develop new skills** - learn through service
• **Discuss and evaluate** - analyze service impact
• **Persevere in action** - show commitment
• **Work collaboratively** - serve with others
• **Consider ethical implications** - think about consequences

**Minimum Requirements:**
• **MYP 1-3:** At least one service activity per term
• **MYP 4-5:** Sustained commitment to service
• **All years:** Regular reflection and documentation

**Connection to Assessment:**
Service links to academic subjects:
• Sciences → Environmental projects (Criterion D)
• Individuals & Societies → Community research (Criterion B)
• Language & Literature → Literacy programs (Criterion C)
• Arts → Community performances (Criterion D)
• Design → Community solutions (full cycle)

**Reporting:**
Service appears in semester reports summarizing activities and commitment.',
  'Service as Action requires MYP 1-3: one activity per term; MYP 4-5: sustained service. Students develop awareness, skills, and ethical thinking through community service.',
  8,
  'Assessment Policy - Service as Action'
);

-- Category: Assessment - Academic Integrity in Assessment
INSERT INTO knowledge_base (category, subcategory, keywords, question_patterns, title, content, short_answer, examples, priority, source_section) VALUES
(
  'assessment',
  'academic_integrity_assessment',
  ARRAY['academic misconduct', 'cheating', 'plagiarism assessment', 'collusion', 'fabrication', 'self-plagiarism'],
  ARRAY['types of cheating', 'academic misconduct', 'what is self-plagiarism', 'collusion in assessment'],
  'Academic Misconduct During Assessment',
  '**Types of academic misconduct** during assessments:

**1. Plagiarism**
• Using others'' work without credit
*Examples:* Copying websites, using classmates'' work, not citing sources

**2. Self-Plagiarism**
• Reusing your own previous work
*Examples:* Submitting old essays, recycling projects, duplication across subjects

**3. Collusion**
• Unauthorized collaboration
*Examples:* Sharing test answers, working together on individual tasks, having others do your work

**4. Fabrication**
• Making up information
*Examples:* Fake experiment data, invented quotes, false sources

**5. AI Misuse**
• Improper use of AI tools
*Examples:* Not citing AI assistance, claiming AI work as own, using AI when prohibited

**IMPORTANT:** When AI use is allowed:
• Must cite AI as source
• Paraphrase responses (don''t copy)
• Add your own analysis
• Keep records of prompts',
  'Academic misconduct types: (1) Plagiarism, (2) Self-plagiarism, (3) Collusion, (4) Fabrication, (5) AI Misuse. Always cite sources including AI when allowed.',
  ARRAY['Self-plagiarism = submitting same work twice', 'Collusion = unauthorized collaboration on individual work', 'Must cite AI tools when used'],
  10,
  'Assessment Policy - Academic Integrity'
),
(
  'assessment',
  'ai_citation',
  ARRAY['cite AI', 'AI citation', 'ChatGPT citation', 'MLA AI', 'how to cite AI'],
  ARRAY['how to cite AI', 'ChatGPT citation', 'AI citation format', 'cite AI MLA'],
  'How to Cite AI Tools (MLA Format)',
  'When AI use is **permitted by teacher**, you **MUST cite** properly using MLA format:

**In-Text Citation:**
According to ChatGPT, "paraphrased content here" ("Your prompt question").

**Works Cited:**
"Your exact prompt question" prompt. ChatGPT-4, OpenAI, 10 Feb. 2025, chat.openai.com/chat.

**Complete Example:**

*Prompt:* "Explain photosynthesis for a grade 8 student"

*In-text:* ChatGPT suggests that photosynthesis can be understood as "the process plants use to make food from sunlight" ("Explain photosynthesis").

*Works Cited:* "Explain photosynthesis for a grade 8 student" prompt. ChatGPT-4, OpenAI, 10 Feb. 2025, chat.openai.com/chat.

**Requirements When Using AI:**
• Cite AI as a source
• Paraphrase AI responses (don''t copy directly)
• Add your own analysis
• Keep records of prompts used
• Only use when teacher permits',
  'AI citation format: In-text ("prompt"), Works Cited: "prompt" prompt. ChatGPT-4, OpenAI, date, URL. Must paraphrase, add analysis, keep prompt records.',
  ARRAY['Include exact prompt in citation', 'Specify AI model (GPT-4, Gemini, etc.)', 'Include access date'],
  9,
  'Assessment Policy - AI Citation'
);

-- Category: Assessment - Reporting Schedule
INSERT INTO knowledge_base (category, subcategory, keywords, question_patterns, title, content, short_answer, priority, source_section) VALUES
(
  'assessment',
  'reporting_schedule',
  ARRAY['report schedule', 'when reports', 'progress report', 'final report', 'conference schedule'],
  ARRAY['when are reports', 'report schedule', 'conference dates', 'progress report when'],
  'Assessment Reporting Schedule',
  'CCS uses comprehensive reporting system throughout the year:

**Progress Reports:**
• **Progress Report 1** - December: Current grades + brief comments
• **Progress Report 2** - June: Current grades + brief comments

**Final Report:**
• **June** - Final grades + detailed comments

**Conferences:**
• **3-Way Conference** - September: Students share goals and improvement actions
• **Student-Led Conference** - March: Students share learning results throughout year

**Additional Reporting (PYP):**
• **Unit Assessments** - End of each unit
• **Sharing Day** - Optional, end of unit
• **Parents-Teacher Meeting** - Mid-term 1 & 2 (optional)
• **Portfolio** - Shared at end of year

**Communication:**
Parents receive regular updates through multiple channels ensuring comprehensive understanding of student progress and achievement throughout academic year.',
  'Reports: Progress (Dec & Jun), Final (Jun). Conferences: 3-Way (Sep), Student-Led (Mar). PYP also has unit assessments, sharing days, and year-end portfolios.',
  9,
  'Assessment Policy - Reporting Schedule'
);
