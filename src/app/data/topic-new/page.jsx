'use client'

import { useState, useEffect, useRef } from 'react'
import { flushSync } from 'react-dom'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSpinner, faPlus, faTimes, faClipboardList, faBook, faInfoCircle, faPaperPlane, faTrash, faPrint, faFileAlt } from '@fortawesome/free-solid-svg-icons'
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
  const [filters, setFilters] = useState({ subject: '', search: '' })
  
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
    assessment_myp_year: '',
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
  const [aiHelpType, setAiHelpType] = useState('') // 'unitTitle', 'inquiryQuestion', 'keyConcept', 'relatedConcept', 'globalContext', 'statement', 'learnerProfile', or 'serviceLearning'
  const [selectedInquiryQuestions, setSelectedInquiryQuestions] = useState([]) // For multi-select inquiry questions
  const [selectedKeyConcepts, setSelectedKeyConcepts] = useState([]) // For multi-select key concepts
  const [selectedRelatedConcepts, setSelectedRelatedConcepts] = useState([]) // For multi-select related concepts
  const [selectedGlobalContexts, setSelectedGlobalContexts] = useState([]) // For multi-select global contexts
  const [selectedStatements, setSelectedStatements] = useState([]) // For multi-select statements of inquiry
  const [selectedLearnerProfiles, setSelectedLearnerProfiles] = useState([]) // For multi-select learner profiles
  const [selectedServiceLearning, setSelectedServiceLearning] = useState([]) // For multi-select service learning
  
  // Grading Modal state
  const [gradingModalOpen, setGradingModalOpen] = useState(false)
  const [gradingAssessment, setGradingAssessment] = useState(null)
  const [gradingStudents, setGradingStudents] = useState([])
  const [gradingStrands, setGradingStrands] = useState([]) // All strands for assessment criteria
  const [gradingData, setGradingData] = useState({}) // { student_id: { grade_id, strand_grades: { strand_id: grade } } }
  const [expandedStudents, setExpandedStudents] = useState(new Set())
  const [expandedRubrics, setExpandedRubrics] = useState(new Set()) // Track which strands have rubrics expanded
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
    } catch (err) {
      console.error('❌ Error fetching kelas:', err)
      setAllKelas([])
    } finally {
      setKelasLoading(false)
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
          topic_learning_process,
          topic_formative_assessment,
          topic_summative_assessment,
          topic_relationship_summative_assessment_statement_of_inquiry
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
          assessment_myp_year,
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
      
      // MYP Year required
      if (!assessmentFormData.assessment_myp_year) {
        errors.assessment_myp_year = 'MYP Year Level is required'
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
      assessment_myp_year: assessment.assessment_myp_year?.toString() || '',
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
            assessment_myp_year: assessmentFormData.assessment_myp_year ? parseInt(assessmentFormData.assessment_myp_year) : null,
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
          assessment_myp_year: '',
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
          assessment_myp_year: assessmentFormData.assessment_myp_year ? parseInt(assessmentFormData.assessment_myp_year) : null,
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
          assessment_myp_year: '',
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
    setExpandedRubrics(new Set())
    
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
      
      // 2. Fetch strands for selected criteria
      if (!assessment.criteria || assessment.criteria.length === 0) {
        throw new Error('This assessment has no criteria assigned. Please add criteria first.')
      }
      
      console.log('📚 Assessment criteria:', assessment.criteria)
      
      // Get subject_id and grading_method from detail_kelas and subject
      const { data: detailKelasWithSubject, error: dkSubjectError } = await supabase
        .from('detail_kelas')
        .select(`
          detail_kelas_subject_id,
          subject:detail_kelas_subject_id (
            subject_id,
            subject_name,
            grading_method
          )
        `)
        .eq('detail_kelas_id', assessment.assessment_detail_kelas_id)
        .single()
      
      if (dkSubjectError) throw dkSubjectError
      
      const subjectId = detailKelasWithSubject.detail_kelas_subject_id
      const gradingMethod = detailKelasWithSubject.subject?.grading_method || 'highest'
      console.log('📖 Subject ID:', subjectId, 'Grading Method:', gradingMethod)
      
      // Fetch full criteria data based on codes and subject
      const criterionCodes = assessment.criteria.map(c => c.code)
      const { data: fullCriteria, error: criteriaError } = await supabase
        .from('criteria')
        .select('criterion_id, code, name, subject_id')
        .eq('subject_id', subjectId)
        .in('code', criterionCodes)
      
      if (criteriaError) throw criteriaError
      
      console.log('🎯 Full criteria data:', fullCriteria)
      
      if (!fullCriteria || fullCriteria.length === 0) {
        throw new Error('Could not find criteria definitions for this subject. Please configure criteria in the rubrics system first.')
      }
      
      // Update assessment criteria with full data
      const criteriaWithIds = assessment.criteria.map(c => {
        const full = fullCriteria.find(fc => fc.code === c.code)
        return full || c
      })
      
      // Update gradingAssessment with complete criteria and grading method
      setGradingAssessment(prev => ({
        ...prev,
        criteria: criteriaWithIds,
        grading_method: gradingMethod,
        subject_name: detailKelasWithSubject.subject?.subject_name || prev.subject_name
      }))
      
      const criterionIds = criteriaWithIds.map(c => c.criterion_id).filter(id => id)
      console.log('🔢 Criterion IDs:', criterionIds)
      
      // Get MYP year level from assessment
      const yearLevel = assessment.assessment_myp_year
      
      if (!yearLevel) {
        throw new Error('This assessment does not have an MYP year level set. Please edit the assessment and set the MYP year level (1-5).')
      }
      
      if (![1, 3, 5].includes(yearLevel)) {
        throw new Error(`Invalid MYP year level (${yearLevel}). Valid options are: 1, 3, or 5 (IB Standard).`)
      }
      
      console.log('📊 Assessment:', assessment.assessment_nama, '| MYP Year Level:', yearLevel)
      
      const { data: strands, error: strandsError } = await supabase
        .from('strands')
        .select(`
          *,
          rubrics (
            rubric_id,
            band_label,
            description,
            min_score,
            max_score
          )
        `)
        .in('criterion_id', criterionIds)
        .eq('year_level', yearLevel)
        .order('criterion_id, label')
      
      console.log('📝 Strands found:', strands?.length, 'Error:', strandsError)
      
      if (strandsError) throw strandsError
      
      // Sort rubrics within each strand by min_score
      const strandsWithSortedRubrics = strands.map(strand => ({
        ...strand,
        rubrics: (strand.rubrics || []).sort((a, b) => (a.min_score || 0) - (b.min_score || 0))
      }))
      
      setGradingStrands(strandsWithSortedRubrics)
      
      // 3. Fetch existing grades
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
          comments,
          assessment_grade_strands (
            grade_strand_id,
            strand_id,
            strand_grade,
            notes
          )
        `)
        .eq('assessment_id', assessment.assessment_id)
      
      if (gradesError) throw gradesError
      
      // Build grading data structure
      const gradingMap = {}
      for (const student of flatStudents) {
        const existingGrade = existingGrades?.find(g => g.detail_siswa_id === student.detail_siswa_id)
        if (existingGrade) {
          const strandGrades = {}
          existingGrade.assessment_grade_strands?.forEach(sg => {
            strandGrades[sg.strand_id] = {
              grade: sg.strand_grade,
              notes: sg.notes || ''
            }
          })
          gradingMap[student.detail_siswa_id] = {
            grade_id: existingGrade.grade_id,
            strand_grades: strandGrades,
            comments: existingGrade.comments || ''
          }
        } else {
          // Initialize empty
          const strandGrades = {}
          strands.forEach(s => {
            strandGrades[s.strand_id] = { grade: null, notes: '' }
          })
          gradingMap[student.detail_siswa_id] = {
            grade_id: null,
            strand_grades: strandGrades,
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
  
  // Toggle rubric expansion
  const toggleRubricExpansion = (strandId) => {
    const newSet = new Set(expandedRubrics)
    if (newSet.has(strandId)) {
      newSet.delete(strandId)
    } else {
      newSet.add(strandId)
    }
    setExpandedRubrics(newSet)
  }
  
  // Get available grade options for a strand based on rubrics
  const getAvailableGrades = (strand) => {
    if (!strand.rubrics || strand.rubrics.length === 0) {
      // No rubrics defined, allow all grades
      return [0, 1, 2, 3, 4, 5, 6, 7, 8]
    }
    
    // Get unique grades from rubrics
    const grades = new Set()
    strand.rubrics.forEach(rubric => {
      for (let i = rubric.min_score; i <= rubric.max_score; i++) {
        grades.add(i)
      }
    })
    
    return Array.from(grades).sort((a, b) => a - b)
  }
  
  // Get rubric description for a specific grade
  const getRubricForGrade = (strand, grade) => {
    if (!strand.rubrics || !grade) return null
    return strand.rubrics.find(r => grade >= r.min_score && grade <= r.max_score)
  }
  
  // Get band color
  const getBandColor = (bandLabel) => {
    if (bandLabel === '0') return 'bg-gray-100 text-gray-700 border-gray-300'
    if (bandLabel === '1-2') return 'bg-red-50 text-red-700 border-red-200'
    if (bandLabel === '3-4') return 'bg-yellow-50 text-yellow-700 border-yellow-200'
    if (bandLabel === '5-6') return 'bg-blue-50 text-blue-700 border-blue-200'
    if (bandLabel === '7-8') return 'bg-green-50 text-green-700 border-green-200'
    return 'bg-gray-100 text-gray-700 border-gray-300'
  }
  
  // Update strand grade
  const updateStrandGrade = (detailSiswaId, strandId, grade) => {
    setGradingData(prev => ({
      ...prev,
      [detailSiswaId]: {
        ...prev[detailSiswaId],
        strand_grades: {
          ...prev[detailSiswaId].strand_grades,
          [strandId]: {
            ...prev[detailSiswaId].strand_grades[strandId],
            grade: grade === '' ? null : parseInt(grade)
          }
        }
      }
    }))
  }
  
  // Calculate criterion grade from strand grades using configured method
  const calculateCriterionGrade = (detailSiswaId, criterionId) => {
    const studentData = gradingData[detailSiswaId]
    if (!studentData) return null
    
    const criterionStrands = gradingStrands.filter(s => s.criterion_id === criterionId)
    const grades = criterionStrands
      .map(s => studentData.strand_grades[s.strand_id]?.grade)
      .filter(g => g !== null && g !== undefined)
    
    if (grades.length === 0) return null
    
    // Get grading method from assessment (via subject)
    const method = gradingAssessment?.grading_method || 'highest'
    
    switch (method) {
      case 'average':
        // Calculate mean and round to nearest integer
        const sum = grades.reduce((a, b) => a + b, 0)
        return Math.round(sum / grades.length)
      
      case 'median':
        // Sort and take middle value
        const sorted = [...grades].sort((a, b) => a - b)
        const mid = Math.floor(sorted.length / 2)
        if (sorted.length % 2 === 0) {
          // Even number: average of two middle values
          return Math.round((sorted[mid - 1] + sorted[mid]) / 2)
        } else {
          // Odd number: take middle value
          return sorted[mid]
        }
      
      case 'mode':
        // Find most frequent grade
        const frequency = {}
        grades.forEach(g => {
          frequency[g] = (frequency[g] || 0) + 1
        })
        const maxFreq = Math.max(...Object.values(frequency))
        const modes = Object.keys(frequency)
          .filter(g => frequency[g] === maxFreq)
          .map(g => parseInt(g))
        // If multiple modes, take the highest
        return Math.max(...modes)
      
      case 'highest':
      default:
        // IB MYP best-fit approach (default)
        return Math.max(...grades)
    }
  }
  
  // Save all grades
  const handleSaveGrades = async () => {
    setSavingGrades(true)
    try {
      for (const student of gradingStudents) {
        const detailSiswaId = student.detail_siswa_id
        const studentData = gradingData[detailSiswaId]
        
        // Calculate criterion grades
        const criterionGrades = {}
        for (const criterion of gradingAssessment.criteria) {
          const grade = calculateCriterionGrade(detailSiswaId, criterion.criterion_id)
          criterionGrades[criterion.code] = grade
        }
        
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
          criterion_a_grade: criterionGrades['A'] || null,
          criterion_b_grade: criterionGrades['B'] || null,
          criterion_c_grade: criterionGrades['C'] || null,
          criterion_d_grade: criterionGrades['D'] || null,
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
        
        // Delete old strand grades
        await supabase
          .from('assessment_grade_strands')
          .delete()
          .eq('grade_id', gradeId)
        
        // Insert new strand grades
        const strandRecords = []
        for (const strand of gradingStrands) {
          const strandData = studentData.strand_grades[strand.strand_id]
          if (strandData && strandData.grade !== null) {
            strandRecords.push({
              grade_id: gradeId,
              strand_id: strand.strand_id,
              strand_grade: strandData.grade,
              notes: strandData.notes || null
            })
          }
        }
        
        if (strandRecords.length > 0) {
          const { error: strandsInsertError } = await supabase
            .from('assessment_grade_strands')
            .insert(strandRecords)
          
          if (strandsInsertError) throw strandsInsertError
        }
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
      topic_learning_process: '',
      topic_formative_assessment: '',
      topic_summative_assessment: '',
      topic_relationship_summative_assessment_statement_of_inquiry: ''
    })
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
    if (helpType !== 'keyConcept' && helpType !== 'relatedConcept' && helpType !== 'inquiryQuestion' && helpType !== 'globalContext' && helpType !== 'statement' && helpType !== 'learnerProfile' && !aiUserInput.trim()) {
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
      
      const body = { prompt: promptWithLang, model: 'gemini-2.5-flash', context }
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
            text: (a?.text ?? '').toString().trim(),
            reason: (a?.reason ?? '').toString().trim(),
          }))
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
  
  const insertAiSuggestion = (txt) => {
    if (!txt) return
    const firstLine = String(txt).split(/\r?\n/)[0].replace(/\*\*/g, '').trim()
    
    if (aiHelpType === 'inquiryQuestion') {
      setSelectedTopic(prev => ({ ...prev, topic_inquiry_question: firstLine }))
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
    const statementText = selectedItems[0].option // Only take the first one
    
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
  const goToNextStep = () => {
    if (currentStep < plannerSteps.length - 1) {
      setCurrentStep(currentStep + 1)
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

    setSaving(true)
    try {
      // Prepare data with proper types
      const topicData = {
        ...selectedTopic,
        topic_year: selectedTopic.topic_year ? parseInt(selectedTopic.topic_year) : null
      }
      
      const { data, error } = await supabase
        .from('topic')
        .insert([topicData])
        .select()
      
      if (error) throw error
      
      if (data && data[0]) {
        // Add to local state
        setTopics(prev => [...prev, data[0]])
        
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
      const matchSearch = !filters.search || 
        topic.topic_nama?.toLowerCase().includes(filters.search.toLowerCase()) ||
        subjectMap.get(topic.topic_subject_id)?.toLowerCase().includes(filters.search.toLowerCase())
      return matchSubject && matchSearch
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
                  { id: 'weekly-plan', label: 'Weekly Plan', icon: '📅' },
                  { id: 'reflection', label: 'Reflection', icon: '💭' }
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
                            onClick={() => {
                              setSelectedTopic(topic)
                              setModalOpen(true)
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
                                <span className="text-xs bg-red-50 text-red-600 px-2 py-1 rounded-full font-medium whitespace-nowrap">
                                  #{topic.topic_urutan || '-'}
                                </span>
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
                <h2 className="text-xl font-semibold text-gray-800 mb-4">Weekly Plan</h2>
                <p className="text-gray-600">Weekly planning content will be displayed here.</p>
              </div>
            )}

            {activeSubMenu === 'reflection' && (
              <div>
                <h2 className="text-xl font-semibold text-gray-800 mb-4">Reflection</h2>
                <p className="text-gray-600">Reflection content will be displayed here.</p>
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
                        {new Date(assessment.assessment_tanggal).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
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
          onClick={() => setModalOpen(false)}
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
                          <div key={step.id} className="flex items-center">
                            <button
                              onClick={() => setCurrentStep(index)}
                              className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-all ${
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
                            {index < plannerSteps.length - 1 && (
                              <div className={`w-8 h-1 ${isStepCompleted(index) ? 'bg-green-500' : 'bg-gray-300'}`} />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    /* Edit Mode Header */
                    <div className="flex items-center justify-between">
                      <div className="flex-1 mr-4">
                        {editingField === 'topic_nama' ? (
                          <input
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={() => handleSave('topic_nama', editValue)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSave('topic_nama', editValue)
                              if (e.key === 'Escape') cancelEdit()
                            }}
                            className="text-2xl font-bold text-gray-800 w-full px-2 py-1 border border-cyan-300 rounded focus:outline-none focus:ring-2 focus:ring-cyan-500"
                            autoFocus
                          />
                        ) : (
                          <h2 
                            className="text-2xl font-bold text-gray-800 cursor-pointer hover:bg-gray-50 px-2 py-1 rounded transition-colors"
                            onClick={() => startEdit('topic_nama', selectedTopic.topic_nama)}
                          >
                            {selectedTopic.topic_nama || 'Untitled Topic'}
                          </h2>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded text-sm font-medium">
                            {subjectMap.get(selectedTopic.topic_subject_id) || 'N/A'}
                          </span>
                          {selectedTopic.topic_kelas_id && (
                            <span className="bg-green-50 text-green-600 px-3 py-1 rounded text-sm font-medium">
                              {kelasNameMap.get(selectedTopic.topic_kelas_id) || 'N/A'}
                            </span>
                          )}
                          <span className="bg-red-50 text-red-600 px-3 py-1 rounded text-sm font-medium">
                            Unit #{selectedTopic.topic_urutan || '-'}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => setModalOpen(false)}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>

                {/* Modal Content */}
                <div className="px-6 py-6">
                  {isAddMode ? (
                    /* Wizard Content */
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
                                <button 
                                  type="button" 
                                  onClick={() => {
                                    if (!isStepCompleted(2)) return
                                    setAiHelpType('learnerProfile')
                                    setAiError('')
                                    setSelectedLearnerProfiles([])
                                    setAiResultModalOpen(false)
                                    requestAiHelp('learnerProfile')
                                  }}
                                  disabled={!isStepCompleted(2)}
                                  className={`inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-full border transition-colors ${
                                    isStepCompleted(2)
                                      ? 'border-green-300 bg-green-50 text-green-700 hover:bg-green-100 cursor-pointer'
                                      : 'border-gray-300 bg-gray-100 text-gray-400 cursor-not-allowed'
                                  }`}
                                  title={!isStepCompleted(2) ? 'Complete all Step 3 fields first' : 'Get AI suggestions for Learner Profile'}
                                >
                                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M10 3.5a1.5 1.5 0 013 0V4a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-.5a1.5 1.5 0 000 3h.5a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-.5a1.5 1.5 0 00-3 0v.5a1 1 0 01-1 1H6a1 1 0 01-1-1v-3a1 1 0 00-1-1h-.5a1.5 1.5 0 010-3H4a1 1 0 001-1V6a1 1 0 011-1h3a1 1 0 001-1v-.5z" />
                                  </svg>
                                  AI Help
                                </button>
                              </div>
                              {!isStepCompleted(2) && (
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
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Service Learning <span className="text-red-500">*</span>
                              </label>
                              <div className="mb-2">
                                <button 
                                  type="button" 
                                  onClick={() => {
                                    if (!isStepCompleted(2)) return
                                    setAiHelpType('serviceLearning')
                                    setAiError('')
                                    setSelectedServiceLearning([])
                                    setAiResultModalOpen(false)
                                    requestAiHelp('serviceLearning')
                                  }}
                                  disabled={!isStepCompleted(2)}
                                  className={`inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-full border transition-colors ${
                                    isStepCompleted(2)
                                      ? 'border-cyan-300 bg-cyan-50 text-cyan-700 hover:bg-cyan-100 cursor-pointer'
                                      : 'border-gray-300 bg-gray-100 text-gray-400 cursor-not-allowed'
                                  }`}
                                  title={!isStepCompleted(2) ? 'Complete all Step 3 fields first' : 'Get AI suggestions for Service Learning'}
                                >
                                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M10 3.5a1.5 1.5 0 013 0V4a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-.5a1.5 1.5 0 000 3h.5a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-.5a1.5 1.5 0 00-3 0v.5a1 1 0 01-1 1H6a1 1 0 01-1-1v-3a1 1 0 00-1-1h-.5a1.5 1.5 0 010-3H4a1 1 0 001-1V6a1 1 0 011-1h3a1 1 0 001-1v-.5z" />
                                  </svg>
                                  AI Help
                                </button>
                              </div>
                              {!isStepCompleted(2) && (
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
                          </>
                        )}
                      </div>
                      
                      {/* Navigation Buttons */}
                      <div className="flex items-center justify-between pt-6 border-t border-gray-200">
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
                        
                        <div className="text-center">
                          {isStepCompleted(currentStep) ? (
                            <div className="flex items-center gap-2 text-green-600">
                              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                              <span className="text-sm font-medium">Step completed</span>
                            </div>
                          ) : (
                            <p className="text-sm text-gray-500">Fill all required fields</p>
                          )}
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
                            onClick={saveNewTopic}
                            disabled={saving || getCompletionProgress().completed < plannerSteps.length}
                            className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                          >
                            {saving ? (
                              <>
                                <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
                                Saving...
                              </>
                            ) : (
                              <>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                Save Unit
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    /* Edit Mode Content */
                    <div className="space-y-6">
                  {/* Duration and Hours */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-500 mb-1">Duration</p>
                      {(editingField === 'topic_duration') ? (
                        <input
                          type="number"
                          value={editValue}
                          onChange={(e) => {
                            if (false) {
                              setSelectedTopic(prev => ({ ...prev, topic_duration: e.target.value }))
                            } else {
                              setEditValue(e.target.value)
                            }
                          }}
                          onBlur={() => {
                            if (true && editingField === 'topic_duration') {
                              handleSave('topic_duration', editValue)
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !isAddMode) handleSave('topic_duration', editValue)
                            if (e.key === 'Escape') {
                              if (true) cancelEdit()
                            }
                          }}
                          className="w-full px-2 py-1 border border-cyan-300 rounded focus:outline-none focus:ring-2 focus:ring-cyan-500 text-lg font-semibold"
                          placeholder="0"
                        />
                      ) : (
                        <p 
                          className="text-lg font-semibold text-gray-800 cursor-pointer hover:bg-gray-100 px-2 py-1 rounded transition-colors"
                          onClick={() => startEdit('topic_duration', selectedTopic.topic_duration || '')}
                        >
                          {selectedTopic.topic_duration && selectedTopic.topic_duration !== '0' && selectedTopic.topic_duration !== 0 
                            ? `${selectedTopic.topic_duration} weeks` 
                            : '-'}
                        </p>
                      )}
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-500 mb-1">Hours per Week</p>
                      {(editingField === 'topic_hours_per_week') ? (
                        <input
                          type="number"
                          value={editValue}
                          onChange={(e) => {
                            if (false) {
                              setSelectedTopic(prev => ({ ...prev, topic_hours_per_week: e.target.value }))
                            } else {
                              setEditValue(e.target.value)
                            }
                          }}
                          onBlur={() => {
                            if (true && editingField === 'topic_hours_per_week') {
                              handleSave('topic_hours_per_week', editValue)
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !isAddMode) handleSave('topic_hours_per_week', editValue)
                            if (e.key === 'Escape') {
                              if (true) cancelEdit()
                            }
                          }}
                          className="w-full px-2 py-1 border border-cyan-300 rounded focus:outline-none focus:ring-2 focus:ring-cyan-500 text-lg font-semibold"
                          placeholder="0"
                        />
                      ) : (
                        <p 
                          className="text-lg font-semibold text-gray-800 cursor-pointer hover:bg-gray-100 px-2 py-1 rounded transition-colors"
                          onClick={() => startEdit('topic_hours_per_week', selectedTopic.topic_hours_per_week || '')}
                        >
                          {selectedTopic.topic_hours_per_week && selectedTopic.topic_hours_per_week !== '0' && selectedTopic.topic_hours_per_week !== 0
                            ? `${selectedTopic.topic_hours_per_week} hours`
                            : '-'}
                        </p>
                      )}
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-500 mb-1">MYP Year <span className="text-red-500">*</span></p>
                      {(editingField === 'topic_year') ? (
                        <select
                          value={editValue}
                          onChange={(e) => {
                            const val = e.target.value
                            setEditValue(val)
                            // Auto-save when value selected
                            if (val) {
                              handleSave('topic_year', val)
                            }
                          }}
                          className="w-full px-2 py-1 border border-cyan-300 rounded focus:outline-none focus:ring-2 focus:ring-cyan-500 text-lg font-semibold"
                        >
                          <option value="1">Year 1</option>
                          <option value="3">Year 3</option>
                          <option value="5">Year 5</option>
                        </select>
                      ) : (
                        <p 
                          className={`text-lg font-semibold cursor-pointer hover:bg-gray-100 px-2 py-1 rounded transition-colors ${selectedTopic.topic_year ? 'text-gray-800' : 'text-red-500'}`}
                          onClick={() => startEdit('topic_year', selectedTopic.topic_year ? String(selectedTopic.topic_year) : '1')}
                        >
                          {selectedTopic.topic_year ? `Year ${selectedTopic.topic_year}` : 'Click to set MYP Year'}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Inquiry Question */}
                  <div>
                    <h3 className="text-sm font-semibold text-cyan-500 mb-2">Inquiry Question</h3>
                    {(editingField === 'topic_inquiry_question') ? (
                      <textarea
                        value={editValue}
                        onChange={(e) => {
                          if (false) {
                            setSelectedTopic(prev => ({ ...prev, topic_inquiry_question: e.target.value }))
                          } else {
                            setEditValue(e.target.value)
                          }
                        }}
                        onBlur={() => {
                          if (true && editingField === 'topic_inquiry_question') {
                            handleSave('topic_inquiry_question', editValue)
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Escape' && !isAddMode) cancelEdit()
                        }}
                        className="w-full px-3 py-2 border border-cyan-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500 text-gray-700 leading-relaxed"
                        rows={3}
                        placeholder=""
                      />
                    ) : (
                      <p 
                        className="text-gray-700 leading-relaxed whitespace-pre-wrap cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors"
                        onClick={() => startEdit('topic_inquiry_question', selectedTopic.topic_inquiry_question)}
                      >
                        {selectedTopic.topic_inquiry_question || 'Click to add inquiry question...'}
                      </p>
                    )}
                  </div>

                  {/* Global Context */}
                  <div>
                    <h3 className="text-sm font-semibold text-cyan-500 mb-2">Global Context</h3>
                    {(editingField === 'topic_global_context') ? (
                      <div className="space-y-3">
                        <div className="flex flex-wrap gap-2">
                          {globalContexts.map((context) => (
                            <button
                              key={context}
                              onClick={() => {
                                if (false) {
                                  // In add mode, directly update selectedTopic
                                  const current = selectedTopic.topic_global_context || ''
                                  const currentArray = current ? current.split(', ').filter(c => c) : []
                                  const newArray = currentArray.includes(context)
                                    ? currentArray.filter(c => c !== context)
                                    : [...currentArray, context]
                                  setSelectedTopic(prev => ({ ...prev, topic_global_context: newArray.join(', ') }))
                                } else {
                                  // In edit mode, use selectedContexts
                                  toggleContext(context)
                                }
                              }}
                              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                                (isAddMode 
                                  ? (selectedTopic.topic_global_context || '').split(', ').includes(context)
                                  : selectedContexts.includes(context))
                                  ? 'bg-cyan-500 text-white shadow-md scale-105'
                                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                              }`}
                            >
                              {(isAddMode 
                                ? (selectedTopic.topic_global_context || '').split(', ').includes(context)
                                : selectedContexts.includes(context)) && (
                                <svg className="w-4 h-4 inline mr-1" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              )}
                              {context}
                            </button>
                          ))}
                        </div>
                        {!isAddMode && (
                          <div className="flex gap-2">
                            <button
                              onClick={saveGlobalContexts}
                              className="px-4 py-2 bg-cyan-500 text-white rounded-md hover:bg-cyan-600 transition-colors font-medium"
                            >
                              Save
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors font-medium"
                            >
                              Cancel
                            </button>
                          </div>
                        )}
                        {((isAddMode && selectedTopic.topic_global_context) || (!isAddMode && selectedContexts.length > 0)) && (
                          <p className="text-xs text-gray-500">
                            Selected: {isAddMode 
                              ? (selectedTopic.topic_global_context || '').split(', ').filter(c => c).length
                              : selectedContexts.length} context{((isAddMode ? (selectedTopic.topic_global_context || '').split(', ').filter(c => c).length : selectedContexts.length) > 1) ? 's' : ''}
                          </p>
                        )}
                      </div>
                    ) : (
                      <p 
                        className="text-gray-700 leading-relaxed whitespace-pre-wrap cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors"
                        onClick={() => startEdit('topic_global_context', selectedTopic.topic_global_context)}
                      >
                        {selectedTopic.topic_global_context || 'Click to select global context...'}
                      </p>
                    )}
                  </div>

                  {/* Key Concept */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-semibold text-cyan-500">Key Concept</h3>
                      {lang === 'en' && isStepCompleted(0) && (
                        <button
                          onClick={() => {
                            setAiHelpType('keyConcept')
                            setAiError('')
                            setSelectedKeyConcepts([])
                            setAiResultModalOpen(false)
                            requestAiHelp('keyConcept')
                          }}
                          className="text-xs px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg transition-colors inline-flex items-center gap-1.5 font-medium border border-purple-200"
                        >
                          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10 3.5a1.5 1.5 0 013 0V4a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-.5a1.5 1.5 0 000 3h.5a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-.5a1.5 1.5 0 00-3 0v.5a1 1 0 01-1 1H6a1 1 0 01-1-1v-3a1 1 0 00-1-1h-.5a1.5 1.5 0 010-3H4a1 1 0 001-1V6a1 1 0 011-1h3a1 1 0 001-1v-.5z" />
                          </svg>
                          AI Help
                        </button>
                      )}
                    </div>
                    {(editingField === 'topic_key_concept') ? (
                      <div className="space-y-3">
                        <p className="text-xs text-gray-600">Select 1-3 concepts from the 16 IB MYP Key Concepts</p>
                        <div className="flex flex-wrap gap-2">
                          {keyConcepts.map((concept) => {
                            const currentArray = editValue ? editValue.split(',').map(s => s.trim()).filter(Boolean) : []
                            const isSelected = currentArray.includes(concept)
                            return (
                              <button
                                key={concept}
                                type="button"
                                onClick={() => {
                                  const newArray = isSelected
                                    ? currentArray.filter(c => c !== concept)
                                    : [...currentArray, concept]
                                  setEditValue(newArray.join(', '))
                                }}
                                className={`px-3 py-2 rounded-full text-sm font-medium transition-all ${
                                  isSelected
                                    ? 'bg-purple-500 text-white shadow-md scale-105'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                              >
                                {isSelected && (
                                  <svg className="w-3 h-3 inline mr-1" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                )}
                                {concept}
                              </button>
                            )
                          })}
                        </div>
                        {editValue && (
                          <p className="text-xs text-purple-600">
                            ✓ Selected: {editValue.split(',').map(s => s.trim()).filter(Boolean).length} concept(s)
                          </p>
                        )}
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleSave('topic_key_concept', editValue)}
                            className="px-4 py-2 bg-cyan-500 text-white rounded-md hover:bg-cyan-600 transition-colors font-medium text-sm"
                          >
                            Save
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors font-medium text-sm"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p 
                        className="text-gray-700 leading-relaxed whitespace-pre-wrap cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors"
                        onClick={() => startEdit('topic_key_concept', selectedTopic.topic_key_concept)}
                      >
                        {selectedTopic.topic_key_concept || 'Click to add key concept...'}
                      </p>
                    )}
                  </div>

                  {/* Related Concept */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-semibold text-cyan-500">Related Concept</h3>
                      {lang === 'en' && isStepCompleted(0) && (
                        <button
                          onClick={() => {
                            setAiHelpType('relatedConcept')
                            setAiError('')
                            setSelectedRelatedConcepts([])
                            setAiResultModalOpen(false)
                            requestAiHelp('relatedConcept')
                          }}
                          className="text-xs px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-700 rounded-lg transition-colors inline-flex items-center gap-1.5 font-medium border border-teal-200"
                        >
                          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10 3.5a1.5 1.5 0 013 0V4a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-.5a1.5 1.5 0 000 3h.5a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-.5a1.5 1.5 0 00-3 0v.5a1 1 0 01-1 1H6a1 1 0 01-1-1v-3a1 1 0 00-1-1h-.5a1.5 1.5 0 010-3H4a1 1 0 001-1V6a1 1 0 011-1h3a1 1 0 001-1v-.5z" />
                          </svg>
                          AI Help
                        </button>
                      )}
                    </div>
                    {(editingField === 'topic_related_concept') ? (
                      <textarea
                        value={editValue}
                        onChange={(e) => {
                          if (false) {
                            setSelectedTopic(prev => ({ ...prev, topic_related_concept: e.target.value }))
                          } else {
                            setEditValue(e.target.value)
                          }
                        }}
                        onBlur={() => {
                          if (true && editingField === 'topic_related_concept') {
                            handleSave('topic_related_concept', editValue)
                          }
                        }}
                        onKeyDown={(e) => { if (e.key === 'Escape' && !isAddMode) cancelEdit() }}
                        className="w-full px-3 py-2 border border-cyan-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500 text-gray-700 leading-relaxed"
                        rows={2}
                        placeholder=""
                      />
                    ) : (
                      <p 
                        className="text-gray-700 leading-relaxed whitespace-pre-wrap cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors"
                        onClick={() => startEdit('topic_related_concept', selectedTopic.topic_related_concept)}
                      >
                        {selectedTopic.topic_related_concept || 'Click to add related concept...'}
                      </p>
                    )}
                  </div>

                  {/* Statement of Inquiry */}
                  <div>
                    <h3 className="text-sm font-semibold text-cyan-500 mb-2">Statement of Inquiry</h3>
                    {(editingField === 'topic_statement') ? (
                      <textarea
                        value={editValue}
                        onChange={(e) => {
                          if (false) {
                            setSelectedTopic(prev => ({ ...prev, topic_statement: e.target.value }))
                          } else {
                            setEditValue(e.target.value)
                          }
                        }}
                        onBlur={() => {
                          if (true && editingField === 'topic_statement') {
                            handleSave('topic_statement', editValue)
                          }
                        }}
                        onKeyDown={(e) => { if (e.key === 'Escape' && !isAddMode) cancelEdit() }}
                        className="w-full px-3 py-2 border border-cyan-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500 text-gray-700 leading-relaxed"
                        rows={3}
                        placeholder=""
                      />
                    ) : (
                      <p 
                        className="text-gray-700 leading-relaxed whitespace-pre-wrap cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors"
                        onClick={() => startEdit('topic_statement', selectedTopic.topic_statement)}
                      >
                        {selectedTopic.topic_statement || 'Click to add statement of inquiry...'}
                      </p>
                    )}
                  </div>

                  {/* Learner Profile */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-semibold text-cyan-500">Learner Profile Attributes</h3>
                      {editingField !== 'topic_learner_profile' && (
                        <button
                          type="button"
                          onClick={() => {
                            if (!selectedTopic.topic_nama || !selectedTopic.topic_key_concept || !selectedTopic.topic_related_concept || !selectedTopic.topic_global_context) {
                              alert('Please complete Unit Title, Key Concept, Related Concept, and Global Context first')
                              return
                            }
                            setAiHelpType('learnerProfile')
                            setAiError('')
                            setSelectedLearnerProfiles([])
                            setAiResultModalOpen(false)
                            requestAiHelp('learnerProfile')
                          }}
                          className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-full border border-green-300 bg-green-50 text-green-700 hover:bg-green-100 transition-colors"
                          title="Get AI suggestions for Learner Profile"
                        >
                          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10 3.5a1.5 1.5 0 013 0V4a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-.5a1.5 1.5 0 000 3h.5a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-.5a1.5 1.5 0 00-3 0v.5a1 1 0 01-1 1H6a1 1 0 01-1-1v-3a1 1 0 00-1-1h-.5a1.5 1.5 0 010-3H4a1 1 0 001-1V6a1 1 0 011-1h3a1 1 0 001-1v-.5z" />
                          </svg>
                          AI Help
                        </button>
                      )}
                    </div>
                    {(editingField === 'topic_learner_profile') ? (
                      <div className="space-y-3">
                        <p className="text-xs text-gray-600">Select IB Learner Profile attributes students will develop</p>
                        <div className="flex flex-wrap gap-2">
                          {learnerProfiles.map((profile) => {
                            const currentArray = editValue ? editValue.split(',').map(s => s.trim()).filter(Boolean) : []
                            const isSelected = currentArray.includes(profile)
                            return (
                              <button
                                key={profile}
                                type="button"
                                onClick={() => {
                                  const newArray = isSelected
                                    ? currentArray.filter(c => c !== profile)
                                    : [...currentArray, profile]
                                  setEditValue(newArray.join(', '))
                                }}
                                className={`px-3 py-2 rounded-full text-sm font-medium transition-all ${
                                  isSelected
                                    ? 'bg-green-500 text-white shadow-md scale-105'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                              >
                                {isSelected && (
                                  <svg className="w-3 h-3 inline mr-1" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                )}
                                {profile}
                              </button>
                            )
                          })}
                        </div>
                        {editValue && (
                          <p className="text-xs text-green-600">
                            ✓ Selected: {editValue.split(',').map(s => s.trim()).filter(Boolean).length} attribute(s)
                          </p>
                        )}
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleSave('topic_learner_profile', editValue)}
                            className="px-4 py-2 bg-cyan-500 text-white rounded-md hover:bg-cyan-600 transition-colors font-medium text-sm"
                          >
                            Save
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors font-medium text-sm"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p 
                        className="text-gray-700 leading-relaxed whitespace-pre-wrap cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors"
                        onClick={() => startEdit('topic_learner_profile', selectedTopic.topic_learner_profile)}
                      >
                        {selectedTopic.topic_learner_profile || 'Click to add learner profile...'}
                      </p>
                    )}
                  </div>

                  {/* Service Learning */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-semibold text-cyan-500">Service Learning</h3>
                      {editingField !== 'topic_service_learning' && (
                        <button
                          type="button"
                          onClick={() => {
                            if (!selectedTopic.topic_nama || !selectedTopic.topic_key_concept || !selectedTopic.topic_related_concept || !selectedTopic.topic_global_context) {
                              alert('Please complete Unit Title, Key Concept, Related Concept, and Global Context first')
                              return
                            }
                            setAiHelpType('serviceLearning')
                            setAiError('')
                            setSelectedServiceLearning([])
                            setAiResultModalOpen(false)
                            requestAiHelp('serviceLearning')
                          }}
                          className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-full border border-cyan-300 bg-cyan-50 text-cyan-700 hover:bg-cyan-100 transition-colors"
                          title="Get AI suggestions for Service Learning"
                        >
                          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10 3.5a1.5 1.5 0 013 0V4a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-.5a1.5 1.5 0 000 3h.5a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-.5a1.5 1.5 0 00-3 0v.5a1 1 0 01-1 1H6a1 1 0 01-1-1v-3a1 1 0 00-1-1h-.5a1.5 1.5 0 010-3H4a1 1 0 001-1V6a1 1 0 011-1h3a1 1 0 001-1v-.5z" />
                          </svg>
                          AI Help
                        </button>
                      )}
                    </div>
                    {(editingField === 'topic_service_learning') ? (
                      <textarea
                        value={editValue}
                        onChange={(e) => {
                          if (false) {
                            setSelectedTopic(prev => ({ ...prev, topic_service_learning: e.target.value }))
                          } else {
                            setEditValue(e.target.value)
                          }
                        }}
                        onBlur={() => {
                          if (true && editingField === 'topic_service_learning') {
                            handleSave('topic_service_learning', editValue)
                          }
                        }}
                        onKeyDown={(e) => { if (e.key === 'Escape' && !isAddMode) cancelEdit() }}
                        className="w-full px-3 py-2 border border-cyan-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500 text-gray-700 leading-relaxed"
                        rows={3}
                        placeholder=""
                      />
                    ) : (
                      <p 
                        className="text-gray-700 leading-relaxed whitespace-pre-wrap cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors"
                        onClick={() => startEdit('topic_service_learning', selectedTopic.topic_service_learning)}
                      >
                        {selectedTopic.topic_service_learning || 'Click to add service learning...'}
                      </p>
                    )}
                  </div>

                  {/* Learning Process */}
                  <div>
                    <h3 className="text-sm font-semibold text-cyan-500 mb-2">Learning Process</h3>
                    {(editingField === 'topic_learning_process') ? (
                      <textarea
                        value={editValue}
                        onChange={(e) => {
                          if (false) {
                            setSelectedTopic(prev => ({ ...prev, topic_learning_process: e.target.value }))
                          } else {
                            setEditValue(e.target.value)
                          }
                        }}
                        onBlur={() => {
                          if (true && editingField === 'topic_learning_process') {
                            handleSave('topic_learning_process', editValue)
                          }
                        }}
                        onKeyDown={(e) => { if (e.key === 'Escape' && !isAddMode) cancelEdit() }}
                        className="w-full px-3 py-2 border border-cyan-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500 text-gray-700 leading-relaxed"
                        rows={5}
                        placeholder=""
                      />
                    ) : (
                      <p 
                        className="text-gray-700 leading-relaxed whitespace-pre-wrap cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors"
                        onClick={() => startEdit('topic_learning_process', selectedTopic.topic_learning_process)}
                      >
                        {selectedTopic.topic_learning_process || 'Click to add learning process...'}
                      </p>
                    )}
                  </div>

                  {/* Formative Assessment */}
                  <div>
                    <h3 className="text-sm font-semibold text-cyan-500 mb-2">Formative Assessment</h3>
                    {(editingField === 'topic_formative_assessment') ? (
                      <textarea
                        value={editValue}
                        onChange={(e) => {
                          if (false) {
                            setSelectedTopic(prev => ({ ...prev, topic_formative_assessment: e.target.value }))
                          } else {
                            setEditValue(e.target.value)
                          }
                        }}
                        onBlur={() => {
                          if (true && editingField === 'topic_formative_assessment') {
                            handleSave('topic_formative_assessment', editValue)
                          }
                        }}
                        onKeyDown={(e) => { if (e.key === 'Escape' && !isAddMode) cancelEdit() }}
                        className="w-full px-3 py-2 border border-cyan-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500 text-gray-700 leading-relaxed"
                        rows={3}
                        placeholder=""
                      />
                    ) : (
                      <p 
                        className="text-gray-700 leading-relaxed whitespace-pre-wrap cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors"
                        onClick={() => startEdit('topic_formative_assessment', selectedTopic.topic_formative_assessment)}
                      >
                        {selectedTopic.topic_formative_assessment || 'Click to add formative assessment...'}
                      </p>
                    )}
                  </div>

                  {/* Summative Assessment */}
                  <div>
                    <h3 className="text-sm font-semibold text-cyan-500 mb-2">Summative Assessment</h3>
                    {(editingField === 'topic_summative_assessment') ? (
                      <textarea
                        value={editValue}
                        onChange={(e) => {
                          if (false) {
                            setSelectedTopic(prev => ({ ...prev, topic_summative_assessment: e.target.value }))
                          } else {
                            setEditValue(e.target.value)
                          }
                        }}
                        onBlur={() => {
                          if (true && editingField === 'topic_summative_assessment') {
                            handleSave('topic_summative_assessment', editValue)
                          }
                        }}
                        onKeyDown={(e) => { if (e.key === 'Escape' && !isAddMode) cancelEdit() }}
                        className="w-full px-3 py-2 border border-cyan-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500 text-gray-700 leading-relaxed"
                        rows={4}
                        placeholder=""
                      />
                    ) : (
                      <p 
                        className="text-gray-700 leading-relaxed whitespace-pre-wrap cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors"
                        onClick={() => startEdit('topic_summative_assessment', selectedTopic.topic_summative_assessment)}
                      >
                        {selectedTopic.topic_summative_assessment || 'Click to add summative assessment...'}
                      </p>
                    )}
                  </div>

                  {/* Relationship */}
                  <div>
                    <h3 className="text-sm font-semibold text-cyan-500 mb-2">Relationship: Summative Assessment & Statement of Inquiry</h3>
                    {(editingField === 'topic_relationship_summative_assessment_statement_of_inquiry') ? (
                      <textarea
                        value={editValue}
                        onChange={(e) => {
                          if (false) {
                            setSelectedTopic(prev => ({ ...prev, topic_relationship_summative_assessment_statement_of_inquiry: e.target.value }))
                          } else {
                            setEditValue(e.target.value)
                          }
                        }}
                        onBlur={() => {
                          if (true && editingField === 'topic_relationship_summative_assessment_statement_of_inquiry') {
                            handleSave('topic_relationship_summative_assessment_statement_of_inquiry', editValue)
                          }
                        }}
                        onKeyDown={(e) => { if (e.key === 'Escape' && !isAddMode) cancelEdit() }}
                        className="w-full px-3 py-2 border border-cyan-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500 text-gray-700 leading-relaxed"
                        rows={4}
                        placeholder=""
                      />
                    ) : (
                      <p 
                        className="text-gray-700 leading-relaxed whitespace-pre-wrap cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors"
                        onClick={() => startEdit('topic_relationship_summative_assessment_statement_of_inquiry', selectedTopic.topic_relationship_summative_assessment_statement_of_inquiry)}
                      >
                        {selectedTopic.topic_relationship_summative_assessment_statement_of_inquiry || 'Click to add relationship...'}
                      </p>
                    )}
                  </div>
                    </div>
                  )}
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
                    <div className="px-6 py-4 border-t border-gray-200 bg-white flex justify-end gap-3 flex-shrink-0 rounded-b-2xl">
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
                    title={aiHelpType === 'inquiryQuestion' ? 'AI Suggestions: Inquiry Questions' : aiHelpType === 'keyConcept' ? 'AI Suggestions: Key Concepts' : aiHelpType === 'relatedConcept' ? 'AI Suggestions: Related Concepts' : aiHelpType === 'globalContext' ? 'AI Suggestions: Global Context' : aiHelpType === 'statement' ? 'AI Suggestions: Statement of Inquiry' : aiHelpType === 'learnerProfile' ? 'AI Suggestions: Learner Profile' : aiHelpType === 'serviceLearning' ? 'AI Suggestions: Service Learning' : 'AI Suggestions: Unit Title'}
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
                              const titleToUse = item.option || item.text || ''

                              return (
                                <div 
                                  key={item.index} 
                                  className={`border rounded-lg p-4 transition-colors ${
                                    (selectedInquiryQuestions.includes(item.index) && aiHelpType === 'inquiryQuestion') ||
                                    (selectedKeyConcepts.includes(item.index) && aiHelpType === 'keyConcept') ||
                                    (selectedRelatedConcepts.includes(item.index) && aiHelpType === 'relatedConcept') ||
                                    (selectedGlobalContexts.includes(item.index) && aiHelpType === 'globalContext') ||
                                    (selectedStatements.includes(item.index) && aiHelpType === 'statement') || (selectedLearnerProfiles.includes(item.index) && aiHelpType === 'learnerProfile') || (selectedServiceLearning.includes(item.index) && aiHelpType === 'serviceLearning')
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
                                      {(aiHelpType === 'inquiryQuestion' || aiHelpType === 'keyConcept' || aiHelpType === 'relatedConcept' || aiHelpType === 'globalContext' || aiHelpType === 'statement' || aiHelpType === 'learnerProfile' || aiHelpType === 'serviceLearning') && (
                                        <input
                                          type="checkbox"
                                          id={`ai-item-${item.index}`}
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
                                            : selectedServiceLearning.includes(item.index)}
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
                                            } else {
                                              toggleServiceLearning(item.index)
                                            }
                                          }}
                                          readOnly
                                          className="w-5 h-5 text-purple-600 border-gray-300 rounded focus:ring-0 focus:ring-offset-0 cursor-pointer"
                                        />
                                      )}
                                      <span className="bg-purple-100 text-purple-700 font-semibold text-sm px-2.5 py-1 rounded-full">
                                        {t('topicNew.aiHelp.suggestion', { index: item.index })}
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
                                    {aiHelpType !== 'inquiryQuestion' && aiHelpType !== 'keyConcept' && aiHelpType !== 'relatedConcept' && aiHelpType !== 'globalContext' && aiHelpType !== 'statement' && aiHelpType !== 'learnerProfile' && aiHelpType !== 'serviceLearning' && (
                                      <button
                                        onClick={() => insertAiSuggestion(titleToUse)}
                                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors inline-flex items-center gap-2 flex-shrink-0"
                                      >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        {t('topicNew.buttons.useThis')}
                                      </button>
                                    )}
                                  </div>
                                  
                                  {/* Question or Title (option) */}
                                  {item.option && (
                                    <div className="mb-3">
                                      <h4 className="text-base font-bold text-gray-900 mb-1">
                                        {aiHelpType === 'inquiryQuestion' ? 'Question:' 
                                          : aiHelpType === 'keyConcept' ? 'Key Concept:'
                                          : aiHelpType === 'relatedConcept' ? 'Related Concept:'
                                          : aiHelpType === 'globalContext' ? 'Global Context:'
                                          : aiHelpType === 'statement' ? 'Statement of Inquiry:' : aiHelpType === 'learnerProfile' ? 'Learner Profile Attribute:' : aiHelpType === 'serviceLearning' ? 'Service Learning Opportunity:' : t('topicNew.aiHelp.unitTitleLabel')}
                                      </h4>
                                      <p className="text-gray-800 leading-relaxed">{item.option}</p>
                                    </div>
                                  )}
                                  
                                  {/* Description (text) */}
                                  {item.text && (
                                    <div className="mb-3">
                                      <h4 className="text-sm font-semibold text-gray-700 mb-1">{t('topicNew.aiHelp.descriptionLabel')}</h4>
                                      <p className="text-gray-700 text-sm leading-relaxed">{item.text}</p>
                                    </div>
                                  )}
                                  
                                  {/* Reason */}
                                  {item.reason && (
                                    <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                                      <h4 className="text-sm font-semibold text-blue-900 mb-1 flex items-center gap-1">
                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                        </svg>
                                        {t('topicNew.aiHelp.reasonLabel')}
                                      </h4>
                                      <p className="text-blue-800 text-sm leading-relaxed">{item.reason}</p>
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

                      {(aiHelpType === 'inquiryQuestion' || aiHelpType === 'keyConcept' || aiHelpType === 'relatedConcept' || aiHelpType === 'globalContext' || aiHelpType === 'statement' || aiHelpType === 'learnerProfile' || aiHelpType === 'serviceLearning') && aiItems.length > 0 && !aiLoading && (
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
                              onClick={aiHelpType === 'inquiryQuestion' ? applySelectedInquiryQuestions : aiHelpType === 'keyConcept' ? applySelectedKeyConcepts : aiHelpType === 'relatedConcept' ? applySelectedRelatedConcepts : aiHelpType === 'globalContext' ? applySelectedGlobalContexts : aiHelpType === 'statement' ? applySelectedStatements : aiHelpType === 'learnerProfile' ? applySelectedLearnerProfiles : applySelectedServiceLearning}
                              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors inline-flex items-center gap-2"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              {aiHelpType === 'inquiryQuestion' ? 'Apply Selected Questions' : aiHelpType === 'keyConcept' ? 'Apply Selected Concepts' : aiHelpType === 'relatedConcept' ? 'Apply Selected Concepts' : aiHelpType === 'globalContext' ? 'Apply Selected Contexts' : aiHelpType === 'statement' ? 'Apply Selected Statement' : aiHelpType === 'learnerProfile' ? 'Apply Selected Attributes' : 'Apply Selected Option'}
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

      {/* Floating Action Button */}
      <button
        onClick={openAddModal}
        className="fixed bottom-8 right-8 w-14 h-14 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all flex items-center justify-center group z-40"
        title="Add New Topic"
      >
        <svg className="w-7 h-7 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </button>

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

      {/* Floating Action Button (FAB) */}
      <div className="fixed bottom-8 right-8 z-40">
        {/* Secondary Buttons (shown when FAB is open) */}
        <div className={`absolute bottom-20 right-0 flex flex-col items-end gap-3 transition-all duration-300 ${fabOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
          {/* Add Assessment Button */}
          <button
            onClick={() => {
              setShowAssessmentForm(true)
              setFabOpen(false)
            }}
            disabled={detailKelasOptions.length === 0}
            className="group flex items-center gap-3 transition-all duration-200 hover:scale-105"
          >
            <span className="bg-white px-4 py-2 rounded-full shadow-lg text-sm font-medium text-gray-700 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
              Add Assessment
            </span>
            <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 text-white flex items-center justify-center shadow-lg hover:shadow-xl transition-all">
              <FontAwesomeIcon icon={faClipboardList} className="text-lg" />
            </div>
          </button>
          
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
                  Approved Assessment - Limited Editing
                </h3>
                <p className="mt-1 text-sm text-green-700">
                  This assessment has been approved. You can only update the <strong>criteria</strong>. 
                  Date and class cannot be changed.
                </p>
              </div>
            </div>
          </div>
        )}
        
        {/* Info Panel */}
        {!(editingAssessment && editingAssessment.assessment_status === 1) && (
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

        <form onSubmit={handleAssessmentSubmit} className="space-y-4">
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
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                assessmentFormErrors.assessment_nama ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {assessmentFormErrors.assessment_nama && (
              <p className="text-red-500 text-sm mt-1">{assessmentFormErrors.assessment_nama}</p>
            )}
          </div>

          {/* Assessment Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Assessment Date *
              {editingAssessment && editingAssessment.assessment_status === 1 && (
                <span className="ml-2 text-xs text-gray-500">(Cannot change - already approved)</span>
              )}
            </label>
            <input
              name="assessment_tanggal"
              type="date"
              value={assessmentFormData.assessment_tanggal}
              onChange={handleAssessmentInputChange}
              min={getMinimumDate().toISOString().split('T')[0]}
              disabled={editingAssessment && editingAssessment.assessment_status === 1}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                assessmentFormErrors.assessment_tanggal ? 'border-red-500' : 'border-gray-300'
              } ${editingAssessment && editingAssessment.assessment_status === 1 ? 'bg-gray-100 cursor-not-allowed' : ''}`}
            />
            {assessmentFormErrors.assessment_tanggal && (
              <p className="text-red-500 text-sm mt-1">{assessmentFormErrors.assessment_tanggal}</p>
            )}
            {!(editingAssessment && editingAssessment.assessment_status === 1) && (
              <p className="text-xs text-gray-500 mt-1">
                <FontAwesomeIcon icon={faInfoCircle} className="mr-1" />
                Minimum date: {getMinimumDate().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
            )}
          </div>

          {/* Subject/Class Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Subject / Class *
              {editingAssessment && editingAssessment.assessment_status === 1 && (
                <span className="ml-2 text-xs text-gray-500">(Cannot change - already approved)</span>
              )}
            </label>
            <select
              name="assessment_detail_kelas_id"
              value={assessmentFormData.assessment_detail_kelas_id}
              onChange={handleAssessmentInputChange}
              disabled={editingAssessment && editingAssessment.assessment_status === 1}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                assessmentFormErrors.assessment_detail_kelas_id ? 'border-red-500' : 'border-gray-300'
              } ${editingAssessment && editingAssessment.assessment_status === 1 ? 'bg-gray-100 cursor-not-allowed' : ''}`}
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

          {/* MYP Year Level */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              MYP Year Level *
              <span className="ml-2 text-xs text-gray-500">(For selecting correct strands/rubrics)</span>
            </label>
            <select
              name="assessment_myp_year"
              value={assessmentFormData.assessment_myp_year}
              onChange={handleAssessmentInputChange}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                assessmentFormErrors.assessment_myp_year ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              <option value="">Select MYP Year</option>
              <option value="1">MYP Year 1</option>
              <option value="3">MYP Year 3</option>
              <option value="5">MYP Year 5</option>
            </select>
            {assessmentFormErrors.assessment_myp_year && (
              <p className="text-red-500 text-sm mt-1">{assessmentFormErrors.assessment_myp_year}</p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              <FontAwesomeIcon icon={faInfoCircle} className="mr-1" />
              IB Standard: Only Years 1, 3, and 5 have specific strands/rubrics
            </p>
          </div>

          {/* Semester Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Semester
            </label>
            <select
              name="assessment_semester"
              value={assessmentFormData.assessment_semester}
              onChange={handleAssessmentInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select Semester</option>
              <option value="1">Semester 1</option>
              <option value="2">Semester 2</option>
            </select>
          </div>

          {/* Criteria Selection (Multiple) */}
          {assessmentFormData.assessment_detail_kelas_id && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                IB MYP Criteria * <span className="text-xs text-gray-500">(Select one or more)</span>
              </label>
              {criteriaForAssessment.length === 0 ? (
                <p className="text-sm text-red-500">No criteria available for this subject. Please add criteria in Subject Management first.</p>
              ) : (
                <div className={`space-y-2 p-3 border rounded-md ${
                  assessmentFormErrors.selected_criteria ? 'border-red-500 bg-red-50' : 'border-gray-300 bg-gray-50'
                }`}>
                  {criteriaForAssessment.map(c => (
                    <label 
                      key={c.criterion_id}
                      className="flex items-start gap-3 p-2 hover:bg-white rounded cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={assessmentFormData.selected_criteria.includes(c.criterion_id)}
                        onChange={() => toggleCriterionSelection(c.criterion_id)}
                        className="mt-1 w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-gray-800">
                          Criterion {c.code}
                        </div>
                        <div className="text-sm text-gray-600">
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
          {assessmentFormData.assessment_detail_kelas_id && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Topic / Unit *
                {editingAssessment && editingAssessment.assessment_status === 1 && (
                  <span className="ml-2 text-xs text-gray-500">(Cannot change - already approved)</span>
                )}
              </label>
              <select
                name="assessment_topic_id"
                value={assessmentFormData.assessment_topic_id}
                onChange={handleAssessmentInputChange}
                disabled={topicsLoadingAssessment || topicsForAssessment.length === 0 || (editingAssessment && editingAssessment.assessment_status === 1)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  assessmentFormErrors.assessment_topic_id ? 'border-red-500' : 'border-gray-300'
                } ${editingAssessment && editingAssessment.assessment_status === 1 ? 'bg-gray-100 cursor-not-allowed' : ''}`}
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
              {(!topicsLoadingAssessment && topicsForAssessment.length === 0 && assessmentFormData.assessment_detail_kelas_id && !(editingAssessment && editingAssessment.assessment_status === 1)) && (
                <p className="text-xs text-red-500 mt-1">No topics available for this subject/class. Please create a unit first.</p>
              )}
            </div>
          )}

          {/* Note/Description */}
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
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
              className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-md transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submittingAssessment || detailKelasOptions.length === 0}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors disabled:opacity-50 flex items-center gap-2"
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
            setGradingStrands([])
            setGradingData({})
            setExpandedStudents(new Set())
            setExpandedRubrics(new Set())
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
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-semibold">IB MYP Grading System with Rubrics</p>
                    {gradingAssessment?.grading_method && (
                      <span className="px-3 py-1 bg-blue-600 text-white text-xs font-bold rounded-full">
                        Calculation: {gradingAssessment.grading_method.toUpperCase()}
                      </span>
                    )}
                  </div>
                  <ul className="list-disc ml-5 space-y-1">
                    <li>Each criterion (A-D) has multiple strands (i, ii, iii, iv)</li>
                    <li>Select grade for each strand based on <strong>rubric descriptors</strong></li>
                    <li>Click <span className="underline">"Show Rubrics"</span> to view all achievement levels</li>
                    <li>Some strands may not have rubrics for certain levels (e.g., strand ii may start at 3-4)</li>
                    <li>
                      <strong>Criterion grade calculation:</strong>{' '}
                      {gradingAssessment?.grading_method === 'highest' && 'HIGHEST strand grade (IB best-fit)'}
                      {gradingAssessment?.grading_method === 'average' && 'AVERAGE of all strand grades (rounded)'}
                      {gradingAssessment?.grading_method === 'median' && 'MEDIAN of all strand grades'}
                      {gradingAssessment?.grading_method === 'mode' && 'MOST FREQUENT strand grade'}
                      {!gradingAssessment?.grading_method && 'HIGHEST strand grade (IB best-fit)'}
                    </li>
                    <li>Final grade (1-7) = calculated from sum of all 4 criteria (0-32 total)</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Students List */}
            <div className="space-y-3">
              {gradingStudents.map((student, index) => {
                const isExpanded = expandedStudents.has(student.detail_siswa_id)
                const studentData = gradingData[student.detail_siswa_id]
                
                // Calculate criterion grades for display
                const criterionGrades = {}
                if (gradingAssessment && studentData) {
                  gradingAssessment.criteria.forEach(criterion => {
                    criterionGrades[criterion.code] = calculateCriterionGrade(student.detail_siswa_id, criterion.criterion_id)
                  })
                }
                
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
                            {Object.entries(criterionGrades).map(([code, grade]) => (
                              <span key={code} className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded font-bold">
                                {code}: {grade !== null ? grade : '-'}
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

                    {/* Student Grading Form */}
                    {isExpanded && (
                      <div className="p-4 bg-white border-t border-gray-200">
                        {gradingAssessment?.criteria.map(criterion => {
                          const criterionStrands = gradingStrands.filter(s => s.criterion_id === criterion.criterion_id)
                          const criterionGrade = calculateCriterionGrade(student.detail_siswa_id, criterion.criterion_id)
                          
                          return (
                            <div key={criterion.criterion_id} className="mb-6 last:mb-0">
                              <div className="flex items-center justify-between mb-3">
                                <h4 className="font-bold text-gray-700 text-lg">
                                  Criterion {criterion.code}: {criterion.name}
                                </h4>
                                <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                                  criterionGrade !== null 
                                    ? criterionGrade >= 7 ? 'bg-green-100 text-green-700' 
                                      : criterionGrade >= 5 ? 'bg-blue-100 text-blue-700'
                                      : criterionGrade >= 3 ? 'bg-yellow-100 text-yellow-700'
                                      : 'bg-red-100 text-red-700'
                                    : 'bg-gray-100 text-gray-500'
                                }`}>
                                  Grade: {criterionGrade !== null ? criterionGrade : '-'}/8
                                </span>
                              </div>

                              <div className="space-y-4">
                                {criterionStrands.map(strand => {
                                  const isRubricExpanded = expandedRubrics.has(strand.strand_id)
                                  const availableGrades = getAvailableGrades(strand)
                                  const selectedGrade = studentData?.strand_grades[strand.strand_id]?.grade
                                  const currentRubric = getRubricForGrade(strand, selectedGrade)
                                  const hasRubrics = strand.rubrics && strand.rubrics.length > 0
                                  
                                  return (
                                    <div key={strand.strand_id} className="border border-purple-200 rounded-lg overflow-hidden bg-white">
                                      {/* Strand Header */}
                                      <div className="bg-purple-50 p-3 border-b border-purple-100">
                                        <div className="flex items-start justify-between gap-2">
                                          <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                              <span className="font-bold text-sm text-purple-700">
                                                Strand {strand.label}
                                              </span>
                                              {hasRubrics && (
                                                <button
                                                  onClick={() => toggleRubricExpansion(strand.strand_id)}
                                                  className="text-xs text-purple-600 hover:text-purple-800 underline"
                                                >
                                                  {isRubricExpanded ? 'Hide Rubrics' : 'Show Rubrics'}
                                                </button>
                                              )}
                                            </div>
                                            <p className="text-xs text-gray-700">
                                              {strand.content}
                                            </p>
                                          </div>
                                          <div className="flex items-center gap-2 min-w-[100px]">
                                            <label className="text-xs font-medium text-gray-700 whitespace-nowrap">
                                              Grade:
                                            </label>
                                            <select
                                              value={selectedGrade ?? ''}
                                              onChange={(e) => updateStrandGrade(student.detail_siswa_id, strand.strand_id, e.target.value)}
                                              className="flex-1 px-2 py-1 text-sm font-bold border border-purple-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                                            >
                                              <option value="">-</option>
                                              {availableGrades.map(g => (
                                                <option key={g} value={g}>{g}</option>
                                              ))}
                                            </select>
                                          </div>
                                        </div>
                                      </div>
                                      
                                      {/* Current Grade Rubric (if selected) */}
                                      {selectedGrade && currentRubric && (
                                        <div className={`p-3 border-b ${getBandColor(currentRubric.band_label)}`}>
                                          <div className="flex items-start gap-2">
                                            <span className="text-xs font-bold px-2 py-0.5 rounded border border-current">
                                              {currentRubric.band_label}
                                            </span>
                                            <p className="text-xs flex-1">
                                              {currentRubric.description}
                                            </p>
                                          </div>
                                        </div>
                                      )}
                                      
                                      {/* Rubrics List (expandable) */}
                                      {hasRubrics && isRubricExpanded && (
                                        <div className="p-3 bg-gray-50 space-y-2">
                                          <p className="text-xs font-semibold text-gray-700 mb-2">All Achievement Levels:</p>
                                          {strand.rubrics.map(rubric => (
                                            <div 
                                              key={rubric.rubric_id} 
                                              className={`p-2 rounded border ${getBandColor(rubric.band_label)}`}
                                            >
                                              <div className="flex items-start gap-2">
                                                <span className="text-xs font-bold px-2 py-0.5 rounded border border-current whitespace-nowrap">
                                                  {rubric.band_label}
                                                </span>
                                                <p className="text-xs flex-1">
                                                  {rubric.description}
                                                </p>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                      
                                      {/* No rubrics message */}
                                      {!hasRubrics && (
                                        <div className="p-3 bg-yellow-50 border-t border-yellow-100">
                                          <p className="text-xs text-yellow-700 italic">
                                            ⚠️ No rubrics configured for this strand. All grades 0-8 are available.
                                          </p>
                                        </div>
                                      )}
                                    </div>
                                  )
                                })}
                              </div>

                              {criterionStrands.length === 0 && (
                                <p className="text-sm text-gray-500 italic">No strands configured for this criterion.</p>
                              )}
                            </div>
                          )
                        })}

                        {/* Comments */}
                        <div className="mt-6 pt-4 border-t border-gray-200">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Comments (Optional)
                          </label>
                          <textarea
                            value={studentData?.comments || ''}
                            onChange={(e) => setGradingData(prev => ({
                              ...prev,
                              [student.detail_siswa_id]: {
                                ...prev[student.detail_siswa_id],
                                comments: e.target.value
                              }
                            }))}
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
    </div>
  )
}
