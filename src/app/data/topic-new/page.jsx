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
import {
  generateUnitPlannerPDF,
  generateAssessmentPDFFromWizard,
  exportAssessmentWordFromWizard,
  generateAssessmentPDFFromCard,
  exportAssessmentWordFromCard,
  generateStudentReportPDF,
  generateClassRecapPDFReport,
} from './lib/pdfGenerators'
import useAiHelp from './lib/useAiHelp'
import WizardStepContent from './components/WizardStepContent'

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
    await generateStudentReportPDF({
      reportFilters,
      reportStudents,
      reportKelasOptions,
      reportYears,
      setLoadingReport,
      onError: (err) => alert('Gagal menghasilkan report: ' + err.message)
    })
  }
  
  // Fetch class recap data
  const generateClassRecapPDF = async (kelasId, semester, subjectId) => {
    await generateClassRecapPDFReport({
      kelasId,
      semester,
      subjectId,
      assessmentKelasOptions,
      subjects,
      setLoadingClassRecap,
      onError: (err) => alert('Gagal membuat PDF rekap: ' + err.message)
    })
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
  
  // AI Help – all state + functions live in useAiHelp hook
  const {
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
  } = useAiHelp({
    selectedTopic, setSelectedTopic,
    wizardAssessment, setWizardAssessment,
    wizardCriteria, wizardStrands, wizardRubrics,
    subjects, kelasNameMap, learnerProfiles,
    aiScrollRef,
  })

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
    console.log('🔍 [UPDATE START] Starting updateExistingTopic')
    console.log('🔍 [TOPIC DATA] selectedTopic:', selectedTopic)
    console.log('🔍 [WIZARD ASSESSMENT] wizardAssessment:', wizardAssessment)
    
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
      
      console.log('🔍 [TOPIC UPDATE] Updating topic with data:', topicData)
      
      const { error } = await supabase
        .from('topic')
        .update(topicData)
        .eq('topic_id', selectedTopic.topic_id)
      
      if (error) {
        console.error('❌ [TOPIC ERROR] Failed to update topic:', error)
        throw error
      }
      
      console.log('✅ [TOPIC SUCCESS] Topic updated successfully')
      
      // Update assessment including TSC
      console.log('🔍 [ASSESSMENT SEARCH] Looking for assessment with topic_id:', selectedTopic.topic_id)
      
      const { data: existingAssessment, error: assessmentSearchError } = await supabase
        .from('assessment')
        .select('assessment_id')
        .eq('assessment_topic_id', selectedTopic.topic_id)
        .single()
      
      if (assessmentSearchError) {
        console.error('❌ [ASSESSMENT SEARCH ERROR]:', assessmentSearchError)
        if (assessmentSearchError.code === 'PGRST116') {
          console.warn('⚠️ No assessment found for this topic')
        } else {
          throw assessmentSearchError
        }
      }
      
      if (existingAssessment) {
        console.log('✅ [ASSESSMENT FOUND] assessment_id:', existingAssessment.assessment_id)
        console.log('🔍 [ASSESSMENT DATA] Will update with:', {
          assessment_nama: wizardAssessment.assessment_nama,
          assessment_semester: wizardAssessment.assessment_semester,
          assessment_relationship: wizardAssessment.assessment_relationship,
          assessment_conceptual_understanding: wizardAssessment.assessment_conceptual_understanding?.substring(0, 50) + '...',
          assessment_task_specific_description: wizardAssessment.assessment_task_specific_description?.substring(0, 50) + '...',
          assessment_instructions: wizardAssessment.assessment_instructions?.substring(0, 50) + '...',
          selected_criteria: wizardAssessment.selected_criteria,
          assessment_tsc: wizardAssessment.assessment_tsc
        })
        
        const assessmentUpdatePayload = {
          assessment_nama: wizardAssessment.assessment_nama || null,
          assessment_semester: wizardAssessment.assessment_semester ? parseInt(wizardAssessment.assessment_semester) : null,
          assessment_conceptual_understanding: wizardAssessment.assessment_conceptual_understanding || null,
          assessment_task_specific_description: wizardAssessment.assessment_task_specific_description || null,
          assessment_instructions: wizardAssessment.assessment_instructions || null,
          assessment_tsc: wizardAssessment.assessment_tsc || {}
        }
        
        console.log('🔍 [ASSESSMENT PAYLOAD] Full payload:', assessmentUpdatePayload)
        
        const { error: assessmentError } = await supabase
          .from('assessment')
          .update(assessmentUpdatePayload)
          .eq('assessment_id', existingAssessment.assessment_id)
        
        if (assessmentError) {
          console.error('❌ [ASSESSMENT UPDATE ERROR]:', assessmentError)
          console.error('❌ [ERROR DETAILS] Message:', assessmentError.message)
          console.error('❌ [ERROR DETAILS] Code:', assessmentError.code)
          console.error('❌ [ERROR DETAILS] Details:', assessmentError.details)
          throw assessmentError
        } else {
          console.log('✅ [ASSESSMENT SUCCESS] Assessment updated successfully')
        }
        
        // Update assessment_criteria junction table
        console.log('🔍 [CRITERIA UPDATE] Deleting old criteria for assessment_id:', existingAssessment.assessment_id)
        
        const { error: deleteCriteriaError } = await supabase
          .from('assessment_criteria')
          .delete()
          .eq('assessment_id', existingAssessment.assessment_id)
        
        if (deleteCriteriaError) {
          console.error('❌ [CRITERIA DELETE ERROR]:', deleteCriteriaError)
        } else {
          console.log('✅ [CRITERIA DELETE] Old criteria deleted')
        }
        
        // Then insert new criteria
        if (wizardAssessment.selected_criteria && wizardAssessment.selected_criteria.length > 0) {
          const criteriaRecords = wizardAssessment.selected_criteria.map(criterionId => ({
            assessment_id: existingAssessment.assessment_id,
            criterion_id: criterionId
          }))
          
          console.log('🔍 [CRITERIA INSERT] Inserting new criteria:', criteriaRecords)
          
          const { error: insertCriteriaError } = await supabase
            .from('assessment_criteria')
            .insert(criteriaRecords)
          
          if (insertCriteriaError) {
            console.error('❌ [CRITERIA INSERT ERROR]:', insertCriteriaError)
            console.error('❌ [ERROR DETAILS] Message:', insertCriteriaError.message)
            console.error('❌ [ERROR DETAILS] Code:', insertCriteriaError.code)
          } else {
            console.log('✅ [CRITERIA SUCCESS] Assessment criteria updated successfully')
          }
        } else {
          console.warn('⚠️ [CRITERIA EMPTY] No criteria selected to insert')
        }
      } else {
        // No assessment exists yet, create a new one
        console.log('🆕 [CREATE ASSESSMENT] No existing assessment, creating new one')
        
        // Find detail_kelas_id for subject + kelas combination
        const { data: dkData, error: dkError } = await supabase
          .from('detail_kelas')
          .select('detail_kelas_id')
          .eq('detail_kelas_subject_id', selectedTopic.topic_subject_id)
          .eq('detail_kelas_kelas_id', selectedTopic.topic_kelas_id)
          .single()
        
        if (dkError) {
          console.error('❌ [DETAIL_KELAS ERROR]:', dkError)
          throw new Error('Could not find class-subject mapping. Please check detail_kelas.')
        }
        
        console.log('✅ [DETAIL_KELAS FOUND] detail_kelas_id:', dkData.detail_kelas_id)
        
        // Create new assessment
        const assessmentInsertPayload = {
          assessment_nama: wizardAssessment.assessment_nama || 'Untitled Assessment',
          assessment_tanggal: null, // Will be set later via Assessment tab
          assessment_keterangan: wizardAssessment.assessment_keterangan || null,
          assessment_conceptual_understanding: wizardAssessment.assessment_conceptual_understanding || null,
          assessment_task_specific_description: wizardAssessment.assessment_task_specific_description || null,
          assessment_instructions: wizardAssessment.assessment_instructions || null,
          assessment_tsc: wizardAssessment.assessment_tsc || {},
          assessment_detail_kelas_id: dkData.detail_kelas_id,
          assessment_topic_id: selectedTopic.topic_id,
          assessment_semester: wizardAssessment.assessment_semester ? parseInt(wizardAssessment.assessment_semester) : null,
          assessment_status: 0,
          assessment_user_id: currentUserId
        }
        
        console.log('🔍 [CREATE PAYLOAD] Assessment insert payload:', assessmentInsertPayload)
        
        const { data: newAssessment, error: createError } = await supabase
          .from('assessment')
          .insert([assessmentInsertPayload])
          .select()
        
        if (createError) {
          console.error('❌ [CREATE ERROR]:', createError)
          throw createError
        }
        
        console.log('✅ [ASSESSMENT CREATED] New assessment:', newAssessment)
        
        // Insert assessment_criteria
        if (newAssessment && newAssessment[0] && wizardAssessment.selected_criteria && wizardAssessment.selected_criteria.length > 0) {
          const criteriaRecords = wizardAssessment.selected_criteria.map(criterionId => ({
            assessment_id: newAssessment[0].assessment_id,
            criterion_id: criterionId
          }))
          
          console.log('🔍 [CRITERIA INSERT NEW] Inserting criteria for new assessment:', criteriaRecords)
          
          const { error: criteriaInsertError } = await supabase
            .from('assessment_criteria')
            .insert(criteriaRecords)
          
          if (criteriaInsertError) {
            console.error('❌ [CRITERIA INSERT ERROR]:', criteriaInsertError)
          } else {
            console.log('✅ [CRITERIA SUCCESS] Criteria inserted for new assessment')
          }
        }
      }
      
      console.log('🔍 [REFRESH] Refreshing topics list')
      
      // Refresh topics list - get subject IDs from current subjects state
      const subjectIds = subjects.map(s => s.subject_id)
      if (subjectIds.length > 0) {
        await fetchTopics(subjectIds)
      }
      
      console.log('✅ [COMPLETE] Update completed successfully')
      
      setSaveNotification(true)
      setTimeout(() => setSaveNotification(false), 2000)
      
      // Close modal
      setModalOpen(false)
      setIsAddMode(false)
      setCurrentStep(0)
    } catch (err) {
      console.error('❌ [FATAL ERROR] Error updating topic:', err)
      console.error('❌ [ERROR STACK]:', err.stack)
      alert('Failed to update topic: ' + err.message)
    } finally {
      setSaving(false)
      console.log('🔍 [CLEANUP] Save state reset')
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
    if (event) event.stopPropagation()
    await generateUnitPlannerPDF(topic, {
      currentUserId,
      onSuccess: () => { setSaveNotification(true); setTimeout(() => setSaveNotification(false), 2000) },
      onError: (err) => alert(`Failed to generate PDF: ${err.message}`)
    })
  }

  // Generate Assessment PDF from wizard
  const handleGenerateAssessmentPDF = async () => {
    await generateAssessmentPDFFromWizard({
      selectedTopic,
      wizardAssessment,
      wizardCriteria,
      subjectMap,
      kelasNameMap,
      currentUserId,
      onSuccess: () => { setSaveNotification(true); setTimeout(() => setSaveNotification(false), 2000) },
      onError: (err) => alert(`Failed to generate Assessment PDF: ${err.message}`)
    })
  }

  // Export Assessment to Word from wizard
  const handleExportAssessmentWord = async () => {
    await exportAssessmentWordFromWizard({
      selectedTopic,
      wizardAssessment,
      wizardCriteria,
      subjectMap,
      kelasNameMap,
      currentUserId,
      onSuccess: () => { setSaveNotification(true); setTimeout(() => setSaveNotification(false), 2000) },
      onError: (err) => alert(`Failed to export Assessment to Word: ${err.message}`)
    })
  }

  // Generate Assessment PDF from card
  const handleGenerateAssessmentPDFFromCard = async (topic, event) => {
    if (event) event.stopPropagation()
    await generateAssessmentPDFFromCard(topic, {
      subjectMap,
      kelasNameMap,
      currentUserId,
      onSuccess: () => { setSaveNotification(true); setTimeout(() => setSaveNotification(false), 2000) },
      onError: (err) => alert(`Failed to generate Assessment PDF: ${err.message}`)
    })
  }

  // Export Assessment to Word from card
  const handleExportAssessmentWordFromCard = async (topic, event) => {
    if (event) event.stopPropagation()
    await exportAssessmentWordFromCard(topic, {
      subjectMap,
      kelasNameMap,
      currentUserId,
      onSuccess: () => { setSaveNotification(true); setTimeout(() => setSaveNotification(false), 2000) },
      onError: (err) => alert(`Failed to export Word document: ${err.message}`)
    })
  }

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
        assessment_tsc: topicAssessment.assessment_tsc || {},
        assessment_relationship: topicAssessment.assessment_relationship || null,
        assessment_conceptual_understanding: topicAssessment.assessment_conceptual_understanding || null,
        assessment_task_specific_description: topicAssessment.assessment_task_specific_description || null,
        assessment_instructions: topicAssessment.assessment_instructions || null
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
                              resetAiState()
                              
                              console.log('🔍 [MODAL OPEN] Opening edit modal for topic:', topic)
                              
                              setSelectedTopic({ ...topic, topic_atl: topic.topic_atl || '' })
                              setModalOpen(true)
                              setIsAddMode(false)
                              setCurrentStep(0)
                              
                              // Pre-fill wizard with existing data
                              // topic_atl default to empty string if not in DB yet
                              setSelectedTopic({ ...topic, topic_atl: topic.topic_atl || '' })
                              
                              // Fetch assessment for this topic and load into wizard
                              console.log('🔍 [FETCH ASSESSMENT] Fetching assessment for topic_id:', topic.topic_id)
                              await fetchTopicAssessment(topic.topic_id, topic.topic_subject_id)
                              
                              // Load assessment data into wizard state
                              const { data: assessmentData, error: assessmentLoadError } = await supabase
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
                              
                              if (assessmentLoadError) {
                                console.error('❌ [FETCH ERROR] Error loading assessment:', assessmentLoadError)
                              }
                              
                              if (assessmentData) {
                                console.log('✅ [ASSESSMENT LOADED] Assessment data:', assessmentData)
                                console.log('🔍 [TOPIC RELATIONSHIP] topic.topic_relationship_summative_assessment_statement_of_inquiry:', topic.topic_relationship_summative_assessment_statement_of_inquiry)
                                
                                const criteriaIds = assessmentData.assessment_criteria?.map(ac => ac.criterion_id) || []
                                const wizardData = {
                                  assessment_nama: assessmentData.assessment_nama || '',
                                  assessment_keterangan: assessmentData.assessment_keterangan || '',
                                  assessment_semester: assessmentData.assessment_semester?.toString() || '',
                                  assessment_relationship: topic.topic_relationship_summative_assessment_statement_of_inquiry || '',
                                  assessment_conceptual_understanding: assessmentData.assessment_conceptual_understanding || '',
                                  assessment_task_specific_description: assessmentData.assessment_task_specific_description || '',
                                  assessment_instructions: assessmentData.assessment_instructions || '',
                                  selected_criteria: criteriaIds,
                                  assessment_tsc: assessmentData.assessment_tsc || {}
                                }
                                
                                console.log('✅ [WIZARD POPULATED] Setting wizardAssessment to:', wizardData)
                                setWizardAssessment(wizardData)
                              } else {
                                console.warn('⚠️ [NO ASSESSMENT] No assessment data found, clearing wizard')
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
            resetAiState()
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
                      <WizardStepContent
                        currentStep={currentStep}
                        selectedTopic={selectedTopic}
                        setSelectedTopic={setSelectedTopic}
                        wizardAssessment={wizardAssessment}
                        setWizardAssessment={setWizardAssessment}
                        wizardCriteria={wizardCriteria}
                        wizardStrands={wizardStrands}
                        wizardRubrics={wizardRubrics}
                        loadingStrands={loadingStrands}
                        subjects={subjects}
                        allKelas={allKelas}
                        kelasLoading={kelasLoading}
                        keyConcepts={keyConcepts}
                        globalContexts={globalContexts}
                        learnerProfiles={learnerProfiles}
                        isAddMode={isAddMode}
                        topicAssessment={topicAssessment}
                        aiLoading={aiLoading}
                        openAiInputModal={openAiInputModal}
                        requestAiHelp={requestAiHelp}
                        requestAiHelpAtl={requestAiHelpAtl}
                        requestAiHelpTSC={requestAiHelpTSC}
                        setAiHelpType={setAiHelpType}
                        setAiError={setAiError}
                        setAiResultModalOpen={setAiResultModalOpen}
                        setSelectedKeyConcepts={setSelectedKeyConcepts}
                        setSelectedRelatedConcepts={setSelectedRelatedConcepts}
                        setSelectedGlobalContexts={setSelectedGlobalContexts}
                        setSelectedStatements={setSelectedStatements}
                        setSelectedLearnerProfiles={setSelectedLearnerProfiles}
                        setSelectedServiceLearning={setSelectedServiceLearning}
                        setSelectedResources={setSelectedResources}
                        setSelectedAtlSkills={setSelectedAtlSkills}
                        isStepCompleted={isStepCompleted}
                        fetchKelasForSubject={fetchKelasForSubject}
                        setAllKelas={setAllKelas}
                        fetchStrandsForCriteria={fetchStrandsForCriteria}
                        t={t}
                      />
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
