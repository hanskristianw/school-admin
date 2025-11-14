'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSpinner } from '@fortawesome/free-solid-svg-icons'

export default function TopicNewPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('planning')
  const [activeSubMenu, setActiveSubMenu] = useState('overview')
  
  // Data state
  const [topics, setTopics] = useState([])
  const [subjects, setSubjects] = useState([])
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
    setEditingField(fieldName)
    setEditValue(currentValue || '')
  }

  // Cancel editing
  const cancelEdit = () => {
    setEditingField(null)
    setEditValue('')
  }

  // Open add new topic modal
  const openAddModal = () => {
    setIsAddMode(true)
    setSelectedTopic({
      topic_nama: '',
      topic_subject_id: filters.subject || (subjects[0]?.subject_id || ''),
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
          <div 
            className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto transform transition-all duration-300 scale-100"
            onClick={(e) => e.stopPropagation()}
            style={{
              animation: 'modalSlideIn 0.3s ease-out'
            }}
          >
            {selectedTopic && (
              <>
                {/* Modal Header */}
                <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
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
                        {selectedTopic.topic_nama}
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
                  <div className="flex items-center gap-2">
                    {isAddMode && (
                      <button
                        onClick={saveNewTopic}
                        disabled={saving}
                        className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {saving ? 'Saving...' : 'Save Topic'}
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setModalOpen(false)
                        setIsAddMode(false)
                      }}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Modal Content */}
                <div className="px-6 py-6 space-y-6">
                  {/* Duration and Hours */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-500 mb-1">Duration</p>
                      <p className="text-lg font-semibold text-gray-800">
                        {selectedTopic.topic_duration && selectedTopic.topic_duration !== '0' && selectedTopic.topic_duration !== 0 
                          ? `${selectedTopic.topic_duration} weeks` 
                          : '-'}
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-500 mb-1">Hours per Week</p>
                      <p className="text-lg font-semibold text-gray-800">
                        {selectedTopic.topic_hours_per_week && selectedTopic.topic_hours_per_week !== '0' && selectedTopic.topic_hours_per_week !== 0
                          ? `${selectedTopic.topic_hours_per_week} hours`
                          : '-'}
                      </p>
                    </div>
                  </div>

                  {/* Inquiry Question */}
                  <div>
                    <h3 className="text-sm font-semibold text-cyan-500 mb-2">Inquiry Question</h3>
                    {editingField === 'topic_inquiry_question' ? (
                      <textarea
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={() => isAddMode ? handleAddTopic('topic_inquiry_question', editValue) : handleSave('topic_inquiry_question', editValue)}
                        onKeyDown={(e) => {
                          if (e.key === 'Escape') cancelEdit()
                        }}
                        className="w-full px-3 py-2 border border-cyan-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500 text-gray-700 leading-relaxed"
                        rows={3}
                        autoFocus
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
                    {editingField === 'topic_global_context' ? (
                      <textarea
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={() => handleSave('topic_global_context', editValue)}
                        onKeyDown={(e) => { if (e.key === 'Escape') cancelEdit() }}
                        className="w-full px-3 py-2 border border-cyan-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500 text-gray-700 leading-relaxed"
                        rows={3}
                        autoFocus
                      />
                    ) : (
                      <p 
                        className="text-gray-700 leading-relaxed whitespace-pre-wrap cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors"
                        onClick={() => startEdit('topic_global_context', selectedTopic.topic_global_context)}
                      >
                        {selectedTopic.topic_global_context || 'Click to add global context...'}
                      </p>
                    )}
                  </div>

                  {/* Key Concept */}
                  <div>
                    <h3 className="text-sm font-semibold text-cyan-500 mb-2">Key Concept</h3>
                    {editingField === 'topic_key_concept' ? (
                      <textarea
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={() => handleSave('topic_key_concept', editValue)}
                        onKeyDown={(e) => { if (e.key === 'Escape') cancelEdit() }}
                        className="w-full px-3 py-2 border border-cyan-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500 text-gray-700 leading-relaxed"
                        rows={2}
                        autoFocus
                      />
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
                    {editingField === 'topic_related_concept' ? (
                      <textarea
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={() => handleSave('topic_related_concept', editValue)}
                        onKeyDown={(e) => { if (e.key === 'Escape') cancelEdit() }}
                        className="w-full px-3 py-2 border border-cyan-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500 text-gray-700 leading-relaxed"
                        rows={2}
                        autoFocus
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
                    {editingField === 'topic_statement' ? (
                      <textarea
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={() => handleSave('topic_statement', editValue)}
                        onKeyDown={(e) => { if (e.key === 'Escape') cancelEdit() }}
                        className="w-full px-3 py-2 border border-cyan-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500 text-gray-700 leading-relaxed"
                        rows={3}
                        autoFocus
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
                    {editingField === 'topic_learner_profile' ? (
                      <textarea
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={() => handleSave('topic_learner_profile', editValue)}
                        onKeyDown={(e) => { if (e.key === 'Escape') cancelEdit() }}
                        className="w-full px-3 py-2 border border-cyan-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500 text-gray-700 leading-relaxed"
                        rows={2}
                        autoFocus
                      />
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
                    {editingField === 'topic_service_learning' ? (
                      <textarea
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={() => handleSave('topic_service_learning', editValue)}
                        onKeyDown={(e) => { if (e.key === 'Escape') cancelEdit() }}
                        className="w-full px-3 py-2 border border-cyan-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500 text-gray-700 leading-relaxed"
                        rows={3}
                        autoFocus
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
                    {editingField === 'topic_learning_process' ? (
                      <textarea
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={() => handleSave('topic_learning_process', editValue)}
                        onKeyDown={(e) => { if (e.key === 'Escape') cancelEdit() }}
                        className="w-full px-3 py-2 border border-cyan-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500 text-gray-700 leading-relaxed"
                        rows={5}
                        autoFocus
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
                    {editingField === 'topic_formative_assessment' ? (
                      <textarea
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={() => handleSave('topic_formative_assessment', editValue)}
                        onKeyDown={(e) => { if (e.key === 'Escape') cancelEdit() }}
                        className="w-full px-3 py-2 border border-cyan-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500 text-gray-700 leading-relaxed"
                        rows={3}
                        autoFocus
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
                    {editingField === 'topic_summative_assessment' ? (
                      <textarea
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={() => handleSave('topic_summative_assessment', editValue)}
                        onKeyDown={(e) => { if (e.key === 'Escape') cancelEdit() }}
                        className="w-full px-3 py-2 border border-cyan-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500 text-gray-700 leading-relaxed"
                        rows={4}
                        autoFocus
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
                    {editingField === 'topic_relationship_summative_assessment_statement_of_inquiry' ? (
                      <textarea
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={() => handleSave('topic_relationship_summative_assessment_statement_of_inquiry', editValue)}
                        onKeyDown={(e) => { if (e.key === 'Escape') cancelEdit() }}
                        className="w-full px-3 py-2 border border-cyan-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500 text-gray-700 leading-relaxed"
                        rows={4}
                        autoFocus
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
              </>
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
