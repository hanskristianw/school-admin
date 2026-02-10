/**
 * Custom hook for AI Help functionality in the Topic New page.
 *
 * Manages all AI-related state, prompt generation, API calls,
 * toggle/apply logic for multi-select AI suggestions.
 *
 * Extracted from page.jsx to reduce file size.
 */

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

/**
 * @param {Object} deps - external state/refs from the parent component
 * @param {Object}   deps.selectedTopic
 * @param {Function} deps.setSelectedTopic
 * @param {Object}   deps.wizardAssessment
 * @param {Function} deps.setWizardAssessment
 * @param {Array}    deps.wizardCriteria
 * @param {Array}    deps.wizardStrands
 * @param {Array}    deps.wizardRubrics
 * @param {Array}    deps.subjects
 * @param {Map}      deps.kelasNameMap
 * @param {Array}    deps.learnerProfiles
 * @param {Object}   deps.aiScrollRef  – React ref to the scroll container
 */
export default function useAiHelp({
  selectedTopic,
  setSelectedTopic,
  wizardAssessment,
  setWizardAssessment,
  wizardCriteria,
  wizardStrands,
  wizardRubrics,
  subjects,
  kelasNameMap,
  learnerProfiles,
  aiScrollRef,
}) {
  // ── AI internal state ──────────────────────────────────────────────────────
  const [aiInputModalOpen, setAiInputModalOpen] = useState(false)
  const [aiResultModalOpen, setAiResultModalOpen] = useState(false)
  const [aiUserInput, setAiUserInput] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState('')
  const [aiItems, setAiItems] = useState([])
  const [aiLang, setAiLang] = useState('')
  const [aiHelpType, setAiHelpType] = useState('')

  // Multi-select states
  const [selectedInquiryQuestions, setSelectedInquiryQuestions] = useState([])
  const [selectedKeyConcepts, setSelectedKeyConcepts] = useState([])
  const [selectedRelatedConcepts, setSelectedRelatedConcepts] = useState([])
  const [selectedGlobalContexts, setSelectedGlobalContexts] = useState([])
  const [selectedStatements, setSelectedStatements] = useState([])
  const [selectedLearnerProfiles, setSelectedLearnerProfiles] = useState([])
  const [selectedServiceLearning, setSelectedServiceLearning] = useState([])
  const [selectedResources, setSelectedResources] = useState([])
  const [selectedAtlSkills, setSelectedAtlSkills] = useState([])
  const [selectedAssessmentRelationship, setSelectedAssessmentRelationship] = useState([])

  // ── Helpers ────────────────────────────────────────────────────────────────

  /** Generic toggle with scroll-position preservation */
  const makeToggle = (setter) => (index) => {
    const scrollContainer = aiScrollRef?.current
    if (!scrollContainer) return

    const currentScrollPos = scrollContainer.scrollTop
    const scrollElem = scrollContainer

    setter(prev => {
      const newVal = prev.includes(index)
        ? prev.filter(i => i !== index)
        : [...prev, index]

      Promise.resolve().then(() => {
        scrollElem.scrollTop = currentScrollPos
        setTimeout(() => (scrollElem.scrollTop = currentScrollPos), 0)
        requestAnimationFrame(() => (scrollElem.scrollTop = currentScrollPos))
      })

      return newVal
    })
  }

  /** Generic single-select toggle with scroll-position preservation */
  const makeSingleToggle = (setter) => (index) => {
    const scrollContainer = aiScrollRef?.current
    if (!scrollContainer) return

    const currentScrollPos = scrollContainer.scrollTop
    const scrollElem = scrollContainer

    setter(prev => {
      const newVal = prev.includes(index) ? [] : [index]

      Promise.resolve().then(() => {
        scrollElem.scrollTop = currentScrollPos
        setTimeout(() => (scrollElem.scrollTop = currentScrollPos), 0)
        requestAnimationFrame(() => (scrollElem.scrollTop = currentScrollPos))
      })

      return newVal
    })
  }

  // ── Toggle functions ───────────────────────────────────────────────────────
  const toggleInquiryQuestion = makeToggle(setSelectedInquiryQuestions)
  const toggleKeyConcept = makeToggle(setSelectedKeyConcepts)
  const toggleRelatedConcept = makeToggle(setSelectedRelatedConcepts)
  const toggleGlobalContext = makeToggle(setSelectedGlobalContexts)
  const toggleLearnerProfile = makeToggle(setSelectedLearnerProfiles)
  const toggleResources = makeToggle(setSelectedResources)
  const toggleStatement = makeSingleToggle(setSelectedStatements)
  const toggleServiceLearning = makeSingleToggle(setSelectedServiceLearning)

  // ── Reset all AI modal state ──────────────────────────────────────────────
  const resetAiState = () => {
    setAiInputModalOpen(false)
    setAiResultModalOpen(false)
    setAiLoading(false)
    setAiError('')
    setAiItems([])
  }

  // ── Open input modal ───────────────────────────────────────────────────────
  const openAiInputModal = (lang, helpType = 'unitTitle') => {
    setAiLang(lang)
    setAiHelpType(helpType)
    setAiUserInput('')
    setAiError('')
    setSelectedInquiryQuestions([])
    setAiInputModalOpen(true)
  }

  // ── Main AI request ────────────────────────────────────────────────────────
  const requestAiHelp = async (helpType_ = aiHelpType) => {
    const helpType = helpType_
    const noInputRequired = ['keyConcept', 'relatedConcept', 'inquiryQuestion', 'globalContext', 'statement', 'learnerProfile', 'serviceLearning', 'resources', 'assessmentName', 'assessmentRelationship']

    if (!noInputRequired.includes(helpType) && !aiUserInput.trim()) {
      setAiError('Mohon masukkan topik atau konteks yang ingin dibahas')
      return
    }

    setAiInputModalOpen(false)
    setAiResultModalOpen(true)
    setAiLoading(true)
    setAiError('')
    setAiItems([])

    try {
      // Determine rule column
      let ruleColumn = 'ai_rule_unit'
      if (helpType === 'inquiryQuestion') ruleColumn = 'ai_rule_inquiry_question'
      else if (helpType === 'keyConcept') ruleColumn = 'ai_rule_key_concept'
      else if (helpType === 'relatedConcept') ruleColumn = 'ai_rule_related_concept'
      else if (helpType === 'globalContext') ruleColumn = 'ai_rule_global_context'
      else if (helpType === 'statement') ruleColumn = 'ai_rule_statement'
      else if (helpType === 'learnerProfile') ruleColumn = 'ai_rule_learner_profile'
      else if (helpType === 'serviceLearning') ruleColumn = 'ai_rule_service_learning'
      else if (helpType === 'assessmentRelationship') ruleColumn = 'ai_rule_relationship_sa_soi'

      const { data: rule, error: rErr } = await supabase.from('ai_rule').select(ruleColumn).limit(1).single()
      if (rErr) throw new Error(rErr.message)

      const context = rule?.[ruleColumn] || ''
      const bahasaMap = { en: 'English', id: 'Indonesia', zh: 'Mandarin' }
      const selected = bahasaMap[aiLang] || 'English'

      const subj = subjects.find(s => String(s.subject_id) === String(selectedTopic?.topic_subject_id))
      const subjName = subj?.subject_name || 'Belum dipilih'
      const kelasName = kelasNameMap.get(parseInt(selectedTopic?.topic_kelas_id)) || 'Belum dipilih'

      let promptWithLang = ''

      if (helpType === 'relatedConcept') {
        const unitTitle = selectedTopic?.topic_nama || 'Not yet defined'
        promptWithLang = `${context ? context + "\n\n" : ''}LEARNING CONTEXT:
- Unit Title: ${unitTitle}
- Subject: ${subjName}
- Grade/Class: ${kelasName}

INSTRUCTIONS:
Based on the unit title "${unitTitle}" for the subject "${subjName}" at grade "${kelasName}", suggest 3 most relevant Related Concepts.

Related Concepts are subject-specific concepts that deepen understanding within a particular discipline. They are more specific than Key Concepts and directly relate to the subject being taught.

For each suggested Related Concept, provide:
- The concept name (option)
- A brief explanation of the concept (text)
- Why this concept is relevant to the unit (reason)

JSON FORMAT:
{
  "jawaban": [
    {
      "option": "Related Concept name",
      "text": "Brief explanation of this concept in the context of ${subjName}",
      "reason": "Why this concept is relevant to '${unitTitle}' for ${kelasName} students"
    },
    {
      "option": "Related Concept name",
      "text": "Brief explanation of this concept",
      "reason": "Why this concept is relevant to the unit"
    },
    {
      "option": "Related Concept name",
      "text": "Brief explanation of this concept",
      "reason": "Why this concept is relevant to the unit"
    }
  ]
}

Please respond in English and ensure valid JSON format.`
      } else if (helpType === 'statement') {
        const unitTitle = selectedTopic?.topic_nama || 'Not yet defined'
        const keyConcept = selectedTopic?.topic_key_concept || 'Not yet defined'
        const relatedConcept = selectedTopic?.topic_related_concept || 'Not yet defined'
        const globalContext = selectedTopic?.topic_global_context || 'Not yet defined'

        promptWithLang = `${context ? context + "\n\n" : ''}LEARNING CONTEXT:
- Unit Title: ${unitTitle}
- Key Concepts: ${keyConcept}
- Related Concepts: ${relatedConcept}
- Global Context: ${globalContext}
- Subject: ${subjName}

INSTRUCTIONS:
Based on the information above, generate 3 Statement of Inquiry suggestions that integrate the Key Concepts, Related Concepts, and Global Context.

A Statement of Inquiry should:
- Be a clear, concise statement (1-2 sentences)
- Integrate Key Concept + Related Concept + Global Context
- Guide the entire unit's learning
- Be transferable and conceptual

For each suggested Statement of Inquiry, provide:
- The complete statement (option)
- How it integrates the concepts and context (text)
- Why this statement is effective for the unit (reason)

JSON FORMAT:
{
  "jawaban": [
    {
      "option": "Complete Statement of Inquiry text",
      "text": "Explanation of how it integrates Key Concept '${keyConcept}' + Related Concept '${relatedConcept}' + Global Context '${globalContext}'",
      "reason": "Why this statement effectively guides learning for the unit '${unitTitle}'"
    },
    {
      "option": "Complete Statement of Inquiry text",
      "text": "Explanation of how it integrates the concepts and context",
      "reason": "Why this statement is effective"
    },
    {
      "option": "Complete Statement of Inquiry text",
      "text": "Explanation of how it integrates the concepts and context",
      "reason": "Why this statement is effective"
    }
  ]
}

Please respond in English and ensure valid JSON format.`
      } else if (helpType === 'globalContext') {
        const unitTitle = selectedTopic?.topic_nama || 'Not yet defined'
        const keyConcept = selectedTopic?.topic_key_concept || 'Not yet defined'
        promptWithLang = `${context ? context + "\n\n" : ''}LEARNING CONTEXT:
- Unit Title: ${unitTitle}
- Key Concepts: ${keyConcept}
- Subject: ${subjName}

INSTRUCTIONS:
Based on the unit title "${unitTitle}" and key concepts "${keyConcept}" for the subject "${subjName}", suggest 2-3 most relevant IB MYP Global Contexts from the following 6 contexts:

1. Identities and relationships
2. Orientation in space and time
3. Personal and cultural expression
4. Scientific and technical innovation
5. Globalization and sustainability
6. Fairness and development

For each suggested Global Context, provide:
- The context name (option)
- A brief description connecting it to the unit (text)
- Why this context is relevant to the unit (reason)

JSON FORMAT:
{
  "jawaban": [
    {
      "option": "Global Context name",
      "text": "Brief description connecting to the unit",
      "reason": "Why this context is relevant to '${unitTitle}' with key concepts '${keyConcept}'"
    },
    {
      "option": "Global Context name",
      "text": "Brief description connecting to the unit",
      "reason": "Why this context is relevant to '${unitTitle}' with key concepts '${keyConcept}'"
    }
  ]
}

Please respond in English and ensure valid JSON format.`
      } else if (helpType === 'keyConcept') {
        const unitTitle = selectedTopic?.topic_nama || 'Not yet defined'
        promptWithLang = `${context ? context + "\n\n" : ''}LEARNING CONTEXT:
- Unit Title: ${unitTitle}
- Subject: ${subjName}

INSTRUCTIONS:
Based on the unit title "${unitTitle}" for the subject "${subjName}", suggest 3 most relevant IB MYP Key Concepts from the following 16 concepts:

Aesthetics, Change, Communication, Communities, Connections, Creativity, Culture, Development, Form, Global interactions, Identity, Logic, Perspective, Relationships, Systems, Time place and space

For each suggested Key Concept, provide:
- The concept name (option)
- A brief description of what the concept means (text)
- Why this concept is relevant to the unit (reason)

JSON FORMAT:
{
  "jawaban": [
    {
      "option": "Key Concept name",
      "text": "Brief description of the concept",
      "reason": "Why this concept is relevant to the unit '${unitTitle}'"
    },
    {
      "option": "Key Concept name",
      "text": "Brief description of the concept",
      "reason": "Why this concept is relevant to the unit '${unitTitle}'"
    },
    {
      "option": "Key Concept name",
      "text": "Brief description of the concept",
      "reason": "Why this concept is relevant to the unit '${unitTitle}'"
    }
  ]
}

Please respond in English and ensure valid JSON format.`
      } else if (helpType === 'inquiryQuestion') {
        const unitTitle = selectedTopic?.topic_nama || 'Not yet defined'
        promptWithLang = `${context ? context + "\n\n" : ''}LEARNING CONTEXT:
- Subject: ${subjName}
- Class: ${kelasName}
- Unit Title: ${unitTitle}
- Additional context from teacher: ${aiUserInput.trim()}

INSTRUCTIONS:
Based on the context above, generate inquiry questions in THREE categories (Factual, Conceptual, and Debatable) for the subject "${subjName}" at ${kelasName} level with unit title "${unitTitle}". 

Follow IB MYP inquiry framework:
- **Factual questions**: Questions that elicit facts and test knowledge/comprehension (What? When? Where? Who?)
- **Conceptual questions**: Questions that require analysis, synthesis, and understanding of concepts (Why? How? What if?)
- **Debatable questions**: Questions that are open-ended, provocative, and require evaluation and judgment (To what extent? Should? Is it justified?)

Generate 3 questions for EACH category (total 9 questions).

JSON FORMAT:
{
  "inquiry_questions": {
    "factual": {
      "question_1": "First factual question...",
      "question_2": "Second factual question...",
      "question_3": "Third factual question..."
    },
    "conceptual": {
      "question_1": "First conceptual question...",
      "question_2": "Second conceptual question...",
      "question_3": "Third conceptual question..."
    },
    "debatable": {
      "question_1": "First debatable question...",
      "question_2": "Second debatable question...",
      "question_3": "Third debatable question..."
    }
  }
}

Please respond in ${selected} language and ensure valid JSON format.`
      } else if (helpType === 'learnerProfile') {
        const unitTitle = selectedTopic?.topic_nama || 'Not yet defined'
        const keyConcept = selectedTopic?.topic_key_concept || 'Not yet defined'
        const relatedConcept = selectedTopic?.topic_related_concept || 'Not yet defined'
        const globalContext = selectedTopic?.topic_global_context || 'Not yet defined'

        promptWithLang = `${context ? context + "\n\n" : ''}LEARNING CONTEXT:
- Unit Title: ${unitTitle}
- Key Concepts: ${keyConcept}
- Related Concepts: ${relatedConcept}
- Global Context: ${globalContext}
- Subject: ${subjName}
- Grade/Class: ${kelasName}

INSTRUCTIONS:
Based on the information above, suggest 2-3 most relevant IB Learner Profile attributes that students will develop through this unit.

The 10 IB Learner Profile attributes are:
1. Inquirers - They develop their natural curiosity and acquire skills for inquiry and research
2. Knowledgeable - They explore concepts and ideas, and engage with issues of local and global significance
3. Thinkers - They exercise initiative in applying thinking skills critically and creatively
4. Communicators - They express themselves confidently and creatively in multiple ways
5. Principled - They act with integrity and honesty, with a strong sense of fairness and justice
6. Open-Minded - They understand and appreciate their own cultures and personal histories, and are open to perspectives of others
7. Caring - They show empathy, compassion and respect towards the needs and feelings of others
8. Risk-takers - They approach unfamiliar situations and uncertainty with courage
9. Balanced - They understand the importance of intellectual, physical and emotional balance
10. Reflective - They give thoughtful consideration to their own learning and experience

For each suggested Learner Profile attribute, provide:
- The attribute name (option) - choose from the 10 above
- How this attribute will be developed through the unit (text)
- Why this attribute is particularly relevant to the unit's context (reason)

JSON FORMAT:
{
  "jawaban": [
    {
      "option": "Learner Profile attribute name",
      "text": "Explanation of how this attribute will be developed through '${unitTitle}' with focus on '${keyConcept}' and '${relatedConcept}' in the context of '${globalContext}'",
      "reason": "Why this attribute is particularly relevant to this unit in ${subjName} for ${kelasName}"
    },
    {
      "option": "Learner Profile attribute name",
      "text": "Explanation of how this attribute will be developed through the unit",
      "reason": "Why this attribute is particularly relevant to this unit"
    }
  ]
}

Please respond in English and ensure valid JSON format.`
      } else if (helpType === 'serviceLearning') {
        const unitTitle = selectedTopic?.topic_nama || 'Not yet defined'
        const keyConcept = selectedTopic?.topic_key_concept || 'Not yet defined'
        const relatedConcept = selectedTopic?.topic_related_concept || 'Not yet defined'
        const globalContext = selectedTopic?.topic_global_context || 'Not yet defined'

        promptWithLang = `${context ? context + "\n\n" : ''}LEARNING CONTEXT:
- Unit Title: ${unitTitle}
- Key Concepts: ${keyConcept}
- Related Concepts: ${relatedConcept}
- Global Context: ${globalContext}
- Subject: ${subjName}
- Grade/Class: ${kelasName}

INSTRUCTIONS:
Based on the information above, suggest 2-3 meaningful Service Learning opportunities that students can engage in to apply their learning in real-world contexts.

Service Learning should:
- Connect to the unit's Key Concepts, Related Concepts, and Global Context
- Address a genuine community need or issue
- Provide opportunities for students to apply subject knowledge
- Promote reflection and deeper understanding
- Be age-appropriate for ${kelasName} students

For each Service Learning suggestion, provide:
- A concise title/description of the service activity (option)
- How this service connects to the unit's concepts and context (text)
- Why this service learning opportunity is meaningful for students (reason)

JSON FORMAT:
{
  "jawaban": [
    {
      "option": "Brief title/description of service learning activity",
      "text": "Explanation of how this service connects to '${keyConcept}', '${relatedConcept}', and '${globalContext}' in the context of '${unitTitle}'",
      "reason": "Why this service learning is meaningful and appropriate for ${kelasName} students in ${subjName}"
    },
    {
      "option": "Brief title/description of service learning activity",
      "text": "Explanation of how this service connects to the unit's concepts and context",
      "reason": "Why this service learning is meaningful and appropriate"
    }
  ]
}

Please respond in English and ensure valid JSON format.`
      } else if (helpType === 'resources') {
        const unitTitle = selectedTopic?.topic_nama || 'Not yet defined'
        const keyConcept = selectedTopic?.topic_key_concept || 'Not yet defined'
        const relatedConcept = selectedTopic?.topic_related_concept || 'Not yet defined'
        const globalContext = selectedTopic?.topic_global_context || 'Not yet defined'
        const statement = selectedTopic?.topic_statement || 'Not yet defined'

        promptWithLang = `LEARNING CONTEXT:
- Unit Title: ${unitTitle}
- Statement of Inquiry: ${statement}
- Key Concepts: ${keyConcept}
- Related Concepts: ${relatedConcept}
- Global Context: ${globalContext}
- Subject: ${subjName}
- Grade/Class: ${kelasName}

INSTRUCTIONS:
Based on the information above, suggest 5-6 educational resources/references (bibliography) that teachers and students can use for this unit. Include a variety of resource types:

Resources should:
- Be relevant to the unit's concepts, statement of inquiry, and global context
- Be age-appropriate for ${kelasName} students
- Include a mix of: books, websites, videos, articles, educational platforms, etc.
- Support both teacher instruction and student research
- Be from reputable educational sources
- Include actual, real, and accessible URLs/links when available

For each resource suggestion, provide:
- The resource name/title with type (e.g., "Book: Title" or "Website: Name") (option)
- The URL/link to access the resource (link) - use real, working URLs. For books, provide Amazon, Google Books, or publisher links. For websites, provide the actual website URL.
- A brief description of the resource and how it connects to the unit (text)
- Why this resource is valuable for teaching/learning this unit (reason)

JSON FORMAT:
{
  "jawaban": [
    {
      "option": "Book/Website/Video/Article: Resource Title or Name",
      "link": "https://example.com/resource-url",
      "text": "Brief description of the resource and how it relates to '${unitTitle}' and concepts like ${keyConcept}",
      "reason": "Why this resource is valuable for ${kelasName} students learning about ${relatedConcept} in ${subjName}"
    },
    {
      "option": "Book/Website/Video/Article: Resource Title or Name",
      "link": "https://example.com/another-resource",
      "text": "Description of the resource and its connection to the unit",
      "reason": "Why this resource is valuable"
    }
  ]
}

Please respond in English and ensure valid JSON format.`

        console.log('🤖 AI Prompt for Resources')
        console.log('📋 Context:', { unitTitle, statement, keyConcept, relatedConcept, globalContext, subjName, kelasName })
      } else if (helpType === 'assessmentName') {
        const unitTitle = selectedTopic?.topic_nama || 'Not yet defined'
        const statement = selectedTopic?.topic_statement || 'Not yet defined'
        const keyConcept = selectedTopic?.topic_key_concept || 'Not yet defined'
        const relatedConcept = selectedTopic?.topic_related_concept || 'Not yet defined'
        const globalContext = selectedTopic?.topic_global_context || 'Not yet defined'
        const inquiryQuestion = selectedTopic?.topic_inquiry_question || 'Not yet defined'
        const learnerProfile_ = selectedTopic?.topic_learner_profile || 'Not yet defined'

        const selectedCriteriaDetails = wizardCriteria
          .filter(c => wizardAssessment.selected_criteria.includes(c.criterion_id))
          .map(c => `${c.code}: ${c.name}`)
        const selectedCriteriaNames = selectedCriteriaDetails.join(', ')

        promptWithLang = `${context ? context + "\n\n" : ''}LEARNING CONTEXT:
- Unit Title: ${unitTitle}
- Statement of Inquiry: ${statement}
- Inquiry Question: ${inquiryQuestion}
- Key Concepts: ${keyConcept}
- Related Concepts: ${relatedConcept}
- Global Context: ${globalContext}
- Learner Profile Attributes: ${learnerProfile_}
- Criteria to Assess: ${selectedCriteriaNames}
- Subject: ${subjName}
- Grade/Class: ${kelasName}

INSTRUCTIONS:
Based on the information above, generate 2 complete assessment suggestions. Each suggestion must include:

1. **Assessment Name**: A creative and engaging title for the assessment
2. **Conceptual Understanding**: What conceptual understanding students should demonstrate (connect to Key Concepts: ${keyConcept} and Related Concepts: ${relatedConcept})
3. **Task Specific Description**: Detailed description of what students need to do, specifically aligned with the criteria being assessed (${selectedCriteriaNames})
4. **Assessment Instructions**: Step-by-step instructions for students to complete the assessment, ensuring they can demonstrate mastery of each criterion (${selectedCriteriaNames})

Requirements:
- The assessment must clearly connect to the Statement of Inquiry: "${statement}"
- The Task Description MUST specifically address how students will demonstrate each criterion: ${selectedCriteriaNames}
- Instructions should be clear, numbered steps that guide students through the task
- Everything should be appropriate for ${kelasName} students in ${subjName}

JSON FORMAT:
{
  "jawaban": [
    {
      "option": "Creative Assessment Name/Title",
      "conceptual_understanding": "A paragraph explaining what conceptual understanding students will demonstrate through this assessment, connecting to ${keyConcept} and ${relatedConcept}. This should explain how the assessment helps students understand the big ideas of the unit.",
      "task_description": "Detailed task description that specifically explains how students will demonstrate each criterion (${selectedCriteriaNames}). Be specific about what product or performance students will create and how it connects to the criteria.",
      "instructions": "1. First step of the assessment\\n2. Second step\\n3. Third step\\n4. Fourth step\\n5. Fifth step (include at least 5 clear, actionable steps)",
      "text": "Brief summary of the assessment approach",
      "reason": "Why this assessment effectively measures ${selectedCriteriaNames} in the context of '${unitTitle}'"
    }
  ]
}

Please respond in English and ensure valid JSON format. Each instruction step should be on a new line (use \\n for line breaks).`

        console.log('🤖 AI Prompt for Assessment Details')
        console.log('📋 Context:', { unitTitle, statement, keyConcept, relatedConcept, selectedCriteriaNames })
      } else if (helpType === 'assessmentRelationship') {
        const unitTitle = selectedTopic?.topic_nama || 'Not yet defined'
        const unitNumber = selectedTopic?.topic_urutan || 'Not yet defined'
        const duration = selectedTopic?.topic_duration || 'Not yet defined'
        const hoursPerWeek = selectedTopic?.topic_hours_per_week || 'Not yet defined'
        const mypYear = selectedTopic?.topic_year || 'Not yet defined'
        const inquiryQuestion = selectedTopic?.topic_inquiry_question || 'Not yet defined'
        const keyConcept = selectedTopic?.topic_key_concept || 'Not yet defined'
        const relatedConcept = selectedTopic?.topic_related_concept || 'Not yet defined'
        const globalContext = selectedTopic?.topic_global_context || 'Not yet defined'
        const statement = selectedTopic?.topic_statement || 'Not yet defined'
        const learnerProfile_ = selectedTopic?.topic_learner_profile || 'Not yet defined'
        const serviceLearning_ = selectedTopic?.topic_service_learning || 'Not yet defined'
        const assessmentName = wizardAssessment?.assessment_nama || 'Not yet defined'
        const assessmentSemester = wizardAssessment?.assessment_semester || 'Not yet defined'
        const assessmentDescription = wizardAssessment?.assessment_keterangan || 'Not provided'

        const selectedCriteriaNames = wizardCriteria
          .filter(c => wizardAssessment.selected_criteria?.includes(c.criterion_id))
          .map(c => `${c.code}: ${c.name}`)
          .join(', ') || 'Not yet selected'

        promptWithLang = `${context ? context + "\n\n" : ''}COMPLETE UNIT PLANNER CONTEXT (Steps 1-6):

=== STEP 1: BASIC INFORMATION ===
- Unit Title: ${unitTitle}
- Unit Number: ${unitNumber}
- Duration: ${duration} weeks (${hoursPerWeek} hours per week)
- MYP Year: ${mypYear}
- Subject: ${subjName}
- Grade/Class: ${kelasName}

=== STEP 2: INQUIRY QUESTION ===
${inquiryQuestion}

=== STEP 3: KEY & RELATED CONCEPTS ===
- Key Concepts: ${keyConcept}
- Related Concepts: ${relatedConcept}
- Global Context: ${globalContext}

=== STEP 4: STATEMENT OF INQUIRY ===
${statement}

=== STEP 5: LEARNER PROFILE & SERVICE LEARNING ===
- Learner Profile Attributes: ${learnerProfile_}
- Service Learning: ${serviceLearning_}

=== STEP 6: ASSESSMENT DETAILS ===
- Assessment Name: ${assessmentName}
- Semester: ${assessmentSemester}
- Description: ${assessmentDescription}
- Criteria to Assess: ${selectedCriteriaNames}

=== YOUR TASK ===
Based on ALL the information above, write a comprehensive explanation of the RELATIONSHIP between:
1. The Summative Assessment: "${assessmentName}"
2. The Statement of Inquiry: "${statement}"

Your explanation should:
1. Clearly describe HOW the assessment task allows students to demonstrate their understanding of the Statement of Inquiry
2. Explain the CONNECTION between the assessment and the Key Concepts (${keyConcept}) and Related Concepts (${relatedConcept})
3. Show how the assessment criteria (${selectedCriteriaNames}) align with measuring conceptual understanding
4. Reference the Global Context (${globalContext}) and how it frames the assessment
5. Explain how completing this assessment helps develop the Learner Profile attributes (${learnerProfile_})
6. Be specific, detailed, and directly connected to this particular unit

Generate 3 different but equally valid relationship explanations.

JSON FORMAT:
{
  "jawaban": [
    {
      "option": "A complete, detailed paragraph explaining how the summative assessment '${assessmentName}' relates to and measures the Statement of Inquiry. This should be 3-5 sentences that a teacher can directly use in their unit planner.",
      "text": "Additional details on how students will demonstrate understanding of ${keyConcept} and ${relatedConcept} through this assessment, and how the criteria ${selectedCriteriaNames} will be used to evaluate their work.",
      "reason": "Why this relationship explanation is strong and demonstrates clear alignment between the assessment task and the conceptual understanding goals of the unit."
    }
  ]
}

Please respond in English and ensure valid JSON format.`

        console.log('🤖 AI Prompt for Assessment Relationship')
      } else {
        // Default: Unit Title prompt
        promptWithLang = `${context ? context + "\n\n" : ''}LEARNING CONTEXT:
- Subject: ${subjName}
- Class: ${kelasName}
- Topic to discuss: ${aiUserInput.trim()}

INSTRUCTIONS:
Based on the context above, generate 3 Unit Title suggestions that are appropriate for the subject "${subjName}" at ${kelasName} level. Ensure the unit titles are relevant to the topic discussed and match the characteristics of the subject.

JSON FORMAT:
{
  "jawaban": [
    {
      "option": "unit title suggestion 1",
      "text": "brief description explaining unit focus",
      "reason": "why this title is suitable for ${subjName} in ${kelasName}"
    },
    {
      "option": "unit title suggestion 2",
      "text": "brief description explaining unit focus",
      "reason": "why this title is suitable for ${subjName} in ${kelasName}"
    },
    {
      "option": "unit title suggestion 3",
      "text": "brief description explaining unit focus",
      "reason": "why this title is suitable for ${subjName} in ${kelasName}"
    }
  ]
}

Please respond in ${selected} language and ensure valid JSON format.`
      }

      // DEBUG
      console.log('🤖 AI Prompt yang dikirim:')
      console.log('📚 Subject:', subjName, '🎓 Kelas:', kelasName, '🌐 Bahasa:', selected)

      const body = { prompt: promptWithLang, context }
      const resp = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      const json = await resp.json()
      if (!resp.ok) throw new Error(json?.error || 'Gagal memanggil AI')

      const text = json?.text || ''
      console.log('🤖 AI Response:', text)

      // Parse AI response
      let items = []
      try {
        let parsed
        try {
          parsed = JSON.parse(text)
        } catch (jsonErr) {
          const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/```\s*([\s\S]*?)\s*```/)
          if (jsonMatch) {
            parsed = JSON.parse(jsonMatch[1])
          } else {
            const objMatch = text.match(/\{[\s\S]*("jawaban"|"inquiry_questions")[\s\S]*\}/)
            if (objMatch) {
              parsed = JSON.parse(objMatch[0])
            }
          }
        }

        if (parsed && parsed.inquiry_questions) {
          const iq = parsed.inquiry_questions
          items = []
          let idx = 1
          if (iq.factual) {
            Object.entries(iq.factual).forEach(([, question]) => {
              items.push({ index: idx++, category: 'Factual', option: question.toString().trim(), text: 'A factual question that tests knowledge and comprehension', reason: 'Helps students recall and understand basic facts and information' })
            })
          }
          if (iq.conceptual) {
            Object.entries(iq.conceptual).forEach(([, question]) => {
              items.push({ index: idx++, category: 'Conceptual', option: question.toString().trim(), text: 'A conceptual question that requires analysis and synthesis', reason: 'Encourages students to understand deeper concepts and relationships' })
            })
          }
          if (iq.debatable) {
            Object.entries(iq.debatable).forEach(([, question]) => {
              items.push({ index: idx++, category: 'Debatable', option: question.toString().trim(), text: 'A debatable question that requires evaluation and judgment', reason: 'Promotes critical thinking and justification of perspectives' })
            })
          }
          console.log('✅ Parsed inquiry questions:', items)
        } else if (parsed && Array.isArray(parsed.jawaban)) {
          items = parsed.jawaban.map((a, idx) => ({
            index: idx + 1,
            option: (a?.option ?? '').toString().trim(),
            link: (a?.link ?? '').toString().trim(),
            text: (a?.text ?? '').toString().trim(),
            reason: (a?.reason ?? '').toString().trim(),
            conceptual_understanding: (a?.conceptual_understanding ?? '').toString().trim(),
            task_description: (a?.task_description ?? '').toString().trim(),
            instructions: (a?.instructions ?? '').toString().trim().replace(/\\n/g, '\n')
          }))
          console.log('✅ Parsed JSON items:', items)
        }
      } catch (e) {
        console.warn('⚠️ Failed to parse as JSON, falling back to numbered list', e)
        const lines = text.split(/\r?\n/).filter(l => l.trim())
        items = lines
          .map(line => {
            const match = line.match(/^(\d+)[.)\s]+(.*)$/)
            if (match) {
              return { index: parseInt(match[1]), text: match[2].trim(), option: match[2].trim(), reason: '' }
            }
            return null
          })
          .filter(Boolean)
      }

      setAiItems(items)
    } catch (e) {
      console.error('AI Help error', e)
      setAiError(e.message)
    } finally {
      setAiLoading(false)
    }
  }

  // ── ATL AI Help ────────────────────────────────────────────────────────────
  const requestAiHelpAtl = async () => {
    if (!selectedTopic.topic_kelas_id) {
      alert('Please select Class in Step 1 first')
      return
    }

    setAiLoading(true)
    setAiError('')
    setAiResultModalOpen(true)

    try {
      const { data: kelasData, error: kelasError } = await supabase
        .from('kelas')
        .select('kelas_nama')
        .eq('kelas_id', selectedTopic.topic_kelas_id)
        .single()

      if (kelasError) throw kelasError

      const kelasNama = kelasData?.kelas_nama || ''

      const { data: atlDescriptors, error: atlError } = await supabase
        .from('atl_descriptors')
        .select('id, skill_category, strand, cluster, descriptor_text, min_grade, max_grade')
        .order('skill_category')
        .order('strand')

      if (atlError) throw atlError

      if (!atlDescriptors || atlDescriptors.length === 0) {
        setAiError('No ATL descriptors found in database. Please add ATL descriptors in ATL Management first.')
        setAiLoading(false)
        return
      }

      const atlContext = {
        unit_title: selectedTopic.topic_nama || '',
        class_name: kelasNama,
        subject: subjects.find(s => s.subject_id === selectedTopic.topic_subject_id)?.subject_name || '',
        inquiry_question: selectedTopic.topic_inquiry_question || '',
        key_concept: selectedTopic.topic_key_concept || '',
        related_concept: selectedTopic.topic_related_concept || '',
        global_context: selectedTopic.topic_global_context || '',
        statement_of_inquiry: selectedTopic.topic_statement || '',
        learner_profile: selectedTopic.topic_learner_profile || '',
        service_learning: selectedTopic.topic_service_learning || ''
      }

      const atlDescriptorsText = atlDescriptors.map((atl, idx) =>
        `${idx + 1}. [ID: ${atl.id}] ${atl.skill_category} - ${atl.strand} - ${atl.cluster}: ${atl.descriptor_text}`
      ).join('\n')

      const prompt = `You are an IB MYP curriculum expert. Based on the unit plan context below, suggest the 3 most relevant ATL (Approaches to Learning) skills from the provided list.

=== UNIT PLAN CONTEXT ===
Unit Title: ${atlContext.unit_title}
Class: ${atlContext.class_name}
Subject: ${atlContext.subject}
Inquiry Question: ${atlContext.inquiry_question}
Key Concept: ${atlContext.key_concept}
Related Concept: ${atlContext.related_concept}
Global Context: ${atlContext.global_context}
Statement of Inquiry: ${atlContext.statement_of_inquiry}
Learner Profile Attributes: ${atlContext.learner_profile}
Service Learning: ${atlContext.service_learning}

=== AVAILABLE ATL DESCRIPTORS ===
${atlDescriptorsText}

=== INSTRUCTIONS ===
Select exactly 3 ATL skills that:
1. Best align with the unit's inquiry question and statement of inquiry
2. Support the learner profile attributes being developed
3. Are most relevant to the subject and global context
4. Will help students achieve the learning objectives

IMPORTANT - Return array of 3 ATL skills. Each skill must have:
- id, skill_category, strand, cluster, descriptor_text
- reason (why relevant to this unit)
- summary_sentence (ONE complete sentence following this template):
  "In order for me to [component/goal/product], I must [skill indicator]. ([ATL skill category and/or cluster]). I will learn to do this through [strategy]."

Response format (array of skills):
[
  {
    "id": 5,
    "skill_category": "Communication",
    "strand": "Exchanging Information",
    "cluster": "Giving and receiving meaningful feedback",
    "descriptor_text": "Give and receive meaningful feedback",
    "reason": "This skill supports the inquiry question by helping students exchange ideas about digital design and receive constructive feedback on their work.",
    "summary_sentence": "In order for me to create effective digital designs, I must give and receive meaningful feedback. (Communication - Exchanging Information). I will learn to do this through collaborative design critiques and peer review sessions."
  }
]

Requirements:
- Select from the provided list above using the [ID: X] numbers
- Choose skills from different categories when possible for balanced development
- Each summary_sentence must be unique and specific to that ATL skill
- No markdown, no code blocks, just raw JSON array`

      console.log('=== ATL AI HELP PROMPT ===')

      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, context: JSON.stringify(atlContext) })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to get AI suggestions')
      }

      const data = await response.json()
      let suggestions = data.text

      if (typeof suggestions === 'string') {
        suggestions = suggestions.trim()
        if (suggestions.startsWith('```json')) {
          suggestions = suggestions.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
        } else if (suggestions.startsWith('```')) {
          suggestions = suggestions.replace(/```\n?/g, '').trim()
        }
        try {
          suggestions = JSON.parse(suggestions)
        } catch (parseError) {
          throw new Error('Failed to parse AI response as JSON: ' + parseError.message)
        }
      }

      if (!Array.isArray(suggestions)) {
        throw new Error('AI response is not an array. Received: ' + typeof suggestions)
      }

      const itemsWithIndex = suggestions.map((item, idx) => ({ ...item, index: idx + 1 }))
      setAiItems(itemsWithIndex)
      setSelectedAtlSkills([])
    } catch (err) {
      console.error('❌ Error getting ATL AI help:', err)
      setAiError(err.message || 'Failed to get AI suggestions. Please try again.')
    } finally {
      setAiLoading(false)
    }
  }

  // ── TSC AI Help ────────────────────────────────────────────────────────────
  const requestAiHelpTSC = async () => {
    setAiLoading(true)
    setAiError('')

    try {
      const subj = subjects.find(s => String(s.subject_id) === String(selectedTopic?.topic_subject_id))
      const subjName = subj?.subject_name || 'Unknown Subject'
      const kelasName = kelasNameMap.get(parseInt(selectedTopic?.topic_kelas_id)) || 'Unknown Class'
      const unitTitle = selectedTopic?.topic_nama || 'Unit Title'
      const assessmentName = wizardAssessment.assessment_nama || 'Assessment'
      const taskDescription = wizardAssessment.assessment_task_specific_description || ''
      const instructions = wizardAssessment.assessment_instructions || ''
      const conceptualUnderstanding = wizardAssessment.assessment_conceptual_understanding || ''
      const mypYear = selectedTopic?.topic_year || 1

      const tscStructure = []

      for (const criterionId of wizardAssessment.selected_criteria) {
        const criterion = wizardCriteria.find(c => c.criterion_id === criterionId)
        if (!criterion) continue

        const criterionStrands = wizardStrands.filter(s => s.criterion_id === criterionId)
        const bandLevels = ['7-8', '5-6', '3-4', '1-2']

        for (const bandLabel of bandLevels) {
          for (const strand of criterionStrands) {
            const rubric = wizardRubrics.find(r =>
              r.strand_id === strand.strand_id && r.band_label === bandLabel
            )
            if (rubric) {
              tscStructure.push({
                criterionCode: criterion.code,
                criterionName: criterion.name,
                criterionId,
                bandLabel,
                strandLabel: strand.label,
                strandContent: strand.content,
                subjectCriteria: rubric.description,
                tscKey: `${criterionId}_${bandLabel}_${strand.label}`
              })
            }
          }
        }
      }

      const prompt = `You are an IB MYP assessment expert. Generate Task-Specific Clarifications (TSC) for a summative assessment.

CONTEXT:
- Subject: ${subjName}
- Grade: ${kelasName}
- MYP Year: ${mypYear}
- Unit: ${unitTitle}
- Assessment Name: ${assessmentName}
- Task Description: ${taskDescription}
- Conceptual Understanding: ${conceptualUnderstanding}
- Instructions: ${instructions}

WHAT IS TSC:
Task-Specific Clarification (TSC) adapts the general subject criteria to THIS SPECIFIC assessment task. 

IMPORTANT RULES:
1. DO NOT change or rewrite the core strand criteria
2. ONLY add specific details about HOW students demonstrate it in THIS assessment
3. Keep the original action verbs and key concepts from the strand criteria
4. Add task-specific elements (quantities, formats, requirements) that clarify expectations

CRITERIA STRUCTURE:
${tscStructure.map((item, idx) => `
${idx + 1}. Criterion ${item.criterionCode} - Band ${item.bandLabel} - Strand ${item.strandLabel}
   Original Strand Criteria: "${item.subjectCriteria}"
   TSC Key: ${item.tscKey}
`).join('')}

INSTRUCTIONS:
For each strand criteria above, create a TSC that:
1. KEEPS the core criteria wording (action verbs and key concepts)
2. ADDS specific details about this assessment (e.g., "in your presentation", "using 3-5 sources", "in a 300-word essay")
3. CLARIFIES quantities, formats, or methods specific to THIS task
4. MAINTAINS the achievement level implied by the band (7-8=excellent depth, 5-6=good depth, 3-4=basic, 1-2=limited)

RESPONSE FORMAT (JSON):
{
  "tsc": {
    "criterionId_bandLabel_strandLabel": "TSC text that keeps original criteria + adds task specifics",
    ...
  }
}

Generate TSC for all ${tscStructure.length} items. Keep original strand wording, only add task-specific clarifications. Respond ONLY with valid JSON.`

      console.log('🤖 AI TSC Prompt:', prompt)

      const body = { prompt, context: 'Generate TSC for IB MYP assessment' }
      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData?.error || 'Failed to get AI response')
      }

      const data = await response.json()
      const aiText = data?.text || ''

      let parsed
      try {
        parsed = JSON.parse(aiText)
      } catch (jsonErr) {
        const jsonMatch = aiText.match(/```json\s*([\s\S]*?)\s*```/) || aiText.match(/```\s*([\s\S]*?)\s*```/)
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[1])
        } else {
          const objMatch = aiText.match(/\{[\s\S]*"tsc"[\s\S]*\}/)
          if (objMatch) {
            parsed = JSON.parse(objMatch[0])
          } else {
            throw new Error('Invalid JSON response from AI')
          }
        }
      }

      if (parsed && parsed.tsc) {
        setWizardAssessment(prev => ({
          ...prev,
          assessment_tsc: { ...prev.assessment_tsc, ...parsed.tsc }
        }))
        alert('✅ AI successfully generated all TSC clarifications!')
      } else {
        throw new Error('Invalid TSC structure in response')
      }
    } catch (e) {
      console.error('❌ AI TSC Help error:', e)
      setAiError(e.message)
      alert('Failed to generate TSC: ' + e.message)
    } finally {
      setAiLoading(false)
    }
  }

  // ── Insert single suggestion ───────────────────────────────────────────────
  const insertAiSuggestion = (txtOrItem) => {
    if (!txtOrItem) return

    if (aiHelpType === 'assessmentName' && typeof txtOrItem === 'object') {
      const item = txtOrItem
      const cleanOption = (item.option || '').replace(/\*\*/g, '').trim()
      const cleanConceptual = (item.conceptual_understanding || '').replace(/\*\*/g, '').trim()
      const cleanTaskDesc = (item.task_description || '').replace(/\*\*/g, '').trim()
      const cleanInstructions = (item.instructions || '').replace(/\*\*/g, '').trim()

      setWizardAssessment(prev => ({
        ...prev,
        assessment_nama: cleanOption,
        assessment_conceptual_understanding: cleanConceptual,
        assessment_task_specific_description: cleanTaskDesc,
        assessment_instructions: cleanInstructions
      }))
      setAiResultModalOpen(false)
      return
    }

    const txt = typeof txtOrItem === 'string' ? txtOrItem : (txtOrItem?.option || txtOrItem?.text || '')
    const firstLine = String(txt).split(/\r?\n/)[0].replace(/\*\*/g, '').trim()

    if (aiHelpType === 'inquiryQuestion') {
      setSelectedTopic(prev => ({ ...prev, topic_inquiry_question: firstLine }))
    } else if (aiHelpType === 'assessmentRelationship') {
      setWizardAssessment(prev => ({ ...prev, assessment_relationship: txt }))
    } else {
      setSelectedTopic(prev => ({ ...prev, topic_nama: firstLine }))
    }

    setAiResultModalOpen(false)
  }

  // ── Apply functions ────────────────────────────────────────────────────────
  const applySelectedStatements = () => {
    setAiError('')
    if (selectedStatements.length === 0) {
      setAiError('⚠️ Please select one statement of inquiry.')
      return
    }
    const selectedItems = aiItems.filter(item => selectedStatements.includes(item.index))
    const statementText = selectedItems[0].option.replace(/\*\*/g, '')
    setSelectedTopic(prev => ({ ...prev, topic_statement: statementText }))
    setAiResultModalOpen(false)
    setSelectedStatements([])
    setAiError('')
  }

  const applySelectedGlobalContexts = () => {
    setAiError('')
    if (selectedGlobalContexts.length === 0) {
      setAiError('⚠️ Please select at least one global context.')
      return
    }
    const selectedItems = aiItems.filter(item => selectedGlobalContexts.includes(item.index))
    const contextNames = selectedItems.map(item => item.option).join(', ')
    setSelectedTopic(prev => ({ ...prev, topic_global_context: contextNames }))
    setAiResultModalOpen(false)
    setSelectedGlobalContexts([])
    setAiError('')
  }

  const applySelectedKeyConcepts = () => {
    setAiError('')
    if (selectedKeyConcepts.length === 0) {
      setAiError('⚠️ Please select at least one key concept.')
      return
    }
    const selectedItems = aiItems.filter(item => selectedKeyConcepts.includes(item.index))
    const conceptNames = selectedItems.map(item => item.option).join(', ')
    setSelectedTopic(prev => ({ ...prev, topic_key_concept: conceptNames }))
    setAiResultModalOpen(false)
    setSelectedKeyConcepts([])
    setAiError('')
  }

  const applySelectedRelatedConcepts = () => {
    setAiError('')
    if (selectedRelatedConcepts.length === 0) {
      setAiError('⚠️ Please select at least one related concept.')
      return
    }
    const selectedItems = aiItems.filter(item => selectedRelatedConcepts.includes(item.index))
    const conceptNames = selectedItems.map(item => item.option).join(', ')
    setSelectedTopic(prev => ({ ...prev, topic_related_concept: conceptNames }))
    setAiResultModalOpen(false)
    setSelectedRelatedConcepts([])
    setAiError('')
  }

  const applySelectedLearnerProfiles = () => {
    setAiError('')
    if (selectedLearnerProfiles.length === 0) {
      setAiError('⚠️ Please select at least one learner profile attribute.')
      return
    }
    const normalizeLearnerProfile = (name) => {
      const normalized = name.trim()
      const match = learnerProfiles.find(profile => profile.toLowerCase() === normalized.toLowerCase())
      return match || normalized
    }
    const selectedItems = aiItems.filter(item => selectedLearnerProfiles.includes(item.index))
    const profileNames = selectedItems.map(item => normalizeLearnerProfile(item.option)).join(', ')
    setSelectedTopic(prev => ({ ...prev, topic_learner_profile: profileNames }))
    setAiResultModalOpen(false)
    setSelectedLearnerProfiles([])
    setAiError('')
  }

  const applySelectedServiceLearning = () => {
    setAiError('')
    if (selectedServiceLearning.length === 0) {
      setAiError('⚠️ Please select one service learning option.')
      return
    }
    const selectedItems = aiItems.filter(item => selectedServiceLearning.includes(item.index))
    const serviceLearningText = selectedItems.map(item => item.option).join(', ')
    setSelectedTopic(prev => ({ ...prev, topic_service_learning: serviceLearningText }))
    setAiResultModalOpen(false)
    setSelectedServiceLearning([])
    setAiError('')
  }

  const applySelectedAtlSkills = () => {
    if (selectedAtlSkills.length === 0) {
      alert('Please select at least one ATL skill')
      return
    }
    const selectedItems = aiItems.filter(item => selectedAtlSkills.includes(Number(item.id)))
    const atlText = selectedItems.map(item => {
      const strandLine = `${item.strand} - ${item.cluster}\n`
      const descriptorLine = `${item.descriptor_text}`
      const summaryLine = item.summary_sentence ? `\n${item.summary_sentence}` : ''
      return strandLine + descriptorLine + summaryLine
    }).join('\n\n')

    setSelectedTopic(prev => ({ ...prev, topic_atl: atlText }))
    setAiResultModalOpen(false)
    setSelectedAtlSkills([])
    setAiError('')
  }

  const applySelectedResources = () => {
    setAiError('')
    if (selectedResources.length === 0) {
      setAiError('⚠️ Please select at least one resource.')
      return
    }
    const selectedItems = aiItems.filter(item => selectedResources.includes(item.index))
    const resourcesText = selectedItems.map(item => {
      const title = (item.option || '').replace(/\*\*/g, '')
      const link = (item.link || '').replace(/\*\*/g, '')
      return link ? `${title}\n${link}` : title
    }).join('\n\n')
    setSelectedTopic(prev => ({ ...prev, topic_resources: resourcesText }))
    setAiResultModalOpen(false)
    setSelectedResources([])
    setAiError('')
  }

  const applySelectedAssessmentRelationship = () => {
    setAiError('')
    if (selectedAssessmentRelationship.length === 0) {
      setAiError('⚠️ Please select one relationship explanation.')
      return
    }
    const selectedItem = aiItems.find(item => selectedAssessmentRelationship.includes(item.index))
    if (selectedItem) {
      setWizardAssessment(prev => ({ ...prev, assessment_relationship: selectedItem.option }))
    }
    setAiResultModalOpen(false)
    setSelectedAssessmentRelationship([])
    setAiError('')
  }

  const applySelectedInquiryQuestions = () => {
    setAiError('')
    if (selectedInquiryQuestions.length === 0) {
      setAiError('⚠️ Please select at least one question from each category before applying.')
      return
    }
    const selectedItems = aiItems.filter(item => selectedInquiryQuestions.includes(item.index))
    const hasFactual = selectedItems.some(item => item.category === 'Factual')
    const hasConceptual = selectedItems.some(item => item.category === 'Conceptual')
    const hasDebatable = selectedItems.some(item => item.category === 'Debatable')

    if (!hasFactual || !hasConceptual || !hasDebatable) {
      const missing = []
      if (!hasFactual) missing.push('Factual')
      if (!hasConceptual) missing.push('Conceptual')
      if (!hasDebatable) missing.push('Debatable')
      setAiError(`⚠️ Please select at least one question from: ${missing.join(', ')}`)
      return
    }

    const factualQuestions = selectedItems.filter(item => item.category === 'Factual').map(item => item.option).join('\n')
    const conceptualQuestions = selectedItems.filter(item => item.category === 'Conceptual').map(item => item.option).join('\n')
    const debatableQuestions = selectedItems.filter(item => item.category === 'Debatable').map(item => item.option).join('\n')
    const combinedText = `FACTUAL:\n${factualQuestions}\n\nCONCEPTUAL:\n${conceptualQuestions}\n\nDEBATABLE:\n${debatableQuestions}`

    setSelectedTopic(prev => ({ ...prev, topic_inquiry_question: combinedText }))
    setAiResultModalOpen(false)
    setSelectedInquiryQuestions([])
    setAiError('')
  }

  // ── Return ─────────────────────────────────────────────────────────────────
  return {
    // state
    aiInputModalOpen, setAiInputModalOpen,
    aiResultModalOpen, setAiResultModalOpen,
    aiUserInput, setAiUserInput,
    aiLoading,
    aiError, setAiError,
    aiItems,
    aiLang,
    aiHelpType, setAiHelpType,
    selectedInquiryQuestions,
    selectedKeyConcepts, setSelectedKeyConcepts,
    selectedRelatedConcepts, setSelectedRelatedConcepts,
    selectedGlobalContexts, setSelectedGlobalContexts,
    selectedStatements, setSelectedStatements,
    selectedLearnerProfiles, setSelectedLearnerProfiles,
    selectedServiceLearning, setSelectedServiceLearning,
    selectedResources, setSelectedResources,
    selectedAtlSkills, setSelectedAtlSkills,
    selectedAssessmentRelationship,
    // functions
    resetAiState,
    openAiInputModal,
    requestAiHelp,
    requestAiHelpAtl,
    requestAiHelpTSC,
    insertAiSuggestion,
    toggleInquiryQuestion,
    toggleKeyConcept,
    toggleRelatedConcept,
    toggleGlobalContext,
    toggleStatement,
    toggleLearnerProfile,
    toggleServiceLearning,
    toggleResources,
    applySelectedStatements,
    applySelectedGlobalContexts,
    applySelectedKeyConcepts,
    applySelectedRelatedConcepts,
    applySelectedLearnerProfiles,
    applySelectedServiceLearning,
    applySelectedAtlSkills,
    applySelectedResources,
    applySelectedAssessmentRelationship,
    applySelectedInquiryQuestions,
  }
}
