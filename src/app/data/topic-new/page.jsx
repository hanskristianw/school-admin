'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { flushSync } from 'react-dom'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSpinner, faPlus, faTimes, faClipboardList, faBook, faInfoCircle, faPaperPlane, faTrash, faPrint, faFileAlt, faFileWord, faSave, faLightbulb, faCalendar, faCalendarCheck, faCheck, faTableCells, faListUl, faMap, faClipboardCheck, faComments, faHouseUser, faChartBar, faWandMagicSparkles, faSliders } from '@fortawesome/free-solid-svg-icons'
import { useTheme } from '@/lib/theme'
import SlideOver from '@/components/ui/slide-over'
import Modal from '@/components/ui/modal'
import { useI18n } from '@/lib/i18n'
import {
  generateUnitPlannerPDF,
  generateAssessmentPDFFromWizard,
  exportAssessmentWordFromWizard,
  generateAssessmentPDFFromCard,
  exportAssessmentWordFromCard,
  generateStudentReportHTML,
  generateClassReportZIP,
  generateClassRecapPDFReport,
} from './lib/pdfGenerators'
import useAiHelp from './lib/useAiHelp'
import WizardStepContent from './components/WizardStepContent'
import CommunityProjectTab from './components/CommunityProjectTab'
import 'driver.js/dist/driver.css'

export default function TopicNewPage() {
  const router = useRouter()
  const { t, lang } = useI18n()
  const aiScrollRef = useRef(null)
  const commentImportRef = useRef(null)
  const mentorImportRef = useRef(null)
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('topic_active_tab') || 'planning'
    return 'planning'
  })
  const [activeSubMenu, setActiveSubMenu] = useState('overview')
  const [planningView, setPlanningView] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('planning_view') || 'card'
    return 'card'
  })
  const [assessmentView, setAssessmentView] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('assessment_view') || 'card'
    return 'card'
  })
  const [userRole, setUserRole] = useState(null)
  const [userIsCurriculum, setUserIsCurriculum] = useState(false)
  // userIsAdmin: set from user_data.isAdmin (role.is_admin from DB) — covers any role name with is_admin=true
  const [userIsAdmin, setUserIsAdmin] = useState(false)
  // isAdmin: full access when role name is 'admin', OR is_admin flag is true in DB, OR curriculum/principal flag
  const isAdmin = (userRole?.toLowerCase() === 'admin') || userIsAdmin || userIsCurriculum
  // Helper for functions that receive role as param (before state is set)
  const isAdminLike = (r) => !!(r && r.toLowerCase() === 'admin') || userIsAdmin || userIsCurriculum

  
  // Data state
  const [topics, setTopics] = useState([])
  const [subjects, setSubjects] = useState([])
  const [allKelas, setAllKelas] = useState([]) // All available kelas (with kelas_year_id)
  const [allKelasRaw, setAllKelasRaw] = useState([]) // Full list, unfiltered by year
  const [allowedKelasRaw, setAllowedKelasRaw] = useState([]) // Kelas user is allowed to teach (filtered by detail_kelas)
  const [subjectsForSelectedKelas, setSubjectsForSelectedKelas] = useState([]) // Subjects available for the selected kelas
  const [yearOptions, setYearOptions] = useState([]) // All years for filter
  const [kelasLoading, setKelasLoading] = useState(false) // Loading state for kelas
  const [kelasNameMap, setKelasNameMap] = useState(new Map())
  const [loading, setLoading] = useState(true)
  
  // Filters
  const [filters, setFilters] = useState({ year: '', kelas: '', subject: '', search: '' })
  
  // Assessment state
  const [assessments, setAssessments] = useState([])
  const [loadingAssessments, setLoadingAssessments] = useState(false)
  const [assessmentFilters, setAssessmentFilters] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('assessment_filters')
        if (saved) return JSON.parse(saved)
      } catch (e) {}
    }
    return { subject: '', kelas: '', year: '', status: '', search: '', noCriteria: false }
  })
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

  // IB MYP Global Context Possible Explorations (from IB MYP guide)
  const globalContextExplorations = {
    'Identities and relationships': [
      'Competition and cooperation',
      'Teams, affiliation and leadership',
      'Identity formation',
      'Self-esteem',
      'Status',
      'Roles and role models',
      'Personal efficacy and agency',
      'Attitudes',
      'Motivations',
      'Independence',
      'Happiness and the good life',
      'Physical, psychological and social development',
      'Transitions',
      'Health and well-being',
      'Lifestyle choices',
      'Human nature and human dignity',
      'Moral reasoning and ethical judgement',
      'Consciousness and mind'
    ],
    'Orientation in space and time': [
      'Civilizations and social histories',
      'Heritage',
      'Pilgrimage',
      'Displacement and exchange',
      'Epochs, eras, turning points and "big history"',
      'Scale, duration, frequency and variability',
      'Peoples, boundaries, exchange and interaction',
      'Natural and human landscapes and resources',
      'Evolution, constraints and adaptation',
      'Indigenous understanding'
    ],
    'Personal and cultural expression': [
      'Artistry, craft, creation, beauty',
      'Products, systems and institutions',
      'Social constructions of reality',
      'Philosophies and ways of life',
      'Belief systems, ritual and play',
      'Critical literacy',
      'Languages and linguistic systems',
      'Histories of ideas, fields and disciplines',
      'Analysis and argument',
      'Metacognition and abstract thinking',
      'Entrepreneurship, practice and competency'
    ],
    'Scientific and technical innovation': [
      'Systems, models, methods',
      'Products, processes and solutions',
      'Adaptation, ingenuity and progress',
      'Opportunity, risk, consequences and responsibility',
      'Modernization, industrialization and engineering',
      'Digital life, virtual environments and the Information Age',
      'The biological revolution',
      'Mathematical puzzles, principles and discoveries'
    ],
    'Globalization and sustainability': [
      'Markets, commodities and commercialization',
      'Human impact on the environment',
      'Commonality, diversity and interconnection',
      'Consumption, conservation, scarcity, natural resources and public goods',
      'Population and demography',
      'Urban planning',
      'Strategy and infrastructure',
      'Data-driven decision-making'
    ],
    'Fairness and development': [
      'Democracy, politics, government and civil society',
      'Inequality, difference and inclusion',
      'Human capability and development',
      'Social entrepreneurs',
      'Rights, law, civic responsibility and the public sphere',
      'Justice, peace and conflict',
      'Ecology and disparate impact',
      'Power and privilege',
      'Authority, security and freedom',
      'Imagining a hopeful future'
    ]
  }

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
  // Weekly Plan cascade filter state (Year → Kelas → Subject → Topic)
  const [wpYear, setWpYear] = useState('')
  const [wpKelas, setWpKelas] = useState('')
  const [wpSubject, setWpSubject] = useState('')

  // Weekly Overview DOCX Modal State
  const [woDocxModalOpen, setWoDocxModalOpen] = useState(false)
  const [woDocxYearId, setWoDocxYearId] = useState('')
  const [woDocxKelasId, setWoDocxKelasId] = useState('')
  const [woDocxMonth, setWoDocxMonth] = useState('')
  const [woDocxDate, setWoDocxDate] = useState('')
  const [woDocxLoading, setWoDocxLoading] = useState(false)
  const [woDocxError, setWoDocxError] = useState('')

  const getWeeksForMonth = (year, monthIdx) => {
    const weeks = []
    let d = new Date(year, monthIdx, 1)
    const day = d.getDay()
    const diff = day === 0 ? -6 : 1 - day
    d.setDate(d.getDate() + diff)

    let weekNum = 1
    while (true) {
      const fri = new Date(d)
      fri.setDate(d.getDate() + 4)

      if (d.getMonth() !== monthIdx && fri.getMonth() !== monthIdx && d > new Date(year, monthIdx, 15)) {
        break
      }

      const yyyy = d.getFullYear()
      const mm = String(d.getMonth() + 1).padStart(2, '0')
      const dd = String(d.getDate()).padStart(2, '0')
      const mondayStr = `${yyyy}-${mm}-${dd}`

      const monFmt = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
      const friFmt = fri.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })

      weeks.push({
        weekNum: weekNum++,
        mondayDate: mondayStr,
        label: `Week ${weekNum - 1} (${monFmt} – ${friFmt})`,
      })

      d.setDate(d.getDate() + 7)
    }
    return weeks
  }

  const woDocxMonthOptions = useMemo(() => {
    let startYear = new Date().getFullYear()
    if (woDocxYearId) {
      const yr = yearOptions.find(y => String(y.year_id) === String(woDocxYearId))
      if (yr?.year_name) {
        const m = yr.year_name.match(/(\d{4})/)
        if (m) startYear = parseInt(m[1])
      }
    }
    const months = []
    for (let i = 0; i < 12; i++) {
      const d = new Date(startYear, 6 + i, 1) // Month 6 = July
      const val = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, '0')}`
      const label = d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
      months.push({ val, label, year: d.getFullYear(), monthIdx: d.getMonth() })
    }
    return months
  }, [woDocxYearId, yearOptions])

  const woDocxWeekOptions = useMemo(() => {
    if (!woDocxMonth) return []
    const [yStr, mStr] = woDocxMonth.split('-')
    return getWeeksForMonth(parseInt(yStr), parseInt(mStr))
  }, [woDocxMonth])

  useEffect(() => {
    if (woDocxModalOpen && yearOptions.length > 0 && !woDocxYearId) {
      setWoDocxYearId(String(yearOptions[0].year_id))
    }
  }, [woDocxModalOpen, yearOptions, woDocxYearId])

  useEffect(() => {
    if (woDocxModalOpen && allKelasRaw.length > 0) {
      const filtered = woDocxYearId
        ? allKelasRaw.filter(k => String(k.kelas_year_id) === String(woDocxYearId))
        : allKelasRaw

      const uid = parseInt(localStorage.getItem('kr_id') || '0')
      const myWaliKelas = filtered.find(k => k.kelas_user_id === uid)
      if (myWaliKelas) {
        setWoDocxKelasId(String(myWaliKelas.kelas_id))
      } else if (filtered.length > 0) {
        setWoDocxKelasId(String(filtered[0].kelas_id))
      } else {
        setWoDocxKelasId('')
      }
    }
  }, [woDocxModalOpen, woDocxYearId, allKelasRaw])

  useEffect(() => {
    if (woDocxModalOpen && woDocxMonthOptions.length > 0 && !woDocxMonth) {
      const now = new Date()
      const currentVal = `${now.getFullYear()}-${String(now.getMonth()).padStart(2, '0')}`
      const match = woDocxMonthOptions.find(m => m.val === currentVal)
      setWoDocxMonth(match ? match.val : woDocxMonthOptions[0].val)
    }
  }, [woDocxModalOpen, woDocxMonthOptions, woDocxMonth])

  useEffect(() => {
    if (woDocxWeekOptions.length > 0) {
      const exists = woDocxWeekOptions.some(w => w.mondayDate === woDocxDate)
      if (!exists) {
        setWoDocxDate(woDocxWeekOptions[0].mondayDate)
      }
    }
  }, [woDocxWeekOptions, woDocxDate])

  const handleDownloadWoDocx = async () => {
    if (!woDocxKelasId || !woDocxDate) {
      setWoDocxError('Please select class and week date')
      return
    }
    setWoDocxLoading(true)
    setWoDocxError('')
    try {
      const formatLocalDate = (dateObj) => {
        const yyyy = dateObj.getFullYear()
        const mm = String(dateObj.getMonth() + 1).padStart(2, '0')
        const dd = String(dateObj.getDate()).padStart(2, '0')
        return `${yyyy}-${mm}-${dd}`
      }

      const kelasId = parseInt(woDocxKelasId)
      const d = new Date(woDocxDate + 'T00:00:00')
      const dayIdx = d.getDay()
      const diff = dayIdx === 0 ? -6 : 1 - dayIdx
      d.setDate(d.getDate() + diff)
      const monday = formatLocalDate(d)
      const fridayObj = new Date(d); fridayObj.setDate(d.getDate() + 4)
      const friday = formatLocalDate(fridayObj)

      const monD = d.toLocaleDateString('en-GB', { day: 'numeric' })
      const friD = fridayObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
      const weekLabel = `${monD} - ${friD}`

      const targetKelas = allKelasRaw.find(k => k.kelas_id === kelasId)
      const kelasNama = targetKelas?.kelas_nama || 'Class'

      const [ttRes, dkRes, subjRes, exRes, wpRes, draftRes, rsRes] = await Promise.all([
        supabase.from('timetable').select('timetable_id, timetable_detail_kelas_id, timetable_day, timetable_time, custom_label, kelas_id, custom_color'),
        supabase.from('detail_kelas').select('detail_kelas_id, detail_kelas_subject_id, detail_kelas_kelas_id').eq('detail_kelas_kelas_id', kelasId),
        supabase.from('subject').select('subject_id, subject_name'),
        supabase.from('timetable_exception').select('*').gte('exception_date', monday).lte('exception_date', friday),
        supabase.from('topic_weekly_plan').select('id, topic_id, week_number, week_date, week_objectives, week_activities, week_resources, topic:topic_id(topic_id, topic_kelas_id, topic_subject_id)').gte('week_date', monday).lte('week_date', friday),
        supabase.from('weekly_overview_draft').select('draft_data').eq('kelas_id', kelasId).eq('week_date', monday).maybeSingle(),
        supabase.from('report_settings').select('principal_name, principal_title, signature_principal_url, stamp_url, unit_id, year_id'),
      ])

      const dkData = dkRes.data || []
      const dkIds = new Set(dkData.map(d => d.detail_kelas_id))
      const dkMap = new Map(dkData.map(d => [d.detail_kelas_id, d]))
      const subjMap = new Map((subjRes.data || []).map(s => [s.subject_id, s.subject_name]))
      const slots = (ttRes.data || []).filter(r => dkIds.has(r.timetable_detail_kelas_id) || r.kelas_id === kelasId)

      const parseRangeTime = (pgRange) => {
        if (!pgRange) return { start: '', end: '' }
        const m = pgRange.match(/^[\[(](.*),(.*)[)\]]$/)
        if (!m) return { start: '', end: '' }
        const clean = (raw) => raw.trim().replace(/^"|"$/g, '').slice(11, 16)
        return { start: clean(m[1]), end: clean(m[2]) }
      }

      const relevantEx = (exRes.data || []).filter(ex =>
        ex.affects_all_kelas || (ex.affected_kelas_ids && ex.affected_kelas_ids.includes(kelasId))
      )

      const relevantWP = (wpRes.data || []).filter(wp => wp.topic?.topic_kelas_id === kelasId)
      const wpByDateAndSubject = new Map()
      const wpBySubject = new Map()

      relevantWP.forEach(wp => {
        if (wp.topic?.topic_subject_id) {
          const subjId = wp.topic.topic_subject_id
          wpBySubject.set(subjId, wp)

          if (wp.week_objectives && wp.week_objectives.trim().startsWith('[')) {
            try {
              const sessionList = JSON.parse(wp.week_objectives)
              if (Array.isArray(sessionList)) {
                sessionList.forEach(s => {
                  if (s.week_date) {
                    wpByDateAndSubject.set(`${s.week_date}|${subjId}`, {
                      ...wp,
                      week_date: s.week_date,
                      week_objectives: s.week_objectives,
                      week_activities: s.week_activities,
                      week_resources: s.week_resources,
                      week_reflection: s.week_reflection,
                    })
                  }
                })
                return
              }
            } catch (e) {}
          }

          if (wp.week_date) {
            wpByDateAndSubject.set(`${wp.week_date}|${subjId}`, wp)
          }
        }
      })

      const timeToMin = (tStr) => {
        if (!tStr) return 0
        const parts = tStr.split(':')
        return (parseInt(parts[0], 10) || 0) * 60 + (parseInt(parts[1], 10) || 0)
      }

      const minToTime = (m) => {
        const hh = String(Math.floor(m / 60)).padStart(2, '0')
        const mm = String(m % 60).padStart(2, '0')
        return `${hh}:${mm}`
      }

      const parsedSlots = slots.map(r => {
        const { start, end } = parseRangeTime(r.timetable_time)
        return {
          ...r,
          startStr: start,
          endStr: end,
          minStart: timeToMin(start),
          minEnd: timeToMin(end),
        }
      }).filter(r => r.minStart < r.minEnd)

      const pointSet = new Set()
      parsedSlots.forEach(r => {
        pointSet.add(r.minStart)
        pointSet.add(r.minEnd)
      })
      const points = Array.from(pointSet).sort((a, b) => a - b)

      const timeSlots = []
      for (let i = 0; i < points.length - 1; i++) {
        const pStart = points[i]
        const pEnd = points[i + 1]
        const hasOverlap = parsedSlots.some(r => r.minStart < pEnd && r.minEnd > pStart)
        if (hasOverlap) {
          timeSlots.push(`${minToTime(pStart)}|${minToTime(pEnd)}`)
        }
      }

      const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
      const cells = {}

      days.forEach((dayName, idx) => {
        const currD = new Date(d); currD.setDate(currD.getDate() + idx)
        const dateStr = formatLocalDate(currD)

        const holidayEx = relevantEx.find(ex => ex.exception_date === dateStr && ex.exception_type === 'holiday')
        if (holidayEx) {
          cells[`${dayName}|HOLIDAY`] = { type: 'holiday', label: holidayEx.exception_label }
        }
      })

      timeSlots.forEach((slotKey, slotIdx) => {
        const [slotStart, slotEnd] = slotKey.split('|')
        const slotMinStart = timeToMin(slotStart)
        const slotMinEnd = timeToMin(slotEnd)

        days.forEach((dayName, idx) => {
          const currD = new Date(d); currD.setDate(currD.getDate() + idx)
          const dateStr = formatLocalDate(currD)

          if (cells[`${dayName}|HOLIDAY`]) return

          const cellKey = `${dayName}|${slotKey}`

          const eventEx = relevantEx.find(ex =>
            ex.exception_date === dateStr && ex.exception_type === 'event' &&
            ex.start_time && ex.end_time &&
            (slotMinStart < timeToMin(ex.end_time.slice(0, 5)) && slotMinEnd > timeToMin(ex.start_time.slice(0, 5)))
          )

          if (eventEx) {
            cells[cellKey] = { type: 'event', label: eventEx.exception_label }
            return
          }

          const matching = parsedSlots.filter(r =>
            r.timetable_day === dayName &&
            r.minStart < slotMinEnd && r.minEnd > slotMinStart
          )

          if (matching.length === 0) {
            cells[cellKey] = { type: 'empty' }
            return
          }

          const earliestStart = Math.min(...matching.map(r => r.minStart))

          if (earliestStart < slotMinStart) {
            cells[cellKey] = { type: 'covered' }
            return
          }

          const latestEnd = Math.max(...matching.map(r => r.minEnd))
          let rowSpan = 0
          for (let k = slotIdx; k < timeSlots.length; k++) {
            const [kStart] = timeSlots[k].split('|')
            if (timeToMin(kStart) < latestEnd) {
              rowSpan++
            } else {
              break
            }
          }

          const items = matching.map(matchSlot => {
            if (matchSlot.custom_label) {
              return {
                subject: matchSlot.custom_label,
                customColor: matchSlot.custom_color || 'F3E8FF',
                objectives: '',
                activities: '',
                resources: '',
              }
            }
            const dk = dkMap.get(matchSlot.timetable_detail_kelas_id)
            const subjectId = dk?.detail_kelas_subject_id
            const subjectName = subjMap.get(subjectId) || '-'
            const dateMatchWp = subjectId ? wpByDateAndSubject.get(`${dateStr}|${subjectId}`) : null
            return {
              subject: subjectName,
              objectives: dateMatchWp?.week_objectives || '',
              activities: dateMatchWp?.week_activities || '',
              resources: dateMatchWp?.week_resources || '',
            }
          })

          cells[cellKey] = {
            type: 'normal',
            subject: items[0].subject,
            customColor: items[0].customColor || null,
            objectives: items[0].objectives,
            activities: items[0].activities,
            resources: items[0].resources,
            items,
            rowSpan: rowSpan > 1 ? rowSpan : 1,
          }
        })
      })

      const finalCells = draftRes.data ? draftRes.data.draft_data.cells : cells

      const yearId = targetKelas?.kelas_year_id || (woDocxYearId ? parseInt(woDocxYearId) : null)
      const unitId = targetKelas?.kelas_unit_id || targetKelas?.unit_id

      let reportSettings = null
      const rsList = rsRes.data || []
      const matchedRs = rsList.find(r => (unitId ? r.unit_id === unitId : true) && (yearId ? r.year_id === yearId : true)) || rsList[0]
      if (matchedRs) {
        reportSettings = {
          principalName: matchedRs.principal_name,
          principalTitle: matchedRs.principal_title,
          signatureUrl: matchedRs.signature_principal_url,
          stampUrl: matchedRs.stamp_url,
        }
      }

      const res = await fetch('/api/weekly-overview-docx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kelasNama,
          weekLabel,
          timeSlots,
          days,
          cells: finalCells,
          reportSettings,
        }),
      })

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}))
        throw new Error(errJson.details || errJson.error || 'Failed to generate DOCX')
      }

      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Weekly_Overview_${kelasNama.replace(/[^a-zA-Z0-9]/g, '_')}_${weekLabel.replace(/[^a-zA-Z0-9]/g, '_')}.docx`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)

      setWoDocxModalOpen(false)
    } catch (err) {
      setWoDocxError(err.message || 'Failed to export DOCX')
    } finally {
      setWoDocxLoading(false)
    }
  }

  // Comment AI Help state
  const [commentAiModalOpen, setCommentAiModalOpen] = useState(false)
  const [commentAiTarget, setCommentAiTarget] = useState(null) // { user_id, nama }
  const [commentAiInput, setCommentAiInput] = useState({ star1: '', star2: '', wish: '' })
  const [commentAiLoading, setCommentAiLoading] = useState(false)
  const [commentAiResult, setCommentAiResult] = useState('')
  const [commentAiError, setCommentAiError] = useState('')
  const [commentAiContradiction, setCommentAiContradiction] = useState(null) // { reason: '...' }
  const [commentAiRefining, setCommentAiRefining] = useState(false)
  const [commentRefiningId, setCommentRefiningId] = useState(null) // user_id being refined inline
  // Refine modal state
  const [refineModalOpen, setRefineModalOpen] = useState(false)
  const [refineModalTarget, setRefineModalTarget] = useState(null) // { user_id, nama }
  const [refineOriginal, setRefineOriginal] = useState('')
  const [refineLoading, setRefineLoading] = useState(false)
  const [refineResult, setRefineResult] = useState(null) // null | { no_change: bool, reason: string, refined: string }
  const [refineError, setRefineError] = useState('')
  
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
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0, name: '' })
  const [reportMode, setReportMode] = useState('single') // 'single' or 'class'
  const [includeCpPage, setIncludeCpPage] = useState(true) // whether to include CP pages in PDF
  
  // Class Recap state (for assessment tab)
  const [recapSemesterFilter, setRecapSemesterFilter] = useState('')
  const [loadingClassRecap, setLoadingClassRecap] = useState(false)
  
  // Comment tab state
  const [commentYear, setCommentYear] = useState('')
  const [commentSubject, setCommentSubject] = useState('')
  const [commentKelas, setCommentKelas] = useState('')
  const [commentKelasOptions, setCommentKelasOptions] = useState([])
  const [commentSemester, setCommentSemester] = useState('')
  const [commentStudents, setCommentStudents] = useState([])
  const [commentStudentGrades, setCommentStudentGrades] = useState({}) // { [user_id]: [{name, A, B, C, D}] }
  const [loadingComments, setLoadingComments] = useState(false)
  const [loadingCommentKelas, setLoadingCommentKelas] = useState(false)
  const [savingCommentId, setSavingCommentId] = useState(null)

  // Mentor Comment tab state
  const [isWaliKelas, setIsWaliKelas] = useState(false)
  const [mentorKelasOptions, setMentorKelasOptions] = useState([])
  const [mentorYear, setMentorYear] = useState('')
  const [mentorKelas, setMentorKelas] = useState('')
  const [mentorSemester, setMentorSemester] = useState('')
  const [mentorStudents, setMentorStudents] = useState([])
  const [loadingMentorComments, setLoadingMentorComments] = useState(false)
  const [savingMentorCommentId, setSavingMentorCommentId] = useState(null)

  // Daily Attendance state (kelas_attendance table)
  const [attendanceDate, setAttendanceDate] = useState(() => new Date().toLocaleDateString('en-CA'))
  const [attendanceRecords, setAttendanceRecords] = useState({}) // { [detail_siswa_id]: { status, keterangan, id } }
  const [loadingAttendance, setLoadingAttendance] = useState(false)
  const [savingAttendanceId, setSavingAttendanceId] = useState(null)
  const [attendanceStudents, setAttendanceStudents] = useState([]) // [{detail_siswa_id, nama}]
  const [attendanceExpanded, setAttendanceExpanded] = useState(true)

  // Wizard/Stepper state for Add Mode
  const [currentStep, setCurrentStep] = useState(0)
  const [wizardYear, setWizardYear] = useState('') // Selected year in wizard step 0
  
  // Assessment data for wizard step 7 (after formative assessment)
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
      fields: ['topic_key_concept', 'topic_related_concept', 'topic_global_context', 'topic_gc_exploration'],
      guidance: 'Key Concepts are 16 broad, transferable ideas in IB MYP (select 1-3). Related Concepts are subject-specific and vary by discipline (enter as comma-separated). Global Context connects learning to real-world issues that transcend subject boundaries.'
    },
    {
      id: 'statement',
      title: 'Statement of Inquiry',
      description: 'Create the statement that synthesizes concepts and context',
      fields: ['topic_conceptual_understanding', 'topic_statement'],
      guidance: 'Conceptual Understanding describes what students will come to understand through this unit — the big ideas and deep conceptual learning. The Statement of Inquiry integrates Key Concept + Related Concept + Global Context into a clear statement that guides the entire unit.'
    },
    {
      id: 'attributes',
      title: 'Learner Profile & Service',
      description: 'Define IB learner attributes and service learning opportunities',
      fields: ['topic_learner_profile', 'topic_service_learning'],
      guidance: 'Select IB Learner Profile attributes (e.g., Inquirers, Thinkers, Communicators) students will develop. Identify opportunities for service learning and action.'
    },
    {
      id: 'formativeAssessment',
      title: 'Formative Assessment',
      description: 'Plan formative assessments to monitor student learning progress',
      fields: ['topic_formative_assessment'],
      guidance: 'Formative assessments are ongoing assessments used to monitor student learning and provide feedback. They help teachers adjust instruction and help students identify areas for improvement. Examples include exit tickets, quizzes, peer assessments, journal reflections, and class discussions.'
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
  
  // Persist tab + assessment filters across navigation
  useEffect(() => {
    if (typeof window !== 'undefined') localStorage.setItem('topic_active_tab', activeTab)
  }, [activeTab])

  useEffect(() => {
    if (typeof window !== 'undefined') localStorage.setItem('assessment_filters', JSON.stringify(assessmentFilters))
  }, [assessmentFilters])

  // Fetch kelas where logged-in user is wali kelas (or all kelas for admin)
  // When mentorYear changes, reload kelas options filtered by that year
  // Uses /api/class/list (SERVICE_ROLE_KEY) to bypass RLS — anon client is blocked in production.
  useEffect(() => {
    if (!currentUserId) return
    const fetchWaliKelas = async () => {
      try {
        const adminRole = isAdminLike(userRole)

        // For admin: show Mentor tab immediately before data arrives
        if (adminRole) setIsWaliKelas(true)

        // Always use the API route (supabaseAdmin / SERVICE_ROLE_KEY) — never the anon client.
        // The anon client is blocked by RLS on the `kelas` table in production.
        const params = new URLSearchParams()
        if (!adminRole) params.set('user_id', String(currentUserId))
        if (mentorYear) params.set('year_id', String(mentorYear))

        const res = await fetch(`/api/class/list?${params}`)
        if (!res.ok) {
          console.warn('[fetchWaliKelas] API error:', res.status)
          if (!adminRole) { setIsWaliKelas(false); setMentorKelasOptions([]) }
          return
        }

        const json = await res.json()
        const data = json.data || []

        if (adminRole) {
          // Admin always sees tab; populate dropdown with all classes
          setMentorKelasOptions(data)
        } else {
          // Regular user: show tab only if they are wali kelas for ≥1 class
          setIsWaliKelas(data.length > 0)
          setMentorKelasOptions(data)
        }

        // Reset selection when year changes
        setMentorKelas('')
        setMentorSemester('')
        setMentorStudents([])
      } catch (err) {
        console.error('[fetchWaliKelas] Error:', err)
        // Failsafe: admin always sees tab even on network error
        if (isAdminLike(userRole)) setIsWaliKelas(true)
      }
    }
    fetchWaliKelas()
  }, [currentUserId, userRole, mentorYear])

  // Get current user ID
  useEffect(() => {
    const userData = localStorage.getItem('user_data')
    const kr_id = localStorage.getItem('kr_id')
    const role = localStorage.getItem('user_role')
    console.log('🔍 User data from localStorage:', userData)

    // Set current user ID and role
    if (kr_id) {
      setCurrentUserId(parseInt(kr_id))
    }
    if (role) {
      setUserRole(role)
    }

    // Read isCurriculum / isPrincipal / isAdmin flags synchronously before calling fetch functions
    let isCurriculum = false
    let isAdminFlag = false
    if (userData) {
      try {
        const parsedCheck = JSON.parse(userData)
        // Full subject access: is_admin flag, curriculum, or principal
        isCurriculum = !!parsedCheck.isCurriculum || !!parsedCheck.isPrincipal
        isAdminFlag = !!parsedCheck.isAdmin
        setUserIsCurriculum(isCurriculum)
        setUserIsAdmin(isAdminFlag)
      } catch (e) {}
    }

    if (userData) {
      try {
        const parsed = JSON.parse(userData)
        console.log('📋 Parsed user data:', parsed)
        // Try multiple possible keys for user ID
        const userId = parsed.userID || parsed.user_id || parsed.userId || parsed.id
        console.log('👤 User ID:', userId)
        if (userId) {
          fetchSubjects(userId, role, isCurriculum, isAdminFlag)
          fetchDetailKelasForAssessment(userId, role, isCurriculum, isAdminFlag)
          fetchAllKelas(userId, role, isCurriculum, isAdminFlag) // Fetch all kelas for filter dropdown
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

  // Fetch all kelas for filter dropdown AND compute allowedKelasRaw (user-filtered).
  // allowedKelasRaw contains only kelas where the logged-in user is a teacher:
  //   - teacher_user_id = userId (explicit override in detail_kelas), OR
  //   - teacher_user_id IS NULL and subject.subject_user_id = userId (default teacher)
  //   - Excluded: teacher_user_id != null and teacher_user_id != userId (another teacher replaced them)
  const fetchAllKelas = async (userId, role, isCurriculum = false, isAdminFlag = false) => {
    try {
      const isAdminUser = (role?.toLowerCase() === 'admin') || isAdminFlag || isCurriculum

      const { data: kelasData, error: kelasError } = await supabase
        .from('kelas')
        .select('kelas_id, kelas_nama, kelas_year_id')
        .order('kelas_nama')
      if (kelasError) throw kelasError

      const { data: yearData, error: yearError } = await supabase
        .from('year')
        .select('year_id, year_name, start_date, end_date')
        .order('year_name', { ascending: false })
      if (yearError) throw yearError

      setAllKelasRaw(kelasData || [])
      setYearOptions(yearData || [])

      // For the list/filter dropdown, still show all kelas
      let filteredForDropdown = kelasData || []

      // Auto-select the year whose range contains today
      const today = new Date()
      const current = (yearData || []).find(y => {
        if (!y.start_date || !y.end_date) return false
        return new Date(y.start_date) <= today && today <= new Date(y.end_date)
      })
      if (current) {
        filteredForDropdown = kelasData.filter(k => String(k.kelas_year_id) === String(current.year_id))
        setAllKelas(filteredForDropdown)
        setFilters(prev => ({ ...prev, year: String(current.year_id) }))
      } else {
        setAllKelas(kelasData || [])
      }

      // Compute allowedKelasRaw: kelas user is permitted to teach
      if (isAdminUser) {
        // Admin can create unit in any class
        setAllowedKelasRaw(kelasData || [])
      } else if (userId) {
        // 1. Get all subjects owned by the user (global default teacher)
        const { data: ownedSubjects } = await supabase
          .from('subject')
          .select('subject_id')
          .eq('subject_user_id', userId)
        const ownedSubjectIds = new Set((ownedSubjects || []).map(s => s.subject_id))

        // 2. Get all detail_kelas rows relevant to user's subjects OR teacher override
        const { data: allDetailKelas } = await supabase
          .from('detail_kelas')
          .select('detail_kelas_kelas_id, detail_kelas_subject_id, teacher_user_id')

        const allowedKelasIds = new Set()
        for (const dk of (allDetailKelas || [])) {
          if (dk.teacher_user_id) {
            // Explicit override: only allowed if override is for this user
            if (dk.teacher_user_id === userId) {
              allowedKelasIds.add(dk.detail_kelas_kelas_id)
            }
          } else {
            // No override: allowed if user owns the subject globally
            if (ownedSubjectIds.has(dk.detail_kelas_subject_id)) {
              allowedKelasIds.add(dk.detail_kelas_kelas_id)
            }
          }
        }

        const allowed = (kelasData || []).filter(k => allowedKelasIds.has(k.kelas_id))
        setAllowedKelasRaw(allowed)
        console.log('📚 Allowed kelas for wizard:', allowed.length, 'of', kelasData?.length)
      } else {
        setAllowedKelasRaw([])
      }

      console.log('📚 All kelas loaded for filter:', kelasData)
    } catch (err) {
      console.error('❌ Error fetching all kelas:', err)
    }
  }

  // Fetch subjects that the current user teaches in the given kelas.
  // Rules (same as the allowed-kelas logic but per-subject per-class):
  //   - detail_kelas row for this kelas where teacher_user_id = userId (override), OR
  //   - detail_kelas row for this kelas where teacher_user_id IS NULL and subject.subject_user_id = userId
  const fetchSubjectsForKelas = async (kelasId) => {
    if (!kelasId) {
      setSubjectsForSelectedKelas([])
      return
    }
    try {
      const userData = localStorage.getItem('user_data')
      const role = localStorage.getItem('user_role')
      let userId = null
      let isAdminUser = false
      if (userData) {
        const parsed = JSON.parse(userData)
        userId = parsed.userID || parsed.user_id || parsed.userId || parsed.id
        const isCurr = !!parsed.isCurriculum || !!parsed.isPrincipal
        const isAdmF = !!parsed.isAdmin
        isAdminUser = (role?.toLowerCase() === 'admin') || isAdmF || isCurr
      }

      // Get all detail_kelas rows for this kelas
      const { data: detailRows, error: detailErr } = await supabase
        .from('detail_kelas')
        .select('detail_kelas_subject_id, teacher_user_id')
        .eq('detail_kelas_kelas_id', kelasId)
      if (detailErr) throw detailErr

      let allowedSubjectIds
      if (isAdminUser) {
        allowedSubjectIds = (detailRows || []).map(d => d.detail_kelas_subject_id)
      } else {
        // Get subjects owned by user
        const { data: ownedSubjects } = await supabase
          .from('subject')
          .select('subject_id')
          .eq('subject_user_id', userId)
        const ownedSubjectIds = new Set((ownedSubjects || []).map(s => s.subject_id))

        allowedSubjectIds = (detailRows || [])
          .filter(d => {
            if (d.teacher_user_id) return d.teacher_user_id === userId
            return ownedSubjectIds.has(d.detail_kelas_subject_id)
          })
          .map(d => d.detail_kelas_subject_id)
      }

      if (allowedSubjectIds.length === 0) {
        setSubjectsForSelectedKelas([])
        return
      }

      const { data: subjectData, error: subjectErr } = await supabase
        .from('subject')
        .select('subject_id, subject_name')
        .in('subject_id', allowedSubjectIds)
        .order('subject_name')
      if (subjectErr) throw subjectErr

      setSubjectsForSelectedKelas(subjectData || [])
      console.log('📚 Subjects for kelas', kelasId, ':', subjectData?.length)
    } catch (err) {
      console.error('❌ Error fetching subjects for kelas:', err)
      setSubjectsForSelectedKelas([])
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
      
      // Also fetch criteria for this subject (for wizard step 7)
      fetchCriteriaForSubject(subjectId)
    } catch (err) {
      console.error('❌ Error fetching kelas:', err)
      setAllKelas([])
    } finally {
      setKelasLoading(false)
    }
  }
  
  // Fetch criteria for a subject (used in wizard step 7)
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
  const fetchSubjects = async (userId, role, isCurriculum = false, isAdminFlag = false) => {
    try {
      console.log('🔍 Fetching subjects for user:', userId, 'role:', role, 'isCurriculum:', isCurriculum, 'isAdmin:', isAdminFlag)
      const isAdmin = (role?.toLowerCase() === 'admin') || isAdminFlag || isCurriculum

      let subjectIds = []

      if (!isAdmin) {
        // 1. Subjects where user is global owner
        const { data: ownedSubjects } = await supabase
          .from('subject')
          .select('subject_id')
          .eq('subject_user_id', userId)
        const ownedIds = (ownedSubjects || []).map(s => s.subject_id)

        // 2. Subjects assigned to this teacher via detail_kelas override
        const { data: overrideDetails } = await supabase
          .from('detail_kelas')
          .select('detail_kelas_subject_id')
          .eq('teacher_user_id', userId)
        const overrideIds = (overrideDetails || []).map(d => d.detail_kelas_subject_id)

        // Union of both
        subjectIds = [...new Set([...ownedIds, ...overrideIds])]
      }

      let query = supabase
        .from('subject')
        .select('subject_id, subject_name, subject_guide, custom_grade_boundaries')
      if (!isAdmin) {
        if (subjectIds.length === 0) {
          setSubjects([])
          setLoading(false)
          return
        }
        query = query.in('subject_id', subjectIds)
      }
      const { data, error } = await query.order('subject_name')
      
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
          topic_gc_exploration,
          topic_key_concept,
          topic_related_concept,
          topic_statement,
          topic_conceptual_understanding,
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
          
          // Fetch subjects (include subject_user_id so teacher reflects current subject owner)
          if (subjectIds.length > 0) {
            const { data: subjectsData, error: sError } = await supabase
              .from('subject')
              .select('subject_id, subject_name, subject_user_id')
              .in('subject_id', subjectIds)
            
            if (!sError && subjectsData) {
              subjectsData.forEach(s => subjectMap.set(s.subject_id, { name: s.subject_name, user_id: s.subject_user_id }))
            }
          }
          
          // Fetch kelas
          if (kelasIds.length > 0) {
            const { data: kelasData, error: kError } = await supabase
              .from('kelas')
              .select('kelas_id, kelas_nama, kelas_year_id')
              .in('kelas_id', kelasIds)
            
            if (!kError && kelasData) {
              kelasData.forEach(k => kelasMap.set(k.kelas_id, { nama: k.kelas_nama, year_id: k.kelas_year_id }))
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
      
      // Get unique user IDs — collect both assessment creators and current subject teachers
      const assessmentUserIds = assessmentsData?.map(a => a.assessment_user_id).filter(Boolean) || []
      const subjectUserIds = [...subjectMap.values()].map(v => v?.user_id).filter(Boolean)
      const userIds = [...new Set([...assessmentUserIds, ...subjectUserIds])]
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
      
      // Fetch graded student counts per assessment
      let gradedCountMap = new Map() // assessment_id -> count
      if (assessmentIds.length > 0) {
        const { data: gradesCountData } = await supabase
          .from('assessment_grades')
          .select('assessment_id')
          .in('assessment_id', assessmentIds)
        if (gradesCountData) {
          gradesCountData.forEach(g => {
            gradedCountMap.set(g.assessment_id, (gradedCountMap.get(g.assessment_id) || 0) + 1)
          })
        }
      }

      // Fetch total students per kelas
      const allKelasIds = [...kelasMap.keys()]
      let studentCountMap = new Map() // kelas_id -> count
      if (allKelasIds.length > 0) {
        const { data: studentCountData } = await supabase
          .from('detail_siswa')
          .select('detail_siswa_kelas_id')
          .in('detail_siswa_kelas_id', allKelasIds)
        if (studentCountData) {
          studentCountData.forEach(ds => {
            studentCountMap.set(ds.detail_siswa_kelas_id, (studentCountMap.get(ds.detail_siswa_kelas_id) || 0) + 1)
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
          subject_name: subjectMap.get(detailKelas.subject_id)?.name || 'N/A',
          kelas_id: detailKelas.kelas_id,
          kelas_nama: kelasMap.get(detailKelas.kelas_id)?.nama || '',
          kelas_year_id: kelasMap.get(detailKelas.kelas_id)?.year_id || null,
          teacher_name: userMap.get(subjectMap.get(detailKelas.subject_id)?.user_id) || userMap.get(a.assessment_user_id) || 'Unknown',
          topic_nama: topicData.nama || null,
          topic_urutan: topicData.urutan || 999,
          criteria: criteria, // Array of { code, name }
          graded_count: gradedCountMap.get(a.assessment_id) || 0,
          total_students: studentCountMap.get(detailKelas.kelas_id) || 0
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
  const fetchDetailKelasForAssessment = async (userId, role, isCurriculum = false, isAdminFlag = false) => {
    try {
      const isAdmin = (role?.toLowerCase() === 'admin') || isAdminFlag || isCurriculum

      let subjectIds = []

      if (!isAdmin) {
        // 1. Subjects where user is global owner
        const { data: ownedSubjects } = await supabase
          .from('subject')
          .select('subject_id')
          .eq('subject_user_id', userId)
        const ownedIds = (ownedSubjects || []).map(s => s.subject_id)

        // 2. detail_kelas where teacher is overridden to this user
        const { data: overrideDetails } = await supabase
          .from('detail_kelas')
          .select('detail_kelas_subject_id')
          .eq('teacher_user_id', userId)
        const overrideSubjectIds = (overrideDetails || []).map(d => d.detail_kelas_subject_id)

        subjectIds = [...new Set([...ownedIds, ...overrideSubjectIds])]
      }

      // Get subjects
      let subjectQuery = supabase
        .from('subject')
        .select('subject_id, subject_name')
      if (!isAdmin) {
        if (subjectIds.length === 0) {
          setDetailKelasOptions([])
          return
        }
        subjectQuery = subjectQuery.in('subject_id', subjectIds)
      }
      const { data: subjectsData, error: subjectsError } = await subjectQuery.order('subject_name')
      
      if (subjectsError) throw subjectsError
      if (!subjectsData || subjectsData.length === 0) {
        setDetailKelasOptions([])
        return
      }
      
      const allSubjectIds = subjectsData.map(s => s.subject_id)
      
      // Get detail_kelas — but for non-admin, only rows where:
      //   teacher_user_id = userId (override) OR (teacher_user_id IS NULL AND subject belongs to user)
      let detailQuery = supabase
        .from('detail_kelas')
        .select('detail_kelas_id, detail_kelas_subject_id, detail_kelas_kelas_id, teacher_user_id')
        .in('detail_kelas_subject_id', allSubjectIds)
      const { data: details, error: detailErr } = await detailQuery
      
      if (detailErr) throw detailErr
      if (!details || details.length === 0) {
        setDetailKelasOptions([])
        return
      }

      // For non-admin: filter to only rows where this teacher is responsible
      const filteredDetails = isAdmin ? details : details.filter(d => {
        if (d.teacher_user_id) return d.teacher_user_id === userId
        // No override — check if user owns the subject globally
        const { data: ownedSubjects } = { data: null } // already computed above in subjectIds
        return subjectIds.includes(d.detail_kelas_subject_id)
      })
      
      const kelasIds = Array.from(new Set(filteredDetails.map(d => d.detail_kelas_kelas_id)))
      
      // Get kelas names
      const { data: kelasData, error: kelasErr } = await supabase
        .from('kelas')
        .select('kelas_id, kelas_nama')
        .in('kelas_id', kelasIds)
      
      if (kelasErr) throw kelasErr
      
      const kelasMap = new Map((kelasData || []).map(k => [k.kelas_id, k.kelas_nama]))
      const subjectMap = new Map((subjectsData || []).map(s => [s.subject_id, s.subject_name]))
      
      const options = filteredDetails.map(d => ({
        detail_kelas_id: d.detail_kelas_id,
        subject_id: d.detail_kelas_subject_id,
        subject_name: subjectMap.get(d.detail_kelas_subject_id) || 'Unknown Subject',
        kelas_id: d.detail_kelas_kelas_id,
        kelas_nama: kelasMap.get(d.detail_kelas_kelas_id)?.nama || '-'
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
  const [deletedWeeklyPlanIds, setDeletedWeeklyPlanIds] = useState([])

  const unpackWeeklyPlanRows = (rows) => {
    const unpacked = [];
    (rows || []).forEach(row => {
      if (row.week_objectives && row.week_objectives.trim().startsWith('[')) {
        try {
          const parsed = JSON.parse(row.week_objectives)
          if (Array.isArray(parsed) && parsed.length > 0) {
            parsed.forEach((item, idx) => {
              unpacked.push({
                id: row.id,
                topic_id: row.topic_id,
                week_number: row.week_number,
                _sessionIndex: idx,
                _tempId: `sess_${row.id}_${idx}`,
                week_date: item.week_date !== undefined ? item.week_date : (idx === 0 ? (row.week_date || '') : ''),
                week_objectives: item.week_objectives || '',
                week_activities: item.week_activities || '',
                week_resources: item.week_resources || '',
                week_reflection: item.week_reflection || '',
              })
            })
            return
          }
        } catch (e) {}
      }
      unpacked.push(row)
    })
    return unpacked
  }

  const fetchWeeklyPlans = async (topicId) => {
    try {
      setLoadingWeeklyPlans(true)
      setDeletedWeeklyPlanIds([])
      const { data, error } = await supabase
        .from('topic_weekly_plan')
        .select('*')
        .eq('topic_id', topicId)
        .order('week_number')
      
      if (error) throw error
      setWeeklyPlans(unpackWeeklyPlanRows(data))
    } catch (err) {
      console.error('Error fetching weekly plans:', err)
      setWeeklyPlans([])
    } finally {
      setLoadingWeeklyPlans(false)
    }
  }
  
  const handleWeeklyPlanChange = (targetPlan, field, value) => {
    setWeeklyPlans(prev => 
      prev.map(plan => {
        const isMatch = (plan.id && targetPlan.id && plan._sessionIndex !== undefined)
          ? (plan.id === targetPlan.id && plan._sessionIndex === targetPlan._sessionIndex)
          : (plan.id ? plan.id === targetPlan.id : plan._tempId === targetPlan._tempId)
        return isMatch ? { ...plan, [field]: value } : plan
      })
    )
  }

  const handleAddSessionToWeek = (weekNumber) => {
    setWeeklyPlans(prev => [
      ...prev,
      {
        _tempId: `temp_${Date.now()}_${Math.random()}`,
        topic_id: selectedTopicForWeekly?.topic_id,
        week_number: weekNumber,
        week_date: '',
        week_objectives: '',
        week_activities: '',
        week_resources: '',
        week_reflection: '',
      }
    ])
  }

  const handleRemoveSession = (planToRemove) => {
    setWeeklyPlans(prev =>
      prev.filter(plan => {
        if (plan.id && planToRemove.id && plan._sessionIndex !== undefined) {
          return !(plan.id === planToRemove.id && plan._sessionIndex === planToRemove._sessionIndex)
        }
        return plan.id ? plan.id !== planToRemove.id : plan._tempId !== planToRemove._tempId
      })
    )
  }
  
  const saveWeeklyPlans = async () => {
    if (!selectedTopicForWeekly) return
    
    try {
      setSavingWeeklyPlans(true)

      const duration = selectedTopicForWeekly.topic_duration || 5
      const rowsToUpsert = []

      for (let w = 1; w <= duration; w++) {
        const weekSessions = weeklyPlans.filter(p => p.week_number === w)
        if (weekSessions.length === 0) continue

        if (weekSessions.length === 1) {
          const s = weekSessions[0]
          rowsToUpsert.push({
            id: s.id || undefined,
            topic_id: selectedTopicForWeekly.topic_id,
            week_number: w,
            week_date: s.week_date || null,
            week_objectives: s.week_objectives || null,
            week_activities: s.week_activities || null,
            week_resources: s.week_resources || null,
            week_reflection: s.week_reflection || null,
            updated_at: new Date().toISOString()
          })
        } else {
          const sessionList = weekSessions.map(s => ({
            week_date: s.week_date || '',
            week_objectives: s.week_objectives || '',
            week_activities: s.week_activities || '',
            week_resources: s.week_resources || '',
            week_reflection: s.week_reflection || '',
          }))
          const firstId = weekSessions.find(s => s.id)?.id
          const firstDate = weekSessions.find(s => s.week_date)?.week_date || null

          rowsToUpsert.push({
            id: firstId || undefined,
            topic_id: selectedTopicForWeekly.topic_id,
            week_number: w,
            week_date: firstDate,
            week_objectives: JSON.stringify(sessionList),
            week_activities: weekSessions[0]?.week_activities || null,
            week_resources: weekSessions[0]?.week_resources || null,
            week_reflection: weekSessions[0]?.week_reflection || null,
            updated_at: new Date().toISOString()
          })
        }
      }

      if (rowsToUpsert.length > 0) {
        const { error } = await supabase
          .from('topic_weekly_plan')
          .upsert(rowsToUpsert, { onConflict: 'topic_id,week_number' })

        if (error) throw error
      }
      
      setWeeklyPlanNotification({
        show: true,
        message: t('topicNew.weeklyPlanTab.savedSuccess'),
        type: 'success'
      })
      
      await fetchWeeklyPlans(selectedTopicForWeekly.topic_id)
      
      setTimeout(() => {
        setWeeklyPlanNotification({ show: false, message: '', type: 'success' })
      }, 3000)
    } catch (err) {
      console.error('Error saving weekly plans:', err)
      setWeeklyPlanNotification({
        show: true,
        message: t('topicNew.weeklyPlanTab.savedError'),
        type: 'error'
      })
    } finally {
      setSavingWeeklyPlans(false)
    }
  }
  
  const deleteAllWeeklyPlans = async () => {
    if (!selectedTopicForWeekly) return
    
    const confirmed = confirm(
      t('topicNew.weeklyPlanTab.deleteConfirm').replace('{name}', selectedTopicForWeekly.topic_nama)
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
        message: t('topicNew.weeklyPlanTab.deletedSuccess'),
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
        message: t('topicNew.weeklyPlanTab.deletedError'),
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
        
        setWeeklyPlans(unpackWeeklyPlanRows(insertedPlans || newPlans))
      } else {
        // Plans exist, load them and unpack JSON multi-sessions
        setWeeklyPlans(unpackWeeklyPlanRows(existingPlans))
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
          // Pending: full update
          // TEMP: bypass approval — status set to 1 (approved) directly
          // const selectedDate = new Date(assessmentFormData.assessment_tanggal)
          // selectedDate.setHours(0, 0, 0, 0)
          // const today = new Date()
          // today.setHours(0, 0, 0, 0)
          // const diffDays = getDaysDifference(today, selectedDate)
          // const computedStatus = diffDays >= 2 && diffDays <= 6 ? 3 : 0
          
          assessmentData = {
            assessment_nama: assessmentFormData.assessment_nama.trim(),
            assessment_tanggal: assessmentFormData.assessment_tanggal,
            assessment_keterangan: assessmentFormData.assessment_keterangan.trim() || null,
            assessment_status: 1, // TEMP: auto-approved, no approval flow needed
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
        
        // TEMP: bypass approval — status set to 1 (approved) directly
        // Determine status based on date difference: 2-6 days => waiting for principal approval (3)
        // const selectedDate = new Date(assessmentFormData.assessment_tanggal)
        // selectedDate.setHours(0, 0, 0, 0)
        // const today = new Date()
        // today.setHours(0, 0, 0, 0)
        // const diffDays = getDaysDifference(today, selectedDate)
        // const computedStatus = diffDays >= 2 && diffDays <= 6 ? 3 : 0
        
        const assessmentData = {
          assessment_nama: assessmentFormData.assessment_nama.trim(),
          assessment_tanggal: assessmentFormData.assessment_tanggal,
          assessment_keterangan: assessmentFormData.assessment_keterangan.trim() || null,
          assessment_status: 1, // TEMP: auto-approved, no approval flow needed
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
        
        // TEMP: approval notifications disabled (bypass approval flow)
        // if (data && data[0]) {
        //   notifyVicePrincipal(data[0].assessment_id)
        // }
        
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
  
  // Fetch assessments when tab changes OR when subjects finish loading while on assessment tab
  useEffect(() => {
    if (activeTab === 'assessment' && subjects.length > 0 && assessments.length === 0) {
      fetchAssessments()
    }
  }, [activeTab, subjects])
  
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
  
  // Generate and open report as printable HTML
  const generateReport = async () => {
    await generateStudentReportHTML({
      reportFilters,
      reportStudents,
      reportKelasOptions,
      reportYears,
      setLoadingReport,
      includeCpPage,
      onError: (err) => alert('Gagal menghasilkan report: ' + err.message)
    })
  }
  
  // Generate all student reports as ZIP
  const generateAllReports = async () => {
    setBatchProgress({ current: 0, total: reportStudents.length, name: '' })
    await generateClassReportZIP({
      reportFilters,
      reportStudents,
      reportKelasOptions,
      reportYears,
      subjects,
      setLoadingReport,
      includeCpPage,
      onProgress: (current, total, name) => setBatchProgress({ current, total, name }),
      onError: (err) => alert('Gagal menghasilkan report kelas: ' + err.message)
    })
    setBatchProgress({ current: 0, total: 0, name: '' })
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
  
  // ==========================================
  // COMMENT TAB FUNCTIONS
  // ==========================================
  
  const handleCommentSubjectChange = async (subjectId) => {
    setCommentSubject(subjectId)
    setCommentKelas('')
    setCommentSemester('')
    setCommentKelasOptions([])
    setCommentStudents([])
    
    if (!subjectId) return
    
    try {
      setLoadingCommentKelas(true)
      // Get kelas linked to this subject via detail_kelas
      const { data: detailKelasData, error: dkError } = await supabase
        .from('detail_kelas')
        .select('detail_kelas_kelas_id')
        .eq('detail_kelas_subject_id', subjectId)
      
      if (dkError) throw dkError
      if (!detailKelasData || detailKelasData.length === 0) return
      
      const kelasIds = [...new Set(detailKelasData.map(d => d.detail_kelas_kelas_id))]
      let kelasQuery = supabase
        .from('kelas')
        .select('kelas_id, kelas_nama, kelas_year_id')
        .in('kelas_id', kelasIds)
        .order('kelas_nama')
      // Filter by selected year if one is chosen
      if (commentYear) kelasQuery = kelasQuery.eq('kelas_year_id', commentYear)
      const { data: kelasData, error: kError } = await kelasQuery
      
      if (kError) throw kError
      setCommentKelasOptions(kelasData || [])
    } catch (err) {
      console.error('Error fetching comment kelas:', err)
    } finally {
      setLoadingCommentKelas(false)
    }
  }
  
  const handleCommentKelasChange = (kelasId) => {
    setCommentKelas(kelasId)
    setCommentSemester('')
    setCommentStudents([])
  }
  
  const fetchCommentStudents = async (subjectId, kelasId, semester) => {
    if (!subjectId || !kelasId || !semester) {
      setCommentStudents([])
      return
    }
    
    try {
      setLoadingComments(true)
      
      // 1. Get students in this kelas
      const { data: detailSiswaData, error: dsError } = await supabase
        .from('detail_siswa')
        .select('detail_siswa_id, detail_siswa_user_id')
        .eq('detail_siswa_kelas_id', kelasId)
      
      if (dsError) throw dsError
      if (!detailSiswaData || detailSiswaData.length === 0) {
        setCommentStudents([])
        return
      }
      
      const userIds = [...new Set(detailSiswaData.map(ds => ds.detail_siswa_user_id))]
      
      // 2. Get user names
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('user_id, user_nama_depan, user_nama_belakang')
        .in('user_id', userIds)
      
      if (usersError) throw usersError
      
      const userMap = new Map()
      ;(usersData || []).forEach(u => {
        userMap.set(u.user_id, `${u.user_nama_depan || ''} ${u.user_nama_belakang || ''}`.trim())
      })
      
      // 3. Get existing comments for this subject+kelas+semester
      const { data: commentsData, error: commentsError } = await supabase
        .from('subject_comment')
        .select('id, student_user_id, comment_text')
        .eq('subject_id', subjectId)
        .eq('kelas_id', kelasId)
        .eq('semester', parseInt(semester))
      
      if (commentsError) throw commentsError
      
      const commentMap = new Map()
      ;(commentsData || []).forEach(c => {
        commentMap.set(c.student_user_id, { id: c.id, text: c.comment_text || '' })
      })
      
      // 4. Build student list with comments
      const students = detailSiswaData.map(ds => {
        const existing = commentMap.get(ds.detail_siswa_user_id)
        return {
          detail_siswa_id: ds.detail_siswa_id,
          user_id: ds.detail_siswa_user_id,
          nama: userMap.get(ds.detail_siswa_user_id) || 'Unknown',
          comment_text: existing?.text || '',
          comment_id: existing?.id || null,
          saved: true
        }
      }).sort((a, b) => a.nama.localeCompare(b.nama))
      
      setCommentStudents(students)

      // 5. Fetch assessment grades for this subject+kelas+semester
      const gradesByStudent = {}
      try {
        // Get detail_kelas_id for this subject+kelas combo
        const { data: dkData } = await supabase
          .from('detail_kelas')
          .select('detail_kelas_id')
          .eq('detail_kelas_subject_id', subjectId)
          .eq('detail_kelas_kelas_id', kelasId)
          .maybeSingle()

        if (dkData?.detail_kelas_id) {
          // Get all assessments for this detail_kelas + semester
          const { data: assessmentsData } = await supabase
            .from('assessment')
            .select('assessment_id, assessment_nama')
            .eq('assessment_detail_kelas_id', dkData.detail_kelas_id)
            .in('assessment_status', [0, 1, 3])
            .eq('assessment_semester', parseInt(semester))
            .order('assessment_tanggal')

          const aList = assessmentsData || []
          const aIds = aList.map(a => a.assessment_id)
          const aNameMap = new Map(aList.map(a => [a.assessment_id, a.assessment_nama]))

          if (aIds.length > 0) {
            // Fetch all grades for all students at once
            const dsIds = detailSiswaData.map(ds => ds.detail_siswa_id)
            const { data: gradesData } = await supabase
              .from('assessment_grades')
              .select('assessment_id, detail_siswa_id, criterion_a_grade, criterion_b_grade, criterion_c_grade, criterion_d_grade')
              .in('assessment_id', aIds)
              .in('detail_siswa_id', dsIds)

            // Build detail_siswa_id → user_id map
            const dsToUser = new Map(detailSiswaData.map(ds => [ds.detail_siswa_id, ds.detail_siswa_user_id]))

            ;(gradesData || []).forEach(g => {
              const userId = dsToUser.get(g.detail_siswa_id)
              if (!userId) return
              if (!gradesByStudent[userId]) gradesByStudent[userId] = []
              // Only add if at least one criterion has a value
              const hasAny = g.criterion_a_grade !== null || g.criterion_b_grade !== null ||
                             g.criterion_c_grade !== null || g.criterion_d_grade !== null
              if (hasAny) {
                gradesByStudent[userId].push({
                  name: aNameMap.get(g.assessment_id) || '-',
                  A: g.criterion_a_grade,
                  B: g.criterion_b_grade,
                  C: g.criterion_c_grade,
                  D: g.criterion_d_grade,
                })
              }
            })
          }
        }
      } catch (gradeErr) {
        console.warn('Could not fetch grades for comment tab:', gradeErr)
      }
      setCommentStudentGrades(gradesByStudent)
    } catch (err) {
      console.error('Error fetching comment students:', err)
      alert('Gagal memuat data siswa: ' + err.message)
    } finally {
      setLoadingComments(false)
    }
  }
  
  const handleCommentSemesterChange = (semester) => {
    setCommentSemester(semester)
    if (semester && commentSubject && commentKelas) {
      fetchCommentStudents(commentSubject, commentKelas, semester)
    } else {
      setCommentStudents([])
    }
  }
  
  const updateCommentText = (userId, text) => {
    setCommentStudents(prev => prev.map(s =>
      s.user_id === userId ? { ...s, comment_text: text, saved: false } : s
    ))
  }

  const downloadCommentTemplate = async () => {
    try {
      const ExcelJS = (await import('exceljs')).default
      const workbook = new ExcelJS.Workbook()
      workbook.creator = 'School Admin'
      const sheet = workbook.addWorksheet('Comments')

      sheet.columns = [
        { header: 'No', key: 'no', width: 6 },
        { header: 'Student Name', key: 'nama', width: 32 },
        { header: 'Comment (fill this)', key: 'comment', width: 65 },
        { header: 'user_id (do not edit)', key: 'user_id', width: 20 },
      ]

      // Style header row
      const headerRow = sheet.getRow(1)
      headerRow.eachCell(cell => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } }
        cell.alignment = { vertical: 'middle', horizontal: 'center' }
        cell.border = { bottom: { style: 'thin', color: { argb: 'FF1D4ED8' } } }
      })
      headerRow.height = 20

      // Add student rows
      commentStudents.forEach((s, i) => {
        const row = sheet.addRow({
          no: i + 1,
          nama: s.nama,
          comment: s.comment_text || '',
          user_id: s.user_id,
        })
        // Gray out non-editable cells
        ;['no', 'nama', 'user_id'].forEach(key => {
          row.getCell(key).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } }
          row.getCell(key).font = { color: { argb: 'FF6B7280' } }
        })
        row.getCell('comment').alignment = { wrapText: true }
        row.height = 40
      })

      // Note at the bottom
      sheet.addRow([])
      const noteRow = sheet.addRow(['', '* Only edit the "Comment" column. Do not modify other columns.'])
      noteRow.getCell(2).font = { italic: true, color: { argb: 'FF9CA3AF' } }
      sheet.mergeCells(`B${noteRow.number}:D${noteRow.number}`)

      const subjectName = subjects.find(s => String(s.subject_id) === String(commentSubject))?.subject_name || 'subject'
      const buffer = await workbook.xlsx.writeBuffer()
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `comment_template_${subjectName.replace(/\s+/g, '_')}_sem${commentSemester}.xlsx`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      alert('Failed to generate template: ' + err.message)
    }
  }

  const handleCommentImport = async (file) => {
    if (!file) return
    try {
      const ExcelJS = (await import('exceljs')).default
      const workbook = new ExcelJS.Workbook()
      const arrayBuffer = await file.arrayBuffer()
      await workbook.xlsx.load(arrayBuffer)
      const sheet = workbook.getWorksheet(1)
      if (!sheet) throw new Error('No worksheet found in file')

      let updated = 0
      sheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return // skip header
        const userId = row.getCell(4).value // column D: user_id
        const rawComment = row.getCell(3).value // column C: comment
        if (!userId) return
        const comment = rawComment != null ? String(rawComment) : ''
        const student = commentStudents.find(s => String(s.user_id) === String(userId))
        if (student) {
          updateCommentText(student.user_id, comment)
          updated++
        }
      })

      alert(`Import successful! ${updated} comment(s) loaded. Click "Save All" to save.`)
    } catch (err) {
      alert('Failed to import file: ' + err.message)
    } finally {
      // Reset file input so same file can be re-imported
      if (commentImportRef.current) commentImportRef.current.value = ''
    }
  }
  
  const saveComment = async (student) => {
    if (!commentSubject || !commentKelas || !commentSemester) return
    
    try {
      setSavingCommentId(student.user_id)
      
      const payload = {
        subject_id: parseInt(commentSubject),
        kelas_id: parseInt(commentKelas),
        student_user_id: student.user_id,
        semester: parseInt(commentSemester),
        comment_text: student.comment_text?.trim() || null,
        updated_at: new Date().toISOString()
      }
      
      if (student.comment_id) {
        const { error } = await supabase
          .from('subject_comment')
          .update({ comment_text: payload.comment_text, updated_at: payload.updated_at })
          .eq('id', student.comment_id)
        if (error) throw error
      } else {
        const { data, error } = await supabase
          .from('subject_comment')
          .insert([payload])
          .select('id')
        if (error) throw error
        setCommentStudents(prev => prev.map(s =>
          s.user_id === student.user_id ? { ...s, comment_id: data?.[0]?.id, saved: true } : s
        ))
        return
      }
      
      setCommentStudents(prev => prev.map(s =>
        s.user_id === student.user_id ? { ...s, saved: true } : s
      ))
    } catch (err) {
      console.error('Error saving comment:', err)
      alert('Gagal menyimpan komentar: ' + err.message)
    } finally {
      setSavingCommentId(null)
    }
  }
  
  const saveAllComments = async () => {
    const unsaved = commentStudents.filter(s => !s.saved)
    if (unsaved.length === 0) return
    
    for (const student of unsaved) {
      await saveComment(student)
    }
  }

  const startCommentTour = async () => {
    const { driver } = await import('driver.js')
    const tour = t('topicNew.mentorCommentTab.tour')
    const driverObj = driver({
      showProgress: true,
      nextBtnText: tour.nextBtn,
      prevBtnText: tour.prevBtn,
      doneBtnText: tour.doneBtn,
      steps: [
        {
          element: '#comment-filter-section',
          popover: {
            title: tour.step1Title,
            description: tour.step1Desc,
            side: 'bottom',
            align: 'start',
          },
        },
        {
          element: '#comment-subject-select',
          popover: {
            title: tour.step2Title,
            description: tour.step2Desc,
            side: 'bottom',
            align: 'start',
          },
        },
        {
          element: '#comment-kelas-select',
          popover: {
            title: tour.step3Title,
            description: tour.step3Desc,
            side: 'bottom',
            align: 'start',
          },
        },
        {
          element: '#comment-semester-row',
          popover: {
            title: tour.step4Title,
            description: tour.step4Desc,
            side: 'bottom',
            align: 'start',
          },
        },
        {
          popover: {
            title: tour.step5Title,
            description: tour.step5Desc,
          },
        },
        {
          popover: {
            title: tour.step6Title,
            description: tour.step6Desc,
          },
        },
        {
          popover: {
            title: tour.step7Title,
            description: tour.step7Desc,
          },
        },
        {
          popover: {
            title: tour.step8Title,
            description: tour.step8Desc,
          },
        },
        {
          popover: {
            title: tour.step9Title,
            description: tour.step9Desc,
          },
        },
      ],
    })
    driverObj.drive()
  }

  // MENTOR COMMENT TAB FUNCTIONS
  // ==========================================

  const fetchMentorStudents = async (kelasId, semester) => {
    if (!kelasId || !semester) {
      setMentorStudents([])
      return
    }
    try {
      setLoadingMentorComments(true)

      // 1. Get students in this kelas
      const { data: detailSiswaData, error: dsError } = await supabase
        .from('detail_siswa')
        .select('detail_siswa_id, detail_siswa_user_id')
        .eq('detail_siswa_kelas_id', kelasId)

      if (dsError) throw dsError
      if (!detailSiswaData || detailSiswaData.length === 0) {
        setMentorStudents([])
        return
      }

      const userIds = [...new Set(detailSiswaData.map(ds => ds.detail_siswa_user_id))]

      // 2. Get user names
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('user_id, user_nama_depan, user_nama_belakang')
        .in('user_id', userIds)

      if (usersError) throw usersError

      const userMap = new Map()
      ;(usersData || []).forEach(u => {
        userMap.set(u.user_id, `${u.user_nama_depan || ''} ${u.user_nama_belakang || ''}`.trim())
      })

      // 3. Get existing mentor comments for this kelas+semester
      const { data: commentsData, error: commentsError } = await supabase
        .from('mentor_comment')
        .select('id, student_user_id, comment_text, absent, present, late, sick, excused')
        .eq('kelas_id', kelasId)
        .eq('semester', parseInt(semester))

      if (commentsError) throw commentsError

      const commentMap = new Map()
      ;(commentsData || []).forEach(c => {
        commentMap.set(c.student_user_id, {
          id: c.id,
          text: c.comment_text || '',
          absent: c.absent ?? 0,
          present: c.present ?? 0,
          late: c.late ?? 0,
          sick: c.sick ?? 0,
          excused: c.excused ?? 0
        })
      })

      // 4. Build student list with comments
      const students = detailSiswaData.map(ds => {
        const existing = commentMap.get(ds.detail_siswa_user_id)
        return {
          detail_siswa_id: ds.detail_siswa_id,
          user_id: ds.detail_siswa_user_id,
          nama: userMap.get(ds.detail_siswa_user_id) || 'Unknown',
          comment_text: existing?.text || '',
          absent: existing?.absent ?? 0,
          present: existing?.present ?? 0,
          late: existing?.late ?? 0,
          sick: existing?.sick ?? 0,
          excused: existing?.excused ?? 0,
          comment_id: existing?.id || null,
          saved: true
        }
      }).sort((a, b) => a.nama.localeCompare(b.nama))

      setMentorStudents(students)
    } catch (err) {
      console.error('Error fetching mentor students:', err)
      alert('Gagal memuat data siswa: ' + err.message)
    } finally {
      setLoadingMentorComments(false)
    }
  }

  const handleMentorKelasChange = (kelasId) => {
    setMentorKelas(kelasId)
    setMentorSemester('')
    setMentorStudents([])
  }

  const handleMentorSemesterChange = (semester) => {
    setMentorSemester(semester)
    if (semester && mentorKelas) {
      fetchMentorStudents(mentorKelas, semester)
    } else {
      setMentorStudents([])
    }
  }

  const updateMentorCommentText = (userId, text) => {
    setMentorStudents(prev => prev.map(s =>
      s.user_id === userId ? { ...s, comment_text: text, saved: false } : s
    ))
  }

  // ─── DAILY ATTENDANCE FUNCTIONS (via API route — bypasses RLS) ───────────

  // Load students + attendance records together via single API call
  const fetchDailyAttendance = useCallback(async (kelasId, date) => {
    if (!kelasId || !date) {
      setAttendanceStudents([])
      setAttendanceRecords({})
      return
    }
    setLoadingAttendance(true)
    try {
      const res = await fetch(`/api/kelas-attendance?kelas_id=${kelasId}&tanggal=${date}`)
      if (!res.ok) throw new Error(await res.text())
      const { students, records } = await res.json()
      setAttendanceStudents(students || [])
      setAttendanceRecords(records || {})
    } catch (err) {
      console.error('[attendance] fetchDailyAttendance error:', err)
    } finally {
      setLoadingAttendance(false)
    }
  }, [])

  // Keep fetchAttendanceStudents as alias (called on kelas change without date)
  const fetchAttendanceStudents = useCallback(async (kelasId) => {
    if (!kelasId) { setAttendanceStudents([]); setAttendanceRecords({}); return }
    // Students are fetched together with records in fetchDailyAttendance
    // This is only called to pre-load student list when kelas changes
    setLoadingAttendance(true)
    try {
      const res = await fetch(`/api/kelas-attendance?kelas_id=${kelasId}&tanggal=${attendanceDate}`)
      if (!res.ok) throw new Error(await res.text())
      const { students, records } = await res.json()
      setAttendanceStudents(students || [])
      setAttendanceRecords(records || {})
    } catch (err) {
      console.error('[attendance] fetchAttendanceStudents error:', err)
    } finally {
      setLoadingAttendance(false)
    }
  }, [attendanceDate])

  // Upsert single student attendance via API route
  const saveSingleAttendance = useCallback(async (detailSiswaId, status, keterangan) => {
    if (!mentorKelas || !attendanceDate || !detailSiswaId) return
    setSavingAttendanceId(detailSiswaId)
    try {
      const existing = attendanceRecords[detailSiswaId]
      const res = await fetch('/api/kelas-attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kelas_id: parseInt(mentorKelas),
          detail_siswa_id: detailSiswaId,
          tanggal: attendanceDate,
          status,
          keterangan: keterangan || '',
          created_by: currentUserId || null,
          existing_id: existing?.id || null,
        }),
      })
      if (!res.ok) throw new Error(await res.text())
      const saved = await res.json()
      setAttendanceRecords(prev => ({
        ...prev,
        [detailSiswaId]: { id: saved.id, status: saved.status, keterangan: saved.keterangan || '' }
      }))
    } catch (err) {
      console.error('[attendance] saveSingleAttendance error:', err)
    } finally {
      setSavingAttendanceId(null)
    }
  }, [mentorKelas, attendanceDate, attendanceRecords, currentUserId])

  // Mark all students as 'hadir' at once
  const markAllHadir = useCallback(async () => {
    for (const s of attendanceStudents) {
      await saveSingleAttendance(s.detail_siswa_id, 'hadir', '')
    }
  }, [attendanceStudents, saveSingleAttendance])

  // Clear all attendance for selected kelas + date
  const clearAttendance = useCallback(async () => {
    if (!mentorKelas || !attendanceDate) return
    const confirmMsg = t('topicNew.mentorCommentTab.dailyAttendance.confirmClear') || 'Clear all attendance records for this date?'
    if (!window.confirm(confirmMsg)) return
    setLoadingAttendance(true)
    try {
      const res = await fetch(`/api/kelas-attendance?kelas_id=${mentorKelas}&tanggal=${attendanceDate}`, { method: 'DELETE' })
      if (!res.ok) throw new Error(await res.text())
      setAttendanceRecords({})
    } catch (err) {
      console.error('[attendance] clearAttendance error:', err)
    } finally {
      setLoadingAttendance(false)
    }
  }, [mentorKelas, attendanceDate, t])

  // Fetch attendance students when kelas changes
  useEffect(() => {
    if (mentorKelas) {
      fetchAttendanceStudents(mentorKelas)
      fetchDailyAttendance(mentorKelas, attendanceDate)
    } else {
      setAttendanceStudents([])
      setAttendanceRecords({})
    }
  }, [mentorKelas, fetchAttendanceStudents, fetchDailyAttendance, attendanceDate])

  const updateMentorAttendance = (userId, field, value) => {
    const num = value === '' ? 0 : Math.max(0, parseInt(value) || 0)
    setMentorStudents(prev => prev.map(s =>
      s.user_id === userId ? { ...s, [field]: num, saved: false } : s
    ))
  }

  const saveMentorComment = async (student) => {
    if (!mentorKelas || !mentorSemester) return
    try {
      setSavingMentorCommentId(student.user_id)
      const payload = {
        kelas_id: parseInt(mentorKelas),
        student_user_id: student.user_id,
        semester: parseInt(mentorSemester),
        comment_text: student.comment_text?.trim() || null,
        absent: student.absent ?? 0,
        present: student.present ?? 0,
        late: student.late ?? 0,
        sick: student.sick ?? 0,
        excused: student.excused ?? 0,
        updated_at: new Date().toISOString()
      }
      if (student.comment_id) {
        const { error } = await supabase
          .from('mentor_comment')
          .update({
            comment_text: payload.comment_text,
            absent: payload.absent,
            present: payload.present,
            late: payload.late,
            sick: payload.sick,
            excused: payload.excused,
            updated_at: payload.updated_at
          })
          .eq('id', student.comment_id)
        if (error) throw error
      } else {
        const { data, error } = await supabase
          .from('mentor_comment')
          .insert([payload])
          .select('id')
        if (error) throw error
        setMentorStudents(prev => prev.map(s =>
          s.user_id === student.user_id ? { ...s, comment_id: data?.[0]?.id, saved: true } : s
        ))
        return
      }
      setMentorStudents(prev => prev.map(s =>
        s.user_id === student.user_id ? { ...s, saved: true } : s
      ))
    } catch (err) {
      console.error('Error saving mentor comment:', err)
      alert('Gagal menyimpan komentar: ' + err.message)
    } finally {
      setSavingMentorCommentId(null)
    }
  }

  const saveAllMentorComments = async () => {
    const unsaved = mentorStudents.filter(s => !s.saved)
    if (unsaved.length === 0) return
    for (const student of unsaved) {
      await saveMentorComment(student)
    }
  }

  const downloadMentorCommentTemplate = async () => {
    try {
      const ExcelJS = (await import('exceljs')).default
      const workbook = new ExcelJS.Workbook()
      workbook.creator = 'School Admin'
      const sheet = workbook.addWorksheet('Mentor Comments')

      sheet.columns = [
        { header: 'No', key: 'no', width: 6 },
        { header: 'Student Name', key: 'nama', width: 32 },
        { header: 'Comment (fill this)', key: 'comment', width: 55 },
        { header: 'Present', key: 'present', width: 10 },
        { header: 'Absent', key: 'absent', width: 10 },
        { header: 'Late', key: 'late', width: 10 },
        { header: 'Sick', key: 'sick', width: 10 },
        { header: 'Excused', key: 'excused', width: 10 },
        { header: 'user_id (do not edit)', key: 'user_id', width: 20 },
      ]

      // Style header row
      const headerRow = sheet.getRow(1)
      headerRow.eachCell(cell => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } }
        cell.alignment = { vertical: 'middle', horizontal: 'center' }
        cell.border = { bottom: { style: 'thin', color: { argb: 'FF1D4ED8' } } }
      })
      headerRow.height = 20

      // Add student rows
      mentorStudents.forEach((s, i) => {
        const row = sheet.addRow({
          no: i + 1,
          nama: s.nama,
          comment: s.comment_text || '',
          present: s.present ?? 0,
          absent: s.absent ?? 0,
          late: s.late ?? 0,
          sick: s.sick ?? 0,
          excused: s.excused ?? 0,
          user_id: s.user_id,
        })
        // Gray out non-editable cells
        ;['no', 'nama', 'user_id'].forEach(key => {
          row.getCell(key).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } }
          row.getCell(key).font = { color: { argb: 'FF6B7280' } }
        })
        row.getCell('comment').alignment = { wrapText: true }
        row.height = 40
      })

      // Note at the bottom
      sheet.addRow([])
      const noteRow = sheet.addRow(['', '* Only edit Comment and attendance columns. Do not modify "No", "Student Name", or "user_id".'])
      noteRow.getCell(2).font = { italic: true, color: { argb: 'FF9CA3AF' } }
      sheet.mergeCells(`B${noteRow.number}:I${noteRow.number}`)

      const kelasName = mentorKelasOptions.find(k => String(k.kelas_id) === String(mentorKelas))?.kelas_nama || 'kelas'
      const buffer = await workbook.xlsx.writeBuffer()
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `mentor_comment_${kelasName.replace(/\s+/g, '_')}_sem${mentorSemester}.xlsx`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      alert('Failed to generate template: ' + err.message)
    }
  }

  const handleMentorCommentImport = async (file) => {
    if (!file) return
    try {
      const ExcelJS = (await import('exceljs')).default
      const workbook = new ExcelJS.Workbook()
      const arrayBuffer = await file.arrayBuffer()
      await workbook.xlsx.load(arrayBuffer)
      const sheet = workbook.getWorksheet(1)
      if (!sheet) throw new Error('No worksheet found in file')

      let updated = 0
      sheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return // skip header
        const userId = row.getCell(9).value // column I: user_id
        if (!userId) return
        const comment = row.getCell(3).value != null ? String(row.getCell(3).value) : ''
        const present = Math.max(0, parseInt(row.getCell(4).value) || 0)
        const absent = Math.max(0, parseInt(row.getCell(5).value) || 0)
        const late = Math.max(0, parseInt(row.getCell(6).value) || 0)
        const sick = Math.max(0, parseInt(row.getCell(7).value) || 0)
        const excused = Math.max(0, parseInt(row.getCell(8).value) || 0)
        const student = mentorStudents.find(s => String(s.user_id) === String(userId))
        if (student) {
          setMentorStudents(prev => prev.map(s =>
            String(s.user_id) === String(userId)
              ? { ...s, comment_text: comment, present, absent, late, sick, excused, saved: false }
              : s
          ))
          updated++
        }
      })

      alert(`Import successful! ${updated} record(s) loaded. Click "Save All" to save.`)
    } catch (err) {
      alert('Failed to import file: ' + err.message)
    } finally {
      if (mentorImportRef.current) mentorImportRef.current.value = ''
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
    // Initialize wizard year from current filter; also pre-filter kelas
    const initYear = filters.year || ''
    setWizardYear(initYear)
    // Use allowedKelasRaw (filtered to classes user teaches) — not allKelasRaw
    if (initYear) {
      setAllKelas(allowedKelasRaw.filter(k => String(k.kelas_year_id) === String(initYear)))
    } else {
      setAllKelas([]) // Reset kelas options
    }
    setSubjectsForSelectedKelas([]) // Reset subject list
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
      topic_gc_exploration: '',
      topic_key_concept: '',
      topic_related_concept: '',
      topic_statement: '',
      topic_conceptual_understanding: '',
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
    selectedConceptualUnderstanding, setSelectedConceptualUnderstanding,
    selectedAssessmentRelationship,
    selectedFormativeAssessment, setSelectedFormativeAssessment,
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
    toggleConceptualUnderstanding,
    toggleStatement,
    toggleLearnerProfile,
    toggleServiceLearning,
    toggleFormativeAssessment,
    toggleResources,
    applySelectedConceptualUnderstanding,
    applySelectedStatements,
    applySelectedGlobalContexts,
    applySelectedKeyConcepts,
    applySelectedRelatedConcepts,
    applySelectedLearnerProfiles,
    applySelectedServiceLearning,
    applySelectedFormativeAssessment,
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
    
    // Step 5 (Formative Assessment) - optional text field
    if (step.id === 'formativeAssessment') {
      return selectedTopic.topic_formative_assessment?.trim() !== ''
    }
    
    // Step 6 (Assessment) has different validation - uses wizardAssessment state
    if (step.id === 'assessment') {
      // Check required fields (date will be submitted later)
      if (!wizardAssessment.assessment_nama?.trim() ||
          !wizardAssessment.assessment_semester?.trim() ||
          !wizardAssessment.selected_criteria?.length) {
        return false
      }
      
      return true
    }
    
    // Step 7 (Relationship) - uses wizardAssessment.assessment_relationship
    if (step.id === 'relationship') {
      return wizardAssessment.assessment_relationship?.trim() !== ''
    }
    
    // Step 8 (TSC) - check if all expected TSC fields are filled
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
    
    // Step 9 (Reflection) - at least prior reflection should be filled
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
    if (!selectedTopic.topic_conceptual_understanding?.trim()) missing.push({ step: 4, field: 'Conceptual Understanding' })
    
    // Step 4: Learner Profile & Service
    if (!selectedTopic.topic_learner_profile?.trim()) missing.push({ step: 5, field: 'Learner Profile' })
    if (!selectedTopic.topic_service_learning?.trim()) missing.push({ step: 5, field: 'Service Learning' })
    if (!selectedTopic.topic_atl?.trim()) missing.push({ step: 5, field: 'ATL Skills' })
    
    // Step 6: Assessment (summative)
    if (!wizardAssessment.selected_criteria?.length) missing.push({ step: 7, field: 'Criteria to Assess' })
    if (!wizardAssessment.assessment_nama?.trim()) missing.push({ step: 7, field: 'Assessment Name' })
    if (!wizardAssessment.assessment_semester?.trim()) missing.push({ step: 7, field: 'Semester' })
    if (!wizardAssessment.assessment_conceptual_understanding?.trim()) missing.push({ step: 7, field: 'Conceptual Understanding' })
    if (!wizardAssessment.assessment_instructions?.trim()) missing.push({ step: 7, field: 'Assessment Instructions' })
    
    // Step 7: Relationship
    if (!wizardAssessment.assessment_relationship?.trim()) missing.push({ step: 8, field: 'Relationship: Assessment & Statement of Inquiry' })
    
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
        !wizardAssessment.assessment_instructions?.trim()) {
      alert('Please complete all assessment fields including Conceptual Understanding and Instructions')
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
          // TEMP: bypass approval — set status to 1 (approved) directly
          // assessment_status: 0, // Always 0; draft is indicated by null date + status 0
          assessment_status: 1, // TEMP: auto-approved, no approval flow needed
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
        
        // TEMP: approval notifications disabled (bypass approval flow)
        // if (assessmentResult && assessmentResult[0] && hasDate) {
        //   notifyVicePrincipal(assessmentResult[0].assessment_id)
        // }
        
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
        
        // Also sync to wizardAssessment for Step 8 TSC editing
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
      
      // TEMP: bypass approval — always set status to 1 (approved) directly
      // Original status logic commented out below:
      // const hasDate = topicAssessment.assessment_tanggal && topicAssessment.assessment_tanggal.trim() !== ''
      // const wasApproved = topicAssessment.assessment_status === 1
      // const dateChanged = originalDate !== topicAssessment.assessment_tanggal
      // let newStatus
      // let shouldNotify = false
      // if (!hasDate) { newStatus = null }
      // else if (wasApproved && dateChanged) { newStatus = 0; shouldNotify = true }
      // else if ((topicAssessment.assessment_status === null || topicAssessment.assessment_status === undefined) && hasDate) { newStatus = 0; shouldNotify = true }
      // else if (hasDate && !originalDate) { newStatus = 0; shouldNotify = true }
      // else { newStatus = topicAssessment.assessment_status }
      const hasDate = topicAssessment.assessment_tanggal && topicAssessment.assessment_tanggal.trim() !== ''
      let newStatus = 1 // TEMP: auto-approved
      let shouldNotify = false
      
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
      
      // TEMP: approval notifications disabled (bypass approval flow)
      // if (shouldNotify) {
      //   notifyVicePrincipal(assessmentId)
      // }
      
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
  const kelasIdsForYear = filters.year
    ? new Set(allKelasRaw.filter(k => String(k.kelas_year_id) === String(filters.year)).map(k => k.kelas_id))
    : null

  const filteredTopics = topics
    .filter(topic => {
      const matchYear    = !kelasIdsForYear || kelasIdsForYear.has(topic.topic_kelas_id)
      const matchSubject = !filters.subject || topic.topic_subject_id === parseInt(filters.subject)
      const matchKelas   = !filters.kelas   || topic.topic_kelas_id   === parseInt(filters.kelas)
      const matchSearch  = !filters.search  ||
        topic.topic_nama?.toLowerCase().includes(filters.search.toLowerCase()) ||
        subjectMap.get(topic.topic_subject_id)?.toLowerCase().includes(filters.search.toLowerCase())
      return matchYear && matchSubject && matchKelas && matchSearch
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
      const matchYear = !assessmentFilters.year || String(assessment.kelas_year_id) === String(assessmentFilters.year)
      const matchSubject = !assessmentFilters.subject || assessment.subject_id === parseInt(assessmentFilters.subject)
      const matchKelas = !assessmentFilters.kelas || assessment.kelas_id === parseInt(assessmentFilters.kelas)
      const matchStatus = !assessmentFilters.status || assessment.assessment_status.toString() === assessmentFilters.status
      const matchSearch = !assessmentFilters.search || 
        assessment.assessment_nama?.toLowerCase().includes(assessmentFilters.search.toLowerCase()) ||
        assessment.teacher_name?.toLowerCase().includes(assessmentFilters.search.toLowerCase())
      const matchNoCriteria = !assessmentFilters.noCriteria || !assessment.criteria || assessment.criteria.length === 0
      return matchYear && matchSubject && matchKelas && matchStatus && matchSearch && matchNoCriteria
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
        return <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-medium" style={{ background: theme.yellowBg, color: theme.yellowText, borderRadius: '4px' }}>Waiting</span>
      case 3:
        return <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-medium" style={{ background: theme.blueBg, color: theme.blueText, borderRadius: '4px' }}>Principal</span>
      case 1:
        return <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-medium" style={{ background: theme.greenBg, color: theme.greenText, borderRadius: '4px' }}>Approved</span>
      case 2:
        return <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-medium" style={{ background: theme.redBg, color: theme.redText, borderRadius: '4px' }}>Rejected</span>
      default:
        return <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-medium" style={{ background: theme.subtleBg, color: theme.textSecondary, borderRadius: '4px' }}>Unknown</span>
    }
  }

  const handleTopicOpen = async (topic) => {
    resetAiState()
    setSelectedTopic({ ...topic, topic_atl: topic.topic_atl || '' })
    setModalOpen(true)
    setIsAddMode(false)
    setCurrentStep(0)
    setSelectedTopic({ ...topic, topic_atl: topic.topic_atl || '' })
    // Derive academic year from the topic's kelas so the Tahun Ajaran dropdown
    // is pre-selected and the Kelas dropdown is enabled when editing.
    const kelasEntry = allKelasRaw.find(k => String(k.kelas_id) === String(topic.topic_kelas_id))
    const derivedYear = kelasEntry?.kelas_year_id ? String(kelasEntry.kelas_year_id) : ''
    setWizardYear(derivedYear)
    // Use allowedKelasRaw for edit mode too (same filter rules as add mode)
    setAllKelas(derivedYear ? allowedKelasRaw.filter(k => String(k.kelas_year_id) === derivedYear) : allowedKelasRaw)
    // Load subjects allowed for the topic's specific kelas
    if (topic.topic_kelas_id) {
      fetchSubjectsForKelas(topic.topic_kelas_id)
    } else {
      setSubjectsForSelectedKelas([])
    }
    await fetchTopicAssessment(topic.topic_id, topic.topic_subject_id)
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
      .maybeSingle()
    if (assessmentLoadError) {
      console.error('❌ [FETCH ERROR] Error loading assessment:', assessmentLoadError)
    }
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
    if (topic.topic_subject_id) {
      await fetchKelasForSubject(topic.topic_subject_id)
      const { data: criteriaData } = await supabase
        .from('criteria')
        .select('criterion_id, code, name')
        .eq('subject_id', topic.topic_subject_id)
        .order('code')
      setWizardCriteria(criteriaData || [])
    }
  }

  const { theme } = useTheme()

  const tabs = [
    { id: 'planning', label: t('topicNew.tabs.planning'), icon: faMap },
    { id: 'assignment', label: t('topicNew.tabs.assignment'), icon: faClipboardList },
    { id: 'assessment', label: t('topicNew.tabs.assessment'), icon: faClipboardCheck },
    { id: 'comment', label: t('topicNew.tabs.comment'), icon: faComments },
    ...(isWaliKelas ? [{ id: 'mentor', label: t('topicNew.tabs.mentorComment'), icon: faHouseUser }] : []),
    ...(isWaliKelas ? [{ id: 'attendance', label: t('topicNew.tabs.dailyAttendance') || 'Daily Attendance', icon: faCalendarCheck }] : []),
    { id: 'community_project', label: 'Community Project', icon: faLightbulb },
    { id: 'report', label: t('topicNew.tabs.report'), icon: faChartBar }
  ]

  return (
    <div className="p-6" style={{ background: theme.pageBg, minHeight: '100%' }}>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight" style={{ color: theme.textPrimary, fontFamily: "'Helvetica Neue', sans-serif", letterSpacing: '-0.01em' }}>Topic Management</h1>
          <p className="text-sm mt-1" style={{ color: theme.textSecondary }}>Manage your IB unit planner topics</p>
        </div>
        <div>
          <button
            onClick={() => setWoDocxModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all"
          >
            <FontAwesomeIcon icon={faFileWord} />
            Weekly Overview (DOCX)
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="mb-6" style={{ borderBottom: `1px solid ${theme.border}` }}>
        <nav className="flex gap-0" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="inline-flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors"
              style={{
                borderBottom: activeTab === tab.id ? `2px solid ${theme.textPrimary}` : '2px solid transparent',
                color: activeTab === tab.id ? theme.textPrimary : theme.textSecondary,
                background: 'transparent',
                fontFamily: "'Helvetica Neue', sans-serif",
                marginBottom: '-1px',
              }}
            >
              <FontAwesomeIcon icon={tab.icon} className="w-3 h-3" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div style={{ background: theme.cardBg, border: `1px solid ${theme.border}`, borderRadius: '8px', overflow: 'hidden' }}>
        {activeTab === 'planning' && (
          <div className="flex">
            {/* Sidebar for Planning */}
            <div className="w-48 flex-shrink-0" style={{ borderRight: `1px solid ${theme.border}`, background: theme.subtleBg }}>
              <nav className="p-3 space-y-0.5">
                {[
                  { id: 'overview', label: t('topicNew.subMenu.overview'), icon: faClipboardList },
                  { id: 'weekly-plan', label: t('topicNew.subMenu.weeklyPlan'), icon: faCalendar }
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveSubMenu(item.id)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium transition-colors"
                    style={{
                      borderRadius: '6px',
                      color: activeSubMenu === item.id ? theme.blueText : theme.textSecondary,
                      background: activeSubMenu === item.id ? theme.blueBg : 'transparent',
                      fontFamily: "'Helvetica Neue', sans-serif",
                    }}
                    onMouseEnter={e => { if (activeSubMenu !== item.id) e.currentTarget.style.background = theme.border }}
                    onMouseLeave={e => { e.currentTarget.style.background = activeSubMenu === item.id ? theme.blueBg : 'transparent' }}
                  >
                    <FontAwesomeIcon icon={item.icon} className="w-3 h-3" style={{ color: 'inherit' }} />
                    {item.label}
                  </button>
                ))}
              </nav>
            </div>

            {/* Content Area */}
            <div className="flex-1 p-6 min-w-0">
              {activeSubMenu === 'overview' && (
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <h2 className="text-sm font-semibold" style={{ color: theme.textPrimary, fontFamily: "'Helvetica Neue', sans-serif" }}>{t('topicNew.subMenu.planningOverview')}</h2>
                    <div className="flex items-center gap-1 p-1" style={{ background: theme.subtleBg, borderRadius: '6px', border: `1px solid ${theme.border}` }}>
                      <button
                        onClick={() => { setPlanningView('card'); localStorage.setItem('planning_view', 'card') }}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium transition-colors"
                        style={{ borderRadius: '4px', background: planningView === 'card' ? theme.cardBg : 'transparent', color: planningView === 'card' ? theme.textPrimary : theme.textSecondary, boxShadow: planningView === 'card' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none' }}
                        title="Card View"
                      >
                        <FontAwesomeIcon icon={faTableCells} className="w-3 h-3" />
                        Card
                      </button>
                      <button
                        onClick={() => { setPlanningView('list'); localStorage.setItem('planning_view', 'list') }}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium transition-colors"
                        style={{ borderRadius: '4px', background: planningView === 'list' ? theme.cardBg : 'transparent', color: planningView === 'list' ? theme.textPrimary : theme.textSecondary, boxShadow: planningView === 'list' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none' }}
                        title="List View"
                      >
                        <FontAwesomeIcon icon={faListUl} className="w-3 h-3" />
                        List
                      </button>
                    </div>
                  </div>
                  
                  {/* Filters */}
                  <div className="mb-5 flex gap-3 items-end flex-wrap">
                    {/* Year filter */}
                    <div className="flex-1 min-w-[140px]">
                      <label className="block text-xs font-medium mb-1.5" style={{ color: theme.textSecondary }}>
                        {t('topicNew.filters.year')}
                      </label>
                      <select
                        value={filters.year}
                        onChange={(e) => {
                          const yr = e.target.value
                          const filtered = yr ? allKelasRaw.filter(k => String(k.kelas_year_id) === String(yr)) : allKelasRaw
                          setAllKelas(filtered)
                          setFilters({ ...filters, year: yr, kelas: '', subject: '' })
                        }}
                        className="w-full px-3 py-2 text-xs focus:outline-none"
                        style={{ border: `1px solid ${theme.border}`, borderRadius: '6px', background: theme.inputBg, color: theme.textBody }}
                      >
                        <option value="">{t('topicNew.weeklyPlanTab.allYears')}</option>
                        {yearOptions.map(y => (
                          <option key={y.year_id} value={y.year_id}>{y.year_name}</option>
                        ))}
                      </select>
                    </div>
                    {/* Kelas filter */}
                    <div className="flex-1 min-w-[140px]">
                      <label className="block text-xs font-medium mb-1.5" style={{ color: theme.textSecondary }}>
                        {t('topicNew.filters.class')}
                      </label>
                      <select
                        value={filters.kelas}
                        onChange={(e) => setFilters({ ...filters, kelas: e.target.value })}
                        className="w-full px-3 py-2 text-xs focus:outline-none"
                        style={{ border: `1px solid ${theme.border}`, borderRadius: '6px', background: theme.inputBg, color: theme.textBody }}
                      >
                        <option value="">{t('topicNew.filters.allClasses')}</option>
                        {allKelas.map(k => (
                          <option key={k.kelas_id} value={k.kelas_id}>
                            {k.kelas_nama}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex-1 min-w-[140px]">
                      <label className="block text-xs font-medium mb-1.5" style={{ color: theme.textSecondary }}>
                        {t('topicNew.filters.subject')}
                      </label>
                      <select
                        value={filters.subject}
                        onChange={(e) => setFilters({ ...filters, subject: e.target.value })}
                        className="w-full px-3 py-2 text-xs focus:outline-none"
                        style={{ border: `1px solid ${theme.border}`, borderRadius: '6px', background: theme.inputBg, color: theme.textBody }}
                      >
                        <option value="">{t('topicNew.filters.allSubjects')}</option>
                        {subjects.map(s => (
                          <option key={s.subject_id} value={s.subject_id}>
                            {s.subject_name}
                          </option>
                        ))}
                      </select>
                    </div>
                    {/* Search */}
                    <div className="flex-1 min-w-[140px]">
                      <label className="block text-xs font-medium mb-1.5" style={{ color: theme.textSecondary }}>
                        {t('topicNew.filters.search')}
                      </label>
                      <input
                        type="text"
                        value={filters.search}
                        onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                        placeholder={t('topicNew.filters.search')}
                        className="w-full px-3 py-2 text-xs focus:outline-none"
                        style={{ border: `1px solid ${theme.border}`, borderRadius: '6px', background: theme.inputBg, color: theme.textBody }}
                      />
                    </div>
                  </div>

                  {/* Loading State */}
                  {loading ? (
                    <div className="flex justify-center items-center py-12">
                      <FontAwesomeIcon icon={faSpinner} spin className="text-2xl" style={{ color: theme.textSecondary }} />
                    </div>
                  ) : planningView === 'card' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {filteredTopics.length === 0 && (
                        <div className="col-span-full text-center py-12 text-xs" style={{ color: theme.textSecondary }}>
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
                            className="relative overflow-hidden cursor-pointer transition-all"
                            style={{ border: `1px solid ${theme.border}`, borderRadius: '8px', padding: '20px', background: theme.cardBg }}
                            onClick={() => handleTopicOpen(topic)}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = theme.borderHover }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = theme.border }}
                          >
                            {/* Grade Watermark */}
                            {gradeNumber && (
                              <div className="absolute top-0 right-0 font-black leading-none pointer-events-none select-none" style={{ fontSize: '120px', color: theme.border, transform: 'translate(20%, -20%)' }}>
                                {gradeNumber}
                              </div>
                            )}
                            
                            {/* Header */}
                            <div className="mb-3 pb-3 relative z-10" style={{ borderBottom: `1px solid ${theme.border}` }}>
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <h3 className="text-sm font-semibold line-clamp-2 flex-1" style={{ color: theme.textPrimary, fontFamily: "'Helvetica Neue', sans-serif" }}>
                                  {topic.topic_nama}
                                </h3>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[10px] px-1.5 py-0.5 font-medium" style={{ background: theme.subtleBg, color: theme.textSecondary, borderRadius: '4px', border: `1px solid ${theme.border}` }}>
                                    #{topic.topic_urutan || '-'}
                                  </span>
                                  <button
                                    onClick={(e) => handleGeneratePDF(topic, e)}
                                    className="p-1.5 transition-colors"
                                    style={{ background: theme.blueBg, color: theme.blueText, borderRadius: '4px' }}
                                    title="Download Unit Planner PDF"
                                  >
                                    <FontAwesomeIcon icon={faPrint} className="text-xs" />
                                  </button>
                                  <button
                                    onClick={(e) => handleGenerateAssessmentPDFFromCard(topic, e)}
                                    className="p-1.5 transition-colors"
                                    style={{ background: theme.subtleBg, color: theme.textSecondary, borderRadius: '4px', border: `1px solid ${theme.border}` }}
                                    title="Download Assessment PDF"
                                  >
                                    <FontAwesomeIcon icon={faFileAlt} className="text-xs" />
                                  </button>
                                  <button
                                    onClick={(e) => handleExportAssessmentWordFromCard(topic, e)}
                                    className="p-1.5 transition-colors"
                                    style={{ background: theme.subtleBg, color: theme.textSecondary, borderRadius: '4px', border: `1px solid ${theme.border}` }}
                                    title="Download Assessment Word"
                                  >
                                    <FontAwesomeIcon icon={faFileWord} className="text-xs" />
                                  </button>
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-[10px] px-1.5 py-0.5 font-medium" style={{ background: theme.blueBg, color: theme.blueText, borderRadius: '4px' }}>
                                  {subjectMap.get(topic.topic_subject_id) || 'N/A'}
                                </span>
                                {topic.topic_kelas_id && (
                                  <span className="text-[10px] px-1.5 py-0.5 font-medium" style={{ background: theme.greenBg, color: theme.greenText, borderRadius: '4px' }}>
                                    {kelasNameMap.get(topic.topic_kelas_id) || 'N/A'}
                                  </span>
                                )}
                                {topic.topic_year && (
                                  <span className="text-[10px] px-1.5 py-0.5 font-medium" style={{ background: theme.yellowBg, color: theme.yellowText, borderRadius: '4px' }}>
                                    MYP Y{topic.topic_year}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Duration */}
                            <div className="mb-2 flex items-center gap-1.5 relative z-10">
                              <FontAwesomeIcon icon={faCalendar} className="w-3 h-3" style={{ color: theme.textSecondary }} />
                              <span className="text-xs" style={{ color: theme.textBody }}>
                                {topic.topic_duration && topic.topic_duration !== '0' && topic.topic_duration !== 0
                                  ? `${topic.topic_duration} weeks`
                                  : '-'}
                              </span>
                            </div>

                            {/* Inquiry Question */}
                            {topic.topic_inquiry_question && (
                              <div className="mb-2 relative z-10">
                                <p className="text-[10px] font-medium mb-0.5 uppercase tracking-wide" style={{ color: theme.blueText }}>Inquiry Question</p>
                                <p className="text-xs line-clamp-2" style={{ color: theme.textBody }}>
                                  {topic.topic_inquiry_question}
                                </p>
                              </div>
                            )}

                            {/* Global Context */}
                            {topic.topic_global_context && (
                              <div className="mb-2 relative z-10">
                                <p className="text-[10px] font-medium mb-0.5 uppercase tracking-wide" style={{ color: theme.blueText }}>Global Context</p>
                                <p className="text-xs line-clamp-2" style={{ color: theme.textBody }}>
                                  {topic.topic_global_context}
                                </p>
                                {topic.topic_gc_exploration && (
                                  <div className="mt-1">
                                    <span className="inline-block px-1.5 py-0.5 text-[10px]" style={{ background: theme.blueBg, color: theme.blueText, borderRadius: '4px' }}>
                                      {topic.topic_gc_exploration}
                                    </span>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Statement of Inquiry */}
                            {topic.topic_statement && (
                              <div className="relative z-10">
                                <p className="text-[10px] font-medium mb-0.5 uppercase tracking-wide" style={{ color: theme.blueText }}>Statement of Inquiry</p>
                                <p className="text-xs line-clamp-3" style={{ color: theme.textBody }}>
                                  {topic.topic_statement}
                                </p>
                              </div>
                            )}
                          </div>
                        )})
                      )}
                    </div>
                  ) : filteredTopics.length === 0 ? (
                    <div className="text-center py-12 text-xs" style={{ color: theme.textSecondary }}>
                      {t('topicNew.table.noUnits')}
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-xs" style={{ borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ borderBottom: `1px solid ${theme.border}`, background: theme.subtleBg }}>
                            <th className="px-4 py-2.5 text-left font-medium uppercase tracking-wider w-10" style={{ color: theme.textSecondary }}>#</th>
                            <th className="px-4 py-2.5 text-left font-medium uppercase tracking-wider" style={{ color: theme.textSecondary }}>Topic Name</th>
                            <th className="px-4 py-2.5 text-left font-medium uppercase tracking-wider" style={{ color: theme.textSecondary }}>Subject</th>
                            <th className="px-4 py-2.5 text-left font-medium uppercase tracking-wider" style={{ color: theme.textSecondary }}>Class</th>
                            <th className="px-4 py-2.5 text-center font-medium uppercase tracking-wider" style={{ color: theme.textSecondary }}>Duration</th>
                            <th className="px-4 py-2.5 text-left font-medium uppercase tracking-wider" style={{ color: theme.textSecondary }}>Inquiry Question</th>
                            <th className="px-4 py-2.5 text-left font-medium uppercase tracking-wider" style={{ color: theme.textSecondary }}>Global Context</th>
                            <th className="px-4 py-2.5 text-right font-medium uppercase tracking-wider" style={{ color: theme.textSecondary }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredTopics.map((topic, idx) => (
                            <tr
                              key={topic.topic_id}
                              className="cursor-pointer transition-colors"
                              style={{ borderBottom: `1px solid ${theme.border}` }}
                              onClick={() => handleTopicOpen(topic)}
                              onMouseEnter={e => e.currentTarget.style.background = theme.subtleBg}
                              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                            >
                              <td className="px-4 py-3 text-center" style={{ color: theme.textSecondary }}>{idx + 1}</td>
                              <td className="px-4 py-3">
                                <div className="font-medium" style={{ color: theme.textPrimary }}>{topic.topic_nama}</div>
                                {topic.topic_urutan && <div className="text-[10px] mt-0.5" style={{ color: theme.textSecondary }}>Unit #{topic.topic_urutan}</div>}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <span className="px-1.5 py-0.5 font-medium" style={{ background: theme.blueBg, color: theme.blueText, borderRadius: '4px' }}>
                                  {subjectMap.get(topic.topic_subject_id) || 'N/A'}
                                </span>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <span className="px-1.5 py-0.5 font-medium" style={{ background: theme.greenBg, color: theme.greenText, borderRadius: '4px' }}>
                                  {kelasNameMap.get(topic.topic_kelas_id) || 'N/A'}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-center" style={{ color: theme.textBody }}>
                                {topic.topic_duration && topic.topic_duration !== '0' && topic.topic_duration !== 0
                                  ? `${topic.topic_duration}w`
                                  : '-'}
                              </td>
                              <td className="px-4 py-3 max-w-xs" style={{ color: theme.textBody }}>
                                <p className="line-clamp-2">{topic.topic_inquiry_question || '-'}</p>
                              </td>
                              <td className="px-4 py-3 max-w-xs">
                                <p className="line-clamp-1" style={{ color: theme.textBody }}>{topic.topic_global_context || '-'}</p>
                                {topic.topic_gc_exploration && (
                                  <span className="inline-block mt-1 px-1.5 py-0.5 text-[10px]" style={{ background: theme.blueBg, color: theme.blueText, borderRadius: '4px' }}>{topic.topic_gc_exploration}</span>
                                )}
                              </td>
                              <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                                <div className="flex items-center justify-end gap-1">
                                  <button onClick={(e) => handleGeneratePDF(topic, e)} className="p-1.5 transition-colors" style={{ background: theme.blueBg, color: theme.blueText, borderRadius: '4px' }} title="Unit Planner PDF">
                                    <FontAwesomeIcon icon={faPrint} className="text-xs" />
                                  </button>
                                  <button onClick={(e) => handleGenerateAssessmentPDFFromCard(topic, e)} className="p-1.5 transition-colors" style={{ background: theme.subtleBg, color: theme.textSecondary, borderRadius: '4px', border: `1px solid ${theme.border}` }} title="Assessment PDF">
                                    <FontAwesomeIcon icon={faFileAlt} className="text-xs" />
                                  </button>
                                  <button onClick={(e) => handleExportAssessmentWordFromCard(topic, e)} className="p-1.5 transition-colors" style={{ background: theme.subtleBg, color: theme.textSecondary, borderRadius: '4px', border: `1px solid ${theme.border}` }} title="Assessment Word">
                                    <FontAwesomeIcon icon={faFileWord} className="text-xs" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

            {activeSubMenu === 'weekly-plan' && (
              <div>
                <div className="mb-5">
                  <h2 className="text-sm font-semibold mb-1" style={{ color: theme.textPrimary, fontFamily: "'Helvetica Neue', sans-serif" }}>{t('topicNew.weeklyPlanTab.title')}</h2>
                  <p className="text-xs mb-4" style={{ color: theme.textSecondary }}>{t('topicNew.weeklyPlanTab.subtitle')}</p>

                  {/* Cascade Filter: Year → Kelas → Subject → Topic */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-5 p-4" style={{ background: theme.subtleBg, borderRadius: '8px', border: `1px solid ${theme.border}` }}>
                    {/* 1. Tahun Ajaran */}
                    <div>
                      <label className="block text-xs font-medium mb-1.5" style={{ color: theme.textSecondary }}>{t('topicNew.weeklyPlanTab.filterYear')}</label>
                      <select
                        value={wpYear}
                        onChange={e => { setWpYear(e.target.value); setWpKelas(''); setWpSubject(''); setSelectedTopicForWeekly(null); setWeeklyPlans([]); }}
                        className="w-full px-3 py-2 text-xs focus:outline-none"
                        style={{ border: `1px solid ${theme.border}`, borderRadius: '6px', background: theme.inputBg, color: theme.textBody }}
                      >
                        <option value="">{t('topicNew.weeklyPlanTab.allYears')}</option>
                        {yearOptions.map(y => <option key={y.year_id} value={y.year_id}>{y.year_name}</option>)}
                      </select>
                    </div>

                    {/* 2. Kelas — same source as Overview: allKelasRaw filtered by year */}
                    <div>
                      <label className="block text-xs font-medium mb-1.5" style={{ color: theme.textSecondary }}>{t('topicNew.weeklyPlanTab.filterClass')}</label>
                      <select
                        value={wpKelas}
                        disabled={!wpYear}
                        onChange={e => { setWpKelas(e.target.value); setWpSubject(''); setSelectedTopicForWeekly(null); setWeeklyPlans([]); }}
                        className="w-full px-3 py-2 text-xs focus:outline-none"
                        style={{ border: `1px solid ${theme.border}`, borderRadius: '6px', background: !wpYear ? theme.subtleBg : theme.inputBg, color: theme.textBody, opacity: !wpYear ? 0.6 : 1 }}
                      >
                        <option value="">{!wpYear ? t('topicNew.weeklyPlanTab.selectYearFirst') : t('topicNew.weeklyPlanTab.allClasses')}</option>
                        {[...allKelasRaw]
                          .filter(k => !wpYear || String(k.kelas_year_id) === String(wpYear))
                          .sort((a, b) => a.kelas_nama.localeCompare(b.kelas_nama, 'id'))
                          .map(k => <option key={k.kelas_id} value={k.kelas_id}>{k.kelas_nama}</option>)
                        }
                      </select>
                    </div>

                    {/* 3. Subject — identical to Overview: show ALL subjects from subjects state, no kelas filter */}
                    <div>
                      <label className="block text-xs font-medium mb-1.5" style={{ color: theme.textSecondary }}>{t('topicNew.weeklyPlanTab.filterSubject')}</label>
                      <select
                        value={wpSubject}
                        onChange={e => { setWpSubject(e.target.value); setSelectedTopicForWeekly(null); setWeeklyPlans([]); }}
                        className="w-full px-3 py-2 text-xs focus:outline-none"
                        style={{ border: `1px solid ${theme.border}`, borderRadius: '6px', background: theme.inputBg, color: theme.textBody }}
                      >
                        <option value="">{t('topicNew.weeklyPlanTab.allSubjects')}</option>
                        {subjects.map(s => <option key={s.subject_id} value={s.subject_id}>{s.subject_name}</option>)}
                      </select>
                    </div>

                    {/* 4. Topic/Unit — filter uses parseInt() matching Overview's filteredTopics logic */}
                    <div>
                      <label className="block text-xs font-medium mb-1.5" style={{ color: theme.textSecondary }}>{t('topicNew.weeklyPlanTab.filterUnit')}</label>
                      <select
                        value={selectedTopicForWeekly?.topic_id || ''}
                        onChange={e => handleTopicSelectionForWeekly(e.target.value)}
                        className="w-full px-3 py-2 text-xs focus:outline-none"
                        style={{ border: `1px solid ${theme.border}`, borderRadius: '6px', background: theme.inputBg, color: theme.textBody }}
                      >
                        <option value="">{t('topicNew.fields.chooseTopic')}</option>
                        {topics
                          .filter(t => {
                            const matchYear    = !wpYear    || (allKelasRaw.find(k => k.kelas_id === t.topic_kelas_id)?.kelas_year_id?.toString() === wpYear)
                            const matchKelas   = !wpKelas   || t.topic_kelas_id   === parseInt(wpKelas)
                            const matchSubject = !wpSubject || t.topic_subject_id === parseInt(wpSubject)
                            return matchYear && matchKelas && matchSubject
                          })
                          .sort((a, b) => (a.topic_urutan || 0) - (b.topic_urutan || 0) || (a.topic_nama || '').localeCompare(b.topic_nama || ''))
                          .map(topic => (
                            <option key={topic.topic_id} value={topic.topic_id}>
                              Unit {topic.topic_urutan} — {topic.topic_nama}
                            </option>
                          ))
                        }
                      </select>
                    </div>
                  </div>
                </div>

                {/* Weekly Plans Display */}
                {loadingWeeklyPlans ? (
                  <div className="flex justify-center py-12">
                    <FontAwesomeIcon icon={faSpinner} spin className="text-2xl" style={{ color: theme.textSecondary }} />
                  </div>
                ) : selectedTopicForWeekly && weeklyPlans.length > 0 ? (
                  <div>
                    {/* Topic Info and Actions */}
                    <div className="p-4 mb-5" style={{ background: theme.blueBg, border: `1px solid ${theme.border}`, borderRadius: '8px' }}>
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-sm mb-1" style={{ color: theme.textPrimary }}>{selectedTopicForWeekly.topic_nama}</h3>
                          <div className="text-xs" style={{ color: theme.textSecondary }}>
                            <span>{t('topicNew.weeklyPlanTab.duration')}: {selectedTopicForWeekly.topic_duration} weeks</span>
                            <span className="mx-2">·</span>
                            <span>{t('topicNew.weeklyPlanTab.hoursPerWeek')}: {selectedTopicForWeekly.topic_hours_per_week || t('topicNew.weeklyPlanTab.notAvailable')}</span>
                          </div>
                        </div>
                        <button
                          className="px-3 py-2 text-xs font-medium flex items-center gap-2"
                          style={{ background: theme.cardBg, border: `1px solid ${theme.border}`, borderRadius: '6px', color: theme.textPrimary }}
                          onClick={() => {
                            setWeeklyAiInput({ assessmentDuration: '', specialRequests: '' })
                            setWeeklyAiModalOpen(true)
                          }}
                        >
                          <FontAwesomeIcon icon={faLightbulb} />
                          {t('topicNew.weeklyPlanTab.aiHelp')}
                        </button>
                      </div>
                    </div>

                    {/* Notification */}
                    {weeklyPlanNotification.show && (
                      <div className="mb-4 p-3 text-xs" style={{
                        background: weeklyPlanNotification.type === 'success' ? theme.greenBg : theme.redBg,
                        border: `1px solid ${theme.border}`,
                        color: weeklyPlanNotification.type === 'success' ? theme.greenText : theme.redText,
                        borderRadius: '6px'
                      }}>
                        {weeklyPlanNotification.message}
                      </div>
                    )}

                    {/* Weekly Plan Forms */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {Array.from({ length: selectedTopicForWeekly?.topic_duration || 5 }).map((_, wIdx) => {
                        const weekNum = wIdx + 1
                        const weekSessions = weeklyPlans.filter(p => p.week_number === weekNum)
                        const sessionsToRender = weekSessions.length > 0 ? weekSessions : [{
                          _tempId: `default_${weekNum}`,
                          topic_id: selectedTopicForWeekly?.topic_id,
                          week_number: weekNum,
                          week_date: '',
                          week_objectives: '',
                          week_activities: '',
                          week_resources: '',
                          week_reflection: ''
                        }]

                        return (
                          <div key={weekNum} className="space-y-3 p-4 border rounded-xl" style={{ background: theme.cardBg, borderColor: theme.border }}>
                            <div className="flex items-center justify-between pb-2 border-b" style={{ borderColor: theme.border }}>
                              <h3 className="text-xs font-bold flex items-center gap-2" style={{ color: theme.textPrimary }}>
                                <span className="flex items-center justify-center w-6 h-6 text-xs font-bold rounded-full" style={{ background: theme.subtleBg, color: theme.textPrimary, border: `1px solid ${theme.border}` }}>
                                  {weekNum}
                                </span>
                                {t('topicNew.weeklyPlanTab.week')} {weekNum}
                              </h3>
                              <button
                                type="button"
                                onClick={() => handleAddSessionToWeek(weekNum)}
                                className="text-[11px] font-medium px-2 py-1 rounded flex items-center gap-1.5 hover:opacity-80 border"
                                style={{ background: theme.subtleBg, color: theme.textPrimary, borderColor: theme.border }}
                              >
                                <FontAwesomeIcon icon={faPlus} className="text-[10px]" />
                                Add Teaching Session
                              </button>
                            </div>

                            {sessionsToRender.map((plan, sIdx) => (
                              <div key={plan._tempId || (plan.id ? `${plan.id}_${sIdx}` : sIdx)} className="p-3 rounded-lg space-y-2.5 border" style={{ background: theme.subtleBg, borderColor: theme.border }}>
                                <div className="flex items-center justify-between">
                                  <span className="text-[11px] font-semibold" style={{ color: theme.textPrimary }}>
                                    {sessionsToRender.length > 1 ? `Session ${sIdx + 1}` : 'Main Teaching Session'}
                                  </span>
                                  <div className="flex items-center gap-2">
                                    <div className="flex items-center gap-1">
                                      <label className="text-[10px] font-medium" style={{ color: theme.textSecondary }}>{t('topicNew.weeklyPlanTab.dateLabel')}</label>
                                      <input
                                        type="date"
                                        value={plan.week_date || ''}
                                        onChange={e => handleWeeklyPlanChange(plan, 'week_date', e.target.value)}
                                        className="text-[10px] px-1.5 py-0.5 focus:outline-none rounded border"
                                        style={{ borderColor: theme.border, background: theme.inputBg, color: theme.textBody }}
                                      />
                                    </div>
                                    {sessionsToRender.length > 1 && (
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveSession(plan)}
                                        title="Remove Session"
                                        className="text-red-500 hover:text-red-700 px-1 text-xs"
                                      >
                                        <FontAwesomeIcon icon={faTrash} />
                                      </button>
                                    )}
                                  </div>
                                </div>

                                {/* Objectives */}
                                <div>
                                  <label className="block text-[10px] font-medium mb-1 uppercase tracking-wide" style={{ color: theme.textSecondary }}>
                                    {t('topicNew.weeklyPlanTab.objectives')}
                                  </label>
                                  <textarea
                                    value={plan.week_objectives || ''}
                                    onChange={(e) => handleWeeklyPlanChange(plan, 'week_objectives', e.target.value)}
                                    placeholder={t('topicNew.weeklyPlanTab.objectivesPlaceholder')}
                                    rows={2}
                                    className="w-full px-2 py-1 text-xs focus:outline-none resize-none rounded border"
                                    style={{ borderColor: theme.border, background: theme.inputBg, color: theme.textBody }}
                                  />
                                </div>

                                {/* Activities */}
                                <div>
                                  <label className="block text-[10px] font-medium mb-1 uppercase tracking-wide" style={{ color: theme.textSecondary }}>
                                    {t('topicNew.weeklyPlanTab.activities')} (max 300 chars)
                                  </label>
                                  <textarea
                                    value={plan.week_activities || ''}
                                    onChange={(e) => handleWeeklyPlanChange(plan, 'week_activities', e.target.value)}
                                    placeholder={t('topicNew.weeklyPlanTab.activitiesPlaceholder')}
                                    rows={2}
                                    maxLength={300}
                                    className="w-full px-2 py-1 text-xs focus:outline-none resize-none rounded border"
                                    style={{ borderColor: theme.border, background: theme.inputBg, color: theme.textBody }}
                                  />
                                </div>

                                {/* Resources */}
                                <div>
                                  <label className="block text-[10px] font-medium mb-1 uppercase tracking-wide" style={{ color: theme.textSecondary }}>
                                    {t('topicNew.weeklyPlanTab.resources')}
                                  </label>
                                  <textarea
                                    value={plan.week_resources || ''}
                                    onChange={(e) => handleWeeklyPlanChange(plan, 'week_resources', e.target.value)}
                                    placeholder={t('topicNew.weeklyPlanTab.resourcesPlaceholder')}
                                    rows={1}
                                    className="w-full px-2 py-1 text-xs focus:outline-none resize-none rounded border"
                                    style={{ borderColor: theme.border, background: theme.inputBg, color: theme.textBody }}
                                  />
                                </div>

                                {/* Reflection */}
                                <div>
                                  <label className="block text-[10px] font-medium mb-1 uppercase tracking-wide" style={{ color: theme.textSecondary }}>
                                    {t('topicNew.weeklyPlanTab.reflection')} <span style={{ color: theme.textSecondary }}>({t('topicNew.weeklyPlanTab.reflectionDuring')})</span>
                                  </label>
                                  <textarea
                                    value={plan.week_reflection || ''}
                                    onChange={(e) => handleWeeklyPlanChange(plan, 'week_reflection', e.target.value)}
                                    placeholder={t('topicNew.weeklyPlanTab.reflectionPlaceholder')}
                                    rows={1}
                                    className="w-full px-2 py-1 text-xs focus:outline-none resize-none rounded border"
                                    style={{ borderColor: theme.border, background: theme.subtleBg, color: theme.textBody }}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        )
                      })}
                    </div>

                    {/* Action Buttons */}
                    <div className="mt-5 flex justify-end gap-2">
                      <button
                        onClick={deleteAllWeeklyPlans}
                        disabled={savingWeeklyPlans || weeklyPlans.length === 0}
                        className="px-4 py-2 text-xs font-medium flex items-center gap-2"
                        style={{ background: theme.redBg, color: theme.redText, border: `1px solid ${theme.border}`, borderRadius: '6px' }}
                      >
                        <FontAwesomeIcon icon={faTrash} />
                        {t('topicNew.weeklyPlanTab.deleteAll')}
                      </button>
                      <button
                        onClick={saveWeeklyPlans}
                        disabled={savingWeeklyPlans}
                        className="px-4 py-2 text-xs font-medium flex items-center gap-2"
                        style={{ background: theme.greenBg, color: theme.greenText, border: `1px solid ${theme.border}`, borderRadius: '6px' }}
                      >
                        {savingWeeklyPlans ? (
                          <><FontAwesomeIcon icon={faSpinner} spin />{t('topicNew.weeklyPlanTab.saving')}</>
                        ) : (
                          <><FontAwesomeIcon icon={faSave} />{t('topicNew.weeklyPlanTab.save')}</>
                        )}
                      </button>
                    </div>
                  </div>
                ) : selectedTopicForWeekly ? (
                  <div className="text-center py-12 text-xs" style={{ color: theme.textSecondary }}>
                    <p>{t('topicNew.weeklyPlanTab.noData')}</p>
                    <p className="mt-2">{t('topicNew.weeklyPlanTab.noDataHint')}</p>
                  </div>
                ) : (
                  <div className="text-center py-12" style={{ color: theme.textSecondary }}>
                    <FontAwesomeIcon icon={faClipboardList} className="text-4xl mb-3 opacity-30" />
                    <p className="text-xs">{t('topicNew.weeklyPlanTab.selectTopic')}</p>
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
            <p className="text-xs" style={{ color: theme.textSecondary }}>Assignment management content will be displayed here.</p>
          </div>
        )}

        {activeTab === 'assessment' && (
          <div className="p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold" style={{ color: theme.textPrimary, fontFamily: "'Helvetica Neue', sans-serif" }}>Assessment Management</h2>
              <div className="flex items-center gap-1 p-1" style={{ background: theme.subtleBg, borderRadius: '6px', border: `1px solid ${theme.border}` }}>
                <button
                  onClick={() => { setAssessmentView('card'); localStorage.setItem('assessment_view', 'card') }}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium transition-colors"
                  style={{ borderRadius: '4px', background: assessmentView === 'card' ? theme.cardBg : 'transparent', color: assessmentView === 'card' ? theme.textPrimary : theme.textSecondary, boxShadow: assessmentView === 'card' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none' }}
                  title="Card View"
                >
                  <FontAwesomeIcon icon={faTableCells} className="w-3 h-3" />
                  Card
                </button>
                <button
                  onClick={() => { setAssessmentView('list'); localStorage.setItem('assessment_view', 'list') }}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium transition-colors"
                  style={{ borderRadius: '4px', background: assessmentView === 'list' ? theme.cardBg : 'transparent', color: assessmentView === 'list' ? theme.textPrimary : theme.textSecondary, boxShadow: assessmentView === 'list' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none' }}
                  title="List View"
                >
                  <FontAwesomeIcon icon={faListUl} className="w-3 h-3" />
                  List
                </button>
              </div>
            </div>
            
            {/* Filters */}
            <div className="mb-5 flex gap-3 items-end flex-wrap">
              {/* Year filter */}
              <div className="flex-1 min-w-[140px]">
                <label className="block text-sm font-medium mb-1.5" style={{ color: theme.textSecondary }}>Tahun Ajaran</label>
                <select
                  value={assessmentFilters.year}
                  onChange={(e) => setAssessmentFilters({ ...assessmentFilters, year: e.target.value, kelas: '' })}
                  className="w-full px-3 py-2 text-sm focus:outline-none"
                  style={{ border: `1px solid ${theme.border}`, borderRadius: '6px', background: theme.inputBg, color: theme.textBody }}
                >
                  <option value="">Semua Tahun</option>
                  {yearOptions.map(y => (
                    <option key={y.year_id} value={y.year_id}>{y.year_name}</option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium mb-1.5" style={{ color: theme.textSecondary }}>
                  {t('topicNew.filters.subject')}
                </label>
                <select
                  value={assessmentFilters.subject}
                  onChange={(e) => setAssessmentFilters({ ...assessmentFilters, subject: e.target.value })}
                  className="w-full px-3 py-2 text-sm focus:outline-none"
                  style={{ border: `1px solid ${theme.border}`, borderRadius: '6px', background: theme.inputBg, color: theme.textBody }}
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
                <label className="block text-sm font-medium mb-1.5" style={{ color: theme.textSecondary }}>
                  {t('topicNew.filters.class')}
                </label>
                <select
                  value={assessmentFilters.kelas}
                  onChange={(e) => setAssessmentFilters({ ...assessmentFilters, kelas: e.target.value })}
                  className="w-full px-3 py-2 text-sm focus:outline-none"
                  style={{ border: `1px solid ${theme.border}`, borderRadius: '6px', background: theme.inputBg, color: theme.textBody }}
                >
                  <option value="">{t('topicNew.filters.allClasses')}</option>
                  {(assessmentFilters.year
                    ? assessmentKelasOptions.filter(k => {
                        const match = allKelasRaw.find(ak => ak.kelas_id === k.kelas_id)
                        return match && String(match.kelas_year_id) === String(assessmentFilters.year)
                      })
                    : assessmentKelasOptions
                  ).map(k => (
                    <option key={k.kelas_id} value={k.kelas_id}>
                      {k.kelas_nama}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium mb-1.5" style={{ color: theme.textSecondary }}>
                  {t('topicNew.filters.status')}
                </label>
                <select
                  value={assessmentFilters.status}
                  onChange={(e) => setAssessmentFilters({ ...assessmentFilters, status: e.target.value })}
                  className="w-full px-3 py-2 text-sm focus:outline-none"
                  style={{ border: `1px solid ${theme.border}`, borderRadius: '6px', background: theme.inputBg, color: theme.textBody }}
                >
                  <option value="">{t('topicNew.filters.allStatus')}</option>
                  <option value="0">{t('topicNew.filters.statusWaiting')}</option>
                  <option value="3">{t('topicNew.filters.statusWaitingPrincipal')}</option>
                  <option value="1">{t('topicNew.filters.statusApproved')}</option>
                  <option value="2">{t('topicNew.filters.statusRejected')}</option>
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium mb-1.5" style={{ color: theme.textSecondary }}>
                  {t('topicNew.filters.search')}
                </label>
                <input
                  type="text"
                  value={assessmentFilters.search}
                  onChange={(e) => setAssessmentFilters({ ...assessmentFilters, search: e.target.value })}
                  placeholder="Search by name..."
                  className="w-full px-3 py-2 text-sm focus:outline-none"
                  style={{ border: `1px solid ${theme.border}`, borderRadius: '6px', background: theme.inputBg, color: theme.textBody }}
                />
              </div>
            </div>

            {/* Additional Filters */}
            <div className="mb-4 flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: theme.textBody }}>
                <input
                  type="checkbox"
                  checked={assessmentFilters.noCriteria}
                  onChange={(e) => setAssessmentFilters({ ...assessmentFilters, noCriteria: e.target.checked })}
                  className="w-3.5 h-3.5"
                />
                <span>Show only assessments without criteria</span>
                {assessmentFilters.noCriteria && (
                  <span className="text-[10px] font-medium" style={{ color: theme.yellowText }}>
                    ({filteredAssessments.length} found)
                  </span>
                )}
              </label>
            </div>

            {/* Loading State */}
            {loadingAssessments ? (
              <div className="flex justify-center items-center py-12">
                <FontAwesomeIcon icon={faSpinner} spin className="text-2xl" style={{ color: theme.textSecondary }} />
              </div>
            ) : assessmentView === 'card' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredAssessments.length === 0 && (
                  <div className="col-span-full text-center py-12 text-sm" style={{ color: theme.textSecondary }}>
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
                    className="relative overflow-hidden flex flex-col transition-all"
                    style={{ border: `1px solid ${theme.border}`, borderRadius: '8px', padding: '20px', background: theme.cardBg, cursor: canEdit ? 'pointer' : 'default' }}
                    onClick={() => canEdit && handleEditAssessment(assessment)}
                    onMouseEnter={e => { if (canEdit) e.currentTarget.style.borderColor = theme.borderHover }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = theme.border }}
                  >
                    {/* Grade Watermark */}
                    {gradeNumber && (
                      <div className="absolute top-0 right-0 font-black leading-none pointer-events-none select-none" style={{ fontSize: '120px', color: theme.border, transform: 'translate(20%, -20%)' }}>
                        {gradeNumber}
                      </div>
                    )}
                    
                    {/* Content Container */}
                    <div className="flex-grow flex flex-col">
                    
                    {/* Header */}
                    <div className="mb-3 pb-3 relative z-10" style={{ borderBottom: `1px solid ${theme.border}` }}>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-start gap-2 flex-1">
                          {assessment.topic_urutan && assessment.topic_urutan !== 999 && (
                            <div className="text-[10px] font-bold px-1.5 py-0.5 flex-shrink-0" style={{ background: theme.subtleBg, color: theme.textSecondary, borderRadius: '4px', border: `1px solid ${theme.border}` }}>
                              Unit {assessment.topic_urutan}
                            </div>
                          )}
                          <h3 className="text-sm font-semibold line-clamp-2 flex-1" style={{ color: theme.textPrimary, fontFamily: "'Helvetica Neue', sans-serif" }}>
                            {assessment.assessment_nama}
                          </h3>
                        </div>
                        {getAssessmentStatusBadge(assessment.assessment_status)}
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] px-1.5 py-0.5 font-medium" style={{ background: theme.blueBg, color: theme.blueText, borderRadius: '4px' }}>
                          {assessment.subject_name || 'N/A'}
                        </span>
                        {assessment.kelas_nama && (
                          <span className="text-[10px] px-1.5 py-0.5 font-medium" style={{ background: theme.greenBg, color: theme.greenText, borderRadius: '4px' }}>
                            {assessment.kelas_nama}
                          </span>
                        )}
                        {assessment.assessment_semester && (
                          <span className="text-[10px] px-1.5 py-0.5 font-medium" style={{ background: theme.yellowBg, color: theme.yellowText, borderRadius: '4px' }}>
                            Sem {assessment.assessment_semester}
                          </span>
                        )}
                        {assessment.criteria && assessment.criteria.length > 0 ? (
                          assessment.criteria.map(c => (
                            <span key={c.code} className="text-[10px] px-1.5 py-0.5 font-bold" style={{ background: theme.subtleBg, color: theme.textSecondary, borderRadius: '4px', border: `1px solid ${theme.border}` }}>
                              {c.code}
                            </span>
                          ))
                        ) : (
                          <span className="text-[10px] px-1.5 py-0.5 font-bold" style={{ background: theme.yellowBg, color: theme.yellowText, borderRadius: '4px' }}>
                            No Criteria
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Criteria Names or Warning */}
                    {assessment.criteria && assessment.criteria.length > 0 ? (
                      <div className="mb-2 relative z-10">
                        <p className="text-[10px] font-medium mb-1 uppercase tracking-wide" style={{ color: theme.blueText }}>IB MYP Criteria</p>
                        <div className="flex flex-wrap gap-1">
                          {assessment.criteria.map(c => (
                            <div key={c.code} className="text-[10px] px-1.5 py-0.5 font-medium" style={{ background: theme.subtleBg, color: theme.textBody, borderRadius: '4px', border: `1px solid ${theme.border}` }}>
                              {c.code}: {c.name}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="mb-2 relative z-10">
                        <div className="p-2" style={{ background: theme.yellowBg, border: `1px solid ${theme.border}`, borderRadius: '6px' }}>
                          <p className="text-xs font-medium" style={{ color: theme.yellowText }}>No criteria assigned. Click to add criteria.</p>
                        </div>
                      </div>
                    )}

                    {/* Date */}
                    <div className="mb-2 flex items-center gap-1.5 relative z-10">
                      <FontAwesomeIcon icon={faCalendar} className="w-3 h-3" style={{ color: theme.textSecondary }} />
                      <span className="text-xs" style={{ color: theme.textBody }}>
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
                    <div className="mb-2 flex items-center gap-1.5 relative z-10">
                      <FontAwesomeIcon icon={faBook} className="w-3 h-3" style={{ color: theme.textSecondary }} />
                      <span className="text-xs" style={{ color: theme.textBody }}>
                        {assessment.teacher_name || 'Unknown Teacher'}
                      </span>
                    </div>

                    {/* Graded count */}
                    <div className="mb-2 flex items-center gap-1.5 relative z-10">
                      <FontAwesomeIcon icon={faChartBar} className="w-3 h-3" style={{ color: theme.textSecondary }} />
                      <span className="text-xs font-medium" style={{ color: assessment.total_students > 0 && assessment.graded_count === assessment.total_students ? theme.greenText : theme.textBody }}>
                        {assessment.graded_count}/{assessment.total_students} siswa dinilai
                      </span>
                    </div>

                    {/* Topic */}
                    {assessment.topic_nama && (
                      <div className="mb-2 relative z-10">
                        <p className="text-[10px] font-medium mb-0.5 uppercase tracking-wide" style={{ color: theme.blueText }}>Linked Topic</p>
                        <p className="text-xs line-clamp-2" style={{ color: theme.textBody }}>
                          {assessment.topic_nama}
                        </p>
                      </div>
                    )}

                    {/* Description */}
                    {assessment.assessment_keterangan && (
                      <div className="mb-2 relative z-10">
                        <p className="text-[10px] font-medium mb-0.5 uppercase tracking-wide" style={{ color: theme.blueText }}>Note</p>
                        <p className="text-xs line-clamp-3" style={{ color: theme.textBody }}>
                          {assessment.assessment_keterangan}
                        </p>
                      </div>
                    )}
                    
                    </div>
                    {/* End Content Container */}

                    {/* Action Buttons */}
                    <div className="relative z-10 pt-3 mt-auto" style={{ borderTop: `1px solid ${theme.border}` }}>
                      {hasCriteria && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            router.push(`/data/assessment_grading/${assessment.assessment_id}`)
                          }}
                          className="w-full flex items-center justify-center gap-2 px-3 py-2 mb-2 text-xs font-medium"
                          style={{ background: theme.greenBg, color: theme.greenText, borderRadius: '6px', border: `1px solid ${theme.border}` }}
                        >
                          <FontAwesomeIcon icon={faPaperPlane} />
                          {t('topicNew.buttons.inputGrades')}
                        </button>
                      )}
                      
                      {(canEdit || isAdmin) && (
                        <div className="flex gap-2">
                          {(isPending || isAdmin) && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDeleteAssessment(assessment.assessment_id, assessment.assessment_nama)
                              }}
                              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium"
                              style={{ background: theme.redBg, color: theme.redText, borderRadius: '6px', border: `1px solid ${theme.border}` }}
                            >
                              <FontAwesomeIcon icon={faTrash} />
                              Delete
                            </button>
                          )}
                          {canEdit && (
                            <div className="flex items-center text-[10px] px-2" style={{ color: theme.textSecondary }}>
                              {!hasCriteria ? 'Click to add criteria' : 'Click card to edit'}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )})}
              </div>
            ) : filteredAssessments.length === 0 ? (
              <div className="text-center py-12 text-sm" style={{ color: theme.textSecondary }}>No assessments found</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm" style={{ borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${theme.border}`, background: theme.subtleBg }}>
                      <th className="px-4 py-2.5 text-left font-medium uppercase tracking-wider w-10" style={{ color: theme.textSecondary }}>#</th>
                      <th className="px-4 py-2.5 text-left font-medium uppercase tracking-wider" style={{ color: theme.textSecondary }}>Assessment Name</th>
                      <th className="px-4 py-2.5 text-left font-medium uppercase tracking-wider" style={{ color: theme.textSecondary }}>Subject</th>
                      <th className="px-4 py-2.5 text-left font-medium uppercase tracking-wider" style={{ color: theme.textSecondary }}>Class</th>
                      <th className="px-4 py-2.5 text-left font-medium uppercase tracking-wider" style={{ color: theme.textSecondary }}>Criteria</th>
                      <th className="px-4 py-2.5 text-left font-medium uppercase tracking-wider" style={{ color: theme.textSecondary }}>Status</th>
                      <th className="px-4 py-2.5 text-left font-medium uppercase tracking-wider" style={{ color: theme.textSecondary }}>Date</th>
                      <th className="px-4 py-2.5 text-left font-medium uppercase tracking-wider" style={{ color: theme.textSecondary }}>Teacher</th>
                      <th className="px-4 py-2.5 text-center font-medium uppercase tracking-wider" style={{ color: theme.textSecondary }}>Nilai</th>
                      <th className="px-4 py-2.5 text-right font-medium uppercase tracking-wider" style={{ color: theme.textSecondary }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAssessments.map((assessment, idx) => {
                      const hasCriteria = assessment.criteria && assessment.criteria.length > 0
                      const isPending = assessment.assessment_status === 0 || assessment.assessment_status === 3
                      const canEdit = (isPending || !hasCriteria) && assessment.assessment_user_id === currentUserId
                      return (
                        <tr
                          key={assessment.assessment_id}
                          className="transition-colors"
                          style={{ borderBottom: `1px solid ${theme.border}`, cursor: canEdit ? 'pointer' : 'default' }}
                          onClick={() => canEdit && handleEditAssessment(assessment)}
                          onMouseEnter={e => e.currentTarget.style.background = theme.subtleBg}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                          <td className="px-4 py-3 text-center" style={{ color: theme.textSecondary }}>{idx + 1}</td>
                          <td className="px-4 py-3">
                            <div className="font-medium flex items-center gap-2" style={{ color: theme.textPrimary }}>
                              {assessment.topic_urutan && assessment.topic_urutan !== 999 && (
                                <span className="text-[10px] px-1.5 py-0.5 font-bold" style={{ background: theme.subtleBg, color: theme.textSecondary, borderRadius: '4px', border: `1px solid ${theme.border}` }}>U{assessment.topic_urutan}</span>
                              )}
                              {assessment.assessment_nama}
                            </div>
                            {assessment.topic_nama && <div className="text-[10px] mt-0.5 line-clamp-1" style={{ color: theme.textSecondary }}>{assessment.topic_nama}</div>}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="px-1.5 py-0.5 font-medium" style={{ background: theme.blueBg, color: theme.blueText, borderRadius: '4px' }}>{assessment.subject_name || 'N/A'}</span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="px-1.5 py-0.5 font-medium" style={{ background: theme.greenBg, color: theme.greenText, borderRadius: '4px' }}>{assessment.kelas_nama || 'N/A'}</span>
                          </td>
                          <td className="px-4 py-3">
                            {hasCriteria ? (
                              <div className="flex flex-wrap gap-1">
                                {assessment.criteria.map(c => (
                                  <span key={c.code} className="px-1.5 py-0.5 font-bold" style={{ background: theme.subtleBg, color: theme.textSecondary, borderRadius: '4px', border: `1px solid ${theme.border}` }}>{c.code}</span>
                                ))}
                              </div>
                            ) : (
                              <span className="px-1.5 py-0.5 font-medium" style={{ background: theme.yellowBg, color: theme.yellowText, borderRadius: '4px' }}>None</span>
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">{getAssessmentStatusBadge(assessment.assessment_status)}</td>
                          <td className="px-4 py-3 whitespace-nowrap" style={{ color: theme.textBody }}>
                            {assessment.assessment_tanggal
                              ? new Date(assessment.assessment_tanggal).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                              : <span className="italic" style={{ color: theme.textSecondary }}>Draft</span>}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap" style={{ color: theme.textBody }}>{assessment.teacher_name || '-'}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-center">
                            <span className="font-semibold px-1.5 py-0.5" style={{
                              background: assessment.total_students > 0 && assessment.graded_count === assessment.total_students ? theme.greenBg : assessment.graded_count > 0 ? theme.yellowBg : theme.subtleBg,
                              color: assessment.total_students > 0 && assessment.graded_count === assessment.total_students ? theme.greenText : assessment.graded_count > 0 ? theme.yellowText : theme.textSecondary,
                              borderRadius: '4px'
                            }}>
                              {assessment.graded_count}/{assessment.total_students}
                            </span>
                          </td>
                          <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1">
                              {hasCriteria && (
                                <button
                                  onClick={() => router.push(`/data/assessment_grading/${assessment.assessment_id}`)}
                                  className="px-2 py-1 text-xs font-medium"
                                  style={{ background: theme.greenBg, color: theme.greenText, borderRadius: '4px', border: `1px solid ${theme.border}` }}
                                >
                                  {t('topicNew.buttons.inputGrades')}
                                </button>
                              )}
                              {(isAdmin || (canEdit && isPending)) && (
                                <button
                                  onClick={() => handleDeleteAssessment(assessment.assessment_id, assessment.assessment_nama)}
                                  className="p-1.5 transition-colors"
                                  style={{ color: theme.redText, borderRadius: '4px' }}
                                  title={isAdmin ? 'Delete (Admin)' : 'Delete'}
                                >
                                  <FontAwesomeIcon icon={faTrash} className="text-xs" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'comment' && (
          <div className="p-6">
            <div className="flex items-start justify-between mb-1">
              <h2 className="text-base font-semibold" style={{ color: theme.textPrimary, fontFamily: "'Helvetica Neue', sans-serif" }}>Student Comments</h2>
              <button
                type="button"
                onClick={startCommentTour}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium"
                style={{ border: '1px solid #c7d2fe', borderRadius: '6px', background: '#eef2ff', color: '#4338ca', cursor: 'pointer', flexShrink: 0 }}
              >
                <FontAwesomeIcon icon={faLightbulb} className="text-xs" />
                {t('topicNew.mentorCommentTab.tourBtn')}
              </button>
            </div>
            <p className="text-sm mb-5" style={{ color: theme.textSecondary }}>Write semester comments for each student per subject.</p>
            
            {/* Filter row: Year → Subject → Kelas → Semester */}
            <div id="comment-filter-section" className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-5">
              {/* Tahun Ajaran */}
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: theme.textSecondary }}>1. Tahun Ajaran</label>
                <select
                  value={commentYear}
                  onChange={(e) => {
                    setCommentYear(e.target.value)
                    // reset downstream
                    setCommentSubject('')
                    setCommentKelas('')
                    setCommentSemester('')
                    setCommentKelasOptions([])
                    setCommentStudents([])
                  }}
                  className="w-full px-3 py-2 text-sm focus:outline-none"
                  style={{ border: `1px solid ${theme.border}`, borderRadius: '6px', background: theme.inputBg, color: theme.textBody }}
                >
                  <option value="">Pilih Tahun Ajaran</option>
                  {yearOptions.map(y => (
                    <option key={y.year_id} value={y.year_id}>{y.year_name}</option>
                  ))}
                </select>
              </div>

              {/* Subject */}
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: theme.textSecondary }}>2. {t('topicNew.fields.subject')}</label>
                <select
                  id="comment-subject-select"
                  value={commentSubject}
                  onChange={(e) => handleCommentSubjectChange(e.target.value)}
                  disabled={!commentYear}
                  className="w-full px-3 py-2 text-sm focus:outline-none"
                  style={{ border: `1px solid ${theme.border}`, borderRadius: '6px', background: theme.inputBg, color: theme.textBody, opacity: !commentYear ? 0.5 : 1 }}
                >
                  <option value="">{!commentYear ? 'Pilih tahun dulu' : t('topicNew.fields.selectSubject')}</option>
                  {subjects.map(s => (
                    <option key={s.subject_id} value={s.subject_id}>{s.subject_name}</option>
                  ))}
                </select>
              </div>
              
              {/* Kelas */}
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: theme.textSecondary }}>3. {t('topicNew.filters.class')}</label>
                <select
                  id="comment-kelas-select"
                  value={commentKelas}
                  onChange={(e) => handleCommentKelasChange(e.target.value)}
                  disabled={!commentSubject || loadingCommentKelas}
                  className="w-full px-3 py-2 text-sm focus:outline-none"
                  style={{ border: `1px solid ${theme.border}`, borderRadius: '6px', background: theme.inputBg, color: theme.textBody, opacity: (!commentSubject || loadingCommentKelas) ? 0.5 : 1 }}
                >
                  <option value="">{loadingCommentKelas ? t('topicNew.fields.loading') : t('topicNew.fields.selectClass')}</option>
                  {commentKelasOptions.map(k => (
                    <option key={k.kelas_id} value={k.kelas_id}>{k.kelas_nama}</option>
                  ))}
                </select>
              </div>
              
              {/* Semester */}
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: theme.textSecondary }}>4. Semester</label>
                <div id="comment-semester-row" className="flex gap-2">
                  {[1, 2].map(sem => (
                    <button
                      key={sem}
                      type="button"
                      disabled={!commentKelas}
                      onClick={() => handleCommentSemesterChange(String(sem))}
                      className="flex-1 px-4 py-2 text-sm font-medium transition-colors"
                      style={{
                        borderRadius: '6px',
                        background: commentSemester === String(sem) ? theme.textPrimary : theme.subtleBg,
                        color: commentSemester === String(sem) ? theme.cardBg : theme.textSecondary,
                        border: `1px solid ${theme.border}`,
                        opacity: !commentKelas ? 0.5 : 1,
                      }}
                    >
                      Semester {sem}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Save All bar */}
            {commentStudents.length > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 mb-4" style={{ background: theme.subtleBg, border: `1px solid ${theme.border}`, borderRadius: '8px' }}>
                <span className="text-sm" style={{ color: theme.textBody }}>
                  {commentStudents.length} student{commentStudents.length !== 1 ? 's' : ''}
                  {commentStudents.filter(s => !s.saved).length > 0 && (
                    <span className="ml-2 font-medium" style={{ color: theme.yellowText }}>
                      — {commentStudents.filter(s => !s.saved).length} unsaved
                    </span>
                  )}
                </span>
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="ai-tooltip-wrap">
                    <button type="button" onClick={downloadCommentTemplate} className="px-3 py-1.5 text-sm font-medium flex items-center gap-1.5" style={{ border: `1px solid ${theme.border}`, borderRadius: '6px', background: theme.cardBg, color: theme.blueText, cursor: 'pointer' }}>
                      <FontAwesomeIcon icon={faFileAlt} />Download Template
                    </button>
                    <div className="ai-tooltip">{t('topicNew.mentorCommentTab.downloadTemplateTooltip')}</div>
                  </div>
                  <div className="ai-tooltip-wrap">
                    <button type="button" onClick={() => commentImportRef.current?.click()} className="px-3 py-1.5 text-sm font-medium flex items-center gap-1.5" style={{ border: `1px solid ${theme.border}`, borderRadius: '6px', background: theme.cardBg, color: theme.textBody, cursor: 'pointer' }}>
                      <FontAwesomeIcon icon={faPaperPlane} />Import Excel
                    </button>
                    <div className="ai-tooltip">{t('topicNew.mentorCommentTab.importExcelTooltip')}</div>
                  </div>
                  <input ref={commentImportRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) handleCommentImport(file) }} />
                  <button type="button" onClick={saveAllComments} disabled={commentStudents.every(s => s.saved) || savingCommentId !== null} className="px-4 py-1.5 text-sm font-medium" style={{ background: theme.greenBg, color: theme.greenText, border: `1px solid ${theme.border}`, borderRadius: '6px' }}>
                    <FontAwesomeIcon icon={faSave} className="mr-1" />Save All
                  </button>
                </div>
              </div>
            )}
            
            {/* Loading */}
            {loadingComments && (
              <div className="text-center py-12">
                <FontAwesomeIcon icon={faSpinner} spin className="text-2xl" style={{ color: theme.textSecondary }} />
                <p className="text-sm mt-2" style={{ color: theme.textSecondary }}>Loading students...</p>
              </div>
            )}
            
            {/* Empty / prompt states */}
            {!loadingComments && !commentSemester && (
              <div className="text-center py-12" style={{ color: theme.textSecondary }}>
                <FontAwesomeIcon icon={faComments} className="text-4xl mb-2 opacity-30" />
                <p className="text-sm">Select subject, class, and semester to start writing comments</p>
              </div>
            )}
            
            {commentSemester && !loadingComments && commentStudents.length === 0 && (
              <div className="text-center py-12 text-sm" style={{ color: theme.textSecondary }}>
                <p>No students found in this class</p>
              </div>
            )}
            
            {/* Student list */}
            {!loadingComments && commentStudents.length > 0 && (
              <div className="space-y-3">
                {commentStudents.map((student, idx) => (
                  <div key={student.user_id} style={{ border: `1px solid ${!student.saved ? theme.yellowText : theme.border}`, borderRadius: '8px', padding: '16px', background: !student.saved ? theme.yellowBg : theme.cardBg }}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono w-5" style={{ color: theme.textSecondary }}>{idx + 1}.</span>
                        <h3 className="font-medium text-sm" style={{ color: theme.textPrimary }}>{student.nama}</h3>
                        {!student.saved && (
                          <span className="text-[10px] px-1.5 py-0.5" style={{ background: theme.yellowBg, color: theme.yellowText, borderRadius: '4px' }}>unsaved</span>
                        )}
                        {student.saved && student.comment_id && (
                          <span className="text-[10px] px-1.5 py-0.5" style={{ background: theme.greenBg, color: theme.greenText, borderRadius: '4px' }}>saved</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {/* AI Help button with custom tooltip */}
                        <div className="ai-tooltip-wrap">
                          <button
                            type="button"
                            onClick={() => { setCommentAiTarget({ user_id: student.user_id, nama: student.nama }); setCommentAiInput({ star1: '', star2: '', wish: '' }); setCommentAiResult(''); setCommentAiError(''); setCommentAiContradiction(null); setCommentAiModalOpen(true) }}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-sm font-medium"
                            style={{ border: '1px solid #ddd6fe', borderRadius: '6px', background: '#ede9fe', color: '#6d28d9', cursor: 'pointer' }}
                          >
                            <FontAwesomeIcon icon={faWandMagicSparkles} className="text-xs" />AI Help
                          </button>
                          <div className="ai-tooltip">{t('topicNew.mentorCommentTab.aiHelpTooltip')}</div>
                        </div>
                        {/* Refine button with custom tooltip */}
                        <div className={`ai-tooltip-wrap ${!student.comment_text?.trim() ? 'opacity-40 pointer-events-none' : ''}`}>
                          <button
                            type="button"
                            disabled={!student.comment_text?.trim()}
                            onClick={() => {
                              setRefineModalTarget({ user_id: student.user_id, nama: student.nama })
                              setRefineOriginal(student.comment_text || '')
                              setRefineResult(null)
                              setRefineError('')
                              setRefineModalOpen(true)
                            }}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-sm font-medium"
                            style={{ border: '1px solid #fed7aa', borderRadius: '6px', background: '#fff7ed', color: '#c2410c', cursor: 'pointer' }}
                          >
                            <FontAwesomeIcon icon={faSliders} className="text-xs" />Refine
                          </button>
                          <div className="ai-tooltip">{t('topicNew.mentorCommentTab.refineTooltip')}</div>
                        </div>
                        <button type="button" onClick={() => saveComment(student)} disabled={student.saved || savingCommentId === student.user_id} className="px-3 py-1.5 text-sm font-medium" style={{ background: theme.blueBg, color: theme.blueText, border: `1px solid ${theme.border}`, borderRadius: '6px' }}>
                          {savingCommentId === student.user_id ? 'Saving...' : 'Save'}
                        </button>
                      </div>
                    </div>

                    {/* Grade Summary */}
                    {commentStudentGrades[student.user_id]?.length > 0 ? (
                      <div className="mb-3 px-3 py-2" style={{ borderRadius: '6px', border: `1px solid ${theme.border}`, background: theme.blueBg }}>
                        <p className="text-[11px] font-semibold mb-1.5" style={{ color: theme.blueText }}>Assessment Grades — Semester {commentSemester}</p>
                        <div className="overflow-x-auto">
                          <table className="text-[11px] w-full">
                            <thead>
                              <tr style={{ color: theme.textSecondary }}>
                                <th className="text-left pr-3 pb-1 font-medium">Assessment</th>
                                <th className="text-center px-2 pb-1 font-medium w-8">A</th>
                                <th className="text-center px-2 pb-1 font-medium w-8">B</th>
                                <th className="text-center px-2 pb-1 font-medium w-8">C</th>
                                <th className="text-center px-2 pb-1 font-medium w-8">D</th>
                              </tr>
                            </thead>
                            <tbody>
                              {commentStudentGrades[student.user_id].map((g, gi) => (
                                <tr key={gi} style={{ borderTop: `1px solid ${theme.border}` }}>
                                  <td className="pr-3 py-1 max-w-[220px] truncate" style={{ color: theme.textBody }} title={g.name}>{g.name}</td>
                                  <td className="text-center px-2 py-1 font-mono font-semibold" style={{ color: g.A !== null ? theme.blueText : theme.textSecondary }}>{g.A ?? '–'}</td>
                                  <td className="text-center px-2 py-1 font-mono font-semibold" style={{ color: g.B !== null ? theme.blueText : theme.textSecondary }}>{g.B ?? '–'}</td>
                                  <td className="text-center px-2 py-1 font-mono font-semibold" style={{ color: g.C !== null ? theme.blueText : theme.textSecondary }}>{g.C ?? '–'}</td>
                                  <td className="text-center px-2 py-1 font-mono font-semibold" style={{ color: g.D !== null ? theme.blueText : theme.textSecondary }}>{g.D ?? '–'}</td>
                                </tr>
                              ))}
                              {/* Avg row */}
                              {(() => {
                                const gs = commentStudentGrades[student.user_id]
                                const criAvg = (key) => { const v = gs.map(g => g[key]).filter(v => v !== null); return v.length > 0 ? Math.round(v.reduce((a,b)=>a+b,0)/v.length) : null }
                                const avgA = criAvg('A')
                                const avgB = criAvg('B')
                                const avgC = criAvg('C')
                                const avgD = criAvg('D')
                                const vals = [avgA, avgB, avgC, avgD].filter(v => v !== null)
                                const total = vals.reduce((a, b) => a + b, 0)
                                const scale = vals.length / 4
                                const b = [5, 9, 14, 18, 23, 27].map(v => Math.round(v * scale))
                                let final = null
                                if (vals.length > 0) {
                                  if (total <= b[0]) final = 1
                                  else if (total <= b[1]) final = 2
                                  else if (total <= b[2]) final = 3
                                  else if (total <= b[3]) final = 4
                                  else if (total <= b[4]) final = 5
                                  else if (total <= b[5]) final = 6
                                  else final = 7
                                }
                                return (
                                  <tr style={{ borderTop: `2px solid ${theme.border}`, background: theme.subtleBg }}>
                                    <td className="pr-3 py-1 font-semibold" style={{ color: theme.blueText }}>Avg</td>
                                    <td className="text-center px-2 py-1 font-mono font-bold" style={{ color: theme.textPrimary }}>{avgA ?? '–'}</td>
                                    <td className="text-center px-2 py-1 font-mono font-bold" style={{ color: theme.textPrimary }}>{avgB ?? '–'}</td>
                                    <td className="text-center px-2 py-1 font-mono font-bold" style={{ color: theme.textPrimary }}>{avgC ?? '–'}</td>
                                    <td className="text-center px-2 py-1 font-mono font-bold" style={{ color: theme.textPrimary }}>{avgD ?? '–'}</td>
                                  </tr>
                                )
                              })()}
                            </tbody>
                          </table>
                        </div>
                        {/* Final grade badge — avg per criterion, sum, scaled boundary */}
                        {(() => {
                          const gs = commentStudentGrades[student.user_id]
                          const criAvg = (key) => { const v = gs.map(g => g[key]).filter(v => v !== null); return v.length > 0 ? Math.round(v.reduce((a,b)=>a+b,0)/v.length) : null }
                          const vals = ['A','B','C','D'].map(k => criAvg(k)).filter(v => v !== null)
                          if (vals.length === 0) return null
                          const total = vals.reduce((a, b) => a + b, 0)
                          // Match PDF generator: average per criterion, scale boundary by numCriteria/4
                          const currentSubject = subjects.find(s => s.subject_id === selectedTopic?.topic_subject_id)
                          const customBounds = currentSubject?.custom_grade_boundaries
                          const scale = vals.length / 4
                          const b = (customBounds && customBounds.length === 6)
                            ? customBounds
                            : [5, 9, 14, 18, 23, 27].map(v => Math.round(v * scale))
                          let final = total <= b[0] ? 1 : total <= b[1] ? 2 : total <= b[2] ? 3 : total <= b[3] ? 4 : total <= b[4] ? 5 : total <= b[5] ? 6 : 7
                          return (
                            <div className="mt-1.5 flex items-center gap-2">
                              <span className="text-[11px]" style={{ color: theme.textSecondary }}>IB Grade:</span>
                              <span className="text-xs font-bold px-2 py-0.5" style={{ background: theme.greenBg, color: theme.greenText, borderRadius: '4px' }}>{final}</span>
                              <span className="text-[10px]" style={{ color: theme.textSecondary }}>(total {total})</span>
                            </div>
                          )
                        })()}
                      </div>
                    ) : commentSemester && commentStudentGrades[student.user_id] !== undefined ? (
                      <div className="mb-3 px-3 py-2 text-[11px]" style={{ borderRadius: '6px', border: `1px solid ${theme.border}`, background: theme.subtleBg, color: theme.textSecondary }}>
                        No assessment grades yet for this semester.
                      </div>
                    ) : null}

                    <textarea
                      value={student.comment_text}
                      onChange={(e) => updateCommentText(student.user_id, e.target.value)}
                      rows={6}
                      maxLength={600}
                      placeholder="Write your comment for this student..."
                      className="w-full px-3 py-2 text-sm focus:outline-none resize-y"
                      style={{ border: `1px solid ${theme.border}`, borderRadius: '6px', background: theme.inputBg, color: theme.textBody }}
                    />
                    <p className="text-xs text-right mt-1" style={{ color: theme.textSecondary }}>{(student.comment_text || '').length}/600</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'mentor' && isWaliKelas && (
          <div className="p-6">
            <h2 className="text-base font-semibold mb-1" style={{ color: theme.textPrimary, fontFamily: "'Helvetica Neue', sans-serif" }}>{t('topicNew.mentorCommentTab.title')}</h2>
            <p className="text-sm mb-5" style={{ color: theme.textSecondary }}>{t('topicNew.mentorCommentTab.subtitle')}</p>

            {/* Filter row: Year → Kelas → Semester */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
              {/* Tahun Ajaran */}
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: theme.textSecondary }}>1. Tahun Ajaran</label>
                <select
                  value={mentorYear}
                  onChange={(e) => setMentorYear(e.target.value)}
                  className="w-full px-3 py-2 text-sm focus:outline-none"
                  style={{ border: `1px solid ${theme.border}`, borderRadius: '6px', background: theme.inputBg, color: theme.textBody }}
                >
                  <option value="">Pilih Tahun Ajaran</option>
                  {yearOptions.map(y => (
                    <option key={y.year_id} value={y.year_id}>{y.year_name}</option>
                  ))}
                </select>
              </div>

              {/* Kelas */}
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: theme.textSecondary }}>2. {t('topicNew.mentorCommentTab.classLabel')}</label>
                <select
                  value={mentorKelas}
                  onChange={(e) => handleMentorKelasChange(e.target.value)}
                  disabled={!mentorYear}
                  className="w-full px-3 py-2 text-sm focus:outline-none"
                  style={{ border: `1px solid ${theme.border}`, borderRadius: '6px', background: theme.inputBg, color: theme.textBody, opacity: !mentorYear ? 0.5 : 1 }}
                >
                  <option value="">{!mentorYear ? 'Pilih tahun ajaran dulu' : t('topicNew.mentorCommentTab.selectClass')}</option>
                  {mentorKelasOptions.map(k => (
                    <option key={k.kelas_id} value={k.kelas_id}>{k.kelas_nama}</option>
                  ))}
                </select>
              </div>

              {/* Semester */}
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: theme.textSecondary }}>3. {t('topicNew.mentorCommentTab.semesterLabel')}</label>
                <div className="flex gap-2">
                  {[1, 2].map(sem => (
                    <button
                      key={sem}
                      type="button"
                      disabled={!mentorKelas}
                      onClick={() => handleMentorSemesterChange(String(sem))}
                      className="flex-1 px-4 py-2 text-sm font-medium transition-colors"
                      style={{
                        borderRadius: '6px',
                        background: mentorSemester === String(sem) ? theme.textPrimary : theme.subtleBg,
                        color: mentorSemester === String(sem) ? theme.cardBg : theme.textSecondary,
                        border: `1px solid ${theme.border}`,
                        opacity: !mentorKelas ? 0.5 : 1,
                      }}
                    >
                      Semester {sem}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Save All bar */}
            {mentorStudents.length > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 mb-4" style={{ background: theme.subtleBg, border: `1px solid ${theme.border}`, borderRadius: '8px' }}>
                <span className="text-sm" style={{ color: theme.textBody }}>
                  {mentorStudents.length} {mentorStudents.length !== 1 ? t('topicNew.mentorCommentTab.studentsPlural') : t('topicNew.mentorCommentTab.students')}
                  {mentorStudents.filter(s => !s.saved).length > 0 && (
                    <span className="ml-2 font-medium" style={{ color: theme.yellowText }}>
                      — {mentorStudents.filter(s => !s.saved).length} {t('topicNew.mentorCommentTab.unsaved')}
                    </span>
                  )}
                </span>
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="ai-tooltip-wrap">
                    <button type="button" onClick={downloadMentorCommentTemplate} className="px-3 py-1.5 text-sm font-medium flex items-center gap-1.5" style={{ border: `1px solid ${theme.border}`, borderRadius: '6px', background: theme.cardBg, color: theme.blueText, cursor: 'pointer' }}>
                      <FontAwesomeIcon icon={faFileAlt} />Download Template
                    </button>
                    <div className="ai-tooltip">{t('topicNew.mentorCommentTab.downloadTemplateTooltip')}</div>
                  </div>
                  <div className="ai-tooltip-wrap">
                    <button type="button" onClick={() => mentorImportRef.current?.click()} className="px-3 py-1.5 text-sm font-medium flex items-center gap-1.5" style={{ border: `1px solid ${theme.border}`, borderRadius: '6px', background: theme.cardBg, color: theme.textBody, cursor: 'pointer' }}>
                      <FontAwesomeIcon icon={faPaperPlane} />Import Excel
                    </button>
                    <div className="ai-tooltip">{t('topicNew.mentorCommentTab.importExcelTooltip')}</div>
                  </div>
                  <input ref={mentorImportRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) handleMentorCommentImport(file) }} />
                  <button type="button" onClick={saveAllMentorComments} disabled={mentorStudents.every(s => s.saved) || savingMentorCommentId !== null} className="px-4 py-1.5 text-sm font-medium" style={{ background: theme.greenBg, color: theme.greenText, border: `1px solid ${theme.border}`, borderRadius: '6px' }}>
                    <FontAwesomeIcon icon={faSave} className="mr-1" />{t('topicNew.mentorCommentTab.saveAll')}
                  </button>
                </div>
              </div>
            )}

            {/* Loading */}
            {loadingMentorComments && (
              <div className="text-center py-12">
                <FontAwesomeIcon icon={faSpinner} spin className="text-2xl" style={{ color: theme.textSecondary }} />
                <p className="text-sm mt-2" style={{ color: theme.textSecondary }}>{t('topicNew.mentorCommentTab.loading')}</p>
              </div>
            )}

            {/* Empty / prompt states */}
            {!loadingMentorComments && !mentorSemester && (
              <div className="text-center py-12" style={{ color: theme.textSecondary }}>
                <FontAwesomeIcon icon={faHouseUser} className="text-4xl mb-2 opacity-30" />
                <p className="text-sm">{t('topicNew.mentorCommentTab.selectPrompt')}</p>
              </div>
            )}

            {mentorSemester && !loadingMentorComments && mentorStudents.length === 0 && (
              <div className="text-center py-12 text-sm" style={{ color: theme.textSecondary }}>
                <p>{t('topicNew.mentorCommentTab.noStudents')}</p>
              </div>
            )}

            {/* Student list */}
            {!loadingMentorComments && mentorStudents.length > 0 && (
              <div className="space-y-3">
                {mentorStudents.map((student, idx) => (
                  <div key={student.user_id} style={{ border: `1px solid ${!student.saved ? theme.yellowText : theme.border}`, borderRadius: '8px', padding: '16px', background: !student.saved ? theme.yellowBg : theme.cardBg }}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono w-5" style={{ color: theme.textSecondary }}>{idx + 1}.</span>
                        <h3 className="font-medium text-sm" style={{ color: theme.textPrimary }}>{student.nama}</h3>
                        {!student.saved && (
                          <span className="text-[10px] px-1.5 py-0.5" style={{ background: theme.yellowBg, color: theme.yellowText, borderRadius: '4px' }}>unsaved</span>
                        )}
                        {student.saved && student.comment_id && (
                          <span className="text-[10px] px-1.5 py-0.5" style={{ background: theme.greenBg, color: theme.greenText, borderRadius: '4px' }}>saved</span>
                        )}
                      </div>
                      <button type="button" onClick={() => saveMentorComment(student)} disabled={student.saved || savingMentorCommentId === student.user_id} className="px-3 py-1.5 text-sm font-medium" style={{ background: theme.blueBg, color: theme.blueText, border: `1px solid ${theme.border}`, borderRadius: '6px' }}>
                        {savingMentorCommentId === student.user_id ? t('topicNew.mentorCommentTab.saving') : t('topicNew.mentorCommentTab.save')}
                      </button>
                    </div>
                    {/* Attendance row */}
                    <div className="grid grid-cols-5 gap-3 mb-3">
                      {[
                        { field: 'present', label: t('topicNew.mentorCommentTab.present') },
                        { field: 'absent', label: t('topicNew.mentorCommentTab.absent') },
                        { field: 'late', label: t('topicNew.mentorCommentTab.late') },
                        { field: 'sick', label: t('topicNew.mentorCommentTab.sick') },
                        { field: 'excused', label: t('topicNew.mentorCommentTab.excused') }
                      ].map(({ field, label }) => (
                        <div key={field}>
                          <label className="block text-xs font-medium mb-1" style={{ color: theme.textSecondary }}>{label}</label>
                          <input
                            type="number"
                            min="0"
                            value={student[field]}
                            onChange={(e) => updateMentorAttendance(student.user_id, field, e.target.value)}
                            onFocus={(e) => e.target.select()}
                            className="w-full px-2 py-1.5 text-sm text-center font-medium focus:outline-none"
                            style={{ border: `1px solid ${theme.border}`, borderRadius: '6px', background: theme.inputBg, color: theme.textBody }}
                          />
                        </div>
                      ))}
                    </div>
                    <textarea
                      value={student.comment_text}
                      onChange={(e) => updateMentorCommentText(student.user_id, e.target.value)}
                      rows={6}
                      maxLength={600}
                      placeholder={t('topicNew.mentorCommentTab.commentPlaceholder')}
                      className="w-full px-3 py-2 text-sm focus:outline-none resize-y"
                      style={{ border: `1px solid ${theme.border}`, borderRadius: '6px', background: theme.inputBg, color: theme.textBody }}
                    />
                    <p className="text-xs text-right mt-1" style={{ color: theme.textSecondary }}>{(student.comment_text || '').length}/600</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── DAILY ATTENDANCE TAB ─────────────────────────────────── */}
        {activeTab === 'attendance' && isWaliKelas && (
          <div className="p-6">
            <div className="flex items-center gap-2 mb-1">
              <FontAwesomeIcon icon={faCalendarCheck} style={{ color: theme.blueText }} />
              <h2 className="text-base font-semibold" style={{ color: theme.textPrimary, fontFamily: "'Helvetica Neue', sans-serif" }}>
                {t('topicNew.tabs.dailyAttendance') || 'Daily Attendance'}
              </h2>
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: theme.blueBg, color: theme.blueText }}>
                {t('topicNew.mentorCommentTab.dailyAttendance.beta') || 'Beta'}
              </span>
            </div>
            <p className="text-sm mb-5" style={{ color: theme.textSecondary }}>
              Catat kehadiran harian siswa di kelas Anda. Pilih tahun ajaran dan kelas untuk mulai mencatat.
            </p>

            {/* Filter row: Year → Kelas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: theme.textSecondary }}>1. Tahun Ajaran</label>
                <select
                  value={mentorYear}
                  onChange={(e) => setMentorYear(e.target.value)}
                  className="w-full px-3 py-2 text-sm focus:outline-none"
                  style={{ border: `1px solid ${theme.border}`, borderRadius: '6px', background: theme.inputBg, color: theme.textBody }}
                >
                  <option value="">Pilih Tahun Ajaran</option>
                  {yearOptions.map(y => (
                    <option key={y.year_id} value={y.year_id}>{y.year_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: theme.textSecondary }}>2. {t('topicNew.mentorCommentTab.classLabel')}</label>
                <select
                  value={mentorKelas}
                  onChange={(e) => handleMentorKelasChange(e.target.value)}
                  disabled={!mentorYear}
                  className="w-full px-3 py-2 text-sm focus:outline-none"
                  style={{ border: `1px solid ${theme.border}`, borderRadius: '6px', background: theme.inputBg, color: theme.textBody, opacity: !mentorYear ? 0.5 : 1 }}
                >
                  <option value="">{!mentorYear ? 'Pilih tahun ajaran dulu' : t('topicNew.mentorCommentTab.selectClass')}</option>
                  {mentorKelasOptions.map(k => (
                    <option key={k.kelas_id} value={k.kelas_id}>{k.kelas_nama}</option>
                  ))}
                </select>
              </div>
            </div>

            {!mentorKelas ? (
              <div className="text-center py-12 text-sm" style={{ color: theme.textSecondary }}>
                {t('topicNew.mentorCommentTab.dailyAttendance.selectClassFirst') || 'Select a class to view attendance.'}
              </div>
            ) : (
              <div>
                {/* Date navigation */}
                <div className="flex items-center gap-2 mb-4 flex-wrap">
                  <button
                    type="button"
                    onClick={() => {
                      const d = new Date(attendanceDate); d.setDate(d.getDate() - 1)
                      setAttendanceDate(d.toLocaleDateString('en-CA'))
                    }}
                    className="px-3 py-1.5 text-sm"
                    style={{ border: `1px solid ${theme.border}`, borderRadius: '6px', background: theme.inputBg, color: theme.textBody, cursor: 'pointer' }}
                  >{t('topicNew.mentorCommentTab.dailyAttendance.yesterday') || '← Yesterday'}</button>

                  <input
                    type="date"
                    value={attendanceDate}
                    onChange={e => setAttendanceDate(e.target.value)}
                    className="px-3 py-1.5 text-sm"
                    style={{ border: `1px solid ${theme.border}`, borderRadius: '6px', background: theme.inputBg, color: theme.textBody }}
                  />

                  <button
                    type="button"
                    onClick={() => {
                      const d = new Date(attendanceDate); d.setDate(d.getDate() + 1)
                      setAttendanceDate(d.toLocaleDateString('en-CA'))
                    }}
                    className="px-3 py-1.5 text-sm"
                    style={{ border: `1px solid ${theme.border}`, borderRadius: '6px', background: theme.inputBg, color: theme.textBody, cursor: 'pointer' }}
                  >{t('topicNew.mentorCommentTab.dailyAttendance.tomorrow') || 'Tomorrow →'}</button>

                  <div className="flex gap-2 ml-auto">
                    <button
                      type="button"
                      onClick={clearAttendance}
                      disabled={attendanceStudents.length === 0 || loadingAttendance || Object.keys(attendanceRecords).length === 0}
                      className="px-3 py-1.5 text-sm font-medium"
                      style={{
                        border: `1px solid ${theme.border}`, borderRadius: '6px',
                        background: theme.redBg, color: theme.redText, cursor: 'pointer',
                        opacity: (attendanceStudents.length === 0 || Object.keys(attendanceRecords).length === 0) ? 0.4 : 1
                      }}
                    >
                      {t('topicNew.mentorCommentTab.dailyAttendance.clearData') || 'Clear Date'}
                    </button>
                    <button
                      type="button"
                      onClick={markAllHadir}
                      disabled={attendanceStudents.length === 0 || loadingAttendance}
                      className="px-3 py-1.5 text-sm font-medium"
                      style={{
                        border: `1px solid ${theme.border}`, borderRadius: '6px',
                        background: theme.greenBg, color: theme.greenText, cursor: 'pointer',
                        opacity: attendanceStudents.length === 0 ? 0.5 : 1
                      }}
                    >
                      {t('topicNew.mentorCommentTab.dailyAttendance.markAllPresent') || '✓ All Present'}
                    </button>
                  </div>
                </div>

                {/* Student attendance table */}
                {loadingAttendance ? (
                  <div className="text-center py-6" style={{ color: theme.textSecondary }}>
                    <FontAwesomeIcon icon={faSpinner} spin className="mr-2" />
                    {t('topicNew.mentorCommentTab.dailyAttendance.loading') || 'Loading attendance data...'}
                  </div>
                ) : attendanceStudents.length === 0 ? (
                  <div className="text-center py-6 text-sm" style={{ color: theme.textSecondary }}>
                    {t('topicNew.mentorCommentTab.dailyAttendance.noStudents') || 'No students in this class.'}
                  </div>
                ) : (
                  <div className="rounded-lg overflow-hidden" style={{ border: `1px solid ${theme.border}` }}>
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr style={{ background: theme.subtleBg, borderBottom: `1px solid ${theme.border}` }}>
                          <th className="py-2 px-3 text-left text-xs font-semibold" style={{ color: theme.textSecondary }}>
                            {t('topicNew.mentorCommentTab.dailyAttendance.colNo') || '#'}
                          </th>
                          <th className="py-2 px-3 text-left text-xs font-semibold" style={{ color: theme.textSecondary }}>
                            {t('topicNew.mentorCommentTab.dailyAttendance.colName') || 'Student Name'}
                          </th>
                          <th className="py-2 px-3 text-center text-xs font-semibold" style={{ color: theme.textSecondary }}>
                            {t('topicNew.mentorCommentTab.dailyAttendance.colStatus') || 'Status'}
                          </th>
                          <th className="py-2 px-3 text-left text-xs font-semibold" style={{ color: theme.textSecondary }}>
                            {t('topicNew.mentorCommentTab.dailyAttendance.colNote') || 'Note'}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {attendanceStudents.map((student, idx) => {
                          const rec = attendanceRecords[student.detail_siswa_id]
                          const currentStatus = rec?.status || ''
                          const isSaving = savingAttendanceId === student.detail_siswa_id
                          const statusOptions = [
                            { value: 'hadir',        label: t('topicNew.mentorCommentTab.dailyAttendance.statusHadir')        || 'Present',     bg: '#dcfce7', color: '#16a34a' },
                            { value: 'tidak_hadir',  label: t('topicNew.mentorCommentTab.dailyAttendance.statusTidakHadir')  || 'Absent',      bg: '#fee2e2', color: '#dc2626' },
                            { value: 'ijin',         label: t('topicNew.mentorCommentTab.dailyAttendance.statusIjin')         || 'Excused',     bg: '#fef3c7', color: '#d97706' },
                            { value: 'terlambat',    label: t('topicNew.mentorCommentTab.dailyAttendance.statusTerlambat')    || 'Late',        bg: '#e0e7ff', color: '#4338ca' },
                            { value: 'pulang_cepat', label: t('topicNew.mentorCommentTab.dailyAttendance.statusPulangCepat') || 'Early Leave',  bg: '#f3e8ff', color: '#7c3aed' },
                          ]
                          return (
                            <tr key={student.detail_siswa_id} style={{ borderBottom: `1px solid ${theme.border}` }}>
                              <td className="py-2.5 px-3 text-xs font-mono" style={{ color: theme.textSecondary }}>{idx + 1}</td>
                              <td className="py-2.5 px-3 font-medium" style={{ color: theme.textPrimary }}>
                                {student.nama}
                                {isSaving && <FontAwesomeIcon icon={faSpinner} spin className="ml-2 text-xs" style={{ color: theme.textSecondary }} />}
                              </td>
                              <td className="py-2 px-3">
                                <div className="flex flex-wrap gap-1 justify-center">
                                  {statusOptions.map(opt => (
                                    <button
                                      key={opt.value}
                                      type="button"
                                      disabled={isSaving}
                                      onClick={() => saveSingleAttendance(student.detail_siswa_id, opt.value, rec?.keterangan || '')}
                                      className="px-2 py-0.5 text-xs font-medium rounded-full transition-all"
                                      style={{
                                        background: currentStatus === opt.value ? opt.bg : theme.subtleBg,
                                        color: currentStatus === opt.value ? opt.color : theme.textSecondary,
                                        border: `1px solid ${currentStatus === opt.value ? opt.color : theme.border}`,
                                        fontWeight: currentStatus === opt.value ? 700 : 400,
                                        cursor: isSaving ? 'not-allowed' : 'pointer',
                                        opacity: isSaving ? 0.6 : 1,
                                      }}
                                    >{opt.label}</button>
                                  ))}
                                </div>
                              </td>
                              <td className="py-2 px-3">
                                <input
                                  type="text"
                                  value={rec?.keterangan || ''}
                                  placeholder={t('topicNew.mentorCommentTab.dailyAttendance.notePlaceholder') || 'Optional...'}
                                  onChange={e => setAttendanceRecords(prev => ({
                                    ...prev,
                                    [student.detail_siswa_id]: { ...(prev[student.detail_siswa_id] || {}), keterangan: e.target.value }
                                  }))}
                                  onBlur={e => {
                                    if (currentStatus) saveSingleAttendance(student.detail_siswa_id, currentStatus, e.target.value)
                                  }}
                                  className="w-full px-2 py-1 text-xs focus:outline-none"
                                  style={{ border: `1px solid ${theme.border}`, borderRadius: '4px', background: theme.inputBg, color: theme.textBody, minWidth: '100px' }}
                                />
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'community_project' && (
          <CommunityProjectTab
            currentUserId={currentUserId}
            isAdmin={isAdmin}
          />
        )}

        {activeTab === 'report' && (
          <div className="p-6">
            <div className="mb-5">
              <h2 className="text-base font-semibold mb-1" style={{ color: theme.textPrimary, fontFamily: "'Helvetica Neue', sans-serif" }}>{t('topicNew.report.title')}</h2>
              <p className="text-sm" style={{ color: theme.textSecondary }}>{t('topicNew.report.subtitle')}</p>
            </div>
            
            {/* Filters */}
            <div className="p-4 mb-5" style={{ background: theme.cardBg, border: `1px solid ${theme.border}`, borderRadius: '8px' }}>
              {/* Mode selector */}
              <div className="flex items-center gap-2 mb-4">
                <span className="text-sm font-medium mr-2" style={{ color: theme.textSecondary }}>{t('topicNew.report.modeLabel')}</span>
                <button
                  onClick={() => setReportMode('single')}
                  className="px-3 py-1.5 text-sm font-medium"
                  style={{ borderRadius: '6px', background: reportMode === 'single' ? theme.textPrimary : theme.subtleBg, color: reportMode === 'single' ? theme.cardBg : theme.textSecondary, border: `1px solid ${theme.border}` }}
                >
                  {t('topicNew.report.modeSingle')}
                </button>
                <button
                  onClick={() => setReportMode('class')}
                  className="px-3 py-1.5 text-sm font-medium"
                  style={{ borderRadius: '6px', background: reportMode === 'class' ? theme.textPrimary : theme.subtleBg, color: reportMode === 'class' ? theme.cardBg : theme.textSecondary, border: `1px solid ${theme.border}` }}
                >
                  {t('topicNew.report.modeClass')}
                </button>
              </div>

              <div className={`grid grid-cols-1 gap-4 ${reportMode === 'single' ? 'md:grid-cols-4' : 'md:grid-cols-3'}`}>
                {/* Year Filter */}
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: theme.textSecondary }}>{t('topicNew.report.yearLabel')}</label>
                  <select
                    value={reportFilters.year}
                    onChange={(e) => handleReportFilterChange('year', e.target.value)}
                    className="w-full px-3 py-2 text-sm focus:outline-none"
                    style={{ border: `1px solid ${theme.border}`, borderRadius: '6px', background: theme.inputBg, color: theme.textBody }}
                  >
                    <option value="">{t('topicNew.report.selectYear')}</option>
                    {reportYears.map(year => (
                      <option key={year.year_id} value={year.year_id}>{year.year_name}</option>
                    ))}
                  </select>
                </div>
                
                {/* Kelas Filter */}
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: theme.textSecondary }}>{t('topicNew.report.classLabel')}</label>
                  <select
                    value={reportFilters.kelas}
                    onChange={(e) => handleReportFilterChange('kelas', e.target.value)}
                    disabled={!reportFilters.year}
                    className="w-full px-3 py-2 text-sm focus:outline-none"
                    style={{ border: `1px solid ${theme.border}`, borderRadius: '6px', background: theme.inputBg, color: theme.textBody, opacity: !reportFilters.year ? 0.5 : 1 }}
                  >
                    <option value="">
                      {!reportFilters.year ? t('topicNew.report.selectYearFirst') : (reportKelasOptions.length === 0 ? t('topicNew.report.noClasses') : t('topicNew.report.selectClass'))}
                    </option>
                    {reportKelasOptions.map(kelas => (
                      <option key={kelas.kelas_id} value={kelas.kelas_id}>{kelas.kelas_nama}</option>
                    ))}
                  </select>
                </div>
                
                {/* Semester Filter */}
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: theme.textSecondary }}>{t('topicNew.report.semesterLabel')}</label>
                  <select
                    value={reportFilters.semester}
                    onChange={(e) => handleReportFilterChange('semester', e.target.value)}
                    className="w-full px-3 py-2 text-sm focus:outline-none"
                    style={{ border: `1px solid ${theme.border}`, borderRadius: '6px', background: theme.inputBg, color: theme.textBody }}
                  >
                    <option value="">{t('topicNew.report.selectSemester')}</option>
                    <option value="1">{t('topicNew.fields.semester1')}</option>
                    <option value="2">{t('topicNew.fields.semester2')}</option>
                  </select>
                </div>
                
                {/* Student Filter */}
                {reportMode === 'single' && (
                  <div>
                    <label className="block text-sm font-medium mb-1.5" style={{ color: theme.textSecondary }}>{t('topicNew.report.studentLabel')}</label>
                    <select
                      value={reportFilters.student}
                      onChange={(e) => handleReportFilterChange('student', e.target.value)}
                      disabled={!reportFilters.kelas || loadingReportStudents}
                      className="w-full px-3 py-2 text-sm focus:outline-none"
                      style={{ border: `1px solid ${theme.border}`, borderRadius: '6px', background: theme.inputBg, color: theme.textBody, opacity: (!reportFilters.kelas || loadingReportStudents) ? 0.5 : 1 }}
                    >
                      <option value="">
                        {loadingReportStudents ? t('topicNew.fields.loading') : !reportFilters.kelas ? t('topicNew.report.selectClassFirst') : t('topicNew.report.selectStudent')}
                      </option>
                      {reportStudents.map(student => (
                        <option key={student.detail_siswa_id} value={student.detail_siswa_id}>{student.nama}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Class mode info banner */}
              {reportMode === 'class' && reportStudents.length > 0 && reportFilters.kelas && (
                <div className="mt-3 px-3 py-2 text-sm" style={{ background: theme.greenBg, border: `1px solid ${theme.border}`, borderRadius: '6px', color: theme.greenText }}>
                  {t('topicNew.report.classInfoBanner', { count: reportStudents.length })}
                </div>
              )}

              {/* Community Project page toggle */}
              <div className="mt-4 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="includeCpPage"
                  checked={includeCpPage}
                  onChange={e => setIncludeCpPage(e.target.checked)}
                  className="w-4 h-4 cursor-pointer"
                  style={{ accentColor: theme.textPrimary }}
                />
                <label htmlFor="includeCpPage" className="text-sm cursor-pointer select-none" style={{ color: theme.textBody }}>
                  Cetak halaman <strong>Community Project</strong>
                </label>
              </div>
              
              <div className="mt-4 flex flex-col gap-3">
                {/* Progress bar for batch generation */}
                {loadingReport && batchProgress.total > 0 && (
                  <div className="p-3" style={{ background: theme.subtleBg, border: `1px solid ${theme.border}`, borderRadius: '6px' }}>
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="font-medium" style={{ color: theme.textBody }}>
                        {t('topicNew.report.progressText', { current: batchProgress.current, total: batchProgress.total })}
                      </span>
                      <span className="truncate ml-2 max-w-[200px]" style={{ color: theme.textSecondary }}>
                        {batchProgress.name}
                      </span>
                    </div>
                    <div className="w-full h-1.5" style={{ background: theme.border, borderRadius: '4px' }}>
                      <div
                        className="h-1.5 transition-all duration-300"
                        style={{ width: `${(batchProgress.current / batchProgress.total) * 100}%`, background: theme.textPrimary, borderRadius: '4px' }}
                      />
                    </div>
                  </div>
                )}
                <div className="flex justify-end">
                  {reportMode === 'class' ? (
                    <button
                      onClick={generateAllReports}
                      disabled={!reportFilters.kelas || !reportFilters.semester || reportStudents.length === 0 || loadingReport}
                      className="flex items-center gap-2 px-5 py-2 text-sm font-medium"
                      style={{ background: theme.greenBg, color: theme.greenText, border: `1px solid ${theme.border}`, borderRadius: '6px', opacity: (!reportFilters.kelas || !reportFilters.semester || reportStudents.length === 0 || loadingReport) ? 0.5 : 1 }}
                    >
                      {loadingReport && batchProgress.total > 0 ? (
                        <><FontAwesomeIcon icon={faSpinner} spin />{t('topicNew.report.generating')}</>
                      ) : (
                        <><FontAwesomeIcon icon={faPrint} />{t('topicNew.report.downloadAllButton')}</>
                      )}
                    </button>
                  ) : (
                    <button
                      onClick={generateReport}
                      disabled={!reportFilters.kelas || !reportFilters.student || loadingReport}
                      className="flex items-center gap-2 px-5 py-2 text-sm font-medium"
                      style={{ background: theme.blueBg, color: theme.blueText, border: `1px solid ${theme.border}`, borderRadius: '6px', opacity: (!reportFilters.kelas || !reportFilters.student || loadingReport) ? 0.5 : 1 }}
                    >
                      {loadingReport ? (
                        <><FontAwesomeIcon icon={faSpinner} spin />{t('topicNew.report.generating')}</>
                      ) : (
                        <><FontAwesomeIcon icon={faPrint} />{t('topicNew.report.previewButton')}</>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
            
            {/* Info Box */}
            <div className="p-4" style={{ background: theme.blueBg, border: `1px solid ${theme.border}`, borderRadius: '8px' }}>
              <div className="flex items-start gap-3">
                <FontAwesomeIcon icon={faInfoCircle} style={{ color: theme.blueText, marginTop: '2px' }} />
                <p className="text-xs" style={{ color: theme.blueText }}>{t('topicNew.report.infoText')}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal with smooth animation */}
      {modalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black bg-opacity-50 transition-opacity duration-300"
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
                        globalContextExplorations={globalContextExplorations}
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
                        setSelectedConceptualUnderstanding={setSelectedConceptualUnderstanding}
                        setSelectedLearnerProfiles={setSelectedLearnerProfiles}
                        setSelectedServiceLearning={setSelectedServiceLearning}
                        setSelectedResources={setSelectedResources}
                        setSelectedAtlSkills={setSelectedAtlSkills}
                        isStepCompleted={isStepCompleted}
                        fetchKelasForSubject={fetchKelasForSubject}
                        fetchCriteriaForSubject={fetchCriteriaForSubject}
                        setAllKelas={setAllKelas}
                        fetchStrandsForCriteria={fetchStrandsForCriteria}
                        yearOptions={yearOptions}
                        allKelasRaw={allowedKelasRaw}
                        wizardYear={wizardYear}
                        subjectsForSelectedKelas={subjectsForSelectedKelas}
                        onKelasChange={(kelasId) => {
                          setSelectedTopic(prev => ({ ...prev, topic_kelas_id: kelasId, topic_subject_id: '' }))
                          setSubjectsForSelectedKelas([])
                          if (kelasId) fetchSubjectsForKelas(kelasId)
                        }}
                        onWizardYearChange={(yr) => {
                          setWizardYear(yr)
                          // Use allowedKelasRaw so only user's permitted classes appear
                          const filtered = yr ? allowedKelasRaw.filter(k => String(k.kelas_year_id) === String(yr)) : []
                          setAllKelas(filtered)
                          setSelectedTopic(prev => ({ ...prev, topic_kelas_id: '', topic_subject_id: '' }))
                          setSubjectsForSelectedKelas([])
                        }}
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
                    title={aiHelpType === 'inquiryQuestion' ? 'AI Suggestions: Inquiry Questions' : aiHelpType === 'keyConcept' ? 'AI Suggestions: Key Concepts' : aiHelpType === 'relatedConcept' ? 'AI Suggestions: Related Concepts' : aiHelpType === 'globalContext' ? 'AI Suggestions: Global Context' : aiHelpType === 'conceptualUnderstanding' ? 'AI Suggestions: Conceptual Understanding' : aiHelpType === 'statement' ? 'AI Suggestions: Statement of Inquiry' : aiHelpType === 'learnerProfile' ? 'AI Suggestions: Learner Profile' : aiHelpType === 'serviceLearning' ? 'AI Suggestions: Service Learning' : aiHelpType === 'formativeAssessment' ? 'AI Suggestions: Formative Assessment' : aiHelpType === 'atl' ? 'AI Suggestions: ATL Skills' : aiHelpType === 'resources' ? 'AI Suggestions: Resources' : aiHelpType === 'assessmentName' ? 'AI Suggestions: Assessment Details' : aiHelpType === 'assessmentRelationship' ? 'AI Suggestions: Assessment Relationship' : 'AI Suggestions: Unit Title'}
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
                            <FontAwesomeIcon icon={faSpinner} className="text-purple-600 text-4xl mb-4 animate-spin" />
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
                                    (selectedStatements.includes(item.index) && aiHelpType === 'statement') || (selectedConceptualUnderstanding.includes(item.index) && aiHelpType === 'conceptualUnderstanding') || (selectedLearnerProfiles.includes(item.index) && aiHelpType === 'learnerProfile') || (selectedServiceLearning.includes(item.index) && aiHelpType === 'serviceLearning') || (selectedFormativeAssessment.includes(item.index) && aiHelpType === 'formativeAssessment') || (selectedAtlSkills.includes(item.id) && aiHelpType === 'atl') || (selectedResources.includes(item.index) && aiHelpType === 'resources')
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
                                      {(aiHelpType === 'inquiryQuestion' || aiHelpType === 'keyConcept' || aiHelpType === 'relatedConcept' || aiHelpType === 'globalContext' || aiHelpType === 'conceptualUnderstanding' || aiHelpType === 'statement' || aiHelpType === 'learnerProfile' || aiHelpType === 'serviceLearning' || aiHelpType === 'formativeAssessment' || aiHelpType === 'atl' || aiHelpType === 'resources') && (
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
                                            : aiHelpType === 'conceptualUnderstanding'
                                            ? selectedConceptualUnderstanding.includes(item.index)
                                            : aiHelpType === 'statement'
                                            ? selectedStatements.includes(item.index)
                                            : aiHelpType === 'learnerProfile'
                                            ? selectedLearnerProfiles.includes(item.index)
                                            : aiHelpType === 'serviceLearning'
                                            ? selectedServiceLearning.includes(item.index)
                                            : aiHelpType === 'formativeAssessment'
                                            ? selectedFormativeAssessment.includes(item.index)
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
                                            } else if (aiHelpType === 'conceptualUnderstanding') {
                                              toggleConceptualUnderstanding(item.index)
                                            } else if (aiHelpType === 'statement') {
                                              toggleStatement(item.index)
                                            } else if (aiHelpType === 'learnerProfile') {
                                              toggleLearnerProfile(item.index)
                                            } else if (aiHelpType === 'serviceLearning') {
                                              toggleServiceLearning(item.index)
                                            } else if (aiHelpType === 'formativeAssessment') {
                                              toggleFormativeAssessment(item.index)
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
                                    {aiHelpType !== 'inquiryQuestion' && aiHelpType !== 'keyConcept' && aiHelpType !== 'relatedConcept' && aiHelpType !== 'globalContext' && aiHelpType !== 'conceptualUnderstanding' && aiHelpType !== 'statement' && aiHelpType !== 'learnerProfile' && aiHelpType !== 'serviceLearning' && aiHelpType !== 'formativeAssessment' && aiHelpType !== 'atl' && aiHelpType !== 'resources' && (
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
                                          : aiHelpType === 'conceptualUnderstanding' ? 'Conceptual Understanding:'
                                          : aiHelpType === 'statement' ? 'Statement of Inquiry:' 
                                          : aiHelpType === 'learnerProfile' ? 'Learner Profile Attribute:' 
                                          : aiHelpType === 'serviceLearning' ? 'Service Learning Opportunity:'
                                          : aiHelpType === 'formativeAssessment' ? 'Formative Assessment Strategy:'
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

                                  {/* Suggested Explorations for Global Context */}
                                  {aiHelpType === 'globalContext' && Array.isArray(item.explorations) && item.explorations.length > 0 && (
                                    <div className="mt-3 bg-cyan-50 border border-cyan-200 rounded-md p-3">
                                      <h4 className="text-sm font-semibold text-cyan-800 mb-2 flex items-center gap-1">
                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z" clipRule="evenodd" />
                                        </svg>
                                        Suggested Explorations:
                                      </h4>
                                      <div className="flex flex-wrap gap-1.5">
                                        {item.explorations.map((exp, expIdx) => (
                                          <span key={expIdx} className="px-2 py-1 text-xs font-medium bg-cyan-600 text-white rounded-md">
                                            {exp}
                                          </span>
                                        ))}
                                      </div>
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

                      {(aiHelpType === 'inquiryQuestion' || aiHelpType === 'keyConcept' || aiHelpType === 'relatedConcept' || aiHelpType === 'globalContext' || aiHelpType === 'conceptualUnderstanding' || aiHelpType === 'statement' || aiHelpType === 'learnerProfile' || aiHelpType === 'serviceLearning' || aiHelpType === 'formativeAssessment' || aiHelpType === 'atl' || aiHelpType === 'resources') && aiItems.length > 0 && !aiLoading && (
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
                            ) : aiHelpType === 'conceptualUnderstanding' ? (
                              <>
                                <div className="flex items-center gap-2">
                                  <span className={`px-3 py-1.5 rounded-lg border ${selectedConceptualUnderstanding.length > 0 ? 'bg-teal-50 border-teal-300 text-teal-700 font-medium' : 'bg-gray-100 border-gray-300 text-gray-500'}`}>
                                    ✓ Selected: {selectedConceptualUnderstanding.length} understanding
                                  </span>
                                </div>
                                <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                  </svg>
                                  Select 1 conceptual understanding
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
                            ) : aiHelpType === 'formativeAssessment' ? (
                              <>
                                <div className="flex items-center gap-2">
                                  <span className={`px-3 py-1.5 rounded-lg border ${selectedFormativeAssessment.length > 0 ? 'bg-orange-50 border-orange-300 text-orange-700 font-medium' : 'bg-gray-100 border-gray-300 text-gray-500'}`}>
                                    ✓ Selected: {selectedFormativeAssessment.length} strategy
                                  </span>
                                </div>
                                <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                  </svg>
                                  Select 1 formative assessment strategy
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
                              onClick={aiHelpType === 'inquiryQuestion' ? applySelectedInquiryQuestions : aiHelpType === 'keyConcept' ? applySelectedKeyConcepts : aiHelpType === 'relatedConcept' ? applySelectedRelatedConcepts : aiHelpType === 'globalContext' ? applySelectedGlobalContexts : aiHelpType === 'conceptualUnderstanding' ? applySelectedConceptualUnderstanding : aiHelpType === 'statement' ? applySelectedStatements : aiHelpType === 'learnerProfile' ? applySelectedLearnerProfiles : aiHelpType === 'serviceLearning' ? applySelectedServiceLearning : aiHelpType === 'formativeAssessment' ? applySelectedFormativeAssessment : aiHelpType === 'atl' ? applySelectedAtlSkills : applySelectedResources}
                              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors inline-flex items-center gap-2"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              {aiHelpType === 'inquiryQuestion' ? 'Apply Selected Questions' : aiHelpType === 'keyConcept' ? 'Apply Selected Concepts' : aiHelpType === 'relatedConcept' ? 'Apply Selected Concepts' : aiHelpType === 'globalContext' ? 'Apply Selected Contexts' : aiHelpType === 'conceptualUnderstanding' ? 'Apply Selected Understanding' : aiHelpType === 'statement' ? 'Apply Selected Statement' : aiHelpType === 'learnerProfile' ? 'Apply Selected Attributes' : aiHelpType === 'serviceLearning' ? 'Apply Selected Option' : aiHelpType === 'formativeAssessment' ? 'Apply Selected Strategy' : aiHelpType === 'atl' ? 'Apply Selected Skills' : aiHelpType === 'resources' ? 'Apply Selected Resources' : 'Apply Selected Option'}
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
            className="group flex items-center gap-3 transition-all duration-200"
          >
            <span className="px-3 py-1.5 text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap" style={{ background: theme.cardBg, border: `1px solid ${theme.border}`, borderRadius: '20px', color: theme.textBody, boxShadow: '0 2px 6px rgba(0,0,0,0.08)' }}>
              Add Unit
            </span>
            <div className="w-12 h-12 flex items-center justify-center" style={{ borderRadius: '50%', background: theme.textPrimary, color: theme.cardBg, boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>
              <FontAwesomeIcon icon={faBook} className="text-base" />
            </div>
          </button>
        </div>
        
        {/* Main FAB Button */}
        <button
          onClick={() => setFabOpen(!fabOpen)}
          className="w-14 h-14 flex items-center justify-center transition-all duration-300"
          style={{ borderRadius: '50%', background: theme.textPrimary, color: theme.cardBg, boxShadow: '0 4px 12px rgba(0,0,0,0.25)', transform: fabOpen ? 'rotate(45deg)' : 'rotate(0deg)' }}
        >
          <FontAwesomeIcon icon={faPlus} className="text-xl" />
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
                          <div className="flex items-center justify-between mb-2">
                            <label className="block text-sm font-medium text-gray-700">
                              Comments (Optional)
                            </label>
                            <span className="text-xs" style={{ color: (studentData?.comments?.length || 0) > 600 ? '#dc2626' : '#9ca3af' }}>
                              {studentData?.comments?.length || 0}/600
                            </span>
                          </div>
                          <textarea
                            value={studentData?.comments || ''}
                            onChange={(e) => updateStudentComment(student.detail_siswa_id, e.target.value)}
                            rows={2}
                            maxLength={600}
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

        .ai-tooltip {
          position: absolute;
          bottom: calc(100% + 8px);
          left: 50%;
          transform: translateX(-50%);
          width: 200px;
          background: #1e1b4b;
          color: #e0e7ff;
          font-size: 11.5px;
          line-height: 1.45;
          text-align: center;
          border-radius: 8px;
          padding: 8px 12px;
          box-shadow: 0 8px 24px rgba(0,0,0,0.22);
          pointer-events: none;
          opacity: 0;
          transition: opacity 0.18s ease, transform 0.18s ease;
          transform: translateX(-50%) translateY(4px);
          z-index: 100;
        }
        .ai-tooltip::after {
          content: '';
          position: absolute;
          top: 100%;
          left: 50%;
          transform: translateX(-50%);
          border: 5px solid transparent;
          border-top-color: #1e1b4b;
        }
        .ai-tooltip-wrap:hover .ai-tooltip {
          opacity: 1;
          transform: translateX(-50%) translateY(0);
        }
        .ai-tooltip-wrap {
          position: relative;
          display: inline-flex;
        }
      `}</style>
      
      {/* Comment AI Help Modal */}
      <Modal
        isOpen={commentAiModalOpen}
        onClose={() => { if (!commentAiLoading) { setCommentAiModalOpen(false); setCommentAiResult(''); setCommentAiError(''); setCommentAiContradiction(null) } }}
        title={`AI Help — ${commentAiTarget?.nama || 'Student'}`}
        size="lg"
      >
        <div className="space-y-5">
          {!commentAiResult ? (
            <>
              <p className="text-sm text-gray-500">
                Provide brief notes below and AI will write a professional report card comment.
              </p>

              {/* Star 1 */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  ⭐ Star 1 — What did this student do well?
                </label>
                <textarea
                  value={commentAiInput.star1}
                  onChange={(e) => setCommentAiInput(prev => ({ ...prev, star1: e.target.value }))}
                  rows={2}
                  placeholder="e.g., Shows strong analytical thinking, always participates actively..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                />
              </div>

              {/* Star 2 */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  ⭐ Star 2 — Another strength of this student
                </label>
                <textarea
                  value={commentAiInput.star2}
                  onChange={(e) => setCommentAiInput(prev => ({ ...prev, star2: e.target.value }))}
                  rows={2}
                  placeholder="e.g., Demonstrates creativity and takes initiative in group work..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                />
              </div>

              {/* Wish */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  🌱 Wish — Area to improve
                </label>
                <textarea
                  value={commentAiInput.wish}
                  onChange={(e) => setCommentAiInput(prev => ({ ...prev, wish: e.target.value }))}
                  rows={2}
                  placeholder="e.g., Needs to improve time management during assessments..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setCommentAiModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 text-sm"
                >
                  Cancel
                </button>
                <button
                  disabled={commentAiLoading || (!commentAiInput.star1.trim() && !commentAiInput.star2.trim() && !commentAiInput.wish.trim())}
                  onClick={async () => {
                    const subjectName = subjects.find(s => String(s.subject_id) === String(commentSubject))?.subject_name || ''
                    const prompt = `You are a professional IB MYP teacher writing report card comments.

INPUTS:
Student name: ${commentAiTarget?.nama || 'the student'}
Subject: ${subjectName || 'the subject'}
STAR 1 (strength): ${commentAiInput.star1 || '(not provided)'}
STAR 2 (strength): ${commentAiInput.star2 || '(not provided)'}
WISH (area to improve): ${commentAiInput.wish || '(not provided)'}

STEP 1 — CONTRADICTION CHECK:
A contradiction exists when the WISH describes the same skill or quality already listed as a STAR.
Examples:
- STAR: "good communication skills" → WISH: "to be a better communicator" → CONTRADICTION (same skill)
- STAR: "collaborates well in groups" → WISH: "learn to work in a team" → CONTRADICTION (same skill)
- STAR: "reads widely" → WISH: "to read more" → CONTRADICTION (same activity)

If a contradiction is found, return ONLY this JSON:
{"contradiction": true, "reason": "One sentence naming exactly which STAR and WISH overlap and why they contradict."}

STEP 2 — WRITE COMMENT (only if no contradiction):
Rules:
- 3–4 sentences, max 600 characters (strict)
- Use the student's first name
- State what the student actually does — no exaggeration, no inflation
- Avoid filler phrases like "shines brightly", "exceptional talent", "remarkable journey", "truly outstanding"
- Keep adjectives plain: use "consistent", "clear", "active" not "incredible", "extraordinary", "phenomenal"
- State the wish as a concrete, actionable next step
- Write for parents and students: clear, direct, no jargon
- Translate any non-English input but write the comment in English only
- No bullet points or headings

Return ONLY this JSON:
{"contradiction": false, "comment": "..."}`
                    console.log('[Comment AI] Prompt sent to Gemini:\n', prompt)
                    setCommentAiLoading(true)
                    setCommentAiError('')
                    setCommentAiContradiction(null)
                    // Yield to React so it can re-render and show the spinner before fetch starts
                    await new Promise(resolve => setTimeout(resolve, 30))
                    try {
                      const res = await fetch('/api/gemini', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ prompt })
                      })
                      const data = await res.json()
                      if (!res.ok || data.error) {
                        if (res.status === 503) throw new Error('Gemini API is temporarily unavailable. Please try again in a moment.')
                        throw new Error(data.error || 'AI request failed')
                      }
                      const raw = data.text?.trim() || ''
                      console.log('[Comment AI] Raw response:', raw)
                      // Parse JSON response
                      let parsed = null
                      try {
                        const jsonMatch = raw.match(/```json\s*([\s\S]*?)\s*```/) || raw.match(/```\s*([\s\S]*?)\s*```/) || raw.match(/\{[\s\S]*\}/)
                        parsed = JSON.parse(jsonMatch ? (jsonMatch[1] ?? jsonMatch[0]) : raw)
                      } catch {
                        // If JSON parse fails, treat entire response as the comment
                        parsed = { contradiction: false, comment: raw }
                      }
                      if (parsed.contradiction === true) {
                        setCommentAiContradiction({ reason: parsed.reason || 'The STAR and WISH inputs appear to overlap.' })
                      } else {
                        setCommentAiResult(parsed.comment || raw)
                      }
                    } catch (err) {
                      setCommentAiError(err.message)
                    } finally {
                      setCommentAiLoading(false)
                    }
                  }}
                  className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-purple-300 disabled:cursor-not-allowed text-sm flex items-center gap-2"
                >
                  {commentAiLoading ? (
                    <><span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Generating...</>
                  ) : (
                    <><FontAwesomeIcon icon={faLightbulb} /> Generate Comment</>
                  )}
                </button>
              </div>
              {commentAiContradiction && (
                <div className="mt-3 p-3 rounded-md text-sm flex items-start gap-2" style={{ background: '#fef3c7', border: '1px solid #d97706', color: '#92400e' }}>
                  <span className="mt-0.5">⚠️</span>
                  <div>
                    <p className="font-medium">Contradiction detected between STAR and WISH</p>
                    <p className="text-xs mt-1">{commentAiContradiction.reason}</p>
                    <p className="text-xs mt-1" style={{ color: '#b45309' }}>Please revise your inputs so the WISH describes a genuine growth area, not something already listed as a strength.</p>
                  </div>
                </div>
              )}
              {commentAiError && (
                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700 flex items-start gap-2">
                  <span className="mt-0.5">⚠️</span>
                  <div>
                    <p className="font-medium">Failed to generate comment</p>
                    <p className="text-xs mt-1">{commentAiError}</p>
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <FontAwesomeIcon icon={faLightbulb} className="text-purple-600" />
                  <span className="text-sm font-semibold text-purple-800">AI-Generated Comment</span>
                  <span className="ml-auto text-xs" style={{ color: commentAiResult.length > 600 ? '#dc2626' : '#a855f7' }}>
                    {commentAiResult.length}/600 chars
                  </span>
                </div>
                <textarea
                  value={commentAiResult}
                  onChange={(e) => setCommentAiResult(e.target.value)}
                  rows={6}
                  maxLength={600}
                  className="w-full px-3 py-2 border border-purple-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white resize-y"
                />
                {commentAiResult.length > 570 && (
                  <p className="text-xs mt-1" style={{ color: '#dc2626' }}>Approaching 600 character limit. Trim before inserting.</p>
                )}
                <p className="text-xs text-purple-500 mt-2">You can edit the comment above before inserting.</p>
              </div>

              <div className="flex justify-between gap-3 pt-1">
                <button
                  onClick={() => { setCommentAiResult(''); setCommentAiContradiction(null) }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 text-sm flex items-center gap-2"
                >
                  ← Back
                </button>
                <div className="flex gap-2">
                  <button
                    disabled={commentAiRefining}
                    onClick={async () => {
                      const refinePrompt = `You are editing a report card comment. Rewrite the comment below following these rules:
- Keep it factual and specific — what the student actually does
- Remove all inflated adjectives ("exceptional", "outstanding", "brilliant", "phenomenal", "remarkable", "incredible", "amazing")
- Remove vague, unmeasurable trait words that cannot be observed or verified ("strong", "capable", "talented", "gifted", "natural", "smart", "intelligent") — replace them with the specific behaviour or action that shows that quality instead
- Remove flowery phrases ("shines brightly", "remarkable journey", "truly inspiring")
- Use plain, direct language that parents and students can easily understand
- Keep the same structure: two strengths + one growth area
- Stay under 600 characters
- Keep the student's first name
- Write in English only regardless of the original language
- Return ONLY the rewritten comment text, nothing else

Original comment:
${commentAiResult}`
                      console.log('[Comment AI] Refine prompt:', refinePrompt)
                      setCommentAiRefining(true)
                      try {
                        const res = await fetch('/api/gemini', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ prompt: refinePrompt })
                        })
                        const data = await res.json()
                        if (!res.ok || data.error) throw new Error(data.error || 'Refine failed')
                        const refined = data.text?.trim() || ''
                        console.log('[Comment AI] Refined result:', refined)
                        setCommentAiResult(refined.slice(0, 600))
                      } catch (err) {
                        setCommentAiError(err.message)
                      } finally {
                        setCommentAiRefining(false)
                      }
                    }}
                    className="px-4 py-2 text-sm rounded-md flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ background: '#f3e8ff', color: '#7e22ce', border: '1px solid #d8b4fe' }}
                  >
                    {commentAiRefining ? (
                      <><span className="inline-block w-4 h-4 border-2 border-purple-700 border-t-transparent rounded-full animate-spin" /> Refining...</>
                    ) : (
                      <><FontAwesomeIcon icon={faLightbulb} /> Refine</>  
                    )}
                  </button>
                  <button
                    onClick={() => { setCommentAiModalOpen(false); setCommentAiResult('') }}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    disabled={commentAiResult.length > 600}
                    onClick={() => {
                      if (commentAiTarget) {
                        updateCommentText(commentAiTarget.user_id, commentAiResult)
                      }
                      setCommentAiModalOpen(false)
                      setCommentAiResult('')
                    }}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-sm flex items-center gap-2"
                  >
                    <FontAwesomeIcon icon={faCheck} /> Insert to Comment
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* Comment Refine Modal */}
      <Modal
        isOpen={refineModalOpen}
        onClose={() => { if (!refineLoading) { setRefineModalOpen(false); setRefineResult(null); setRefineError('') } }}
        title={`Refine Comment — ${refineModalTarget?.nama || 'Student'}`}
        size="lg"
        containerStyle={{ background: theme.cardBg }}
        headerStyle={{ borderColor: theme.border }}
        titleStyle={{ color: theme.textPrimary }}
      >
        <div className="space-y-4">
          {/* Original comment */}
          <div>
            <p className="text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: theme.textSecondary }}>Komentar Asli</p>
            <div className="px-3 py-2.5 rounded-md text-sm whitespace-pre-wrap" style={{ background: theme.subtleBg, border: `1px solid ${theme.border}`, color: theme.textBody }}>
              {refineOriginal || '—'}
            </div>
            <p className="text-xs mt-1 text-right" style={{ color: theme.textSecondary }}>{refineOriginal.length}/600</p>
          </div>

          {/* Action */}
          {!refineResult && !refineLoading && (
            <div className="flex justify-end gap-3 pt-1">
              <button
                onClick={() => { setRefineModalOpen(false); setRefineResult(null); setRefineError('') }}
                className="px-4 py-2 text-sm rounded-md"
                style={{ border: `1px solid ${theme.border}`, background: theme.subtleBg, color: theme.textSecondary }}
              >
                Batal
              </button>
              <button
                onClick={async () => {
                  setRefineLoading(true)
                  setRefineError('')
                  const prompt = `You are reviewing a report card comment written by a teacher. Your job is to improve it.

Rules for a good comment:
- Factual and specific — describes what the student actually does
- No inflated adjectives: "exceptional", "outstanding", "brilliant", "phenomenal", "remarkable", "incredible", "amazing"
- No vague, unmeasurable trait words ("strong", "capable", "talented", "gifted", "natural", "smart", "intelligent") — replace with the specific observable behaviour that demonstrates that quality
- No flowery phrases: "shines brightly", "remarkable journey", "truly inspiring", "goes above and beyond"
- Plain, direct language that parents and students can easily understand
- Max 600 characters
- Write in English only regardless of the original language of the comment

If the comment already meets all the rules above, return:
{"no_change": true, "reason": "Brief explanation in English of why it is already good enough."}

If the comment needs improvement, rewrite it and return:
{"no_change": false, "reason": "Brief explanation in English of what was changed and why.", "refined": "The improved comment text in English, max 600 chars."}

Comment to review:
${refineOriginal}`
                  console.log('[Refine Modal] Prompt sent to Gemini:\n', prompt)
                  try {
                    const res = await fetch('/api/gemini', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ prompt })
                    })
                    const data = await res.json()
                    if (!res.ok || data.error) throw new Error(data.error || 'Refine failed')
                    const raw = data.text?.trim() || ''
                    console.log('[Refine Modal] Raw response:', raw)
                    let parsed = null
                    try {
                      const jsonMatch = raw.match(/```json\s*([\s\S]*?)\s*```/) || raw.match(/```\s*([\s\S]*?)\s*```/) || raw.match(/\{[\s\S]*\}/)
                      parsed = JSON.parse(jsonMatch ? (jsonMatch[1] ?? jsonMatch[0]) : raw)
                    } catch {
                      parsed = { no_change: false, reason: 'AI returned an unexpected response.', refined: raw.slice(0, 600) }
                    }
                    if (parsed.no_change) {
                      console.log('[Refine Modal] Result: no_change=true, reason:', parsed.reason)
                      setRefineResult({ no_change: true, reason: parsed.reason || 'Comment is already good.' })
                    } else {
                      const refinedText = (parsed.refined || raw).slice(0, 600)
                      console.log('[Refine Modal] Result: no_change=false, refined:', refinedText)
                      setRefineResult({ no_change: false, reason: parsed.reason || '', refined: refinedText })
                    }
                  } catch (err) {
                    setRefineError(err.message)
                  } finally {
                    setRefineLoading(false)
                  }
                }}
                className="px-4 py-2 text-sm rounded-md flex items-center gap-2"
                style={{ background: '#f3e8ff', color: '#7e22ce', border: '1px solid #d8b4fe' }}
              >
                <FontAwesomeIcon icon={faLightbulb} /> Analisa & Refine
              </button>
            </div>
          )}

          {/* Loading */}
          {refineLoading && (
            <div className="flex items-center justify-center gap-2 py-6" style={{ color: theme.textSecondary }}>
              <span className="inline-block w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm">AI sedang menganalisa komentar...</span>
            </div>
          )}

          {/* Error */}
          {refineError && (
            <div className="p-3 rounded-md text-sm flex items-start gap-2" style={{ background: '#fef2f2', border: '1px solid #fca5a5', color: '#991b1b' }}>
              <span>⚠️</span>
              <span>{refineError}</span>
            </div>
          )}

          {/* Result */}
          {refineResult && (
            <div className="space-y-3">
              {refineResult.no_change ? (
                /* Already good */
                <div className="p-4 rounded-md flex items-start gap-3" style={{ background: '#f0fdf4', border: '1px solid #86efac' }}>
                  <span className="text-xl mt-0.5">✅</span>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: '#15803d' }}>Komentar sudah cukup bagus, tidak ada yang perlu dirubah.</p>
                    <p className="text-xs mt-1" style={{ color: '#166534' }}>{refineResult.reason}</p>
                  </div>
                </div>
              ) : (
                /* Has changes */
                <>
                  {/* Reason */}
                  <div className="p-3 rounded-md flex items-start gap-2" style={{ background: '#fefce8', border: '1px solid #fde047', color: '#854d0e' }}>
                    <span>💡</span>
                    <div>
                      <p className="text-xs font-semibold mb-0.5">Alasan perubahan</p>
                      <p className="text-xs">{refineResult.reason}</p>
                    </div>
                  </div>
                  {/* New comment */}
                  <div>
                    <p className="text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: theme.textSecondary }}>Komentar Baru</p>
                    <div className="px-3 py-2.5 rounded-md text-sm whitespace-pre-wrap" style={{ background: '#f0fdf4', border: '1px solid #86efac', color: '#166534' }}>
                      {refineResult.refined}
                    </div>
                    <p className="text-xs mt-1 text-right" style={{ color: theme.textSecondary }}>{(refineResult.refined || '').length}/600</p>
                  </div>
                </>
              )}

              {/* Buttons */}
              <div className="flex justify-end gap-3 pt-1">
                <button
                  onClick={() => { setRefineResult(null); setRefineError('') }}
                  className="px-4 py-2 text-sm rounded-md"
                  style={{ border: `1px solid ${theme.border}`, background: theme.subtleBg, color: theme.textSecondary }}
                >
                  ← Coba Lagi
                </button>
                <button
                  onClick={() => { setRefineModalOpen(false); setRefineResult(null) }}
                  className="px-4 py-2 text-sm rounded-md"
                  style={{ border: `1px solid ${theme.border}`, background: theme.subtleBg, color: theme.textSecondary }}
                >
                  Tutup
                </button>
                {!refineResult.no_change && (
                  <button
                    onClick={() => {
                      if (refineModalTarget) updateCommentText(refineModalTarget.user_id, refineResult.refined)
                      setRefineModalOpen(false)
                      setRefineResult(null)
                    }}
                    className="px-4 py-2 text-sm rounded-md flex items-center gap-2"
                    style={{ background: '#16a34a', color: '#ffffff', border: 'none' }}
                  >
                    <FontAwesomeIcon icon={faCheck} /> Gunakan Komentar Baru
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </Modal>

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

      {/* Weekly Overview DOCX Export Modal */}
      <Modal
        isOpen={woDocxModalOpen}
        onClose={() => !woDocxLoading && setWoDocxModalOpen(false)}
        title="Export Weekly Overview (DOCX)"
      >
        <div className="space-y-4">
          <p className="text-xs text-gray-600">
            Generate and download Microsoft Word (.docx) Weekly Overview for parents, compiling all subjects for the selected class and week.
          </p>

          {woDocxError && (
            <div className="p-3 text-xs bg-red-50 border border-red-200 text-red-700 rounded-md">
              {woDocxError}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Academic Year / Tahun Ajaran
            </label>
            <select
              value={woDocxYearId}
              onChange={e => {
                setWoDocxYearId(e.target.value)
              }}
              className="w-full px-3 py-2 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Academic Years</option>
              {yearOptions.map(y => (
                <option key={y.year_id} value={y.year_id}>{y.year_name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Class / Kelas <span className="text-red-500">*</span>
            </label>
            <select
              value={woDocxKelasId}
              onChange={e => setWoDocxKelasId(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select Class</option>
              {allKelasRaw
                .filter(k => !woDocxYearId || String(k.kelas_year_id) === String(woDocxYearId))
                .sort((a, b) => a.kelas_nama.localeCompare(b.kelas_nama, 'id'))
                .map(k => {
                  const yr = yearOptions.find(y => String(y.year_id) === String(k.kelas_year_id))
                  const yearSuffix = !woDocxYearId && yr ? ` (${yr.year_name})` : ''
                  const isWali = k.kelas_user_id === parseInt(localStorage.getItem('kr_id') || '0')
                  return (
                    <option key={k.kelas_id} value={k.kelas_id}>
                      {k.kelas_nama}{yearSuffix} {isWali ? '(Homeroom)' : ''}
                    </option>
                  )
                })}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Month / Bulan <span className="text-red-500">*</span>
              </label>
              <select
                value={woDocxMonth}
                onChange={e => setWoDocxMonth(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {woDocxMonthOptions.map(m => (
                  <option key={m.val} value={m.val}>{m.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Week / Minggu <span className="text-red-500">*</span>
              </label>
              <select
                value={woDocxDate}
                onChange={e => setWoDocxDate(e.target.value)}
                disabled={woDocxWeekOptions.length === 0}
                className="w-full px-3 py-2 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {woDocxWeekOptions.map(w => (
                  <option key={w.mondayDate} value={w.mondayDate}>
                    {w.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <button
              onClick={() => setWoDocxModalOpen(false)}
              disabled={woDocxLoading}
              className="px-4 py-2 text-xs border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleDownloadWoDocx}
              disabled={woDocxLoading}
              className="px-4 py-2 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 font-medium"
            >
              {woDocxLoading ? (
                <>
                  <FontAwesomeIcon icon={faSpinner} spin />
                  Generating DOCX...
                </>
              ) : (
                <>
                  <FontAwesomeIcon icon={faFileWord} />
                  Download DOCX
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
