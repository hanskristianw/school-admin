'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSpinner } from '@fortawesome/free-solid-svg-icons'
import SlideOver from '@/components/ui/slide-over'

export default function TopicNewPage() {
  const router = useRouter()
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
    'Open-minded',
    'Caring',
    'Risk-takers',
    'Balanced',
    'Reflective'
  ]
  
  const [selectedContexts, setSelectedContexts] = useState([])
  
  // AI Help state for Unit Title
  const [aiInputModalOpen, setAiInputModalOpen] = useState(false)
  const [aiResultModalOpen, setAiResultModalOpen] = useState(false)
  const [aiUserInput, setAiUserInput] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState('')
  const [aiItems, setAiItems] = useState([])
  const [aiLang, setAiLang] = useState('')
  
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
    },
    {
      id: 'learning',
      title: 'Learning Process',
      description: 'Outline how students will learn and engage',
      fields: ['topic_learning_process'],
      guidance: 'Describe the learning experiences, activities, and teaching strategies. Include differentiation strategies and how students will construct understanding.'
    },
    {
      id: 'assessment',
      title: 'Assessment & Relationship',
      description: 'Plan formative and summative assessments',
      fields: ['topic_formative_assessment', 'topic_summative_assessment', 'topic_relationship_summative_assessment_statement_of_inquiry'],
      guidance: 'Formative assessments monitor learning progress. Summative assessments evaluate achievement. Explain how the summative assessment relates back to the Statement of Inquiry.'
    }
  ]
  
  // Get current user ID
  useEffect(() => {
    const userData = localStorage.getItem('user_data')
    console.log('🔍 User data from localStorage:', userData)
    if (userData) {
      try {
        const parsed = JSON.parse(userData)
        console.log('📋 Parsed user data:', parsed)
        // Try multiple possible keys for user ID
        const userId = parsed.userID || parsed.user_id || parsed.userId || parsed.id
        console.log('👤 User ID:', userId)
        if (userId) {
          fetchSubjects(userId)
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
  
  // Auto-save function
  const handleSave = async (fieldName, value) => {
    if (!selectedTopic) return
    
    setSaving(true)
    try {
      const { error } = await supabase
        .from('topic')
        .update({ [fieldName]: value })
        .eq('topic_id', selectedTopic.topic_id)
      
      if (error) throw error
      
      // Update local state
      setSelectedTopic(prev => ({ ...prev, [fieldName]: value }))
      setTopics(prev => prev.map(t => 
        t.topic_id === selectedTopic.topic_id 
          ? { ...t, [fieldName]: value }
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
  const openAiInputModal = (lang) => {
    setAiLang(lang)
    setAiUserInput('')
    setAiError('')
    setAiInputModalOpen(true)
  }
  
  const requestAiHelp = async () => {
    if (!aiUserInput.trim()) {
      setAiError('Mohon masukkan topik atau konteks yang ingin dibahas')
      return
    }
    
    setAiInputModalOpen(false)
    setAiResultModalOpen(true)
    setAiLoading(true)
    setAiError('')
    setAiItems([])
    
    try {
      const { data: rule, error: rErr } = await supabase.from('ai_rule').select('ai_rule_unit').limit(1).single()
      if (rErr) throw new Error(rErr.message)
      
      const context = rule?.ai_rule_unit || ''
      const bahasaMap = { en: 'Inggris', id: 'Indonesia', zh: 'Mandarin' }
      const selected = bahasaMap[aiLang] || 'Indonesia'
      
      const subj = subjects.find(s => String(s.subject_id) === String(selectedTopic?.topic_subject_id))
      const subjName = subj?.subject_name || ''
      const kelasName = kelasNameMap.get(parseInt(selectedTopic?.topic_kelas_id)) || ''
      
      const promptWithLang = `${context ? context + "\n\n" : ''}Subject: ${subjName}\nKelas: ${kelasName}\nTopik yang ingin dibahas: ${aiUserInput.trim()}\n\nBuatkan beberapa usulan Unit Title yang relevan dengan topik tersebut. Mohon jawab dalam bahasa ${selected}.`
      
      const body = { prompt: promptWithLang, model: 'gemini-2.5-flash', context }
      const resp = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      const json = await resp.json()
      if (!resp.ok) throw new Error(json?.error || 'Gagal memanggil AI')
      
      const text = json?.text || ''
      
      // Parse AI response
      let items = []
      try {
        const parsed = JSON.parse(text)
        if (parsed && Array.isArray(parsed.jawaban)) {
          items = parsed.jawaban.map((a, idx) => ({
            index: idx + 1,
            opsi: (a?.opsi ?? a?.option ?? '').toString().trim(),
            isi: (a?.isi ?? a?.text ?? '').toString().trim(),
            reason: (a?.reason ?? '').toString().trim(),
          }))
        }
      } catch (e) {
        // Parse as numbered list
        const lines = text.split(/\r?\n/).filter(l => l.trim())
        items = lines
          .map(line => {
            const match = line.match(/^(\d+)[.)\s]+(.*)$/)
            if (match) {
              return { index: parseInt(match[1]), text: match[2].trim() }
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
  
  const insertAiTitle = (txt) => {
    if (!txt) return
    const firstLine = String(txt).split(/\r?\n/)[0].replace(/\*\*/g, '').trim()
    setSelectedTopic(prev => ({ ...prev, topic_nama: firstLine }))
    setAiResultModalOpen(false)
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

    setSaving(true)
    try {
      const { data, error } = await supabase
        .from('topic')
        .insert([selectedTopic])
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
                        Filter by Subject
                      </label>
                      <select
                        value={filters.subject}
                        onChange={(e) => setFilters({ ...filters, subject: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                      >
                        <option value="">All Subjects</option>
                        {subjects.map(s => (
                          <option key={s.subject_id} value={s.subject_id}>
                            {s.subject_name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Search Topics
                      </label>
                      <input
                        type="text"
                        value={filters.search}
                        onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                        placeholder="Search by topic name..."
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
                          No topics found
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
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                <span className="bg-blue-50 text-blue-600 px-2 py-1 rounded text-xs font-medium">
                                  {subjectMap.get(topic.topic_subject_id) || 'N/A'}
                                </span>
                                {topic.topic_kelas_id && (
                                  <span className="bg-green-50 text-green-600 px-2 py-1 rounded text-xs font-medium">
                                    {kelasNameMap.get(topic.topic_kelas_id) || 'N/A'}
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
                      
                      {/* Add New Card */}
                      <div 
                        className="border-2 border-dashed border-gray-300 rounded-lg p-5 hover:border-red-400 hover:bg-red-50 transition-all cursor-pointer flex flex-col items-center justify-center min-h-[300px] group"
                        onClick={openAddModal}
                      >
                        <div className="w-16 h-16 rounded-full bg-gray-100 group-hover:bg-red-100 flex items-center justify-center mb-3 transition-colors">
                          <svg className="w-8 h-8 text-gray-400 group-hover:text-red-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                        </div>
                        <p className="text-gray-500 group-hover:text-red-600 font-medium transition-colors">Add New Topic</p>
                        <p className="text-xs text-gray-400 group-hover:text-red-400 mt-1 transition-colors">Click to create</p>
                      </div>
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
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Assessment</h2>
            <p className="text-gray-600">Assessment management content will be displayed here.</p>
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
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Report</h2>
            <p className="text-gray-600">Report generation content will be displayed here.</p>
          </div>
        )}
      </div>

      {/* Detail Modal with smooth animation */}
      {modalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 transition-opacity duration-300"
          onClick={() => setModalOpen(false)}
        >
          <div className="w-full flex justify-center items-start gap-4" onClick={(e) => e.stopPropagation()}>
            <div 
              className="bg-white rounded-lg shadow-2xl w-full max-h-[90vh] overflow-y-auto transform transition-all duration-300 scale-100"
              style={{
                animation: 'modalSlideIn 0.3s ease-out',
                maxWidth: aiResultModalOpen ? 'calc(100% - 420px)' : undefined
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
                          <h2 className="text-2xl font-bold text-gray-800">Create New Unit</h2>
                          <p className="text-sm text-gray-500 mt-1">IB MYP Unit Planner</p>
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
                                  Subject <span className="text-red-500">*</span>
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
                                  <option value="">Select a subject...</option>
                                  {subjects.map(subject => (
                                    <option key={subject.subject_id} value={subject.subject_id}>
                                      {subject.subject_name}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                  Class <span className="text-red-500">*</span>
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
                            </div>
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Unit Title <span className="text-red-500">*</span>
                              </label>
                              <div className="mb-2 flex flex-wrap gap-2">
                                <button 
                                  type="button" 
                                  onClick={() => openAiInputModal('en')}
                                  disabled={!selectedTopic.topic_subject_id}
                                  className={`inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-full border transition-colors ${
                                    selectedTopic.topic_subject_id
                                      ? 'border-purple-300 bg-purple-50 text-purple-700 hover:bg-purple-100 cursor-pointer'
                                      : 'border-gray-300 bg-gray-100 text-gray-400 cursor-not-allowed'
                                  }`}
                                  title={!selectedTopic.topic_subject_id ? 'Pilih subject terlebih dahulu' : ''}
                                >
                                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M10 3.5a1.5 1.5 0 013 0V4a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-.5a1.5 1.5 0 000 3h.5a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-.5a1.5 1.5 0 00-3 0v.5a1 1 0 01-1 1H6a1 1 0 01-1-1v-3a1 1 0 00-1-1h-.5a1.5 1.5 0 010-3H4a1 1 0 001-1V6a1 1 0 011-1h3a1 1 0 001-1v-.5z" />
                                  </svg>
                                  AI Help (EN)
                                </button>
                                <button 
                                  type="button" 
                                  onClick={() => openAiInputModal('id')}
                                  disabled={!selectedTopic.topic_subject_id}
                                  className={`inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-full border transition-colors ${
                                    selectedTopic.topic_subject_id
                                      ? 'border-indigo-300 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 cursor-pointer'
                                      : 'border-gray-300 bg-gray-100 text-gray-400 cursor-not-allowed'
                                  }`}
                                  title={!selectedTopic.topic_subject_id ? 'Pilih subject terlebih dahulu' : ''}
                                >
                                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M10 3.5a1.5 1.5 0 013 0V4a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-.5a1.5 1.5 0 000 3h.5a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-.5a1.5 1.5 0 00-3 0v.5a1 1 0 01-1 1H6a1 1 0 01-1-1v-3a1 1 0 00-1-1h-.5a1.5 1.5 0 010-3H4a1 1 0 001-1V6a1 1 0 011-1h3a1 1 0 001-1v-.5z" />
                                  </svg>
                                  AI Help (ID)
                                </button>
                                <button 
                                  type="button" 
                                  onClick={() => openAiInputModal('zh')}
                                  disabled={!selectedTopic.topic_subject_id}
                                  className={`inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-full border transition-colors ${
                                    selectedTopic.topic_subject_id
                                      ? 'border-teal-300 bg-teal-50 text-teal-700 hover:bg-teal-100 cursor-pointer'
                                      : 'border-gray-300 bg-gray-100 text-gray-400 cursor-not-allowed'
                                  }`}
                                  title={!selectedTopic.topic_subject_id ? 'Pilih subject terlebih dahulu' : ''}
                                >
                                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M10 3.5a1.5 1.5 0 013 0V4a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-.5a1.5 1.5 0 000 3h.5a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-.5a1.5 1.5 0 00-3 0v.5a1 1 0 01-1 1H6a1 1 0 01-1-1v-3a1 1 0 00-1-1h-.5a1.5 1.5 0 010-3H4a1 1 0 001-1V6a1 1 0 011-1h3a1 1 0 001-1v-.5z" />
                                  </svg>
                                  AI Help (ZH)
                                </button>
                              </div>
                              {!selectedTopic.topic_subject_id && (
                                <p className="text-xs text-amber-600 mb-2">⚠️ Pilih subject terlebih dahulu untuk menggunakan AI Help</p>
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
                              <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Key Concept <span className="text-red-500">*</span>
                              </label>
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
                              <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Related Concept <span className="text-red-500">*</span>
                              </label>
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
                              <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Global Context <span className="text-red-500">*</span>
                              </label>
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
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              Statement of Inquiry <span className="text-red-500">*</span>
                            </label>
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
                        
                        {/* Step 5: Learning Process */}
                        {currentStep === 5 && (
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              Learning Process <span className="text-red-500">*</span>
                            </label>
                            <textarea
                              value={selectedTopic.topic_learning_process || ''}
                              onChange={(e) => setSelectedTopic(prev => ({ ...prev, topic_learning_process: e.target.value }))}
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                              rows={6}
                              placeholder="Describe learning activities, teaching strategies, differentiation approaches..."
                            />
                          </div>
                        )}
                        
                        {/* Step 6: Assessment */}
                        {currentStep === 6 && (
                          <>
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Formative Assessment <span className="text-red-500">*</span>
                              </label>
                              <textarea
                                value={selectedTopic.topic_formative_assessment || ''}
                                onChange={(e) => setSelectedTopic(prev => ({ ...prev, topic_formative_assessment: e.target.value }))}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                rows={3}
                                placeholder="e.g., Exit tickets, peer discussions, quizzes, observations..."
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Summative Assessment <span className="text-red-500">*</span>
                              </label>
                              <textarea
                                value={selectedTopic.topic_summative_assessment || ''}
                                onChange={(e) => setSelectedTopic(prev => ({ ...prev, topic_summative_assessment: e.target.value }))}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                rows={4}
                                placeholder="e.g., Research project, presentation, written report..."
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Relationship: Assessment & Statement of Inquiry <span className="text-red-500">*</span>
                              </label>
                              <textarea
                                value={selectedTopic.topic_relationship_summative_assessment_statement_of_inquiry || ''}
                                onChange={(e) => setSelectedTopic(prev => ({ ...prev, topic_relationship_summative_assessment_statement_of_inquiry: e.target.value }))}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                rows={4}
                                placeholder="Explain how the summative assessment relates to the Statement of Inquiry..."
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
                    <h3 className="text-sm font-semibold text-cyan-500 mb-2">Key Concept</h3>
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
                    <h3 className="text-sm font-semibold text-cyan-500 mb-2">Related Concept</h3>
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
                    <h3 className="text-sm font-semibold text-cyan-500 mb-2">Learner Profile Attributes</h3>
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
                    <h3 className="text-sm font-semibold text-cyan-500 mb-2">Service Learning</h3>
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

            {aiResultModalOpen && (
              <div className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                <SlideOver
                  isOpen={true}
                  inline={true}
                  onClose={() => setAiResultModalOpen(false)}
                  title={`Saran Unit Title dari AI ${aiLang ? `(${aiLang.toUpperCase()})` : ''}`}
                  size="md"
                >
                  <div className="flex flex-col h-full">
                    <div className="flex-1 overflow-y-auto">
                      {aiLoading && (
                        <div className="flex items-center justify-center py-12">
                          <FontAwesomeIcon icon={faSpinner} spin className="text-purple-600 text-3xl mr-3" />
                          <span className="text-gray-600">Meminta saran dari AI...</span>
                        </div>
                      )}

                      {aiError && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                          <p className="text-red-700">{aiError}</p>
                        </div>
                      )}

                      {!aiLoading && !aiError && aiItems.length > 0 && (
                        <div className="space-y-4">
                          {aiItems.map((item) => {
                            const hasJson = typeof item.isi === 'string' || typeof item.opsi === 'string'
                            const preview = hasJson
                              ? `${item.opsi || ''}${item.opsi && item.isi ? '\n\n' : ''}${item.isi || ''}${item.reason ? '\n\n' + item.reason : ''}`
                              : item.text || ''
                            const titleToUse = hasJson ? (item.isi || item.opsi || '') : (item.text || '')

                            return (
                              <div key={item.index} className="border border-gray-200 rounded-lg p-4 hover:border-purple-300 transition-colors">
                                <div className="flex items-start justify-between mb-3">
                                  <div className="flex items-center gap-2">
                                    <span className="bg-purple-100 text-purple-700 font-semibold text-sm px-2.5 py-1 rounded-full">
                                      Usulan {item.index}
                                    </span>
                                  </div>
                                  <button
                                    onClick={() => insertAiTitle(titleToUse)}
                                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors inline-flex items-center gap-2"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    Gunakan
                                  </button>
                                </div>
                                <pre className="whitespace-pre-wrap text-gray-800 text-sm leading-relaxed">{preview}</pre>
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

                    <div className="mt-4 flex justify-end">
                      <button
                        onClick={() => setAiResultModalOpen(false)}
                        className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                      >
                        Tutup
                      </button>
                    </div>
                  </div>
                </SlideOver>
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

      {/* AI Input Modal */}
      {aiInputModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" onClick={() => setAiInputModalOpen(false)}>
          <div 
            className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4"
            onClick={(e) => e.stopPropagation()}
            style={{ animation: 'modalSlideIn 0.3s ease-out' }}
          >
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-800">
                AI Help untuk Unit Title {aiLang && `(${aiLang.toUpperCase()})`}
              </h2>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Apa yang ingin dibahas dalam unit ini?
                </label>
                <textarea
                  value={aiUserInput}
                  onChange={(e) => {
                    setAiUserInput(e.target.value)
                    setAiError('')
                  }}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                  rows={4}
                  placeholder="Contoh: Energi dan transformasinya dalam kehidupan sehari-hari, fokus pada energi terbarukan..."
                />
                <p className="text-xs text-gray-500 mt-1">
                  💡 Jelaskan topik, konsep, atau konteks yang ingin Anda eksplorasi dalam unit ini
                </p>
                {aiError && (
                  <p className="text-sm text-red-600 mt-2">{aiError}</p>
                )}
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setAiInputModalOpen(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Batal
              </button>
              <button
                onClick={requestAiHelp}
                className="px-4 py-2 text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors inline-flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 3.5a1.5 1.5 0 013 0V4a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-.5a1.5 1.5 0 000 3h.5a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-.5a1.5 1.5 0 00-3 0v.5a1 1 0 01-1 1H6a1 1 0 01-1-1v-3a1 1 0 00-1-1h-.5a1.5 1.5 0 010-3H4a1 1 0 001-1V6a1 1 0 011-1h3a1 1 0 001-1v-.5z" />
                </svg>
                Minta Saran AI
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Result SlideOver is now embedded beside the Add modal when open (handled inside modalOpen block) */}

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
      `}</style>
    </div>
  )
}
