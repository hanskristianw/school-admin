'use client'

import { useState, useEffect, useRef } from 'react'
import { flushSync } from 'react-dom'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSpinner, faPlus, faTimes, faClipboardList, faBook, faInfoCircle, faPaperPlane, faTrash, faPrint, faFileAlt, faFileWord, faSave, faLightbulb, faCalendar } from '@fortawesome/free-solid-svg-icons'
import SlideOver from '@/components/ui/slide-over'
import Modal from '@/components/ui/modal'
import { useI18n } from '@/lib/i18n'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

export default function TopicNewPage() {
  const router = useRouter()
  const { t, lang } = useI18n()
  const aiScrollRef = useRef(null)
  const [activeTab, setActiveTab] = useState('planning')
  const [activeSubMenu, setActiveSubMenu] = useState('overview')
  
  // Data state
  const [topics, setTopics] = useState([])
  const [subjects, setSubjects] = useState([])
  const [allKelas, setAllKelas] = useState([]) // All available kelas for dropdown
  const [kelasLoading, setKelasLoading] = useState(false) // Loading state for kelas
  const [kelasNameMap, setKelasNameMap] = useState(new Map())
  const [loading, setLoading] = useState(true)
  
  // Filters
  const [filters, setFilters] = useState({ subject: '', kelas: '', search: '' })
  
  // Assessment state
  const [assessments, setAssessments] = useState([])
  const [loadingAssessments, setLoadingAssessments] = useState(false)
  const [assessmentFilters, setAssessmentFilters] = useState({ subject: '', kelas: '', status: '', search: '', noCriteria: false })
  const [assessmentKelasOptions, setAssessmentKelasOptions] = useState([]) // Kelas yang diajar guru untuk assessment filter
  
  // FAB (Floating Action Button) state
  const [fabOpen, setFabOpen] = useState(false)
  
  // Assessment Form state
  const [showAssessmentForm, setShowAssessmentForm] = useState(false)
  const [editingAssessment, setEditingAssessment] = useState(null) // For edit mode
  const [detailKelasOptions, setDetailKelasOptions] = useState([])
  const [assessmentFormData, setAssessmentFormData] = useState({
    assessment_nama: '',
    assessment_tanggal: '',
    assessment_keterangan: '',
    assessment_detail_kelas_id: '',
    assessment_topic_id: '',
    assessment_semester: '',
    selected_criteria: [] // Array of criterion IDs
  })
  const [assessmentFormErrors, setAssessmentFormErrors] = useState({})
  const [submittingAssessment, setSubmittingAssessment] = useState(false)
  const [topicsForAssessment, setTopicsForAssessment] = useState([])
  const [topicsLoadingAssessment, setTopicsLoadingAssessment] = useState(false)
  const [criteriaForAssessment, setCriteriaForAssessment] = useState([])
  const [currentUserId, setCurrentUserId] = useState(null)
  
  // Modal state
  const [selectedTopic, setSelectedTopic] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingField, setEditingField] = useState(null)
  const [editValue, setEditValue] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveNotification, setSaveNotification] = useState(false)
  const [isAddMode, setIsAddMode] = useState(false)
  
  // Topic Assessment state (for edit mode)
  const [topicAssessment, setTopicAssessment] = useState(null)
  const [topicAssessmentCriteria, setTopicAssessmentCriteria] = useState([])
  const [editingAssessmentInTopic, setEditingAssessmentInTopic] = useState(false)
  const [savingTopicAssessment, setSavingTopicAssessment] = useState(false)
  
  // IB Global Contexts
  const globalContexts = [
    'Identities and relationships',
    'Orientation in space and time',
    'Personal and cultural expression',
    'Scientific and technical innovation',
    'Globalization and sustainability',
    'Fairness and development'
  ]
  
  // IB MYP Key Concepts (16 concepts)
  const keyConcepts = [
    'Aesthetics',
    'Change',
    'Communication',
    'Communities',
    'Connections',
    'Creativity',
    'Culture',
    'Development',
    'Form',
    'Global interactions',
    'Identity',
    'Logic',
    'Perspective',
    'Relationships',
    'Systems',
    'Time, place and space'
  ]
  
  // IB Learner Profile (10 attributes)
  const learnerProfiles = [
    'Inquirers',
    'Knowledgeable',
    'Thinkers',
    'Communicators',
    'Principled',
    'Open-Minded',
    'Caring',
    'Risk-takers',
    'Balanced',
    'Reflective'
  ]
  
  const [selectedContexts, setSelectedContexts] = useState([])
  
  // AI Help state for Unit Title and Inquiry Question
  const [aiInputModalOpen, setAiInputModalOpen] = useState(false)
  const [aiResultModalOpen, setAiResultModalOpen] = useState(false)
  const [aiUserInput, setAiUserInput] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState('')
  const [aiItems, setAiItems] = useState([])
  const [aiLang, setAiLang] = useState('')
  const [aiHelpType, setAiHelpType] = useState('') // 'unitTitle', 'inquiryQuestion', 'keyConcept', 'relatedConcept', 'globalContext', 'statement', 'learnerProfile', 'serviceLearning', 'resources', or 'assessmentRelationship'
  const [selectedInquiryQuestions, setSelectedInquiryQuestions] = useState([]) // For multi-select inquiry questions
  const [selectedKeyConcepts, setSelectedKeyConcepts] = useState([]) // For multi-select key concepts
  const [selectedRelatedConcepts, setSelectedRelatedConcepts] = useState([]) // For multi-select related concepts
  const [selectedGlobalContexts, setSelectedGlobalContexts] = useState([]) // For multi-select global contexts
  const [selectedStatements, setSelectedStatements] = useState([]) // For multi-select statements of inquiry
  const [selectedLearnerProfiles, setSelectedLearnerProfiles] = useState([]) // For multi-select learner profiles
  const [selectedServiceLearning, setSelectedServiceLearning] = useState([]) // For multi-select service learning
  const [selectedResources, setSelectedResources] = useState([]) // For multi-select resources
  const [selectedAtlSkills, setSelectedAtlSkills] = useState([]) // For multi-select ATL skills
  
  // Weekly Plan state
  const [selectedTopicForWeekly, setSelectedTopicForWeekly] = useState(null)
  const [weeklyPlans, setWeeklyPlans] = useState([]) // Array of { id, week_number, week_objectives, week_activities, week_resources }
  const [loadingWeeklyPlans, setLoadingWeeklyPlans] = useState(false)
  const [savingWeeklyPlans, setSavingWeeklyPlans] = useState(false)
  const [weeklyPlanNotification, setWeeklyPlanNotification] = useState({ show: false, message: '', type: 'success' })
  const [weeklyAiModalOpen, setWeeklyAiModalOpen] = useState(false)
  const [weeklyAiInput, setWeeklyAiInput] = useState({ assessmentDuration: '', specialRequests: '' })
  const [weeklyAiLoading, setWeeklyAiLoading] = useState(false)
  const [weeklyAiResults, setWeeklyAiResults] = useState(null)
  
  // Grading Modal state
  const [gradingModalOpen, setGradingModalOpen] = useState(false)
  const [gradingAssessment, setGradingAssessment] = useState(null)
  const [gradingStudents, setGradingStudents] = useState([])
  const [gradingData, setGradingData] = useState({}) // { [detail_siswa_id]: { grade_id, criterion_grades: { A: 0-8, B: 0-8, C: 0-8, D: 0-8 }, final_grade, comments } }
  const [expandedStudents, setExpandedStudents] = useState(new Set())
  const [loadingGrading, setLoadingGrading] = useState(false)
  const [savingGrades, setSavingGrades] = useState(false)
  
  // Report state
  const [reportFilters, setReportFilters] = useState({
    year: '',
    semester: '',
    kelas: '',
    student: ''
  })
  const [reportYears, setReportYears] = useState([])
  const [reportKelasOptions, setReportKelasOptions] = useState([])
  const [reportStudents, setReportStudents] = useState([])
  const [loadingReport, setLoadingReport] = useState(false)
  const [loadingReportStudents, setLoadingReportStudents] = useState(false)
  
  // Class Recap state (for assessment tab)
  const [recapSemesterFilter, setRecapSemesterFilter] = useState('')
  const [loadingClassRecap, setLoadingClassRecap] = useState(false)
  
  // Wizard/Stepper state for Add Mode
  const [currentStep, setCurrentStep] = useState(0)
  
  // Assessment data for wizard step 6
  const [wizardAssessment, setWizardAssessment] = useState({
    assessment_nama: '',
    assessment_keterangan: '',
    assessment_semester: '',
    assessment_relationship: '',
    assessment_conceptual_understanding: '',
    assessment_task_specific_description: '',
    assessment_instructions: '',
    selected_criteria: [],
    assessment_tsc: {} // Task Specific Clarification: { "criterionId_bandLabel_strandLabel": "content" }
  })
  const [wizardCriteria, setWizardCriteria] = useState([]) // Criteria options loaded when subject is selected
  const [wizardStrands, setWizardStrands] = useState([]) // Strands for selected criteria and MYP year
  const [wizardRubrics, setWizardRubrics] = useState([]) // Rubrics for the strands
  const [loadingStrands, setLoadingStrands] = useState(false)
  
  // IB Unit Planner Steps with guidance
  const plannerSteps = [
    {
      id: 'basic',
      title: 'Basic Information',
      description: 'Start by defining the unit title and duration',
      fields: ['topic_nama', 'topic_subject_id', 'topic_kelas_id', 'topic_urutan', 'topic_duration', 'topic_hours_per_week'],
      guidance: 'Select the subject and class for this unit. In IB MYP, unit titles are typically framed as engaging questions that provoke inquiry and exploration (e.g., "How does energy shape our world?"). Assign a unit number and specify the duration (weeks and hours per week).'
    },
    {
      id: 'inquiry',
      title: 'Inquiry Question',
      description: 'Define the central question that drives student inquiry',
      fields: ['topic_inquiry_question'],
      guidance: 'The inquiry question should be open-ended, thought-provoking, and aligned with the Statement of Inquiry. It guides student exploration throughout the unit.'
    },
    {
      id: 'concepts',
      title: 'Key & Related Concepts',
      description: 'Identify the conceptual understanding for this unit',
      fields: ['topic_key_concept', 'topic_related_concept', 'topic_global_context'],
      guidance: 'Key Concepts are 16 broad, transferable ideas in IB MYP (select 1-3). Related Concepts are subject-specific and vary by discipline (enter as comma-separated). Global Context connects learning to real-world issues that transcend subject boundaries.'
    },
    {
      id: 'statement',
      title: 'Statement of Inquiry',
      description: 'Create the statement that synthesizes concepts and context',
      fields: ['topic_statement'],
      guidance: 'The Statement of Inquiry integrates Key Concept + Related Concept + Global Context into a clear statement that guides the entire unit.'
    },
    {
      id: 'attributes',
      title: 'Learner Profile & Service',
      description: 'Define IB learner attributes and service learning opportunities',
      fields: ['topic_learner_profile', 'topic_service_learning'],
      guidance: 'Select IB Learner Profile attributes (e.g., Inquirers, Thinkers, Communicators) students will develop. Identify opportunities for service learning and action.'
    },
    {
      id: 'assessment',
      title: 'Assessment',
      description: 'Define the assessment task for this unit',
      fields: ['assessment_nama', 'assessment_semester', 'selected_criteria'],
      guidance: 'Create an assessment task that allows students to demonstrate their understanding of the unit. Select the criteria that will be assessed. Assessment date can be set later.'
    },
    {
      id: 'relationship',
      title: 'Assessment Relationship',
      description: 'Explain the connection between assessment and inquiry',
      fields: ['assessment_relationship'],
      guidance: 'Describe how the summative assessment relates to and measures the Statement of Inquiry. This connection ensures that the assessment is aligned with the conceptual understanding of the unit.'
    },
    {
      id: 'tsc',
      title: 'Task Specific Clarification',
      description: 'Define what students should demonstrate at each level',
      fields: ['assessment_tsc'],
      guidance: 'Task Specific Clarification (TSC) helps students understand what is expected at each achievement level (7-8, 5-6, 3-4, 1-2, 0) for this specific assessment task. Fill in the clarifications for each strand to customize the rubric.'
    },
    {
      id: 'reflection',
      title: 'Unit Reflection',
      description: 'Prior and After teaching reflections',
      fields: ['topic_reflection_prior', 'topic_reflection_after'],
      guidance: 'Prior Reflection: Before you begin teaching, reflect on your expectations, potential challenges, and how you will engage students. After Reflection: After completing the unit, reflect on what worked well, what could be improved, and student outcomes.'
    }
  ]
  
  // Get current user ID
  useEffect(() => {
    const userData = localStorage.getItem('user_data')
    const kr_id = localStorage.getItem('kr_id')
    console.log('🔍 User data from localStorage:', userData)
    
    // Set current user ID for assessment form
    if (kr_id) {
      setCurrentUserId(parseInt(kr_id))
    }
    
    if (userData) {
      try {
        const parsed = JSON.parse(userData)
        console.log('📋 Parsed user data:', parsed)
        // Try multiple possible keys for user ID
        const userId = parsed.userID || parsed.user_id || parsed.userId || parsed.id
        console.log('👤 User ID:', userId)
        if (userId) {
          fetchSubjects(userId)
          fetchDetailKelasForAssessment(userId)
          fetchAllKelas() // Fetch all kelas for filter dropdown
        } else {
          console.warn('⚠️ No user ID found')
          setLoading(false)
        }
      } catch (e) {
        console.error('❌ Error parsing user data:', e)
        setLoading(false)
      }
    } else {
      console.warn('⚠️ No user data in localStorage')
      setLoading(false)
    }
  }, [])

  // Fetch all kelas for filter dropdown
  const fetchAllKelas = async () => {
    try {
      const { data, error } = await supabase
        .from('kelas')
        .select('kelas_id, kelas_nama')
        .order('kelas_nama')
      
      if (error) throw error
      setAllKelas(data || [])
      console.log('📚 All kelas loaded for filter:', data)
    } catch (err) {
      console.error('❌ Error fetching all kelas:', err)
    }
  }

  // Fetch kelas for selected subject via detail_kelas mapping
  const fetchKelasForSubject = async (subjectId) => {
    if (!subjectId) {
      setAllKelas([])
      return
    }
    try {
      setKelasLoading(true)
      console.log('🔍 Fetching kelas for subject:', subjectId)
      
      // Find kelas via detail_kelas mapping
      const { data: dk, error: dkErr } = await supabase
        .from('detail_kelas')
        .select('detail_kelas_kelas_id')
        .eq('detail_kelas_subject_id', subjectId)
      
      if (dkErr) throw dkErr
      
      const kelasIds = Array.from(new Set((dk || []).map(d => d.detail_kelas_kelas_id).filter(Boolean)))
      
      let kelasList = []
      if (kelasIds.length > 0) {
        const { data: kData, error: kErr } = await supabase
          .from('kelas')
          .select('kelas_id, kelas_nama')
          .in('kelas_id', kelasIds)
          .order('kelas_nama')
        
        if (kErr) throw kErr
        kelasList = kData || []
      }
      
      console.log('📚 Kelas loaded:', kelasList)
      setAllKelas(kelasList)
      
      // Also fetch criteria for this subject (for wizard step 6)
      fetchCriteriaForSubject(subjectId)
    } catch (err) {
      console.error('❌ Error fetching kelas:', err)
      setAllKelas([])
    } finally {
      setKelasLoading(false)
    }
  }
  
  // Fetch criteria for a subject (used in wizard step 6)
  const fetchCriteriaForSubject = async (subjectId) => {
    if (!subjectId) {
      setWizardCriteria([])
      return
    }
    try {
      const { data, error } = await supabase
        .from('criteria')
        .select('criterion_id, code, name')
        .eq('subject_id', subjectId)
        .order('code')
      
      if (error) throw error
      setWizardCriteria(data || [])
    } catch (err) {
      console.error('❌ Error fetching criteria:', err)
      setWizardCriteria([])
    }
  }

  // Fetch strands and rubrics for selected criteria (used in TSC step)
  const fetchStrandsForCriteria = async (criteriaIds, mypYear) => {
    if (!criteriaIds || criteriaIds.length === 0 || !mypYear) {
      setWizardStrands([])
      setWizardRubrics([])
      return
    }
    
    setLoadingStrands(true)
    try {
      // Fetch strands for selected criteria and year level
      const { data: strandsData, error: strandsError } = await supabase
        .from('strands')
        .select('strand_id, criterion_id, year_level, label, content')
        .in('criterion_id', criteriaIds)
        .eq('year_level', mypYear)
        .order('label')
      
      if (strandsError) throw strandsError
      
      setWizardStrands(strandsData || [])
      
      // Fetch rubrics for these strands
      if (strandsData && strandsData.length > 0) {
        const strandIds = strandsData.map(s => s.strand_id)
        const { data: rubricsData, error: rubricsError } = await supabase
          .from('rubrics')
          .select('rubric_id, strand_id, band_label, description, min_score, max_score')
          .in('strand_id', strandIds)
          .order('max_score', { ascending: false })
        
        if (rubricsError) throw rubricsError
        setWizardRubrics(rubricsData || [])
      } else {
        setWizardRubrics([])
      }
    } catch (err) {
      console.error('❌ Error fetching strands:', err)
      setWizardStrands([])
      setWizardRubrics([])
    } finally {
      setLoadingStrands(false)
    }
  }

  // Fetch subjects for current user
  const fetchSubjects = async (userId) => {
    try {
      console.log('🔍 Fetching subjects for user:', userId)
      const { data, error } = await supabase
        .from('subject')
        .select('subject_id, subject_name, subject_guide')
        .eq('subject_user_id', userId)
        .order('subject_name')
      
      console.log('📚 Subjects response:', { data, error })
      if (error) throw error
      setSubjects(data || [])
      
      // After getting subjects, fetch topics
      if (data && data.length > 0) {
        console.log('✅ Found subjects:', data.length)
        fetchTopics(data.map(s => s.subject_id))
      } else {
        console.warn('⚠️ No subjects found for user')
        setLoading(false)
      }
    } catch (err) {
      console.error('❌ Error fetching subjects:', err)
      setLoading(false)
    }
  }
  
  // Fetch topics for given subject IDs
  const fetchTopics = async (subjectIds) => {
    try {
      setLoading(true)
      console.log('🔍 Fetching topics for subjects:', subjectIds)
      
      // Fetch topics only for user's subjects
      const { data: topicsData, error: topicsError } = await supabase
        .from('topic')
        .select(`
          topic_id,
          topic_nama,
          topic_subject_id,
          topic_kelas_id,
          topic_year,
          topic_urutan,
          topic_duration,
          topic_hours_per_week,
          topic_planner,
          topic_inquiry_question,
          topic_global_context,
          topic_key_concept,
          topic_related_concept,
          topic_statement,
          topic_learner_profile,
          topic_service_learning,
          topic_atl,
          topic_learning_process,
          topic_formative_assessment,
          topic_summative_assessment,
          topic_relationship_summative_assessment_statement_of_inquiry,
          topic_reflection_prior,
          topic_reflection_after
        `)
        .in('topic_subject_id', subjectIds)
        .order('topic_nama')
      
      console.log('📖 Topics response:', { data: topicsData, error: topicsError })
      if (topicsError) throw topicsError
      
      // Fetch all kelas names
      const kelasIds = [...new Set(topicsData?.map(t => t.topic_kelas_id).filter(Boolean))]
      if (kelasIds.length > 0) {
        const { data: kelasData, error: kelasError } = await supabase
          .from('kelas')
          .select('kelas_id, kelas_nama')
          .in('kelas_id', kelasIds)
        
        if (!kelasError && kelasData) {
          const map = new Map()
          kelasData.forEach(k => map.set(k.kelas_id, k.kelas_nama))
          setKelasNameMap(map)
        }
      }
      
      console.log('✅ Setting topics:', topicsData?.length || 0)
      setTopics(topicsData || [])
    } catch (err) {
      console.error('❌ Error fetching topics:', err)
    } finally {
      setLoading(false)
    }
  }

  // Fetch assessments with related data (only for current user's subjects)
  const fetchAssessments = async () => {
    try {
      setLoadingAssessments(true)
      console.log('🔍 Fetching assessments')
      
      // Get subject IDs that belong to current user
      const userSubjectIds = subjects.map(s => s.subject_id)
      
      if (userSubjectIds.length === 0) {
        console.log('⚠️ No subjects found for user')
        setAssessments([])
        setLoadingAssessments(false)
        return
      }
      
      // First, get detail_kelas IDs and kelas_ids that belong to user's subjects
      const { data: detailKelasForUser, error: dkUserError } = await supabase
        .from('detail_kelas')
        .select('detail_kelas_id, detail_kelas_kelas_id')
        .in('detail_kelas_subject_id', userSubjectIds)
      
      if (dkUserError) throw dkUserError
      
      const userDetailKelasIds = (detailKelasForUser || []).map(dk => dk.detail_kelas_id)
      const userKelasIds = [...new Set((detailKelasForUser || []).map(dk => dk.detail_kelas_kelas_id).filter(Boolean))]
      
      // Fetch kelas names for filter dropdown
      if (userKelasIds.length > 0) {
        const { data: kelasData, error: kelasError } = await supabase
          .from('kelas')
          .select('kelas_id, kelas_nama')
          .in('kelas_id', userKelasIds)
          .order('kelas_nama')
        
        if (!kelasError && kelasData) {
          setAssessmentKelasOptions(kelasData)
        }
      }
      
      if (userDetailKelasIds.length === 0) {
        console.log('⚠️ No detail_kelas found for user subjects')
        setAssessments([])
        setLoadingAssessments(false)
        return
      }
      
      // Fetch assessments only for user's detail_kelas
      const { data: assessmentsData, error: assessmentsError } = await supabase
        .from('assessment')
        .select(`
          assessment_id,
          assessment_nama,
          assessment_tanggal,
          assessment_keterangan,
          assessment_status,
          assessment_user_id,
          assessment_detail_kelas_id,
          assessment_topic_id,
          assessment_semester
        `)
        .in('assessment_detail_kelas_id', userDetailKelasIds)
        .order('assessment_tanggal', { ascending: false })
      
      if (assessmentsError) throw assessmentsError
      
      // Get unique detail_kelas_ids
      const detailKelasIds = [...new Set(assessmentsData?.map(a => a.assessment_detail_kelas_id).filter(Boolean))]
      
      let detailKelasMap = new Map()
      let subjectMap = new Map()
      let kelasMap = new Map()
      
      if (detailKelasIds.length > 0) {
        // Fetch detail_kelas
        const { data: detailKelasData, error: dkError } = await supabase
          .from('detail_kelas')
          .select('detail_kelas_id, detail_kelas_subject_id, detail_kelas_kelas_id')
          .in('detail_kelas_id', detailKelasIds)
        
        if (!dkError && detailKelasData) {
          const subjectIds = [...new Set(detailKelasData.map(dk => dk.detail_kelas_subject_id))]
          const kelasIds = [...new Set(detailKelasData.map(dk => dk.detail_kelas_kelas_id))]
          
          // Fetch subjects
          if (subjectIds.length > 0) {
            const { data: subjectsData, error: sError } = await supabase
              .from('subject')
              .select('subject_id, subject_name')
              .in('subject_id', subjectIds)
            
            if (!sError && subjectsData) {
              subjectsData.forEach(s => subjectMap.set(s.subject_id, s.subject_name))
            }
          }
          
          // Fetch kelas
          if (kelasIds.length > 0) {
            const { data: kelasData, error: kError } = await supabase
              .from('kelas')
              .select('kelas_id, kelas_nama')
              .in('kelas_id', kelasIds)
            
            if (!kError && kelasData) {
              kelasData.forEach(k => kelasMap.set(k.kelas_id, k.kelas_nama))
            }
          }
          
          // Build detail_kelas map
          detailKelasData.forEach(dk => {
            detailKelasMap.set(dk.detail_kelas_id, {
              subject_id: dk.detail_kelas_subject_id,
              kelas_id: dk.detail_kelas_kelas_id
            })
          })
        }
      }
      
      // Get unique user IDs
      const userIds = [...new Set(assessmentsData?.map(a => a.assessment_user_id).filter(Boolean))]
      let userMap = new Map()
      
      if (userIds.length > 0) {
        const { data: usersData, error: uError } = await supabase
          .from('users')
          .select('user_id, user_nama_depan, user_nama_belakang')
          .in('user_id', userIds)
        
        if (!uError && usersData) {
          usersData.forEach(u => {
            userMap.set(u.user_id, `${u.user_nama_depan} ${u.user_nama_belakang}`)
          })
        }
      }
      
      // Get unique topic IDs
      const topicIds = [...new Set(assessmentsData?.map(a => a.assessment_topic_id).filter(Boolean))]
      let topicMap = new Map()
      
      if (topicIds.length > 0) {
        const { data: topicsData, error: tError } = await supabase
          .from('topic')
          .select('topic_id, topic_nama, topic_urutan')
          .in('topic_id', topicIds)
        
        if (!tError && topicsData) {
          topicsData.forEach(t => {
            topicMap.set(t.topic_id, { nama: t.topic_nama, urutan: t.topic_urutan })
          })
        }
      }
      
      // Fetch criteria for assessments from junction table
      const assessmentIds = assessmentsData?.map(a => a.assessment_id) || []
      let assessmentCriteriaMap = new Map() // assessment_id -> array of criteria
      
      if (assessmentIds.length > 0) {
        const { data: junctionData, error: jError } = await supabase
          .from('assessment_criteria')
          .select('assessment_id, criterion_id')
          .in('assessment_id', assessmentIds)
        
        if (!jError && junctionData) {
          // Group by assessment_id
          junctionData.forEach(j => {
            if (!assessmentCriteriaMap.has(j.assessment_id)) {
              assessmentCriteriaMap.set(j.assessment_id, [])
            }
            assessmentCriteriaMap.get(j.assessment_id).push(j.criterion_id)
          })
          
          // Fetch all unique criterion details
          const allCriterionIds = [...new Set(junctionData.map(j => j.criterion_id))]
          let criterionMap = new Map()
          
          if (allCriterionIds.length > 0) {
            const { data: criteriaData, error: cError } = await supabase
              .from('criteria')
              .select('criterion_id, code, name')
              .in('criterion_id', allCriterionIds)
            
            if (!cError && criteriaData) {
              criteriaData.forEach(c => {
                criterionMap.set(c.criterion_id, { code: c.code, name: c.name })
              })
            }
          }
          
          // Map criteria details to assessments
          assessmentCriteriaMap.forEach((criterionIds, assessmentId) => {
            const criteriaDetails = criterionIds.map(id => criterionMap.get(id)).filter(Boolean)
            assessmentCriteriaMap.set(assessmentId, criteriaDetails)
          })
        }
      }
      
      // Merge all data
      const enrichedAssessments = (assessmentsData || []).map(a => {
        const detailKelas = detailKelasMap.get(a.assessment_detail_kelas_id) || {}
        const criteria = assessmentCriteriaMap.get(a.assessment_id) || []
        const topicData = topicMap.get(a.assessment_topic_id) || {}
        return {
          ...a,
          subject_id: detailKelas.subject_id,
          subject_name: subjectMap.get(detailKelas.subject_id) || 'N/A',
          kelas_id: detailKelas.kelas_id,
          kelas_nama: kelasMap.get(detailKelas.kelas_id) || '',
          teacher_name: userMap.get(a.assessment_user_id) || 'Unknown',
          topic_nama: topicData.nama || null,
          topic_urutan: topicData.urutan || 999,
          criteria: criteria // Array of { code, name }
        }
      })
      
      console.log('✅ Enriched assessments:', enrichedAssessments.length)
      setAssessments(enrichedAssessments)
    } catch (err) {
      console.error('❌ Error fetching assessments:', err)
    } finally {
      setLoadingAssessments(false)
    }
  }
  
  // Fetch detail_kelas for assessment form
  const fetchDetailKelasForAssessment = async (userId) => {
    try {
      // Get subjects for user
      const { data: subjectsData, error: subjectsError } = await supabase
        .from('subject')
        .select('subject_id, subject_name')
        .eq('subject_user_id', userId)
        .order('subject_name')
      
      if (subjectsError) throw subjectsError
      if (!subjectsData || subjectsData.length === 0) {
        setDetailKelasOptions([])
        return
      }
      
      const subjectIds = subjectsData.map(s => s.subject_id)
      
      // Get detail_kelas
      const { data: details, error: detailErr } = await supabase
        .from('detail_kelas')
        .select('detail_kelas_id, detail_kelas_subject_id, detail_kelas_kelas_id')
        .in('detail_kelas_subject_id', subjectIds)
      
      if (detailErr) throw detailErr
      if (!details || details.length === 0) {
        setDetailKelasOptions([])
        return
      }
      
      const kelasIds = Array.from(new Set(details.map(d => d.detail_kelas_kelas_id)))
      
      // Get kelas names
      const { data: kelasData, error: kelasErr } = await supabase
        .from('kelas')
        .select('kelas_id, kelas_nama')
        .in('kelas_id', kelasIds)
      
      if (kelasErr) throw kelasErr
      
      const kelasMap = new Map((kelasData || []).map(k => [k.kelas_id, k.kelas_nama]))
      const subjectMap = new Map((subjectsData || []).map(s => [s.subject_id, s.subject_name]))
      
      const options = (details || []).map(d => ({
        detail_kelas_id: d.detail_kelas_id,
        subject_id: d.detail_kelas_subject_id,
        subject_name: subjectMap.get(d.detail_kelas_subject_id) || 'Unknown Subject',
        kelas_id: d.detail_kelas_kelas_id,
        kelas_nama: kelasMap.get(d.detail_kelas_kelas_id) || '-'
      }))
      
      options.sort((a, b) => (a.kelas_nama || '').localeCompare(b.kelas_nama || '') || (a.subject_name || '').localeCompare(b.subject_name || ''))
      
      setDetailKelasOptions(options)
    } catch (err) {
      console.error('Error fetching detail_kelas:', err)
    }
  }
  
  // Notify vice principal
  const notifyVicePrincipal = async (assessmentId) => {
    if (!assessmentId) {
      return
    }

    try {
      const response = await fetch('/api/notifications/assessment-submitted', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ assessmentId })
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        console.warn('Assessment notification failed', payload?.error || response.status)
      }
    } catch (err) {
      console.warn('Assessment notification error', err)
    }
  }
  
  // Load topics for assessment form
  const loadTopicsForAssessmentForm = async (subjectId, kelasId) => {
    try {
      setTopicsLoadingAssessment(true)
      const { data, error } = await supabase
        .from('topic')
        .select('topic_id, topic_nama')
        .eq('topic_subject_id', subjectId)
        .eq('topic_kelas_id', kelasId)
        .order('topic_nama')
      
      if (error) throw error
      setTopicsForAssessment(data || [])
    } catch (e) {
      console.error('Failed loading topics:', e)
      setTopicsForAssessment([])
    } finally {
      setTopicsLoadingAssessment(false)
    }
  }
  
  // Load criteria for assessment form based on subject
  const loadCriteriaForAssessmentForm = async (subjectId) => {
    try {
      const { data, error } = await supabase
        .from('criteria')
        .select('criterion_id, code, name')
        .eq('subject_id', subjectId)
        .order('code')
      
      if (error) throw error
      setCriteriaForAssessment(data || [])
    } catch (e) {
      console.error('Failed loading criteria:', e)
      setCriteriaForAssessment([])
    }
  }
  
  // Weekly Plan Functions
  const fetchWeeklyPlans = async (topicId) => {
    try {
      setLoadingWeeklyPlans(true)
      const { data, error } = await supabase
        .from('topic_weekly_plan')
        .select('*')
        .eq('topic_id', topicId)
        .order('week_number')
      
      if (error) throw error
      setWeeklyPlans(data || [])
    } catch (err) {
      console.error('Error fetching weekly plans:', err)
      setWeeklyPlans([])
    } finally {
      setLoadingWeeklyPlans(false)
    }
  }
  
  const handleWeeklyPlanChange = (weekNumber, field, value) => {
    setWeeklyPlans(prev => 
      prev.map(plan => 
        plan.week_number === weekNumber 
          ? { ...plan, [field]: value }
          : plan
      )
    )
  }
  
  const saveWeeklyPlans = async () => {
    if (!selectedTopicForWeekly) return
    
    try {
      setSavingWeeklyPlans(true)
      
      // Upsert all weekly plans
      const { error } = await supabase
        .from('topic_weekly_plan')
        .upsert(
          weeklyPlans.map(plan => ({
            id: plan.id || undefined,
            topic_id: selectedTopicForWeekly.topic_id,
            week_number: plan.week_number,
            week_objectives: plan.week_objectives || null,
            week_activities: plan.week_activities || null,
            week_resources: plan.week_resources || null,
            week_reflection: plan.week_reflection || null,
            updated_at: new Date().toISOString()
          })),
          { onConflict: 'topic_id,week_number' }
        )
      
      if (error) throw error
      
      setWeeklyPlanNotification({
        show: true,
        message: 'Weekly plans saved successfully!',
        type: 'success'
      })
      
      // Refresh data
      await fetchWeeklyPlans(selectedTopicForWeekly.topic_id)
      
      setTimeout(() => {
        setWeeklyPlanNotification({ show: false, message: '', type: 'success' })
      }, 3000)
    } catch (err) {
      console.error('Error saving weekly plans:', err)
      setWeeklyPlanNotification({
        show: true,
        message: 'Failed to save weekly plans',
        type: 'error'
      })
    } finally {
      setSavingWeeklyPlans(false)
    }
  }
  
  const deleteAllWeeklyPlans = async () => {
    if (!selectedTopicForWeekly) return
    
    const confirmed = confirm(
      `Are you sure you want to delete all weekly plans for "${selectedTopicForWeekly.topic_nama}"? This action cannot be undone.`
    )
    
    if (!confirmed) return
    
    try {
      setSavingWeeklyPlans(true)
      
      // Delete all weekly plans for this topic
      const { error } = await supabase
        .from('topic_weekly_plan')
        .delete()
        .eq('topic_id', selectedTopicForWeekly.topic_id)
      
      if (error) throw error
      
      setWeeklyPlanNotification({
        show: true,
        message: 'All weekly plans deleted successfully!',
        type: 'success'
      })
      
      // Clear local state
      setWeeklyPlans([])
      
      setTimeout(() => {
        setWeeklyPlanNotification({ show: false, message: '', type: 'success' })
      }, 3000)
    } catch (err) {
      console.error('Error deleting weekly plans:', err)
      setWeeklyPlanNotification({
        show: true,
        message: 'Failed to delete weekly plans',
        type: 'error'
      })
    } finally {
      setSavingWeeklyPlans(false)
    }
  }
  
  const handleTopicSelectionForWeekly = async (topicId) => {
    const topic = topics.find(t => t.topic_id === parseInt(topicId))
    setSelectedTopicForWeekly(topic)
    
    if (!topic) {
      setWeeklyPlans([])
      return
    }
    
    try {
      setLoadingWeeklyPlans(true)
      
      // Check if weekly plans exist for this topic
      const { data: existingPlans, error: fetchError } = await supabase
        .from('topic_weekly_plan')
        .select('*')
        .eq('topic_id', topic.topic_id)
        .order('week_number')
      
      if (fetchError) throw fetchError
      
      // If no plans exist and topic has duration, create them
      if ((!existingPlans || existingPlans.length === 0) && topic.topic_duration > 0) {
        console.log('No weekly plans found, generating for', topic.topic_duration, 'weeks')
        
        // Generate empty weekly plans based on topic_duration
        const newPlans = []
        for (let i = 1; i <= topic.topic_duration; i++) {
          newPlans.push({
            topic_id: topic.topic_id,
            week_number: i,
            week_objectives: null,
            week_activities: null,
            week_resources: null
          })
        }
        
        // Insert new plans
        const { data: insertedPlans, error: insertError } = await supabase
          .from('topic_weekly_plan')
          .insert(newPlans)
          .select()
        
        if (insertError) throw insertError
        
        setWeeklyPlans(insertedPlans || newPlans)
      } else {
        // Plans exist, load them
        setWeeklyPlans(existingPlans || [])
      }
    } catch (err) {
      console.error('Error handling weekly plan selection:', err)
      setWeeklyPlans([])
      setWeeklyPlanNotification({
        show: true,
        message: 'Failed to load weekly plans',
        type: 'error'
      })
    } finally {
      setLoadingWeeklyPlans(false)
    }
  }
  
  // Weekly Plan AI Help Functions
  const requestWeeklyPlanAiHelp = async () => {
    if (!selectedTopicForWeekly) {
      alert('Please select a topic first')
      return
    }
    
    if (!weeklyAiInput.assessmentDuration || parseInt(weeklyAiInput.assessmentDuration) < 1) {
      alert('Please specify how many weeks the assessment will take')
      return
    }
    
    try {
      setWeeklyAiLoading(true)
      
      // Build comprehensive context from all unit data
      const context = {
        // Step 0: Basic Info
        unitTitle: selectedTopicForWeekly.topic_nama,
        subject: subjects.find(s => s.subject_id === selectedTopicForWeekly.topic_subject_id)?.subject_name || 'N/A',
        grade: kelasNameMap.get(selectedTopicForWeekly.topic_kelas_id) || 'N/A',
        mypYear: selectedTopicForWeekly.topic_year,
        unitNumber: selectedTopicForWeekly.topic_urutan,
        duration: selectedTopicForWeekly.topic_duration,
        hoursPerWeek: selectedTopicForWeekly.topic_hours_per_week,
        
        // Step 1: Inquiry
        inquiryQuestion: selectedTopicForWeekly.topic_inquiry_question,
        
        // Step 2: Concepts
        keyConcept: selectedTopicForWeekly.topic_key_concept,
        relatedConcept: selectedTopicForWeekly.topic_related_concept,
        globalContext: selectedTopicForWeekly.topic_global_context,
        
        // Step 3: Statement
        statementOfInquiry: selectedTopicForWeekly.topic_statement,
        
        // Step 4: Attributes
        learnerProfile: selectedTopicForWeekly.topic_learner_profile,
        serviceLearning: selectedTopicForWeekly.topic_service_learning,
        atl: selectedTopicForWeekly.topic_atl,
        
        // Additional
        resources: selectedTopicForWeekly.topic_resources,
        learningProcess: selectedTopicForWeekly.topic_learning_process,
        formativeAssessment: selectedTopicForWeekly.topic_formative_assessment,
        
        // User inputs
        assessmentDuration: parseInt(weeklyAiInput.assessmentDuration),
        specialRequests: weeklyAiInput.specialRequests
      }
      
      // Build prompt
      const prompt = `You are an experienced IB MYP teacher planning a ${context.duration}-week unit.

UNIT CONTEXT:
- Title: ${context.unitTitle}
- Subject: ${context.subject}
- Grade: ${context.grade} (MYP Year ${context.mypYear})
- Duration: ${context.duration} weeks (${context.hoursPerWeek} hours per week)
- Unit Number: ${context.unitNumber}

INQUIRY & CONCEPTS:
- Inquiry Question: ${context.inquiryQuestion}
- Key Concept: ${context.keyConcept}
- Related Concept: ${context.relatedConcept}
- Global Context: ${context.globalContext}
- Statement of Inquiry: ${context.statementOfInquiry}

IB LEARNER PROFILE & ATL:
- Learner Profile: ${context.learnerProfile}
- ATL Skills: ${context.atl}
- Service Learning: ${context.serviceLearning}

ASSESSMENT:
- Summative assessment will take ${context.assessmentDuration} week(s) to complete

${context.specialRequests ? `SPECIAL REQUESTS:\n${context.specialRequests}\n` : ''}

Please create a detailed weekly plan for all ${context.duration} weeks. For each week, provide:
1. **week_objectives**: Clear learning objectives for that week (what students will learn/understand)
2. **week_activities**: Specific learning activities and teaching strategies (MAXIMUM 300 characters)
3. **week_resources**: Materials and resources needed

Important guidelines:
- Build progressively toward the summative assessment
- Integrate ATL skills throughout
- Connect to the Statement of Inquiry
- Make activities engaging and age-appropriate for MYP Year ${context.mypYear}
- Include formative assessment opportunities
- Reserve the last ${context.assessmentDuration} week(s) for summative assessment execution and completion
- **CRITICAL: Keep week_activities under 300 characters - be concise and direct**

Return ONLY a valid JSON array with ${context.duration} objects, each with this structure:
[
  {
    "week_number": 1,
    "week_objectives": "...",
    "week_activities": "...",
    "week_resources": "..."
  },
  ...
]

Do not include any markdown formatting, code blocks, or explanations. Return only the JSON array.`

      console.log('=== WEEKLY PLAN AI PROMPT ===')
      console.log(prompt)
      console.log('=== END PROMPT ===')
      
      // Call Gemini API
      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('API Error Response:', errorText)
        throw new Error(`Failed to get AI response (${response.status}): ${errorText}`)
      }
      
      const data = await response.json()
      console.log('=== AI RAW RESPONSE ===')
      console.log(data.text)
      console.log('=== END RESPONSE ===')
      
      if (!data.text) {
        throw new Error('AI response is empty')
      }
      
      // Parse JSON response
      let weeklyPlansFromAI
      try {
        // Remove markdown code blocks if present
        let cleanText = data.text.trim()
        if (cleanText.startsWith('```json')) {
          cleanText = cleanText.replace(/^```json\n/, '').replace(/\n```$/, '')
        } else if (cleanText.startsWith('```')) {
          cleanText = cleanText.replace(/^```\n/, '').replace(/\n```$/, '')
        }
        
        weeklyPlansFromAI = JSON.parse(cleanText)
        console.log('=== PARSED WEEKLY PLANS ===')
        console.log(weeklyPlansFromAI)
        console.log('=== END PARSED ===')
      } catch (parseError) {
        console.error('Failed to parse AI response:', parseError)
        throw new Error('AI returned invalid JSON format')
      }
      
      // Validate response
      if (!Array.isArray(weeklyPlansFromAI) || weeklyPlansFromAI.length === 0) {
        throw new Error('AI response is not a valid array')
      }
      
      setWeeklyAiResults(weeklyPlansFromAI)
      setWeeklyAiModalOpen(false)
      
    } catch (err) {
      console.error('Error getting AI help:', err)
      
      // Show more helpful error message
      let errorMessage = 'Failed to get AI suggestions: ' + err.message
      
      if (err.message.includes('502')) {
        errorMessage += '\n\nPossible causes:\n• Gemini API key not configured\n• Request timeout (prompt too long)\n• Gemini API temporarily unavailable'
      } else if (err.message.includes('invalid JSON')) {
        errorMessage += '\n\nAI returned an invalid response format. Please try again with different input.'
      }
      
      alert(errorMessage)
    } finally {
      setWeeklyAiLoading(false)
    }
  }
  
  const insertAiWeeklyPlans = () => {
    if (!weeklyAiResults || !selectedTopicForWeekly) return
    
    // Update weekly plans with AI suggestions
    const updatedPlans = weeklyPlans.map(plan => {
      const aiPlan = weeklyAiResults.find(ai => ai.week_number === plan.week_number)
      if (aiPlan) {
        return {
          ...plan,
          week_objectives: aiPlan.week_objectives || plan.week_objectives,
          week_activities: aiPlan.week_activities || plan.week_activities,
          week_resources: aiPlan.week_resources || plan.week_resources
        }
      }
      return plan
    })
    
    setWeeklyPlans(updatedPlans)
    setWeeklyAiResults(null)
    
    setWeeklyPlanNotification({
      show: true,
      message: 'AI suggestions inserted successfully!',
      type: 'success'
    })
    
    setTimeout(() => {
      setWeeklyPlanNotification({ show: false, message: '', type: 'success' })
    }, 3000)
  }
  
  // Helper functions for assessment form
  const getDaysDifference = (date1, date2) => {
    const diffTime = Math.abs(date2 - date1)
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }
  
  const getMinimumDate = () => {
    const minDate = new Date()
    minDate.setDate(minDate.getDate() + 2)
    return minDate
  }
  
  // Validate assessment form
  const validateAssessmentForm = () => {
    const errors = {}
    
    // Check if editing approved assessment (only criteria can be changed)
    const isEditingApproved = editingAssessment && editingAssessment.assessment_status === 1
    
    if (!isEditingApproved) {
      // Full validation for new or pending assessments
      if (!assessmentFormData.assessment_nama.trim()) {
        errors.assessment_nama = 'Assessment name is required'
      }
      
      if (!assessmentFormData.assessment_tanggal) {
        errors.assessment_tanggal = 'Assessment date is required'
      }
      
      if (!assessmentFormData.assessment_detail_kelas_id) {
        errors.assessment_detail_kelas_id = 'Subject/Class is required'
      }
      
      // Topic required
      if (assessmentFormData.assessment_detail_kelas_id && topicsForAssessment.length === 0) {
        errors.assessment_topic_id = 'No topics available for this subject/class'
      } else if (!assessmentFormData.assessment_topic_id) {
        errors.assessment_topic_id = 'Topic is required'
      }
      
      // Date validation
      if (assessmentFormData.assessment_tanggal) {
        const selectedDate = new Date(assessmentFormData.assessment_tanggal)
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        selectedDate.setHours(0, 0, 0, 0)
        
        if (selectedDate < today) {
          errors.assessment_tanggal = 'Date cannot be in the past'
        } else {
          const daysDiff = getDaysDifference(today, selectedDate)
          if (daysDiff === 1) {
            errors.assessment_tanggal = 'Date cannot be tomorrow. Minimum 2 days ahead.'
          }
        }
      }
    }
    
    // Criteria required (always, even for approved)
    if (!assessmentFormData.selected_criteria || assessmentFormData.selected_criteria.length === 0) {
      errors.selected_criteria = 'At least one criterion is required'
    }
    
    setAssessmentFormErrors(errors)
    return Object.keys(errors).length === 0
  }
  
  // Handle assessment form input change
  const handleAssessmentInputChange = (e) => {
    const { name, value } = e.target
    setAssessmentFormData(prev => ({
      ...prev,
      [name]: value
    }))
    
    // Clear error
    if (assessmentFormErrors[name]) {
      setAssessmentFormErrors(prev => ({
        ...prev,
        [name]: ''
      }))
    }
    
    // Load topics and criteria when subject changes
    if (name === 'assessment_detail_kelas_id') {
      const selectedDetail = detailKelasOptions.find(o => o.detail_kelas_id.toString() === value)
      const subjId = selectedDetail?.subject_id
      const kelasId = selectedDetail?.kelas_id
      setAssessmentFormData(prev => ({ ...prev, assessment_topic_id: '', selected_criteria: [] }))
      if (subjId && kelasId) {
        loadTopicsForAssessmentForm(subjId, kelasId)
        loadCriteriaForAssessmentForm(subjId)
      } else {
        setTopicsForAssessment([])
        setCriteriaForAssessment([])
      }
    }
  }
  
  // Toggle criterion selection (checkbox)
  const toggleCriterionSelection = (criterionId) => {
    setAssessmentFormData(prev => {
      const currentSelected = prev.selected_criteria || []
      const isSelected = currentSelected.includes(criterionId)
      
      return {
        ...prev,
        selected_criteria: isSelected
          ? currentSelected.filter(id => id !== criterionId)
          : [...currentSelected, criterionId]
      }
    })
    
    // Clear error when user selects
    if (assessmentFormErrors.selected_criteria) {
      setAssessmentFormErrors(prev => ({
        ...prev,
        selected_criteria: ''
      }))
    }
  }
  
  // Open edit assessment modal
  const handleEditAssessment = async (assessment) => {
    setEditingAssessment(assessment)
    
    // Fetch selected criteria from junction table
    const { data: junctionData } = await supabase
      .from('assessment_criteria')
      .select('criterion_id')
      .eq('assessment_id', assessment.assessment_id)
    
    const selectedCriteriaIds = (junctionData || []).map(j => j.criterion_id)
    
    setAssessmentFormData({
      assessment_nama: assessment.assessment_nama || '',
      assessment_tanggal: assessment.assessment_tanggal || '',
      assessment_keterangan: assessment.assessment_keterangan || '',
      assessment_detail_kelas_id: assessment.assessment_detail_kelas_id?.toString() || '',
      assessment_topic_id: assessment.assessment_topic_id?.toString() || '',
      assessment_semester: assessment.assessment_semester?.toString() || '',
      selected_criteria: selectedCriteriaIds
    })
    
    // Load topics and criteria for the selected subject/class
    const selectedDetail = detailKelasOptions.find(o => o.detail_kelas_id === assessment.assessment_detail_kelas_id)
    if (selectedDetail) {
      loadTopicsForAssessmentForm(selectedDetail.subject_id, selectedDetail.kelas_id)
      loadCriteriaForAssessmentForm(selectedDetail.subject_id)
    }
    
    setShowAssessmentForm(true)
  }

  // Delete assessment
  const handleDeleteAssessment = async (assessmentId, assessmentName) => {
    if (!confirm(`Are you sure you want to delete "${assessmentName}"?`)) {
      return
    }

    try {
      const { error } = await supabase
        .from('assessment')
        .delete()
        .eq('assessment_id', assessmentId)
      
      if (error) throw error
      
      // Refresh assessments
      await fetchAssessments()
      
      alert('Assessment deleted successfully!')
    } catch (err) {
      console.error('Error deleting assessment:', err)
      alert('Failed to delete assessment: ' + err.message)
    }
  }
  
  // Submit assessment
  const handleAssessmentSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateAssessmentForm()) {
      return
    }
    
    if (!currentUserId) {
      alert('User not authenticated')
      return
    }
    
    try {
      setSubmittingAssessment(true)
      
      // If editing, update the existing assessment
      if (editingAssessment) {
        const isApproved = editingAssessment.assessment_status === 1
        
        // For approved assessments, only update name and description (not date/class/topic/status)
        // For pending assessments, allow full update
        let assessmentData
        
        if (isApproved) {
          // Approved: only update name and description
          assessmentData = {
            assessment_nama: assessmentFormData.assessment_nama.trim(),
            assessment_keterangan: assessmentFormData.assessment_keterangan.trim() || null
          }
        } else {
          // Pending: full update with status recalculation
          const selectedDate = new Date(assessmentFormData.assessment_tanggal)
          selectedDate.setHours(0, 0, 0, 0)
          const today = new Date()
          today.setHours(0, 0, 0, 0)
          const diffDays = getDaysDifference(today, selectedDate)
          const computedStatus = diffDays >= 2 && diffDays <= 6 ? 3 : 0
          
          assessmentData = {
            assessment_nama: assessmentFormData.assessment_nama.trim(),
            assessment_tanggal: assessmentFormData.assessment_tanggal,
            assessment_keterangan: assessmentFormData.assessment_keterangan.trim() || null,
            assessment_status: computedStatus,
            assessment_detail_kelas_id: parseInt(assessmentFormData.assessment_detail_kelas_id),
            assessment_topic_id: parseInt(assessmentFormData.assessment_topic_id),
            assessment_semester: assessmentFormData.assessment_semester ? parseInt(assessmentFormData.assessment_semester) : null
          }
        }
        
        const { error } = await supabase
          .from('assessment')
          .update(assessmentData)
          .eq('assessment_id', editingAssessment.assessment_id)
        
        if (error) throw error
        
        // Update junction table: delete old entries and insert new ones
        const { error: deleteError } = await supabase
          .from('assessment_criteria')
          .delete()
          .eq('assessment_id', editingAssessment.assessment_id)
        
        if (deleteError) throw deleteError
        
        // Insert new criteria selections
        const junctionRecords = assessmentFormData.selected_criteria.map(criterionId => ({
          assessment_id: editingAssessment.assessment_id,
          criterion_id: criterionId
        }))
        
        if (junctionRecords.length > 0) {
          const { error: insertError } = await supabase
            .from('assessment_criteria')
            .insert(junctionRecords)
          
          if (insertError) throw insertError
        }
        
        // Refresh assessments
        await fetchAssessments()
        
        // Reset form and close modal
        setAssessmentFormData({
          assessment_nama: '',
          assessment_tanggal: '',
          assessment_keterangan: '',
          assessment_detail_kelas_id: '',
          assessment_topic_id: '',
          assessment_semester: '',
          selected_criteria: []
        })
        setAssessmentFormErrors({})
        setEditingAssessment(null)
        setShowAssessmentForm(false)
        setFabOpen(false)
        alert('Assessment updated successfully!')
      } else {
        // Check limit: max 2 assessments per detail_kelas per date
        const selectedDetailId = parseInt(assessmentFormData.assessment_detail_kelas_id)
        const selectedDateStr = assessmentFormData.assessment_tanggal
        const { count: existingCount, error: countErr } = await supabase
          .from('assessment')
          .select('assessment_id', { count: 'exact', head: true })
          .eq('assessment_detail_kelas_id', selectedDetailId)
          .eq('assessment_tanggal', selectedDateStr)
        
        if (countErr) throw countErr
        if ((existingCount || 0) >= 2) {
          alert('Maximum 2 assessments per class per day already reached. Please choose another date.')
          setSubmittingAssessment(false)
          return
        }
        
        // Determine status based on date difference: 2-6 days => waiting for principal approval (3)
        const selectedDate = new Date(assessmentFormData.assessment_tanggal)
        selectedDate.setHours(0, 0, 0, 0)
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const diffDays = getDaysDifference(today, selectedDate)
        const computedStatus = diffDays >= 2 && diffDays <= 6 ? 3 : 0
        
        const assessmentData = {
          assessment_nama: assessmentFormData.assessment_nama.trim(),
          assessment_tanggal: assessmentFormData.assessment_tanggal,
          assessment_keterangan: assessmentFormData.assessment_keterangan.trim() || null,
          assessment_status: computedStatus,
          assessment_user_id: currentUserId,
          assessment_detail_kelas_id: parseInt(assessmentFormData.assessment_detail_kelas_id),
          assessment_topic_id: parseInt(assessmentFormData.assessment_topic_id),
          assessment_semester: assessmentFormData.assessment_semester ? parseInt(assessmentFormData.assessment_semester) : null
        }
        
        const { data, error } = await supabase
          .from('assessment')
          .insert([assessmentData])
          .select()
        
        if (error) throw error
        
        // Insert into junction table for criteria
        const newAssessmentId = data[0].assessment_id
        const junctionRecords = assessmentFormData.selected_criteria.map(criterionId => ({
          assessment_id: newAssessmentId,
          criterion_id: criterionId
        }))
        
        if (junctionRecords.length > 0) {
          const { error: junctionError } = await supabase
            .from('assessment_criteria')
            .insert(junctionRecords)
          
          if (junctionError) throw junctionError
        }
        
        // Send notification to vice principal
        if (data && data[0]) {
          notifyVicePrincipal(data[0].assessment_id)
        }
        
        // Refresh assessments
        await fetchAssessments()
        
        // Reset form
        setAssessmentFormData({
          assessment_nama: '',
          assessment_tanggal: '',
          assessment_keterangan: '',
          assessment_detail_kelas_id: '',
          assessment_topic_id: '',
          assessment_semester: '',
          selected_criteria: []
        })
        setAssessmentFormErrors({})
        setEditingAssessment(null)
        setShowAssessmentForm(false)
        setFabOpen(false)
      
        alert('Assessment submitted successfully!')
      }
      
    } catch (err) {
      console.error('Error submitting assessment:', err)
      alert('Failed to submit assessment: ' + err.message)
    } finally {
      setSubmittingAssessment(false)
    }
  }
  
  // Fetch assessments when tab changes
  useEffect(() => {
    if (activeTab === 'assessment' && assessments.length === 0) {
      fetchAssessments()
    }
  }, [activeTab])
  
  // Fetch report data when tab changes to report
  useEffect(() => {
    if (activeTab === 'report') {
      if (reportYears.length === 0) {
        fetchReportYears()
      }
    }
  }, [activeTab])
  
  // Fetch years for report filter
  const fetchReportYears = async () => {
    try {
      const { data, error } = await supabase
        .from('year')
        .select('year_id, year_name')
        .order('year_name', { ascending: false })
      
      if (error) throw error
      setReportYears(data || [])
    } catch (err) {
      console.error('Error fetching years:', err)
    }
  }
  
  // Fetch kelas options for report (only kelas that the teacher teaches AND belongs to selected year)
  const fetchReportKelasOptions = async (yearId) => {
    if (!yearId) {
      setReportKelasOptions([])
      return
    }
    
    try {
      // Get user's subjects
      const userSubjectIds = subjects.map(s => s.subject_id)
      if (userSubjectIds.length === 0) {
        setReportKelasOptions([])
        return
      }
      
      // Get kelas from detail_kelas that teacher teaches
      const { data: detailKelasData, error: dkError } = await supabase
        .from('detail_kelas')
        .select('detail_kelas_kelas_id')
        .in('detail_kelas_subject_id', userSubjectIds)
      
      if (dkError) throw dkError
      
      const kelasIds = [...new Set((detailKelasData || []).map(dk => dk.detail_kelas_kelas_id).filter(Boolean))]
      
      if (kelasIds.length > 0) {
        // Filter by year_id
        const { data: kelasData, error: kelasError } = await supabase
          .from('kelas')
          .select('kelas_id, kelas_nama')
          .in('kelas_id', kelasIds)
          .eq('kelas_year_id', yearId)
          .order('kelas_nama')
        
        if (!kelasError && kelasData) {
          setReportKelasOptions(kelasData)
        }
      } else {
        setReportKelasOptions([])
      }
    } catch (err) {
      console.error('Error fetching report kelas:', err)
      setReportKelasOptions([])
    }
  }
  
  // Fetch students when kelas changes
  const fetchReportStudents = async (kelasId) => {
    if (!kelasId) {
      setReportStudents([])
      return
    }
    
    try {
      setLoadingReportStudents(true)
      
      // Fetch detail_siswa for the kelas
      const { data: detailSiswaData, error: dsError } = await supabase
        .from('detail_siswa')
        .select('detail_siswa_id, detail_siswa_user_id')
        .eq('detail_siswa_kelas_id', kelasId)
      
      if (dsError) throw dsError
      
      const userIds = [...new Set(detailSiswaData.map(ds => ds.detail_siswa_user_id))]
      
      if (userIds.length > 0) {
        const { data: usersData, error: usersError } = await supabase
          .from('users')
          .select('user_id, user_nama_depan, user_nama_belakang')
          .in('user_id', userIds)
        
        if (!usersError && usersData) {
          const userMap = new Map()
          usersData.forEach(u => {
            userMap.set(u.user_id, `${u.user_nama_depan} ${u.user_nama_belakang}`.trim())
          })
          
          const students = detailSiswaData.map(ds => ({
            detail_siswa_id: ds.detail_siswa_id,
            user_id: ds.detail_siswa_user_id,
            nama: userMap.get(ds.detail_siswa_user_id) || 'Unknown'
          })).sort((a, b) => a.nama.localeCompare(b.nama))
          
          setReportStudents(students)
        }
      } else {
        setReportStudents([])
      }
    } catch (err) {
      console.error('Error fetching students:', err)
      setReportStudents([])
    } finally {
      setLoadingReportStudents(false)
    }
  }
  
  // Handle report filter change
  const handleReportFilterChange = (field, value) => {
    setReportFilters(prev => {
      const newFilters = { ...prev, [field]: value }
      
      // Reset dependent fields based on what changed
      if (field === 'year') {
        newFilters.kelas = ''
        newFilters.student = ''
        setReportStudents([])
        if (value) {
          fetchReportKelasOptions(parseInt(value))
        } else {
          setReportKelasOptions([])
        }
      }
      
      if (field === 'kelas') {
        newFilters.student = ''
        fetchReportStudents(value)
      }
      
      return newFilters
    })
  }
  
  // Generate and download report as PDF
  const generateReport = async () => {
    if (!reportFilters.kelas || !reportFilters.student) {
      alert('Silakan pilih kelas dan siswa terlebih dahulu')
      return
    }
    
    try {
      setLoadingReport(true)
      
      const studentId = parseInt(reportFilters.student)
      const kelasId = parseInt(reportFilters.kelas)
      
      // Get student info
      const student = reportStudents.find(s => s.detail_siswa_id === studentId)
      const studentName = student?.nama || 'Unknown'
      const kelasName = reportKelasOptions.find(k => k.kelas_id === kelasId)?.kelas_nama || ''
      const yearName = reportYears.find(y => y.year_id === parseInt(reportFilters.year))?.year_name || ''
      const semesterName = reportFilters.semester === '1' ? 'Semester 1' : reportFilters.semester === '2' ? 'Semester 2' : ''
      
      // Get all detail_kelas for this kelas (to get all subjects taught in this class)
      const { data: detailKelasData, error: dkError } = await supabase
        .from('detail_kelas')
        .select(`
          detail_kelas_id,
          detail_kelas_subject_id,
          subject:detail_kelas_subject_id (
            subject_id,
            subject_name,
            subject_user_id
          )
        `)
        .eq('detail_kelas_kelas_id', kelasId)
      
      if (dkError) throw dkError
      
      const reportRows = []
      
      for (const dk of detailKelasData || []) {
        if (!dk.subject) continue
        
        // Get teacher name
        let teacherName = '-'
        if (dk.subject.subject_user_id) {
          const { data: teacherData } = await supabase
            .from('users')
            .select('user_nama_depan, user_nama_belakang')
            .eq('user_id', dk.subject.subject_user_id)
            .single()
          
          if (teacherData) {
            teacherName = `${teacherData.user_nama_depan} ${teacherData.user_nama_belakang}`.trim()
          }
        }
        
        // Get assessments for this detail_kelas
        const { data: assessmentsData, error: aError } = await supabase
          .from('assessment')
          .select('assessment_id')
          .eq('assessment_detail_kelas_id', dk.detail_kelas_id)
          .eq('assessment_status', 1) // Only approved
        
        if (aError) continue
        
        const assessmentIds = (assessmentsData || []).map(a => a.assessment_id)
        
        // Get grades for this student across all assessments for this subject
        let grades = { A: null, B: null, C: null, D: null }
        let comment = ''
        let semesterOverview = null
        
        if (assessmentIds.length > 0) {
          const { data: gradesData, error: gError } = await supabase
            .from('assessment_grades')
            .select('criterion_a_grade, criterion_b_grade, criterion_c_grade, criterion_d_grade, final_grade, comments')
            .eq('detail_siswa_id', studentId)
            .in('assessment_id', assessmentIds)
          
          if (!gError && gradesData && gradesData.length > 0) {
            // Aggregate grades (take highest for each criterion)
            const allA = gradesData.map(g => g.criterion_a_grade).filter(g => g !== null)
            const allB = gradesData.map(g => g.criterion_b_grade).filter(g => g !== null)
            const allC = gradesData.map(g => g.criterion_c_grade).filter(g => g !== null)
            const allD = gradesData.map(g => g.criterion_d_grade).filter(g => g !== null)
            const allFinal = gradesData.map(g => g.final_grade).filter(g => g !== null)
            const allComments = gradesData.map(g => g.comments).filter(c => c)
            
            grades.A = allA.length > 0 ? Math.max(...allA) : null
            grades.B = allB.length > 0 ? Math.max(...allB) : null
            grades.C = allC.length > 0 ? Math.max(...allC) : null
            grades.D = allD.length > 0 ? Math.max(...allD) : null
            semesterOverview = allFinal.length > 0 ? Math.round(allFinal.reduce((a, b) => a + b, 0) / allFinal.length) : null
            comment = allComments.join(' ') // Combine all comments
          }
        }
        
        reportRows.push({
          subject_id: dk.subject.subject_id,
          subject_name: dk.subject.subject_name,
          teacher_name: teacherName,
          grades,
          semester_overview: semesterOverview,
          comment
        })
      }
      
      // Sort by subject name
      reportRows.sort((a, b) => a.subject_name.localeCompare(b.subject_name))
      
      if (reportRows.length === 0) {
        alert('Tidak ada data report untuk siswa ini')
        return
      }
      
      // Generate PDF
      const pdf = new jsPDF('portrait', 'mm', 'a4')
      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()
      const margin = 14
      let yPos = 15
      
      // Title
      pdf.setFontSize(16)
      pdf.setFont('helvetica', 'bold')
      pdf.text(`Summary of ${semesterName} Student Progress`, pageWidth / 2, yPos, { align: 'center' })
      yPos += 10
      
      // Table Header
      autoTable(pdf, {
        startY: yPos,
        head: [[
          { content: '', styles: { halign: 'left', cellWidth: 90 } },
          { content: 'A', styles: { halign: 'center' } },
          { content: 'B', styles: { halign: 'center' } },
          { content: 'C', styles: { halign: 'center' } },
          { content: 'D', styles: { halign: 'center' } },
          { content: `${semesterName}\nProgress\nOverview`, styles: { halign: 'center', fontSize: 7 } }
        ]],
        body: [],
        theme: 'plain',
        styles: {
          fontSize: 9,
          cellPadding: 2,
          valign: 'middle'
        },
        headStyles: {
          fillColor: [255, 255, 255],
          textColor: [100, 100, 100],
          fontStyle: 'normal',
          fontSize: 9
        },
        columnStyles: {
          0: { cellWidth: 90 },
          1: { cellWidth: 18 },
          2: { cellWidth: 18 },
          3: { cellWidth: 18 },
          4: { cellWidth: 18 },
          5: { cellWidth: 20 }
        }
      })
      
      yPos = pdf.lastAutoTable.finalY
      
      // Draw each subject row with comment below
      for (const row of reportRows) {
        // Check if we need a new page
        if (yPos > 250) {
          pdf.addPage()
          yPos = 15
        }
        
        // Subject row with icon placeholder, name, teacher and grades
        autoTable(pdf, {
          startY: yPos,
          body: [[
            { 
              content: `${row.subject_name}\n${row.teacher_name}`, 
              styles: { 
                fontStyle: 'bold',
                fontSize: 10,
                textColor: [30, 64, 175],
                cellPadding: { top: 3, bottom: 1, left: 3, right: 3 }
              } 
            },
            { content: row.grades.A?.toString() ?? '-', styles: { halign: 'center', fontStyle: 'bold', fontSize: 10 } },
            { content: row.grades.B?.toString() ?? '-', styles: { halign: 'center', fontStyle: 'bold', fontSize: 10 } },
            { content: row.grades.C?.toString() ?? '-', styles: { halign: 'center', fontStyle: 'bold', fontSize: 10 } },
            { content: row.grades.D?.toString() ?? '-', styles: { halign: 'center', fontStyle: 'bold', fontSize: 10 } },
            { content: row.semester_overview?.toString() ?? '-', styles: { halign: 'center', fontStyle: 'bold', fontSize: 11, textColor: [30, 64, 175] } }
          ]],
          theme: 'plain',
          styles: {
            fontSize: 10,
            cellPadding: 3,
            valign: 'middle',
            lineColor: [229, 231, 235],
            lineWidth: 0
          },
          columnStyles: {
            0: { cellWidth: 90 },
            1: { cellWidth: 18 },
            2: { cellWidth: 18 },
            3: { cellWidth: 18 },
            4: { cellWidth: 18 },
            5: { cellWidth: 20 }
          }
        })
        
        yPos = pdf.lastAutoTable.finalY
        
        // Comment row (if exists)
        if (row.comment) {
          autoTable(pdf, {
            startY: yPos,
            body: [[
              { 
                content: row.comment, 
                colSpan: 6,
                styles: { 
                  fontSize: 9,
                  textColor: [75, 85, 99],
                  cellPadding: { top: 1, bottom: 5, left: 3, right: 3 }
                } 
              }
            ]],
            theme: 'plain',
            styles: {
              lineColor: [229, 231, 235],
              lineWidth: 0
            }
          })
          yPos = pdf.lastAutoTable.finalY
        }
        
        // Draw separator line
        pdf.setDrawColor(229, 231, 235)
        pdf.setLineWidth(0.3)
        pdf.line(margin, yPos, pageWidth - margin, yPos)
        yPos += 3
      }
      
      // Footer for summary page
      yPos += 5
      pdf.setFontSize(8)
      pdf.setTextColor(150)
      pdf.text(`Generated on ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`, margin, yPos)
      
      // ============= DETAIL PAGES PER SUBJECT =============
      for (const row of reportRows) {
        // Fetch criteria for this subject
        const { data: criteriaData, error: criteriaError } = await supabase
          .from('criteria')
          .select('criterion_id, code, name')
          .eq('subject_id', row.subject_id)
          .order('code')
        
        if (criteriaError) {
          console.error('Error fetching criteria:', criteriaError)
          continue
        }
        
        // Add new page for this subject
        pdf.addPage()
        yPos = margin
        
        // Subject Header
        pdf.setFontSize(16)
        pdf.setTextColor(30, 64, 175)
        pdf.setFont('helvetica', 'bold')
        pdf.text(row.subject_name, margin, yPos)
        yPos += 8
        
        // Teacher name
        pdf.setFontSize(11)
        pdf.setTextColor(100)
        pdf.setFont('helvetica', 'normal')
        pdf.text(`Teacher: ${row.teacher_name}`, margin, yPos)
        yPos += 10
        
        // Grades summary box
        autoTable(pdf, {
          startY: yPos,
          head: [[
            { content: 'Criterion A', styles: { halign: 'center', fillColor: [219, 234, 254] } },
            { content: 'Criterion B', styles: { halign: 'center', fillColor: [219, 234, 254] } },
            { content: 'Criterion C', styles: { halign: 'center', fillColor: [219, 234, 254] } },
            { content: 'Criterion D', styles: { halign: 'center', fillColor: [219, 234, 254] } },
            { content: 'Semester', styles: { halign: 'center', fillColor: [30, 64, 175], textColor: [255, 255, 255] } }
          ]],
          body: [[
            { content: row.grades.A?.toString() ?? '-', styles: { halign: 'center', fontStyle: 'bold', fontSize: 14 } },
            { content: row.grades.B?.toString() ?? '-', styles: { halign: 'center', fontStyle: 'bold', fontSize: 14 } },
            { content: row.grades.C?.toString() ?? '-', styles: { halign: 'center', fontStyle: 'bold', fontSize: 14 } },
            { content: row.grades.D?.toString() ?? '-', styles: { halign: 'center', fontStyle: 'bold', fontSize: 14 } },
            { content: row.semester_overview?.toString() ?? '-', styles: { halign: 'center', fontStyle: 'bold', fontSize: 16, textColor: [30, 64, 175] } }
          ]],
          theme: 'grid',
          styles: {
            fontSize: 10,
            cellPadding: 5,
            valign: 'middle',
            lineColor: [200, 200, 200],
            lineWidth: 0.3
          },
          headStyles: {
            fontSize: 10,
            fontStyle: 'bold',
            textColor: [50, 50, 50]
          }
        })
        
        yPos = pdf.lastAutoTable.finalY + 10
        
        // Criteria details section
        pdf.setFontSize(12)
        pdf.setTextColor(50)
        pdf.setFont('helvetica', 'bold')
        pdf.text('Criterion Descriptors', margin, yPos)
        yPos += 8
        
        // Display each criterion
        for (const criterion of criteriaData || []) {
          if (yPos > 260) {
            pdf.addPage()
            yPos = margin
          }
          
          // Criterion header (A: Analysing, B: Organizing, etc.)
          pdf.setFillColor(243, 244, 246)
          pdf.rect(margin, yPos - 4, pageWidth - 2 * margin, 10, 'F')
          
          pdf.setFontSize(11)
          pdf.setTextColor(30, 64, 175)
          pdf.setFont('helvetica', 'bold')
          pdf.text(`${criterion.code}: ${criterion.name}`, margin + 3, yPos + 2)
          
          // Grade for this criterion
          const gradeValue = row.grades[criterion.code]?.toString() ?? '-'
          pdf.setFontSize(11)
          pdf.setTextColor(50)
          pdf.text(`Grade: ${gradeValue}`, pageWidth - margin - 25, yPos + 2)
          
          yPos += 12
        }
        
        // Comment section if exists
        if (row.comment) {
          yPos += 5
          pdf.setFontSize(11)
          pdf.setTextColor(50)
          pdf.setFont('helvetica', 'bold')
          pdf.text('Teacher Comment:', margin, yPos)
          yPos += 6
          
          pdf.setFont('helvetica', 'normal')
          pdf.setFontSize(10)
          pdf.setTextColor(75, 85, 99)
          
          // Word wrap for long comments
          const splitComment = pdf.splitTextToSize(row.comment, pageWidth - 2 * margin)
          pdf.text(splitComment, margin, yPos)
          yPos += splitComment.length * 5
        }
        
        // Footer for detail page
        pdf.setFontSize(8)
        pdf.setTextColor(150)
        pdf.text(`${studentName} - ${kelasName} - ${semesterName}`, margin, pageHeight - 10)
        pdf.text(`Page ${pdf.internal.getNumberOfPages()}`, pageWidth - margin - 15, pageHeight - 10)
      }
      
      // Save PDF
      const fileName = `student-report-${studentName.replace(/[^a-z0-9]/gi, '-')}-${semesterName.replace(/\s/g, '')}.pdf`
      pdf.save(fileName)
      
    } catch (err) {
      console.error('Error generating report:', err)
      alert('Gagal menghasilkan report: ' + err.message)
    } finally {
      setLoadingReport(false)
    }
  }
  
  // Fetch class recap data
  const generateClassRecapPDF = async (kelasId, semester, subjectId) => {
    if (!kelasId) {
      alert('Silakan pilih kelas terlebih dahulu')
      return
    }
    
    if (!subjectId) {
      alert('Silakan pilih mata pelajaran terlebih dahulu')
      return
    }
    
    try {
      setLoadingClassRecap(true)
      
      const parsedKelasId = parseInt(kelasId)
      const parsedSubjectId = parseInt(subjectId)
      const semesterFilter = semester ? parseInt(semester) : null
      
      // Get kelas name and subject name
      const kelasInfo = assessmentKelasOptions.find(k => k.kelas_id === parsedKelasId)
      const kelasName = kelasInfo?.kelas_nama || 'Unknown Class'
      const subjectInfo = subjects.find(s => s.subject_id === parsedSubjectId)
      const subjectName = subjectInfo?.subject_name || 'Unknown Subject'
      
      // 1. Get all students in this class
      const { data: detailSiswaData, error: dsError } = await supabase
        .from('detail_siswa')
        .select('detail_siswa_id, detail_siswa_user_id')
        .eq('detail_siswa_kelas_id', parsedKelasId)
      
      if (dsError) throw dsError
      
      const userIds = [...new Set(detailSiswaData.map(ds => ds.detail_siswa_user_id))]
      
      // Get user names
      let userMap = new Map()
      if (userIds.length > 0) {
        const { data: usersData, error: usersError } = await supabase
          .from('users')
          .select('user_id, user_nama_depan, user_nama_belakang')
          .in('user_id', userIds)
        
        if (!usersError && usersData) {
          usersData.forEach(u => {
            userMap.set(u.user_id, `${u.user_nama_depan} ${u.user_nama_belakang}`.trim())
          })
        }
      }
      
      const students = detailSiswaData.map(ds => ({
        detail_siswa_id: ds.detail_siswa_id,
        user_id: ds.detail_siswa_user_id,
        nama: userMap.get(ds.detail_siswa_user_id) || 'Unknown'
      })).sort((a, b) => a.nama.localeCompare(b.nama))
      
      // 2. Get detail_kelas for this kelas and subject (to find assessments)
      const { data: detailKelasData, error: dkError } = await supabase
        .from('detail_kelas')
        .select('detail_kelas_id')
        .eq('detail_kelas_kelas_id', parsedKelasId)
        .eq('detail_kelas_subject_id', parsedSubjectId)
      
      if (dkError) throw dkError
      
      const detailKelasIds = detailKelasData.map(dk => dk.detail_kelas_id)
      
      if (detailKelasIds.length === 0) {
        alert('Tidak ada data mata pelajaran untuk kelas ini.')
        return
      }
      
      // 3. Get approved assessments for this class and subject
      let assessmentQuery = supabase
        .from('assessment')
        .select('assessment_id, assessment_nama, assessment_tanggal, assessment_semester')
        .in('assessment_detail_kelas_id', detailKelasIds)
        .eq('assessment_status', 1) // Only approved
        .order('assessment_tanggal', { ascending: true })
      
      // Filter by semester if selected
      if (semesterFilter) {
        assessmentQuery = assessmentQuery.eq('assessment_semester', semesterFilter)
      }
      
      const { data: assessmentsData, error: aError } = await assessmentQuery
      
      if (aError) throw aError
      
      if (!assessmentsData || assessmentsData.length === 0) {
        alert(`Tidak ada assessment yang sudah disetujui untuk ${subjectName} di kelas ini${semesterFilter ? ` pada semester ${semesterFilter}` : ''}.`)
        return
      }
      
      const assessmentIds = assessmentsData.map(a => a.assessment_id)
      
      // 4. Get all grades for these assessments
      const { data: gradesData, error: gError } = await supabase
        .from('assessment_grades')
        .select('assessment_id, detail_siswa_id, criterion_a_grade, criterion_b_grade, criterion_c_grade, criterion_d_grade')
        .in('assessment_id', assessmentIds)
      
      if (gError) throw gError
      
      // Build grades map: { assessment_id: { detail_siswa_id: { A, B, C, D } } }
      const gradesMap = {}
      assessmentIds.forEach(aid => {
        gradesMap[aid] = {}
      })
      
      if (gradesData) {
        gradesData.forEach(g => {
          gradesMap[g.assessment_id][g.detail_siswa_id] = {
            A: g.criterion_a_grade,
            B: g.criterion_b_grade,
            C: g.criterion_c_grade,
            D: g.criterion_d_grade
          }
        })
      }
      
      // Generate PDF
      const doc = new jsPDF('landscape', 'mm', 'a4')
      const pageWidth = doc.internal.pageSize.getWidth()
      
      // Title
      doc.setFontSize(16)
      doc.setFont('helvetica', 'bold')
      doc.text(`Rekap Nilai: ${subjectName} - ${kelasName}`, 14, 15)
      
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.text(`${semesterFilter ? `Semester ${semesterFilter} • ` : ''}Generated: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`, 14, 22)
      
      let yPosition = 30
      
      // Generate table for each assessment
      assessmentsData.forEach((assessment, idx) => {
        // Check if need new page
        if (yPosition > 170) {
          doc.addPage()
          yPosition = 15
        }
        
        // Assessment header
        doc.setFontSize(11)
        doc.setFont('helvetica', 'bold')
        doc.text(`${idx + 1}. ${assessment.assessment_nama}`, 14, yPosition)
        
        doc.setFontSize(9)
        doc.setFont('helvetica', 'normal')
        const dateStr = new Date(assessment.assessment_tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
        doc.text(`${dateStr}${assessment.assessment_semester ? ` • Semester ${assessment.assessment_semester}` : ''}`, 14, yPosition + 5)
        
        yPosition += 10
        
        // Table data
        const tableData = students.map((student, sIdx) => {
          const grades = gradesMap[assessment.assessment_id]?.[student.detail_siswa_id] || {}
          return [
            sIdx + 1,
            student.nama,
            grades.A !== null && grades.A !== undefined ? grades.A : '-',
            grades.B !== null && grades.B !== undefined ? grades.B : '-',
            grades.C !== null && grades.C !== undefined ? grades.C : '-',
            grades.D !== null && grades.D !== undefined ? grades.D : '-',
            '' // Placeholder for final grade
          ]
        })
        
        autoTable(doc, {
          startY: yPosition,
          head: [['No', 'Nama Siswa', 'Crit. A', 'Crit. B', 'Crit. C', 'Crit. D', 'Final']],
          body: tableData,
          styles: { fontSize: 9, cellPadding: 2 },
          headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold' },
          columnStyles: {
            0: { cellWidth: 10, halign: 'center' },
            1: { cellWidth: 'auto' },
            2: { cellWidth: 18, halign: 'center' },
            3: { cellWidth: 18, halign: 'center' },
            4: { cellWidth: 18, halign: 'center' },
            5: { cellWidth: 18, halign: 'center' },
            6: { cellWidth: 18, halign: 'center' }
          },
          alternateRowStyles: { fillColor: [245, 245, 245] },
          margin: { left: 14, right: 14 }
        })
        
        yPosition = doc.lastAutoTable.finalY + 10
      })
      
      // Save PDF
      const fileName = `rekap-nilai-${subjectName.replace(/\s+/g, '-').toLowerCase()}-${kelasName.replace(/\s+/g, '-').toLowerCase()}${semesterFilter ? `-sem${semesterFilter}` : ''}.pdf`
      doc.save(fileName)
      
    } catch (err) {
      console.error('Error generating class recap PDF:', err)
      alert('Gagal membuat PDF rekap: ' + err.message)
    } finally {
      setLoadingClassRecap(false)
    }
  }
  
  // Auto-save function
  const handleSave = async (fieldName, value) => {
    if (!selectedTopic) return
    
    setSaving(true)
    try {
      // Convert topic_year to integer for database
      let saveValue = value
      if (fieldName === 'topic_year') {
        saveValue = value ? parseInt(value) : null
      }
      
      const { error } = await supabase
        .from('topic')
        .update({ [fieldName]: saveValue })
        .eq('topic_id', selectedTopic.topic_id)
      
      if (error) throw error
      
      // Update local state
      setSelectedTopic(prev => ({ ...prev, [fieldName]: saveValue }))
      setTopics(prev => prev.map(t => 
        t.topic_id === selectedTopic.topic_id 
          ? { ...t, [fieldName]: saveValue }
          : t
      ))
      
      console.log('✅ Saved:', fieldName)
      
      // Show save notification
      setSaveNotification(true)
      setTimeout(() => {
        setSaveNotification(false)
      }, 2000)
    } catch (err) {
      console.error('❌ Error saving:', err)
      alert('Failed to save changes: ' + err.message)
    } finally {
      setSaving(false)
      setEditingField(null)
    }
  }

  // Open grading modal
  const handleOpenGrading = async (assessment, e) => {
    e?.stopPropagation() // Prevent card click
    
    setGradingAssessment(assessment)
    setLoadingGrading(true)
    setGradingModalOpen(true)
    setExpandedStudents(new Set())
    
    try {
      console.log('🔍 Assessment data:', assessment)
      console.log('📋 Detail kelas ID:', assessment.assessment_detail_kelas_id)
      
      // Validate assessment has detail_kelas_id
      if (!assessment.assessment_detail_kelas_id) {
        throw new Error('Assessment does not have a class assigned (detail_kelas_id is missing)')
      }
      
      // 1. Fetch detail_kelas to get kelas_id
      const { data: detailKelas, error: dkError } = await supabase
        .from('detail_kelas')
        .select('detail_kelas_kelas_id')
        .eq('detail_kelas_id', assessment.assessment_detail_kelas_id)
        .single()
      
      console.log('🏫 Detail kelas result:', detailKelas, 'Error:', dkError)
      
      if (dkError) throw dkError
      
      if (!detailKelas || !detailKelas.detail_kelas_kelas_id) {
        throw new Error('Could not find class information for this assessment')
      }
      
      const kelasId = detailKelas.detail_kelas_kelas_id
      console.log('🎯 Using kelas_id:', kelasId)
      
      // Fetch detail_siswa records
      const { data: detailSiswaRecords, error: studentsError } = await supabase
        .from('detail_siswa')
        .select('detail_siswa_id, detail_siswa_user_id')
        .eq('detail_siswa_kelas_id', kelasId)
      
      console.log('👥 Students found:', detailSiswaRecords?.length, 'Error:', studentsError)
      
      if (studentsError) throw studentsError
      
      // Fetch user details separately
      const userIds = [...new Set(detailSiswaRecords.map(ds => ds.detail_siswa_user_id))]
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('user_id, user_nama_depan, user_nama_belakang')
        .in('user_id', userIds)
      
      if (usersError) throw usersError
      
      // Create user map
      const userMap = new Map()
      usersData.forEach(u => {
        userMap.set(u.user_id, `${u.user_nama_depan} ${u.user_nama_belakang}`.trim())
      })
      
      // Flatten student data
      const flatStudents = detailSiswaRecords
        .map(ds => ({
          detail_siswa_id: ds.detail_siswa_id,
          user_id: ds.detail_siswa_user_id,
          nama: userMap.get(ds.detail_siswa_user_id) || 'Unknown Student'
        }))
        .sort((a, b) => a.nama.localeCompare(b.nama))
      
      setGradingStudents(flatStudents)
      
      // 2. Get criteria info
      if (!assessment.criteria || assessment.criteria.length === 0) {
        throw new Error('This assessment has no criteria assigned. Please add criteria first.')
      }
      
      console.log('📚 Assessment criteria:', assessment.criteria)
      
      // Update gradingAssessment with criteria
      setGradingAssessment(prev => ({
        ...prev,
        criteria: assessment.criteria
      }))
      
      // 3. Fetch existing grades (simplified - just criterion grades)
      const { data: existingGrades, error: gradesError } = await supabase
        .from('assessment_grades')
        .select(`
          grade_id,
          detail_siswa_id,
          criterion_a_grade,
          criterion_b_grade,
          criterion_c_grade,
          criterion_d_grade,
          final_grade,
          comments
        `)
        .eq('assessment_id', assessment.assessment_id)
      
      if (gradesError) throw gradesError
      
      // Build simplified grading data structure
      const gradingMap = {}
      for (const student of flatStudents) {
        const existingGrade = existingGrades?.find(g => g.detail_siswa_id === student.detail_siswa_id)
        if (existingGrade) {
          gradingMap[student.detail_siswa_id] = {
            grade_id: existingGrade.grade_id,
            criterion_grades: {
              A: existingGrade.criterion_a_grade,
              B: existingGrade.criterion_b_grade,
              C: existingGrade.criterion_c_grade,
              D: existingGrade.criterion_d_grade
            },
            final_grade: existingGrade.final_grade,
            comments: existingGrade.comments || ''
          }
        } else {
          // Initialize empty
          gradingMap[student.detail_siswa_id] = {
            grade_id: null,
            criterion_grades: { A: null, B: null, C: null, D: null },
            final_grade: null,
            comments: ''
          }
        }
      }
      
      setGradingData(gradingMap)
      
    } catch (err) {
      console.error('Error loading grading data:', err)
      alert('Failed to load grading data: ' + err.message)
      setGradingModalOpen(false)
    } finally {
      setLoadingGrading(false)
    }
  }
  
  // Toggle student expansion
  const toggleStudentExpansion = (detailSiswaId) => {
    const newSet = new Set(expandedStudents)
    if (newSet.has(detailSiswaId)) {
      newSet.delete(detailSiswaId)
    } else {
      newSet.add(detailSiswaId)
    }
    setExpandedStudents(newSet)
  }
  
  // Update criterion grade directly
  const updateCriterionGrade = (detailSiswaId, criterionCode, grade) => {
    setGradingData(prev => ({
      ...prev,
      [detailSiswaId]: {
        ...prev[detailSiswaId],
        criterion_grades: {
          ...prev[detailSiswaId].criterion_grades,
          [criterionCode]: grade === '' ? null : parseInt(grade)
        }
      }
    }))
  }
  
  // Update student comment
  const updateStudentComment = (detailSiswaId, comment) => {
    setGradingData(prev => ({
      ...prev,
      [detailSiswaId]: {
        ...prev[detailSiswaId],
        comments: comment
      }
    }))
  }
  
  // Get grade color based on value
  const getGradeColor = (grade) => {
    if (grade === null || grade === undefined) return 'bg-gray-100 text-gray-500'
    if (grade >= 7) return 'bg-green-100 text-green-700'
    if (grade >= 5) return 'bg-blue-100 text-blue-700'
    if (grade >= 3) return 'bg-yellow-100 text-yellow-700'
    return 'bg-red-100 text-red-700'
  }
  
  // Save all grades (simplified - no strand grades)
  const handleSaveGrades = async () => {
    setSavingGrades(true)
    try {
      for (const student of gradingStudents) {
        const detailSiswaId = student.detail_siswa_id
        const studentData = gradingData[detailSiswaId]
        
        // Get criterion grades directly from state
        const criterionGrades = studentData.criterion_grades
        
        // Calculate final grade (sum of all criteria, then convert to 1-7)
        const total = Object.values(criterionGrades).reduce((sum, g) => sum + (g || 0), 0)
        
        // Use Supabase function to calculate final grade
        const { data: finalGradeData, error: finalError } = await supabase
          .rpc('calculate_final_grade', { total_score: total })
        
        if (finalError) throw finalError
        
        const finalGrade = finalGradeData
        
        // Upsert assessment_grades
        const gradeRecord = {
          assessment_id: gradingAssessment.assessment_id,
          detail_siswa_id: detailSiswaId,
          criterion_a_grade: criterionGrades['A'] ?? null,
          criterion_b_grade: criterionGrades['B'] ?? null,
          criterion_c_grade: criterionGrades['C'] ?? null,
          criterion_d_grade: criterionGrades['D'] ?? null,
          final_grade: finalGrade,
          comments: studentData.comments || null,
          created_by_user_id: studentData.grade_id ? undefined : currentUserId,
          updated_by_user_id: currentUserId
        }
        
        let gradeId = studentData.grade_id
        
        if (gradeId) {
          // Update existing
          const { error: updateError } = await supabase
            .from('assessment_grades')
            .update(gradeRecord)
            .eq('grade_id', gradeId)
          
          if (updateError) throw updateError
        } else {
          // Insert new
          const { data: insertData, error: insertError } = await supabase
            .from('assessment_grades')
            .insert([gradeRecord])
            .select()
          
          if (insertError) throw insertError
          gradeId = insertData[0].grade_id
        }
        
        // Update local state with new grade_id
        setGradingData(prev => ({
          ...prev,
          [detailSiswaId]: {
            ...prev[detailSiswaId],
            grade_id: gradeId
          }
        }))
      }
      
      alert('All grades saved successfully!')
      setGradingModalOpen(false)
      
    } catch (err) {
      console.error('Error saving grades:', err)
      alert('Failed to save grades: ' + err.message)
    } finally {
      setSavingGrades(false)
    }
  }

  // Start editing
  const startEdit = (fieldName, currentValue) => {
    if (fieldName === 'topic_global_context') {
      // Parse comma-separated contexts
      const contexts = currentValue ? currentValue.split(',').map(s => s.trim()).filter(Boolean) : []
      setSelectedContexts(contexts)
    }
    setEditingField(fieldName)
    setEditValue(currentValue || '')
  }

  // Cancel editing
  const cancelEdit = () => {
    setEditingField(null)
    setEditValue('')
    setSelectedContexts([])
  }
  
  // Toggle global context
  const toggleContext = (context) => {
    setSelectedContexts(prev => {
      if (prev.includes(context)) {
        return prev.filter(c => c !== context)
      } else {
        return [...prev, context]
      }
    })
  }
  
  // Save global contexts
  const saveGlobalContexts = async () => {
    const value = selectedContexts.join(', ')
    if (isAddMode) {
      handleAddTopic('topic_global_context', value)
      setEditingField(null)
    } else {
      await handleSave('topic_global_context', value)
    }
  }

  // Open add new topic modal
  const openAddModal = () => {
    setIsAddMode(true)
    setCurrentStep(0) // Start from first step
    setAllKelas([]) // Reset kelas options
    setSelectedTopic({
      topic_nama: '',
      topic_subject_id: '', // Start with empty - user must select
      topic_kelas_id: '',
      topic_year: '', // MYP Year (1, 3, or 5)
      topic_urutan: '',
      topic_duration: '',
      topic_hours_per_week: '',
      topic_inquiry_question: '',
      topic_global_context: '',
      topic_key_concept: '',
      topic_related_concept: '',
      topic_statement: '',
      topic_learner_profile: '',
      topic_service_learning: '',
      topic_atl: '',
      topic_resources: '',
      topic_learning_process: '',
      topic_formative_assessment: '',
      topic_summative_assessment: '',
      topic_relationship_summative_assessment_statement_of_inquiry: '',
      topic_reflection_prior: '',
      topic_reflection_after: ''
    })
    // Reset wizard assessment data for new unit
    setWizardAssessment({
      assessment_nama: '',
      assessment_keterangan: '',
      assessment_semester: '',
      assessment_relationship: '',
      assessment_conceptual_understanding: '',
      assessment_task_specific_description: '',
      assessment_instructions: '',
      selected_criteria: []
    })
    setWizardCriteria([]) // Reset criteria options
    setModalOpen(true)
  }
  
  // AI Help functions
  const openAiInputModal = (lang, helpType = 'unitTitle') => {
    setAiLang(lang)
    setAiHelpType(helpType)
    setAiUserInput('')
    setAiError('')
    setSelectedInquiryQuestions([])
    setAiInputModalOpen(true)
  }
  
  const requestAiHelp = async (helpType = aiHelpType) => {
    // Types that don't require user input (they get context from existing fields)
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
      // Determine which AI rule to fetch based on help type
      let ruleColumn = 'ai_rule_unit'
      if (helpType === 'inquiryQuestion') {
        ruleColumn = 'ai_rule_inquiry_question'
      } else if (helpType === 'keyConcept') {
        ruleColumn = 'ai_rule_key_concept'
      } else if (helpType === 'relatedConcept') {
        ruleColumn = 'ai_rule_related_concept'
      } else if (helpType === 'globalContext') {
        ruleColumn = 'ai_rule_global_context'
      } else if (helpType === 'statement') {
        ruleColumn = 'ai_rule_statement'
      } else if (helpType === 'learnerProfile') {
        ruleColumn = 'ai_rule_learner_profile'
      } else if (helpType === 'serviceLearning') {
        ruleColumn = 'ai_rule_service_learning'
      } else if (helpType === 'assessmentRelationship') {
        ruleColumn = 'ai_rule_relationship_sa_soi'
      }
      
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
        // Prompt for Related Concept
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
        // Prompt for Statement of Inquiry
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
        // Prompt for Global Context
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
        // Prompt for Key Concept
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
        // Prompt for Inquiry Question
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
        // Prompt for Learner Profile
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
        // Prompt for Service Learning
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
        // Prompt for Resources / Bibliography (no AI rule needed, hardcoded prompt)
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

        // Console log the prompt for debugging
        console.log('🤖 ==========================================')
        console.log('🤖 AI Prompt for Resources')
        console.log('🤖 ==========================================')
        console.log('📋 Context:')
        console.log('  - Unit Title:', unitTitle)
        console.log('  - Statement:', statement)
        console.log('  - Key Concepts:', keyConcept)
        console.log('  - Related Concepts:', relatedConcept)
        console.log('  - Global Context:', globalContext)
        console.log('  - Subject:', subjName)
        console.log('  - Class:', kelasName)
        console.log('📝 Full Prompt:')
        console.log(promptWithLang)
        console.log('🤖 ==========================================')
      } else if (helpType === 'assessmentName') {
        // Prompt for Assessment Details (Name, Conceptual Understanding, Task Description, Instructions)
        const unitTitle = selectedTopic?.topic_nama || 'Not yet defined'
        const statement = selectedTopic?.topic_statement || 'Not yet defined'
        const keyConcept = selectedTopic?.topic_key_concept || 'Not yet defined'
        const relatedConcept = selectedTopic?.topic_related_concept || 'Not yet defined'
        const globalContext = selectedTopic?.topic_global_context || 'Not yet defined'
        const inquiryQuestion = selectedTopic?.topic_inquiry_question || 'Not yet defined'
        const learnerProfile = selectedTopic?.topic_learner_profile || 'Not yet defined'
        
        // Get selected criteria with full details
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
- Learner Profile Attributes: ${learnerProfile}
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

        // Console log for debugging
        console.log('🤖 ==========================================')
        console.log('🤖 AI Prompt for Assessment Details')
        console.log('🤖 ==========================================')
        console.log('📋 Context:')
        console.log('  - Unit Title:', unitTitle)
        console.log('  - Statement:', statement)
        console.log('  - Key Concepts:', keyConcept)
        console.log('  - Related Concepts:', relatedConcept)
        console.log('  - Criteria:', selectedCriteriaNames)
        console.log('📝 Full Prompt:')
        console.log(promptWithLang)
        console.log('🤖 ==========================================')
      } else if (helpType === 'assessmentRelationship') {
        // Prompt for Assessment Relationship - Include ALL information from Steps 1-6
        
        // Step 1: Basic Information
        const unitTitle = selectedTopic?.topic_nama || 'Not yet defined'
        const unitNumber = selectedTopic?.topic_urutan || 'Not yet defined'
        const duration = selectedTopic?.topic_duration || 'Not yet defined'
        const hoursPerWeek = selectedTopic?.topic_hours_per_week || 'Not yet defined'
        const mypYear = selectedTopic?.topic_year || 'Not yet defined'
        
        // Step 2: Inquiry Question
        const inquiryQuestion = selectedTopic?.topic_inquiry_question || 'Not yet defined'
        
        // Step 3: Key & Related Concepts, Global Context
        const keyConcept = selectedTopic?.topic_key_concept || 'Not yet defined'
        const relatedConcept = selectedTopic?.topic_related_concept || 'Not yet defined'
        const globalContext = selectedTopic?.topic_global_context || 'Not yet defined'
        
        // Step 4: Statement of Inquiry
        const statement = selectedTopic?.topic_statement || 'Not yet defined'
        
        // Step 5: Learner Profile & Service Learning
        const learnerProfile = selectedTopic?.topic_learner_profile || 'Not yet defined'
        const serviceLearning = selectedTopic?.topic_service_learning || 'Not yet defined'
        
        // Step 6: Assessment Details
        const assessmentName = wizardAssessment?.assessment_nama || 'Not yet defined'
        const assessmentSemester = wizardAssessment?.assessment_semester || 'Not yet defined'
        const assessmentDescription = wizardAssessment?.assessment_keterangan || 'Not provided'
        
        // Get selected criteria names
        const selectedCriteriaNames = wizardCriteria
          .filter(c => wizardAssessment.selected_criteria?.includes(c.criterion_id))
          .map(c => `${c.code}: ${c.name}`)
          .join(', ') || 'Not yet selected'
        
        // Build comprehensive context object for debugging
        const fullContext = {
          // Step 1
          unitTitle,
          unitNumber,
          duration: `${duration} weeks`,
          hoursPerWeek: `${hoursPerWeek} hours/week`,
          mypYear: `MYP Year ${mypYear}`,
          subject: subjName,
          class: kelasName,
          // Step 2
          inquiryQuestion,
          // Step 3
          keyConcept,
          relatedConcept,
          globalContext,
          // Step 4
          statement,
          // Step 5
          learnerProfile,
          serviceLearning,
          // Step 6
          assessmentName,
          assessmentSemester: `Semester ${assessmentSemester}`,
          assessmentDescription,
          criteriaToAssess: selectedCriteriaNames
        }
        
        console.log('🤖 ==========================================');
        console.log('🤖 AI Prompt for Assessment Relationship');
        console.log('🤖 ==========================================');
        console.log('📋 Full Context (Steps 1-6):');
        console.log(JSON.stringify(fullContext, null, 2));
        
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
- Learner Profile Attributes: ${learnerProfile}
- Service Learning: ${serviceLearning}

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
5. Explain how completing this assessment helps develop the Learner Profile attributes (${learnerProfile})
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

        console.log('📝 Prompt being sent to AI:');
        console.log(promptWithLang);
        console.log('🤖 ==========================================');
      } else {
        // Prompt for Unit Title
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
      
      // DEBUG: Log the prompt to console
      console.log('🤖 AI Prompt yang dikirim:')
      console.log('─────────────────────────────────────')
      console.log('📚 Subject:', subjName)
      console.log('🎓 Kelas:', kelasName)
      console.log('💭 User Input:', aiUserInput.trim())
      console.log('🌐 Bahasa:', selected)
      console.log('─────────────────────────────────────')
      console.log('Full Prompt:')
      console.log(promptWithLang)
      console.log('─────────────────────────────────────')
      
      const body = { prompt: promptWithLang, context }
      const resp = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      const json = await resp.json()
      if (!resp.ok) throw new Error(json?.error || 'Gagal memanggil AI')
      
      const text = json?.text || ''
      
      // DEBUG: Log AI response
      console.log('🤖 AI Response:')
      console.log('─────────────────────────────────────')
      console.log(text)
      console.log('─────────────────────────────────────')
      
      // Parse AI response
      let items = []
      try {
        // Try to parse as JSON first
        let parsed
        try {
          parsed = JSON.parse(text)
        } catch (jsonErr) {
          // Try to extract JSON from text that might have markdown code blocks
          const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/```\s*([\s\S]*?)\s*```/)
          if (jsonMatch) {
            parsed = JSON.parse(jsonMatch[1])
          } else {
            // Try to find JSON object in text (support both formats)
            const objMatch = text.match(/\{[\s\S]*("jawaban"|"inquiry_questions")[\s\S]*\}/)
            if (objMatch) {
              parsed = JSON.parse(objMatch[0])
            }
          }
        }
        
        // Handle inquiry_questions format (new format)
        if (parsed && parsed.inquiry_questions) {
          const iq = parsed.inquiry_questions
          items = []
          let idx = 1
          
          // Factual questions
          if (iq.factual) {
            Object.entries(iq.factual).forEach(([key, question]) => {
              items.push({
                index: idx++,
                category: 'Factual',
                option: question.toString().trim(),
                text: 'A factual question that tests knowledge and comprehension',
                reason: 'Helps students recall and understand basic facts and information'
              })
            })
          }
          
          // Conceptual questions
          if (iq.conceptual) {
            Object.entries(iq.conceptual).forEach(([key, question]) => {
              items.push({
                index: idx++,
                category: 'Conceptual',
                option: question.toString().trim(),
                text: 'A conceptual question that requires analysis and synthesis',
                reason: 'Encourages students to understand deeper concepts and relationships'
              })
            })
          }
          
          // Debatable questions
          if (iq.debatable) {
            Object.entries(iq.debatable).forEach(([key, question]) => {
              items.push({
                index: idx++,
                category: 'Debatable',
                option: question.toString().trim(),
                text: 'A debatable question that requires evaluation and judgment',
                reason: 'Promotes critical thinking and justification of perspectives'
              })
            })
          }
          
          console.log('✅ Parsed inquiry questions:', items)
        }
        // Handle jawaban format (old format for unit titles)
        else if (parsed && Array.isArray(parsed.jawaban)) {
          items = parsed.jawaban.map((a, idx) => ({
            index: idx + 1,
            option: (a?.option ?? '').toString().trim(),
            link: (a?.link ?? '').toString().trim(),
            text: (a?.text ?? '').toString().trim(),
            reason: (a?.reason ?? '').toString().trim(),
            // Assessment details fields
            conceptual_understanding: (a?.conceptual_understanding ?? '').toString().trim(),
            task_description: (a?.task_description ?? '').toString().trim(),
            instructions: (a?.instructions ?? '').toString().trim().replace(/\\n/g, '\n') }))
          console.log('✅ Parsed JSON items:', items)
        }
      } catch (e) {
        console.warn('⚠️ Failed to parse as JSON, falling back to numbered list', e)
        // Parse as numbered list
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

  // AI Help for ATL (Approaches to Learning)
  const requestAiHelpAtl = async () => {
    if (!selectedTopic.topic_kelas_id) {
      alert('Please select Class in Step 1 first')
      return
    }

    setAiLoading(true)
    setAiError('')
    setAiResultModalOpen(true) // Show modal with loading state
    
    try {
      // Get kelas_nama to send to AI
      const { data: kelasData, error: kelasError } = await supabase
        .from('kelas')
        .select('kelas_nama')
        .eq('kelas_id', selectedTopic.topic_kelas_id)
        .single()
      
      if (kelasError) throw kelasError
      
      const kelasNama = kelasData?.kelas_nama || ''
      console.log('📚 Fetching ATL for class:', kelasNama)
      
      // Fetch ALL ATL descriptors (AI will filter by grade)
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

      // Build context from previous steps
      const context = {
        unit_title: selectedTopic.topic_nama || '',
        class_name: kelasNama, // Send class name as-is
        subject: subjects.find(s => s.subject_id === selectedTopic.topic_subject_id)?.subject_name || '',
        inquiry_question: selectedTopic.topic_inquiry_question || '',
        key_concept: selectedTopic.topic_key_concept || '',
        related_concept: selectedTopic.topic_related_concept || '',
        global_context: selectedTopic.topic_global_context || '',
        statement_of_inquiry: selectedTopic.topic_statement || '',
        learner_profile: selectedTopic.topic_learner_profile || '',
        service_learning: selectedTopic.topic_service_learning || ''
      }

      // Format ATL descriptors for prompt
      const atlDescriptorsText = atlDescriptors.map((atl, idx) => 
        `${idx + 1}. [ID: ${atl.id}] ${atl.skill_category} - ${atl.strand} - ${atl.cluster}: ${atl.descriptor_text}`
      ).join('\n')

      // Build prompt
      const prompt = `You are an IB MYP curriculum expert. Based on the unit plan context below, suggest the 3 most relevant ATL (Approaches to Learning) skills from the provided list.

=== UNIT PLAN CONTEXT ===
Unit Title: ${context.unit_title}
Class: ${context.class_name}
Subject: ${context.subject}
Inquiry Question: ${context.inquiry_question}
Key Concept: ${context.key_concept}
Related Concept: ${context.related_concept}
Global Context: ${context.global_context}
Statement of Inquiry: ${context.statement_of_inquiry}
Learner Profile Attributes: ${context.learner_profile}
Service Learning: ${context.service_learning}

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
  },
  {
    "id": 12,
    "skill_category": "Thinking",
    "strand": "Critical Thinking",
    "cluster": "Analyzing complex concepts",
    "descriptor_text": "Analyze complex concepts and projects into their constituent parts",
    "reason": "Students need to break down digital design problems into manageable components to understand how design can inspire positive change.",
    "summary_sentence": "In order for me to understand complex design problems, I must analyze concepts into their parts. (Thinking - Critical Thinking). I will learn to do this through structured design thinking exercises."
  },
  {
    "id": 18,
    "skill_category": "Research",
    "strand": "Information Literacy",
    "cluster": "Accessing information",
    "descriptor_text": "Access information to be informed and inform others",
    "reason": "Essential for gathering information about positive change initiatives and sharing findings with others.",
    "summary_sentence": "In order for me to make informed design decisions, I must access and evaluate reliable information. (Research - Information Literacy). I will learn to do this through research projects and information literacy workshops."
  }
]

Requirements:
- Select from the provided list above using the [ID: X] numbers
- Choose skills from different categories when possible for balanced development
- Each summary_sentence must be unique and specific to that ATL skill
- Connect the unit goal with the specific ATL skill indicator and learning strategy
- No markdown, no code blocks, just raw JSON array`

      console.log('=== ATL AI HELP PROMPT ===')
      console.log(prompt)
      console.log('==========================')

      // Send to Gemini API
      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          context: JSON.stringify(context)
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to get AI suggestions')
      }

      const data = await response.json()
      let suggestions = data.text // Changed from data.response to data.text

      console.log('🔍 Raw AI Response:', suggestions)
      console.log('🔍 Response Type:', typeof suggestions)

      // Clean up response (remove markdown code blocks if present)
      if (typeof suggestions === 'string') {
        suggestions = suggestions.trim()
        console.log('📝 Trimmed Response:', suggestions)
        
        if (suggestions.startsWith('```json')) {
          suggestions = suggestions.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
        } else if (suggestions.startsWith('```')) {
          suggestions = suggestions.replace(/```\n?/g, '').trim()
        }
        
        console.log('🧹 Cleaned Response:', suggestions)
        
        try {
          suggestions = JSON.parse(suggestions)
          console.log('✅ Parsed JSON:', suggestions)
        } catch (parseError) {
          console.error('❌ JSON Parse Error:', parseError)
          throw new Error('Failed to parse AI response as JSON: ' + parseError.message)
        }
      }

      // Expect array of skills, each with summary_sentence
      if (!Array.isArray(suggestions)) {
        console.error('❌ Response is not an array:', suggestions)
        throw new Error('AI response is not an array. Received: ' + typeof suggestions)
      }

      console.log('✅ AI ATL Suggestions:', suggestions)

      // Add index to each item for display
      const itemsWithIndex = suggestions.map((item, idx) => ({ ...item, index: idx + 1 }))

      // Set suggestions for user to select
      setAiItems(itemsWithIndex)
      setSelectedAtlSkills([])

    } catch (err) {
      console.error('❌ Error getting ATL AI help:', err)
      setAiError(err.message || 'Failed to get AI suggestions. Please try again.')
    } finally {
      setAiLoading(false)
    }
  }

  // AI Help for TSC - generates all TSC clarifications
  const requestAiHelpTSC = async () => {
    setAiLoading(true)
    setAiError('')
    
    try {
      // Get context information
      const subj = subjects.find(s => String(s.subject_id) === String(selectedTopic?.topic_subject_id))
      const subjName = subj?.subject_name || 'Unknown Subject'
      const kelasName = kelasNameMap.get(parseInt(selectedTopic?.topic_kelas_id)) || 'Unknown Class'
      const unitTitle = selectedTopic?.topic_nama || 'Unit Title'
      const assessmentName = wizardAssessment.assessment_nama || 'Assessment'
      const taskDescription = wizardAssessment.assessment_task_specific_description || ''
      const instructions = wizardAssessment.assessment_instructions || ''
      const conceptualUnderstanding = wizardAssessment.assessment_conceptual_understanding || ''
      const mypYear = selectedTopic?.topic_year || 1
      
      // Build structure of what we need
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
                criterionId: criterionId,
                bandLabel: bandLabel,
                strandLabel: strand.label,
                strandContent: strand.content,
                subjectCriteria: rubric.description,
                tscKey: `${criterionId}_${bandLabel}_${strand.label}`
              })
            }
          }
        }
      }
      
      // Build prompt
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

EXAMPLE:
If strand criteria says: "explains and justifies the need for a solution to a problem"
- Band 7-8 TSC: "explains and justifies the need for a solution to a problem, supported by detailed research from at least 5 credible sources in your presentation"
- Band 5-6 TSC: "explains and justifies the need for a solution to a problem, supported by research from 3-4 credible sources in your presentation"
- Band 3-4 TSC: "explains and justifies the need for a solution to a problem, with some research evidence (2-3 sources) in your presentation"
- Band 1-2 TSC: "explains and justifies the need for a solution to a problem, with limited research (1-2 sources) in your presentation"

Notice: The core phrase "explains and justifies the need for a solution to a problem" stays the same. Only task-specific details are added.

RESPONSE FORMAT (JSON):
{
  "tsc": {
    "criterionId_bandLabel_strandLabel": "TSC text that keeps original criteria + adds task specifics",
    ...
  }
}

Generate TSC for all ${tscStructure.length} items. Keep original strand wording, only add task-specific clarifications. Respond ONLY with valid JSON.`

      console.log('🤖 AI TSC Prompt:', prompt)
      console.log('📊 TSC Structure to generate:', tscStructure)
      
      // Call API
      const body = { 
        prompt: prompt, 
        context: 'Generate TSC for IB MYP assessment'
      }
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
      
      console.log('📥 AI TSC Response:', aiText)
      
      // Parse JSON response
      let parsed
      try {
        parsed = JSON.parse(aiText)
      } catch (jsonErr) {
        // Try to extract JSON from markdown code blocks
        const jsonMatch = aiText.match(/```json\s*([\s\S]*?)\s*```/) || aiText.match(/```\s*([\s\S]*?)\s*```/)
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[1])
        } else {
          // Try to find JSON object in text
          const objMatch = aiText.match(/\{[\s\S]*"tsc"[\s\S]*\}/)
          if (objMatch) {
            parsed = JSON.parse(objMatch[0])
          } else {
            throw new Error('Invalid JSON response from AI')
          }
        }
      }
      
      console.log('✅ Parsed TSC JSON:', parsed)
      
      if (parsed && parsed.tsc) {
        // Update wizardAssessment with all TSC values
        setWizardAssessment(prev => ({
          ...prev,
          assessment_tsc: {
            ...prev.assessment_tsc,
            ...parsed.tsc
          }
        }))
        
        console.log('✅ TSC values applied to assessment')
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
  
  const insertAiSuggestion = (txtOrItem) => {
    if (!txtOrItem) return
    
    // For assessmentName, receive the full item object with all 4 fields
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
    
    // For other types, process as text
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
  
  // Toggle checkbox for inquiry question selection
  const toggleInquiryQuestion = (index) => {
    const scrollContainer = aiScrollRef.current
    if (!scrollContainer) return
    
    const currentScrollPos = scrollContainer.scrollTop
    const scrollElem = scrollContainer
    
    setSelectedInquiryQuestions(prev => {
      const newVal = prev.includes(index)
        ? prev.filter(i => i !== index)
        : [...prev, index]
      
      // Force scroll restore in next tick
      Promise.resolve().then(() => {
        scrollElem.scrollTop = currentScrollPos
        setTimeout(() => scrollElem.scrollTop = currentScrollPos, 0)
        requestAnimationFrame(() => scrollElem.scrollTop = currentScrollPos)
      })
      
      return newVal
    })
  }
  
  // Toggle checkbox for key concept selection
  const toggleKeyConcept = (index) => {
    const scrollContainer = aiScrollRef.current
    if (!scrollContainer) return
    
    const currentScrollPos = scrollContainer.scrollTop
    const scrollElem = scrollContainer
    
    setSelectedKeyConcepts(prev => {
      const newVal = prev.includes(index)
        ? prev.filter(i => i !== index)
        : [...prev, index]
      
      // Force scroll restore in next tick
      Promise.resolve().then(() => {
        scrollElem.scrollTop = currentScrollPos
        setTimeout(() => scrollElem.scrollTop = currentScrollPos, 0)
        requestAnimationFrame(() => scrollElem.scrollTop = currentScrollPos)
      })
      
      return newVal
    })
  }
  
  // Toggle checkbox for related concept selection
  const toggleRelatedConcept = (index) => {
    const scrollContainer = aiScrollRef.current
    if (!scrollContainer) return
    
    const currentScrollPos = scrollContainer.scrollTop
    const scrollElem = scrollContainer
    
    setSelectedRelatedConcepts(prev => {
      const newVal = prev.includes(index)
        ? prev.filter(i => i !== index)
        : [...prev, index]
      
      // Force scroll restore in next tick
      Promise.resolve().then(() => {
        scrollElem.scrollTop = currentScrollPos
        setTimeout(() => scrollElem.scrollTop = currentScrollPos, 0)
        requestAnimationFrame(() => scrollElem.scrollTop = currentScrollPos)
      })
      
      return newVal
    })
  }
  
  // Toggle checkbox for global context selection
  const toggleGlobalContext = (index) => {
    const scrollContainer = aiScrollRef.current
    if (!scrollContainer) return
    
    const currentScrollPos = scrollContainer.scrollTop
    const scrollElem = scrollContainer
    
    setSelectedGlobalContexts(prev => {
      const newVal = prev.includes(index)
        ? prev.filter(i => i !== index)
        : [...prev, index]
      
      // Force scroll restore in next tick
      Promise.resolve().then(() => {
        scrollElem.scrollTop = currentScrollPos
        setTimeout(() => scrollElem.scrollTop = currentScrollPos, 0)
        requestAnimationFrame(() => scrollElem.scrollTop = currentScrollPos)
      })
      
      return newVal
    })
  }
  
  // Toggle checkbox for statement selection (single select only)
  const toggleStatement = (index) => {
    const scrollContainer = aiScrollRef.current
    if (!scrollContainer) return
    
    const currentScrollPos = scrollContainer.scrollTop
    const scrollElem = scrollContainer
    
    setSelectedStatements(prev => {
      // Single select: if already selected, deselect. Otherwise, replace with new selection
      const newVal = prev.includes(index) ? [] : [index]
      
      // Force scroll restore in next tick
      Promise.resolve().then(() => {
        scrollElem.scrollTop = currentScrollPos
        setTimeout(() => scrollElem.scrollTop = currentScrollPos, 0)
        requestAnimationFrame(() => scrollElem.scrollTop = currentScrollPos)
      })
      
      return newVal
    })
  }
  
  // Toggle checkbox for learner profile selection
  const toggleLearnerProfile = (index) => {
    const scrollContainer = aiScrollRef.current
    if (!scrollContainer) return
    
    const currentScrollPos = scrollContainer.scrollTop
    const scrollElem = scrollContainer
    
    setSelectedLearnerProfiles(prev => {
      const newVal = prev.includes(index)
        ? prev.filter(i => i !== index)
        : [...prev, index]
      
      // Force scroll restore in next tick
      Promise.resolve().then(() => {
        scrollElem.scrollTop = currentScrollPos
        setTimeout(() => scrollElem.scrollTop = currentScrollPos, 0)
        requestAnimationFrame(() => scrollElem.scrollTop = currentScrollPos)
      })
      
      return newVal
    })
  }
  
  // Apply selected statement of inquiry
  const applySelectedStatements = () => {
    // Clear previous errors
    setAiError('')
    
    if (selectedStatements.length === 0) {
      setAiError('⚠️ Please select one statement of inquiry.')
      return
    }
    
    // Get selected statement
    const selectedItems = aiItems.filter(item => selectedStatements.includes(item.index))
    // Remove bold formatting (**text**) from AI response
    const statementText = selectedItems[0].option.replace(/\*\*/g, '')
    
    setSelectedTopic(prev => ({ ...prev, topic_statement: statementText }))
    setAiResultModalOpen(false)
    setSelectedStatements([])
    setAiError('')
  }
  
  // Apply selected global contexts
  const applySelectedGlobalContexts = () => {
    // Clear previous errors
    setAiError('')
    
    if (selectedGlobalContexts.length === 0) {
      setAiError('⚠️ Please select at least one global context.')
      return
    }
    
    // Get selected context names
    const selectedItems = aiItems.filter(item => selectedGlobalContexts.includes(item.index))
    const contextNames = selectedItems.map(item => item.option).join(', ')
    
    setSelectedTopic(prev => ({ ...prev, topic_global_context: contextNames }))
    setAiResultModalOpen(false)
    setSelectedGlobalContexts([])
    setAiError('')
  }
  
  // Apply selected key concepts
  const applySelectedKeyConcepts = () => {
    // Clear previous errors
    setAiError('')
    
    if (selectedKeyConcepts.length === 0) {
      setAiError('⚠️ Please select at least one key concept.')
      return
    }
    
    // Get selected concept names
    const selectedItems = aiItems.filter(item => selectedKeyConcepts.includes(item.index))
    const conceptNames = selectedItems.map(item => item.option).join(', ')
    
    setSelectedTopic(prev => ({ ...prev, topic_key_concept: conceptNames }))
    setAiResultModalOpen(false)
    setSelectedKeyConcepts([])
    setAiError('')
  }
  
  // Apply selected related concepts
  const applySelectedRelatedConcepts = () => {
    setAiError('')
    
    if (selectedRelatedConcepts.length === 0) {
      setAiError('⚠️ Please select at least one related concept.')
      return
    }
    
    // Get all selected concept names and join with comma
    const selectedItems = aiItems.filter(item => selectedRelatedConcepts.includes(item.index))
    const conceptNames = selectedItems.map(item => item.option).join(', ')
    
    setSelectedTopic(prev => ({ ...prev, topic_related_concept: conceptNames }))
    setAiResultModalOpen(false)
    setSelectedRelatedConcepts([])
    setAiError('')
  }
  
  // Apply selected learner profiles
  const applySelectedLearnerProfiles = () => {
    setAiError('')
    
    if (selectedLearnerProfiles.length === 0) {
      setAiError('⚠️ Please select at least one learner profile attribute.')
      return
    }
    
    // Normalize function to match exact learner profile names
    const normalizeLearnerProfile = (name) => {
      const normalized = name.trim()
      // Case-insensitive match with learnerProfiles array
      const match = learnerProfiles.find(
        profile => profile.toLowerCase() === normalized.toLowerCase()
      )
      return match || normalized
    }
    
    // Get all selected profile names, normalize them, and join with comma
    const selectedItems = aiItems.filter(item => selectedLearnerProfiles.includes(item.index))
    const profileNames = selectedItems
      .map(item => normalizeLearnerProfile(item.option))
      .join(', ')
    
    setSelectedTopic(prev => ({ ...prev, topic_learner_profile: profileNames }))
    setAiResultModalOpen(false)
    setSelectedLearnerProfiles([])
    setAiError('')
  }
  
  // Toggle checkbox for service learning selection (single select only)
  const toggleServiceLearning = (index) => {
    const scrollContainer = aiScrollRef.current
    if (!scrollContainer) return
    
    const currentScrollPos = scrollContainer.scrollTop
    const scrollElem = scrollContainer
    
    setSelectedServiceLearning(prev => {
      // Single select: if already selected, deselect. Otherwise, replace with new selection
      const newVal = prev.includes(index) ? [] : [index]
      
      // Force scroll restore in next tick
      Promise.resolve().then(() => {
        scrollElem.scrollTop = currentScrollPos
        setTimeout(() => scrollElem.scrollTop = currentScrollPos, 0)
        requestAnimationFrame(() => scrollElem.scrollTop = currentScrollPos)
      })
      
      return newVal
    })
  }
  
  // Toggle checkbox for resources selection (multi-select)
  const toggleResources = (index) => {
    const scrollContainer = aiScrollRef.current
    if (!scrollContainer) return
    
    const currentScrollPos = scrollContainer.scrollTop
    const scrollElem = scrollContainer
    
    setSelectedResources(prev => {
      const newVal = prev.includes(index)
        ? prev.filter(i => i !== index)
        : [...prev, index]
      
      // Force scroll restore in next tick
      Promise.resolve().then(() => {
        scrollElem.scrollTop = currentScrollPos
        setTimeout(() => scrollElem.scrollTop = currentScrollPos, 0)
        requestAnimationFrame(() => scrollElem.scrollTop = currentScrollPos)
      })
      
      return newVal
    })
  }
  
  // Apply selected service learning
  const applySelectedServiceLearning = () => {
    setAiError('')
    
    if (selectedServiceLearning.length === 0) {
      setAiError('⚠️ Please select one service learning option.')
      return
    }
    
    // Get all selected service learning options and join with comma
    const selectedItems = aiItems.filter(item => selectedServiceLearning.includes(item.index))
    const serviceLearningText = selectedItems.map(item => item.option).join(', ')
    
    setSelectedTopic(prev => ({ ...prev, topic_service_learning: serviceLearningText }))
    setAiResultModalOpen(false)
    setSelectedServiceLearning([])
    setAiError('')
  }

  // Apply selected ATL skills to the form
  const applySelectedAtlSkills = () => {
    console.log('🎯 Apply ATL Skills - selectedAtlSkills:', selectedAtlSkills)
    console.log('🎯 Apply ATL Skills - aiItems:', aiItems)
    
    if (selectedAtlSkills.length === 0) {
      alert('Please select at least one ATL skill')
      return
    }

    // Format selected ATL skills as text with strand, descriptor, then summary at the end
    const selectedItems = aiItems.filter(item => selectedAtlSkills.includes(Number(item.id)))
    console.log('🎯 Filtered selectedItems:', selectedItems)
    
    const atlText = selectedItems.map(item => {
      // Strand and cluster
      const strandLine = `${item.strand} - ${item.cluster}\n`
      // Descriptor text
      const descriptorLine = `${item.descriptor_text}`
      // Summary sentence at the end (just the text, no quotes)
      const summaryLine = item.summary_sentence ? `\n${item.summary_sentence}` : ''
      return strandLine + descriptorLine + summaryLine
    }).join('\n\n')
    
    console.log('🎯 Final ATL text:', atlText)

    setSelectedTopic(prev => {
      const updated = { ...prev, topic_atl: atlText }
      console.log('🎯 Updated topic:', updated)
      return updated
    })
    setAiResultModalOpen(false)
    setSelectedAtlSkills([])
    setAiError('')
  }
  
  // Apply selected resources
  const applySelectedResources = () => {
    setAiError('')
    
    if (selectedResources.length === 0) {
      setAiError('⚠️ Please select at least one resource.')
      return
    }
    
    // Get all selected resources and format with link for better readability
    const selectedItems = aiItems.filter(item => selectedResources.includes(item.index))
    const resourcesText = selectedItems.map(item => {
      const title = (item.option || '').replace(/\*\*/g, '')
      const link = (item.link || '').replace(/\*\*/g, '')
      // Format: "Resource Title (URL)" or just "Resource Title" if no link
      return link ? `${title}\n${link}` : title
    }).join('\n\n')
    
    setSelectedTopic(prev => ({ ...prev, topic_resources: resourcesText }))
    setAiResultModalOpen(false)
    setSelectedResources([])
    setAiError('')
  }
  
  // Apply selected assessment relationship
  const [selectedAssessmentRelationship, setSelectedAssessmentRelationship] = useState([])
  const applySelectedAssessmentRelationship = () => {
    setAiError('')
    
    if (selectedAssessmentRelationship.length === 0) {
      setAiError('⚠️ Please select one relationship explanation.')
      return
    }
    
    // Get selected relationship option
    const selectedItem = aiItems.find(item => selectedAssessmentRelationship.includes(item.index))
    if (selectedItem) {
      setWizardAssessment(prev => ({ ...prev, assessment_relationship: selectedItem.option }))
    }
    
    setAiResultModalOpen(false)
    setSelectedAssessmentRelationship([])
    setAiError('')
  }
  
  // Apply selected inquiry questions
  const applySelectedInquiryQuestions = () => {
    // Clear previous errors
    setAiError('')
    
    if (selectedInquiryQuestions.length === 0) {
      setAiError('⚠️ Please select at least one question from each category before applying.')
      return
    }
    
    // Validate at least 1 from each category
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
    
    // Combine selected questions
    const factualQuestions = selectedItems
      .filter(item => item.category === 'Factual')
      .map(item => item.option)
      .join('\n')
    
    const conceptualQuestions = selectedItems
      .filter(item => item.category === 'Conceptual')
      .map(item => item.option)
      .join('\n')
    
    const debatableQuestions = selectedItems
      .filter(item => item.category === 'Debatable')
      .map(item => item.option)
      .join('\n')
    
    const combinedText = `FACTUAL:\n${factualQuestions}\n\nCONCEPTUAL:\n${conceptualQuestions}\n\nDEBATABLE:\n${debatableQuestions}`
    
    setSelectedTopic(prev => ({ ...prev, topic_inquiry_question: combinedText }))
    setAiResultModalOpen(false)
    setSelectedInquiryQuestions([])
    setAiError('')
  }
  
  // Wizard navigation
  const goToStep = (stepIndex) => {
    setCurrentStep(stepIndex)
    
    // If going to TSC step, fetch strands
    if (plannerSteps[stepIndex]?.id === 'tsc') {
      if (wizardAssessment.selected_criteria.length > 0 && selectedTopic.topic_year) {
        fetchStrandsForCriteria(wizardAssessment.selected_criteria, selectedTopic.topic_year)
      }
    }
  }
  
  const goToNextStep = () => {
    if (currentStep < plannerSteps.length - 1) {
      goToStep(currentStep + 1)
    }
  }
  
  const goToPreviousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }
  
  // Check if current step is completed
  const isStepCompleted = (stepIndex) => {
    const step = plannerSteps[stepIndex]
    
    // Step 5 (Assessment) has different validation - uses wizardAssessment state
    if (step.id === 'assessment') {
      // Check required fields (date will be submitted later)
      if (!wizardAssessment.assessment_nama?.trim() ||
          !wizardAssessment.assessment_semester?.trim() ||
          !wizardAssessment.selected_criteria?.length) {
        return false
      }
      
      return true
    }
    
    // Step 6 (Relationship) - uses wizardAssessment.assessment_relationship
    if (step.id === 'relationship') {
      return wizardAssessment.assessment_relationship?.trim() !== ''
    }
    
    // Step 7 (TSC) - check if all expected TSC fields are filled
    if (step.id === 'tsc') {
      // If no criteria selected or no strands, cannot be complete
      if (!wizardAssessment.selected_criteria?.length || wizardStrands.length === 0) {
        return false
      }
      
      // Check if all required TSC fields are filled
      const requiredTSCKeys = []
      const bandLevels = ['7-8', '5-6', '3-4', '1-2']
      
      wizardAssessment.selected_criteria.forEach(criterionId => {
        const criterionStrands = wizardStrands.filter(s => s.criterion_id === criterionId)
        criterionStrands.forEach(strand => {
          bandLevels.forEach(bandLabel => {
            const rubric = wizardRubrics.find(r => r.strand_id === strand.strand_id && r.band_label === bandLabel)
            if (rubric) {
              requiredTSCKeys.push(`${criterionId}_${bandLabel}_${strand.label}`)
            }
          })
        })
      })
      
      // If no TSC data at all, incomplete
      if (!wizardAssessment.assessment_tsc || Object.keys(wizardAssessment.assessment_tsc).length === 0) {
        return false
      }
      
      // All required TSC keys must have content
      const allFilled = requiredTSCKeys.every(key => {
        const value = wizardAssessment.assessment_tsc[key]
        return value && value.trim() !== ''
      })
      
      return allFilled
    }
    
    // Step 8 (Reflection) - at least prior reflection should be filled
    if (step.id === 'reflection') {
      return selectedTopic.topic_reflection_prior?.trim() !== ''
    }
    
    return step.fields.every(field => {
      const value = selectedTopic[field]
      return value && value.toString().trim() !== '' && value !== '0'
    })
  }
  
  // Get completion progress
  const getCompletionProgress = () => {
    const completedSteps = plannerSteps.filter((_, index) => isStepCompleted(index)).length
    return { completed: completedSteps, total: plannerSteps.length }
  }

  // Get list of missing required fields
  const getMissingFields = () => {
    const missing = []
    
    // Step 0: Basic Information
    if (!selectedTopic.topic_nama?.trim()) missing.push({ step: 1, field: 'Unit Title' })
    if (!selectedTopic.topic_subject_id) missing.push({ step: 1, field: 'Subject' })
    if (!selectedTopic.topic_kelas_id) missing.push({ step: 1, field: 'Class' })
    if (!selectedTopic.topic_urutan) missing.push({ step: 1, field: 'Unit Number' })
    if (!selectedTopic.topic_duration) missing.push({ step: 1, field: 'Duration (weeks)' })
    if (!selectedTopic.topic_hours_per_week) missing.push({ step: 1, field: 'Hours per Week' })
    
    // Step 1: Inquiry Question
    if (!selectedTopic.topic_inquiry_question?.trim()) missing.push({ step: 2, field: 'Inquiry Question' })
    
    // Step 2: Key & Related Concepts
    if (!selectedTopic.topic_key_concept?.trim()) missing.push({ step: 3, field: 'Key Concept' })
    if (!selectedTopic.topic_related_concept?.trim()) missing.push({ step: 3, field: 'Related Concept' })
    if (!selectedTopic.topic_global_context?.trim()) missing.push({ step: 3, field: 'Global Context' })
    
    // Step 3: Statement of Inquiry
    if (!selectedTopic.topic_statement?.trim()) missing.push({ step: 4, field: 'Statement of Inquiry' })
    
    // Step 4: Learner Profile & Service
    if (!selectedTopic.topic_learner_profile?.trim()) missing.push({ step: 5, field: 'Learner Profile' })
    if (!selectedTopic.topic_service_learning?.trim()) missing.push({ step: 5, field: 'Service Learning' })
    if (!selectedTopic.topic_atl?.trim()) missing.push({ step: 5, field: 'ATL Skills' })
    
    // Step 5: Assessment
    if (!wizardAssessment.selected_criteria?.length) missing.push({ step: 6, field: 'Criteria to Assess' })
    if (!wizardAssessment.assessment_nama?.trim()) missing.push({ step: 6, field: 'Assessment Name' })
    if (!wizardAssessment.assessment_semester?.trim()) missing.push({ step: 6, field: 'Semester' })
    if (!wizardAssessment.assessment_conceptual_understanding?.trim()) missing.push({ step: 6, field: 'Conceptual Understanding' })
    if (!wizardAssessment.assessment_task_specific_description?.trim()) missing.push({ step: 6, field: 'Task Specific Description' })
    if (!wizardAssessment.assessment_instructions?.trim()) missing.push({ step: 6, field: 'Assessment Instructions' })
    
    // Step 6: Relationship
    if (!wizardAssessment.assessment_relationship?.trim()) missing.push({ step: 7, field: 'Relationship: Assessment & Statement of Inquiry' })
    
    return missing
  }

  // Save new topic
  const handleAddTopic = async (fieldName, value) => {
    if (!isAddMode) return handleSave(fieldName, value)
    
    // For add mode, just update the temporary topic state
    setSelectedTopic(prev => ({ ...prev, [fieldName]: value }))
  }

  // Final save for new topic
  const saveNewTopic = async () => {
    if (!selectedTopic.topic_nama) {
      alert('Please enter a topic name')
      return
    }
    if (!selectedTopic.topic_year) {
      alert('Please select MYP Year')
      return
    }
    
    // Validate ATL field
    if (!selectedTopic.topic_atl?.trim()) {
      alert('Please fill in ATL Skills (Approaches to Learning)')
      return
    }
    
    // Validate assessment required fields (tanggal tidak wajib saat create)
    if (!wizardAssessment.assessment_nama || 
        !wizardAssessment.assessment_semester || wizardAssessment.selected_criteria.length === 0 ||
        !wizardAssessment.assessment_conceptual_understanding?.trim() ||
        !wizardAssessment.assessment_task_specific_description?.trim() ||
        !wizardAssessment.assessment_instructions?.trim()) {
      alert('Please complete all assessment fields including Conceptual Understanding, Task Description, and Instructions')
      return
    }
    
    // Validate assessment date only if provided
    if (wizardAssessment.assessment_tanggal) {
      const selectedDate = new Date(wizardAssessment.assessment_tanggal)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      selectedDate.setHours(0, 0, 0, 0)
      
      // Check if date is in the past
      if (selectedDate < today) {
        alert('Assessment date cannot be in the past. Please select a future date.')
        return
      }
      
      // Check if date is tomorrow (must be minimum 2 days ahead)
      const getDaysDiff = (date1, date2) => {
        const diffTime = Math.abs(date2 - date1)
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      }
      
      const daysDiff = getDaysDiff(today, selectedDate)
      if (daysDiff === 1) {
        alert('Assessment date cannot be tomorrow. Minimum 2 days ahead is required.')
        return
      }
    }

    setSaving(true)
    try {
      // Prepare data with proper types
      const topicData = {
        ...selectedTopic,
        topic_year: selectedTopic.topic_year ? parseInt(selectedTopic.topic_year) : null,
        topic_relationship_summative_assessment_statement_of_inquiry: wizardAssessment.assessment_relationship || null
      }
      
      const { data, error } = await supabase
        .from('topic')
        .insert([topicData])
        .select()
      
      if (error) throw error
      
      if (data && data[0]) {
        const newTopic = data[0]
        
        // Now create the assessment
        // First, find detail_kelas_id for subject + kelas combination
        const { data: dkData, error: dkError } = await supabase
          .from('detail_kelas')
          .select('detail_kelas_id')
          .eq('detail_kelas_subject_id', selectedTopic.topic_subject_id)
          .eq('detail_kelas_kelas_id', selectedTopic.topic_kelas_id)
          .single()
        
        if (dkError) {
          console.error('❌ Error finding detail_kelas:', dkError)
          throw new Error('Could not find class-subject mapping. Please check detail_kelas.')
        }
        
        // Create assessment
        // Status logic: null if no date (draft), 0 if date is set (waiting for approval)
        const hasDate = wizardAssessment.assessment_tanggal && wizardAssessment.assessment_tanggal.trim() !== ''
        const assessmentData = {
          assessment_nama: wizardAssessment.assessment_nama,
          assessment_tanggal: wizardAssessment.assessment_tanggal || null,
          assessment_keterangan: wizardAssessment.assessment_keterangan || null,
          assessment_conceptual_understanding: wizardAssessment.assessment_conceptual_understanding || null,
          assessment_task_specific_description: wizardAssessment.assessment_task_specific_description || null,
          assessment_instructions: wizardAssessment.assessment_instructions || null,
          assessment_tsc: wizardAssessment.assessment_tsc || {}, // Task Specific Clarification JSON
          assessment_detail_kelas_id: dkData.detail_kelas_id,
          assessment_topic_id: newTopic.topic_id,
          assessment_semester: parseInt(wizardAssessment.assessment_semester),
          assessment_status: 0, // Always 0; draft is indicated by null date + status 0
          assessment_user_id: currentUserId
        }
        
        console.log('📝 Saving assessment with TSC:', JSON.stringify(wizardAssessment.assessment_tsc, null, 2))
        console.log('📝 Full assessmentData being saved:', JSON.stringify(assessmentData, null, 2))
        
        const { data: assessmentResult, error: assessmentError } = await supabase
          .from('assessment')
          .insert([assessmentData])
          .select()
        
        if (assessmentError) {
          console.error('❌ Assessment insert error:', assessmentError)
          throw assessmentError
        }
        
        console.log('✅ Assessment saved successfully:', assessmentResult)
        
        // Send notification only if date is set (status = 0 with date = approval request)
        if (assessmentResult && assessmentResult[0] && hasDate) {
          notifyVicePrincipal(assessmentResult[0].assessment_id)
        }
        
        // Insert assessment_criteria junction records
        if (assessmentResult && assessmentResult[0]) {
          const assessmentId = assessmentResult[0].assessment_id
          const criteriaRecords = wizardAssessment.selected_criteria.map(criterionId => ({
            assessment_id: assessmentId,
            criterion_id: criterionId
          }))
          
          const { error: criteriaError } = await supabase
            .from('assessment_criteria')
            .insert(criteriaRecords)
          
          if (criteriaError) {
            console.error('❌ Error inserting assessment criteria:', criteriaError)
          }
        }
        
        // Refresh topics list from server to ensure consistency
        const subjectIds = subjects.map(s => s.subject_id)
        if (subjectIds.length > 0) {
          await fetchTopics(subjectIds)
        }
        
        // Reset wizard assessment state
        setWizardAssessment({
          assessment_nama: '',
          assessment_tanggal: '',
          assessment_keterangan: '',
          assessment_semester: '',
          assessment_relationship: '',
          assessment_conceptual_understanding: '',
          assessment_task_specific_description: '',
          assessment_instructions: '',
          selected_criteria: [],
          assessment_tsc: {}
        })
        setWizardStrands([])
        setWizardRubrics([])
        
        // Show success notification
        setSaveNotification(true)
        setTimeout(() => setSaveNotification(false), 2000)
        
        // Close modal
        setModalOpen(false)
        setIsAddMode(false)
      }
    } catch (err) {
      console.error('❌ Error saving new topic:', err)
      alert('Failed to create topic: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  // Update existing topic (edit mode)
  const updateExistingTopic = async () => {
    if (!selectedTopic.topic_nama) {
      alert('Please enter a topic name')
      return
    }
    if (!selectedTopic.topic_year) {
      alert('Please select MYP Year')
      return
    }

    setSaving(true)
    try {
      // Prepare data with proper types
      const topicData = {
        ...selectedTopic,
        topic_year: selectedTopic.topic_year ? parseInt(selectedTopic.topic_year) : null,
        topic_relationship_summative_assessment_statement_of_inquiry: wizardAssessment.assessment_relationship || null
      }
      
      const { error } = await supabase
        .from('topic')
        .update(topicData)
        .eq('topic_id', selectedTopic.topic_id)
      
      if (error) throw error
      
      // Update assessment including TSC
      const { data: existingAssessment } = await supabase
        .from('assessment')
        .select('assessment_id')
        .eq('assessment_topic_id', selectedTopic.topic_id)
        .single()
      
      if (existingAssessment) {
        console.log('📝 Updating assessment with TSC:', wizardAssessment.assessment_tsc)
        const { error: assessmentError } = await supabase
          .from('assessment')
          .update({
            assessment_tsc: wizardAssessment.assessment_tsc || {}
          })
          .eq('assessment_id', existingAssessment.assessment_id)
        
        if (assessmentError) {
          console.error('❌ Error updating assessment TSC:', assessmentError)
        } else {
          console.log('✅ Assessment TSC updated successfully')
        }
      }
      
      // Refresh topics list - get subject IDs from current subjects state
      const subjectIds = subjects.map(s => s.subject_id)
      if (subjectIds.length > 0) {
        await fetchTopics(subjectIds)
      }
      
      setSaveNotification(true)
      setTimeout(() => setSaveNotification(false), 2000)
      
      // Close modal
      setModalOpen(false)
      setIsAddMode(false)
      setCurrentStep(0)
    } catch (err) {
      console.error('❌ Error updating topic:', err)
      alert('Failed to update topic: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  // Fetch assessment for a topic (edit mode)
  const fetchTopicAssessment = async (topicId, subjectId) => {
    try {
      setTopicAssessment(null)
      setTopicAssessmentCriteria([])
      setEditingAssessmentInTopic(false)
      
      // Fetch criteria for this subject
      if (subjectId) {
        const { data: criteriaData } = await supabase
          .from('criteria')
          .select('criterion_id, code, name')
          .eq('subject_id', subjectId)
          .order('code')
        
        setWizardCriteria(criteriaData || [])
      }
      
      // Fetch assessment linked to this topic
      const { data: assessmentData, error } = await supabase
        .from('assessment')
        .select(`
          assessment_id,
          assessment_nama,
          assessment_tanggal,
          assessment_keterangan,
          assessment_semester,
          assessment_status,
          assessment_tsc,
          assessment_criteria (criterion_id)
        `)
        .eq('assessment_topic_id', topicId)
        .single()
      
      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching topic assessment:', error)
        return
      }
      
      if (assessmentData) {
        setTopicAssessment({
          ...assessmentData,
          selected_criteria: assessmentData.assessment_criteria?.map(c => c.criterion_id) || [],
          assessment_tsc: assessmentData.assessment_tsc || {}
        })
        setTopicAssessmentCriteria(assessmentData.assessment_criteria?.map(c => c.criterion_id) || [])
        
        // Also sync to wizardAssessment for Step 7 TSC editing
        setWizardAssessment(prev => ({
          ...prev,
          assessment_nama: assessmentData.assessment_nama || '',
          assessment_tanggal: assessmentData.assessment_tanggal || '',
          assessment_keterangan: assessmentData.assessment_keterangan || '',
          assessment_semester: assessmentData.assessment_semester?.toString() || '',
          selected_criteria: assessmentData.assessment_criteria?.map(c => c.criterion_id) || [],
          assessment_tsc: assessmentData.assessment_tsc || {}
        }))
      } else {
        // No assessment yet, set up empty state for creating one
        setTopicAssessment({
          assessment_id: null,
          assessment_nama: '',
          assessment_tanggal: '',
          assessment_keterangan: '',
          assessment_semester: '',
          assessment_status: 0,
          selected_criteria: []
        })
      }
    } catch (err) {
      console.error('Error fetching topic assessment:', err)
    }
  }

  // Generate PDF for a topic
  const handleGeneratePDF = async (topic, event) => {
    if (event) {
      event.stopPropagation() // Prevent card click
    }
    
    try {
      // Load complete topic data
      const { data: topicData, error: topicErr } = await supabase
        .from("topic")
        .select("*")
        .eq("topic_id", topic.topic_id)
        .single();
      
      if (topicErr) throw new Error(topicErr.message);

      // Load subject data
      let subject = null;
      let teacher = null;
      if (topicData.topic_subject_id) {
        const { data: subjectData, error: subjectErr } = await supabase
          .from("subject")
          .select("subject_name, subject_user_id")
          .eq("subject_id", topicData.topic_subject_id)
          .single();
        
        if (!subjectErr && subjectData) {
          subject = subjectData;

          // Load teacher data from subject_user_id
          if (subjectData?.subject_user_id) {
            const { data: teacherData, error: teacherErr } = await supabase
              .from("users")
              .select("user_nama_depan, user_nama_belakang")
              .eq("user_id", subjectData.subject_user_id)
              .single();
            
            if (!teacherErr && teacherData) {
              teacher = {
                name: `${teacherData.user_nama_depan || ''} ${teacherData.user_nama_belakang || ''}`.trim()
              };
            }
          }
        }
      }

      // Fallback: if teacher still null, try to get current user name
      if (!teacher && currentUserId) {
        const { data: currentUser, error: userErr } = await supabase
          .from("users")
          .select("user_nama_depan, user_nama_belakang")
          .eq("user_id", currentUserId)
          .single();
        
        if (!userErr && currentUser) {
          teacher = {
            name: `${currentUser.user_nama_depan || ''} ${currentUser.user_nama_belakang || ''}`.trim()
          };
        }
      }

      // Load kelas data
      let kelas = null;
      if (topicData.topic_kelas_id) {
        const { data: kelasData, error: kelasErr } = await supabase
          .from("kelas")
          .select("kelas_nama")
          .eq("kelas_id", topicData.topic_kelas_id)
          .single();
        
        if (!kelasErr && kelasData) {
          kelas = kelasData;
        }
      }

      // Load weekly planner data
      const { data: weeklyPlans, error: weeklyErr } = await supabase
        .from("topic_weekly_plan")
        .select("*")
        .eq("topic_id", topic.topic_id)
        .order("week_number", { ascending: true });
      
      console.log('Weekly plans for PDF:', weeklyPlans);

      // Generate PDF
      const pdf = new jsPDF('landscape', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const margin = 14;
      let yPos = 10;

      // Calculate total hours
      const duration = parseFloat(topicData.topic_duration) || 0;
      const hoursPerWeek = parseFloat(topicData.topic_hours_per_week) || 0;
      const totalHours = duration * hoursPerWeek;
      
      console.log('PDF Data - Duration:', topicData.topic_duration, 'Hours/Week:', topicData.topic_hours_per_week, 'Total:', totalHours);

      const availableWidth = pageWidth - (margin * 2);

      // MYP unit planner title
      pdf.setFontSize(13.5);
      pdf.setFont('helvetica', 'bold');
      pdf.text('MYP unit planner', margin, yPos);
      yPos += 8;

      // Header Table  
      autoTable(pdf, {
        startY: yPos,
        margin: { left: margin, right: margin },
        head: [],
        body: [
          [
            { content: 'Teacher(s)', styles: { fontStyle: 'bold', fillColor: [232, 232, 232] }},
            { content: teacher?.name || 'N/A', colSpan: 2 },
            { content: 'Subject group and discipline', styles: { fontStyle: 'bold', fillColor: [232, 232, 232] }},
            { content: subject?.subject_name || 'N/A', colSpan: 2 },
          ],
          [
            { content: 'Unit title', styles: { fontStyle: 'bold', fillColor: [232, 232, 232] }},
            { content: topicData.topic_nama || 'N/A' },
            { content: 'MYP year', styles: { fontStyle: 'bold', fillColor: [232, 232, 232] }},
            { content: topicData.topic_year ? `Year ${topicData.topic_year}` : 'N/A' },
            { content: 'Unit duration (hrs)', styles: { fontStyle: 'bold', fillColor: [232, 232, 232] }},
            { content: totalHours > 0 ? totalHours.toString() : (topicData.topic_duration || 'N/A') },
          ],
        ],
        theme: 'grid',
        styles: { fontSize: 9.5, cellPadding: 3, lineColor: [0, 0, 0], lineWidth: 0.2, textColor: [0, 0, 0] },
        columnStyles: {
          0: { cellWidth: availableWidth * 0.15 },
          1: { cellWidth: availableWidth * 0.18 },
          2: { cellWidth: availableWidth * 0.17 },
          3: { cellWidth: availableWidth * 0.17 },
          4: { cellWidth: availableWidth * 0.15 },
          5: { cellWidth: availableWidth * 0.18 } } });

      // Inquiry section
      yPos = pdf.lastAutoTable.finalY + 8;
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Inquiry: Establishing the purpose of the unit', margin, yPos);
      yPos += 6;

      autoTable(pdf, {
        startY: yPos,
        margin: { left: margin, right: margin },
        head: [],
        body: [
          [
            { content: 'Key concept', styles: { fontStyle: 'bold', fillColor: [232, 232, 232] }},
            { content: topicData.topic_key_concept || 'N/A' },
            { content: 'Related concept(s)', styles: { fontStyle: 'bold', fillColor: [232, 232, 232] }},
            { content: topicData.topic_related_concept || 'N/A' },
            { content: 'Global context', styles: { fontStyle: 'bold', fillColor: [232, 232, 232] }},
            { content: topicData.topic_global_context || 'N/A' },
          ],
          [
            { content: 'Statement of inquiry', styles: { fontStyle: 'bold', fillColor: [232, 232, 232] }, colSpan: 6 },
          ],
          [
            { content: topicData.topic_statement || 'N/A', colSpan: 6, styles: { cellPadding: 3 } },
          ],
          [
            { content: 'Inquiry questions', styles: { fontStyle: 'bold', fillColor: [232, 232, 232] }, colSpan: 6 },
          ],
          [
            { content: topicData.topic_inquiry_question || 'N/A', colSpan: 6, styles: { cellPadding: 3 } },
          ],
        ],
        theme: 'grid',
        styles: { fontSize: 9.5, cellPadding: 3, lineColor: [0, 0, 0], lineWidth: 0.2, valign: 'top', textColor: [0, 0, 0] },
        columnStyles: {
          0: { cellWidth: availableWidth * 0.15 },
          1: { cellWidth: availableWidth * 0.18 },
          2: { cellWidth: availableWidth * 0.17 },
          3: { cellWidth: availableWidth * 0.17 },
          4: { cellWidth: availableWidth * 0.15 },
          5: { cellWidth: availableWidth * 0.18 } } });

      // Add new page for remaining sections
      pdf.addPage();
      yPos = 10;

      // Objectives section
      if (topicData.topic_myp_objectives) {
        autoTable(pdf, {
          startY: yPos,
          head: [],
          body: [
            [{ content: 'Objectives', styles: { fontStyle: 'bold', fillColor: [232, 232, 232] }}],
            [{ content: topicData.topic_myp_objectives || 'N/A', styles: { cellPadding: 3 } }],
          ],
          theme: 'grid',
          styles: { fontSize: 9.5, cellPadding: 3, lineColor: [0, 0, 0], lineWidth: 0.2, textColor: [0, 0, 0] } });
        yPos = pdf.lastAutoTable.finalY + 5;
      }

      // Summative assessment - special 2-row structure
      autoTable(pdf, {
        startY: yPos,
        margin: { left: margin, right: margin },
        head: [],
        body: [
          [
            { content: 'Objectives', styles: { fontStyle: 'bold', fillColor: [232, 232, 232] }, rowSpan: 2 },
            { content: 'Summative assessment', styles: { fontStyle: 'bold', fillColor: [232, 232, 232], halign: 'center' }, colSpan: 2 },
          ],
          [
            { content: 'Outline of summative assessment task(s) including assessment criteria:', styles: { fontStyle: 'bold', fillColor: [232, 232, 232] }},
            { content: 'Relationship between summative assessment task(s) and statement of inquiry:', styles: { fontStyle: 'bold', fillColor: [232, 232, 232] }},
          ],
          [
            { content: '', styles: { cellPadding: 3 }},
            { content: topicData.topic_summative_assessment || 'N/A', styles: { cellPadding: 3 }},
            { content: topicData.topic_relationship_summative_assessment_statement_of_inquiry || 'N/A', styles: { cellPadding: 3 }},
          ],
        ],
        theme: 'grid',
        styles: { fontSize: 9.5, cellPadding: 3, lineColor: [0, 0, 0], lineWidth: 0.2, valign: 'top', textColor: [0, 0, 0] },
        columnStyles: {
          0: { cellWidth: availableWidth * 0.33 },
          1: { cellWidth: availableWidth * 0.335 },
          2: { cellWidth: availableWidth * 0.335 } } });
      yPos = pdf.lastAutoTable.finalY + 5;

      // ATL section - use text field directly
      autoTable(pdf, {
        startY: yPos,
        margin: { left: margin, right: margin },
        head: [],
        body: [
          [{ content: 'Approaches to learning (ATL)', styles: { fontStyle: 'bold', fillColor: [232, 232, 232] }}],
          [{ content: topicData.topic_atl || 'No ATL skills defined', styles: { cellPadding: 3 }}],
        ],
        theme: 'grid',
        styles: { fontSize: 9.5, cellPadding: 3, lineColor: [0, 0, 0], lineWidth: 0.2, valign: 'top', textColor: [0, 0, 0] } });
      yPos = pdf.lastAutoTable.finalY + 5;

      // Content & Learning process section - only show activities
      // Format weekly plans into single string (only activities)
      let learningProcessContent = '';
      if (weeklyPlans && weeklyPlans.length > 0) {
        learningProcessContent = weeklyPlans.map(week => {
          let weekText = `Week ${week.week_number}\n`;
          if (week.week_activities) weekText += week.week_activities;
          return weekText;
        }).join('\n\n');
      }

      autoTable(pdf, {
        startY: yPos,
        margin: { left: margin, right: margin },
        head: [],
        body: [
          [
            { content: 'Content', styles: { fontStyle: 'bold', fillColor: [232, 232, 232] }},
            { content: 'Learning process', styles: { fontStyle: 'bold', fillColor: [232, 232, 232] }},
          ],
          [
            { content: '', styles: { cellPadding: 3 }, rowSpan: 2 },
            { content: learningProcessContent, styles: { cellPadding: 3 }},
          ],
          [
            { content: `Formative assessment:\n\n${topicData.topic_formative_assessment || ''}`, styles: { cellPadding: 3 }},
          ],
        ],
        theme: 'grid',
        styles: { fontSize: 9.5, cellPadding: 3, lineColor: [0, 0, 0], lineWidth: 0.2, valign: 'top', textColor: [0, 0, 0] },
        columnStyles: {
          0: { cellWidth: availableWidth * 0.33 },
          1: { cellWidth: availableWidth * 0.67 } } });
      yPos = pdf.lastAutoTable.finalY + 5;

      // Resources section - 2-row table
      autoTable(pdf, {
        startY: yPos,
        margin: { left: margin, right: margin },
        head: [],
        body: [
          [{ content: 'Resources', styles: { fontStyle: 'bold', fillColor: [232, 232, 232] }}],
          [{ content: topicData.topic_resources || '', styles: { cellPadding: 3 }}],
        ],
        theme: 'grid',
        styles: { fontSize: 9.5, cellPadding: 3, lineColor: [0, 0, 0], lineWidth: 0.2, valign: 'top', textColor: [0, 0, 0] } });
      yPos = pdf.lastAutoTable.finalY + 5;

      // Reflection section with special text and 3-column table
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Reflection: Considering the planning, process and impact of the inquiry', margin, yPos);
      yPos += 6;

      // Reflection section
      autoTable(pdf, {
        startY: yPos,
        margin: { left: margin, right: margin },
        head: [],
        body: [
          [
            { content: 'Prior to teaching the unit', styles: { fontStyle: 'bold', fillColor: [232, 232, 232] }},
            { content: 'During teaching', styles: { fontStyle: 'bold', fillColor: [232, 232, 232] }},
            { content: 'After teaching the unit', styles: { fontStyle: 'bold', fillColor: [232, 232, 232] }},
          ],
          [
            { content: topicData.topic_reflection_prior || '', styles: { cellPadding: 3 }},
            { content: topicData.topic_reflection_during || '', styles: { cellPadding: 3 }},
            { content: topicData.topic_reflection_after || '', styles: { cellPadding: 3 }},
          ],
        ],
        theme: 'grid',
        styles: { fontSize: 9.5, cellPadding: 3, lineColor: [0, 0, 0], lineWidth: 0.2, valign: 'top', textColor: [0, 0, 0] },
        columnStyles: {
          0: { cellWidth: availableWidth * 0.33 },
          1: { cellWidth: availableWidth * 0.33 },
          2: { cellWidth: availableWidth * 0.34 } } });
      yPos = pdf.lastAutoTable.finalY + 5;

      // Remaining sections
      const sections = [
        { label: 'Differentiation', content: topicData.topic_differentiation },
      ];

      sections.forEach((section) => {
        if (section.content) {
          autoTable(pdf, {
            startY: yPos,
            head: [],
            body: [
              [{ content: section.label, styles: { fontStyle: 'bold', fillColor: [232, 232, 232] }, colSpan: 8 }],
              [{ content: section.content, colSpan: 8, styles: { cellPadding: 3 } }],
            ],
            theme: 'grid',
            styles: { fontSize: 9.5, cellPadding: 3, lineColor: [0, 0, 0], lineWidth: 0.2, textColor: [0, 0, 0] }
          });
          yPos = pdf.lastAutoTable.finalY + 5;
        }
      });

      // Save PDF
      const fileName = `unit-planner-${topicData.topic_nama?.replace(/[^a-z0-9]/gi, '-') || 'topic'}.pdf`;
      pdf.save(fileName);
      
      // Show success notification
      setSaveNotification(true);
      setTimeout(() => setSaveNotification(false), 2000);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert(`Failed to generate PDF: ${error.message}`);
    }
  };

  const openAssessmentHtml = async (payload) => {
    const res = await fetch('/api/assessment-html', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload) });
    if (!res.ok) {
      let message = '';
      try {
        const err = await res.json();
        message = err?.message || err?.error || '';
      } catch {
        message = await res.text().catch(() => '');
      }
      throw new Error(message || `HTTP ${res.status}`);
    }
    const html = await res.text();
    const blob = new Blob([html], { type: 'text/html' });
    const url = window.URL.createObjectURL(blob);
    window.open(url, '_blank');
    // Clean up after a delay to ensure the window opens
    setTimeout(() => window.URL.revokeObjectURL(url), 1000);
  };

  const downloadAssessmentDocx = async (payload, fileName) => {
    const res = await fetch('/api/assessment-docx', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload) });
    if (!res.ok) {
      let message = '';
      try {
        const err = await res.json();
        message = err?.message || err?.error || '';
      } catch {
        message = await res.text().catch(() => '');
      }
      throw new Error(message || `HTTP ${res.status}`);
    }
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  };

  const buildAssessmentCriteriaForPdf = ({
    selectedCriteriaIds,
    criteriaList,
    strandsData,
    rubricsData,
    tscMap }) => {
    const romanOrder = ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x'];
    const getRomanIndex = (label) => {
      const idx = romanOrder.indexOf((label || '').toLowerCase());
      return idx >= 0 ? idx : 999;
    };

    const criteriaById = new Map((criteriaList || []).map(c => [c.criterion_id, c]));
    const result = [];

    for (const criterionId of selectedCriteriaIds || []) {
      const criterion = criteriaById.get(criterionId);
      const criterionCode = criterion?.code || '';

      const criterionStrands = (strandsData || []).filter(s => s.criterion_id === criterionId);
      if (criterionStrands.length === 0) continue;

      const strandById = new Map(criterionStrands.map(s => [s.strand_id, s]));
      const criterionRubrics = (rubricsData || []).filter(r => strandById.has(r.strand_id));
      if (criterionRubrics.length === 0) continue;

      const bandGroups = {};
      for (const rubric of criterionRubrics) {
        const bandKey = `${rubric.max_score}-${rubric.min_score}`;
        if (!bandGroups[bandKey]) {
          bandGroups[bandKey] = {
            bandLabel: rubric.band_label || bandKey,
            maxScore: rubric.max_score,
            minScore: rubric.min_score,
            subjectItems: [] };
        }
        const strand = strandById.get(rubric.strand_id);
        if (!strand) continue;
        bandGroups[bandKey].subjectItems.push({
          label: strand.label || '',
          text: rubric.description || '' });
      }

      const bands = Object.values(bandGroups)
        .sort((a, b) => (b.maxScore || 0) - (a.maxScore || 0))
        .map(band => {
          const subjectItems = (band.subjectItems || []).slice().sort((a, b) => {
            return getRomanIndex(a.label) - getRomanIndex(b.label);
          });
          const tscItems = subjectItems
            .map(item => {
              const tscKey = `${criterionId}_${band.bandLabel}_${item.label}`;
              const tsc = (tscMap || {})?.[tscKey] || '';
              return tsc ? { label: item.label, text: tsc } : null;
            })
            .filter(Boolean);

          return {
            bandLabel: band.bandLabel,
            subjectItems,
            tscItems };
        });

      if (bands.length > 0) {
        result.push({
          code: criterionCode,
          bands });
      }
    }

    return result;
  };

  // Generate Assessment PDF
  const handleGenerateAssessmentPDF = async () => {
    try {
      // Get current topic data
      const topicData = selectedTopic;
      if (!topicData || !wizardAssessment.assessment_nama) {
        alert('Please complete assessment name first');
        return;
      }

      // Get subject name
      const subjectName = subjectMap.get(topicData.topic_subject_id) || 'N/A';
      
      // Get class name
      const kelasName = kelasNameMap.get(topicData.topic_kelas_id) || 'N/A';
      
      // Get teacher name
      let teacherName = 'N/A';
      if (currentUserId) {
        const { data: userData, error: userErr } = await supabase
          .from("users")
          .select("user_nama_depan, user_nama_belakang")
          .eq("user_id", currentUserId)
          .single();
        
        if (!userErr && userData) {
          teacherName = `${userData.user_nama_depan || ''} ${userData.user_nama_belakang || ''}`.trim();
        }
      }

      // Get selected criteria names
      const selectedCriteriaNames = wizardCriteria
        .filter(c => wizardAssessment.selected_criteria.includes(c.criterion_id))
        .map(c => c.code)
        .join('/');

      // Get proficiency level (MYP Year)
      const proficiencyLevel = topicData.topic_year ? `Phase ${topicData.topic_year}` : 'N/A';

      // Prefer server-side HTML->PDF (true hanging indent via CSS). Fallback to jsPDF if it fails.
      try {
        const selectedCriteriaIds = wizardAssessment.selected_criteria || [];
        const yearLevel = topicData.topic_year || 1;
        const { data: strandsData } = await supabase
          .from('strands')
          .select('*')
          .in('criterion_id', selectedCriteriaIds)
          .eq('year_level', yearLevel)
          .order('label');

        const strandIds = (strandsData || []).map(s => s.strand_id);
        const { data: rubricsData } = await supabase
          .from('rubrics')
          .select('*')
          .in('strand_id', strandIds)
          .order('max_score', { ascending: false });

        const criteriaList = wizardCriteria || [];
        const criteriaSections = buildAssessmentCriteriaForPdf({
          selectedCriteriaIds,
          criteriaList,
          strandsData,
          rubricsData,
          tscMap: wizardAssessment.assessment_tsc || {} });

        const unitName = topicData.topic_urutan
          ? `Unit ${topicData.topic_urutan}`
          : (topicData.topic_nama || 'N/A');

        // Build payload for HTML endpoint matching original PDF format
        const payload = {
          meta: {
            subjectName,
            kelasName,
            unitName,
            assessmentTitle: wizardAssessment.assessment_nama || '',
            teacherName,
            criteriaCodes: selectedCriteriaNames,
            proficiencyLevel,
            keyConcept: topicData.topic_key_concept || 'N/A',
            relatedConcepts: topicData.topic_related_concept || 'N/A',
            conceptualUnderstanding: wizardAssessment.assessment_conceptual_understanding || 'N/A',
            globalContext: topicData.topic_global_context || 'N/A',
            statementOfInquiry: topicData.topic_statement || 'N/A',
            taskSpecificDescription: wizardAssessment.assessment_task_specific_description || 'N/A',
            instructions: wizardAssessment.assessment_instructions || '' },
          criteria: criteriaSections };

        await openAssessmentHtml(payload);

        setSaveNotification(true);
        setTimeout(() => setSaveNotification(false), 2000);
        return;
      } catch (serverErr) {
        console.warn('Server-side assessment PDF failed, falling back to jsPDF:', serverErr);
      }

      // Generate PDF - Portrait A4
      const pdf = new jsPDF('portrait', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const margin = 14;
      let yPos = 15;
      const availableWidth = pageWidth - (margin * 2);

      // Header: ASSESSMENT title (no background, just bold text)
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(0, 0, 0);
      pdf.text('ASSESSMENT', margin, yPos);
      
      yPos += 8;

      // Info section without grid lines
      pdf.setFontSize(9);
      const leftCol = margin;
      const midCol = margin + 90;
      const lineHeight = 6;
      
      // Row 1: Name / Subject
      pdf.setFont('helvetica', 'bold');
      pdf.text('Name', leftCol, yPos);
      pdf.setFont('helvetica', 'normal');
      pdf.text('', leftCol + 25, yPos);
      
      pdf.setFont('helvetica', 'bold');
      pdf.text('Subject', midCol, yPos);
      pdf.setFont('helvetica', 'normal');
      pdf.text(subjectName, midCol + 25, yPos);
      yPos += lineHeight;
      
      // Row 2: Class / Unit
      pdf.setFont('helvetica', 'bold');
      pdf.text('Class', leftCol, yPos);
      pdf.setFont('helvetica', 'normal');
      pdf.text(kelasName, leftCol + 25, yPos);
      
      pdf.setFont('helvetica', 'bold');
      pdf.text('Unit', midCol, yPos);
      pdf.setFont('helvetica', 'normal');
      // Use topic_urutan instead of topic_nama
      const unitNumber = topicData.topic_urutan ? topicData.topic_urutan.toString() : '-';
      pdf.text(unitNumber, midCol + 25, yPos);
      yPos += lineHeight;
      
      // Row 3: Day/Date / Teacher
      pdf.setFont('helvetica', 'bold');
      pdf.text('Day/Date', leftCol, yPos);
      pdf.setFont('helvetica', 'normal');
      pdf.text('', leftCol + 25, yPos);
      
      pdf.setFont('helvetica', 'bold');
      pdf.text('Teacher', midCol, yPos);
      pdf.setFont('helvetica', 'normal');
      pdf.text(teacherName, midCol + 25, yPos);
      
      // Logo and RESULT box on the right
      const resultBoxXWizard = pageWidth - margin - 30;
      const logoYWizard = yPos - 20;
      const resultBoxWidthWizard = 30;
      const resultBoxHeightWizard = 18;
      const borderRadiusWizard = 3;
      
      // Add school logo
      try {
        const logoImg = new Image();
        logoImg.src = '/images/login-logo.png';
        pdf.addImage(logoImg, 'PNG', resultBoxXWizard + 2, logoYWizard, resultBoxWidthWizard - 4, 15);
      } catch (e) {
        console.warn('Could not load logo image:', e);
      }
      
      // Draw rounded rectangle for RESULT box (below logo)
      const resultBoxYWizard = logoYWizard + 17;
      pdf.setDrawColor(0, 0, 0);
      pdf.setLineWidth(0.3);
      pdf.roundedRect(resultBoxXWizard, resultBoxYWizard, resultBoxWidthWizard, resultBoxHeightWizard, borderRadiusWizard, borderRadiusWizard, 'S');
      
      // RESULT label below the box
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(10);
      pdf.setTextColor(0, 0, 0);
      pdf.text('RESULT', resultBoxXWizard + resultBoxWidthWizard/2, resultBoxYWizard + resultBoxHeightWizard + 5, { align: 'center' });
      
      yPos += 25;

      // Assessment Title (large) - moved below header section
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text(wizardAssessment.assessment_nama.toUpperCase(), pageWidth / 2, yPos, { align: 'center' });
      yPos += 12;

      // TASK OVERVIEW section (no blue background)
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(0, 0, 0);
      pdf.text('TASK OVERVIEW', margin, yPos + 3);
      yPos += 8;

      // Task Overview table (no gray background)
      const taskOverviewData = [
        ['Criterion', selectedCriteriaNames || 'N/A'],
        ['Proficiency Level', proficiencyLevel],
        ['Key Concept', topicData.topic_key_concept || 'N/A'],
        ['Related Concepts', topicData.topic_related_concept || 'N/A'],
        ['Conceptual Understanding', wizardAssessment.assessment_conceptual_understanding || 'N/A'],
        ['Global Context Exploration', topicData.topic_global_context || 'N/A'],
        ['Statement of Inquiry', topicData.topic_statement || 'N/A'],
        ['Task Specific Description', wizardAssessment.assessment_task_specific_description || 'N/A'],
      ];

      autoTable(pdf, {
        startY: yPos,
        margin: { left: margin, right: margin },
        head: [],
        body: taskOverviewData.map(row => [
          { content: row[0], styles: { fontStyle: 'bold', cellWidth: 50 }},
          { content: `: ${row[1]}`, styles: { cellWidth: availableWidth - 50 }},
        ]),
        theme: 'grid',
        styles: { fontSize: 9, cellPadding: 4, lineColor: [200, 200, 200], lineWidth: 0.1, valign: 'top', textColor: [0, 0, 0] },
        columnStyles: {
          0: { cellWidth: 50 },
          1: { cellWidth: availableWidth - 50 } } });
      yPos = pdf.lastAutoTable.finalY + 8;

      // Assessment Instructions section - always on page 2
      if (wizardAssessment.assessment_instructions) {
        // Always start instructions on a new page (page 2)
        pdf.addPage();
        yPos = 25;

        // INSTRUCTIONS header
        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(0, 0, 0);
        pdf.text('INSTRUCTIONS:', margin, yPos);
        yPos += 8;

        // Parse instructions - split by numbered items (1., 2., 3., etc.)
        const instructionText = wizardAssessment.assessment_instructions;
        const instructionItems = [];
        
        // Match numbered items like "1.", "2.", etc.
        const regex = /(\d+\.\s*)/g;
        const parts = instructionText.split(regex).filter(p => p.trim());
        
        // Combine number with its content
        for (let i = 0; i < parts.length; i++) {
          if (/^\d+\.\s*$/.test(parts[i]) && parts[i + 1]) {
            instructionItems.push([parts[i].trim(), parts[i + 1].trim()]);
            i++; // Skip the next part as we've combined it
          } else if (!/^\d+\.\s*$/.test(parts[i])) {
            // If no number prefix, add as single item
            instructionItems.push(['', parts[i].trim()]);
          }
        }

        // Create table without borders for numbered list
        autoTable(pdf, {
          startY: yPos,
          margin: { left: margin, right: margin },
          head: [],
          body: instructionItems.map(item => [
            { content: item[0], styles: { fontStyle: 'bold', cellWidth: 8 }},
            { content: item[1], styles: { cellWidth: 'auto' }},
          ]),
          theme: 'plain',
          styles: { 
            fontSize: 9, 
            cellPadding: { top: 2, bottom: 2, left: 1, right: 1 }, 
            valign: 'top', 
            textColor: [0, 0, 0],
            lineWidth: 0 },
          columnStyles: {
            0: { cellWidth: 8 },
            1: { cellWidth: 'auto' } } });
        yPos = pdf.lastAutoTable.finalY + 8;
      }

      // Fetch strands and rubrics for selected criteria
      const selectedCriteriaIds = wizardAssessment.selected_criteria || [];
      if (selectedCriteriaIds.length > 0) {
        // Get strands for selected criteria and year level
        const { data: strandsData } = await supabase
          .from('strands')
          .select('*')
          .in('criterion_id', selectedCriteriaIds)
          .eq('year_level', topicData.topic_year || 1)
          .order('label');

        if (strandsData && strandsData.length > 0) {
          const strandIds = strandsData.map(s => s.strand_id);
          
          // Get rubrics for these strands
          const { data: rubricsData } = await supabase
            .from('rubrics')
            .select('*')
            .in('strand_id', strandIds)
            .order('max_score', { ascending: false });

          // Show section title once before all criteria
          pdf.setFontSize(11);
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(0, 0, 0);
          pdf.text('SUBJECT CRITERIA AND TASK-SPECIFIC CLARIFICATION', margin, yPos);
          yPos += 6;

          // Group strands by criterion
          let isFirstCriterion = true;
          for (const criterionId of selectedCriteriaIds) {
            const criterion = wizardCriteria.find(c => c.criterion_id === criterionId);
            if (!criterion) continue;

            const criterionStrands = strandsData.filter(s => s.criterion_id === criterionId);
            if (criterionStrands.length === 0) continue;

            // Check if we need a new page (only if content would overflow)
            const pageHeight = pdf.internal.pageSize.getHeight();
            if (yPos > pageHeight - 40) {
              pdf.addPage();
              yPos = 25;
            }

            // Criteria label only
            pdf.setFontSize(10);
            pdf.setFont('helvetica', 'bold');
            pdf.setTextColor(0, 0, 0);
            pdf.text(`Criteria ${criterion.code}`, margin, yPos);
            yPos += 6;

            // Build table data for this criterion
            // Get all rubrics for strands of this criterion
            const criterionRubrics = (rubricsData || []).filter(r => 
              criterionStrands.some(s => s.strand_id === r.strand_id)
            );

            // Roman numeral order helper
            const romanOrder = ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x'];
            const getRomanIndex = (label) => {
              const idx = romanOrder.indexOf(label.toLowerCase());
              return idx >= 0 ? idx : 999;
            };

            // Group by band score - collect rubric descriptions for each band
            const bandGroups = {};
            criterionRubrics.forEach(rubric => {
              const bandKey = `${rubric.max_score}-${rubric.min_score}`;
              if (!bandGroups[bandKey]) {
                bandGroups[bandKey] = {
                  band_label: rubric.band_label || bandKey,
                  max_score: rubric.max_score,
                  min_score: rubric.min_score,
                  rubricsData: []
                };
              }
              // Find the strand for this rubric to get its label
              const strand = criterionStrands.find(s => s.strand_id === rubric.strand_id);
              if (strand) {
                bandGroups[bandKey].rubricsData.push({
                  label: strand.label || '',
                  description: rubric.description || '' // Use rubric description, not strand content
                });
              }
            });

            // Sort bands by max_score descending and sort rubrics within each band by strand label
            const sortedBands = Object.values(bandGroups).sort((a, b) => b.max_score - a.max_score);
            sortedBands.forEach(band => {
              band.rubricsData.sort((a, b) => getRomanIndex(a.label) - getRomanIndex(b.label));
              // Format each strand with proper indentation: "i.    description"
              band.strandsContent = band.rubricsData.map(r => {
                const label = r.label || '';
                // Pad the label to create consistent indentation (e.g., "i.  ", "ii. ", "iii.")
                const paddedLabel = label ? `${label}.`.padEnd(5, ' ') : '     ';
                return `${paddedLabel}${r.description}`;
              });
              // Build TSC content per strand using criterionId_bandLabel_strandLabel key format
              band.tscContent = band.rubricsData.map(r => {
                const tscKey = `${criterionId}_${band.band_label}_${r.label}`;
                const tsc = wizardAssessment.assessment_tsc?.[tscKey] || '';
                if (tsc) {
                  const paddedLabel = r.label ? `${r.label}.`.padEnd(5, ' ') : '     ';
                  return `${paddedLabel}${tsc}`;
                }
                return '';
              }).filter(t => t);
            });

            if (sortedBands.length > 0) {
              // Create table with headers
              const tableHead = [['', 'SUBJECT CRITERIA', 'TASK-SPECIFIC CLARIFICATION']];

              // Build hanging-indented content as plain text lines so autoTable can measure height correctly
              pdf.setFont('helvetica', 'normal');
              pdf.setFontSize(8);
              const colWidth = (availableWidth - 12) / 2;
              const innerWidth = colWidth - 4; // cellPadding (2 left + 2 right)
              const spaceWidth = Math.max(0.1, pdf.getTextWidth(' '));
              const labelColWidth = pdf.getTextWidth('viii. ');
              const buildHangingContent = (pairs) => {
                if (!pairs || pairs.length === 0) return '';
                const lines = ['The student:'];
                for (const p of pairs) {
                  const cleanText = (p?.text ?? '').toString().trim();
                  if (!cleanText) continue;
                  const cleanLabel = (p?.label ?? '').toString().trim();
                  const labelToken = cleanLabel ? `${cleanLabel}.` : '';
                  const maxDescWidth = Math.max(12, innerWidth - labelColWidth);
                  const wrapped = pdf.splitTextToSize(cleanText, maxDescWidth);
                  if (!wrapped || wrapped.length === 0) continue;

                  const labelWidth = labelToken ? pdf.getTextWidth(labelToken) : 0;
                  const padWidth = labelToken ? Math.max(0, labelColWidth - labelWidth) : 0;
                  const padSpacesCount = labelToken ? Math.max(1, Math.ceil(padWidth / spaceWidth)) : 0;
                  const prefix = labelToken ? `${labelToken}${' '.repeat(padSpacesCount)}` : '';
                  const indentSpacesCount = Math.max(0, Math.ceil(labelColWidth / spaceWidth));
                  const indent = indentSpacesCount > 0 ? ' '.repeat(indentSpacesCount) : '';

                  lines.push(`${prefix}${wrapped[0]}`.trimEnd());
                  for (let i = 1; i < wrapped.length; i++) {
                    lines.push(`${indent}${wrapped[i]}`.trimEnd());
                  }
                }
                return lines.length > 1 ? lines.join('\n') : '';
              };
              
              // Build simple text content - let autoTable handle wrapping
              const tableBody = sortedBands.map(band => {
                const subjectPairs = (band.rubricsData || []).map(r => ({
                  label: r.label,
                  text: r.description }));
                const subjectContent = buildHangingContent(subjectPairs);
                
                // TSC content
                const tscPairs = (band.rubricsData || []).map(r => {
                  const tscKey = `${criterionId}_${band.band_label}_${r.label}`;
                  const tsc = wizardAssessment.assessment_tsc?.[tscKey] || '';
                  return tsc ? { label: r.label, text: tsc } : null;
                }).filter(Boolean);
                const tscContent = tscPairs.length > 0 ? buildHangingContent(tscPairs) : '';
                
                return [band.band_label, subjectContent, tscContent];
              });

              autoTable(pdf, {
                startY: yPos,
                margin: { left: margin, right: margin },
                head: tableHead,
                body: tableBody,
                theme: 'grid',
                styles: { 
                  fontSize: 8, 
                  cellPadding: 2, 
                  valign: 'top', 
                  textColor: [0, 0, 0],
                  lineColor: [0, 0, 0],
                  lineWidth: 0.2 },
                headStyles: {
                  fillColor: [255, 255, 255],
                  textColor: [0, 0, 0],
                  fontStyle: 'bold',
                  halign: 'center' },
                columnStyles: {
                  0: { cellWidth: 12, halign: 'center', fontStyle: 'bold' },
                  1: { cellWidth: (availableWidth - 12) / 2 },
                  2: { cellWidth: (availableWidth - 12) / 2 } } });
            }
          }
        }
      }

      // Add page numbers to all pages
      const totalPages = pdf.internal.getNumberOfPages();
      const pageHeight = pdf.internal.pageSize.getHeight();
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(128, 128, 128);
        pdf.text(`${i}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
      }

      // Save PDF
      const fileName = `assessment-${wizardAssessment.assessment_nama?.replace(/[^a-z0-9]/gi, '-') || 'assessment'}.pdf`;
      pdf.save(fileName);
      
      // Show success notification
      setSaveNotification(true);
      setTimeout(() => setSaveNotification(false), 2000);
    } catch (error) {
      console.error('Error generating Assessment PDF:', error);
      alert(`Failed to generate Assessment PDF: ${error.message}`);
    }
  };

  // Export Assessment to Word
  const handleExportAssessmentWord = async () => {
    try {
      const topicData = selectedTopic;
      if (!topicData || !wizardAssessment.assessment_nama) {
        alert('Please complete assessment name first');
        return;
      }

      const subjectName = subjectMap.get(topicData.topic_subject_id) || 'N/A';
      const kelasName = kelasNameMap.get(topicData.topic_kelas_id) || 'N/A';
      
      let teacherName = 'N/A';
      if (currentUserId) {
        const { data: userData, error: userErr } = await supabase
          .from("users")
          .select("user_nama_depan, user_nama_belakang")
          .eq("user_id", currentUserId)
          .single();
        
        if (!userErr && userData) {
          teacherName = `${userData.user_nama_depan || ''} ${userData.user_nama_belakang || ''}`.trim();
        }
      }

      const selectedCriteriaNames = wizardCriteria
        .filter(c => wizardAssessment.selected_criteria.includes(c.criterion_id))
        .map(c => c.code)
        .join('/');

      const proficiencyLevel = topicData.topic_year ? `Phase ${topicData.topic_year}` : 'N/A';

      const selectedCriteriaIds = wizardAssessment.selected_criteria || [];
      const yearLevel = topicData.topic_year || 1;
      const { data: strandsData } = await supabase
        .from('strands')
        .select('*')
        .in('criterion_id', selectedCriteriaIds)
        .eq('year_level', yearLevel)
        .order('label');

      const strandIds = (strandsData || []).map(s => s.strand_id);
      const { data: rubricsData } = await supabase
        .from('rubrics')
        .select('*')
        .in('strand_id', strandIds)
        .order('max_score', { ascending: false });

      const criteriaList = wizardCriteria || [];
      const criteriaSections = buildAssessmentCriteriaForPdf({
        selectedCriteriaIds,
        criteriaList,
        strandsData,
        rubricsData,
        tscMap: wizardAssessment.assessment_tsc || {} });

      const unitName = topicData.topic_urutan
        ? `Unit ${topicData.topic_urutan}`
        : (topicData.topic_nama || 'N/A');

      const payload = {
        meta: {
          subjectName,
          kelasName,
          unitName,
          assessmentTitle: wizardAssessment.assessment_nama || '',
          teacherName,
          criteriaCodes: selectedCriteriaNames,
          proficiencyLevel,
          keyConcept: topicData.topic_key_concept || 'N/A',
          relatedConcepts: topicData.topic_related_concept || 'N/A',
          conceptualUnderstanding: wizardAssessment.assessment_conceptual_understanding || 'N/A',
          globalContext: topicData.topic_global_context || 'N/A',
          statementOfInquiry: topicData.topic_statement || 'N/A',
          taskSpecificDescription: wizardAssessment.assessment_task_specific_description || 'N/A',
          instructions: wizardAssessment.assessment_instructions || '' },
        criteria: criteriaSections };

      const fileName = `assessment-${wizardAssessment.assessment_nama?.replace(/[^a-z0-9]/gi, '-') || 'assessment'}.docx`;
      await downloadAssessmentDocx(payload, fileName);

      setSaveNotification(true);
      setTimeout(() => setSaveNotification(false), 2000);
    } catch (error) {
      console.error('Error exporting Assessment to Word:', error);
      alert(`Failed to export Assessment to Word: ${error.message}`);
    }
  };

  // Generate Assessment PDF from topic card (fetches data from database)
  const handleGenerateAssessmentPDFFromCard = async (topic, event) => {
    if (event) {
      event.stopPropagation(); // Prevent card click
    }
    
    try {
      // Fetch assessment data for this topic
      const { data: assessmentData, error: assessmentErr } = await supabase
        .from('assessment')
        .select(`
          assessment_id,
          assessment_nama,
          assessment_keterangan,
          assessment_semester,
          assessment_conceptual_understanding,
          assessment_task_specific_description,
          assessment_instructions,
          assessment_tsc,
          assessment_criteria (criterion_id)
        `)
        .eq('assessment_topic_id', topic.topic_id)
        .single();
      
      if (assessmentErr || !assessmentData) {
        alert('No assessment found for this unit. Please create an assessment first.');
        return;
      }

      // Get subject name
      const subjectName = subjectMap.get(topic.topic_subject_id) || 'N/A';
      
      // Get class name
      const kelasName = kelasNameMap.get(topic.topic_kelas_id) || 'N/A';
      
      // Get teacher name
      let teacherName = 'N/A';
      if (currentUserId) {
        const { data: userData, error: userErr } = await supabase
          .from("users")
          .select("user_nama_depan, user_nama_belakang")
          .eq("user_id", currentUserId)
          .single();
        
        if (!userErr && userData) {
          teacherName = `${userData.user_nama_depan || ''} ${userData.user_nama_belakang || ''}`.trim();
        }
      }

      // Get criteria for this subject
      const { data: criteriaData } = await supabase
        .from('criteria')
        .select('criterion_id, code, name')
        .eq('subject_id', topic.topic_subject_id)
        .order('code');
      
      // Get selected criteria names
      const criteriaIds = assessmentData.assessment_criteria?.map(ac => ac.criterion_id) || [];
      const selectedCriteriaNames = (criteriaData || [])
        .filter(c => criteriaIds.includes(c.criterion_id))
        .map(c => c.code)
        .join('/');

      // Get proficiency level (MYP Year)
      const proficiencyLevel = topic.topic_year ? `Phase ${topic.topic_year}` : 'N/A';

      // Prefer server-side HTML->PDF (true hanging indent via CSS). Fallback to jsPDF if it fails.
      try {
        const selectedCriteriaIds = criteriaIds;
        const yearLevel = topic.topic_year || 1;
        const { data: strandsData } = await supabase
          .from('strands')
          .select('*')
          .in('criterion_id', selectedCriteriaIds)
          .eq('year_level', yearLevel)
          .order('label');

        const strandIds = (strandsData || []).map(s => s.strand_id);
        const { data: rubricsData } = await supabase
          .from('rubrics')
          .select('*')
          .in('strand_id', strandIds)
          .order('max_score', { ascending: false });

        const criteriaSections = buildAssessmentCriteriaForPdf({
          selectedCriteriaIds,
          criteriaList: criteriaData || [],
          strandsData,
          rubricsData,
          tscMap: assessmentData.assessment_tsc || {} });

        const unitName = topic.topic_urutan
          ? `Unit ${topic.topic_urutan}`
          : (topic.topic_nama || 'N/A');

        // Build payload for HTML endpoint matching original PDF format
        const payload = {
          meta: {
            subjectName,
            kelasName,
            unitName,
            assessmentTitle: assessmentData.assessment_nama || '',
            teacherName,
            criteriaCodes: selectedCriteriaNames,
            proficiencyLevel,
            keyConcept: topic.topic_key_concept || 'N/A',
            relatedConcepts: topic.topic_related_concept || 'N/A',
            conceptualUnderstanding: assessmentData.assessment_conceptual_understanding || 'N/A',
            globalContext: topic.topic_global_context || 'N/A',
            statementOfInquiry: topic.topic_statement || 'N/A',
            taskSpecificDescription: assessmentData.assessment_task_specific_description || 'N/A',
            instructions: assessmentData.assessment_instructions || '' },
          criteria: criteriaSections };

        await openAssessmentHtml(payload);

        setSaveNotification(true);
        setTimeout(() => setSaveNotification(false), 2000);
        return;
      } catch (serverErr) {
        console.warn('Server-side assessment PDF failed, falling back to jsPDF:', serverErr);
      }

      // Generate PDF - Portrait A4
      const pdf = new jsPDF('portrait', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const margin = 20;
      let yPos = 20;
      const availableWidth = pageWidth - (margin * 2);

      // Header: ASSESSMENT title (no background, just bold text)
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(0, 0, 0);
      pdf.text('ASSESSMENT', margin, yPos);
      
      yPos += 8;

      // Info section without grid lines
      pdf.setFontSize(9);
      const leftCol = margin;
      const midCol = margin + 90;
      const lineHeight = 6;
      
      // Row 1: Name / Subject
      pdf.setFont('helvetica', 'bold');
      pdf.text('Name', leftCol, yPos);
      pdf.setFont('helvetica', 'normal');
      pdf.text('', leftCol + 25, yPos);
      
      pdf.setFont('helvetica', 'bold');
      pdf.text('Subject', midCol, yPos);
      pdf.setFont('helvetica', 'normal');
      pdf.text(subjectName, midCol + 25, yPos);
      yPos += lineHeight;
      
      // Row 2: Class / Unit
      pdf.setFont('helvetica', 'bold');
      pdf.text('Class', leftCol, yPos);
      pdf.setFont('helvetica', 'normal');
      pdf.text(kelasName, leftCol + 25, yPos);
      
      pdf.setFont('helvetica', 'bold');
      pdf.text('Unit', midCol, yPos);
      pdf.setFont('helvetica', 'normal');
      // Use topic_urutan instead of topic_nama
      const unitNumber = topic.topic_urutan ? topic.topic_urutan.toString() : '-';
      pdf.text(unitNumber, midCol + 25, yPos);
      yPos += lineHeight;
      
      // Row 3: Day/Date / Teacher
      pdf.setFont('helvetica', 'bold');
      pdf.text('Day/Date', leftCol, yPos);
      pdf.setFont('helvetica', 'normal');
      pdf.text('', leftCol + 25, yPos);
      
      pdf.setFont('helvetica', 'bold');
      pdf.text('Teacher', midCol, yPos);
      pdf.setFont('helvetica', 'normal');
      pdf.text(teacherName, midCol + 25, yPos);
      
      // Logo and RESULT box on the right
      const resultBoxX = pageWidth - margin - 30;
      const logoY = yPos - 20;
      const resultBoxWidth = 30;
      const resultBoxHeight = 18;
      const borderRadius = 3;
      
      // Add school logo
      try {
        const logoImg = new Image();
        logoImg.src = '/images/login-logo.png';
        pdf.addImage(logoImg, 'PNG', resultBoxX + 2, logoY, resultBoxWidth - 4, 15);
      } catch (e) {
        console.warn('Could not load logo image:', e);
      }
      
      // Draw rounded rectangle for RESULT box (below logo)
      const resultBoxY = logoY + 17;
      pdf.setDrawColor(0, 0, 0);
      pdf.setLineWidth(0.3);
      pdf.roundedRect(resultBoxX, resultBoxY, resultBoxWidth, resultBoxHeight, borderRadius, borderRadius, 'S');
      
      // RESULT label below the box
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(10);
      pdf.setTextColor(0, 0, 0);
      pdf.text('RESULT', resultBoxX + resultBoxWidth/2, resultBoxY + resultBoxHeight + 5, { align: 'center' });
      
      yPos += 25;

      // Assessment Title (large) - moved below header section
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text(assessmentData.assessment_nama.toUpperCase(), pageWidth / 2, yPos, { align: 'center' });
      yPos += 12;

      // TASK OVERVIEW section (no blue background)
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(0, 0, 0);
      pdf.text('TASK OVERVIEW', margin, yPos + 3);
      yPos += 8;

      // Task Overview table (no gray background)
      const taskOverviewData = [
        ['Criterion', selectedCriteriaNames || 'N/A'],
        ['Proficiency Level', proficiencyLevel],
        ['Key Concept', topic.topic_key_concept || 'N/A'],
        ['Related Concepts', topic.topic_related_concept || 'N/A'],
        ['Conceptual Understanding', assessmentData.assessment_conceptual_understanding || 'N/A'],
        ['Global Context Exploration', topic.topic_global_context || 'N/A'],
        ['Statement of Inquiry', topic.topic_statement || 'N/A'],
        ['Task Specific Description', assessmentData.assessment_task_specific_description || 'N/A'],
      ];

      autoTable(pdf, {
        startY: yPos,
        margin: { left: margin, right: margin },
        head: [],
        body: taskOverviewData.map(row => [
          { content: row[0], styles: { fontStyle: 'bold', cellWidth: 50 }},
          { content: `: ${row[1]}`, styles: { cellWidth: availableWidth - 50 }},
        ]),
        theme: 'grid',
        styles: { fontSize: 9, cellPadding: 4, lineColor: [200, 200, 200], lineWidth: 0.1, valign: 'top', textColor: [0, 0, 0] },
        columnStyles: {
          0: { cellWidth: 50 },
          1: { cellWidth: availableWidth - 50 } } });
      yPos = pdf.lastAutoTable.finalY + 8;

      // Assessment Instructions section - always on page 2
      if (assessmentData.assessment_instructions) {
        // Always start instructions on a new page (page 2)
        pdf.addPage();
        yPos = 25;

        // INSTRUCTIONS header
        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(0, 0, 0);
        pdf.text('INSTRUCTIONS:', margin, yPos);
        yPos += 8;

        // Parse instructions - split by numbered items (1., 2., 3., etc.)
        const instructionText = assessmentData.assessment_instructions;
        const instructionItems = [];
        
        // Match numbered items like "1.", "2.", etc.
        const regex = /(\d+\.\s*)/g;
        const parts = instructionText.split(regex).filter(p => p.trim());
        
        // Combine number with its content
        for (let i = 0; i < parts.length; i++) {
          if (/^\d+\.\s*$/.test(parts[i]) && parts[i + 1]) {
            instructionItems.push([parts[i].trim(), parts[i + 1].trim()]);
            i++; // Skip the next part as we've combined it
          } else if (!/^\d+\.\s*$/.test(parts[i])) {
            // If no number prefix, add as single item
            instructionItems.push(['', parts[i].trim()]);
          }
        }

        // Create table without borders for numbered list
        autoTable(pdf, {
          startY: yPos,
          margin: { left: margin, right: margin },
          head: [],
          body: instructionItems.map(item => [
            { content: item[0], styles: { fontStyle: 'bold', cellWidth: 8 }},
            { content: item[1], styles: { cellWidth: 'auto' }},
          ]),
          theme: 'plain',
          styles: { 
            fontSize: 9, 
            cellPadding: { top: 2, bottom: 2, left: 1, right: 1 }, 
            valign: 'top', 
            textColor: [0, 0, 0],
            lineWidth: 0 },
          columnStyles: {
            0: { cellWidth: 8 },
            1: { cellWidth: 'auto' } } });
        yPos = pdf.lastAutoTable.finalY + 8;
      }

      // Fetch strands and rubrics for selected criteria
      const selectedCriteriaIds = criteriaIds || [];
      if (selectedCriteriaIds.length > 0) {
        // Get criteria details
        const { data: criteriaDetails } = await supabase
          .from('criteria')
          .select('criterion_id, code, name')
          .in('criterion_id', selectedCriteriaIds);

        // Get strands for selected criteria and year level
        const { data: strandsData } = await supabase
          .from('strands')
          .select('*')
          .in('criterion_id', selectedCriteriaIds)
          .eq('year_level', topic.topic_year || 1)
          .order('label');

        if (strandsData && strandsData.length > 0) {
          const strandIds = strandsData.map(s => s.strand_id);
          
          // Get rubrics for these strands
          const { data: rubricsData } = await supabase
            .from('rubrics')
            .select('*')
            .in('strand_id', strandIds)
            .order('max_score', { ascending: false });

          // Show section title once before all criteria
          pdf.setFontSize(11);
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(0, 0, 0);
          pdf.text('SUBJECT CRITERIA AND TASK-SPECIFIC CLARIFICATION', margin, yPos);
          yPos += 6;

          // Group strands by criterion
          let isFirstCriterionCard = true;
          for (const criterionId of selectedCriteriaIds) {
            const criterion = (criteriaDetails || []).find(c => c.criterion_id === criterionId);
            if (!criterion) continue;

            const criterionStrands = strandsData.filter(s => s.criterion_id === criterionId);
            if (criterionStrands.length === 0) continue;

            // Check if we need a new page (only if content would overflow)
            const pageHeight = pdf.internal.pageSize.getHeight();
            if (yPos > pageHeight - 40) {
              pdf.addPage();
              yPos = 25;
            }

            // Criteria label only
            pdf.setFontSize(10);
            pdf.setFont('helvetica', 'bold');
            pdf.setTextColor(0, 0, 0);
            pdf.text(`Criteria ${criterion.code}`, margin, yPos);
            yPos += 6;

            // Build table data for this criterion
            // Get all rubrics for strands of this criterion
            const criterionRubrics = (rubricsData || []).filter(r => 
              criterionStrands.some(s => s.strand_id === r.strand_id)
            );

            // Roman numeral order helper
            const romanOrderCard = ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x'];
            const getRomanIndexCard = (label) => {
              const idx = romanOrderCard.indexOf(label.toLowerCase());
              return idx >= 0 ? idx : 999;
            };

            // Group by band score - collect rubric descriptions for each band
            const bandGroupsCard = {};
            criterionRubrics.forEach(rubric => {
              const bandKey = `${rubric.max_score}-${rubric.min_score}`;
              if (!bandGroupsCard[bandKey]) {
                bandGroupsCard[bandKey] = {
                  band_label: rubric.band_label || bandKey,
                  max_score: rubric.max_score,
                  min_score: rubric.min_score,
                  rubricsData: []
                };
              }
              // Find the strand for this rubric to get its label
              const strand = criterionStrands.find(s => s.strand_id === rubric.strand_id);
              if (strand) {
                bandGroupsCard[bandKey].rubricsData.push({
                  label: strand.label || '',
                  description: rubric.description || '' // Use rubric description, not strand content
                });
              }
            });

            // Sort bands by max_score descending and sort rubrics within each band by strand label
            const sortedBandsCard = Object.values(bandGroupsCard).sort((a, b) => b.max_score - a.max_score);
            sortedBandsCard.forEach(band => {
              band.rubricsData.sort((a, b) => getRomanIndexCard(a.label) - getRomanIndexCard(b.label));
            });

            if (sortedBandsCard.length > 0) {
              // Create table with headers
              const tableHeadCard = [['', 'SUBJECT CRITERIA', 'TASK-SPECIFIC CLARIFICATION']];

              // Build hanging-indented content as plain text lines so autoTable can measure height correctly
              pdf.setFont('helvetica', 'normal');
              pdf.setFontSize(8);
              const colWidthCard = (availableWidth - 12) / 2;
              const innerWidthCard = colWidthCard - 4; // cellPadding (2 left + 2 right)
              const spaceWidthCard = Math.max(0.1, pdf.getTextWidth(' '));
              const labelColWidthCard = pdf.getTextWidth('viii. ');
              const buildHangingContentCard = (pairs) => {
                if (!pairs || pairs.length === 0) return '';
                const lines = ['The student:'];
                for (const p of pairs) {
                  const cleanText = (p?.text ?? '').toString().trim();
                  if (!cleanText) continue;
                  const cleanLabel = (p?.label ?? '').toString().trim();
                  const labelToken = cleanLabel ? `${cleanLabel}.` : '';
                  const maxDescWidth = Math.max(12, innerWidthCard - labelColWidthCard);
                  const wrapped = pdf.splitTextToSize(cleanText, maxDescWidth);
                  if (!wrapped || wrapped.length === 0) continue;

                  const labelWidth = labelToken ? pdf.getTextWidth(labelToken) : 0;
                  const padWidth = labelToken ? Math.max(0, labelColWidthCard - labelWidth) : 0;
                  const padSpacesCount = labelToken ? Math.max(1, Math.ceil(padWidth / spaceWidthCard)) : 0;
                  const prefix = labelToken ? `${labelToken}${' '.repeat(padSpacesCount)}` : '';
                  const indentSpacesCount = Math.max(0, Math.ceil(labelColWidthCard / spaceWidthCard));
                  const indent = indentSpacesCount > 0 ? ' '.repeat(indentSpacesCount) : '';

                  lines.push(`${prefix}${wrapped[0]}`.trimEnd());
                  for (let i = 1; i < wrapped.length; i++) {
                    lines.push(`${indent}${wrapped[i]}`.trimEnd());
                  }
                }
                return lines.length > 1 ? lines.join('\n') : '';
              };
              
              // Build simple text content - let autoTable handle wrapping
              const tableBodyCard = sortedBandsCard.map(band => {
                const subjectPairs = (band.rubricsData || []).map(r => ({
                  label: r.label,
                  text: r.description }));
                const subjectContent = buildHangingContentCard(subjectPairs);
                
                // TSC content
                const tscPairs = (band.rubricsData || []).map(r => {
                  const tscKey = `${criterionId}_${band.band_label}_${r.label}`;
                  const tsc = assessmentData.assessment_tsc?.[tscKey] || '';
                  return tsc ? { label: r.label, text: tsc } : null;
                }).filter(Boolean);
                const tscContent = tscPairs.length > 0 ? buildHangingContentCard(tscPairs) : '';
                
                return [band.band_label, subjectContent, tscContent];
              });

              autoTable(pdf, {
                startY: yPos,
                margin: { left: margin, right: margin },
                head: tableHeadCard,
                body: tableBodyCard,
                theme: 'grid',
                styles: { 
                  fontSize: 8, 
                  cellPadding: 2, 
                  valign: 'top', 
                  textColor: [0, 0, 0],
                  lineColor: [0, 0, 0],
                  lineWidth: 0.2 },
                headStyles: {
                  fillColor: [255, 255, 255],
                  textColor: [0, 0, 0],
                  fontStyle: 'bold',
                  halign: 'center' },
                columnStyles: {
                  0: { cellWidth: 12, halign: 'center', fontStyle: 'bold' },
                  1: { cellWidth: (availableWidth - 12) / 2 },
                  2: { cellWidth: (availableWidth - 12) / 2 } } });
              yPos = pdf.lastAutoTable.finalY + 8; // Add spacing after table before next criteria
            }
          }
        }
      }

      // Add page numbers to all pages
      const totalPages = pdf.internal.getNumberOfPages();
      const pageHeight = pdf.internal.pageSize.getHeight();
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(128, 128, 128);
        pdf.text(`${i}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
      }

      // Save PDF
      const fileName = `assessment-${assessmentData.assessment_nama?.replace(/[^a-z0-9]/gi, '-') || 'assessment'}.pdf`;
      pdf.save(fileName);
      
      // Show success notification
      setSaveNotification(true);
      setTimeout(() => setSaveNotification(false), 2000);
    } catch (error) {
      console.error('Error generating Assessment PDF:', error);
      alert(`Failed to generate Assessment PDF: ${error.message}`);
    }
  };

  // Export assessment to Word from card
  const handleExportAssessmentWordFromCard = async (topic, event) => {
    if (event) {
      event.stopPropagation(); // Prevent card click
    }
    
    try {
      // Fetch assessment data for this topic
      const { data: assessmentData, error: assessmentErr } = await supabase
        .from('assessment')
        .select(`
          assessment_id,
          assessment_nama,
          assessment_keterangan,
          assessment_semester,
          assessment_conceptual_understanding,
          assessment_task_specific_description,
          assessment_instructions,
          assessment_tsc,
          assessment_criteria (criterion_id)
        `)
        .eq('assessment_topic_id', topic.topic_id)
        .single();
      
      if (assessmentErr || !assessmentData) {
        alert('No assessment found for this unit. Please create an assessment first.');
        return;
      }

      // Get subject name
      const subjectName = subjectMap.get(topic.topic_subject_id) || 'N/A';
      
      // Get class name
      const kelasName = kelasNameMap.get(topic.topic_kelas_id) || 'N/A';
      
      // Get teacher name
      let teacherName = 'N/A';
      if (currentUserId) {
        const { data: userData, error: userErr } = await supabase
          .from("users")
          .select("user_nama_depan, user_nama_belakang")
          .eq("user_id", currentUserId)
          .single();
        
        if (!userErr && userData) {
          teacherName = `${userData.user_nama_depan || ''} ${userData.user_nama_belakang || ''}`.trim();
        }
      }

      // Get criteria for this subject
      const { data: criteriaData } = await supabase
        .from('criteria')
        .select('criterion_id, code, name')
        .eq('subject_id', topic.topic_subject_id)
        .order('code');
      
      // Get selected criteria names
      const criteriaIds = assessmentData.assessment_criteria?.map(ac => ac.criterion_id) || [];
      const selectedCriteriaNames = (criteriaData || [])
        .filter(c => criteriaIds.includes(c.criterion_id))
        .map(c => c.code)
        .join('/');

      // Get proficiency level (MYP Year)
      const proficiencyLevel = topic.topic_year ? `Phase ${topic.topic_year}` : 'N/A';

      // Fetch strands and rubrics
      const { data: strandsData } = await supabase
        .from('strands')
        .select('*')
        .in('criterion_id', criteriaIds)
        .eq('year_level', topic.topic_year || 1)
        .order('label');

      const strandIds = strandsData?.map(s => s.strand_id) || [];
      
      const { data: rubricsData } = await supabase
        .from('rubrics')
        .select('*')
        .in('strand_id', strandIds)
        .order('max_score', { ascending: false });

      // Build criteria structure
      const criteriaStructure = buildAssessmentCriteriaForPdf({
        selectedCriteriaIds: criteriaIds,
        criteriaList: criteriaData || [],
        strandsData: strandsData || [],
        rubricsData: rubricsData || [],
        tscMap: assessmentData.assessment_tsc || {}
      });

      // Build payload
      const payload = {
        meta: {
          subjectName,
          kelasName,
          unitName: topic.topic_urutan ? topic.topic_urutan.toString() : '-',
          assessmentTitle: assessmentData.assessment_nama || '',
          teacherName,
          criteriaCodes: selectedCriteriaNames,
          proficiencyLevel,
          keyConcept: topic.topic_key_concept || '',
          relatedConcepts: topic.topic_related_concept || '',
          conceptualUnderstanding: assessmentData.assessment_conceptual_understanding || topic.topic_conceptual_understanding || '',
          globalContext: topic.topic_global_context || '',
          statementOfInquiry: topic.topic_statement || '',
          taskSpecificDescription: assessmentData.assessment_task_specific_description || '',
          instructions: assessmentData.assessment_instructions || '' },
        criteria: criteriaStructure };

      // Download DOCX
      const fileName = `${assessmentData.assessment_nama.replace(/[^a-zA-Z0-9]/g, '_')}.docx`;
      await downloadAssessmentDocx(payload, fileName);

    } catch (error) {
      console.error('Error exporting Word:', error);
      alert('Failed to export Word document. Check console for details.');
    }
  };

  // Save/update assessment for topic (edit mode)
  const saveTopicAssessment = async () => {
    if (!topicAssessment) return
    
    // Validate
    if (!topicAssessment.assessment_nama?.trim()) {
      alert('Please enter assessment name')
      return
    }
    // Date is now optional - allow saving without date as draft
    if (!topicAssessment.assessment_semester) {
      alert('Please select semester')
      return
    }
    if (!topicAssessment.selected_criteria || topicAssessment.selected_criteria.length === 0) {
      alert('Please select at least one criteria')
      return
    }
    
    setSavingTopicAssessment(true)
    try {
      // Find detail_kelas_id
      const { data: dkData, error: dkError } = await supabase
        .from('detail_kelas')
        .select('detail_kelas_id')
        .eq('detail_kelas_subject_id', selectedTopic.topic_subject_id)
        .eq('detail_kelas_kelas_id', selectedTopic.topic_kelas_id)
        .single()
      
      if (dkError) throw new Error('Could not find class-subject mapping')
      
      // Fetch original data if updating (to detect date changes)
      let originalDate = null
      if (topicAssessment.assessment_id) {
        const { data: originalData } = await supabase
          .from('assessment')
          .select('assessment_tanggal')
          .eq('assessment_id', topicAssessment.assessment_id)
          .single()
        originalDate = originalData?.assessment_tanggal
      }
      
      // Determine status based on date and current status
      const hasDate = topicAssessment.assessment_tanggal && topicAssessment.assessment_tanggal.trim() !== ''
      const wasApproved = topicAssessment.assessment_status === 1
      const dateChanged = originalDate !== topicAssessment.assessment_tanggal
      let newStatus
      let shouldNotify = false
      
      if (!hasDate) {
        // No date = draft (null status)
        newStatus = null
      } else if (wasApproved && dateChanged) {
        // Had approval but date changed = request approval again
        newStatus = 0
        shouldNotify = true
      } else if ((topicAssessment.assessment_status === null || topicAssessment.assessment_status === undefined) && hasDate) {
        // Was draft, now has date = request approval
        newStatus = 0
        shouldNotify = true
      } else if (hasDate && !originalDate) {
        // New assessment with date = request approval
        newStatus = 0
        shouldNotify = true
      } else {
        // Keep existing status (0, 2, 3)
        newStatus = topicAssessment.assessment_status
      }
      
      const assessmentPayload = {
        assessment_nama: topicAssessment.assessment_nama,
        assessment_tanggal: topicAssessment.assessment_tanggal || null,
        assessment_keterangan: topicAssessment.assessment_keterangan || null,
        assessment_semester: parseInt(topicAssessment.assessment_semester),
        assessment_detail_kelas_id: dkData.detail_kelas_id,
        assessment_topic_id: selectedTopic.topic_id,
        assessment_status: newStatus,
        assessment_user_id: currentUserId,
        assessment_tsc: topicAssessment.assessment_tsc || {}
      }
      
      let assessmentId = topicAssessment.assessment_id
      
      if (assessmentId) {
        // Update existing
        const { error: updateError } = await supabase
          .from('assessment')
          .update(assessmentPayload)
          .eq('assessment_id', assessmentId)
        
        if (updateError) throw updateError
      } else {
        // Insert new
        const { data: insertData, error: insertError } = await supabase
          .from('assessment')
          .insert([assessmentPayload])
          .select()
        
        if (insertError) throw insertError
        assessmentId = insertData[0].assessment_id
      }
      
      // Update criteria junction
      // First delete existing
      await supabase
        .from('assessment_criteria')
        .delete()
        .eq('assessment_id', assessmentId)
      
      // Insert new criteria
      const criteriaRecords = topicAssessment.selected_criteria.map(criterionId => ({
        assessment_id: assessmentId,
        criterion_id: criterionId
      }))
      
      if (criteriaRecords.length > 0) {
        const { error: criteriaError } = await supabase
          .from('assessment_criteria')
          .insert(criteriaRecords)
        
        if (criteriaError) console.error('Error inserting criteria:', criteriaError)
      }
      
      // Update local state
      setTopicAssessment(prev => ({ ...prev, assessment_id: assessmentId, assessment_status: newStatus }))
      setEditingAssessmentInTopic(false)
      
      // Send notification only if should notify (date was just set or changed)
      if (shouldNotify) {
        notifyVicePrincipal(assessmentId)
      }
      
      // Show success
      setSaveNotification(true)
      setTimeout(() => setSaveNotification(false), 2000)
      
    } catch (err) {
      console.error('Error saving topic assessment:', err)
      alert('Failed to save assessment: ' + err.message)
    } finally {
      setSavingTopicAssessment(false)
    }
  }

  // Create subject map for display
  const subjectMap = new Map(subjects.map(s => [s.subject_id, s.subject_name]))
  
  // Helper function to extract grade from kelas name
  const gradeOf = (kelasId) => {
    if (!kelasId) return 9999
    const name = kelasNameMap.get(kelasId)
    if (!name || typeof name !== 'string') return 9999
    const m = name.match(/(\d{1,2})/)
    return m ? parseInt(m[1], 10) : 9999
  }
  
  // Filter and sort topics
  const filteredTopics = topics
    .filter(topic => {
      const matchSubject = !filters.subject || topic.topic_subject_id === parseInt(filters.subject)
      const matchKelas = !filters.kelas || topic.topic_kelas_id === parseInt(filters.kelas)
      const matchSearch = !filters.search || 
        topic.topic_nama?.toLowerCase().includes(filters.search.toLowerCase()) ||
        subjectMap.get(topic.topic_subject_id)?.toLowerCase().includes(filters.search.toLowerCase())
      return matchSubject && matchKelas && matchSearch
    })
    .sort((a, b) => {
      // First: sort by grade
      const gradeA = gradeOf(a.topic_kelas_id)
      const gradeB = gradeOf(b.topic_kelas_id)
      if (gradeA !== gradeB) return gradeA - gradeB
      
      // Second: sort by kelas name
      const nameA = kelasNameMap.get(a.topic_kelas_id) || ''
      const nameB = kelasNameMap.get(b.topic_kelas_id) || ''
      const nameCompare = nameA.localeCompare(nameB)
      if (nameCompare !== 0) return nameCompare
      
      // Third: sort by topic_urutan
      const urutanA = a.topic_urutan != null ? a.topic_urutan : 9999
      const urutanB = b.topic_urutan != null ? b.topic_urutan : 9999
      return urutanA - urutanB
    })

  // Filter and sort assessments (same logic as topics)
  const filteredAssessments = assessments
    .filter(assessment => {
      const matchSubject = !assessmentFilters.subject || assessment.subject_id === parseInt(assessmentFilters.subject)
      const matchKelas = !assessmentFilters.kelas || assessment.kelas_id === parseInt(assessmentFilters.kelas)
      const matchStatus = !assessmentFilters.status || assessment.assessment_status.toString() === assessmentFilters.status
      const matchSearch = !assessmentFilters.search || 
        assessment.assessment_nama?.toLowerCase().includes(assessmentFilters.search.toLowerCase()) ||
        assessment.teacher_name?.toLowerCase().includes(assessmentFilters.search.toLowerCase())
      const matchNoCriteria = !assessmentFilters.noCriteria || !assessment.criteria || assessment.criteria.length === 0
      return matchSubject && matchKelas && matchStatus && matchSearch && matchNoCriteria
    })
    .sort((a, b) => {
      // First: sort by grade (extract from kelas_nama)
      const gradeA = gradeOf(a.kelas_id)
      const gradeB = gradeOf(b.kelas_id)
      if (gradeA !== gradeB) return gradeA - gradeB
      
      // Second: sort by kelas name
      const nameA = a.kelas_nama || ''
      const nameB = b.kelas_nama || ''
      const nameCompare = nameA.localeCompare(nameB)
      if (nameCompare !== 0) return nameCompare
      
      // Third: sort by topic_urutan
      const urutanA = a.topic_urutan || 999
      const urutanB = b.topic_urutan || 999
      if (urutanA !== urutanB) return urutanA - urutanB
      
      // Fourth: sort by assessment date (most recent first)
      const dateA = new Date(a.assessment_tanggal || 0)
      const dateB = new Date(b.assessment_tanggal || 0)
      return dateB - dateA
    })

  // Status badge helper for assessments
  const getAssessmentStatusBadge = (status) => {
    switch (status) {
      case 0:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            Waiting
          </span>
        )
      case 3:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
            Principal
          </span>
        )
      case 1:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            Approved
          </span>
        )
      case 2:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            Rejected
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            Unknown
          </span>
        )
    }
  }

  const tabs = [
    { id: 'planning', label: 'Planning', icon: '📋' },
    { id: 'assignment', label: 'Assignment', icon: '📝' },
    { id: 'assessment', label: 'Assessment', icon: '✓' },
    { id: 'portfolio', label: 'Portfolio', icon: '📁' },
    { id: 'report', label: 'Report', icon: '📊' }
  ]

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Topic Management</h1>
        <p className="text-gray-600 mt-1">Manage your IB unit planner topics</p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-8" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                py-4 px-1 inline-flex items-center gap-2 border-b-2 font-medium text-sm
                transition-colors duration-200
                ${
                  activeTab === tab.id
                    ? 'border-red-500 text-red-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              <span className="text-lg">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {activeTab === 'planning' && (
          <div className="flex">
            {/* Sidebar for Planning */}
            <div className="w-56 bg-gray-50 border-r border-gray-200 p-4">
              <nav className="space-y-1">
                {[
                  { id: 'overview', label: 'Overview', icon: '📋' },
                  { id: 'weekly-plan', label: 'Weekly Plan', icon: '📅' }
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveSubMenu(item.id)}
                    className={`
                      w-full flex items-center gap-3 px-4 py-2 rounded-md text-sm font-medium transition-colors
                      ${
                        activeSubMenu === item.id
                          ? 'bg-red-50 text-red-600'
                          : 'text-gray-700 hover:bg-gray-100'
                      }
                    `}
                  >
                    <span>{item.icon}</span>
                    {item.label}
                  </button>
                ))}
              </nav>
            </div>

            {/* Content Area */}
            <div className="flex-1 p-6">
              {activeSubMenu === 'overview' && (
                <div>
                  <h2 className="text-xl font-semibold text-gray-800 mb-6">Planning Overview</h2>
                  
                  {/* Filters */}
                  <div className="mb-6 flex gap-4 items-end">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t('topicNew.filters.subject')}
                      </label>
                      <select
                        value={filters.subject}
                        onChange={(e) => setFilters({ ...filters, subject: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                      >
                        <option value="">{t('topicNew.filters.allSubjects')}</option>
                        {subjects.map(s => (
                          <option key={s.subject_id} value={s.subject_id}>
                            {s.subject_name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Class/Grade
                      </label>
                      <select
                        value={filters.kelas}
                        onChange={(e) => setFilters({ ...filters, kelas: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                      >
                        <option value="">All Classes</option>
                        {allKelas.map(k => (
                          <option key={k.kelas_id} value={k.kelas_id}>
                            {k.kelas_nama}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t('topicNew.filters.search')}
                      </label>
                      <input
                        type="text"
                        value={filters.search}
                        onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                        placeholder={t('topicNew.filters.search')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                      />
                    </div>
                  </div>

                  {/* Loading State */}
                  {loading ? (
                    <div className="flex justify-center items-center py-12">
                      <FontAwesomeIcon icon={faSpinner} spin className="text-3xl text-red-500" />
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {filteredTopics.length === 0 && (
                        <div className="col-span-full text-center py-12 text-gray-500">
                          {t('topicNew.table.noUnits')}
                        </div>
                      )}
                      
                      {filteredTopics.length > 0 && (
                        filteredTopics.map((topic) => {
                          const kelasName = kelasNameMap.get(topic.topic_kelas_id) || ''
                          const gradeMatch = kelasName.match(/(\d{1,2})/)
                          const gradeNumber = gradeMatch ? gradeMatch[1] : ''
                          
                          return (
                          <div 
                            key={topic.topic_id}
                            className="relative border border-gray-200 rounded-lg p-5 hover:shadow-lg transition-all cursor-pointer hover:border-red-300 overflow-hidden"
                            onClick={async () => {
                              // Reset AI modal states when opening a new unit
                              setAiInputModalOpen(false)
                              setAiResultModalOpen(false)
                              setAiLoading(false)
                              setAiError('')
                              setAiItems([])
                              
                              setSelectedTopic({ ...topic, topic_atl: topic.topic_atl || '' })
                              setModalOpen(true)
                              setIsAddMode(false)
                              setCurrentStep(0)
                              
                              // Pre-fill wizard with existing data
                              // topic_atl default to empty string if not in DB yet
                              setSelectedTopic({ ...topic, topic_atl: topic.topic_atl || '' })
                              
                              // Fetch assessment for this topic and load into wizard
                              await fetchTopicAssessment(topic.topic_id, topic.topic_subject_id)
                              
                              // Load assessment data into wizard state
                              const { data: assessmentData } = await supabase
                                .from('assessment')
                                .select(`
                                  assessment_id,
                                  assessment_nama,
                                  assessment_keterangan,
                                  assessment_semester,
                                  assessment_conceptual_understanding,
                                  assessment_task_specific_description,
                                  assessment_instructions,
                                  assessment_tsc,
                                  assessment_criteria (criterion_id)
                                `)
                                .eq('assessment_topic_id', topic.topic_id)
                                .single()
                              
                              if (assessmentData) {
                                const criteriaIds = assessmentData.assessment_criteria?.map(ac => ac.criterion_id) || []
                                setWizardAssessment({
                                  assessment_nama: assessmentData.assessment_nama || '',
                                  assessment_keterangan: assessmentData.assessment_keterangan || '',
                                  assessment_semester: assessmentData.assessment_semester?.toString() || '',
                                  assessment_relationship: topic.topic_relationship_summative_assessment_statement_of_inquiry || '',
                                  assessment_conceptual_understanding: assessmentData.assessment_conceptual_understanding || '',
                                  assessment_task_specific_description: assessmentData.assessment_task_specific_description || '',
                                  assessment_instructions: assessmentData.assessment_instructions || '',
                                  selected_criteria: criteriaIds,
                                  assessment_tsc: assessmentData.assessment_tsc || {}
                                })
                              } else {
                                // No assessment yet, clear wizard assessment
                                setWizardAssessment({
                                  assessment_nama: '',
                                  assessment_keterangan: '',
                                  assessment_semester: '',
                                  assessment_relationship: topic.topic_relationship_summative_assessment_statement_of_inquiry || '',
                                  assessment_conceptual_understanding: '',
                                  assessment_task_specific_description: '',
                                  assessment_instructions: '',
                                  selected_criteria: [],
                                  assessment_tsc: {}
                                })
                              }
                              
                              // Load criteria for subject
                              if (topic.topic_subject_id) {
                                await fetchKelasForSubject(topic.topic_subject_id)
                                const { data: criteriaData } = await supabase
                                  .from('criteria')
                                  .select('criterion_id, code, name')
                                  .eq('subject_id', topic.topic_subject_id)
                                  .order('code')
                                setWizardCriteria(criteriaData || [])
                              }
                            }}
                          >
                            {/* Grade Watermark */}
                            {gradeNumber && (
                              <div className="absolute top-0 right-0 text-[120px] font-black text-gray-100 leading-none pointer-events-none select-none" style={{ transform: 'translate(20%, -20%)' }}>
                                {gradeNumber}
                              </div>
                            )}
                            
                            {/* Header */}
                            <div className="mb-4 pb-3 border-b border-gray-100 relative z-10">
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <h3 className="text-lg font-bold text-gray-800 line-clamp-2 flex-1">
                                  {topic.topic_nama}
                                </h3>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs bg-red-50 text-red-600 px-2 py-1 rounded-full font-medium whitespace-nowrap">
                                    #{topic.topic_urutan || '-'}
                                  </span>
                                  <button
                                    onClick={(e) => handleGeneratePDF(topic, e)}
                                    className="p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                                    title="Download Unit Planner PDF"
                                  >
                                    <FontAwesomeIcon icon={faPrint} className="text-sm" />
                                  </button>
                                  <button
                                    onClick={(e) => handleGenerateAssessmentPDFFromCard(topic, e)}
                                    className="p-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors"
                                    title="Download Assessment PDF"
                                  >
                                    <FontAwesomeIcon icon={faFileAlt} className="text-sm" />
                                  </button>
                                  <button
                                    onClick={(e) => handleExportAssessmentWordFromCard(topic, e)}
                                    className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                                    title="Download Assessment Word"
                                  >
                                    <FontAwesomeIcon icon={faFileWord} className="text-sm" />
                                  </button>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 text-sm text-gray-600 flex-wrap">
                                <span className="bg-blue-50 text-blue-600 px-2 py-1 rounded text-xs font-medium">
                                  {subjectMap.get(topic.topic_subject_id) || 'N/A'}
                                </span>
                                {topic.topic_kelas_id && (
                                  <span className="bg-green-50 text-green-600 px-2 py-1 rounded text-xs font-medium">
                                    {kelasNameMap.get(topic.topic_kelas_id) || 'N/A'}
                                  </span>
                                )}
                                {topic.topic_year && (
                                  <span className="bg-purple-50 text-purple-600 px-2 py-1 rounded text-xs font-medium">
                                    MYP Year {topic.topic_year}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Duration */}
                            <div className="mb-3 flex items-center gap-2 text-sm relative z-10">
                              <span className="text-gray-500">⏱️</span>
                              <span className="text-gray-700">
                                {topic.topic_duration && topic.topic_duration !== '0' && topic.topic_duration !== 0
                                  ? `${topic.topic_duration} weeks`
                                  : '-'}
                              </span>
                            </div>

                            {/* Inquiry Question */}
                            {topic.topic_inquiry_question && (
                              <div className="mb-3 relative z-10">
                                <p className="text-xs text-cyan-500 font-medium mb-1">Inquiry Question</p>
                                <p className="text-sm text-gray-700 line-clamp-2">
                                  {topic.topic_inquiry_question}
                                </p>
                              </div>
                            )}

                            {/* Global Context */}
                            {topic.topic_global_context && (
                              <div className="mb-3 relative z-10">
                                <p className="text-xs text-cyan-500 font-medium mb-1">Global Context</p>
                                <p className="text-sm text-gray-700 line-clamp-2">
                                  {topic.topic_global_context}
                                </p>
                              </div>
                            )}

                            {/* Statement of Inquiry */}
                            {topic.topic_statement && (
                              <div className="relative z-10">
                                <p className="text-xs text-cyan-500 font-medium mb-1">Statement of Inquiry</p>
                                <p className="text-sm text-gray-700 line-clamp-3">
                                  {topic.topic_statement}
                                </p>
                              </div>
                            )}
                          </div>
                        )})
                      )}
                    </div>
                  )}
                </div>
              )}

            {activeSubMenu === 'weekly-plan' && (
              <div>
                <div className="mb-6">
                  <h2 className="text-xl font-semibold text-gray-800 mb-2">Weekly Plan</h2>
                  <p className="text-sm text-gray-600 mb-4">Break down your unit into weekly objectives, activities, and resources</p>
                  
                  {/* Topic Selection */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Topic/Unit
                    </label>
                    <select
                      value={selectedTopicForWeekly?.topic_id || ''}
                      onChange={(e) => handleTopicSelectionForWeekly(e.target.value)}
                      className="w-full md:w-1/2 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                      <option value="">-- Choose a Topic --</option>
                      {topics
                        .sort((a, b) => {
                          const kelasA = kelasNameMap.get(a.topic_kelas_id) || ''
                          const kelasB = kelasNameMap.get(b.topic_kelas_id) || ''
                          
                          // Sort by grade first
                          if (kelasA !== kelasB) {
                            return kelasA.localeCompare(kelasB)
                          }
                          
                          // Then by topic_urutan
                          return (a.topic_urutan || 0) - (b.topic_urutan || 0)
                        })
                        .map(topic => (
                          <option key={topic.topic_id} value={topic.topic_id}>
                            {topic.topic_nama} ({kelasNameMap.get(topic.topic_kelas_id) || 'N/A'}) - Unit {topic.topic_urutan}
                          </option>
                        ))
                      }
                    </select>
                  </div>
                </div>

                {/* Weekly Plans Display */}
                {loadingWeeklyPlans ? (
                  <div className="flex justify-center py-12">
                    <FontAwesomeIcon icon={faSpinner} className="text-3xl text-red-500 animate-spin" />
                  </div>
                ) : selectedTopicForWeekly && weeklyPlans.length > 0 ? (
                  <div>
                    {/* Topic Info and Actions */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-blue-900 mb-1">{selectedTopicForWeekly.topic_nama}</h3>
                          <div className="text-sm text-blue-700">
                            <span>Duration: {selectedTopicForWeekly.topic_duration} weeks</span>
                            <span className="mx-2">•</span>
                            <span>Hours per week: {selectedTopicForWeekly.topic_hours_per_week || 'N/A'}</span>
                          </div>
                        </div>
                        <button
                          className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 flex items-center gap-2 text-sm"
                          onClick={() => {
                            setWeeklyAiInput({ assessmentDuration: '', specialRequests: '' })
                            setWeeklyAiModalOpen(true)
                          }}
                        >
                          <FontAwesomeIcon icon={faLightbulb} />
                          AI Help
                        </button>
                      </div>
                    </div>

                    {/* Notification */}
                    {weeklyPlanNotification.show && (
                      <div className={`mb-4 p-4 rounded-lg ${
                        weeklyPlanNotification.type === 'success' 
                          ? 'bg-green-50 border border-green-200 text-green-800'
                          : 'bg-red-50 border border-red-200 text-red-800'
                      }`}>
                        {weeklyPlanNotification.message}
                      </div>
                    )}

                    {/* Weekly Plan Forms */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {weeklyPlans.map((plan) => (
                        <div key={plan.week_number} className="bg-white border border-gray-200 rounded-lg p-4">
                          <h3 className="text-base font-semibold text-gray-800 mb-3 flex items-center gap-2">
                            <span className="flex items-center justify-center w-7 h-7 bg-red-100 text-red-600 rounded-full text-sm font-bold">
                              {plan.week_number}
                            </span>
                            Week {plan.week_number}
                          </h3>
                          
                          <div className="space-y-3">
                            {/* Objectives */}
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Learning Objectives
                              </label>
                              <textarea
                                value={plan.week_objectives || ''}
                                onChange={(e) => handleWeeklyPlanChange(plan.week_number, 'week_objectives', e.target.value)}
                                placeholder="What will students learn this week?"
                                rows={3}
                                className="w-full px-2 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 text-xs"
                              />
                            </div>

                            {/* Activities */}
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Learning Activities (max 300 characters)
                              </label>
                              <textarea
                                value={plan.week_activities || ''}
                                onChange={(e) => handleWeeklyPlanChange(plan.week_number, 'week_activities', e.target.value)}
                                placeholder="What activities will students do?"
                                rows={3}
                                maxLength={300}
                                className="w-full px-2 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 text-xs"
                              />
                              <div className="text-xs text-gray-500 mt-1 text-right">
                                {(plan.week_activities || '').length}/300
                              </div>
                            </div>

                            {/* Resources */}
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Resources Needed
                              </label>
                              <textarea
                                value={plan.week_resources || ''}
                                onChange={(e) => handleWeeklyPlanChange(plan.week_number, 'week_resources', e.target.value)}
                                placeholder="What materials or resources are needed?"
                                rows={2}
                                className="w-full px-2 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 text-xs"
                              />
                            </div>

                            {/* Reflection (During Teaching) */}
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Reflection <span className="text-gray-500">(During Teaching)</span>
                              </label>
                              <textarea
                                value={plan.week_reflection || ''}
                                onChange={(e) => handleWeeklyPlanChange(plan.week_number, 'week_reflection', e.target.value)}
                                placeholder="How did this week go? What worked well? What needs adjustment?"
                                rows={2}
                                className="w-full px-2 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-xs bg-purple-50"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Action Buttons */}
                    <div className="mt-6 flex justify-end gap-3">
                      <button
                        onClick={deleteAllWeeklyPlans}
                        disabled={savingWeeklyPlans || weeklyPlans.length === 0}
                        className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        <FontAwesomeIcon icon={faTrash} />
                        Delete All
                      </button>
                      <button
                        onClick={saveWeeklyPlans}
                        disabled={savingWeeklyPlans}
                        className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {savingWeeklyPlans ? (
                          <>
                            <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <FontAwesomeIcon icon={faSave} />
                            Save Weekly Plans
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ) : selectedTopicForWeekly ? (
                  <div className="text-center py-12 text-gray-500">
                    <p>No weekly plan data available for this topic.</p>
                    <p className="text-sm mt-2">The trigger should auto-generate weeks based on topic_duration.</p>
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-400">
                    <FontAwesomeIcon icon={faClipboardList} className="text-5xl mb-3 opacity-50" />
                    <p>Select a topic to view and edit weekly plans</p>
                  </div>
                )}
              </div>
            )}
            </div>
          </div>
        )}

        {activeTab === 'assignment' && (
          <div className="p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Assignment</h2>
            <p className="text-gray-600">Assignment management content will be displayed here.</p>
          </div>
        )}

        {activeTab === 'assessment' && (
          <div className="p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-6">Assessment Management</h2>
            
            {/* Filters */}
            <div className="mb-6 flex gap-4 items-end">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('topicNew.filters.subject')}
                </label>
                <select
                  value={assessmentFilters.subject}
                  onChange={(e) => setAssessmentFilters({ ...assessmentFilters, subject: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="">{t('topicNew.filters.allSubjects')}</option>
                  {subjects.map(s => (
                    <option key={s.subject_id} value={s.subject_id}>
                      {s.subject_name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Class
                </label>
                <select
                  value={assessmentFilters.kelas}
                  onChange={(e) => setAssessmentFilters({ ...assessmentFilters, kelas: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="">All Classes</option>
                  {assessmentKelasOptions.map(k => (
                    <option key={k.kelas_id} value={k.kelas_id}>
                      {k.kelas_nama}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  value={assessmentFilters.status}
                  onChange={(e) => setAssessmentFilters({ ...assessmentFilters, status: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="">All Status</option>
                  <option value="0">Waiting</option>
                  <option value="3">Waiting Principal</option>
                  <option value="1">Approved</option>
                  <option value="2">Rejected</option>
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('topicNew.filters.search')}
                </label>
                <input
                  type="text"
                  value={assessmentFilters.search}
                  onChange={(e) => setAssessmentFilters({ ...assessmentFilters, search: e.target.value })}
                  placeholder="Search by name..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
            </div>

            {/* Additional Filters */}
            <div className="mb-4 flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer hover:text-gray-900">
                <input
                  type="checkbox"
                  checked={assessmentFilters.noCriteria}
                  onChange={(e) => setAssessmentFilters({ ...assessmentFilters, noCriteria: e.target.checked })}
                  className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                />
                <span>⚠ Show only assessments without criteria</span>
                {assessmentFilters.noCriteria && (
                  <span className="text-xs text-orange-600 font-medium">
                    ({filteredAssessments.length} found)
                  </span>
                )}
              </label>
              
              {/* Rekap Nilai Kelas Section */}
              <div className="flex items-center gap-3">
                <select
                  value={recapSemesterFilter}
                  onChange={(e) => setRecapSemesterFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                >
                  <option value="">Semua Semester</option>
                  <option value="1">Semester 1</option>
                  <option value="2">Semester 2</option>
                </select>
                <button
                  onClick={() => generateClassRecapPDF(assessmentFilters.kelas, recapSemesterFilter, assessmentFilters.subject)}
                  disabled={!assessmentFilters.kelas || !assessmentFilters.subject || loadingClassRecap}
                  className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                >
                  {loadingClassRecap ? (
                    <>
                      <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <FontAwesomeIcon icon={faClipboardList} />
                      Rekap Nilai Kelas
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Loading State */}
            {loadingAssessments ? (
              <div className="flex justify-center items-center py-12">
                <FontAwesomeIcon icon={faSpinner} spin className="text-3xl text-red-500" />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredAssessments.length === 0 && (
                  <div className="col-span-full text-center py-12 text-gray-500">
                    No assessments found
                  </div>
                )}
                
                {filteredAssessments.map((assessment) => {
                  const kelasName = assessment.kelas_nama || ''
                  const gradeMatch = kelasName.match(/(\d{1,2})/)
                  const gradeNumber = gradeMatch ? gradeMatch[1] : ''
                  
                  // Can edit if: pending (0/3) OR no criteria assigned yet (for backward compatibility)
                  const hasCriteria = assessment.criteria && assessment.criteria.length > 0
                  const isPending = assessment.assessment_status === 0 || assessment.assessment_status === 3
                  const canEdit = (isPending || !hasCriteria) && assessment.assessment_user_id === currentUserId
                  
                  return (
                  <div 
                    key={assessment.assessment_id}
                    className={`relative border border-gray-200 rounded-lg p-5 hover:shadow-lg transition-all overflow-hidden flex flex-col h-full ${canEdit ? 'cursor-pointer hover:border-cyan-300' : ''}`}
                    onClick={() => canEdit && handleEditAssessment(assessment)}
                  >
                    {/* Grade Watermark */}
                    {gradeNumber && (
                      <div className="absolute top-0 right-0 text-[120px] font-black text-gray-100 leading-none pointer-events-none select-none" style={{ transform: 'translate(20%, -20%)' }}>
                        {gradeNumber}
                      </div>
                    )}
                    
                    {/* Content Container */}
                    <div className="flex-grow flex flex-col">
                    
                    {/* Header */}
                    <div className="mb-4 pb-3 border-b border-gray-100 relative z-10">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-start gap-2 flex-1">
                          {assessment.topic_urutan && assessment.topic_urutan !== 999 && (
                            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-xs font-bold px-2 py-1 rounded-full shadow-sm flex items-center gap-1 flex-shrink-0">
                              <span>Unit:</span>
                              <span>{assessment.topic_urutan}</span>
                            </div>
                          )}
                          <h3 className="text-lg font-bold text-gray-800 line-clamp-2 flex-1">
                            {assessment.assessment_nama}
                          </h3>
                        </div>
                        {getAssessmentStatusBadge(assessment.assessment_status)}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600 flex-wrap">
                        <span className="bg-blue-50 text-blue-600 px-2 py-1 rounded text-xs font-medium">
                          {assessment.subject_name || 'N/A'}
                        </span>
                        {assessment.kelas_nama && (
                          <span className="bg-green-50 text-green-600 px-2 py-1 rounded text-xs font-medium">
                            {assessment.kelas_nama}
                          </span>
                        )}
                        {assessment.assessment_semester && (
                          <span className="bg-amber-50 text-amber-600 px-2 py-1 rounded text-xs font-medium">
                            Sem {assessment.assessment_semester}
                          </span>
                        )}
                        {assessment.criteria && assessment.criteria.length > 0 ? (
                          assessment.criteria.map(c => (
                            <span key={c.code} className="bg-purple-50 text-purple-600 px-2 py-1 rounded text-xs font-bold">
                              Criterion {c.code}
                            </span>
                          ))
                        ) : (
                          <span className="bg-orange-50 text-orange-600 px-2 py-1 rounded text-xs font-bold">
                            ⚠ No Criteria
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Criteria Names or Warning */}
                    {assessment.criteria && assessment.criteria.length > 0 ? (
                      <div className="mb-3 relative z-10">
                        <p className="text-xs text-purple-500 font-medium mb-1">IB MYP Criteria</p>
                        <div className="flex flex-wrap gap-2">
                          {assessment.criteria.map(c => (
                            <div key={c.code} className="text-sm text-gray-700 bg-purple-50 px-2 py-1 rounded font-medium">
                              {c.code}: {c.name}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="mb-3 relative z-10">
                        <div className="bg-orange-50 border border-orange-200 rounded-md p-3">
                          <p className="text-sm text-orange-700 font-medium flex items-center gap-2">
                            <span>⚠</span>
                            <span>No criteria assigned. Click to add criteria.</span>
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Date */}
                    <div className="mb-3 flex items-center gap-2 text-sm relative z-10">
                      <span className="text-gray-500">📅</span>
                      <span className="text-gray-700">
                        {assessment.assessment_tanggal ? (
                          new Date(assessment.assessment_tanggal).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })
                        ) : (
                          <span className="text-gray-400 italic">No date set (Draft)</span>
                        )}
                      </span>
                    </div>

                    {/* Teacher */}
                    <div className="mb-3 flex items-center gap-2 text-sm relative z-10">
                      <span className="text-gray-500">👤</span>
                      <span className="text-gray-700">
                        {assessment.teacher_name || 'Unknown Teacher'}
                      </span>
                    </div>

                    {/* Topic */}
                    {assessment.topic_nama && (
                      <div className="mb-3 relative z-10">
                        <p className="text-xs text-cyan-500 font-medium mb-1">Linked Topic</p>
                        <p className="text-sm text-gray-700 line-clamp-2">
                          {assessment.topic_nama}
                        </p>
                      </div>
                    )}

                    {/* Description */}
                    {assessment.assessment_keterangan && (
                      <div className="mb-3 relative z-10">
                        <p className="text-xs text-cyan-500 font-medium mb-1">Note</p>
                        <p className="text-sm text-gray-700 line-clamp-3">
                          {assessment.assessment_keterangan}
                        </p>
                      </div>
                    )}
                    
                    </div>
                    {/* End Content Container */}

                    {/* Action Buttons */}
                    <div className="relative z-10 pt-3 border-t border-gray-100 mt-auto">
                      {/* Input Nilai button - always visible for approved assessments with criteria */}
                      {assessment.assessment_status === 1 && hasCriteria && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            router.push(`/data/assessment_grading/${assessment.assessment_id}`)
                          }}
                          className="w-full flex items-center justify-center gap-2 px-3 py-2 mb-2 text-sm font-medium text-white bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 rounded-md transition-all shadow-sm hover:shadow-md"
                        >
                          <span>📝</span>
                          Input Nilai
                        </button>
                      )}
                      
                      {canEdit && (
                        <div className="flex gap-2">
                          {isPending && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDeleteAssessment(assessment.assessment_id, assessment.assessment_nama)
                              }}
                              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-md transition-colors"
                            >
                              <FontAwesomeIcon icon={faTrash} />
                              Delete
                            </button>
                          )}
                          <div className="flex items-center text-xs text-gray-400 px-2">
                            {!hasCriteria ? '👆 Click to add criteria' : 'Click card to edit'}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )})}
              </div>
            )}
          </div>
        )}

        {activeTab === 'portfolio' && (
          <div className="p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Portfolio</h2>
            <p className="text-gray-600">Portfolio management content will be displayed here.</p>
          </div>
        )}

        {activeTab === 'report' && (
          <div className="p-6">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-800">Student Progress Report</h2>
              <p className="text-gray-600 text-sm">Generate and download student progress reports as PDF</p>
            </div>
            
            {/* Filters */}
            <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Year Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tahun Ajaran</label>
                  <select
                    value={reportFilters.year}
                    onChange={(e) => handleReportFilterChange('year', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Pilih Tahun</option>
                    {reportYears.map(year => (
                      <option key={year.year_id} value={year.year_id}>{year.year_name}</option>
                    ))}
                  </select>
                </div>
                
                {/* Kelas Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Kelas</label>
                  <select
                    value={reportFilters.kelas}
                    onChange={(e) => handleReportFilterChange('kelas', e.target.value)}
                    disabled={!reportFilters.year}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    <option value="">
                      {!reportFilters.year ? 'Pilih tahun dulu' : (reportKelasOptions.length === 0 ? 'Tidak ada kelas' : 'Pilih Kelas')}
                    </option>
                    {reportKelasOptions.map(kelas => (
                      <option key={kelas.kelas_id} value={kelas.kelas_id}>{kelas.kelas_nama}</option>
                    ))}
                  </select>
                </div>
                
                {/* Semester Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Semester</label>
                  <select
                    value={reportFilters.semester}
                    onChange={(e) => handleReportFilterChange('semester', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Pilih Semester</option>
                    <option value="1">Semester 1</option>
                    <option value="2">Semester 2</option>
                  </select>
                </div>
                
                {/* Student Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Siswa</label>
                  <select
                    value={reportFilters.student}
                    onChange={(e) => handleReportFilterChange('student', e.target.value)}
                    disabled={!reportFilters.kelas || loadingReportStudents}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    <option value="">
                      {loadingReportStudents ? 'Loading...' : !reportFilters.kelas ? 'Pilih kelas dulu' : 'Pilih Siswa'}
                    </option>
                    {reportStudents.map(student => (
                      <option key={student.detail_siswa_id} value={student.detail_siswa_id}>{student.nama}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="mt-4 flex justify-end">
                {/* Download PDF Report Button */}
                <button
                  onClick={generateReport}
                  disabled={!reportFilters.kelas || !reportFilters.student || loadingReport}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loadingReport ? (
                    <>
                      <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <FontAwesomeIcon icon={faPrint} />
                      Download PDF Report
                    </>
                  )}
                </button>
              </div>
            </div>
            
            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <FontAwesomeIcon icon={faInfoCircle} className="text-blue-500 mt-0.5" />
                <div>
                  <p className="text-sm text-blue-800">
                    Pilih tahun ajaran, semester, kelas, dan siswa kemudian klik tombol "Download PDF Report" untuk mengunduh laporan progress siswa dalam format PDF.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal with smooth animation */}
      {modalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black bg-opacity-50 transition-opacity duration-300"
          onClick={() => {
            setModalOpen(false)
            // Reset AI modal states when closing main modal
            setAiInputModalOpen(false)
            setAiResultModalOpen(false)
            setAiLoading(false)
            setAiError('')
            setAiItems([])
          }}
        >
          <div className="w-full flex justify-center items-start gap-4 max-w-[1400px] mt-8" onClick={(e) => e.stopPropagation()}>
            <div 
              className="bg-white rounded-lg shadow-2xl max-h-[90vh] overflow-y-auto transform transition-all duration-300 scale-100"
              style={{
                animation: 'modalSlideIn 0.3s ease-out',
                width: (aiInputModalOpen || aiResultModalOpen) ? 'calc(100% - 420px)' : '900px',
                maxWidth: (aiInputModalOpen || aiResultModalOpen) ? 'calc(100% - 420px)' : '900px'
              }}
            >
              {selectedTopic && (
                <>
                {/* Modal Header */}
                <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 z-10">
                  {isAddMode ? (
                    /* Wizard Header */
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h2 className="text-2xl font-bold text-gray-800">{t('topicNew.modal.addTitle')}</h2>
                          <p className="text-sm text-gray-500 mt-1">{t('topicNew.title')}</p>
                        </div>
                        <button
                          onClick={() => {
                            setModalOpen(false)
                            setIsAddMode(false)
                            setCurrentStep(0)
                          }}
                          className="text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                      
                      {/* Progress Bar */}
                      <div className="mb-3">
                        <div className="flex items-center justify-between text-sm mb-2">
                          <span className="font-medium text-gray-700">
                            Step {currentStep + 1} of {plannerSteps.length}
                          </span>
                          <span className="text-gray-500">
                            {getCompletionProgress().completed} / {getCompletionProgress().total} completed
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-cyan-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${(getCompletionProgress().completed / getCompletionProgress().total) * 100}%` }}
                          />
                        </div>
                      </div>
                      
                      {/* Stepper */}
                      <div className="flex items-center justify-between">
                        {plannerSteps.map((step, index) => (
                          <div key={step.id} className="flex-1 flex items-center justify-center relative">
                            {/* Connector line */}
                            {index > 0 && (
                              <div className={`absolute top-1/2 right-1/2 w-full h-1 -translate-y-1/2 -z-10 ${
                                isStepCompleted(index - 1) ? 'bg-green-500' : 'bg-gray-300'
                              }`} />
                            )}
                            <button
                              onClick={() => goToStep(index)}
                              className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-all z-10 ${
                                index === currentStep
                                  ? 'bg-cyan-500 text-white scale-110'
                                  : isStepCompleted(index)
                                  ? 'bg-green-500 text-white'
                                  : 'bg-gray-300 text-gray-600'
                              }`}
                              title={step.title}
                            >
                              {isStepCompleted(index) ? (
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              ) : (
                                index + 1
                              )}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    /* Edit Mode Header - Now Using Wizard */
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h2 className="text-2xl font-bold text-gray-800">Edit Unit Plan</h2>
                          <p className="text-sm text-gray-500 mt-1">{selectedTopic.topic_nama || 'Unit Plan'}</p>
                        </div>
                        <button
                          onClick={() => {
                            setModalOpen(false)
                            setIsAddMode(false)
                            setCurrentStep(0)
                          }}
                          className="text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>

                      {/* Wizard Progress Bar */}
                      <div className="flex items-start justify-between mb-6">
                        {plannerSteps.map((step, index) => (
                          <button 
                            key={step.id} 
                            type="button"
                            onClick={() => goToStep(index)}
                            className="flex-1 flex flex-col items-center relative group cursor-pointer"
                            title={`Go to ${step.title}`}
                          >
                            {/* Connector line - before circle */}
                            {index > 0 && (
                              <div className={`absolute top-5 right-1/2 w-full h-1 -z-10 ${
                                isStepCompleted(index - 1) ? 'bg-green-500' : 'bg-gray-200'
                              }`} />
                            )}
                            {/* Circle */}
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all z-10 group-hover:scale-110 ${
                              index === currentStep 
                                ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white ring-4 ring-cyan-200' 
                                : isStepCompleted(index)
                                ? 'bg-green-500 text-white group-hover:bg-green-600' 
                                : 'bg-gray-200 text-gray-500 group-hover:bg-gray-300'
                            }`}>
                              {isStepCompleted(index) ? (
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                              ) : (
                                <span>{index + 1}</span>
                              )}
                            </div>
                            {/* Label */}
                            <span className={`text-xs mt-2 text-center font-medium leading-tight max-w-[80px] group-hover:text-cyan-600 transition-colors ${
                              index === currentStep ? 'text-cyan-600' : 'text-gray-500'
                            }`}>
                              {step.title}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Modal Content */}
                <div className="px-6 py-6">
                  {/* Wizard Content (both add and edit mode) */}
                    <div className="space-y-6">
                      {/* Step Title and Description */}
                      <div className="bg-cyan-50 border-l-4 border-cyan-500 p-4 rounded">
                        <h3 className="text-lg font-semibold text-cyan-900 mb-1">
                          {plannerSteps[currentStep].title}
                        </h3>
                        <p className="text-sm text-cyan-700 mb-2">
                          {plannerSteps[currentStep].description}
                        </p>
                        <div className="bg-white p-3 rounded mt-3 border border-cyan-200">
                          <p className="text-xs font-semibold text-cyan-600 mb-1">💡 IB Guidance:</p>
                          <p className="text-sm text-gray-700 leading-relaxed">
                            {plannerSteps[currentStep].guidance}
                          </p>
                        </div>
                      </div>
                      
                      {/* Step Fields */}
                      <div className="space-y-6">
                        {/* Step 0: Basic Information */}
                        {currentStep === 0 && (
                          <>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                  {t('topicNew.fields.subject')} <span className="text-red-500">*</span>
                                </label>
                                <select
                                  value={selectedTopic.topic_subject_id || ''}
                                  onChange={(e) => {
                                    const subjectId = e.target.value
                                    setSelectedTopic(prev => ({ 
                                      ...prev, 
                                      topic_subject_id: subjectId,
                                      topic_kelas_id: '' // Reset kelas when subject changes
                                    }))
                                    // Fetch kelas for selected subject
                                    if (subjectId) {
                                      fetchKelasForSubject(subjectId)
                                    } else {
                                      setAllKelas([])
                                    }
                                  }}
                                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                >
                                  <option value="">{t('topicNew.fields.selectSubject')}</option>
                                  {subjects.map(subject => (
                                    <option key={subject.subject_id} value={subject.subject_id}>
                                      {subject.subject_name}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                  {t('topicNew.fields.class')} <span className="text-red-500">*</span>
                                </label>
                                <select
                                  value={selectedTopic.topic_kelas_id || ''}
                                  onChange={(e) => setSelectedTopic(prev => ({ ...prev, topic_kelas_id: e.target.value }))}
                                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                                  disabled={!selectedTopic.topic_subject_id || kelasLoading}
                                >
                                  <option value="">
                                    {kelasLoading ? 'Loading classes...' : 'Select a class...'}
                                  </option>
                                  {allKelas.map(kelas => (
                                    <option key={kelas.kelas_id} value={kelas.kelas_id}>
                                      {kelas.kelas_nama}
                                    </option>
                                  ))}
                                </select>
                                {!kelasLoading && selectedTopic.topic_subject_id && allKelas.length === 0 && (
                                  <p className="text-xs text-amber-600 mt-1">⚠️ No classes mapped to this subject in detail_kelas</p>
                                )}
                              </div>
                              <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                  MYP Year <span className="text-red-500">*</span>
                                </label>
                                <select
                                  value={selectedTopic.topic_year || ''}
                                  onChange={(e) => setSelectedTopic(prev => ({ ...prev, topic_year: e.target.value }))}
                                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                >
                                  <option value="">Select MYP Year...</option>
                                  <option value="1">MYP Year 1</option>
                                  <option value="3">MYP Year 3</option>
                                  <option value="5">MYP Year 5</option>
                                </select>
                              </div>
                            </div>
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Unit Title <span className="text-red-500">*</span>
                              </label>
                              <div className="mb-2">
                                <button 
                                  type="button" 
                                  onClick={() => openAiInputModal('en')}
                                  disabled={!selectedTopic.topic_subject_id}
                                  className={`inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-full border transition-colors ${
                                    selectedTopic.topic_subject_id
                                      ? 'border-purple-300 bg-purple-50 text-purple-700 hover:bg-purple-100 cursor-pointer'
                                      : 'border-gray-300 bg-gray-100 text-gray-400 cursor-not-allowed'
                                  }`}
                                  title={!selectedTopic.topic_subject_id ? t('topicNew.messages.selectSubjectFirst') : ''}
                                >
                                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M10 3.5a1.5 1.5 0 013 0V4a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-.5a1.5 1.5 0 000 3h.5a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-.5a1.5 1.5 0 00-3 0v.5a1 1 0 01-1 1H6a1 1 0 01-1-1v-3a1 1 0 00-1-1h-.5a1.5 1.5 0 010-3H4a1 1 0 001-1V6a1 1 0 011-1h3a1 1 0 001-1v-.5z" />
                                  </svg>
                                  AI Help
                                </button>
                              </div>
                              {!selectedTopic.topic_subject_id && (
                                <p className="text-xs text-amber-600 mb-2">⚠️ {t('topicNew.messages.selectSubjectFirst')}</p>
                              )}
                              <input
                                type="text"
                                value={selectedTopic.topic_nama || ''}
                                onChange={(e) => setSelectedTopic(prev => ({ ...prev, topic_nama: e.target.value }))}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 text-lg"
                                placeholder="e.g., How does energy shape our world?"
                              />
                              <p className="text-xs text-gray-500 mt-1">💡 Tip: Frame as an engaging question to provoke inquiry</p>
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                              <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                  Unit Number <span className="text-red-500">*</span>
                                </label>
                                <input
                                  type="number"
                                  value={selectedTopic.topic_urutan || ''}
                                  onChange={(e) => setSelectedTopic(prev => ({ ...prev, topic_urutan: e.target.value }))}
                                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                  placeholder="e.g., 1"
                                  min="1"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                  Duration (weeks) <span className="text-red-500">*</span>
                                </label>
                                <input
                                  type="number"
                                  value={selectedTopic.topic_duration || ''}
                                  onChange={(e) => setSelectedTopic(prev => ({ ...prev, topic_duration: e.target.value }))}
                                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                  placeholder="e.g., 6"
                                  min="1"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                  Hours per Week <span className="text-red-500">*</span>
                                </label>
                                <input
                                  type="number"
                                  value={selectedTopic.topic_hours_per_week || ''}
                                  onChange={(e) => setSelectedTopic(prev => ({ ...prev, topic_hours_per_week: e.target.value }))}
                                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                  placeholder="e.g., 4"
                                  min="1"
                                />
                              </div>
                            </div>
                          </>
                        )}
                        
                        {/* Step 1: Inquiry Question */}
                        {currentStep === 1 && (
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              Inquiry Question <span className="text-red-500">*</span>
                            </label>
                            <div className="mb-2">
                              <button 
                                type="button" 
                                onClick={() => openAiInputModal('en', 'inquiryQuestion')}
                                disabled={!isStepCompleted(0)}
                                className={`inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-full border transition-colors ${
                                  isStepCompleted(0)
                                    ? 'border-purple-300 bg-purple-50 text-purple-700 hover:bg-purple-100 cursor-pointer'
                                    : 'border-gray-300 bg-gray-100 text-gray-400 cursor-not-allowed'
                                }`}
                                title={!isStepCompleted(0) ? 'Complete all Step 1 fields first' : ''}
                              >
                                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M10 3.5a1.5 1.5 0 013 0V4a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-.5a1.5 1.5 0 000 3h.5a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-.5a1.5 1.5 0 00-3 0v.5a1 1 0 01-1 1H6a1 1 0 01-1-1v-3a1 1 0 00-1-1h-.5a1.5 1.5 0 010-3H4a1 1 0 001-1V6a1 1 0 011-1h3a1 1 0 001-1v-.5z" />
                                </svg>
                                AI Help
                              </button>
                            </div>
                            {!isStepCompleted(0) && (
                              <p className="text-xs text-amber-600 mb-2">⚠️ Complete all fields in Step 1 (Basic Information) first to use AI Help</p>
                            )}
                            <textarea
                              value={selectedTopic.topic_inquiry_question || ''}
                              onChange={(e) => setSelectedTopic(prev => ({ ...prev, topic_inquiry_question: e.target.value }))}
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                              rows={4}
                              placeholder="e.g., How do energy transformations affect our daily lives and environment?"
                            />
                          </div>
                        )}
                        
                        {/* Step 2: Concepts */}
                        {currentStep === 2 && (
                          <>
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <label className="block text-sm font-semibold text-gray-700">
                                  Key Concept <span className="text-red-500">*</span>
                                </label>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (isStepCompleted(0)) {
                                      setAiHelpType('keyConcept')
                                      setAiError('')
                                      setSelectedKeyConcepts([])
                                      setAiResultModalOpen(false)
                                      requestAiHelp('keyConcept')
                                    }
                                  }}
                                  disabled={!isStepCompleted(0)}
                                  title={!isStepCompleted(0) ? 'Complete Step 1 (Basic Information) first' : 'Get AI suggestions for Key Concepts'}
                                  className={`text-xs px-3 py-1.5 rounded-lg transition-colors inline-flex items-center gap-1.5 font-medium border ${
                                    isStepCompleted(0)
                                      ? 'bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-200 cursor-pointer'
                                      : 'bg-gray-100 text-gray-400 border-gray-300 cursor-not-allowed'
                                  }`}
                                >
                                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M10 3.5a1.5 1.5 0 013 0V4a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-.5a1.5 1.5 0 000 3h.5a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-.5a1.5 1.5 0 00-3 0v.5a1 1 0 01-1 1H6a1 1 0 01-1-1v-3a1 1 0 00-1-1h-.5a1.5 1.5 0 010-3H4a1 1 0 001-1V6a1 1 0 011-1h3a1 1 0 001-1v-.5z" />
                                  </svg>
                                  AI Help
                                </button>
                              </div>
                              {!isStepCompleted(0) && (
                                <p className="text-xs text-amber-600 mb-2">⚠️ Complete all fields in Step 1 (Basic Information) first to use AI Help</p>
                              )}
                              <p className="text-xs text-gray-600 mb-3">Select 1-3 Key Concepts from the 16 IB MYP concepts</p>
                              <div className="flex flex-wrap gap-2">
                                {keyConcepts.map((concept) => (
                                  <button
                                    key={concept}
                                    type="button"
                                    onClick={() => {
                                      const current = selectedTopic.topic_key_concept || ''
                                      const currentArray = current ? current.split(', ').filter(c => c) : []
                                      const newArray = currentArray.includes(concept)
                                        ? currentArray.filter(c => c !== concept)
                                        : [...currentArray, concept]
                                      setSelectedTopic(prev => ({ ...prev, topic_key_concept: newArray.join(', ') }))
                                    }}
                                    className={`px-3 py-2 rounded-full text-sm font-medium transition-all ${
                                      (selectedTopic.topic_key_concept || '').split(', ').includes(concept)
                                        ? 'bg-purple-500 text-white shadow-md scale-105'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                                  >
                                    {(selectedTopic.topic_key_concept || '').split(', ').includes(concept) && (
                                      <svg className="w-3 h-3 inline mr-1" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                      </svg>
                                    )}
                                    {concept}
                                  </button>
                                ))}
                              </div>
                              {selectedTopic.topic_key_concept && (
                                <p className="text-xs text-purple-600 mt-2">
                                  ✓ Selected: {selectedTopic.topic_key_concept.split(', ').filter(c => c).length} concept(s)
                                </p>
                              )}
                            </div>
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <label className="block text-sm font-semibold text-gray-700">
                                  Related Concept <span className="text-red-500">*</span>
                                </label>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (isStepCompleted(0)) {
                                      setAiHelpType('relatedConcept')
                                      setAiError('')
                                      setSelectedRelatedConcepts([])
                                      setAiResultModalOpen(false)
                                      requestAiHelp('relatedConcept')
                                    }
                                  }}
                                  disabled={!isStepCompleted(0)}
                                  title={!isStepCompleted(0) ? 'Complete Step 1 (Basic Information) first' : 'Get AI suggestions for Related Concepts'}
                                  className={`text-xs px-3 py-1.5 rounded-lg transition-colors inline-flex items-center gap-1.5 font-medium border ${
                                    isStepCompleted(0)
                                      ? 'bg-teal-50 hover:bg-teal-100 text-teal-700 border-teal-200 cursor-pointer'
                                      : 'bg-gray-100 text-gray-400 border-gray-300 cursor-not-allowed'
                                  }`}
                                >
                                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M10 3.5a1.5 1.5 0 013 0V4a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-.5a1.5 1.5 0 000 3h.5a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-.5a1.5 1.5 0 00-3 0v.5a1 1 0 01-1 1H6a1 1 0 01-1-1v-3a1 1 0 00-1-1h-.5a1.5 1.5 0 010-3H4a1 1 0 001-1V6a1 1 0 011-1h3a1 1 0 001-1v-.5z" />
                                  </svg>
                                  AI Help
                                </button>
                              </div>
                              {!isStepCompleted(0) && (
                                <p className="text-xs text-amber-600 mb-2">⚠️ Complete all fields in Step 1 (Basic Information) first to use AI Help</p>
                              )}
                              <p className="text-xs text-gray-600 mb-2">Enter subject-specific concepts, separated by commas</p>
                              <textarea
                                value={selectedTopic.topic_related_concept || ''}
                                onChange={(e) => setSelectedTopic(prev => ({ ...prev, topic_related_concept: e.target.value }))}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                rows={2}
                                placeholder="e.g., Energy, Transformation, Environment"
                              />
                            </div>
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <label className="block text-sm font-semibold text-gray-700">
                                  Global Context <span className="text-red-500">*</span>
                                </label>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (isStepCompleted(0)) {
                                      setAiHelpType('globalContext')
                                      setAiError('')
                                      setSelectedGlobalContexts([])
                                      setAiResultModalOpen(false)
                                      requestAiHelp('globalContext')
                                    }
                                  }}
                                  disabled={!isStepCompleted(0)}
                                  title={!isStepCompleted(0) ? 'Complete Step 1 (Basic Information) first' : 'Get AI suggestions for Global Context'}
                                  className={`text-xs px-3 py-1.5 rounded-lg transition-colors inline-flex items-center gap-1.5 font-medium border ${
                                    isStepCompleted(0)
                                      ? 'bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-200 cursor-pointer'
                                      : 'bg-gray-100 text-gray-400 border-gray-300 cursor-not-allowed'
                                  }`}
                                >
                                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M10 3.5a1.5 1.5 0 013 0V4a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-.5a1.5 1.5 0 000 3h.5a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-.5a1.5 1.5 0 00-3 0v.5a1 1 0 01-1 1H6a1 1 0 01-1-1v-3a1 1 0 00-1-1h-.5a1.5 1.5 0 010-3H4a1 1 0 001-1V6a1 1 0 011-1h3a1 1 0 001-1v-.5z" />
                                  </svg>
                                  AI Help
                                </button>
                              </div>
                              {!isStepCompleted(0) && (
                                <p className="text-xs text-amber-600 mb-2">⚠️ Complete all fields in Step 1 (Basic Information) first to use AI Help</p>
                              )}
                              <div className="flex flex-wrap gap-2 mt-2">
                                {globalContexts.map((context) => (
                                  <button
                                    key={context}
                                    onClick={() => {
                                      const current = selectedTopic.topic_global_context || ''
                                      const currentArray = current ? current.split(', ').filter(c => c) : []
                                      const newArray = currentArray.includes(context)
                                        ? currentArray.filter(c => c !== context)
                                        : [...currentArray, context]
                                      setSelectedTopic(prev => ({ ...prev, topic_global_context: newArray.join(', ') }))
                                    }}
                                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                                      (selectedTopic.topic_global_context || '').split(', ').includes(context)
                                        ? 'bg-cyan-500 text-white shadow-md scale-105'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                                  >
                                    {(selectedTopic.topic_global_context || '').split(', ').includes(context) && (
                                      <svg className="w-4 h-4 inline mr-1" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                      </svg>
                                    )}
                                    {context}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </>
                        )}
                        
                        {/* Step 3: Statement of Inquiry */}
                        {currentStep === 3 && (
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <label className="block text-sm font-semibold text-gray-700">
                                Statement of Inquiry <span className="text-red-500">*</span>
                              </label>
                              <button
                                type="button"
                                onClick={() => {
                                  const hasRequiredFields = selectedTopic.topic_key_concept && 
                                                           selectedTopic.topic_related_concept && 
                                                           selectedTopic.topic_global_context &&
                                                           selectedTopic.topic_nama
                                  if (hasRequiredFields) {
                                    setAiHelpType('statement')
                                    setAiError('')
                                    setSelectedStatements([])
                                    setAiResultModalOpen(false)
                                    requestAiHelp('statement')
                                  }
                                }}
                                disabled={!selectedTopic.topic_key_concept || !selectedTopic.topic_related_concept || !selectedTopic.topic_global_context || !selectedTopic.topic_nama}
                                title={(!selectedTopic.topic_key_concept || !selectedTopic.topic_related_concept || !selectedTopic.topic_global_context || !selectedTopic.topic_nama) ? 'Complete Unit Title, Key Concept, Related Concept, and Global Context first' : 'Get AI suggestions for Statement of Inquiry'}
                                className={`text-xs px-3 py-1.5 rounded-lg transition-colors inline-flex items-center gap-1.5 font-medium border ${
                                  (selectedTopic.topic_key_concept && selectedTopic.topic_related_concept && selectedTopic.topic_global_context && selectedTopic.topic_nama)
                                    ? 'bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-200 cursor-pointer'
                                    : 'bg-gray-100 text-gray-400 border-gray-300 cursor-not-allowed'
                                }`}
                              >
                                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M10 3.5a1.5 1.5 0 013 0V4a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-.5a1.5 1.5 0 000 3h.5a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-.5a1.5 1.5 0 00-3 0v.5a1 1 0 01-1 1H6a1 1 0 01-1-1v-3a1 1 0 00-1-1h-.5a1.5 1.5 0 010-3H4a1 1 0 001-1V6a1 1 0 011-1h3a1 1 0 001-1v-.5z" />
                                </svg>
                                AI Help
                              </button>
                            </div>
                            {(!selectedTopic.topic_key_concept || !selectedTopic.topic_related_concept || !selectedTopic.topic_global_context || !selectedTopic.topic_nama) && (
                              <p className="text-xs text-amber-600 mb-2">⚠️ Complete Unit Title, Key Concept, Related Concept, and Global Context first to use AI Help</p>
                            )}
                            <textarea
                              value={selectedTopic.topic_statement || ''}
                              onChange={(e) => setSelectedTopic(prev => ({ ...prev, topic_statement: e.target.value }))}
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                              rows={4}
                              placeholder="e.g., Understanding energy transformations helps us make informed decisions about sustainability..."
                            />
                          </div>
                        )}
                        
                        {/* Step 4: Learner Profile & Service */}
                        {currentStep === 4 && (
                          <>
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Learner Profile Attributes <span className="text-red-500">*</span>
                              </label>
                              <p className="text-xs text-gray-600 mb-3">Select IB Learner Profile attributes students will develop</p>
                              <div className="mb-2">
                                {(() => {
                                  // Check if required data for AI is available
                                  // In Edit mode, always enable since data is loaded from DB
                                  // In Add mode, check if step 2 (concepts) is completed
                                  const canUseAiHelp = !isAddMode || isStepCompleted(2)
                                  
                                  return (
                                    <button 
                                      type="button" 
                                      onClick={() => {
                                        if (!canUseAiHelp) return
                                        setAiHelpType('learnerProfile')
                                        setAiError('')
                                        setSelectedLearnerProfiles([])
                                        setAiResultModalOpen(false)
                                        requestAiHelp('learnerProfile')
                                      }}
                                      disabled={!canUseAiHelp}
                                      className={`inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-full border transition-colors ${
                                        canUseAiHelp
                                          ? 'border-green-300 bg-green-50 text-green-700 hover:bg-green-100 cursor-pointer'
                                          : 'border-gray-300 bg-gray-100 text-gray-400 cursor-not-allowed'
                                      }`}
                                      title={!canUseAiHelp ? 'Complete Key Concept, Related Concept, and Global Context first' : 'Get AI suggestions for Learner Profile'}
                                    >
                                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M10 3.5a1.5 1.5 0 013 0V4a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-.5a1.5 1.5 0 000 3h.5a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-.5a1.5 1.5 0 00-3 0v.5a1 1 0 01-1 1H6a1 1 0 01-1-1v-3a1 1 0 00-1-1h-.5a1.5 1.5 0 010-3H4a1 1 0 001-1V6a1 1 0 011-1h3a1 1 0 001-1v-.5z" />
                                      </svg>
                                      AI Help
                                    </button>
                                  )
                                })()}
                              </div>
                              {isAddMode && !isStepCompleted(2) && (
                                <p className="text-xs text-amber-600 mb-2">⚠️ Complete all Step 3 fields first to use AI Help</p>
                              )}
                              <div className="flex flex-wrap gap-2">
                                {learnerProfiles.map((profile) => (
                                  <button
                                    key={profile}
                                    type="button"
                                    onClick={() => {
                                      const current = selectedTopic.topic_learner_profile || ''
                                      const currentArray = current ? current.split(', ').filter(c => c) : []
                                      const newArray = currentArray.includes(profile)
                                        ? currentArray.filter(c => c !== profile)
                                        : [...currentArray, profile]
                                      setSelectedTopic(prev => ({ ...prev, topic_learner_profile: newArray.join(', ') }))
                                    }}
                                    className={`px-3 py-2 rounded-full text-sm font-medium transition-all ${
                                      (selectedTopic.topic_learner_profile || '').split(', ').includes(profile)
                                        ? 'bg-green-500 text-white shadow-md scale-105'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                                  >
                                    {(selectedTopic.topic_learner_profile || '').split(', ').includes(profile) && (
                                      <svg className="w-3 h-3 inline mr-1" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                      </svg>
                                    )}
                                    {profile}
                                  </button>
                                ))}
                              </div>
                              {selectedTopic.topic_learner_profile && (
                                <p className="text-xs text-green-600 mt-2">
                                  ✓ Selected: {selectedTopic.topic_learner_profile.split(', ').filter(c => c).length} attribute(s)
                                </p>
                              )}
                            </div>

                            {/* ATL (Approaches to Learning) */}
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <label className="block text-sm font-semibold text-gray-700">
                                  ATL Skills (Approaches to Learning) <span className="text-red-500">*</span>
                                </label>
                                {(() => {
                                  // Check if required data for AI is available
                                  // Need: step 1 (basic info with year), step 2 (inquiry), step 3 (concepts), step 4 (statement), and learner profile
                                  const canUseAiHelp = !isAddMode || (
                                    isStepCompleted(0) && 
                                    isStepCompleted(1) && 
                                    isStepCompleted(2) && 
                                    isStepCompleted(3) &&
                                    selectedTopic.topic_learner_profile?.trim()
                                  )
                                  
                                  return (
                                    <button 
                                      type="button" 
                                      onClick={() => {
                                        if (!canUseAiHelp) return
                                        setAiHelpType('atl')
                                        setAiError('')
                                        setSelectedAtlSkills([])
                                        setAiResultModalOpen(false)
                                        requestAiHelpAtl()
                                      }}
                                      disabled={!canUseAiHelp}
                                      className={`inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-full border transition-colors ${
                                        canUseAiHelp
                                          ? 'border-purple-300 bg-purple-50 text-purple-700 hover:bg-purple-100 cursor-pointer'
                                          : 'border-gray-300 bg-gray-100 text-gray-400 cursor-not-allowed'
                                      }`}
                                      title={!canUseAiHelp ? 'Complete all previous steps and select Learner Profile first' : 'Get AI suggestions for ATL skills based on your unit plan'}
                                    >
                                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M10 3.5a1.5 1.5 0 013 0V4a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-.5a1.5 1.5 0 000 3h.5a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-.5a1.5 1.5 0 00-3 0v.5a1 1 0 01-1 1H6a1 1 0 01-1-1v-3a1 1 0 00-1-1h-.5a1.5 1.5 0 010-3H4a1 1 0 001-1V6a1 1 0 011-1h3a1 1 0 001-1v-.5z" />
                                      </svg>
                                      AI Help
                                    </button>
                                  )
                                })()}
                              </div>
                              {isAddMode && !selectedTopic.topic_learner_profile?.trim() && (
                                <p className="text-xs text-amber-600 mb-2">⚠️ Complete all previous steps and select Learner Profile first to use AI Help</p>
                              )}
                              <p className="text-xs text-gray-600 mb-2">
                                List the ATL skills students will develop in this unit. Use AI Help to get suggestions based on your unit plan.
                              </p>
                              <textarea
                                value={selectedTopic.topic_atl || ''}
                                onChange={(e) => setSelectedTopic(prev => ({ ...prev, topic_atl: e.target.value }))}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                rows={4}
                                placeholder="e.g., Communication - Exchanging Information - Giving feedback: Give and receive meaningful feedback&#10;Thinking - Critical Thinking - Analyzing concepts: Analyze complex concepts into parts&#10;Research - Information Literacy - Accessing information: Access information to inform others..."
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Service Learning <span className="text-red-500">*</span>
                              </label>
                              <div className="mb-2">
                                {(() => {
                                  // Check if required data for AI is available
                                  // In Edit mode, always enable since data is loaded from DB
                                  // In Add mode, check if step 2 (concepts) is completed
                                  const canUseAiHelp = !isAddMode || isStepCompleted(2)
                                  
                                  return (
                                    <button 
                                      type="button" 
                                      onClick={() => {
                                        if (!canUseAiHelp) return
                                        setAiHelpType('serviceLearning')
                                        setAiError('')
                                        setSelectedServiceLearning([])
                                        setAiResultModalOpen(false)
                                        requestAiHelp('serviceLearning')
                                      }}
                                      disabled={!canUseAiHelp}
                                      className={`inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-full border transition-colors ${
                                        canUseAiHelp
                                          ? 'border-cyan-300 bg-cyan-50 text-cyan-700 hover:bg-cyan-100 cursor-pointer'
                                          : 'border-gray-300 bg-gray-100 text-gray-400 cursor-not-allowed'
                                      }`}
                                      title={!canUseAiHelp ? 'Complete Key Concept, Related Concept, and Global Context first' : 'Get AI suggestions for Service Learning'}
                                    >
                                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M10 3.5a1.5 1.5 0 013 0V4a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-.5a1.5 1.5 0 000 3h.5a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-.5a1.5 1.5 0 00-3 0v.5a1 1 0 01-1 1H6a1 1 0 01-1-1v-3a1 1 0 00-1-1h-.5a1.5 1.5 0 010-3H4a1 1 0 001-1V6a1 1 0 011-1h3a1 1 0 001-1v-.5z" />
                                      </svg>
                                      AI Help
                                    </button>
                                  )
                                })()}
                              </div>
                              {isAddMode && !isStepCompleted(2) && (
                                <p className="text-xs text-amber-600 mb-2">⚠️ Complete all Step 3 fields first to use AI Help</p>
                              )}
                              <textarea
                                value={selectedTopic.topic_service_learning || ''}
                                onChange={(e) => setSelectedTopic(prev => ({ ...prev, topic_service_learning: e.target.value }))}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                rows={3}
                                placeholder="e.g., Community energy audit project, raising awareness about renewable energy..."
                              />
                            </div>
                            
                            {/* Resources / Bibliography */}
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Resources / Bibliography
                              </label>
                              <div className="mb-2">
                                {(() => {
                                  // Check if required data for AI is available
                                  // In Edit mode, always enable since data is loaded from DB
                                  // In Add mode, check if step 2 (concepts) is completed
                                  const canUseAiHelp = !isAddMode || isStepCompleted(2)
                                  
                                  return (
                                    <button 
                                      type="button" 
                                      onClick={() => {
                                        if (!canUseAiHelp) return
                                        setAiHelpType('resources')
                                        setAiError('')
                                        setSelectedResources([])
                                        setAiResultModalOpen(false)
                                        requestAiHelp('resources')
                                      }}
                                      disabled={!canUseAiHelp}
                                      className={`inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-full border transition-colors ${
                                        canUseAiHelp
                                          ? 'border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 cursor-pointer'
                                          : 'border-gray-300 bg-gray-100 text-gray-400 cursor-not-allowed'
                                      }`}
                                      title={!canUseAiHelp ? 'Complete Key Concept, Related Concept, and Global Context first' : 'Get AI suggestions for Resources'}
                                    >
                                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M10 3.5a1.5 1.5 0 013 0V4a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-.5a1.5 1.5 0 000 3h.5a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-.5a1.5 1.5 0 00-3 0v.5a1 1 0 01-1 1H6a1 1 0 01-1-1v-3a1 1 0 00-1-1h-.5a1.5 1.5 0 010-3H4a1 1 0 001-1V6a1 1 0 011-1h3a1 1 0 001-1v-.5z" />
                                      </svg>
                                      AI Help
                                    </button>
                                  )
                                })()}
                              </div>
                              {isAddMode && !isStepCompleted(2) && (
                                <p className="text-xs text-amber-600 mb-2">⚠️ Complete all Step 3 fields first to use AI Help</p>
                              )}
                              <p className="text-xs text-gray-600 mb-2">List books, websites, articles, videos, or other educational resources for this unit</p>
                              <textarea
                                value={selectedTopic.topic_resources || ''}
                                onChange={(e) => setSelectedTopic(prev => ({ ...prev, topic_resources: e.target.value }))}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                                rows={4}
                                placeholder="e.g., Book: 'The Energy Bus' by Jon Gordon&#10;Website: National Geographic Education&#10;Video: TED-Ed - How Solar Panels Work..."
                              />
                            </div>
                          </>
                        )}
                        
                        {/* Step 5: Assessment */}
                        {currentStep === 5 && (
                          <>
                            {(() => {
                              // Check if assessment is approved (status === 1)
                              const isAssessmentApproved = !isAddMode && topicAssessment && topicAssessment.assessment_status === 1
                              const isAssessmentReadOnly = !isAddMode || isAssessmentApproved
                              
                              return (
                                <>
                                  {isAssessmentApproved && (
                                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                                      <p className="text-sm text-green-700">
                                        <strong>✅ Approved:</strong> This assessment has been approved and cannot be edited. Contact an administrator if changes are required.
                                      </p>
                                    </div>
                                  )}
                                  {!isAddMode && !isAssessmentApproved && (
                                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                                      <p className="text-sm text-blue-700">
                                        <strong>ℹ️ Note:</strong> Assessment fields are read-only in edit mode. To modify assessment details, please use the Assessment tab.
                                      </p>
                                    </div>
                                  )}
                            
                            {/* Criteria to Assess - Moved to top */}
                            <div className="mb-4">
                              <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Criteria to Assess <span className="text-red-500">*</span>
                              </label>
                              {wizardCriteria.length === 0 ? (
                                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                                  <p className="text-sm text-amber-700">
                                    ⚠️ No criteria found for this subject. Please add criteria in Subject Management first.
                                  </p>
                                </div>
                              ) : (
                                <div className="grid grid-cols-2 gap-3">
                                  {wizardCriteria.map(criterion => {
                                    const isSelected = wizardAssessment.selected_criteria.includes(criterion.criterion_id)
                                    return (
                                      <button
                                        key={criterion.criterion_id}
                                        type="button"
                                        onClick={() => {
                                          if (!isAssessmentReadOnly) {
                                            setWizardAssessment(prev => ({
                                              ...prev,
                                              selected_criteria: isSelected
                                                ? prev.selected_criteria.filter(id => id !== criterion.criterion_id)
                                                : [...prev.selected_criteria, criterion.criterion_id]
                                            }))
                                          }
                                        }}
                                        disabled={isAssessmentReadOnly}
                                        className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all text-left ${
                                          isSelected
                                            ? 'border-cyan-500 bg-cyan-50 text-cyan-700'
                                            : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                                        } ${isAssessmentReadOnly ? 'cursor-not-allowed opacity-75' : ''}`}
                                      >
                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-lg ${
                                          isSelected ? 'bg-cyan-500 text-white' : 'bg-gray-100 text-gray-500'
                                        }`}>
                                          {criterion.code}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <p className="font-medium text-sm">{criterion.name}</p>
                                        </div>
                                        {isSelected && (
                                          <svg className="w-5 h-5 text-cyan-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                          </svg>
                                        )}
                                      </button>
                                    )
                                  })}
                                </div>
                              )}
                              {wizardAssessment.selected_criteria.length > 0 && (
                                <p className="text-xs text-green-600 mt-2">
                                  ✓ Selected: {wizardAssessment.selected_criteria.length} criteria
                                </p>
                              )}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div className="col-span-2">
                                <div className="flex items-center justify-between mb-2">
                                  <label className="block text-sm font-semibold text-gray-700">
                                    Assessment Name <span className="text-red-500">*</span>
                                  </label>
                                  {(() => {
                                    const canUseAiHelp = wizardAssessment.selected_criteria.length > 0 && !isAssessmentReadOnly
                                    return (
                                      <button 
                                        type="button" 
                                        onClick={() => {
                                          if (!canUseAiHelp) return
                                          setAiHelpType('assessmentName')
                                          setAiError('')
                                          setAiResultModalOpen(false)
                                          requestAiHelp('assessmentName')
                                        }}
                                        disabled={!canUseAiHelp}
                                        className={`inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-full border transition-colors ${
                                          canUseAiHelp
                                            ? 'border-purple-300 bg-purple-50 text-purple-700 hover:bg-purple-100 cursor-pointer'
                                            : 'border-gray-300 bg-gray-100 text-gray-400 cursor-not-allowed'
                                        }`}
                                        title={!canUseAiHelp ? 'Select at least one Criteria to Assess first' : 'Get AI suggestions for Assessment Name'}
                                      >
                                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                                          <path d="M10 3.5a1.5 1.5 0 013 0V4a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-.5a1.5 1.5 0 000 3h.5a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-.5a1.5 1.5 0 00-3 0v.5a1 1 0 01-1 1H6a1 1 0 01-1-1v-3a1 1 0 00-1-1h-.5a1.5 1.5 0 010-3H4a1 1 0 001-1V6a1 1 0 011-1h3a1 1 0 001-1v-.5z" />
                                        </svg>
                                        AI Help
                                      </button>
                                    )
                                  })()}
                                </div>
                                {wizardAssessment.selected_criteria.length === 0 && (
                                  <p className="text-xs text-amber-600 mb-2">⚠️ Select Criteria to Assess first to use AI Help</p>
                                )}
                                <input
                                  type="text"
                                  value={wizardAssessment.assessment_nama}
                                  onChange={(e) => setWizardAssessment(prev => ({ ...prev, assessment_nama: e.target.value }))}
                                  disabled={isAssessmentReadOnly}
                                  className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 ${isAssessmentReadOnly ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                                  placeholder="e.g., Energy Conservation Project"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                  Semester <span className="text-red-500">*</span>
                                </label>
                                <select
                                  value={wizardAssessment.assessment_semester}
                                  onChange={(e) => setWizardAssessment(prev => ({ ...prev, assessment_semester: e.target.value }))}
                                  disabled={isAssessmentReadOnly}
                                  className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 ${isAssessmentReadOnly ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                                >
                                  <option value="">Select Semester...</option>
                                  <option value="1">Semester 1</option>
                                  <option value="2">Semester 2</option>
                                </select>
                              </div>
                            </div>
                            
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Description (Optional)
                              </label>
                              <textarea
                                value={wizardAssessment.assessment_keterangan}
                                onChange={(e) => setWizardAssessment(prev => ({ ...prev, assessment_keterangan: e.target.value }))}
                                disabled={isAssessmentReadOnly}
                                className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 ${isAssessmentReadOnly ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                                rows={2}
                                placeholder="Brief description of the assessment task..."
                              />
                            </div>
                            
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Conceptual Understanding <span className="text-red-500">*</span>
                              </label>
                              <p className="text-xs text-gray-500 mb-2">Describe what conceptual understanding students should demonstrate through this assessment</p>
                              <textarea
                                value={wizardAssessment.assessment_conceptual_understanding}
                                onChange={(e) => setWizardAssessment(prev => ({ ...prev, assessment_conceptual_understanding: e.target.value }))}
                                disabled={isAssessmentReadOnly}
                                className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 ${isAssessmentReadOnly ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                                rows={3}
                                placeholder="e.g., Students will demonstrate understanding of how energy transformation affects ecosystems..."
                              />
                            </div>
                            
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Task Specific Description <span className="text-red-500">*</span>
                              </label>
                              <p className="text-xs text-gray-500 mb-2">Provide specific details about what students need to do in this assessment</p>
                              <textarea
                                value={wizardAssessment.assessment_task_specific_description}
                                onChange={(e) => setWizardAssessment(prev => ({ ...prev, assessment_task_specific_description: e.target.value }))}
                                disabled={isAssessmentReadOnly}
                                className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 ${isAssessmentReadOnly ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                                rows={3}
                                placeholder="e.g., Create a multimedia presentation that explains the impact of human activities on local ecosystems..."
                              />
                            </div>
                            
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Assessment Instructions <span className="text-red-500">*</span>
                              </label>
                              <p className="text-xs text-gray-500 mb-2">Step-by-step instructions for students to complete the assessment</p>
                              <textarea
                                value={wizardAssessment.assessment_instructions}
                                onChange={(e) => setWizardAssessment(prev => ({ ...prev, assessment_instructions: e.target.value }))}
                                disabled={isAssessmentReadOnly}
                                className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 ${isAssessmentReadOnly ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                                rows={4}
                                placeholder="1. Research your chosen topic using at least 3 credible sources&#10;2. Create an outline of your presentation&#10;3. Design visuals that support your key points&#10;4. Prepare a 5-minute presentation..."
                              />
                            </div>
                                </>
                              )
                            })()}
                          </>
                        )}

                        {/* Step 6: Relationship */}
                        {currentStep === 6 && (
                          <>
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <label className="block text-sm font-semibold text-gray-700">
                                  Relationship: Summative Assessment & Statement of Inquiry
                                </label>
                                <button
                                  type="button"
                                  onClick={() => {
                                    // Validasi bahwa step 1-6 sudah diisi
                                    const requiredFields = [
                                      selectedTopic.topic_nama,
                                      selectedTopic.topic_inquiry_question,
                                      selectedTopic.topic_key_concept,
                                      selectedTopic.topic_statement,
                                      wizardAssessment.assessment_nama
                                    ];
                                    
                                    const allFilled = requiredFields.every(field => field && field.toString().trim() !== '');
                                    
                                    if (!allFilled) {
                                      alert('Please complete all previous steps (1-6) before using AI assistance.');
                                      return;
                                    }
                                    
                                    // Langsung request AI help tanpa input modal
                                    setAiHelpType('assessmentRelationship');
                                    setAiError('');
                                    setAiResultModalOpen(false);
                                    requestAiHelp('assessmentRelationship');
                                  }}
                                  disabled={
                                    aiLoading || 
                                    !selectedTopic.topic_nama || 
                                    !selectedTopic.topic_inquiry_question || 
                                    !selectedTopic.topic_key_concept || 
                                    !selectedTopic.topic_statement || 
                                    !wizardAssessment.assessment_nama
                                  }
                                  className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                                    aiLoading || 
                                    !selectedTopic.topic_nama || 
                                    !selectedTopic.topic_inquiry_question || 
                                    !selectedTopic.topic_key_concept || 
                                    !selectedTopic.topic_statement || 
                                    !wizardAssessment.assessment_nama
                                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                      : 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white'
                                  }`}
                                >
                                  <FontAwesomeIcon icon={faSpinner} spin={aiLoading} className="text-xs" />
                                  AI Help
                                </button>
                              </div>
                              <textarea
                                value={wizardAssessment.assessment_relationship}
                                onChange={(e) => setWizardAssessment(prev => ({ ...prev, assessment_relationship: e.target.value }))}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                rows={4}
                                placeholder="Explain how the summative assessment relates to the statement of inquiry..."
                              />
                            </div>

                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                              <p className="text-sm text-blue-700">
                                💡 <strong>Tip:</strong> A strong relationship statement explains how the assessment task allows students to demonstrate their understanding of the Statement of Inquiry and the conceptual understanding developed in this unit.
                              </p>
                            </div>
                          </>
                        )}

                        {/* Step 7: Task Specific Clarification (TSC) */}
                        {currentStep === 7 && (
                          <>
                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                              <div className="flex items-start justify-between">
                                <p className="text-sm text-amber-700 flex-1">
                                  <strong>📝 Task Specific Clarification (TSC)</strong> helps students understand what is expected at each achievement level for this specific assessment task. Fill in the clarifications below to customize the rubric for your assessment.
                                </p>
                                {wizardStrands.length > 0 && (
                                  <button
                                    onClick={() => requestAiHelpTSC()}
                                    disabled={aiLoading || !wizardAssessment.assessment_nama?.trim() || !wizardAssessment.assessment_task_specific_description?.trim()}
                                    className="ml-4 inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                                  >
                                    {aiLoading ? (
                                      <>
                                        <FontAwesomeIcon icon={faSpinner} spin className="w-4 h-4" />
                                        <span>Generating TSC...</span>
                                      </>
                                    ) : (
                                      <>
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                        </svg>
                                        AI Help
                                      </>
                                    )}
                                  </button>
                                )}
                              </div>
                              {wizardStrands.length > 0 && (!wizardAssessment.assessment_nama?.trim() || !wizardAssessment.assessment_task_specific_description?.trim()) && (
                                <p className="text-xs text-amber-600 mt-2">⚠️ Complete Assessment Name and Task Specific Description in Step 6 first to use AI Help</p>
                              )}
                            </div>

                            {loadingStrands ? (
                              <div className="flex items-center justify-center py-8">
                                <FontAwesomeIcon icon={faSpinner} spin className="text-2xl text-cyan-500 mr-3" />
                                <span className="text-gray-600">Loading rubric structure...</span>
                              </div>
                            ) : wizardStrands.length === 0 ? (
                              <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
                                <p className="text-gray-600">
                                  No strands found for the selected criteria and MYP Year level.
                                </p>
                                <p className="text-sm text-gray-500 mt-2">
                                  Please ensure you have selected criteria in Step 6 and the MYP Year is set in Step 1.
                                </p>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (wizardAssessment.selected_criteria.length > 0 && selectedTopic.topic_year) {
                                      fetchStrandsForCriteria(wizardAssessment.selected_criteria, selectedTopic.topic_year)
                                    }
                                  }}
                                  className="mt-4 px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors"
                                >
                                  Reload Strands
                                </button>
                              </div>
                            ) : (
                              <>
                                {/* Group by Criterion */}
                                {wizardAssessment.selected_criteria.map(criterionId => {
                                  const criterion = wizardCriteria.find(c => c.criterion_id === criterionId)
                                  if (!criterion) return null
                                  
                                  const criterionStrands = wizardStrands.filter(s => s.criterion_id === criterionId)
                                  if (criterionStrands.length === 0) return null
                                  
                                  // Band levels in order (excluding 0)
                                  const bandLevels = ['7-8', '5-6', '3-4', '1-2']
                                  
                                  return (
                                    <div key={criterionId} className="mb-6 border border-gray-200 rounded-lg overflow-hidden">
                                      {/* Criterion Header */}
                                      <div className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white px-4 py-3">
                                        <h4 className="font-bold text-lg">Criterion {criterion.code}: {criterion.name}</h4>
                                      </div>
                                      
                                      {/* Band Levels */}
                                      <div className="divide-y divide-gray-200">
                                        {bandLevels.map(bandLabel => {
                                          // Get rubrics for this band from wizardRubrics
                                          const bandRubrics = wizardRubrics.filter(r => {
                                            const strand = criterionStrands.find(s => s.strand_id === r.strand_id)
                                            return strand && r.band_label === bandLabel
                                          })
                                          
                                          // Get band color
                                          const getBandColor = (band) => {
                                            switch(band) {
                                              case '7-8': return 'bg-green-100 text-green-800 border-green-300'
                                              case '5-6': return 'bg-blue-100 text-blue-800 border-blue-300'
                                              case '3-4': return 'bg-yellow-100 text-yellow-800 border-yellow-300'
                                              case '1-2': return 'bg-red-100 text-red-800 border-red-300'
                                              case '0': return 'bg-gray-100 text-gray-800 border-gray-300'
                                              default: return 'bg-gray-100 text-gray-800 border-gray-300'
                                            }
                                          }
                                          
                                          return (
                                            <div key={bandLabel} className="p-4">
                                              <div className="flex items-start gap-4">
                                                {/* Band Label */}
                                                <div className={`flex-shrink-0 w-14 h-10 rounded-lg border flex items-center justify-center font-bold text-sm ${getBandColor(bandLabel)}`}>
                                                  {bandLabel}
                                                </div>
                                                
                                                {/* Content Area - Per Strand */}
                                                <div className="flex-1 space-y-3">
                                                  {criterionStrands.map(strand => {
                                                    const rubric = bandRubrics.find(r => r.strand_id === strand.strand_id)
                                                    const tscKey = `${criterionId}_${bandLabel}_${strand.label}` // criterionId_bandLabel_strandLabel
                                                    
                                                    // Skip if no rubric defined for this strand at this band level
                                                    if (!rubric) return null
                                                    
                                                    return (
                                                      <div key={strand.strand_id} className="bg-gray-50 rounded-lg p-3">
                                                        {/* Strand Header */}
                                                        <div className="flex items-center gap-2 mb-2">
                                                          <span className="inline-flex items-center justify-center w-6 h-6 bg-cyan-100 text-cyan-700 rounded-full text-xs font-bold">
                                                            {strand.label}
                                                          </span>
                                                          <p className="text-xs font-semibold text-gray-500">STRAND {strand.label.toUpperCase()}</p>
                                                        </div>
                                                        
                                                        {/* Subject Criteria for this strand */}
                                                        <div className="mb-2">
                                                          <p className="text-xs text-gray-400 mb-1">Subject Criteria:</p>
                                                          <p className="text-sm text-gray-700">
                                                            <span className="font-medium">{strand.label}.</span> {rubric.description}
                                                          </p>
                                                        </div>
                                                        
                                                        {/* TSC Input for this strand */}
                                                        <div>
                                                          <label className="text-xs text-gray-400 mb-1 block">Task-Specific Clarification:</label>
                                                          <textarea
                                                            value={wizardAssessment.assessment_tsc?.[tscKey] || ''}
                                                            onChange={(e) => {
                                                              console.log('🔄 Updating TSC:', tscKey, '=', e.target.value)
                                                              setWizardAssessment(prev => {
                                                                const newState = {
                                                                  ...prev,
                                                                  assessment_tsc: {
                                                                    ...prev.assessment_tsc,
                                                                    [tscKey]: e.target.value
                                                                  }
                                                                }
                                                                console.log('📊 New assessment_tsc state:', newState.assessment_tsc)
                                                                return newState
                                                              })
                                                            }}
                                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-none"
                                                            rows={2}
                                                            placeholder={`TSC for strand ${strand.label} at level ${bandLabel}...`}
                                                          />
                                                        </div>
                                                      </div>
                                                    )
                                                  })}
                                                </div>
                                              </div>
                                            </div>
                                          )
                                        })}
                                      </div>
                                    </div>
                                  )
                                })}
                                
                                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                                  <p className="text-sm text-amber-700">
                                    ⚠️ <strong>Important:</strong> Task Specific Clarification (TSC) must be completed before giving this assessment to students. Each achievement level should have clear descriptions.
                                  </p>
                                </div>
                              </>
                            )}
                          </>
                        )}
                        
                        {/* Step 8: Unit Reflection (Prior & After) */}
                        {currentStep === 8 && (
                          <>
                            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
                              <p className="text-sm text-purple-700">
                                <strong>💭 Unit Reflection</strong> - Reflect on your planning before teaching and your outcomes after teaching. This helps improve your practice and future unit planning.
                              </p>
                            </div>

                            {/* Prior Reflection */}
                            <div className="mb-6">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-lg">📝</span>
                                <label className="block text-base font-semibold text-gray-800">
                                  Prior Reflection (Before Teaching)
                                </label>
                              </div>
                              <p className="text-sm text-gray-600 mb-3">
                                Before you begin teaching, reflect on your expectations and planning:
                                <br/>• What do you hope students will achieve?
                                <br/>• What potential challenges do you foresee?
                                <br/>• How will you engage different learners?
                                <br/>• What prior knowledge should students have?
                              </p>
                              <textarea
                                value={selectedTopic.topic_reflection_prior || ''}
                                onChange={(e) => setSelectedTopic(prev => ({ ...prev, topic_reflection_prior: e.target.value }))}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                                rows={5}
                                placeholder="Reflect on your planning, expectations, and anticipated challenges..."
                              />
                            </div>

                            {/* After Reflection */}
                            <div className="mb-6">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-lg">✅</span>
                                <label className="block text-base font-semibold text-gray-800">
                                  After Reflection (After Teaching)
                                </label>
                              </div>
                              <p className="text-sm text-gray-600 mb-3">
                                After completing the unit, reflect on the outcomes:
                                <br/>• What worked well in this unit?
                                <br/>• What would you change or improve next time?
                                <br/>• How did students perform and engage?
                                <br/>• What did you learn as an educator?
                              </p>
                              <textarea
                                value={selectedTopic.topic_reflection_after || ''}
                                onChange={(e) => setSelectedTopic(prev => ({ ...prev, topic_reflection_after: e.target.value }))}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                                rows={5}
                                placeholder="Complete this after teaching the unit. Reflect on successes, improvements, and learning outcomes..."
                              />
                            </div>

                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                              <p className="text-sm text-blue-700">
                                💡 <strong>Note:</strong> You can fill "After Reflection" later by editing this unit after you've completed teaching it. The "Prior Reflection" helps you start with clear intentions.
                              </p>
                            </div>
                          </>
                        )}
                      </div>
                      
                      {/* Navigation Buttons */}
                      <div className="flex items-center justify-between pt-6 border-t border-gray-200">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={goToPreviousStep}
                            disabled={currentStep === 0}
                            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                            Previous
                          </button>
                          
                        </div>
                        
                        <div className="text-center flex-1">
                          {(() => {
                            const missingFields = getMissingFields()
                            const progress = getCompletionProgress()
                            
                            if (progress.completed === plannerSteps.length) {
                              return (
                                <div className="flex items-center justify-center gap-2 text-green-600">
                                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                  </svg>
                                  <span className="text-sm font-medium">All steps completed - Ready to save!</span>
                                </div>
                              )
                            } else if (missingFields.length > 0) {
                              // Group missing fields by step
                              const groupedByStep = missingFields.reduce((acc, item) => {
                                if (!acc[item.step]) acc[item.step] = []
                                acc[item.step].push(item.field)
                                return acc
                              }, {})
                              
                              return (
                                <div className="text-left">
                                  <p className="text-xs text-red-600 font-semibold mb-1">⚠️ Missing required fields:</p>
                                  <div className="max-h-20 overflow-y-auto">
                                    {Object.entries(groupedByStep).map(([step, fields]) => (
                                      <p key={step} className="text-xs text-gray-600">
                                        <span className="font-medium text-red-500">Step {step}:</span> {fields.join(', ')}
                                      </p>
                                    ))}
                                  </div>
                                </div>
                              )
                            } else {
                              return <p className="text-sm text-gray-500">Fill all required fields</p>
                            }
                          })()}
                        </div>
                        
                        {currentStep < plannerSteps.length - 1 ? (
                          <button
                            onClick={goToNextStep}
                            className="px-6 py-3 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                          >
                            Next
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </button>
                        ) : (
                          <button
                            onClick={isAddMode ? saveNewTopic : updateExistingTopic}
                            disabled={saving}
                            className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                          >
                            {saving ? (
                              <>
                                <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
                                {isAddMode ? 'Saving...' : 'Updating...'}
                              </>
                            ) : (
                              <>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                {isAddMode ? 'Create Unit' : 'Update Unit'}
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                </div>
              </>
            )}
            </div>

            {(aiInputModalOpen || aiResultModalOpen) && (
              <div className="flex-shrink-0 h-[90vh]" onClick={(e) => e.stopPropagation()}>
                {aiInputModalOpen && !aiResultModalOpen && (
                  <div className="bg-white rounded-2xl shadow-2xl h-full flex flex-col" style={{ width: '400px' }}>
                    <div className="px-6 py-4 border-b border-gray-200 bg-purple-50 flex-shrink-0 rounded-t-2xl">
                      <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-gray-900">
                          {aiHelpType === 'inquiryQuestion' ? 'AI Help for Inquiry Question' : t('topicNew.aiHelp.title')}
                        </h2>
                        <button
                          onClick={() => setAiInputModalOpen(false)}
                          className="inline-flex items-center justify-center rounded-md p-2 text-gray-500 hover:bg-gray-100"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    <div className="px-6 py-4 space-y-4 flex-1 overflow-y-auto">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          {aiHelpType === 'inquiryQuestion' 
                            ? 'What aspects or angles do you want the inquiry question to explore?' 
                            : t('topicNew.aiHelp.inputLabel')}
                        </label>
                        <textarea
                          value={aiUserInput}
                          onChange={(e) => {
                            setAiUserInput(e.target.value)
                            setAiError('')
                          }}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                          rows={6}
                          placeholder={aiHelpType === 'inquiryQuestion'
                            ? 'Example: Focus on environmental impact, sustainability, real-world applications...'
                            : t('topicNew.aiHelp.inputPlaceholder')}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          {aiHelpType === 'inquiryQuestion'
                            ? '💡 Describe the focus areas, themes, or perspectives you want students to explore through the inquiry question'
                            : t('topicNew.aiHelp.inputHint')}
                        </p>
                        {aiError && (
                          <p className="text-sm text-red-600 mt-2">{aiError}</p>
                        )}
                      </div>
                    </div>

                    <div className="px-6 py-4 border-t border-gray-200 flex-shrink-0 bg-gray-50 rounded-b-2xl flex items-center justify-between">
                      <button
                        onClick={() => setAiInputModalOpen(false)}
                        className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
                      >
                        {t('topicNew.buttons.cancel')}
                      </button>
                      <button
                        onClick={() => requestAiHelp(aiHelpType)}
                        className="px-4 py-2 text-white bg-purple-600 hover:bg-purple-700 rounded-xl transition-colors inline-flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M10 3.5a1.5 1.5 0 013 0V4a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-.5a1.5 1.5 0 000 3h.5a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-.5a1.5 1.5 0 00-3 0v.5a1 1 0 01-1 1H6a1 1 0 01-1-1v-3a1 1 0 00-1-1h-.5a1.5 1.5 0 010-3H4a1 1 0 001-1V6a1 1 0 011-1h3a1 1 0 001-1v-.5z" />
                        </svg>
                        {t('topicNew.buttons.requestAiHelp')}
                      </button>
                    </div>
                  </div>
                )}
                
                {aiResultModalOpen && (
                  <SlideOver
                    isOpen={true}
                    inline={true}
                    onClose={() => setAiResultModalOpen(false)}
                    title={aiHelpType === 'inquiryQuestion' ? 'AI Suggestions: Inquiry Questions' : aiHelpType === 'keyConcept' ? 'AI Suggestions: Key Concepts' : aiHelpType === 'relatedConcept' ? 'AI Suggestions: Related Concepts' : aiHelpType === 'globalContext' ? 'AI Suggestions: Global Context' : aiHelpType === 'statement' ? 'AI Suggestions: Statement of Inquiry' : aiHelpType === 'learnerProfile' ? 'AI Suggestions: Learner Profile' : aiHelpType === 'serviceLearning' ? 'AI Suggestions: Service Learning' : aiHelpType === 'atl' ? 'AI Suggestions: ATL Skills' : aiHelpType === 'resources' ? 'AI Suggestions: Resources' : aiHelpType === 'assessmentName' ? 'AI Suggestions: Assessment Details' : aiHelpType === 'assessmentRelationship' ? 'AI Suggestions: Assessment Relationship' : 'AI Suggestions: Unit Title'}
                    size="md"
                  >
                    <div className="flex flex-col h-full">
                      <div 
                        ref={aiScrollRef} 
                        className="flex-1 overflow-y-auto p-4"
                        style={{ 
                          overflowAnchor: 'none', 
                          scrollBehavior: 'auto',
                          willChange: 'scroll-position'
                        }}
                      >
                        {aiLoading && (
                          <div className="flex flex-col items-center justify-center py-12 px-6">
                            <FontAwesomeIcon icon={faSpinner} spin className="text-purple-600 text-4xl mb-4" />
                            <p className="text-gray-800 font-semibold text-lg mb-2">{t('topicNew.aiHelp.loading')}</p>
                            <p className="text-gray-500 text-sm text-center max-w-md">
                              {t('topicNew.aiHelp.loadingMessage')}
                            </p>
                          </div>
                        )}

                        {!aiLoading && aiItems.length > 0 && (
                          <div className="space-y-4">
                            {aiItems.map((item) => {
                              // Remove bold formatting (**text**) from AI response
                              const cleanOption = (item.option || '').replace(/\*\*/g, '')
                              const cleanText = (item.text || '').replace(/\*\*/g, '')
                              const cleanReason = (item.reason || '').replace(/\*\*/g, '')
                              const cleanLink = (item.link || '').replace(/\*\*/g, '')
                              // Assessment details fields
                              const cleanConceptualUnderstanding = (item.conceptual_understanding || '').replace(/\*\*/g, '')
                              const cleanTaskDescription = (item.task_description || '').replace(/\*\*/g, '')
                              const cleanInstructions = (item.instructions || '').replace(/\*\*/g, '')
                              const titleToUse = cleanOption || cleanText || ''

                              return (
                                <div 
                                  key={item.index} 
                                  className={`border rounded-lg p-4 transition-colors ${
                                    (selectedInquiryQuestions.includes(item.index) && aiHelpType === 'inquiryQuestion') ||
                                    (selectedKeyConcepts.includes(item.index) && aiHelpType === 'keyConcept') ||
                                    (selectedRelatedConcepts.includes(item.index) && aiHelpType === 'relatedConcept') ||
                                    (selectedGlobalContexts.includes(item.index) && aiHelpType === 'globalContext') ||
                                    (selectedStatements.includes(item.index) && aiHelpType === 'statement') || (selectedLearnerProfiles.includes(item.index) && aiHelpType === 'learnerProfile') || (selectedServiceLearning.includes(item.index) && aiHelpType === 'serviceLearning') || (selectedAtlSkills.includes(item.id) && aiHelpType === 'atl') || (selectedResources.includes(item.index) && aiHelpType === 'resources')
                                      ? 'border-purple-500 bg-purple-50'
                                      : 'border-gray-200 bg-white hover:border-purple-300'
                                  }`}
                                  onClick={(e) => {
                                    // Prevent any click on card from scrolling
                                    if (e.target.type !== 'checkbox') {
                                      e.preventDefault()
                                    }
                                  }}
                                >
                                  <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                      {(aiHelpType === 'inquiryQuestion' || aiHelpType === 'keyConcept' || aiHelpType === 'relatedConcept' || aiHelpType === 'globalContext' || aiHelpType === 'statement' || aiHelpType === 'learnerProfile' || aiHelpType === 'serviceLearning' || aiHelpType === 'atl' || aiHelpType === 'resources') && (
                                        <input
                                          type="checkbox"
                                          id={`ai-item-${aiHelpType === 'atl' ? item.id : item.index}`}
                                          checked={aiHelpType === 'inquiryQuestion' 
                                            ? selectedInquiryQuestions.includes(item.index)
                                            : aiHelpType === 'keyConcept'
                                            ? selectedKeyConcepts.includes(item.index)
                                            : aiHelpType === 'relatedConcept'
                                            ? selectedRelatedConcepts.includes(item.index)
                                            : aiHelpType === 'globalContext'
                                            ? selectedGlobalContexts.includes(item.index)
                                            : aiHelpType === 'statement'
                                            ? selectedStatements.includes(item.index)
                                            : aiHelpType === 'learnerProfile'
                                            ? selectedLearnerProfiles.includes(item.index)
                                            : aiHelpType === 'serviceLearning'
                                            ? selectedServiceLearning.includes(item.index)
                                            : aiHelpType === 'atl'
                                            ? selectedAtlSkills.includes(Number(item.id))
                                            : selectedResources.includes(item.index)}
                                          onMouseDown={(e) => {
                                            e.preventDefault()
                                            e.stopPropagation()
                                            if (aiHelpType === 'inquiryQuestion') {
                                              toggleInquiryQuestion(item.index)
                                            } else if (aiHelpType === 'keyConcept') {
                                              toggleKeyConcept(item.index)
                                            } else if (aiHelpType === 'relatedConcept') {
                                              toggleRelatedConcept(item.index)
                                            } else if (aiHelpType === 'globalContext') {
                                              toggleGlobalContext(item.index)
                                            } else if (aiHelpType === 'statement') {
                                              toggleStatement(item.index)
                                            } else if (aiHelpType === 'learnerProfile') {
                                              toggleLearnerProfile(item.index)
                                            } else if (aiHelpType === 'serviceLearning') {
                                              toggleServiceLearning(item.index)
                                            } else if (aiHelpType === 'atl') {
                                              console.log('☑️ ATL Checkbox clicked - item:', item)
                                              console.log('☑️ Current selectedAtlSkills:', selectedAtlSkills)
                                              const itemId = Number(item.id) // Ensure number
                                              const isSelected = selectedAtlSkills.includes(itemId)
                                              console.log('☑️ Is selected:', isSelected, 'itemId:', itemId, 'type:', typeof itemId)
                                              if (isSelected) {
                                                setSelectedAtlSkills(prev => {
                                                  const updated = prev.filter(id => id !== itemId)
                                                  console.log('☑️ After uncheck:', updated)
                                                  return updated
                                                })
                                              } else {
                                                setSelectedAtlSkills(prev => {
                                                  const updated = [...prev, itemId]
                                                  console.log('☑️ After check:', updated)
                                                  return updated
                                                })
                                              }
                                            } else {
                                              toggleResources(item.index)
                                            }
                                          }}
                                          readOnly
                                          className="w-5 h-5 text-purple-600 border-gray-300 rounded focus:ring-0 focus:ring-offset-0 cursor-pointer"
                                        />
                                      )}
                                      <span className="bg-purple-100 text-purple-700 font-semibold text-sm px-2.5 py-1 rounded-full">
                                        {aiHelpType === 'atl' ? `ATL Skill ${item.index || aiItems.indexOf(item) + 1}` : t('topicNew.aiHelp.suggestion', { index: item.index })}
                                      </span>
                                      {item.category && (
                                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                                          item.category === 'Factual' ? 'bg-blue-100 text-blue-700' :
                                          item.category === 'Conceptual' ? 'bg-amber-100 text-amber-700' :
                                          'bg-rose-100 text-rose-700'
                                        }`}>
                                          {item.category}
                                        </span>
                                      )}
                                    </div>
                                    {aiHelpType !== 'inquiryQuestion' && aiHelpType !== 'keyConcept' && aiHelpType !== 'relatedConcept' && aiHelpType !== 'globalContext' && aiHelpType !== 'statement' && aiHelpType !== 'learnerProfile' && aiHelpType !== 'serviceLearning' && aiHelpType !== 'atl' && aiHelpType !== 'resources' && (
                                      <button
                                        onClick={() => aiHelpType === 'assessmentName' ? insertAiSuggestion(item) : insertAiSuggestion(titleToUse)}
                                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors inline-flex items-center gap-2 flex-shrink-0"
                                      >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        {t('topicNew.buttons.useThis')}
                                      </button>
                                    )}
                                  </div>
                                  
                                  {/* ATL Skills Display */}
                                  {aiHelpType === 'atl' && (
                                    <div className="space-y-3">
                                      <div className="flex items-center gap-2">
                                        <span className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-700 rounded">
                                          {item.skill_category}
                                        </span>
                                        <span className="text-xs text-gray-600">
                                          {item.strand} • {item.cluster}
                                        </span>
                                      </div>
                                      <div>
                                        <h4 className="text-sm font-semibold text-gray-700 mb-1">Descriptor:</h4>
                                        <p className="text-sm text-gray-800 leading-relaxed">{item.descriptor_text}</p>
                                      </div>
                                      {item.summary_sentence && (
                                        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border-l-4 border-indigo-400 p-3 rounded">
                                          <p className="text-sm text-gray-800 leading-relaxed italic">"{item.summary_sentence}"</p>
                                        </div>
                                      )}
                                      {item.reason && (
                                        <div className="bg-purple-50 border-l-3 border-purple-400 p-3 rounded">
                                          <h4 className="text-xs font-semibold text-purple-900 mb-1">💡 Why this ATL?</h4>
                                          <p className="text-xs text-purple-800 leading-relaxed">{item.reason}</p>
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {/* Question or Title (option) */}
                                  {cleanOption && (
                                    <div className="mb-3">
                                      <h4 className="text-base font-bold text-gray-900 mb-1">
                                        {aiHelpType === 'inquiryQuestion' ? 'Question:' 
                                          : aiHelpType === 'keyConcept' ? 'Key Concept:'
                                          : aiHelpType === 'relatedConcept' ? 'Related Concept:'
                                          : aiHelpType === 'globalContext' ? 'Global Context:'
                                          : aiHelpType === 'statement' ? 'Statement of Inquiry:' 
                                          : aiHelpType === 'learnerProfile' ? 'Learner Profile Attribute:' 
                                          : aiHelpType === 'serviceLearning' ? 'Service Learning Opportunity:'
                                          : aiHelpType === 'resources' ? 'Resource:' 
                                          : aiHelpType === 'assessmentName' ? 'Assessment Name:'
                                          : aiHelpType === 'assessmentRelationship' ? 'Relationship Explanation:'
                                          : t('topicNew.aiHelp.unitTitleLabel')}
                                      </h4>
                                      <p className="text-gray-800 leading-relaxed">{cleanOption}</p>
                                    </div>
                                  )}
                                  
                                  {/* Link (for resources) */}
                                  {cleanLink && aiHelpType === 'resources' && (
                                    <div className="mb-3">
                                      <h4 className="text-sm font-semibold text-gray-700 mb-1 flex items-center gap-1">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                        </svg>
                                        Link:
                                      </h4>
                                      <a 
                                        href={cleanLink} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="text-blue-600 hover:text-blue-800 hover:underline text-sm break-all"
                                      >
                                        {cleanLink}
                                      </a>
                                    </div>
                                  )}
                                  
                                  {/* Assessment Details Fields (for assessmentName) */}
                                  {aiHelpType === 'assessmentName' && (
                                    <>
                                      {cleanConceptualUnderstanding && (
                                        <div className="mb-3">
                                          <h4 className="text-sm font-semibold text-gray-700 mb-1 flex items-center gap-1">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                            </svg>
                                            Conceptual Understanding:
                                          </h4>
                                          <p className="text-gray-700 text-sm leading-relaxed bg-gray-50 p-2 rounded">{cleanConceptualUnderstanding}</p>
                                        </div>
                                      )}
                                      {cleanTaskDescription && (
                                        <div className="mb-3">
                                          <h4 className="text-sm font-semibold text-gray-700 mb-1 flex items-center gap-1">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                                            </svg>
                                            Task Specific Description:
                                          </h4>
                                          <p className="text-gray-700 text-sm leading-relaxed bg-gray-50 p-2 rounded">{cleanTaskDescription}</p>
                                        </div>
                                      )}
                                      {cleanInstructions && (
                                        <div className="mb-3">
                                          <h4 className="text-sm font-semibold text-gray-700 mb-1 flex items-center gap-1">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                                            </svg>
                                            Assessment Instructions:
                                          </h4>
                                          <pre className="text-gray-700 text-sm leading-relaxed bg-gray-50 p-2 rounded whitespace-pre-wrap font-sans">{cleanInstructions}</pre>
                                        </div>
                                      )}
                                    </>
                                  )}
                                  
                                  {/* Description (text) */}
                                  {cleanText && (
                                    <div className="mb-3">
                                      <h4 className="text-sm font-semibold text-gray-700 mb-1">{t('topicNew.aiHelp.descriptionLabel')}</h4>
                                      <p className="text-gray-700 text-sm leading-relaxed">{cleanText}</p>
                                    </div>
                                  )}
                                  
                                  {/* Reason - skip for ATL as it has its own Why this ATL section */}
                                  {cleanReason && aiHelpType !== 'atl' && (
                                    <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                                      <h4 className="text-sm font-semibold text-blue-900 mb-1 flex items-center gap-1">
                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                        </svg>
                                        {t('topicNew.aiHelp.reasonLabel')}
                                      </h4>
                                      <p className="text-blue-800 text-sm leading-relaxed">{cleanReason}</p>
                                    </div>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        )}

                        {!aiLoading && !aiError && aiItems.length === 0 && (
                          <div className="text-center py-12 text-gray-500">
                            <p>Tidak ada saran yang dihasilkan</p>
                          </div>
                        )}
                      </div>

                      {(aiHelpType === 'inquiryQuestion' || aiHelpType === 'keyConcept' || aiHelpType === 'relatedConcept' || aiHelpType === 'globalContext' || aiHelpType === 'statement' || aiHelpType === 'learnerProfile' || aiHelpType === 'serviceLearning' || aiHelpType === 'atl' || aiHelpType === 'resources') && aiItems.length > 0 && !aiLoading && (
                        <div className="border-t border-gray-200 bg-gray-50 p-4 flex-shrink-0">
                          {aiError && (
                            <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-start gap-2">
                              <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                              </svg>
                              <span>{aiError}</span>
                            </div>
                          )}
                          <div className="mb-3 text-sm">
                            <p className="font-semibold text-gray-700 mb-2">Selection Summary:</p>
                            {aiHelpType === 'inquiryQuestion' ? (
                              <>
                                <div className="flex flex-wrap gap-3">
                                  {(() => {
                                    const factualItems = aiItems.filter(i => i.category === 'Factual')
                                    const conceptualItems = aiItems.filter(i => i.category === 'Conceptual')
                                    const debatableItems = aiItems.filter(i => i.category === 'Debatable')
                                    
                                    const factualCount = factualItems.filter(i => selectedInquiryQuestions.includes(i.index)).length
                                    const conceptualCount = conceptualItems.filter(i => selectedInquiryQuestions.includes(i.index)).length
                                    const debatableCount = debatableItems.filter(i => selectedInquiryQuestions.includes(i.index)).length
                                    
                                    return (
                                      <>
                                        <span className={`px-3 py-1.5 rounded-lg border ${factualCount > 0 ? 'bg-blue-50 border-blue-300 text-blue-700 font-medium' : 'bg-gray-100 border-gray-300 text-gray-500'}`}>
                                          🔵 Factual: {factualCount}/3
                                        </span>
                                        <span className={`px-3 py-1.5 rounded-lg border ${conceptualCount > 0 ? 'bg-amber-50 border-amber-300 text-amber-700 font-medium' : 'bg-gray-100 border-gray-300 text-gray-500'}`}>
                                          🟡 Conceptual: {conceptualCount}/3
                                        </span>
                                        <span className={`px-3 py-1.5 rounded-lg border ${debatableCount > 0 ? 'bg-rose-50 border-rose-300 text-rose-700 font-medium' : 'bg-gray-100 border-gray-300 text-gray-500'}`}>
                                          🔴 Debatable: {debatableCount}/3
                                        </span>
                                      </>
                                    )
                                  })()}
                                </div>
                                <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                  </svg>
                                  Select at least 1 question from each category
                                </p>
                              </>
                            ) : aiHelpType === 'keyConcept' ? (
                              <>
                                <div className="flex items-center gap-2">
                                  <span className={`px-3 py-1.5 rounded-lg border ${selectedKeyConcepts.length > 0 ? 'bg-purple-50 border-purple-300 text-purple-700 font-medium' : 'bg-gray-100 border-gray-300 text-gray-500'}`}>
                                    ✓ Selected: {selectedKeyConcepts.length} concept(s)
                                  </span>
                                </div>
                                <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                  </svg>
                                  Select at least 1 key concept
                                </p>
                              </>
                            ) : aiHelpType === 'relatedConcept' ? (
                              <>
                                <div className="flex items-center gap-2">
                                  <span className={`px-3 py-1.5 rounded-lg border ${selectedRelatedConcepts.length > 0 ? 'bg-teal-50 border-teal-300 text-teal-700 font-medium' : 'bg-gray-100 border-gray-300 text-gray-500'}`}>
                                    ✓ Selected: {selectedRelatedConcepts.length} concept(s)
                                  </span>
                                </div>
                                <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                  </svg>
                                  Select at least 1 related concept
                                </p>
                              </>
                            ) : aiHelpType === 'globalContext' ? (
                              <>
                                <div className="flex items-center gap-2">
                                  <span className={`px-3 py-1.5 rounded-lg border ${selectedGlobalContexts.length > 0 ? 'bg-cyan-50 border-cyan-300 text-cyan-700 font-medium' : 'bg-gray-100 border-gray-300 text-gray-500'}`}>
                                    ✓ Selected: {selectedGlobalContexts.length} context(s)
                                  </span>
                                </div>
                                <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                  </svg>
                                  Select at least 1 global context
                                </p>
                              </>
                            ) : aiHelpType === 'statement' ? (
                              <>
                                <div className="flex items-center gap-2">
                                  <span className={`px-3 py-1.5 rounded-lg border ${selectedStatements.length > 0 ? 'bg-indigo-50 border-indigo-300 text-indigo-700 font-medium' : 'bg-gray-100 border-gray-300 text-gray-500'}`}>
                                    ✓ Selected: {selectedStatements.length} statement
                                  </span>
                                </div>
                                <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                  </svg>
                                  Select 1 statement of inquiry
                                </p>
                              </>
                            ) : aiHelpType === 'learnerProfile' ? (
                              <>
                                <div className="flex items-center gap-2">
                                  <span className={`px-3 py-1.5 rounded-lg border ${selectedLearnerProfiles.length > 0 ? 'bg-green-50 border-green-300 text-green-700 font-medium' : 'bg-gray-100 border-gray-300 text-gray-500'}`}>
                                    ✓ Selected: {selectedLearnerProfiles.length} attribute(s)
                                  </span>
                                </div>
                                <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                  </svg>
                                  Select at least 1 learner profile attribute
                                </p>
                              </>
                            ) : aiHelpType === 'atl' ? (
                              <>
                                <div className="flex items-center gap-2">
                                  <span className={`px-3 py-1.5 rounded-lg border ${selectedAtlSkills.length > 0 ? 'bg-purple-50 border-purple-300 text-purple-700 font-medium' : 'bg-gray-100 border-gray-300 text-gray-500'}`}>
                                    ✓ Selected: {selectedAtlSkills.length} ATL skill(s)
                                  </span>
                                </div>
                                <p className="text-xs text-purple-600 mt-2 flex items-center gap-1">
                                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                  </svg>
                                  Select at least 1 ATL skill (3 recommended)
                                </p>
                              </>
                            ) : aiHelpType === 'resources' ? (
                              <>
                                <div className="flex items-center gap-2">
                                  <span className={`px-3 py-1.5 rounded-lg border ${selectedResources.length > 0 ? 'bg-amber-50 border-amber-300 text-amber-700 font-medium' : 'bg-gray-100 border-gray-300 text-gray-500'}`}>
                                    ✓ Selected: {selectedResources.length} resource(s)
                                  </span>
                                </div>
                                <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                  </svg>
                                  Select one or more resources
                                </p>
                              </>
                            ) : (
                              <>
                                <div className="flex items-center gap-2">
                                  <span className={`px-3 py-1.5 rounded-lg border ${selectedServiceLearning.length > 0 ? 'bg-cyan-50 border-cyan-300 text-cyan-700 font-medium' : 'bg-gray-100 border-gray-300 text-gray-500'}`}>
                                    ✓ Selected: {selectedServiceLearning.length} option
                                  </span>
                                </div>
                                <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                  </svg>
                                  Select 1 service learning option
                                </p>
                              </>
                            )}
                          </div>
                          <div className="flex justify-end gap-3">
                            <button
                              onClick={() => setAiResultModalOpen(false)}
                              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={aiHelpType === 'inquiryQuestion' ? applySelectedInquiryQuestions : aiHelpType === 'keyConcept' ? applySelectedKeyConcepts : aiHelpType === 'relatedConcept' ? applySelectedRelatedConcepts : aiHelpType === 'globalContext' ? applySelectedGlobalContexts : aiHelpType === 'statement' ? applySelectedStatements : aiHelpType === 'learnerProfile' ? applySelectedLearnerProfiles : aiHelpType === 'serviceLearning' ? applySelectedServiceLearning : aiHelpType === 'atl' ? applySelectedAtlSkills : applySelectedResources}
                              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors inline-flex items-center gap-2"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              {aiHelpType === 'inquiryQuestion' ? 'Apply Selected Questions' : aiHelpType === 'keyConcept' ? 'Apply Selected Concepts' : aiHelpType === 'relatedConcept' ? 'Apply Selected Concepts' : aiHelpType === 'globalContext' ? 'Apply Selected Contexts' : aiHelpType === 'statement' ? 'Apply Selected Statement' : aiHelpType === 'learnerProfile' ? 'Apply Selected Attributes' : aiHelpType === 'serviceLearning' ? 'Apply Selected Option' : aiHelpType === 'atl' ? 'Apply Selected Skills' : aiHelpType === 'resources' ? 'Apply Selected Resources' : 'Apply Selected Option'}
                            </button>
                          </div>
                        </div>
                      )}

                      {aiHelpType === 'unitTitle' && (
                        <div className="mt-4 flex justify-end">
                          <button
                            onClick={() => setAiResultModalOpen(false)}
                            className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                          >
                            Close
                          </button>
                        </div>
                      )}
                    </div>
                  </SlideOver>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Save Notification Toast */}
      {saveNotification && (
        <div 
          className="fixed top-4 right-4 z-[60] bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3"
          style={{
            animation: 'toastSlideIn 0.3s ease-out'
          }}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span className="font-medium">Saved successfully!</span>
        </div>
      )}

      {/* AI Input & Result modals are now embedded beside the main modal (handled inside modalOpen block) */}

      {/* Floating Action Button (FAB) - Only Add Unit */}
      <div className="fixed bottom-8 right-8 z-40">
        {/* Secondary Buttons (shown when FAB is open) */}
        <div className={`absolute bottom-20 right-0 flex flex-col items-end gap-3 transition-all duration-300 ${fabOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
          {/* Add Unit Button */}
          <button
            onClick={() => {
              openAddModal()
              setFabOpen(false)
            }}
            className="group flex items-center gap-3 transition-all duration-200 hover:scale-105"
          >
            <span className="bg-white px-4 py-2 rounded-full shadow-lg text-sm font-medium text-gray-700 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
              Add Unit
            </span>
            <div className="w-12 h-12 rounded-full bg-gradient-to-r from-cyan-500 to-cyan-600 text-white flex items-center justify-center shadow-lg hover:shadow-xl transition-all">
              <FontAwesomeIcon icon={faBook} className="text-lg" />
            </div>
          </button>
        </div>
        
        {/* Main FAB Button */}
        <button
          onClick={() => setFabOpen(!fabOpen)}
          className={`w-16 h-16 rounded-full bg-gradient-to-r from-red-500 to-red-600 text-white flex items-center justify-center shadow-2xl hover:shadow-3xl transition-all duration-300 hover:scale-110 ${fabOpen ? 'rotate-45' : 'rotate-0'}`}
        >
          <FontAwesomeIcon icon={faPlus} className="text-2xl" />
        </button>
      </div>
      
      {/* Click outside to close FAB menu */}
      {fabOpen && (
        <div
          className="fixed inset-0 z-30"
          onClick={() => setFabOpen(false)}
        />
      )}

      {/* Assessment Form Modal */}
      <Modal
        isOpen={showAssessmentForm}
        onClose={() => {
          setShowAssessmentForm(false)
          setAssessmentFormData({
            assessment_nama: '',
            assessment_tanggal: '',
            assessment_keterangan: '',
            assessment_detail_kelas_id: '',
            assessment_topic_id: '',
            selected_criteria: []
          })
          setAssessmentFormErrors({})
          setTopicsForAssessment([])
          setCriteriaForAssessment([])
          setEditingAssessment(null)
        }}
        title={editingAssessment ? "Edit Assessment" : "Add New Assessment"}
      >
        {/* Approved Assessment Warning */}
        {editingAssessment && editingAssessment.assessment_status === 1 && (
          <div className="mb-4 p-4 bg-green-50 border-l-4 border-green-500 rounded-md">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-green-800">
                  Approved Assessment - Cannot Edit
                </h3>
                <p className="mt-1 text-sm text-green-700">
                  This assessment has been approved and cannot be edited. Contact an administrator if changes are required.
                </p>
              </div>
            </div>
          </div>
        )}
        
        {/* Edit Mode Sub-header */}
        {editingAssessment && editingAssessment.assessment_status !== 1 && (
          <div className="mb-4 pb-3 border-b border-gray-200">
            <p className="text-sm text-gray-600">
              Editing <span className="font-semibold text-gray-800">assessment date</span> only. 
              Use Planning tab for other changes.
            </p>
          </div>
        )}
        
        {/* Info Panel for New Assessment */}
        {!editingAssessment && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <div className="flex items-start">
              <FontAwesomeIcon icon={faInfoCircle} className="text-blue-500 mt-0.5 mr-2" />
              <div className="text-sm text-blue-700">
                <p className="font-medium mb-1">Date Rules:</p>
                <ul className="text-xs space-y-1">
                  <li>• Minimum 2 days ahead from today</li>
                  <li>• Maximum 2 assessments per class per day</li>
                  <li>• Topic selection is required</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleAssessmentSubmit} className="space-y-6">
          {/* Summary Card - Read-Only Information (Edit Mode Only) */}
          {editingAssessment && (
            <div className="bg-gray-50 rounded-xl p-5 space-y-4">
              <div className="flex items-center gap-2 mb-3">
                <FontAwesomeIcon icon={faInfoCircle} className="text-gray-400" />
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Assessment Details</h3>
              </div>

              {/* Assessment Name */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Assessment Name
                </label>
                <p className="text-base font-semibold text-gray-900">{assessmentFormData.assessment_nama}</p>
              </div>

              {/* Subject/Class & Semester - Grid 2 kolom */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Subject / Class
                  </label>
                  <p className="text-sm text-gray-800">
                    {(() => {
                      const selected = detailKelasOptions.find(opt => opt.detail_kelas_id == assessmentFormData.assessment_detail_kelas_id)
                      return selected ? `${selected.subject_name} - ${selected.kelas_nama}` : '-'
                    })()}
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Semester
                  </label>
                  <p className="text-sm text-gray-800">
                    {assessmentFormData.assessment_semester == 1 ? 'Semester 1' : assessmentFormData.assessment_semester == 2 ? 'Semester 2' : '-'}
                  </p>
                </div>
              </div>

              {/* IB MYP Criteria */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-2">
                  IB MYP Criteria
                </label>
                <div className="flex flex-wrap gap-2">
                  {criteriaForAssessment
                    .filter(c => assessmentFormData.selected_criteria.includes(c.criterion_id))
                    .map(c => (
                      <span key={c.criterion_id} className="inline-flex items-center px-3 py-1.5 rounded-lg bg-purple-100 text-purple-800 border border-purple-200 text-sm">
                        <span className="font-bold mr-1.5">Criterion {c.code}:</span>
                        <span>{c.name}</span>
                      </span>
                    ))}
                </div>
              </div>

              {/* Topic */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Topic / Unit
                </label>
                <p className="text-sm text-gray-800">
                  {(() => {
                    const selected = topicsForAssessment.find(tp => tp.topic_id == assessmentFormData.assessment_topic_id)
                    return selected ? selected.topic_nama : '-'
                  })()}
                </p>
              </div>

              {/* Note/Description */}
              {assessmentFormData.assessment_keterangan && (
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Note / Description
                  </label>
                  <p className="text-sm text-gray-800 whitespace-pre-wrap">
                    {assessmentFormData.assessment_keterangan}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Form Fields for New Assessment (Only shown when NOT editing) */}
          {!editingAssessment && (
            <>
              {/* Assessment Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Assessment Name *
                </label>
                <input
                  name="assessment_nama"
                  type="text"
                  value={assessmentFormData.assessment_nama}
                  onChange={handleAssessmentInputChange}
                  placeholder="e.g., Chapter 3 Quiz, Midterm Exam"
                  className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                    assessmentFormErrors.assessment_nama ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {assessmentFormErrors.assessment_nama && (
                  <p className="text-red-500 text-sm mt-1">{assessmentFormErrors.assessment_nama}</p>
                )}
              </div>
            </>
          )}

          {/* Assessment Date - Editable (Highlighted untuk Edit Mode) */}
          <div className={editingAssessment ? 'bg-blue-50 border-2 border-blue-400 rounded-xl p-5 shadow-sm' : ''}>
            <label className={`block font-semibold mb-2 flex items-center gap-2 ${
              editingAssessment ? 'text-base text-blue-900' : 'text-sm text-gray-700'
            }`}>
              <FontAwesomeIcon icon={faCalendar} className={editingAssessment ? 'text-blue-600' : 'text-gray-400'} />
              Assessment Date *
              {editingAssessment && editingAssessment.assessment_status === 1 && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">
                  Approved - Locked
                </span>
              )}
            </label>
            <input
              name="assessment_tanggal"
              type="date"
              value={assessmentFormData.assessment_tanggal}
              onChange={handleAssessmentInputChange}
              min={getMinimumDate().toISOString().split('T')[0]}
              disabled={editingAssessment && editingAssessment.assessment_status === 1}
              className={`w-full px-4 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                editingAssessment ? 'py-3.5 text-lg font-medium' : 'py-2.5'
              } ${
                assessmentFormErrors.assessment_tanggal ? 'border-red-500' : editingAssessment ? 'border-blue-500' : 'border-gray-300'
              } ${editingAssessment && editingAssessment.assessment_status === 1 ? 'bg-gray-50 cursor-not-allowed' : 'bg-white'}`}
            />
            {assessmentFormErrors.assessment_tanggal && (
              <p className="text-red-500 text-sm mt-2">{assessmentFormErrors.assessment_tanggal}</p>
            )}
            {!(editingAssessment && editingAssessment.assessment_status === 1) && (
              <p className={`text-xs mt-2 ${
                editingAssessment ? 'text-blue-700 font-medium' : 'text-gray-500'
              }`}>
                <FontAwesomeIcon icon={faInfoCircle} className="mr-1" />
                {editingAssessment 
                  ? 'Leave empty to save as draft (no approval required)'
                  : `Minimum date: ${getMinimumDate().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' })}`
                }
              </p>
            )}
          </div>

          {/* Subject/Class Selection */}
          {!editingAssessment && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Subject / Class *
            </label>
                <select
                  name="assessment_detail_kelas_id"
                  value={assessmentFormData.assessment_detail_kelas_id}
                  onChange={handleAssessmentInputChange}
                  className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                    assessmentFormErrors.assessment_detail_kelas_id ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  <option value="">Select Subject / Class</option>
                  {detailKelasOptions.map(opt => (
                    <option key={opt.detail_kelas_id} value={opt.detail_kelas_id}>
                      {opt.subject_name} - {opt.kelas_nama}
                    </option>
                  ))}
                </select>
                {assessmentFormErrors.assessment_detail_kelas_id && (
                  <p className="text-red-500 text-sm mt-1">{assessmentFormErrors.assessment_detail_kelas_id}</p>
                )}
          </div>
          )}

          {/* Semester Selection */}
          {!editingAssessment && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Semester
            </label>
              <select
                name="assessment_semester"
                value={assessmentFormData.assessment_semester}
                onChange={handleAssessmentInputChange}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              >
                <option value="">Select Semester</option>
                <option value="1">Semester 1</option>
                <option value="2">Semester 2</option>
              </select>
          </div>
          )}

          {/* Criteria Selection (Multiple) */}
          {!editingAssessment && assessmentFormData.assessment_detail_kelas_id && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                IB MYP Criteria *
                <span className="text-xs text-gray-500 font-normal ml-1">(Select one or more)</span>
              </label>
                  {criteriaForAssessment.length === 0 ? (
                    <p className="text-sm text-red-500">No criteria available for this subject. Please add criteria in Subject Management first.</p>
                  ) : (
                    <div className={`space-y-2 p-4 border rounded-lg ${
                      assessmentFormErrors.selected_criteria ? 'border-red-500 bg-red-50' : 'border-gray-300 bg-white'
                    }`}>
                      {criteriaForAssessment.map(c => (
                        <label 
                          key={c.criterion_id}
                          className="flex items-start gap-3 p-3 rounded-lg border border-transparent hover:bg-blue-50 hover:border-blue-200 cursor-pointer transition-all"
                        >
                          <input
                            type="checkbox"
                            checked={assessmentFormData.selected_criteria.includes(c.criterion_id)}
                            onChange={() => toggleCriterionSelection(c.criterion_id)}
                            className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <div className="flex-1">
                            <div className="font-semibold text-gray-800 text-sm">
                              Criterion {c.code}
                            </div>
                            <div className="text-sm text-gray-600 mt-0.5">
                              {c.name}
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                  {assessmentFormErrors.selected_criteria && (
                    <p className="text-red-500 text-sm mt-1">{assessmentFormErrors.selected_criteria}</p>
                  )}
            </div>
          )}

          {/* Topic Selection */}
          {!editingAssessment && assessmentFormData.assessment_detail_kelas_id && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Topic / Unit *
              </label>
                  <select
                    name="assessment_topic_id"
                    value={assessmentFormData.assessment_topic_id}
                    onChange={handleAssessmentInputChange}
                    disabled={topicsLoadingAssessment || topicsForAssessment.length === 0}
                    className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                      assessmentFormErrors.assessment_topic_id ? 'border-red-500' : 'border-gray-300'
                    }`}
                  >
                    <option value="">
                      {topicsLoadingAssessment ? 'Loading topics...' : (topicsForAssessment.length === 0 ? 'No topics available' : 'Select Topic')}
                    </option>
                    {topicsForAssessment.map(tp => (
                      <option key={tp.topic_id} value={tp.topic_id}>{tp.topic_nama}</option>
                    ))}
                  </select>
                  {assessmentFormErrors.assessment_topic_id && (
                    <p className="text-red-500 text-sm mt-1">{assessmentFormErrors.assessment_topic_id}</p>
                  )}
                  {(!topicsLoadingAssessment && topicsForAssessment.length === 0 && assessmentFormData.assessment_detail_kelas_id) && (
                    <p className="text-xs text-red-500 mt-1">No topics available for this subject/class. Please create a unit first.</p>
                  )}
            </div>
          )}

          {/* Note/Description */}
          {!editingAssessment && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Note / Description
            </label>
              <textarea
                name="assessment_keterangan"
                value={assessmentFormData.assessment_keterangan}
                onChange={handleAssessmentInputChange}
                placeholder="Optional notes or description"
                rows={3}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors resize-none"
              />
          </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-6 mt-2 border-t border-gray-200">
            <button
              type="button"
              onClick={() => {
                setShowAssessmentForm(false)
                setAssessmentFormData({
                  assessment_nama: '',
                  assessment_tanggal: '',
                  assessment_keterangan: '',
                  assessment_detail_kelas_id: '',
                  assessment_topic_id: '',
                  selected_criteria: []
                })
                setAssessmentFormErrors({})
                setTopicsForAssessment([])
                setCriteriaForAssessment([])
                setEditingAssessment(null)
              }}
              disabled={submittingAssessment}
              className="px-6 py-2.5 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors disabled:opacity-50 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submittingAssessment || detailKelasOptions.length === 0}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2 font-medium"
            >
              {submittingAssessment ? (
                <>
                  <FontAwesomeIcon icon={faSpinner} spin />
                  Submitting...
                </>
              ) : (
                <>
                  <FontAwesomeIcon icon={faPaperPlane} />
                  Submit Assessment
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* Grading Modal */}
      <Modal
        isOpen={gradingModalOpen}
        onClose={() => {
          if (!savingGrades) {
            setGradingModalOpen(false)
            setGradingAssessment(null)
            setGradingStudents([])
            setGradingData({})
            setExpandedStudents(new Set())
          }
        }}
        title={
          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-1">Input Nilai - Grade Students</h2>
            {gradingAssessment && (
              <div className="text-sm text-gray-600">
                <p className="font-semibold">{gradingAssessment.assessment_nama}</p>
                <p>{gradingAssessment.kelas_nama} • {gradingAssessment.subject_name}</p>
                <div className="flex gap-2 mt-2">
                  {gradingAssessment.criteria?.map(c => (
                    <span key={c.code} className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs font-bold">
                      {c.code}: {c.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        }
        maxWidth="max-w-6xl"
      >
        {loadingGrading ? (
          <div className="flex justify-center items-center py-12">
            <FontAwesomeIcon icon={faSpinner} spin className="text-4xl text-blue-500" />
          </div>
        ) : (
          <div className="max-h-[70vh] overflow-y-auto">
            {/* Info Banner */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex gap-3">
                <FontAwesomeIcon icon={faInfoCircle} className="text-blue-500 mt-1" />
                <div className="text-sm text-blue-800 flex-1">
                  <p className="font-semibold mb-2">IB MYP Criterion Grading (0-8)</p>
                  <ul className="list-disc ml-5 space-y-1">
                    <li>Enter grade (0-8) for each criterion (A, B, C, D)</li>
                    <li>Final grade (1-7) is calculated from the sum of all criteria (0-32 total)</li>
                    <li>Click on a student to expand and enter grades</li>
                  </ul>
                </div>
              </div>
            </div>
            {/* Students List */}
            <div className="space-y-3">
              {gradingStudents.map((student, index) => {
                const isExpanded = expandedStudents.has(student.detail_siswa_id)
                const studentData = gradingData[student.detail_siswa_id]
                
                // Get criterion grades for display
                const criterionGrades = studentData?.criterion_grades || { A: null, B: null, C: null, D: null }
                const total = Object.values(criterionGrades).reduce((sum, g) => sum + (g || 0), 0)
                
                return (
                  <div key={student.detail_siswa_id} className="border border-gray-200 rounded-lg overflow-hidden">
                    {/* Student Header */}
                    <div
                      className="flex items-center justify-between p-4 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => toggleStudentExpansion(student.detail_siswa_id)}
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <div className="flex items-center justify-center w-8 h-8 bg-blue-500 text-white rounded-full font-bold text-sm">
                          {index + 1}
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-800">{student.nama}</h3>
                          <div className="flex gap-2 mt-1">
                            {['A', 'B', 'C', 'D'].map(code => (
                              <span key={code} className={`text-xs px-2 py-0.5 rounded font-bold ${getGradeColor(criterionGrades[code])}`}>
                                {code}: {criterionGrades[code] !== null ? criterionGrades[code] : '-'}
                              </span>
                            ))}
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded font-bold">
                              Total: {total}/32
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-gray-400">
                        {isExpanded ? '▼' : '▶'}
                      </div>
                    </div>

                    {/* Student Grading Form - Simplified */}
                    {isExpanded && (
                      <div className="p-4 bg-white border-t border-gray-200">
                        {/* Criterion Grades Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                          {gradingAssessment?.criteria.map(criterion => {
                            const currentGrade = criterionGrades[criterion.code]
                            
                            return (
                              <div key={criterion.criterion_id} className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                                <div className="flex items-center justify-between mb-2">
                                  <h4 className="font-bold text-purple-800">
                                    Criterion {criterion.code}
                                  </h4>
                                  <span className={`px-2 py-0.5 rounded text-xs font-bold ${getGradeColor(currentGrade)}`}>
                                    {currentGrade !== null ? currentGrade : '-'}/8
                                  </span>
                                </div>
                                <p className="text-xs text-gray-600 mb-3">{criterion.name}</p>
                                <select
                                  value={currentGrade ?? ''}
                                  onChange={(e) => updateCriterionGrade(student.detail_siswa_id, criterion.code, e.target.value)}
                                  className="w-full px-3 py-2 text-lg font-bold text-center border border-purple-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                                >
                                  <option value="">-</option>
                                  {[0, 1, 2, 3, 4, 5, 6, 7, 8].map(g => (
                                    <option key={g} value={g}>{g}</option>
                                  ))}
                                </select>
                              </div>
                            )
                          })}
                        </div>

                        {/* Comments */}
                        <div className="pt-4 border-t border-gray-200">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Comments (Optional)
                          </label>
                          <textarea
                            value={studentData?.comments || ''}
                            onChange={(e) => updateStudentComment(student.detail_siswa_id, e.target.value)}
                            rows={2}
                            placeholder="Add comments about this student's performance..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}

              {gradingStudents.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  No students found in this class.
                </div>
              )}
            </div>

            {/* Action Buttons */}
            {gradingStudents.length > 0 && (
              <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-200 sticky bottom-0 bg-white">
                <button
                  type="button"
                  onClick={() => {
                    if (!savingGrades) {
                      setGradingModalOpen(false)
                    }
                  }}
                  disabled={savingGrades}
                  className="px-6 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-md transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveGrades}
                  disabled={savingGrades}
                  className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {savingGrades ? (
                    <>
                      <FontAwesomeIcon icon={faSpinner} spin />
                      Saving...
                    </>
                  ) : (
                    <>
                      💾 Save All Grades
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>

      <style jsx>{`
        @keyframes modalSlideIn {
          from {
            opacity: 0;
            transform: translateY(-20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        
        @keyframes toastSlideIn {
          from {
            opacity: 0;
            transform: translateX(100%);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        .shadow-3xl {
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.35);
        }
      `}</style>
      
      {/* Weekly Plan AI Help Modal */}
      <Modal
        isOpen={weeklyAiModalOpen}
        onClose={() => !weeklyAiLoading && setWeeklyAiModalOpen(false)}
        title="AI Help - Weekly Planning"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Let AI help you create a detailed weekly plan based on your unit information.
          </p>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              How many weeks will the assessment take? <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="1"
              max={selectedTopicForWeekly?.topic_duration || 10}
              value={weeklyAiInput.assessmentDuration}
              onChange={(e) => setWeeklyAiInput(prev => ({ ...prev, assessmentDuration: e.target.value }))}
              placeholder="Number of weeks (e.g., 2)"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Enter how many weeks students need to complete the summative assessment
            </p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Special Requests (Optional)
            </label>
            <textarea
              value={weeklyAiInput.specialRequests}
              onChange={(e) => setWeeklyAiInput(prev => ({ ...prev, specialRequests: e.target.value }))}
              placeholder="Any specific requirements, teaching approaches, or topics to emphasize..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          
          <div className="flex justify-end gap-3 pt-4">
            <button
              onClick={() => setWeeklyAiModalOpen(false)}
              disabled={weeklyAiLoading}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={requestWeeklyPlanAiHelp}
              disabled={weeklyAiLoading}
              className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-purple-400 flex items-center gap-2"
            >
              {weeklyAiLoading ? (
                <>
                  <FontAwesomeIcon icon={faSpinner} spin />
                  Generating...
                </>
              ) : (
                <>
                  <FontAwesomeIcon icon={faLightbulb} />
                  Get AI Suggestions
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>
      
      {/* AI Results Preview Modal */}
      {weeklyAiResults && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800">AI Weekly Plan Suggestions</h3>
              <p className="text-sm text-gray-600 mt-1">Review and insert the AI-generated plan</p>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-4">
                {weeklyAiResults.map((week) => (
                  <div key={week.week_number} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                    <h4 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                      <span className="flex items-center justify-center w-6 h-6 bg-purple-100 text-purple-600 rounded-full text-sm font-bold">
                        {week.week_number}
                      </span>
                      Week {week.week_number}
                    </h4>
                    
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="font-medium text-gray-700">Objectives:</span>
                        <p className="text-gray-600 mt-1">{week.week_objectives}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Activities:</span>
                        <p className="text-gray-600 mt-1">{week.week_activities}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Resources:</span>
                        <p className="text-gray-600 mt-1">{week.week_resources}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setWeeklyAiResults(null)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={insertAiWeeklyPlans}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center gap-2"
              >
                <FontAwesomeIcon icon={faSave} />
                Insert to Weekly Plans
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
