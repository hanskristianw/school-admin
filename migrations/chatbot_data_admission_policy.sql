-- =====================================================
-- Admission Policy Knowledge Base Data
-- =====================================================

-- Category: Admission - Overview
INSERT INTO knowledge_base (category, subcategory, keywords, question_patterns, title, content, short_answer, priority, source_section) VALUES
(
  'admission',
  'overview',
  ARRAY['admission policy', 'kebijakan penerimaan', 'rationale', 'why admission', 'purpose'],
  ARRAY['what is admission policy', 'apa kebijakan penerimaan', 'why admission policy', 'tujuan admission'],
  'Admission Policy Overview',
  'At Chung Chung Christian School (CCS), our admissions policy reflects our commitment to being a world-leading Christian school that nurtures students holistically: mind, heart, strength, and spirit for a better world and the glory of God. We welcome students from diverse backgrounds who demonstrate a passion for learning, commitment to personal growth, and desire to contribute positively to their communities.

**Key Principles:**
• **Transparent** - Upfront about our Christian identity and biblical principles
• **Inclusive** - Welcome students from all backgrounds open to our values
• **Warm & Professional** - Guided by love for God and others
• **Fair & Non-Partial** - Every applicant treated with respect
• **Confidential** - Protect personal information with robust security
• **Christ-Centered** - Aligned with school vision, mission, and C.H.R.I.S.T values',
  'CCS admission policy is transparent, inclusive, warm, fair, confidential, and Christ-centered. We welcome diverse students who embrace learning, growth, and our Christian values.',
  10,
  'Admission Policy - Rationale & Biblical Perspective'
),
(
  'admission',
  'inclusivity',
  ARRAY['inclusive', 'diversity', 'all backgrounds', 'welcome everyone', 'different religions'],
  ARRAY['is CCS inclusive', 'can non-Christian apply', 'diversity policy', 'different backgrounds'],
  'Inclusivity in Admissions',
  'CCS warmly welcomes students from **all backgrounds** who are open to engaging with our values and vision. As stated in Galatians 3:28, "There is neither Jew nor Gentile, neither slave nor free, nor is there male and female, for you are all one in Christ Jesus."

**Inclusivity Principles:**
• Welcome students from diverse racial, cultural, and religious backgrounds
• Respect **freedom of religion** as a fundamental human right
• Do not require students to convert or adopt Christianity
• Expect openness to engage with Christian values and school mission
• Create environment where every student feels valued and empowered

**Important:** While CCS respects religious freedom, prospective students and families must be willing to understand and respect our Christian foundation, vision, mission, and C.H.R.I.S.T values.',
  'CCS welcomes students from all backgrounds, including non-Christians, who respect our Christian values. We embrace diversity while maintaining our Christ-centered foundation.',
  10,
  'Admission Policy - Biblical Perspective: Inclusive'
);

-- Category: Admission - Process & Procedure
INSERT INTO knowledge_base (category, subcategory, keywords, question_patterns, title, content, short_answer, examples, priority, source_section) VALUES
(
  'admission',
  'procedure',
  ARRAY['admission procedure', 'how to apply', 'application process', 'steps', 'cara daftar', 'proses pendaftaran'],
  ARRAY['how to apply', 'application steps', 'cara daftar', 'proses pendaftaran', 'langkah daftar'],
  'Admission Procedure Steps',
  'The admission process at CCS involves **7 key steps**:

**1. Registration Form Submission**
• Obtain form from administration office
• Submit completed form with most recent report card

**2. Enrollment Test & Interview Scheduling**
• Test and counselor interview scheduled
• Assesses social and communication skills

**3. Admission Test & Student Interview**
• Academic readiness test
• Interview about personal growth and potential

**4. Parent Interview**
• Cross-check information from student interview
• Discuss learning styles and build family partnership

**5. Fee Payment**
• Pay school fees to confirm registration

**6. Programme Details Orientation**
• Overview of IB PYP/MYP framework
• Curriculum, assessment, and IB Learner Profile details

**7. Introduction to PAG**
• Parent Advisory Group induction
• Extracurricular activities and school values',
  'Admission process: (1) Submit registration form + report card, (2) Schedule test & interview, (3) Take admission test & student interview, (4) Parent interview, (5) Pay fees, (6) Programme orientation, (7) PAG introduction.',
  ARRAY['Bring recent report card to registration', 'Prepare for academic test and interview', 'Parents will be interviewed separately'],
  10,
  'Admission Policy - Admission Procedure'
),
(
  'admission',
  'requirements',
  ARRAY['admission requirements', 'academic requirements', 'test score', 'passing grade', 'syarat masuk'],
  ARRAY['what are requirements', 'syarat masuk', 'minimum score', 'test requirements', 'academic requirements'],
  'Admission Requirements',
  'CCS admission standards include both **academic** and **language** requirements:

**Academic Requirements:**
• Satisfactory progress reports showing consistent performance
• Demonstrated ability and motivation for excellence
• **Minimum 60%** on enrollment test (or Principal''s discretion)
• Additional government requirements (Dapodik, NISN, etc.)

**Language Requirements:**
• **Comprehensive English skills** in reading, writing, speaking, and listening
• Essential for academic success at CCS

**Additional Considerations:**
• Passion for learning and commitment to personal growth
• Desire to contribute positively to community
• Openness to Christian values and school mission
• Realistic expectations about school curriculum and vision',
  'Requirements: (1) Satisfactory academic progress, (2) Minimum 60% on enrollment test, (3) Comprehensive English skills, (4) Government documents (Dapodik, NISN), (5) Openness to Christian values.',
  ARRAY['60% minimum score on admission test', 'Strong English proficiency required', 'Recent report cards must show consistent performance'],
  10,
  'Admission Policy - Admission Standard'
),
(
  'admission',
  'language',
  ARRAY['english requirement', 'bahasa inggris', 'language skills', 'english proficiency', 'speaking english'],
  ARRAY['english requirement', 'need english', 'bahasa inggris syarat', 'english level', 'how good english'],
  'English Language Requirements',
  '**Comprehensive English skills** are essential for academic success at Chung Chung Christian School.

**Required Skills:**
• Reading comprehension
• Writing proficiency
• Speaking fluency
• Listening comprehension

**Why English is Important:**
• All instruction is conducted in English
• IB PYP/MYP curriculum requires strong English
• Communication with teachers and peers
• Academic assignments and assessments

Students must demonstrate competency in all four language skills during the admission test and interview process.',
  'Comprehensive English skills (reading, writing, speaking, listening) are essential. All instruction and IB curriculum require strong English proficiency.',
  ARRAY['Academic instruction conducted entirely in English', 'IB curriculum requires advanced English', 'Students assessed on all four language skills'],
  9,
  'Admission Policy - Language Requirements'
);

-- Category: Admission - Special Education Needs (SEN)
INSERT INTO knowledge_base (category, subcategory, keywords, question_patterns, title, content, short_answer, examples, priority, source_section) VALUES
(
  'admission',
  'special_needs',
  ARRAY['special education needs', 'SEN', 'disability', 'learning difficulties', 'special support', 'kebutuhan khusus'],
  ARRAY['special needs admission', 'SEN policy', 'disability support', 'learning difficulties', 'anak berkebutuhan khusus'],
  'Admission for Students with Special Education Needs',
  'CCS is committed to **inclusivity** and considers applications from students with special education needs on a **case-by-case basis**.

**Assessment Process:**
The school evaluates whether we can adequately meet the student''s academic, social, emotional, and physical needs before accepting them. This is our God-given responsibility to provide excellent education for all members of the learning community.

**For Candidate Students from CCS:**
• Principal assigns counselor/coordinator to observe student during semester 2
• **Psychological test report** required (within last 2 years)
• Observations over 3-month period (can extend to semester 1)
• School may administer additional tests
• Parents notified of decision
• If accepted, formal agreement outlines conditions and support

**For Candidate Students from Other Schools:**
• Initial meeting with parents, principal, and counselor
• Assess student needs vs. school capacity
• If capacity exists, admission proceeds
• Formal agreement letter with parents outlines progress expectations and interventions',
  'CCS accepts SEN students case-by-case after evaluating if we can meet their needs. Process includes observations, psychological testing, and formal agreement with parents.',
  ARRAY['Psychological test report must be within 2 years', 'Observation period can last 3+ months', 'Agreement letter outlines support and expectations'],
  8,
  'Admission Policy - Special Education Needs'
),
(
  'admission',
  'special_needs_documents',
  ARRAY['psychological test', 'SEN documents', 'special needs report', 'test report'],
  ARRAY['what documents for SEN', 'psychological test requirement', 'SEN paperwork', 'special needs documents'],
  'Required Documents for SEN Students',
  'Students with special education needs are required to provide specific documentation:

**Required Document:**
• **Updated psychological test report** completed within the last 2 years

**Purpose:**
• Support the admission process into MYP/PYP program
• Help school understand student''s specific needs
• Evaluate school''s capacity to provide appropriate support
• Develop individualized support plan

**Additional Assessments:**
• School may conduct additional observations
• Testing to evaluate abilities and needs
• Assessment of school resources vs. student requirements

The psychological report must be current (within 2 years) to accurately reflect the student''s current abilities and needs.',
  'SEN students must provide an updated psychological test report completed within the last 2 years to support admission into PYP/MYP programs.',
  ARRAY['Test report must be less than 2 years old', 'Helps school evaluate support capacity', 'May require additional school assessments'],
  7,
  'Admission Policy - SEN Requirements'
);

-- Category: Admission - Fees & Financial
INSERT INTO knowledge_base (category, subcategory, keywords, question_patterns, title, content, short_answer, priority, source_section) VALUES
(
  'admission',
  'fees',
  ARRAY['school fees', 'payment', 'biaya sekolah', 'tuition', 'cost', 'how much'],
  ARRAY['school fees', 'how much cost', 'biaya sekolah', 'payment when', 'tuition fees'],
  'Fee Payment in Admission Process',
  '**Fee payment** is required after successful completion of the assessment and interview process.

**Payment Timeline:**
• After admission test completion
• After student and parent interviews
• Before registration is confirmed

**Purpose:**
• Confirms student registration
• Secures spot in the program
• Allows school to proceed with orientation scheduling

**Next Steps After Payment:**
• Registration officially confirmed
• Invitation to Programme Details Orientation
• Introduction to school community and support structures

For specific fee amounts and payment methods, please contact the administration office directly.',
  'School fees must be paid after successful completion of tests and interviews to confirm registration. Contact administration office for specific amounts.',
  8,
  'Admission Policy - Fee Payment'
);

-- Category: Admission - Orientation & Onboarding
INSERT INTO knowledge_base (category, subcategory, keywords, question_patterns, title, content, short_answer, examples, priority, source_section) VALUES
(
  'admission',
  'orientation',
  ARRAY['orientation', 'programme details', 'IB orientation', 'PYP MYP orientation', 'new student orientation'],
  ARRAY['what is orientation', 'programme details', 'IB orientation', 'new student process', 'after admission'],
  'Programme Details Orientation',
  'After enrollment is completed and registration confirmed, new students and families are invited to attend a **Programme Details Orientation** session.

**For IB PYP/MYP Students:**
• Comprehensive overview of IB framework
• Emphasis on inquiry-based learning
• Global contexts and IB Learner Profile
• Curriculum details and assessment methods
• Unique opportunities in IB programs

**Additional Orientation Topics:**
• Support structures (PAG - Parent Advisory Group)
• Extracurricular activities
• C.H.R.I.S.T values and Christ-centered approach
• School culture and community expectations

**Purpose:**
• Ensure families are well-informed
• Prepare for full engagement with CCS education
• Build strong foundation for student success
• Welcome families into CCS community',
  'After registration, new families attend Programme Details Orientation covering IB framework, curriculum, assessment, PAG, extracurricular activities, and school values.',
  ARRAY['Learn about IB inquiry-based learning', 'Understand IB Learner Profile attributes', 'Meet PAG and learn about parent involvement'],
  8,
  'Admission Policy - Programme Orientation'
),
(
  'admission',
  'PAG',
  ARRAY['PAG', 'parent advisory group', 'parent involvement', 'parent support', 'parent community'],
  ARRAY['what is PAG', 'parent advisory group', 'parent involvement', 'how parents help', 'parent community'],
  'Parent Advisory Group (PAG)',
  'The **Parent Advisory Group (PAG)** is an important support structure at CCS that new families are introduced to during the admission process.

**PAG Purpose:**
• Support school community and activities
• Foster parent-school partnership
• Enhance student experience through parent involvement
• Build strong family connections within CCS

**When Introduced:**
• After Programme Details Orientation
• As part of welcoming process to CCS family

**Why PAG Matters:**
• Parents are the **Primary Educator** for their children
• PAG helps parents work with CCS to educate children
• Creates supportive network of families
• Strengthens school-home partnership

**Partnership Philosophy:**
CCS believes in strong partnership between parents and school. Parents remain the primary educators while working together with CCS to provide excellent holistic education: mind, heart, strength, and spirit.',
  'PAG (Parent Advisory Group) is a support structure where parents partner with CCS to enhance student experience. Parents are primary educators working with school.',
  ARRAY['Parents are primary educators partnering with CCS', 'PAG creates supportive family network', 'Involvement opportunities in school activities'],
  7,
  'Admission Policy - PAG Introduction'
);

-- Category: Admission - Values & Mission Alignment
INSERT INTO knowledge_base (category, subcategory, keywords, question_patterns, title, content, short_answer, priority, source_section) VALUES
(
  'admission',
  'values_alignment',
  ARRAY['school values', 'CHRIST values', 'mission vision', 'school culture', 'values alignment'],
  ARRAY['what are school values', 'CHRIST values', 'mission vision', 'school culture', 'must follow values'],
  'School Vision, Mission, and C.H.R.I.S.T Values',
  'CCS strongly encourages prospective students and families to understand and adhere to our **vision, mission, school culture, and C.H.R.I.S.T values**.

**Vision:**
World-leading Christian school nurturing students holistically: mind, heart, strength, and spirit for a better world and the glory of God.

**C.H.R.I.S.T Values:**
• Compassion
• Honesty
• Respect
• Integrity
• Service
• Teamwork

**Important Requirement:**
• Any applicants who **cannot support or comply** with these principles may not be admitted
• While we welcome diverse backgrounds, alignment with our Christian foundation is essential
• Students don''t need to be Christian, but must respect and engage with our values

**Biblical Foundation:**
"Do two walk together unless they have agreed to do so?" (Amos 3:3) - We seek families who are willing to walk together with us in our mission.',
  'CCS values: Compassion, Honesty, Respect, Integrity, Service, Teamwork. Applicants must support and comply with our Christian foundation, mission, and values to be admitted.',
  9,
  'Admission Policy - Values Compliance'
),
(
  'admission',
  'religious_freedom',
  ARRAY['religious freedom', 'non-christian', 'other religions', 'convert to christianity', 'must be christian'],
  ARRAY['must be christian', 'can muslims apply', 'religious requirement', 'need to convert', 'other religions welcome'],
  'Religious Freedom and Christian Foundation',
  'CCS maintains a balance between our **Christian foundation** and **respect for religious freedom**.

**Our Position:**
• CCS is upfront about being a Christian school rooted in biblical principles
• We respect freedom of religion as a fundamental human right
• We welcome students from **all religious backgrounds**
• We do **NOT require** students to convert or adopt Christianity

**What We Expect:**
• Openness to engage with school''s Christian values
• Respect for Christ-centered environment and activities
• Willingness to participate in school culture
• Understanding of our mission and vision

**What We Don''t Do:**
• Pass judgment on students or families from other religious backgrounds
• Require religious conversion
• Impose Christianity on non-Christian students

**Biblical Wisdom:**
"What business is it of mine to judge those outside the church?" (1 Corinthians 5:12)

CCS encourages wholehearted embrace of our Christian foundation, but respects each family''s religious beliefs while maintaining our values and identity.',
  'CCS welcomes students from all religions without requiring conversion. We expect respect for our Christian values and willingness to engage with our Christ-centered environment.',
  9,
  'Admission Policy - Religious Freedom'
);

-- Category: Admission - Confidentiality & Privacy
INSERT INTO knowledge_base (category, subcategory, keywords, question_patterns, title, content, short_answer, priority, source_section) VALUES
(
  'admission',
  'confidentiality',
  ARRAY['confidential', 'privacy', 'data protection', 'personal information', 'security', 'keamanan data'],
  ARRAY['is data safe', 'confidentiality', 'data protection', 'privacy policy', 'who sees application'],
  'Confidentiality and Data Protection',
  'CCS is committed to **safeguarding all admission-related documents and personal information** provided during the application process.

**Protection Measures:**
• All records handled with utmost confidentiality
• Robust **digital security measures** protect data
• Information used solely for admissions purposes
• Handled with utmost discretion

**Biblical Foundation:**
"Now it is required that those who have been given a trust must prove faithful" (1 Corinthians 4:2)

**Our Commitment:**
• Protect applicants'' and families'' trust
• Secure storage practices
• Limited access to authorized personnel only
• Compliance with data protection standards

Every family''s trust in our institution is honored and safeguarded through these comprehensive security protocols.',
  'All admission documents and personal information are protected with robust digital security, handled confidentially, and used solely for admissions purposes.',
  8,
  'Admission Policy - Confidentiality'
);

-- Category: Admission - Fairness & Non-Discrimination
INSERT INTO knowledge_base (category, subcategory, keywords, question_patterns, title, content, short_answer, priority, source_section) VALUES
(
  'admission',
  'fairness',
  ARRAY['fair', 'non-discrimination', 'equal treatment', 'no favoritism', 'bias', 'discrimination'],
  ARRAY['is admission fair', 'discrimination policy', 'equal treatment', 'favoritism', 'bias in admission'],
  'Fairness and Non-Discrimination',
  '**Fairness and honesty** are integral to our admissions process, guided by biblical principles.

**Our Commitment:**
• Every applicant treated with respect
• Evaluated based on clear, equitable criteria
• Each applicant seen as precious, created by God
• No partiality or favoritism shown

**Biblical Foundation:**
• "For God does not show favoritism" (Romans 2:11)
• "Believers in our glorious Lord Jesus Christ must not show favoritism" (James 2:1)
• "God created mankind in his own image" (Genesis 1:27)

**In Practice:**
• Each application considered seriously
• Avoid discrimination based on race or family background
• Transparent criteria for all applicants
• Professional and warm approach for everyone
• Decisions based on student readiness and school capacity

CCS upholds God''s law to maintain fairness, honesty, and justice in all admission decisions.',
  'CCS ensures every applicant is treated fairly with no discrimination based on race or background. Each application is evaluated using clear, equitable criteria with no favoritism.',
  8,
  'Admission Policy - Fairness'
);

-- Category: Admission - Decision Making
INSERT INTO knowledge_base (category, subcategory, keywords, question_patterns, title, content, short_answer, priority, source_section) VALUES
(
  'admission',
  'decision_process',
  ARRAY['admission decision', 'how decided', 'selection criteria', 'who decides', 'decision factors'],
  ARRAY['how admission decided', 'selection process', 'who makes decision', 'decision criteria', 'what factors considered'],
  'Admission Decision Making Process',
  'CCS employs a **holistic and inclusive approach** to admissions decisions.

**Decision Factors:**
1. **Academic Readiness**
   • Test results (minimum 60%)
   • Previous academic performance
   • Motivation and ability to succeed

2. **Social-Emotional Development**
   • Student interview assessment
   • Counselor evaluation
   • Communication skills

3. **School Capacity**
   • Can CCS meet student''s academic needs?
   • Can we support social-emotional needs?
   • Do we have resources for physical needs?

4. **Family Partnership**
   • Parent alignment with school mission
   • Commitment to CCS values
   • Realistic expectations
   • Partnership potential

**Biblical Wisdom:**
"Won''t you first sit down and estimate the cost to see if you have enough?" (Luke 14:28) - CCS carefully considers whether we can adequately support each student before admission.

**Transparency:**
Admission decisions made with transparency and inclusivity, balancing school readiness with family commitment to our mission.',
  'Decisions based on: (1) Academic readiness & test scores, (2) Social-emotional development, (3) School capacity to meet needs, (4) Family alignment with mission and values.',
  9,
  'Admission Policy - Decision Making & Policy Statement'
);
