'use client'

import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { useTheme } from '@/lib/theme'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Modal from '@/components/ui/modal'
import NotificationModal from '@/components/ui/notification-modal'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faPlus,
  faBookOpen,
  faBrain,
  faGraduationCap,
  faFileAlt,
  faSpinner,
  faClock,
  faLightbulb,
  faCheck,
  faLayerGroup,
  faComments,
  faUserGraduate,
  faQuoteLeft,
  faPrint,
  faCopy,
  faEdit,
  faTrash,
  faDatabase,
  faListCheck,
  faInbox,
  faChalkboardUser,
  faChevronRight,
  faChevronLeft,
  faSearch,
  faInfoCircle,
  faTasks,
  faKey
} from '@fortawesome/free-solid-svg-icons'

// PYP Transdisciplinary Themes (Standard IB PYP Framework)
const TRANSDISCIPLINARY_THEMES = [
  'Who We Are',
  'Where We Are in Place and Time',
  'How We Express Ourselves',
  'How The World Works',
  'How We Organize Ourselves',
  'Sharing the Planet'
]

// IB Learner Profile Attributes
const LEARNER_PROFILES = [
  'Inquirers', 'Knowledgeable', 'Thinkers', 'Communicators',
  'Principled', 'Open-Minded', 'Caring', 'Risk-Takers', 'Balanced', 'Reflective'
]

// PYP Subject Areas & Scope and Sequence Strands
const PYP_SUBJECT_AREAS = [
  {
    name: 'Language',
    code: 'LANG',
    strands: [
      { name: 'Oral Communication', desc: 'Listening and speaking' },
      { name: 'Written Communication — Reading', desc: 'Comprehension, interpretation, and literary appreciation' },
      { name: 'Written Communication — Writing', desc: 'Composition, mechanics, and creative expression' },
      { name: 'Visual Communication', desc: 'Viewing and presenting visual media' }
    ]
  },
  {
    name: 'Mathematics',
    code: 'MATH',
    strands: [
      { name: 'Data Handling', desc: 'Sorting, representing, and interpreting data' },
      { name: 'Measurement', desc: 'Estimating and measuring physical attributes' },
      { name: 'Shape and Space', desc: '2D/3D geometry and spatial awareness' },
      { name: 'Pattern and Function', desc: 'Algebraic thinking and number relationships' },
      { name: 'Number', desc: 'Counting, place value, operations, and mental math' }
    ]
  },
  {
    name: 'Science',
    code: 'SCI',
    strands: [
      { name: 'Living Things', desc: 'Biology, ecosystems, and human body' },
      { name: 'Earth and Space', desc: 'Geology, weather, astronomy, and environment' },
      { name: 'Materials and Matter', desc: 'Properties, states, and changes of matter' },
      { name: 'Forces and Energy', desc: 'Physics concepts, motion, light, sound, and electricity' }
    ]
  },
  {
    name: 'Social Studies',
    code: 'SOC-ST',
    strands: [
      { name: 'Human Systems & Economic Activities', desc: 'Governance, trade, and infrastructure' },
      { name: 'Social Organization & Culture', desc: 'Beliefs, traditions, and societal structures' },
      { name: 'Continuity & Change Through Time', desc: 'Historical perspectives and evolution' },
      { name: 'Human & Natural Environments', desc: 'Geography, resources, and sustainability' }
    ]
  },
  {
    name: 'Arts',
    code: 'ARTS',
    strands: [
      { name: 'Responding in Visual & Performing Arts', desc: 'Critique, reflection, and appreciation' },
      { name: 'Creating in Visual & Performing Arts', desc: 'Expression, technique, music, and drama' }
    ]
  },
  {
    name: 'PSPE (Personal, Social & Physical Ed.)',
    code: 'PSPE',
    strands: [
      { name: 'Identity', desc: 'Self-awareness, confidence, and personal growth' },
      { name: 'Active Living', desc: 'Physical health, fitness, and motor skill development' },
      { name: 'Interactions', desc: 'Teamwork, fair play, and community engagement' }
    ]
  }
]

export default function PypPage() {
  const { theme, isDark } = useTheme()

  // Main 5 Tabs: 'templates' | 'poi' | 'atl' | 'subjects' | 'comment'
  const [activeTab, setActiveTab] = useState('poi')

  // Sub-tabs inside Tab 1 (Master Templates): 'ci' | 'loi' | 'atls' | 'kc'
  const [masterSubTab, setMasterSubTab] = useState('ci')

  // Filter State (Academic Year & Selected PYP Class)
  const [selectedYear, setSelectedYear] = useState('')
  const [selectedYearId, setSelectedYearId] = useState('')
  const [selectedClassId, setSelectedClassId] = useState('')

  // Master Database Data States
  const [years, setYears] = useState([])
  const [units, setUnits] = useState([])
  const [pypClasses, setPypClasses] = useState([])
  const [subjects, setSubjects] = useState([])
  const [pypUnitsList, setPypUnitsList] = useState([]) // From dedicated `pyp_unit` table
  const [loading, setLoading] = useState(true)

  // Master Lists Data States (pyp_ci_list, pyp_loi_list, pyp_atls_list, pyp_kc_list)
  const [ciList, setCiList] = useState([])
  const [loiList, setLoiList] = useState([])
  const [atlsList, setAtlsList] = useState([])
  const [kcList, setKcList] = useState([])
  const [loadingMaster, setLoadingMaster] = useState(false)

  // Pivot Relationships States (pyploiunit, pypkcunit, pypatlsunit)
  const [loiPivots, setLoiPivots] = useState([])
  const [kcPivots, setKcPivots] = useState([])
  const [atlPivots, setAtlPivots] = useState([])

  // Master List Modals & Form
  const [showMasterModal, setShowMasterModal] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [masterFormData, setMasterFormData] = useState({ name: '', key: '', question: '', definition: '' })

  // Master Templates Search & Pagination States
  const [masterSearchQuery, setMasterSearchQuery] = useState('')
  const [masterPage, setMasterPage] = useState(1)
  const MASTER_ITEMS_PER_PAGE = 10

  const currentRawMasterList = useMemo(() => {
    if (masterSubTab === 'ci') return ciList
    if (masterSubTab === 'loi') return loiList
    if (masterSubTab === 'atls') return atlsList
    if (masterSubTab === 'kc') return kcList
    return []
  }, [masterSubTab, ciList, loiList, atlsList, kcList])

  const filteredMasterList = useMemo(() => {
    if (!masterSearchQuery.trim()) return currentRawMasterList
    const q = masterSearchQuery.toLowerCase().trim()
    return currentRawMasterList.filter(item => {
      const nameMatch = item.name && item.name.toLowerCase().includes(q)
      const keyMatch = item.key && item.key.toLowerCase().includes(q)
      const questionMatch = item.question && item.question.toLowerCase().includes(q)
      const defMatch = item.definition && item.definition.toLowerCase().includes(q)
      return nameMatch || keyMatch || questionMatch || defMatch
    })
  }, [currentRawMasterList, masterSearchQuery])

  const totalMasterPages = Math.max(Math.ceil(filteredMasterList.length / MASTER_ITEMS_PER_PAGE), 1)

  const paginatedMasterList = useMemo(() => {
    const start = (masterPage - 1) * MASTER_ITEMS_PER_PAGE
    return filteredMasterList.slice(start, start + MASTER_ITEMS_PER_PAGE)
  }, [filteredMasterList, masterPage])

  const handleMasterSubTabChange = (tabKey) => {
    setMasterSubTab(tabKey)
    setMasterSearchQuery('')
    setMasterPage(1)
  }

  // New PYP Class Unit Wizard Modal States
  const [showClassUnitModal, setShowClassUnitModal] = useState(false)
  const [wizardStep, setWizardStep] = useState(1) // Steps 1 to 4
  const [submittingUnit, setSubmittingUnit] = useState(false)
  const [notif, setNotif] = useState({ isOpen: false, title: '', message: '', type: 'success' })

  // Form State for New Unit of Inquiry in a Class
  const [unitFormData, setUnitFormData] = useState({
    title: '',
    centralIdea: '',
    theme: 'Who We Are',
    duration: '6'
  })
  const [selectedLoiIds, setSelectedLoiIds] = useState([])
  const [selectedKcIds, setSelectedKcIds] = useState([])
  const [selectedAtlIds, setSelectedAtlIds] = useState([])
  const [atlNotes, setAtlNotes] = useState({}) // { [atlId]: string }
  const [kcNotes, setKcNotes] = useState({}) // { [kcId]: string }
  const [showCiSuggestions, setShowCiSuggestions] = useState(false)
  const [selectedCiObj, setSelectedCiObj] = useState(null)
  const [searchCiQuery, setSearchCiQuery] = useState('')
  const [showLoiSuggestions, setShowLoiSuggestions] = useState(false)
  const [selectedLoiObjs, setSelectedLoiObjs] = useState([])
  const [searchLoiQuery, setSearchLoiQuery] = useState('')
  const [editingUnit, setEditingUnit] = useState(null)

  // Copy Unit Modal States
  const [showCopyModal, setShowCopyModal] = useState(false)
  const [copySourceYear, setCopySourceYear] = useState('')
  const [copySourceClassId, setCopySourceClassId] = useState('')
  const [copySourceUnitId, setCopySourceUnitId] = useState('')
  const [submittingCopy, setSubmittingCopy] = useState(false)

  // Comment Builder Assistant State
  const [commentData, setCommentData] = useState({
    studentName: '',
    strengths: 'Demonstrates outstanding inquiry skills during unit discussions and collaborates effectively with peers.',
    growth: 'Encouraged to improve daily reflection journal organization and time management.',
    actionPlan: 'Provide guided reflection templates and weekly homeroom teacher check-ins.',
    selectedProfile: 'Inquirers'
  })

  // Fetch Master Data & Auto-select active Academic Year and PYP Classes (is_pyp === true)
  useEffect(() => {
    async function loadPypData() {
      setLoading(true)
      try {
        const [resYears, resUnits, resClasses, resSubjects, resPypUnits, resTopics] = await Promise.all([
          supabase.from('year').select('*').order('year_name', { ascending: false }),
          supabase.from('unit').select('*').eq('is_pyp', true).order('unit_name', { ascending: true }),
          supabase.from('kelas').select('*').order('kelas_nama', { ascending: true }),
          supabase.from('subject').select('*').order('subject_name', { ascending: true }),
          supabase.from('pyp_unit').select('*').or('is_deleted.eq.0,is_deleted.is.null').order('id', { ascending: true }),
          supabase.from('topic').select('*').order('topic_urutan', { ascending: true })
        ])

        // 1. Academic Years & Active Date Match
        if (resYears.data && resYears.data.length > 0) {
          setYears(resYears.data)

          const todayStr = new Date().toISOString().split('T')[0]
          
          const currentActiveYear = resYears.data.find(y => {
            if (!y.start_date || !y.end_date) return false
            return todayStr >= y.start_date && todayStr <= y.end_date
          })

          const targetYear = currentActiveYear || resYears.data[0]
          setSelectedYear(targetYear.year_name)
          setSelectedYearId(targetYear.year_id.toString())
        }

        // 2. Filter Classes strictly belonging to PYP Units (is_pyp === true)
        const pypUnitsListRaw = resUnits.data || []
        setUnits(pypUnitsListRaw)

        const pypUnitIdSet = new Set(pypUnitsListRaw.map(u => u.unit_id))
        const pypClassesList = (resClasses.data || []).filter(k => k.kelas_unit_id && pypUnitIdSet.has(k.kelas_unit_id))
        
        setPypClasses(pypClassesList)
        if (pypClassesList.length > 0) {
          setSelectedClassId(pypClassesList[0].kelas_id.toString())
        }

        if (resSubjects.data) setSubjects(resSubjects.data)

        // Combine dedicated `pyp_unit` items with fallback `topic` items
        let combinedPypUnits = []
        if (resPypUnits.data && resPypUnits.data.length > 0) {
          combinedPypUnits = resPypUnits.data.map(u => ({
            id: u.id,
            uniqueKey: `pyp-${u.id}`,
            title: u.title,
            centralIdea: u.central_idea,
            theme: u.theme,
            durationWeeks: u.duration_weeks,
            kelasId: u.kelas_id,
            yearName: u.year_name,
            status: u.status || 'published',
            isDedicated: true
          }))
        }
        
        if (resTopics.data && resTopics.data.length > 0) {
          const topicPypUnits = resTopics.data.map(t => ({
            id: t.topic_id,
            uniqueKey: `topic-${t.topic_id}`,
            title: t.topic_nama,
            centralIdea: t.topic_statement,
            theme: t.topic_global_context,
            durationWeeks: t.topic_duration,
            kelasId: t.topic_kelas_id,
            yearName: t.topic_year,
            status: t.topic_status || 'published',
            isDedicated: false
          }))
          combinedPypUnits = [...combinedPypUnits, ...topicPypUnits]
        }

        setPypUnitsList(combinedPypUnits)
      } catch (err) {
        console.error('Error fetching PYP data:', err)
      } finally {
        setLoading(false)
      }
    }

    async function fetchMasterListsAndPivots() {
      setLoadingMaster(true)
      try {
        const [resCi, resLoi, resAtls, resKc, resLoiPivots, resKcPivots, resAtlPivots] = await Promise.all([
          supabase.from('pyp_ci_list').select('*').or('is_deleted.eq.0,is_deleted.is.null').order('name', { ascending: true }),
          supabase.from('pyp_loi_list').select('*').or('is_deleted.eq.0,is_deleted.is.null').order('id', { ascending: true }),
          supabase.from('pyp_atls_list').select('*').or('is_deleted.eq.0,is_deleted.is.null').order('id', { ascending: true }),
          supabase.from('pyp_kc_list').select('*').or('is_deleted.eq.0,is_deleted.is.null').order('id', { ascending: true }),
          supabase.from('pyploiunit').select('*').or('is_deleted.eq.0,is_deleted.is.null'),
          supabase.from('pypkcunit').select('*').or('is_deleted.eq.0,is_deleted.is.null'),
          supabase.from('pypatlsunit').select('*').or('is_deleted.eq.0,is_deleted.is.null')
        ])

        if (resCi.data) setCiList(resCi.data)
        if (resLoi.data) setLoiList(resLoi.data)
        if (resAtls.data) setAtlsList(resAtls.data)
        if (resKc.data) setKcList(resKc.data)

        if (resLoiPivots.data) setLoiPivots(resLoiPivots.data)
        if (resKcPivots.data) setKcPivots(resKcPivots.data)
        if (resAtlPivots.data) setAtlPivots(resAtlPivots.data)
      } catch (err) {
        console.warn('PYP master lists or pivot tables notice:', err)
      } finally {
        setLoadingMaster(false)
      }
    }

    loadPypData()
    fetchMasterListsAndPivots()
  }, [])

  // Handle Academic Year selection change
  const handleYearChange = (yearName) => {
    setSelectedYear(yearName)
    const foundYear = years.find(y => y.year_name === yearName)
    if (foundYear) {
      setSelectedYearId(foundYear.year_id.toString())
    } else {
      setSelectedYearId('')
    }
  }

  // Filter PYP Units of Inquiry by Academic Year & Selected PYP Class
  const classTopics = useMemo(() => {
    return pypUnitsList.filter(t => {
      if (selectedYear && t.yearName && t.yearName !== selectedYear) return false
      if (selectedClassId && t.kelasId && t.kelasId.toString() !== selectedClassId) return false
      return true
    })
  }, [pypUnitsList, selectedYear, selectedClassId])

  // Get current active Class object
  const currentSelectedClassObj = useMemo(() => {
    return pypClasses.find(c => c.kelas_id.toString() === selectedClassId)
  }, [pypClasses, selectedClassId])

  // Central Idea Search Autocomplete Suggestions (Sorted A-Z strictly from Master DB)
  const filteredCiSuggestions = useMemo(() => {
    const query = (searchCiQuery || '').trim().toLowerCase()
    const sorted = [...ciList].sort((a, b) => (a.name || '').localeCompare(b.name || ''))
    if (!query) return sorted
    return sorted.filter(ci => (ci.name || '').toLowerCase().includes(query))
  }, [ciList, searchCiQuery])

  // Lines of Inquiry Search Autocomplete Suggestions (Multi-Select, Sorted A-Z strictly from Master DB)
  const filteredLoiSuggestions = useMemo(() => {
    const query = (searchLoiQuery || '').trim().toLowerCase()
    const sorted = [...loiList].sort((a, b) => (a.name || '').localeCompare(b.name || ''))
    if (!query) return sorted
    return sorted.filter(loi => (loi.name || '').toLowerCase().includes(query))
  }, [loiList, searchLoiQuery])

  // Filter available units for Copy Source Selection
  const sourceAvailableUnits = useMemo(() => {
    return pypUnitsList.filter(u => {
      const classMatch = u.kelasId?.toString() === copySourceClassId
      const yearMatch = copySourceYear ? u.yearName === copySourceYear : true
      return classMatch && yearMatch
    })
  }, [pypUnitsList, copySourceClassId, copySourceYear])

  // Open Copy Unit Modal
  const handleOpenCopyModal = () => {
    setCopySourceYear(selectedYear || (years[0]?.year_name || '2025/2026'))
    setCopySourceClassId(selectedClassId || (pypClasses[0]?.kelas_id?.toString() || ''))
    setCopySourceUnitId('')
    setShowCopyModal(true)
  }

  // Execute Unit Copy with all Pivot Relationships (LOIs, KCs, ATLs)
  const handleExecuteCopyUnit = async () => {
    if (!copySourceUnitId) {
      setNotif({
        isOpen: true,
        title: 'Select Unit',
        message: 'Please select a source unit to copy.',
        type: 'error'
      })
      return
    }

    const sourceUnit = pypUnitsList.find(u => u.id.toString() === copySourceUnitId)
    if (!sourceUnit) return

    setSubmittingCopy(true)
    try {
      let createdUnitId = null
      let isDedicated = false

      // 1. Insert new Unit into pyp_unit (or topic fallback) for target class & target year
      const pypUnitPayload = {
        title: sourceUnit.title,
        central_idea: sourceUnit.centralIdea,
        theme: sourceUnit.theme,
        duration_weeks: sourceUnit.durationWeeks || 6,
        kelas_id: selectedClassId ? parseInt(selectedClassId, 10) : null,
        year_name: selectedYear || '2025/2026',
        status: 'published'
      }

      const { data: newPypUnit } = await supabase.from('pyp_unit').insert([pypUnitPayload]).select()

      if (newPypUnit && newPypUnit[0]) {
        createdUnitId = newPypUnit[0].id
        isDedicated = true
      } else {
        const topicPayload = {
          topic_nama: sourceUnit.title,
          topic_statement: sourceUnit.centralIdea,
          topic_global_context: sourceUnit.theme,
          topic_duration: sourceUnit.durationWeeks || 6,
          topic_kelas_id: selectedClassId ? parseInt(selectedClassId, 10) : null,
          topic_year: selectedYear || '2025/2026',
          topic_status: 'published'
        }
        const { data: newTopicArr } = await supabase.from('topic').insert([topicPayload]).select()
        if (newTopicArr && newTopicArr[0]) {
          createdUnitId = newTopicArr[0].topic_id
        }
      }

      if (createdUnitId) {
        // 2. Copy LOI pivot relationships (pyploiunit)
        const sourceLois = loiPivots.filter(p => p.unitId === sourceUnit.id && (p.is_deleted === 0 || p.is_deleted === null))
        if (sourceLois.length > 0) {
          const loiInserts = sourceLois.map(p => ({
            "unitId": createdUnitId,
            "loiId": p.loiId,
            is_deleted: 0
          }))
          const { data: insertedLois } = await supabase.from('pyploiunit').insert(loiInserts).select()
          if (insertedLois) setLoiPivots(prev => [...prev, ...insertedLois])
        }

        // 3. Copy Key Concept pivot relationships (pypkcunit)
        const sourceKcs = kcPivots.filter(p => p.unitId === sourceUnit.id && (p.is_deleted === 0 || p.is_deleted === null))
        if (sourceKcs.length > 0) {
          const kcInserts = sourceKcs.map(p => ({
            "unitId": createdUnitId,
            "kcId": p.kcId,
            is_deleted: 0
          }))
          const { data: insertedKcs } = await supabase.from('pypkcunit').insert(kcInserts).select()
          if (insertedKcs) setKcPivots(prev => [...prev, ...insertedKcs])
        }

        // 4. Copy ATL Skills pivot relationships (pypatlsunit)
        const sourceAtls = atlPivots.filter(p => p.unitId === sourceUnit.id && (p.is_deleted === 0 || p.is_deleted === null))
        if (sourceAtls.length > 0) {
          const atlInserts = sourceAtls.map(p => ({
            "unitId": createdUnitId,
            "atlId": p.atlId,
            keterangan: p.keterangan || '',
            is_deleted: 0
          }))
          const { data: insertedAtls } = await supabase.from('pypatlsunit').insert(atlInserts).select()
          if (insertedAtls) setAtlPivots(prev => [...prev, ...insertedAtls])
        }

        const newDisplayUnit = {
          id: createdUnitId,
          uniqueKey: isDedicated ? `pyp-${createdUnitId}` : `topic-${createdUnitId}`,
          title: sourceUnit.title,
          centralIdea: sourceUnit.centralIdea,
          theme: sourceUnit.theme,
          durationWeeks: sourceUnit.durationWeeks || 6,
          kelasId: selectedClassId ? parseInt(selectedClassId, 10) : null,
          yearName: selectedYear || '2025/2026',
          status: 'published',
          isDedicated: isDedicated
        }

        setPypUnitsList(prev => [...prev, newDisplayUnit])
      }

      setShowCopyModal(false)
      setNotif({
        isOpen: true,
        title: 'Unit Copied',
        message: `Successfully copied "${sourceUnit.title}" to ${currentSelectedClassObj?.kelas_nama || 'Class'} (${selectedYear || '2025/2026'}). All LOIs, Key Concepts, and ATL Skills have been replicated.`,
        type: 'success'
      })
    } catch (err) {
      console.error('Error copying unit:', err)
      setNotif({
        isOpen: true,
        title: 'Copy Failed',
        message: err.message || 'An error occurred while copying the unit.',
        type: 'error'
      })
    } finally {
      setSubmittingCopy(false)
    }
  }

  // Open New Class Unit Creation Wizard Modal
  const handleOpenClassUnitModal = () => {
    setEditingUnit(null)
    setWizardStep(1)
    setUnitFormData({
      title: '',
      centralIdea: '',
      theme: 'Who We Are',
      duration: '6'
    })
    setSelectedLoiIds([])
    setSelectedLoiObjs([])
    setSearchLoiQuery('')
    setShowLoiSuggestions(false)
    setSelectedKcIds([])
    setKcNotes({})
    setSelectedAtlIds([])
    setAtlNotes({})
    setSelectedCiObj(null)
    setSearchCiQuery('')
    setShowCiSuggestions(false)
    setShowClassUnitModal(true)
  }

  // Open Unit Editing Wizard Modal
  const handleEditClassUnit = (t) => {
    setEditingUnit(t)
    setWizardStep(1)
    setUnitFormData({
      title: t.title || '',
      centralIdea: t.centralIdea || '',
      theme: t.theme || 'Who We Are',
      duration: t.durationWeeks ? t.durationWeeks.toString() : '6'
    })

    // Match Central Idea object from ciList
    const foundCi = ciList.find(ci => ci.name === t.centralIdea)
    setSelectedCiObj(foundCi || { id: null, name: t.centralIdea })
    setSearchCiQuery(t.centralIdea || '')
    setShowCiSuggestions(false)

    // Match Lines of Inquiry pivots
    const linkedLoiRows = loiPivots.filter(p => p.unitId === t.id && (p.is_deleted === 0 || p.is_deleted === null))
    const loiIds = linkedLoiRows.map(p => Number(p.loiId))
    const linkedLoiObjs = loiList.filter(loi => loiIds.includes(loi.id))
    setSelectedLoiIds(loiIds)
    setSelectedLoiObjs(linkedLoiObjs)
    setSearchLoiQuery('')
    setShowLoiSuggestions(false)

    // Match Key Concepts pivots & notes
    const linkedKcRows = kcPivots.filter(p => p.unitId === t.id && (p.is_deleted === 0 || p.is_deleted === null))
    const kcIds = linkedKcRows.map(p => Number(p.kcId))
    const kcNotesMap = {}
    linkedKcRows.forEach(p => {
      kcNotesMap[Number(p.kcId)] = p.keterangan || ''
    })
    setSelectedKcIds(kcIds)
    setKcNotes(kcNotesMap)

    // Match ATL Skills pivots
    const linkedAtlRows = atlPivots.filter(p => p.unitId === t.id && (p.is_deleted === 0 || p.is_deleted === null))
    const atlIds = linkedAtlRows.map(p => Number(p.atlId))
    const notesMap = {}
    linkedAtlRows.forEach(p => {
      notesMap[Number(p.atlId)] = p.keterangan || ''
    })
    setSelectedAtlIds(atlIds)
    setAtlNotes(notesMap)

    setShowClassUnitModal(true)
  }

  // Toggle Checkbox Helpers
  const toggleLoiSelection = (id) => {
    setSelectedLoiIds(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id])
  }

  const toggleKcSelection = (id) => {
    setSelectedKcIds(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id])
  }

  const toggleAtlSelection = (id) => {
    setSelectedAtlIds(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id])
  }

  // Save Complete Unit & Pivot Relationships to Database (Dedicated `pyp_unit` table first, with `topic` fallback)
  const handleSaveClassUnitWithPivots = async () => {
    if (!unitFormData.title.trim()) {
      setNotif({
        isOpen: true,
        title: 'Required Field Missing',
        message: 'Please provide a Unit Title.',
        type: 'error'
      })
      setWizardStep(1)
      return
    }

    if (!selectedCiObj) {
      setNotif({
        isOpen: true,
        title: 'Central Idea Required',
        message: 'Please select a Central Idea from the list.',
        type: 'error'
      })
      setWizardStep(1)
      return
    }

    if (selectedLoiIds.length === 0) {
      setNotif({
        isOpen: true,
        title: 'Lines of Inquiry Required',
        message: 'Please select at least 1 Line of Inquiry.',
        type: 'error'
      })
      setWizardStep(2)
      return
    }

    if (selectedKcIds.length === 0) {
      setNotif({
        isOpen: true,
        title: 'Key Concepts Required',
        message: 'Please select at least 1 Key Concept.',
        type: 'error'
      })
      setWizardStep(3)
      return
    }

    if (selectedAtlIds.length === 0) {
      setNotif({
        isOpen: true,
        title: 'ATL Skills Required',
        message: 'Please select at least 1 ATL Skill.',
        type: 'error'
      })
      setWizardStep(4)
      return
    }

    setSubmittingUnit(true)
    try {
      let unitIdToUse = null
      let isDedicated = false

      if (editingUnit) {
        unitIdToUse = editingUnit.id
        isDedicated = editingUnit.isDedicated

        if (isDedicated) {
          const pypUnitPayload = {
            title: unitFormData.title.trim(),
            central_idea: unitFormData.centralIdea.trim(),
            theme: unitFormData.theme,
            duration_weeks: parseInt(unitFormData.duration, 10) || 6,
            kelas_id: selectedClassId ? parseInt(selectedClassId, 10) : null,
            year_name: selectedYear || '2025/2026'
          }
          await supabase.from('pyp_unit').update(pypUnitPayload).eq('id', unitIdToUse)
        } else {
          const topicPayload = {
            topic_nama: unitFormData.title.trim(),
            topic_statement: unitFormData.centralIdea.trim(),
            topic_global_context: unitFormData.theme,
            topic_duration: parseInt(unitFormData.duration, 10) || 6,
            topic_kelas_id: selectedClassId ? parseInt(selectedClassId, 10) : null,
            topic_year: selectedYear || '2025/2026'
          }
          await supabase.from('topic').update(topicPayload).eq('topic_id', unitIdToUse)
        }

        // Clean old pivots for unitIdToUse before re-inserting updated ones
        await Promise.all([
          supabase.from('pyploiunit').delete().eq('unitId', unitIdToUse),
          supabase.from('pypkcunit').delete().eq('unitId', unitIdToUse),
          supabase.from('pypatlsunit').delete().eq('unitId', unitIdToUse)
        ])

        setLoiPivots(prev => prev.filter(p => p.unitId !== unitIdToUse))
        setKcPivots(prev => prev.filter(p => p.unitId !== unitIdToUse))
        setAtlPivots(prev => prev.filter(p => p.unitId !== unitIdToUse))
      } else {
        // Create new Unit
        const pypUnitPayload = {
          title: unitFormData.title.trim(),
          central_idea: unitFormData.centralIdea.trim(),
          theme: unitFormData.theme,
          duration_weeks: parseInt(unitFormData.duration, 10) || 6,
          kelas_id: selectedClassId ? parseInt(selectedClassId, 10) : null,
          year_name: selectedYear || '2025/2026',
          status: 'published'
        }

        const { data: newPypUnit } = await supabase.from('pyp_unit').insert([pypUnitPayload]).select()

        if (newPypUnit && newPypUnit[0]) {
          unitIdToUse = newPypUnit[0].id
          isDedicated = true
        } else {
          const topicPayload = {
            topic_nama: unitFormData.title.trim(),
            topic_statement: unitFormData.centralIdea.trim(),
            topic_global_context: unitFormData.theme,
            topic_duration: parseInt(unitFormData.duration, 10) || 6,
            topic_kelas_id: selectedClassId ? parseInt(selectedClassId, 10) : null,
            topic_year: selectedYear || '2025/2026',
            topic_status: 'published'
          }
          const { data: newTopicArr } = await supabase.from('topic').insert([topicPayload]).select()
          if (newTopicArr && newTopicArr[0]) {
            unitIdToUse = newTopicArr[0].topic_id
          }
        }
      }

      if (unitIdToUse) {
        // Save Selected Lines of Inquiry into pyploiunit
        if (selectedLoiIds.length > 0) {
          const loiInserts = selectedLoiIds.map(loiId => ({
            "unitId": Number(unitIdToUse),
            "loiId": Number(loiId),
            is_deleted: 0
          }))
          const { data: insertedLois, error: loiErr } = await supabase.from('pyploiunit').insert(loiInserts).select()
          if (loiErr) console.error('Error inserting pyploiunit:', loiErr)
          if (insertedLois) setLoiPivots(prev => [...prev, ...insertedLois])
        }

        // Save Selected Key Concepts into pypkcunit
        if (selectedKcIds.length > 0) {
          const kcInserts = selectedKcIds.map(kcId => ({
            "unitId": Number(unitIdToUse),
            "kcId": Number(kcId),
            is_deleted: 0
          }))
          const { data: insertedKcs, error: kcErr } = await supabase.from('pypkcunit').insert(kcInserts).select()
          if (kcErr) console.error('Error inserting pypkcunit:', kcErr)
          if (insertedKcs) setKcPivots(prev => [...prev, ...insertedKcs])
        }

        // Save Selected ATL Skills & Notes into pypatlsunit
        if (selectedAtlIds.length > 0) {
          const atlInserts = selectedAtlIds.map(atlId => ({
            "unitId": Number(unitIdToUse),
            "atlId": Number(atlId),
            keterangan: atlNotes[atlId] || '',
            is_deleted: 0
          }))
          const { data: insertedAtls, error: atlErr } = await supabase.from('pypatlsunit').insert(atlInserts).select()
          if (atlErr) console.error('Error inserting pypatlsunit:', atlErr)
          if (insertedAtls) setAtlPivots(prev => [...prev, ...insertedAtls])
        }

        const updatedDisplayUnit = {
          id: unitIdToUse,
          uniqueKey: isDedicated ? `pyp-${unitIdToUse}` : `topic-${unitIdToUse}`,
          title: unitFormData.title.trim(),
          centralIdea: unitFormData.centralIdea.trim(),
          theme: unitFormData.theme,
          durationWeeks: parseInt(unitFormData.duration, 10) || 6,
          kelasId: selectedClassId ? parseInt(selectedClassId, 10) : null,
          yearName: selectedYear || '2025/2026',
          status: 'published',
          isDedicated: isDedicated
        }

        if (editingUnit) {
          setPypUnitsList(prev => prev.map(u => u.id === unitIdToUse ? updatedDisplayUnit : u))
        } else {
          setPypUnitsList(prev => [...prev, updatedDisplayUnit])
        }
      }

      setShowClassUnitModal(false)
      setNotif({
        isOpen: true,
        title: editingUnit ? 'Unit Updated' : 'Unit Created',
        message: editingUnit ? `Unit "${unitFormData.title}" updated successfully.` : `Created Unit "${unitFormData.title}" for ${currentSelectedClassObj?.kelas_nama || 'Class'}.`,
        type: 'success'
      })
    } catch (err) {
      console.error('Error saving class unit:', err)
      setNotif({
        isOpen: true,
        title: 'Save Failed',
        message: err.message || 'An error occurred while saving the unit.',
        type: 'error'
      })
    } finally {
      setSubmittingUnit(false)
    }
  }

  // Open Master Item Modal (Create or Edit)
  const handleOpenMasterModal = (itemToEdit = null) => {
    setEditingItem(itemToEdit)
    if (itemToEdit) {
      setMasterFormData({
        name: itemToEdit.name || '',
        key: itemToEdit.key || '',
        question: itemToEdit.question || '',
        definition: itemToEdit.definition || ''
      })
    } else {
      setMasterFormData({ name: '', key: '', question: '', definition: '' })
    }
    setShowMasterModal(true)
  }

  // Save Master List Item directly to Supabase
  const handleSaveMasterItem = async (e) => {
    e.preventDefault()
    let tableName = 'pyp_ci_list'
    if (masterSubTab === 'loi') tableName = 'pyp_loi_list'
    if (masterSubTab === 'atls') tableName = 'pyp_atls_list'
    if (masterSubTab === 'kc') tableName = 'pyp_kc_list'

    try {
      if (masterSubTab === 'kc') {
        if (!masterFormData.key.trim()) return
        const payload = {
          key: masterFormData.key.trim(),
          question: masterFormData.question.trim(),
          definition: masterFormData.definition.trim()
        }

        if (editingItem) {
          const { error } = await supabase.from(tableName).update(payload).eq('id', editingItem.id)
          if (error) throw error
          
          setKcList(prev => prev.map(item => item.id === editingItem.id ? { ...item, ...payload } : item))
        } else {
          const { data, error } = await supabase.from(tableName).insert([payload]).select()
          if (error) throw error
          
          if (data && data[0]) {
            setKcList(prev => [...prev, data[0]])
          }
        }
      } else {
        if (!masterFormData.name.trim()) return
        const payload = { name: masterFormData.name.trim() }

        if (editingItem) {
          const { error } = await supabase.from(tableName).update(payload).eq('id', editingItem.id)
          if (error) throw error

          const updateState = (prev) => prev.map(item => item.id === editingItem.id ? { ...item, ...payload } : item)
          if (masterSubTab === 'ci') setCiList(updateState)
          if (masterSubTab === 'loi') setLoiList(updateState)
          if (masterSubTab === 'atls') setAtlsList(updateState)
        } else {
          const { data, error } = await supabase.from(tableName).insert([payload]).select()
          if (error) throw error

          if (data && data[0]) {
            const newObj = data[0]
            if (masterSubTab === 'ci') setCiList(prev => [...prev, newObj])
            if (masterSubTab === 'loi') setLoiList(prev => [...prev, newObj])
            if (masterSubTab === 'atls') setAtlsList(prev => [...prev, newObj])
          }
        }
      }

      setShowMasterModal(false)
      setNotif({
        isOpen: true,
        title: editingItem ? 'Item Updated' : 'Item Added',
        message: `Successfully saved item in database.`,
        type: 'success'
      })
    } catch (err) {
      console.error('Save master item error:', err)
      setNotif({
        isOpen: true,
        title: 'Save Failed',
        message: err.message || 'Could not save item to database.',
        type: 'error'
      })
    }
  }

  // Delete Master Item from Supabase
  const handleDeleteMasterItem = async (id) => {
    let tableName = 'pyp_ci_list'
    if (masterSubTab === 'loi') tableName = 'pyp_loi_list'
    if (masterSubTab === 'atls') tableName = 'pyp_atls_list'
    if (masterSubTab === 'kc') tableName = 'pyp_kc_list'

    try {
      const { error } = await supabase.from(tableName).update({ is_deleted: 1 }).eq('id', id)
      if (error) throw error
      
      const filterState = (prev) => prev.filter(item => item.id !== id)
      if (masterSubTab === 'ci') setCiList(filterState)
      if (masterSubTab === 'loi') setLoiList(filterState)
      if (masterSubTab === 'atls') setAtlsList(filterState)
      if (masterSubTab === 'kc') setKcList(filterState)

      setNotif({
        isOpen: true,
        title: 'Item Deleted',
        message: 'Master item removed successfully.',
        type: 'success'
      })
    } catch (err) {
      console.error('Delete error:', err)
      setNotif({
        isOpen: true,
        title: 'Delete Failed',
        message: err.message || 'Could not delete item.',
        type: 'error'
      })
    }
  }

  // Minimalist UI styling tokens
  const pageBg = isDark ? '#09090B' : '#FBFBFA'
  const cardBg = isDark ? '#18181B' : '#FFFFFF'
  const borderColor = isDark ? '#27272A' : '#EAEAEA'
  const textPrimary = isDark ? '#F4F4F5' : '#111111'
  const textSecondary = isDark ? '#A1A1AA' : '#787774'

  const inputStyle = {
    background: isDark ? '#27272A' : '#FFFFFF',
    border: `1px solid ${borderColor}`,
    color: textPrimary,
    borderRadius: '8px',
    fontSize: '13px'
  }

  const selectStyle = {
    background: isDark ? '#27272A' : '#FFFFFF',
    border: `1px solid ${borderColor}`,
    color: textPrimary,
    borderRadius: '8px',
    fontSize: '13px',
    padding: '8px 12px'
  }

  return (
    <div style={{ background: pageBg, minHeight: '100vh', padding: '32px 24px', color: textPrimary, fontFamily: "'Geist Sans', 'SF Pro Display', system-ui, -apple-system, sans-serif" }}>
      
      {/* ------------------------------------------------------------- */}
      {/* HEADER SECTION */}
      {/* ------------------------------------------------------------- */}
      <div style={{ maxWidth: '1200px', margin: '0 auto 32px auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: '9999px', background: isDark ? 'rgba(59, 130, 246, 0.15)' : '#E1F3FE', color: isDark ? '#60A5FA' : '#1F6C9F', fontSize: '11px', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '8px' }}>
              <FontAwesomeIcon icon={faGraduationCap} style={{ fontSize: '10px' }} />
              Primary Years Programme (PYP)
            </div>
            <h1 style={{ fontSize: '28px', fontWeight: 700, margin: 0, letterSpacing: '-0.02em', color: textPrimary }}>
              PYP Curriculum Framework
            </h1>
            <p style={{ margin: '6px 0 0 0', color: textSecondary, fontSize: '14px', lineHeight: 1.5 }}>
              Manage Master Templates, Class Units, Approaches to Learning, Subject Strands, and Teacher Comments.
            </p>
          </div>

          <Button
            onClick={() => handleOpenClassUnitModal()}
            style={{
              background: textPrimary,
              color: isDark ? '#09090B' : '#FFFFFF',
              border: 'none',
              borderRadius: '6px',
              fontWeight: 600,
              fontSize: '13px',
              padding: '10px 16px',
              boxShadow: 'none'
            }}
          >
            <FontAwesomeIcon icon={faPlus} style={{ marginRight: '8px' }} />
            New Unit for Class
          </Button>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* ACADEMIC YEAR FILTER BAR ONLY */}
        {/* ------------------------------------------------------------- */}
        <div style={{ background: cardBg, border: `1px solid ${borderColor}`, borderRadius: '10px', padding: '16px', marginBottom: '24px' }}>
          <div style={{ maxWidth: '300px' }}>
            <Label style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: textSecondary, marginBottom: '6px', display: 'block' }}>
              Academic Year
            </Label>
            <select
              value={selectedYear}
              onChange={e => handleYearChange(e.target.value)}
              style={{ ...selectStyle, width: '100%' }}
            >
              <option value="">Select Academic Year</option>
              {years.map(y => (
                <option key={y.year_id} value={y.year_name}>{y.year_name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* TABS NAVIGATION (5 EXACT REQUESTED TABS) */}
        {/* ------------------------------------------------------------- */}
        <div style={{ display: 'flex', borderBottom: `1px solid ${borderColor}`, marginBottom: '24px', gap: '24px', flexWrap: 'wrap' }}>
          
          {/* TAB 1: Master Templates */}
          <button
            onClick={() => setActiveTab('templates')}
            style={{
              padding: '12px 0',
              fontSize: '14px',
              fontWeight: activeTab === 'templates' ? 600 : 400,
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              color: activeTab === 'templates' ? textPrimary : textSecondary,
              borderBottom: activeTab === 'templates' ? `2px solid ${textPrimary}` : '2px solid transparent',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.15s ease'
            }}
          >
            <FontAwesomeIcon icon={faCopy} style={{ fontSize: '13px' }} />
            Master Templates
          </button>

          {/* TAB 2: Class */}
          <button
            onClick={() => setActiveTab('poi')}
            style={{
              padding: '12px 0',
              fontSize: '14px',
              fontWeight: activeTab === 'poi' ? 600 : 400,
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              color: activeTab === 'poi' ? textPrimary : textSecondary,
              borderBottom: activeTab === 'poi' ? `2px solid ${textPrimary}` : '2px solid transparent',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.15s ease'
            }}
          >
            <FontAwesomeIcon icon={faChalkboardUser} style={{ fontSize: '13px' }} />
            Class ({pypClasses.length})
          </button>



          {/* TAB 5: Teacher's Comment */}
          <button
            onClick={() => setActiveTab('comment')}
            style={{
              padding: '12px 0',
              fontSize: '14px',
              fontWeight: activeTab === 'comment' ? 600 : 400,
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              color: activeTab === 'comment' ? textPrimary : textSecondary,
              borderBottom: activeTab === 'comment' ? `2px solid ${textPrimary}` : '2px solid transparent',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.15s ease'
            }}
          >
            <FontAwesomeIcon icon={faComments} style={{ fontSize: '13px' }} />
            Teacher's Comment
          </button>

        </div>

        {/* ------------------------------------------------------------- */}
        {/* TAB 1: MASTER DATA LISTS (DB STRICT) */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'templates' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            <div style={{ background: cardBg, border: `1px solid ${borderColor}`, borderRadius: '10px', padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 4px 0', color: textPrimary }}>
                    PYP Master Curriculum Library
                  </h3>
                  <p style={{ fontSize: '13px', color: textSecondary, margin: 0 }}>
                    Manage master lists directly from the database for Central Ideas, Lines of Inquiry, Approaches to Learning, and Key Concepts.
                  </p>
                </div>

                <Button
                  onClick={() => handleOpenMasterModal()}
                  style={{
                    background: textPrimary,
                    color: isDark ? '#09090B' : '#FFFFFF',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 600,
                    padding: '8px 14px'
                  }}
                >
                  <FontAwesomeIcon icon={faPlus} style={{ marginRight: '6px' }} />
                  Add {masterSubTab === 'ci' ? 'Central Idea' : masterSubTab === 'loi' ? 'Line of Inquiry' : masterSubTab === 'atls' ? 'ATL Skill' : 'Key Concept'}
                </Button>
              </div>

              {/* Master Data Sub-Nav Pills & Search Bar */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', gap: '8px', background: isDark ? '#27272A' : '#F4F4F5', padding: '4px', borderRadius: '8px', overflowX: 'auto' }}>
                  <button
                    onClick={() => handleMasterSubTabChange('ci')}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      fontSize: '13px',
                      fontWeight: masterSubTab === 'ci' ? 600 : 400,
                      border: 'none',
                      borderRadius: '6px',
                      background: masterSubTab === 'ci' ? cardBg : 'transparent',
                      color: masterSubTab === 'ci' ? textPrimary : textSecondary,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      boxShadow: masterSubTab === 'ci' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    1. Central Ideas ({ciList.length})
                  </button>

                  <button
                    onClick={() => handleMasterSubTabChange('loi')}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      fontSize: '13px',
                      fontWeight: masterSubTab === 'loi' ? 600 : 400,
                      border: 'none',
                      borderRadius: '6px',
                      background: masterSubTab === 'loi' ? cardBg : 'transparent',
                      color: masterSubTab === 'loi' ? textPrimary : textSecondary,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      boxShadow: masterSubTab === 'loi' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    2. Lines of Inquiry ({loiList.length})
                  </button>

                  <button
                    onClick={() => handleMasterSubTabChange('atls')}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      fontSize: '13px',
                      fontWeight: masterSubTab === 'atls' ? 600 : 400,
                      border: 'none',
                      borderRadius: '6px',
                      background: masterSubTab === 'atls' ? cardBg : 'transparent',
                      color: masterSubTab === 'atls' ? textPrimary : textSecondary,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      boxShadow: masterSubTab === 'atls' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    3. Approaches to Learning ({atlsList.length})
                  </button>

                  <button
                    onClick={() => handleMasterSubTabChange('kc')}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      fontSize: '13px',
                      fontWeight: masterSubTab === 'kc' ? 600 : 400,
                      border: 'none',
                      borderRadius: '6px',
                      background: masterSubTab === 'kc' ? cardBg : 'transparent',
                      color: masterSubTab === 'kc' ? textPrimary : textSecondary,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      boxShadow: masterSubTab === 'kc' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    4. Key Concepts ({kcList.length})
                  </button>
                </div>

                {/* Search Bar Input */}
                <div style={{ position: 'relative', width: '100%' }}>
                  <FontAwesomeIcon icon={faSearch} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: textSecondary, fontSize: '13px' }} />
                  <Input
                    type="text"
                    placeholder={`Search ${masterSubTab === 'ci' ? 'Central Ideas' : masterSubTab === 'loi' ? 'Lines of Inquiry' : masterSubTab === 'atls' ? 'ATL Skills' : 'Key Concepts'}...`}
                    value={masterSearchQuery}
                    onChange={e => {
                      setMasterSearchQuery(e.target.value)
                      setMasterPage(1)
                    }}
                    style={{ ...inputStyle, paddingLeft: '34px', paddingRight: masterSearchQuery ? '32px' : '12px', fontSize: '13px' }}
                  />
                  {masterSearchQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setMasterSearchQuery('')
                        setMasterPage(1)
                      }}
                      style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: textSecondary, cursor: 'pointer', fontSize: '12px' }}
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              {/* Master Data Items Display (STRICT DATABASE DATA) */}
              {loadingMaster ? (
                <div style={{ padding: '36px', textAlign: 'center', color: textSecondary }}>
                  <FontAwesomeIcon icon={faSpinner} spin style={{ fontSize: '18px', marginBottom: '8px' }} />
                  <p style={{ margin: 0, fontSize: '13px' }}>Loading master data from database...</p>
                </div>
              ) : filteredMasterList.length === 0 ? (
                <div style={{ border: `1px dashed ${borderColor}`, borderRadius: '8px', padding: '36px', textAlign: 'center' }}>
                  <FontAwesomeIcon icon={faInbox} style={{ fontSize: '24px', color: textSecondary, marginBottom: '8px' }} />
                  <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: textSecondary }}>
                    {masterSearchQuery ? `No matching items found for "${masterSearchQuery}".` : 'No items found in database.'}
                  </p>
                  {!masterSearchQuery && (
                    <Button onClick={() => handleOpenMasterModal()} style={{ background: textPrimary, color: isDark ? '#09090B' : '#FFFFFF', fontSize: '12px', padding: '6px 14px' }}>
                      <FontAwesomeIcon icon={faPlus} style={{ marginRight: '6px' }} /> Add Item
                    </Button>
                  )}
                </div>
              ) : (
                <div>
                  {masterSubTab === 'kc' ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '14px' }}>
                      {paginatedMasterList.map((item, index) => {
                        const globalIdx = (masterPage - 1) * MASTER_ITEMS_PER_PAGE + index + 1
                        return (
                          <div key={item.id || index} style={{ background: isDark ? '#27272A' : '#FBFBFA', border: `1px solid ${borderColor}`, borderRadius: '8px', padding: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                            <div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                <span style={{ fontSize: '12px', fontWeight: 700, padding: '3px 8px', borderRadius: '4px', background: isDark ? 'rgba(59, 130, 246, 0.15)' : '#E1F3FE', color: isDark ? '#60A5FA' : '#1F6C9F', fontFamily: 'monospace' }}>
                                  #{globalIdx} {item.key}
                                </span>
                                <div style={{ display: 'flex', gap: '6px' }}>
                                  <button onClick={() => handleOpenMasterModal(item)} style={{ background: 'none', border: 'none', color: textSecondary, cursor: 'pointer', padding: '2px' }}>
                                    <FontAwesomeIcon icon={faEdit} style={{ fontSize: '12px' }} />
                                  </button>
                                  <button onClick={() => handleDeleteMasterItem(item.id)} style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', padding: '2px' }}>
                                    <FontAwesomeIcon icon={faTrash} style={{ fontSize: '12px' }} />
                                  </button>
                                </div>
                              </div>

                              {item.question && (
                                <div style={{ fontSize: '12px', fontWeight: 600, color: textPrimary, marginBottom: '6px' }}>
                                  Question: &ldquo;{item.question}&rdquo;
                                </div>
                              )}

                              {item.definition && (
                                <p style={{ fontSize: '12px', color: textSecondary, margin: 0, lineHeight: 1.5 }}>
                                  {item.definition}
                                </p>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {paginatedMasterList.map((item, index) => {
                        const globalIdx = (masterPage - 1) * MASTER_ITEMS_PER_PAGE + index + 1
                        return (
                          <div key={item.id || index} style={{ background: isDark ? '#27272A' : '#FBFBFA', border: `1px solid ${borderColor}`, borderRadius: '8px', padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <span style={{ width: '26px', height: '26px', borderRadius: '50%', background: isDark ? '#3F3F46' : '#E5E5E5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 600, color: textSecondary, flexShrink: 0 }}>
                                {globalIdx}
                              </span>
                              <span style={{ fontSize: '13px', color: textPrimary, lineHeight: 1.5 }}>
                                {item.name}
                              </span>
                            </div>

                            <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                              <button onClick={() => handleOpenMasterModal(item)} style={{ background: 'none', border: 'none', color: textSecondary, cursor: 'pointer', padding: '4px' }}>
                                <FontAwesomeIcon icon={faEdit} style={{ fontSize: '12px' }} />
                              </button>
                              <button onClick={() => handleDeleteMasterItem(item.id)} style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', padding: '4px' }}>
                                <FontAwesomeIcon icon={faTrash} style={{ fontSize: '12px' }} />
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* PAGINATION FOOTER BAR */}
                  {filteredMasterList.length > MASTER_ITEMS_PER_PAGE && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', paddingTop: '16px', borderTop: `1px solid ${borderColor}`, flexWrap: 'wrap', gap: '12px' }}>
                      <div style={{ fontSize: '12px', color: textSecondary }}>
                        Showing <strong>{Math.min((masterPage - 1) * MASTER_ITEMS_PER_PAGE + 1, filteredMasterList.length)}–{Math.min(masterPage * MASTER_ITEMS_PER_PAGE, filteredMasterList.length)}</strong> of <strong>{filteredMasterList.length}</strong> items
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Button
                          type="button"
                          disabled={masterPage === 1}
                          onClick={() => setMasterPage(prev => Math.max(prev - 1, 1))}
                          style={{ background: 'none', border: `1px solid ${borderColor}`, color: textPrimary, fontSize: '12px', padding: '6px 12px', height: '32px' }}
                        >
                          <FontAwesomeIcon icon={faChevronLeft} style={{ marginRight: '4px' }} /> Prev
                        </Button>

                        {Array.from({ length: totalMasterPages }, (_, i) => i + 1).map(pNum => (
                          <button
                            key={pNum}
                            onClick={() => setMasterPage(pNum)}
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '6px',
                              border: `1px solid ${pNum === masterPage ? textPrimary : borderColor}`,
                              background: pNum === masterPage ? textPrimary : 'transparent',
                              color: pNum === masterPage ? (isDark ? '#09090B' : '#FFFFFF') : textPrimary,
                              fontWeight: pNum === masterPage ? 700 : 400,
                              fontSize: '12px',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            {pNum}
                          </button>
                        ))}

                        <Button
                          type="button"
                          disabled={masterPage >= totalMasterPages}
                          onClick={() => setMasterPage(prev => Math.min(prev + 1, totalMasterPages))}
                          style={{ background: 'none', border: `1px solid ${borderColor}`, color: textPrimary, fontSize: '12px', padding: '6px 12px', height: '32px' }}
                        >
                          Next <FontAwesomeIcon icon={faChevronRight} style={{ marginLeft: '4px' }} />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 2: CLASS (FILTERED STRICTLY BY is_pyp === true) */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'poi' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* PYP Class Selector Bar */}
            <div style={{ background: cardBg, border: `1px solid ${borderColor}`, borderRadius: '10px', padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 4px 0', color: textPrimary }}>
                    PYP School Classes
                  </h3>
                  <p style={{ fontSize: '13px', color: textSecondary, margin: 0 }}>
                    Select a PYP Class to manage its Units of Inquiry.
                  </p>
                </div>

              </div>

              {/* Horizontal Scrollable Class Pills */}
              {pypClasses.length === 0 ? (
                <div style={{ border: `1px dashed ${borderColor}`, borderRadius: '8px', padding: '24px', textAlign: 'center', color: textSecondary, fontSize: '13px' }}>
                  No PYP classes found.
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '4px' }}>
                  {pypClasses.map(cls => {
                    const isSelected = selectedClassId === cls.kelas_id.toString()
                    return (
                      <button
                        key={cls.kelas_id}
                        onClick={() => setSelectedClassId(cls.kelas_id.toString())}
                        style={{
                          padding: '10px 16px',
                          borderRadius: '8px',
                          fontSize: '13px',
                          fontWeight: isSelected ? 600 : 400,
                          border: `1px solid ${isSelected ? textPrimary : borderColor}`,
                          background: isSelected ? (isDark ? '#27272A' : '#F4F4F5') : cardBg,
                          color: isSelected ? textPrimary : textSecondary,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          whiteSpace: 'nowrap',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <FontAwesomeIcon icon={faChalkboardUser} style={{ fontSize: '12px', color: isSelected ? textPrimary : textSecondary }} />
                        {cls.kelas_nama}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Units Display for Selected PYP Class */}
            {selectedClassId && (
              <div style={{ background: cardBg, border: `1px solid ${borderColor}`, borderRadius: '10px', padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0, color: textPrimary }}>
                    Units of Inquiry for {currentSelectedClassObj?.kelas_nama} ({classTopics.length})
                  </h3>
                  <span style={{ fontSize: '12px', color: textSecondary }}>
                    Academic Year: {selectedYear || 'All'}
                  </span>
                </div>

                {loading ? (
                  <div style={{ padding: '48px', textAlign: 'center', color: textSecondary }}>
                    <FontAwesomeIcon icon={faSpinner} spin style={{ fontSize: '20px', marginBottom: '12px' }} />
                    <p style={{ margin: 0, fontSize: '13px' }}>Loading class units...</p>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
                    
                    {/* SINGLE COMBINED ACTION CARD: CREATE & COPY UNIT */}
                    <div
                      style={{
                        background: isDark ? 'rgba(39, 39, 42, 0.4)' : '#FAF9F5',
                        border: `2px dashed ${borderColor}`,
                        borderRadius: '10px',
                        padding: '24px 20px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        textAlign: 'center',
                        minHeight: '220px',
                        gap: '16px'
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                        <h4 style={{ fontSize: '15px', fontWeight: 600, margin: 0, color: textPrimary }}>
                          Manage Class Units
                        </h4>
                        <p style={{ fontSize: '12px', color: textSecondary, margin: 0, lineHeight: 1.3, maxWidth: '220px' }}>
                          Create a new Unit of Inquiry or duplicate an existing one.
                        </p>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', maxWidth: '240px' }}>
                        <Button
                          onClick={handleOpenClassUnitModal}
                          style={{
                            width: '100%',
                            background: textPrimary,
                            color: isDark ? '#09090B' : '#FFFFFF',
                            border: 'none',
                            borderRadius: '6px',
                            fontWeight: 600,
                            fontSize: '13px',
                            padding: '9px 14px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px'
                          }}
                        >
                          <FontAwesomeIcon icon={faPlus} />
                          Create New Unit
                        </Button>

                        <Button
                          onClick={handleOpenCopyModal}
                          style={{
                            width: '100%',
                            background: cardBg,
                            border: `1px solid ${borderColor}`,
                            color: textPrimary,
                            borderRadius: '6px',
                            fontWeight: 600,
                            fontSize: '12px',
                            padding: '8px 14px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px'
                          }}
                        >
                          <FontAwesomeIcon icon={faCopy} />
                          Copy Unit
                        </Button>
                      </div>
                    </div>

                    {/* EXISTING CREATED UNIT CARDS */}
                    {classTopics.map(t => {
                      // Find linked pivot LOIs, Key Concepts, and ATLs for this topic
                      const linkedLois = loiPivots.filter(p => p.unitId === t.id)
                      const linkedKcs = kcPivots.filter(p => p.unitId === t.id)
                      const linkedAtls = atlPivots.filter(p => p.unitId === t.id)

                      return (
                        <div
                          key={t.uniqueKey || `${t.isDedicated ? 'pyp' : 'topic'}-${t.id}`}
                          onClick={() => handleEditClassUnit(t)}
                          style={{
                            background: isDark ? '#27272A' : '#FBFBFA',
                            border: `1px solid ${borderColor}`,
                            borderRadius: '10px',
                            padding: '20px',
                            display: 'flex',
                            flexDirection: 'column',
                            justify: 'space-between',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                            position: 'relative'
                          }}
                          onMouseEnter={e => {
                            e.currentTarget.style.borderColor = textPrimary
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.06)'
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.borderColor = borderColor
                            e.currentTarget.style.boxShadow = 'none'
                          }}
                        >
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                              <span style={{ fontSize: '11px', fontWeight: 600, padding: '3px 8px', borderRadius: '9999px', background: isDark ? 'rgba(34, 197, 94, 0.15)' : '#EDF3EC', color: isDark ? '#4ADE80' : '#346538', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                {t.theme || 'Who We Are'}
                              </span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                {t.durationWeeks && (
                                  <span style={{ fontSize: '12px', color: textSecondary, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <FontAwesomeIcon icon={faClock} style={{ fontSize: '10px' }} />
                                    {t.durationWeeks} Weeks
                                  </span>
                                )}
                                <span style={{ fontSize: '11px', fontWeight: 600, color: isDark ? '#60A5FA' : '#1F6C9F', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <FontAwesomeIcon icon={faEdit} style={{ fontSize: '10px' }} /> Edit
                                </span>
                              </div>
                            </div>

                            <h4 style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 8px 0', color: textPrimary, lineHeight: 1.4 }}>
                              {t.title}
                            </h4>

                            {t.centralIdea && (
                              <p style={{ fontSize: '13px', color: textSecondary, margin: '0 0 14px 0', lineHeight: 1.5 }}>
                                &ldquo;{t.centralIdea}&rdquo;
                              </p>
                            )}

                            {/* Badges for LOI, Key Concepts & ATL Skills */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '12px', borderTop: `1px solid ${borderColor}` }}>
                              <div style={{ fontSize: '11px', color: textSecondary }}>
                                <strong>LOIs:</strong> {linkedLois.length > 0 ? `${linkedLois.length} selected` : 'None linked'}
                              </div>
                              <div style={{ fontSize: '11px', color: textSecondary }}>
                                <strong>Key Concepts:</strong> {linkedKcs.length > 0 ? `${linkedKcs.length} selected` : 'None linked'}
                              </div>
                              <div style={{ fontSize: '11px', color: textSecondary }}>
                                <strong>ATL Skills:</strong> {linkedAtls.length > 0 ? `${linkedAtls.length} selected` : 'None linked'}
                              </div>
                            </div>
                          </div>

                          <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: `1px solid ${borderColor}`, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', fontSize: '12px', color: textSecondary }}>
                            <span style={{ fontWeight: 500, color: textPrimary, display: 'flex', alignItems: 'center', gap: '5px' }}>
                              <FontAwesomeIcon icon={faEdit} style={{ fontSize: '11px', color: textSecondary }} /> Click Card to Edit
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

          </div>
        )}



        {/* ------------------------------------------------------------- */}
        {/* TAB 5: TEACHER'S COMMENT */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'comment' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ background: cardBg, border: `1px solid ${borderColor}`, borderRadius: '10px', padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 4px 0', color: textPrimary }}>
                    Teacher's Report Card Comment Builder
                  </h3>
                  <p style={{ fontSize: '13px', color: textSecondary, margin: 0 }}>
                    Formulate structured transdisciplinary learning reflection comments for student report cards.
                  </p>
                </div>

                <Button
                  onClick={() => window.print()}
                  style={{
                    background: isDark ? '#27272A' : '#F4F4F5',
                    color: textPrimary,
                    border: `1px solid ${borderColor}`,
                    borderRadius: '6px',
                    fontWeight: 600,
                    fontSize: '12px',
                    padding: '8px 14px'
                  }}
                >
                  <FontAwesomeIcon icon={faPrint} style={{ marginRight: '6px' }} />
                  Print Reflection Guide
                </Button>
              </div>

              {/* Interactive Reflection Comment Builder */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                
                {/* Form Fields */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div>
                    <Label style={{ fontSize: '12px', fontWeight: 600, color: textPrimary, marginBottom: '4px', display: 'block' }}>
                      Inquiry Strengths & Achievements
                    </Label>
                    <textarea
                      rows={3}
                      value={commentData.strengths}
                      onChange={e => setCommentData({ ...commentData, strengths: e.target.value })}
                      style={{ ...inputStyle, width: '100%', padding: '8px 12px', resize: 'vertical' }}
                    />
                  </div>

                  <div>
                    <Label style={{ fontSize: '12px', fontWeight: 600, color: textPrimary, marginBottom: '4px', display: 'block' }}>
                      Areas for Growth
                    </Label>
                    <textarea
                      rows={2}
                      value={commentData.growth}
                      onChange={e => setCommentData({ ...commentData, growth: e.target.value })}
                      style={{ ...inputStyle, width: '100%', padding: '8px 12px', resize: 'vertical' }}
                    />
                  </div>

                  <div>
                    <Label style={{ fontSize: '12px', fontWeight: 600, color: textPrimary, marginBottom: '4px', display: 'block' }}>
                      Action Plan / Next Steps
                    </Label>
                    <textarea
                      rows={2}
                      value={commentData.actionPlan}
                      onChange={e => setCommentData({ ...commentData, actionPlan: e.target.value })}
                      style={{ ...inputStyle, width: '100%', padding: '8px 12px', resize: 'vertical' }}
                    />
                  </div>

                  <div>
                    <Label style={{ fontSize: '12px', fontWeight: 600, color: textPrimary, marginBottom: '4px', display: 'block' }}>
                      Primary IB Learner Profile Highlight
                    </Label>
                    <select
                      value={commentData.selectedProfile}
                      onChange={e => setCommentData({ ...commentData, selectedProfile: e.target.value })}
                      style={{ ...selectStyle, width: '100%' }}
                    >
                      {LEARNER_PROFILES.map(lp => (
                        <option key={lp} value={lp}>{lp}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Live Preview Box */}
                <div style={{ background: isDark ? '#27272A' : '#F9F9F8', border: `1px solid ${borderColor}`, borderRadius: '8px', padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                      <FontAwesomeIcon icon={faQuoteLeft} style={{ color: textSecondary, fontSize: '14px' }} />
                      <span style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: textSecondary }}>
                        Generated Comment Preview
                      </span>
                    </div>

                    <p style={{ fontSize: '13px', lineHeight: 1.6, color: textPrimary, margin: '0 0 12px 0' }}>
                      {commentData.strengths}
                    </p>
                    <p style={{ fontSize: '13px', lineHeight: 1.6, color: textPrimary, margin: '0 0 12px 0' }}>
                      {commentData.growth}
                    </p>
                    <p style={{ fontSize: '13px', lineHeight: 1.6, color: textPrimary, margin: 0 }}>
                      {commentData.actionPlan}
                    </p>
                  </div>

                  <div style={{ marginTop: '20px', paddingTop: '12px', borderTop: `1px solid ${borderColor}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '11px', fontWeight: 600, padding: '3px 8px', borderRadius: '9999px', background: isDark ? 'rgba(59, 130, 246, 0.15)' : '#E1F3FE', color: isDark ? '#60A5FA' : '#1F6C9F' }}>
                      Learner Profile: {commentData.selectedProfile}
                    </span>
                    <span style={{ fontSize: '11px', color: textSecondary, fontFamily: 'monospace' }}>
                      Ready for Report Card
                    </span>
                  </div>
                </div>

              </div>
            </div>
          </div>
        )}

      </div>

      {/* ------------------------------------------------------------- */}
      {/* 4-STEP WIZARD MODAL: CREATE UNIT FOR PYP CLASS */}
      {/* ------------------------------------------------------------- */}
      {showClassUnitModal && (
        <Modal
          isOpen={showClassUnitModal}
          onClose={() => setShowClassUnitModal(false)}
          disableBackdropClose={true}
          title={editingUnit ? `Edit Unit: ${editingUnit.title}` : `Create Unit for ${currentSelectedClassObj?.kelas_nama || 'PYP Class'}`}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Interactive Step Progress Tabs */}
            <div style={{ display: 'flex', gap: '8px', borderBottom: `1px solid ${borderColor}`, paddingBottom: '8px' }}>
              {[
                { step: 1, label: '1. Unit Basics' },
                { step: 2, label: `2. Lines of Inquiry (${selectedLoiIds.length})` },
                { step: 3, label: `3. Key Concepts (${selectedKcIds.length})` },
                { step: 4, label: `4. ATL Skills (${selectedAtlIds.length})` }
              ].map(tab => {
                const isActive = wizardStep === tab.step
                return (
                  <button
                    key={tab.step}
                    type="button"
                    onClick={() => setWizardStep(tab.step)}
                    style={{
                      flex: 1,
                      background: 'none',
                      border: 'none',
                      borderBottom: isActive ? `2px solid ${textPrimary}` : '2px solid transparent',
                      paddingBottom: '8px',
                      fontSize: '12px',
                      fontWeight: isActive ? 700 : 500,
                      color: isActive ? textPrimary : textSecondary,
                      cursor: 'pointer',
                      textAlign: 'center',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={e => {
                      if (!isActive) e.currentTarget.style.color = textPrimary
                    }}
                    onMouseLeave={e => {
                      if (!isActive) e.currentTarget.style.color = textSecondary
                    }}
                  >
                    {tab.label}
                  </button>
                )
              })}
            </div>

            {/* STEP 1: UNIT BASICS */}
            {wizardStep === 1 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <Label style={{ fontSize: '12px', fontWeight: 600, marginBottom: '6px', display: 'block', color: textPrimary }}>
                    Unit Title *
                  </Label>
                  <Input
                    type="text"
                    required
                    placeholder="e.g. How We Express Identity Through Art"
                    value={unitFormData.title}
                    onChange={e => setUnitFormData({ ...unitFormData, title: e.target.value })}
                    style={inputStyle}
                  />
                </div>

                <div>
                  <Label style={{ fontSize: '12px', fontWeight: 600, marginBottom: '6px', display: 'block', color: textPrimary }}>
                    Central Idea *
                  </Label>

                  {selectedCiObj ? (
                    <div style={{ background: isDark ? '#27272A' : '#F4F4F5', border: `1px solid ${borderColor}`, borderRadius: '8px', padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                      <div>
                        <div style={{ fontSize: '11px', fontWeight: 600, color: isDark ? '#60A5FA' : '#1F6C9F', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                          Selected Central Idea
                        </div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: textPrimary, lineHeight: 1.4 }}>
                          &ldquo;{selectedCiObj.name}&rdquo;
                        </div>
                      </div>
                      <Button
                        type="button"
                        onClick={() => {
                          setSelectedCiObj(null)
                          setUnitFormData(prev => ({ ...prev, centralIdea: '' }))
                          setSearchCiQuery('')
                          setShowCiSuggestions(true)
                        }}
                        style={{ background: cardBg, border: `1px solid ${borderColor}`, color: textPrimary, fontSize: '12px', padding: '6px 12px', whiteSpace: 'nowrap' }}
                      >
                        Change
                      </Button>
                    </div>
                  ) : (
                    <div style={{ position: 'relative' }}>
                      <Input
                        type="text"
                        placeholder="Search Central Idea (A-Z)..."
                        value={searchCiQuery}
                        onFocus={() => setShowCiSuggestions(true)}
                        onBlur={() => setTimeout(() => setShowCiSuggestions(false), 200)}
                        onChange={e => {
                          setSearchCiQuery(e.target.value)
                          setShowCiSuggestions(true)
                        }}
                        style={inputStyle}
                      />

                      {/* Searchable Autocomplete Suggestions Popup (Sorted A-Z) */}
                      {showCiSuggestions && filteredCiSuggestions.length > 0 && (
                        <div
                          style={{
                            position: 'absolute',
                            top: '100%',
                            left: 0,
                            right: 0,
                            zIndex: 50,
                            marginTop: '4px',
                            maxHeight: '220px',
                            overflowY: 'auto',
                            background: cardBg,
                            border: `1px solid ${borderColor}`,
                            borderRadius: '8px',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                            padding: '4px'
                          }}
                        >
                          <div style={{ padding: '6px 10px', fontSize: '11px', fontWeight: 600, color: textSecondary, textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: `1px solid ${borderColor}` }}>
                            Central Ideas A-Z ({filteredCiSuggestions.length})
                          </div>
                          {filteredCiSuggestions.map((ci) => (
                            <div
                              key={ci.id}
                              onMouseDown={(e) => {
                                e.preventDefault()
                                setSelectedCiObj(ci)
                                setUnitFormData(prev => ({ ...prev, centralIdea: ci.name }))
                                setShowCiSuggestions(false)
                              }}
                              style={{
                                padding: '10px 12px',
                                fontSize: '12px',
                                color: textPrimary,
                                cursor: 'pointer',
                                borderRadius: '6px',
                                transition: 'background 0.1s ease',
                                lineHeight: 1.4,
                                borderBottom: `1px solid ${borderColor}`
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = isDark ? '#27272A' : '#F4F4F5'
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'transparent'
                              }}
                            >
                              {ci.name}
                            </div>
                          ))}
                        </div>
                      )}

                      {showCiSuggestions && filteredCiSuggestions.length === 0 && (
                        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50, marginTop: '4px', background: cardBg, border: `1px solid ${borderColor}`, borderRadius: '8px', padding: '12px', textAlign: 'center', fontSize: '12px', color: textSecondary }}>
                          No matching Central Idea for &ldquo;{searchCiQuery}&rdquo;.
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <Label style={{ fontSize: '12px', fontWeight: 600, marginBottom: '6px', display: 'block', color: textPrimary }}>
                      Transdisciplinary Theme
                    </Label>
                    <select
                      value={unitFormData.theme}
                      onChange={e => setUnitFormData({ ...unitFormData, theme: e.target.value })}
                      style={{ ...selectStyle, width: '100%' }}
                    >
                      {TRANSDISCIPLINARY_THEMES.map(th => (
                        <option key={th} value={th}>{th}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <Label style={{ fontSize: '12px', fontWeight: 600, marginBottom: '6px', display: 'block', color: textPrimary }}>
                      Duration (Weeks)
                    </Label>
                    <Input
                      type="number"
                      min="1"
                      max="12"
                      value={unitFormData.duration}
                      onChange={e => setUnitFormData({ ...unitFormData, duration: e.target.value })}
                      style={inputStyle}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: LINES OF INQUIRY (Multi-Select Autocomplete A-Z) */}
            {wizardStep === 2 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', paddingBottom: '20px' }}>
                <Label style={{ fontSize: '12px', fontWeight: 600, color: textPrimary }}>
                  Lines of Inquiry * <span style={{ fontSize: '11px', fontWeight: 400, color: textSecondary }}>({selectedLoiObjs.length} Selected)</span>
                </Label>

                {/* Selected LOI Badges / Chips Container */}
                {selectedLoiObjs.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', background: isDark ? '#27272A' : '#F4F4F5', border: `1px solid ${borderColor}`, borderRadius: '8px', padding: '10px 12px' }}>
                    {selectedLoiObjs.map(loi => (
                      <div
                        key={loi.id}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '8px',
                          background: cardBg,
                          border: `1px solid ${borderColor}`,
                          borderRadius: '6px',
                          padding: '6px 10px',
                          fontSize: '12px',
                          color: textPrimary,
                          lineHeight: 1.4
                        }}
                      >
                        <span>{loi.name}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedLoiObjs(prev => prev.filter(item => item.id !== loi.id))
                            setSelectedLoiIds(prev => prev.filter(id => id !== loi.id))
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: textSecondary,
                            cursor: 'pointer',
                            padding: '0 2px',
                            fontSize: '12px',
                            lineHeight: 1
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Search Box Input */}
                <div style={{ position: 'relative' }}>
                  <Input
                    type="text"
                    placeholder="Search Lines of Inquiry (A-Z)..."
                    value={searchLoiQuery}
                    onFocus={() => setShowLoiSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowLoiSuggestions(false), 200)}
                    onChange={e => {
                      setSearchLoiQuery(e.target.value)
                      setShowLoiSuggestions(true)
                    }}
                    style={inputStyle}
                  />

                  {/* Multi-Select Autocomplete Suggestions Popup */}
                  {showLoiSuggestions && filteredLoiSuggestions.length > 0 && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        zIndex: 50,
                        marginTop: '4px',
                        maxHeight: '160px',
                        overflowY: 'auto',
                        background: cardBg,
                        border: `1px solid ${borderColor}`,
                        borderRadius: '8px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        padding: '4px'
                      }}
                    >
                      <div style={{ padding: '6px 10px', fontSize: '11px', fontWeight: 600, color: textSecondary, textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: `1px solid ${borderColor}` }}>
                        Lines of Inquiry A-Z ({filteredLoiSuggestions.length})
                      </div>
                      {filteredLoiSuggestions.map((loi) => {
                        const isAlreadySelected = selectedLoiObjs.some(item => item.id === loi.id)
                        return (
                          <div
                            key={loi.id}
                            onMouseDown={(e) => {
                              e.preventDefault()
                              if (isAlreadySelected) {
                                setSelectedLoiObjs(prev => prev.filter(item => item.id !== loi.id))
                                setSelectedLoiIds(prev => prev.filter(id => id !== loi.id))
                              } else {
                                setSelectedLoiObjs(prev => [...prev, loi])
                                setSelectedLoiIds(prev => [...prev, loi.id])
                              }
                              // Auto-close popup and clear query so Next button is unblocked
                              setSearchLoiQuery('')
                              setShowLoiSuggestions(false)
                            }}
                            style={{
                              padding: '10px 12px',
                              fontSize: '12px',
                              color: isAlreadySelected ? (isDark ? '#60A5FA' : '#1F6C9F') : textPrimary,
                              fontWeight: isAlreadySelected ? 600 : 400,
                              cursor: 'pointer',
                              borderRadius: '6px',
                              transition: 'background 0.1s ease',
                              lineHeight: 1.4,
                              borderBottom: `1px solid ${borderColor}`,
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              gap: '8px',
                              background: isAlreadySelected ? (isDark ? 'rgba(59, 130, 246, 0.1)' : '#E1F3FE') : 'transparent'
                            }}
                            onMouseEnter={(e) => {
                              if (!isAlreadySelected) e.currentTarget.style.background = isDark ? '#27272A' : '#F4F4F5'
                            }}
                            onMouseLeave={(e) => {
                              if (!isAlreadySelected) e.currentTarget.style.background = 'transparent'
                            }}
                          >
                            <span>{loi.name}</span>
                            {isAlreadySelected && (
                              <span style={{ fontSize: '11px', fontWeight: 700, color: isDark ? '#60A5FA' : '#1F6C9F' }}>
                                ✓ Added
                              </span>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {showLoiSuggestions && filteredLoiSuggestions.length === 0 && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50, marginTop: '4px', background: cardBg, border: `1px solid ${borderColor}`, borderRadius: '8px', padding: '12px', textAlign: 'center', fontSize: '12px', color: textSecondary }}>
                      No matching Line of Inquiry for &ldquo;{searchLoiQuery}&rdquo;.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* STEP 3: KEY CONCEPTS */}
            {wizardStep === 3 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <p style={{ fontSize: '13px', color: textSecondary, margin: 0 }}>
                  Select the Key Concepts for this Unit.
                </p>

                {kcList.length === 0 ? (
                  <div style={{ border: `1px dashed ${borderColor}`, borderRadius: '8px', padding: '24px', textAlign: 'center', color: textSecondary, fontSize: '13px' }}>
                    No Key Concepts found. You can add Key Concepts in Tab 1 (Master Templates).
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px', maxHeight: '340px', overflowY: 'auto' }}>
                    {kcList.map(kc => {
                      const isChecked = selectedKcIds.includes(kc.id)
                      return (
                        <label
                          key={kc.id}
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '4px',
                            background: isChecked ? (isDark ? 'rgba(59, 130, 246, 0.12)' : '#E1F3FE') : cardBg,
                            border: `1px solid ${isChecked ? (isDark ? '#60A5FA' : '#1F6C9F') : borderColor}`,
                            borderRadius: '8px',
                            padding: '12px 14px',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleKcSelection(kc.id)}
                            />
                            <span style={{ fontSize: '13px', fontWeight: 700, color: isChecked ? (isDark ? '#60A5FA' : '#1F6C9F') : textPrimary }}>
                              {kc.key}
                            </span>
                          </div>

                          {kc.question && (
                            <div style={{ fontSize: '12px', fontWeight: 600, color: textPrimary, marginLeft: '24px', lineHeight: 1.3 }}>
                              &ldquo;{kc.question}&rdquo;
                            </div>
                          )}

                          {kc.definition && (
                            <div style={{ fontSize: '11px', color: textSecondary, marginLeft: '24px', lineHeight: 1.4, marginTop: '2px' }}>
                              {kc.definition}
                            </div>
                          )}
                        </label>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* STEP 4: ATL SKILLS & NOTES */}
            {wizardStep === 4 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <p style={{ fontSize: '13px', color: textSecondary, margin: 0 }}>
                  Select ATL Skills and add notes.
                </p>

                {atlsList.length === 0 ? (
                  <div style={{ border: `1px dashed ${borderColor}`, borderRadius: '8px', padding: '24px', textAlign: 'center', color: textSecondary, fontSize: '13px' }}>
                    No ATL Skills found. You can add ATL Skills in Tab 1 (Master Templates).
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '300px', overflowY: 'auto', paddingRight: '4px' }}>
                    {atlsList.map(atl => {
                      const isChecked = selectedAtlIds.includes(atl.id)
                      return (
                        <div
                          key={atl.id}
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px',
                            background: isChecked ? (isDark ? '#27272A' : '#F4F4F5') : cardBg,
                            border: `1px solid ${isChecked ? textPrimary : borderColor}`,
                            borderRadius: '6px',
                            padding: '12px'
                          }}
                        >
                          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleAtlSelection(atl.id)}
                            />
                            <span style={{ fontSize: '13px', fontWeight: 600, color: textPrimary }}>
                              {atl.name}
                            </span>
                          </label>

                          {isChecked && (
                            <div style={{ marginTop: '4px', marginLeft: '28px' }}>
                              <textarea
                                rows={3}
                                placeholder="Add specific ATL skill indicators / bullet points (e.g., • Ask questions to find information&#10;• Find information from different sources)..."
                                value={atlNotes[atl.id] || ''}
                                onChange={e => setAtlNotes({ ...atlNotes, [atl.id]: e.target.value })}
                                style={{
                                  width: '100%',
                                  background: isDark ? '#18181B' : '#FFFFFF',
                                  border: `1px solid ${borderColor}`,
                                  borderRadius: '6px',
                                  padding: '8px 10px',
                                  fontSize: '12px',
                                  color: textPrimary,
                                  fontFamily: 'inherit',
                                  lineHeight: 1.5,
                                  resize: 'vertical',
                                  outline: 'none'
                                }}
                              />
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Modal Controls Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', paddingTop: '12px', borderTop: `1px solid ${borderColor}` }}>
              {wizardStep > 1 ? (
                <Button
                  type="button"
                  onClick={() => setWizardStep(prev => prev - 1)}
                  style={{ background: 'none', border: `1px solid ${borderColor}`, color: textPrimary, fontSize: '13px' }}
                >
                  <FontAwesomeIcon icon={faChevronLeft} style={{ marginRight: '6px' }} /> Back
                </Button>
              ) : <div />}

              <div style={{ display: 'flex', gap: '8px' }}>
                <Button
                  type="button"
                  onClick={() => setShowClassUnitModal(false)}
                  style={{ background: 'none', border: `1px solid ${borderColor}`, color: textPrimary, fontSize: '13px' }}
                >
                  Cancel
                </Button>

                {wizardStep < 4 ? (
                  <Button
                    type="button"
                    onClick={() => {
                      if (wizardStep === 1) {
                        if (!unitFormData.title.trim()) {
                          setNotif({ isOpen: true, title: 'Missing Unit Title', message: 'Please enter a Unit Title before proceeding.', type: 'error' })
                          return
                        }
                        if (!selectedCiObj) {
                          setNotif({ isOpen: true, title: 'Central Idea Required', message: 'Please select a Central Idea from the list.', type: 'error' })
                          return
                        }
                      }
                      setWizardStep(prev => prev + 1)
                    }}
                    style={{ background: textPrimary, color: isDark ? '#09090B' : '#FFFFFF', fontSize: '13px', fontWeight: 600 }}
                  >
                    Next <FontAwesomeIcon icon={faChevronRight} style={{ marginLeft: '6px' }} />
                  </Button>
                ) : (
                  <Button
                    type="button"
                    disabled={submittingUnit}
                    onClick={handleSaveClassUnitWithPivots}
                    style={{ background: textPrimary, color: isDark ? '#09090B' : '#FFFFFF', fontSize: '13px', fontWeight: 600 }}
                  >
                    {submittingUnit ? (editingUnit ? 'Updating Unit...' : 'Saving Unit...') : (editingUnit ? 'Save Changes' : 'Save Complete Unit')}
                  </Button>
                )}
              </div>
            </div>

          </div>
        </Modal>
      )}

      {/* ------------------------------------------------------------- */}
      {/* ADD / EDIT MASTER LIST ITEM MODAL */}
      {/* ------------------------------------------------------------- */}
      {showMasterModal && (
        <Modal
          isOpen={showMasterModal}
          onClose={() => setShowMasterModal(false)}
          disableBackdropClose={true}
          title={`${editingItem ? 'Edit' : 'Add New'} ${
            masterSubTab === 'ci' ? 'Central Idea' :
            masterSubTab === 'loi' ? 'Line of Inquiry' :
            masterSubTab === 'atls' ? 'ATL Skill' : 'Key Concept'
          }`}
        >
          <form onSubmit={handleSaveMasterItem} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {masterSubTab === 'kc' ? (
              <>
                <div>
                  <Label style={{ fontSize: '12px', fontWeight: 600, marginBottom: '6px', display: 'block', color: textPrimary }}>
                    Concept Keyword (key) *
                  </Label>
                  <Input
                    type="text"
                    required
                    placeholder="e.g. Form, Function, Causation..."
                    value={masterFormData.key}
                    onChange={e => setMasterFormData({ ...masterFormData, key: e.target.value })}
                    style={inputStyle}
                  />
                </div>

                <div>
                  <Label style={{ fontSize: '12px', fontWeight: 600, marginBottom: '6px', display: 'block', color: textPrimary }}>
                    Guiding Question (question)
                  </Label>
                  <Input
                    type="text"
                    placeholder="e.g. What is it like?"
                    value={masterFormData.question}
                    onChange={e => setMasterFormData({ ...masterFormData, question: e.target.value })}
                    style={inputStyle}
                  />
                </div>

                <div>
                  <Label style={{ fontSize: '12px', fontWeight: 600, marginBottom: '6px', display: 'block', color: textPrimary }}>
                    Definition / Explanation (definition)
                  </Label>
                  <textarea
                    rows={3}
                    placeholder="Provide concept definition..."
                    value={masterFormData.definition}
                    onChange={e => setMasterFormData({ ...masterFormData, definition: e.target.value })}
                    style={{ ...inputStyle, width: '100%', padding: '8px 12px', resize: 'vertical' }}
                  />
                </div>
              </>
            ) : (
              <div>
                <Label style={{ fontSize: '12px', fontWeight: 600, marginBottom: '6px', display: 'block', color: textPrimary }}>
                  Name / Statement *
                </Label>
                <textarea
                  required
                  rows={3}
                  placeholder={`Enter ${masterSubTab === 'ci' ? 'Central Idea' : masterSubTab === 'loi' ? 'Line of Inquiry' : 'ATL Skill'} description...`}
                  value={masterFormData.name}
                  onChange={e => setMasterFormData({ ...masterFormData, name: e.target.value })}
                  style={{ ...inputStyle, width: '100%', padding: '8px 12px', resize: 'vertical' }}
                />
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
              <Button
                type="button"
                onClick={() => setShowMasterModal(false)}
                style={{
                  background: 'none',
                  border: `1px solid ${borderColor}`,
                  color: textPrimary,
                  borderRadius: '6px',
                  fontSize: '13px'
                }}
              >
                Cancel
              </Button>

              <Button
                type="submit"
                style={{
                  background: textPrimary,
                  color: isDark ? '#09090B' : '#FFFFFF',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: 600,
                  fontSize: '13px'
                }}
              >
                Save Item
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ------------------------------------------------------------- */}
      {/* COPY UNIT MODAL */}
      {/* ------------------------------------------------------------- */}
      {showCopyModal && (
        <Modal
          isOpen={showCopyModal}
          onClose={() => setShowCopyModal(false)}
          disableBackdropClose={true}
          title={`Copy Unit to ${currentSelectedClassObj?.kelas_nama || 'Class'} (${selectedYear || '2025/2026'})`}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <p style={{ fontSize: '13px', color: textSecondary, margin: 0 }}>
              Select the source Academic Year, Class, and Unit you wish to duplicate. All attached LOIs, Key Concepts, and ATL Skills will be automatically replicated.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <Label style={{ fontSize: '12px', fontWeight: 600, marginBottom: '6px', display: 'block', color: textPrimary }}>
                  Source Academic Year
                </Label>
                <select
                  value={copySourceYear}
                  onChange={e => {
                    setCopySourceYear(e.target.value)
                    setCopySourceUnitId('')
                  }}
                  style={{ ...selectStyle, width: '100%' }}
                >
                  {years.map(yr => (
                    <option key={yr.year_name} value={yr.year_name}>{yr.year_name}</option>
                  ))}
                </select>
              </div>

              <div>
                <Label style={{ fontSize: '12px', fontWeight: 600, marginBottom: '6px', display: 'block', color: textPrimary }}>
                  Source Class
                </Label>
                <select
                  value={copySourceClassId}
                  onChange={e => {
                    setCopySourceClassId(e.target.value)
                    setCopySourceUnitId('')
                  }}
                  style={{ ...selectStyle, width: '100%' }}
                >
                  {pypClasses.map(cls => (
                    <option key={cls.kelas_id} value={cls.kelas_id.toString()}>{cls.kelas_nama}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <Label style={{ fontSize: '12px', fontWeight: 600, marginBottom: '6px', display: 'block', color: textPrimary }}>
                Select Source Unit to Copy *
              </Label>

              {sourceAvailableUnits.length === 0 ? (
                <div style={{ border: `1px dashed ${borderColor}`, borderRadius: '8px', padding: '20px', textAlign: 'center', color: textSecondary, fontSize: '13px' }}>
                  No units available in the selected Source Class & Academic Year.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '240px', overflowY: 'auto', paddingRight: '4px' }}>
                  {sourceAvailableUnits.map(u => {
                    const isSelected = copySourceUnitId === u.id.toString()
                    const linkedLois = loiPivots.filter(p => p.unitId === u.id)
                    const linkedKcs = kcPivots.filter(p => p.unitId === u.id)
                    const linkedAtls = atlPivots.filter(p => p.unitId === u.id)

                    return (
                      <div
                        key={u.uniqueKey || `${u.isDedicated ? 'pyp' : 'topic'}-${u.id}`}
                        onClick={() => setCopySourceUnitId(u.id.toString())}
                        style={{
                          background: isSelected ? (isDark ? 'rgba(59, 130, 246, 0.15)' : '#E1F3FE') : cardBg,
                          border: `1px solid ${isSelected ? (isDark ? '#60A5FA' : '#1F6C9F') : borderColor}`,
                          borderRadius: '8px',
                          padding: '12px 14px',
                          cursor: 'pointer',
                          transition: 'all 0.1s ease',
                          display: 'flex',
                          justify: 'space-between',
                          alignItems: 'center',
                          gap: '12px'
                        }}
                      >
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: textPrimary, marginBottom: '2px' }}>
                            {u.title}
                          </div>
                          <div style={{ fontSize: '12px', color: textSecondary, lineHeight: 1.3 }}>
                            &ldquo;{u.centralIdea}&rdquo;
                          </div>
                          <div style={{ fontSize: '11px', color: textSecondary, marginTop: '4px', display: 'flex', gap: '12px' }}>
                            <span><strong>Theme:</strong> {u.theme}</span>
                            <span><strong>LOIs:</strong> {linkedLois.length}</span>
                            <span><strong>KCs:</strong> {linkedKcs.length}</span>
                            <span><strong>ATLs:</strong> {linkedAtls.length}</span>
                          </div>
                        </div>

                        {isSelected && (
                          <span style={{ fontSize: '12px', fontWeight: 700, color: isDark ? '#60A5FA' : '#1F6C9F', whiteSpace: 'nowrap' }}>
                            ✓ Selected
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Target Destination Card */}
            <div style={{ background: isDark ? '#27272A' : '#F4F4F5', border: `1px solid ${borderColor}`, borderRadius: '8px', padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 600, color: textSecondary, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px' }}>
                  Target Destination
                </div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: textPrimary }}>
                  {currentSelectedClassObj?.kelas_nama || 'Class'} ({selectedYear || '2025/2026'})
                </div>
              </div>
              <span style={{ fontSize: '11px', padding: '4px 8px', borderRadius: '4px', background: isDark ? '#3F3F46' : '#E4E4E7', color: textPrimary, fontWeight: 500 }}>
                Copy Target
              </span>
            </div>

            {/* Controls Bar */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px', paddingTop: '12px', borderTop: `1px solid ${borderColor}` }}>
              <Button
                type="button"
                onClick={() => setShowCopyModal(false)}
                style={{ background: 'none', border: `1px solid ${borderColor}`, color: textPrimary, fontSize: '13px' }}
              >
                Cancel
              </Button>

              <Button
                type="button"
                disabled={submittingCopy || !copySourceUnitId}
                onClick={handleExecuteCopyUnit}
                style={{ background: textPrimary, color: isDark ? '#09090B' : '#FFFFFF', fontSize: '13px', fontWeight: 600 }}
              >
                {submittingCopy ? 'Copying Unit...' : 'Execute Copy Unit'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* NOTIFICATION MODAL */}
      {notif.isOpen && (
        <NotificationModal
          isOpen={notif.isOpen}
          onClose={() => setNotif({ ...notif, isOpen: false })}
          title={notif.title}
          message={notif.message}
          type={notif.type}
        />
      )}

    </div>
  )
}
