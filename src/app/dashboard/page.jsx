"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { supabase } from '@/lib/supabase'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faUser, faCalendar, faClipboardCheck, faChevronLeft, faChevronRight, faDoorOpen, faQrcode, faClock, faBook, faChalkboardTeacher } from '@fortawesome/free-solid-svg-icons'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Modal from '@/components/ui/modal'
import { useI18n } from '@/lib/i18n'
import AcademicIntegrityChatbot from '@/components/AcademicIntegrityChatbot'

export default function Dashboard() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { t } = useI18n()
  // Simple translation helper with fallback if key is missing
  const tr = (key, fallback, params) => {
    try {
      const val = params ? t(key, params) : t(key)
      return val === key ? fallback : val
    } catch {
      return fallback
    }
  }
  const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']

  // UI states
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  // User profile
  const [userData, setUserData] = useState(null)
  const [isStudent, setIsStudent] = useState(false)

  // Stats
  const [stats, setStats] = useState({
    users: 0,
    classes: 0,
    subjects: 0,
    years: 0,
    pendingAssessments: 0,
  })
  // Teacher schedule (for non-student) – teaching today
  const [teacherToday, setTeacherToday] = useState([]) // [{start,end,kelas,subject,chipColor}]
  const [teacherSelectedDay, setTeacherSelectedDay] = useState(() => new Date().toLocaleDateString('en-US', { weekday: 'long' }))
  // Door greeter notification state
  const [doorGreeter, setDoorGreeter] = useState({ today: null, tomorrow: null })

  // Recent assessments + lookup maps
  const [recentAssessments, setRecentAssessments] = useState([])
  const [detailKelasMap, setDetailKelasMap] = useState({})
  const [usersMap, setUsersMap] = useState({})

  // Calendar state
  const [calMonth, setCalMonth] = useState(() => {
    const d = new Date()
    d.setDate(1)
    d.setHours(0,0,0,0)
    return d
  })
  const [calLoading, setCalLoading] = useState(false)
  const [calError, setCalError] = useState('')
  // calData: { 'YYYY-MM-DD': { total: number, perClass: Array<{kelas_id, kelas_nama, count}>, googleEvents: Array } }
  const [calData, setCalData] = useState({})
  const [googleEvents, setGoogleEvents] = useState({}) // { 'YYYY-MM-DD': [events] }
  const [googleCalError, setGoogleCalError] = useState('')
  const [kelasOptions, setKelasOptions] = useState([]) // from current month data
  const [kelasFilter, setKelasFilter] = useState('')
  const [dayDetail, setDayDetail] = useState({ open: false, date: '', rows: [], googleEvents: [] })
  // Student dashboard
  const [studentSchedule, setStudentSchedule] = useState([]) // [{start,end,subject,teacher}]
  const [studentInfo, setStudentInfo] = useState({ kelas_nama: '' })
  const [selectedDay, setSelectedDay] = useState(() => new Date().toLocaleDateString('en-US', { weekday: 'long' }))

  useEffect(() => {
    const id = localStorage.getItem("kr_id")
    const role = localStorage.getItem("user_role")

    if (!id || !role) {
      localStorage.clear()
      router.replace("/login")
    } else {
      // Load profile, then decide dashboard variant by role flag
      setLoading(true)
      setError("")
  Promise.all([fetchUserInfo(id), fetchRoleFlag()])
        .then(async ([_, roleFlag]) => {
          const uid = parseInt(id, 10)
          if (roleFlag?.is_student) {
            setIsStudent(true)
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' })
    setSelectedDay(today)
    await fetchStudentDashboardData(uid, today)
          } else {
            setIsStudent(false)
            await Promise.all([
              fetchDashboardData(uid),
              fetchTeacherTodaySchedule(uid, teacherSelectedDay)
            ])
          }
        })
        .catch((e) => {
          console.error(e)
          setError(t('common.errorLoading'))
        })
        .finally(() => setLoading(false))
    }
  }, [router])

  const fetchUserInfo = async (userId) => {
    const { data, error } = await supabase
      .from('users')
      .select('user_nama_depan, user_nama_belakang, user_profile_picture')
      .eq('user_id', userId)
      .single()
    if (error) throw error
    setUserData(data)
  }

  const fetchRoleFlag = async () => {
    try {
      const raw = localStorage.getItem('user_data')
      const u = raw ? JSON.parse(raw) : null
      const roleId = u?.roleID
      if (!roleId) return { is_student: false }
      const { data, error } = await supabase
        .from('role')
        .select('is_student')
        .eq('role_id', roleId)
        .single()
      if (error) throw error
      return data || { is_student: false }
    } catch (e) {
      console.warn('Role flag fetch failed', e)
      return { is_student: false }
    }
  }

  const fetchDashboardData = async (userId) => {
    // Only compute pending assessments; totals are no longer shown
    const { count: pendingCount } = await supabase
      .from('assessment')
      .select('*', { count: 'exact', head: true })
      .eq('assessment_user_id', userId)
      .in('assessment_status', [0, 3])
      .not('assessment_tanggal', 'is', null)

    setStats((s) => ({ ...s, pendingAssessments: pendingCount ?? 0 }))

    // Door greeter assignment check (today / tomorrow)
    try {
      const today = new Date()
      const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate()+1)
      const weekday = (d) => d.toLocaleDateString('en-US', { weekday: 'long' })
      const todayName = weekday(today)
      const tomorrowName = weekday(tomorrow)
      const { data: dgData, error: dgErr } = await supabase
        .from('daftar_door_greeter')
        .select('daftar_door_greeter_day')
        .eq('daftar_door_greeter_user_id', userId)
        .in('daftar_door_greeter_day', [todayName, tomorrowName])
      if (dgErr) throw dgErr
      const hasToday = dgData?.some(r => r.daftar_door_greeter_day === todayName) ? todayName : null
      const hasTomorrow = dgData?.some(r => r.daftar_door_greeter_day === tomorrowName) ? tomorrowName : null
      setDoorGreeter({ today: hasToday, tomorrow: hasTomorrow })
    } catch (e) {
      console.warn('Door greeter check failed', e)
    }

    // Recent assessments (last 5)
  const [{ data: assessments, error: aErr }, { data: detailKelas, error: dkErr }, { data: subjects, error: sErr }, { data: kelas, error: kErr }, { data: users, error: uErr }] = await Promise.all([
      supabase
        .from('assessment')
    .select('assessment_id, assessment_nama, assessment_tanggal, assessment_status, assessment_user_id, assessment_detail_kelas_id')
    .eq('assessment_user_id', userId)
    .in('assessment_status', [0, 3])
        .not('assessment_tanggal', 'is', null)
        .order('assessment_tanggal', { ascending: false })
        .limit(5),
      supabase
        .from('detail_kelas')
        .select('detail_kelas_id, detail_kelas_subject_id, detail_kelas_kelas_id'),
      supabase
        .from('subject')
        .select('subject_id, subject_name'),
      supabase
        .from('kelas')
        .select('kelas_id, kelas_nama'),
      supabase
        .from('users')
        .select('user_id, user_nama_depan, user_nama_belakang'),
    ])

    if (aErr) throw aErr
    if (dkErr) throw dkErr
    if (sErr) throw sErr
    if (kErr) throw kErr
    if (uErr) throw uErr

    const sMap = new Map((subjects || []).map(s => [s.subject_id, s.subject_name]))
    const kMap = new Map((kelas || []).map(k => [k.kelas_id, k.kelas_nama]))
    const dkMap = Object.fromEntries((detailKelas || []).map(dk => [
      dk.detail_kelas_id,
      `${sMap.get(dk.detail_kelas_subject_id) || 'Subject'} - ${kMap.get(dk.detail_kelas_kelas_id) || 'Kelas'}`
    ]))
    const uMap = Object.fromEntries((users || []).map(u => [u.user_id, `${u.user_nama_depan} ${u.user_nama_belakang}`.trim()]))

    setDetailKelasMap(dkMap)
    setUsersMap(uMap)
    setRecentAssessments(assessments || [])
  }

  // Teacher: fetch what they teach today from timetable
  const fetchTeacherTodaySchedule = async (userId, day) => {
    try {
      const weekday = day || new Date().toLocaleDateString('en-US', { weekday: 'long' })
      const { data: tt, error: ttErr } = await supabase
        .from('timetable')
        .select('timetable_detail_kelas_id, timetable_time, timetable_user_id, timetable_day')
        .eq('timetable_user_id', userId)
        .eq('timetable_day', weekday)
      if (ttErr) throw ttErr

      const detailIds = Array.from(new Set((tt || []).map(r => r.timetable_detail_kelas_id).filter(Boolean)))
      if (detailIds.length === 0) { setTeacherToday([]); return }

      const [{ data: dkRows, error: dkErr }, { data: kelasRows, error: kErr }, { data: subjRows, error: sErr }] = await Promise.all([
        supabase.from('detail_kelas').select('detail_kelas_id, detail_kelas_kelas_id, detail_kelas_subject_id').in('detail_kelas_id', detailIds),
        supabase.from('kelas').select('kelas_id, kelas_nama, kelas_color_name'),
        supabase.from('subject').select('subject_id, subject_code, subject_name'),
      ])
      if (dkErr) throw dkErr
      if (kErr) throw kErr
      if (sErr) throw sErr

      const kelasMap = new Map((kelasRows || []).map(k => [k.kelas_id, { nama: k.kelas_nama, color: k.kelas_color_name }]))
      const subjMap = new Map((subjRows || []).map(s => [s.subject_id, { code: s.subject_code, name: s.subject_name }]))
      const dkMap = new Map((dkRows || []).map(d => [d.detail_kelas_id, { kelas_id: d.detail_kelas_kelas_id, subject_id: d.detail_kelas_subject_id }]))

      const parseRange = (rangeStr) => {
        if (!rangeStr || typeof rangeStr !== 'string') return { start: '', end: '' }
        const times = rangeStr.match(/\b(\d{1,2}:\d{2})\b/g)
        if (times && times.length >= 2) return { start: times[0], end: times[1] }
        const m = /\[\s*(\d{1,2}:\d{2})\s*,\s*(\d{1,2}:\d{2})\s*\]/.exec(rangeStr)
        if (m) return { start: m[1], end: m[2] }
        return { start: '', end: '' }
      }

      const items = (tt || [])
        .map(row => {
          const rel = dkMap.get(row.timetable_detail_kelas_id)
          const k = rel ? kelasMap.get(rel.kelas_id) : null
          const s = rel ? subjMap.get(rel.subject_id) : null
          const { start, end } = parseRange(row.timetable_time)
          return {
            start,
            end,
            kelas: k?.nama || 'Kelas',
            subject: s?.code || s?.name || 'Subject',
            chipColor: k?.color || null,
          }
        })
        .sort((a,b) => a.start.localeCompare(b.start))
      setTeacherToday(items)
    } catch (e) {
      console.error('Teacher today schedule load failed', e)
      setTeacherToday([])
    }
  }

  // Re-fetch when teacher changes selected day
  useEffect(() => {
    const id = localStorage.getItem('kr_id')
    if (isStudent || !id) return
    const uid = parseInt(id, 10)
    fetchTeacherTodaySchedule(uid, teacherSelectedDay)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isStudent, teacherSelectedDay])

  const fetchStudentDashboardData = async (userId, day) => {
    try {
      // 1) Find student's class
      const { data: ds, error: dsErr } = await supabase
        .from('detail_siswa')
        .select('detail_siswa_kelas_id')
        .eq('detail_siswa_user_id', userId)
        .limit(1)
      if (dsErr) throw dsErr
      const kelasId = ds && ds[0]?.detail_siswa_kelas_id
      if (!kelasId) { setStudentInfo({ kelas_nama: '' }); setStudentSchedule([]); return }

      // 2) Get class name, mappings and today timetable rows
      const weekday = day || new Date().toLocaleDateString('en-US', { weekday: 'long' })
      const [kelasRes, dkRes, subjRes, usersRes, ttRes] = await Promise.all([
        supabase.from('kelas').select('kelas_nama').eq('kelas_id', kelasId).single(),
        supabase.from('detail_kelas').select('detail_kelas_id, detail_kelas_subject_id').eq('detail_kelas_kelas_id', kelasId),
        supabase.from('subject').select('subject_id, subject_name, subject_code, subject_user_id'),
        supabase.from('users').select('user_id, user_nama_depan, user_nama_belakang'),
        supabase.from('timetable').select('timetable_detail_kelas_id, timetable_time, timetable_user_id, timetable_day').eq('timetable_day', weekday)
      ])
      if (kelasRes.error) throw kelasRes.error
      if (dkRes.error) throw dkRes.error
      if (subjRes.error) throw subjRes.error
      if (usersRes.error) throw usersRes.error
      if (ttRes.error) throw ttRes.error

      setStudentInfo({ kelas_nama: kelasRes.data?.kelas_nama || '' })
      const dkIds = (dkRes.data || []).map(d => d.detail_kelas_id)
      const subjMap = new Map((subjRes.data || []).map(s => [s.subject_id, s]))
      const userMap = new Map((usersRes.data || []).map(u => [u.user_id, `${u.user_nama_depan} ${u.user_nama_belakang}`.trim()]))
      const dkSubjMap = new Map((dkRes.data || []).map(d => [d.detail_kelas_id, d.detail_kelas_subject_id]))

      const parseRange = (rangeStr) => {
        if (!rangeStr || typeof rangeStr !== 'string') return { start: '', end: '' }
        // 1) Generic: first two HH:MM anywhere (handles "07:30-08:10", "[07:30, 08:10]", "Mon 07:30 - Mon 08:10")
        const times = rangeStr.match(/\b(\d{1,2}:\d{2})\b/g)
        if (times && times.length >= 2) return { start: times[0], end: times[1] }
        // 2) Bracketed comma format fallback: [start, end]
        const m = /\[\s*(\d{1,2}:\d{2})\s*,\s*(\d{1,2}:\d{2})\s*\]/.exec(rangeStr)
        if (m) return { start: m[1], end: m[2] }
        return { start: '', end: '' }
      }

      const items = (ttRes.data || [])
        .filter(row => dkIds.includes(row.timetable_detail_kelas_id))
        .map(row => {
          const subjId = dkSubjMap.get(row.timetable_detail_kelas_id)
          const s = subjMap.get(subjId) || {}
          const teacher = userMap.get(s.subject_user_id) || ''
          const { start, end } = parseRange(row.timetable_time)
          return { start, end, subject: s.subject_code || s.subject_name || 'Subject', teacher }
        })
        .sort((a,b) => a.start.localeCompare(b.start))
      setStudentSchedule(items)
    } catch (e) {
      console.error('Student dashboard load failed', e)
      setStudentSchedule([])
    }
  }

  // When student changes the day, re-fetch schedule
  useEffect(() => {
    const id = localStorage.getItem('kr_id')
    if (!isStudent || !id) return
    const uid = parseInt(id, 10)
    fetchStudentDashboardData(uid, selectedDay)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isStudent, selectedDay])

  // Helpers for calendar
  const toKey = (d) => {
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}`
  }
  const startOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1)
  const endOfMonth = (d) => new Date(d.getFullYear(), d.getMonth()+1, 0)
  const prevMonth = () => setCalMonth(m => new Date(m.getFullYear(), m.getMonth()-1, 1))
  const nextMonth = () => setCalMonth(m => new Date(m.getFullYear(), m.getMonth()+1, 1))
  const thisMonth = () => setCalMonth(() => { const d=new Date(); d.setDate(1); return d })

  useEffect(() => {
    // fetch calendar data whenever month or filter changes; now grouped by detail_kelas (class+subject) to show subject_code
    const fetchMonth = async () => {
      try {
        setCalLoading(true)
        setCalError('')
        const from = startOfMonth(calMonth)
        const to = endOfMonth(calMonth)
        const fromStr = toKey(from)
        const toStr = toKey(to)
        // Always use manual aggregation to incorporate subject_code per class+subject (detail_kelas)
        const { data: assess, error: aErr } = await supabase
          .from('assessment')
          .select('assessment_tanggal, assessment_detail_kelas_id, assessment_status')
          .gte('assessment_tanggal', fromStr)
          .lte('assessment_tanggal', toStr)
          .eq('assessment_status', 1)
        if (aErr) throw aErr
        const detailIds = Array.from(new Set((assess||[]).map(a=>a.assessment_detail_kelas_id).filter(Boolean)))
        let dk = []
        if (detailIds.length) {
          const { data: dkData, error: dkErr } = await supabase
            .from('detail_kelas')
            .select('detail_kelas_id, detail_kelas_kelas_id, detail_kelas_subject_id')
            .in('detail_kelas_id', detailIds)
          if (dkErr) throw dkErr
          dk = dkData || []
        }
        const kelasIds = Array.from(new Set(dk.map(d=>d.detail_kelas_kelas_id)))
        const subjectIds = Array.from(new Set(dk.map(d=>d.detail_kelas_subject_id)))
        let kelas = []
        if (kelasIds.length) {
          const { data: kData, error: kErr } = await supabase
            .from('kelas')
            .select('kelas_id, kelas_nama, kelas_color_name')
            .in('kelas_id', kelasIds)
          if (kErr) throw kErr
          kelas = kData || []
        }
        let subjects = []
        if (subjectIds.length) {
          const { data: sData, error: sErr } = await supabase
            .from('subject')
            .select('subject_id, subject_code')
            .in('subject_id', subjectIds)
          if (sErr) throw sErr
          subjects = sData || []
        }
        const dkInfo = new Map(dk.map(d=>[d.detail_kelas_id, { kelas_id: d.detail_kelas_kelas_id, subject_id: d.detail_kelas_subject_id }]))
        const kelasMapFull = new Map(kelas.map(k=>[k.kelas_id, { nama: k.kelas_nama, color: k.kelas_color_name }]))
        const subjCodeMap = new Map(subjects.map(s=>[s.subject_id, s.subject_code]))
        const agg = new Map() // key: day|detail_kelas_id -> count
        for (const a of (assess||[])) {
          const day = String(a.assessment_tanggal).slice(0,10)
          const info = dkInfo.get(a.assessment_detail_kelas_id)
          if (!info) continue
          const kid = info.kelas_id
            if (kelasFilter && parseInt(kelasFilter) !== kid) continue
          const key = `${day}|${a.assessment_detail_kelas_id}`
          agg.set(key, (agg.get(key)||0) + 1)
        }
        // Build final structure
        const map = {}
        const kelasFilterOptions = new Map()
        for (const [key, count] of agg.entries()) {
          const [day, dkIdStr] = key.split('|')
          const dkId = parseInt(dkIdStr)
          const info = dkInfo.get(dkId)
          if (!info) continue
          const kInfo = kelasMapFull.get(info.kelas_id) || {}
          const kelas_nama = kInfo.nama || 'Kelas'
          const color = kInfo.color || null
          const subject_code = subjCodeMap.get(info.subject_id) || ''
          if (!map[day]) map[day] = { total: 0, perClass: [] }
          map[day].total += count
          map[day].perClass.push({ detail_kelas_id: dkId, kelas_id: info.kelas_id, kelas_nama, subject_code, count, color })
          if (!kelasFilterOptions.has(info.kelas_id)) kelasFilterOptions.set(info.kelas_id, kelas_nama)
        }
        setCalData(map)
        const opts = Array.from(kelasFilterOptions.entries()).map(([id, nama]) => ({ id, nama }))
          .sort((a,b)=> (a.nama||'').localeCompare(b.nama||''))
        setKelasOptions(opts)
      } catch (e) {
        console.error(e)
        setCalError(t('common.errorLoading'))
      } finally {
        setCalLoading(false)
      }
    }
    
    // Helper function to refresh access token
    const refreshGoogleToken = async () => {
      const refreshToken = localStorage.getItem('google_refresh_token')
      if (!refreshToken) return null

      try {
        console.log('🔄 Dashboard: Refreshing Google access token...')
        const res = await fetch('/api/auth/google/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: refreshToken })
        })
        const data = await res.json()
        if (res.ok && data.access_token) {
          console.log('✅ Dashboard: Token refreshed')
          localStorage.setItem('google_access_token', data.access_token)
          const expiresAt = Date.now() + ((data.expires_in || 3600) - 300) * 1000
          localStorage.setItem('google_token_expires_at', expiresAt.toString())
          return data.access_token
        }
        if (data.needsReauth) {
          localStorage.removeItem('google_access_token')
          localStorage.removeItem('google_refresh_token')
          localStorage.removeItem('google_token_expires_at')
        }
        return null
      } catch (e) {
        console.error('Token refresh error:', e)
        return null
      }
    }

    // Get valid access token
    const getValidGoogleToken = async () => {
      const accessToken = localStorage.getItem('google_access_token')
      const expiresAt = localStorage.getItem('google_token_expires_at')
      if (!accessToken) return null
      if (expiresAt && Date.now() > parseInt(expiresAt, 10)) {
        return await refreshGoogleToken()
      }
      return accessToken
    }
    
    // Fetch Google Calendar events
    const fetchGoogleCalendar = async () => {
      const googleToken = await getValidGoogleToken()
      console.log('🗓️ Google Calendar: checking token...', googleToken ? 'Token exists' : 'No token')
      
      if (!googleToken) {
        setGoogleEvents({})
        return
      }
      
      try {
        const from = startOfMonth(calMonth)
        const to = endOfMonth(calMonth)
        
        // Extend range to show full weeks
        const startDay = from.getDay()
        const timeMin = new Date(from)
        timeMin.setDate(timeMin.getDate() - (startDay === 0 ? 6 : startDay - 1))
        
        const endDay = to.getDay()
        const timeMax = new Date(to)
        timeMax.setDate(timeMax.getDate() + (endDay === 0 ? 1 : 8 - endDay))
        
        console.log('🗓️ Google Calendar: fetching events...', { timeMin: timeMin.toISOString(), timeMax: timeMax.toISOString() })
        
        const res = await fetch(`/api/calendar/events?timeMin=${timeMin.toISOString()}&timeMax=${timeMax.toISOString()}&maxResults=100`, {
          headers: { 'Authorization': `Bearer ${googleToken}` }
        })
        
        const data = await res.json()
        console.log('🗓️ Google Calendar: response', res.status, data)
        
        if (!res.ok) {
          if (data.needsReauth) {
            console.log('🗓️ Google Calendar: needs reauth, attempting refresh...')
            const newToken = await refreshGoogleToken()
            if (newToken) {
              // Retry with new token
              const retryRes = await fetch(`/api/calendar/events?timeMin=${timeMin.toISOString()}&timeMax=${timeMax.toISOString()}&maxResults=100`, {
                headers: { 'Authorization': `Bearer ${newToken}` }
              })
              const retryData = await retryRes.json()
              if (retryRes.ok) {
                const eventsMap = {}
                for (const event of (retryData.events || [])) {
                  const dateKey = event.start?.split('T')[0] || event.start
                  if (!eventsMap[dateKey]) eventsMap[dateKey] = []
                  eventsMap[dateKey].push(event)
                }
                setGoogleEvents(eventsMap)
                setGoogleCalError('')
                return
              }
            }
            console.log('🗓️ Google Calendar: refresh failed, removing tokens')
            localStorage.removeItem('google_access_token')
            localStorage.removeItem('google_token_expires_at')
          }
          setGoogleCalError(data.error || '')
          setGoogleEvents({})
          return
        }
        
        // Group events by date
        const eventsMap = {}
        for (const event of (data.events || [])) {
          const dateKey = event.start?.split('T')[0] || event.start
          if (!eventsMap[dateKey]) eventsMap[dateKey] = []
          eventsMap[dateKey].push(event)
        }
        console.log('🗓️ Google Calendar: events loaded', Object.keys(eventsMap).length, 'days with events')
        setGoogleEvents(eventsMap)
        setGoogleCalError('')
      } catch (e) {
        console.error('🗓️ Google Calendar error:', e)
        setGoogleEvents({})
      }
    }
    
    fetchMonth()
    fetchGoogleCalendar()
  }, [calMonth, kelasFilter])

  // Map semantic color to Tailwind chip classes
  const colorToChip = (name) => {
    switch ((name||'').toLowerCase()) {
      case 'success': return 'bg-green-100 text-green-700'
      case 'warning': return 'bg-amber-100 text-amber-700'
      case 'error': return 'bg-red-100 text-red-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }
  const colorToText = (name) => {
    switch ((name||'').toLowerCase()) {
      case 'success': return 'text-green-700'
      case 'warning': return 'text-amber-700'
      case 'error': return 'text-red-700'
      default: return 'text-gray-700'
    }
  }

  const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })
    } catch {
      return '-'
    }
  }

  const StatusBadge = ({ status }) => {
    const map = useMemo(() => ({
      0: { text: t('teacherSubmission.statusWaiting') || 'Waiting' , cls: 'bg-yellow-100 text-yellow-800' },
      3: { text: t('assessmentApproval.statusWaitingPrincipal') || 'Waiting for principal approval', cls: 'bg-blue-100 text-blue-800' },
      1: { text: t('teacherSubmission.statusApproved') || 'Approved', cls: 'bg-green-100 text-green-800' },
      2: { text: t('teacherSubmission.statusRejected') || 'Rejected', cls: 'bg-red-100 text-red-800' },
    }), [t])
    const cfg = map[status] || { text: 'Tidak diketahui', cls: 'bg-gray-100 text-gray-800' }
    return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg.cls}`}>{cfg.text}</span>
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-sky-50 to-cyan-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">{t('common.loading')}</p>
        </div>
      </div>
    )
  }

  // Student-focused dashboard
  if (isStudent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-sky-50 to-cyan-50 p-4 md:p-6">
        {/* Hero Header */}
        <div className="relative overflow-hidden rounded-3xl shadow-xl">
          <div className="absolute inset-0 bg-gradient-to-r from-sky-500 via-cyan-500 to-teal-500 h-48">
            <div className="absolute inset-0 opacity-20">
              <div className="absolute inset-0" style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
              }} />
            </div>
          </div>
          
          <div className="relative px-4 sm:px-6 lg:px-8 pt-8 pb-6">
            {searchParams?.get('forbidden') === '1' && (
              <div className="max-w-5xl mx-auto mb-4 p-3 rounded-lg bg-red-500/20 backdrop-blur-sm text-white border border-red-300/30 text-sm">
                Access denied for the requested page.
              </div>
            )}
            
            <div className="max-w-5xl mx-auto flex items-center gap-4">
              {userData?.user_profile_picture ? (
                <img 
                  src={userData.user_profile_picture} 
                  alt="Profile" 
                  className="w-16 h-16 rounded-full object-cover border-3 border-white shadow-xl"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur flex items-center justify-center border-3 border-white/50">
                  <FontAwesomeIcon icon={faUser} className="text-2xl text-white" />
                </div>
              )}
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-white drop-shadow">
                  {t('common.welcome', { name: `${userData?.user_nama_depan || ''} ${userData?.user_nama_belakang || ''}`.trim() })} 👋
                </h1>
                {studentInfo.kelas_nama && (
                  <p className="text-white/80">{(t('dashboard.classLabel') || 'Class')}: {studentInfo.kelas_nama}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="px-4 sm:px-6 lg:px-8 py-6 -mt-4">
          <div className="max-w-5xl mx-auto space-y-6">
            {/* QR Scan Button */}
            <Button 
              onClick={() => router.push('/student/scan')} 
              className="w-full md:w-auto bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold py-4 md:py-3 px-8 rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200 flex items-center justify-center gap-3 text-lg md:text-base"
            >
              <FontAwesomeIcon icon={faQrcode} className="text-2xl md:text-xl" />
              <span>{t('student.qrScan') || 'QR Scan'}</span>
            </Button>

            {/* Schedule Card */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
              <div className="p-4 sm:p-6 border-b border-gray-100">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 sm:w-10 sm:h-10 bg-sky-100 rounded-lg sm:rounded-xl flex items-center justify-center">
                      <FontAwesomeIcon icon={faClock} className="text-sky-600 text-sm sm:text-base" />
                    </span>
                    <h2 className="text-base sm:text-lg font-semibold text-gray-800">{t('dashboard.todaySchedule') || "Today's Schedule"}</h2>
                  </div>
                  <select
                    value={selectedDay}
                    onChange={(e)=> setSelectedDay(e.target.value)}
                    className="px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-200 rounded-lg sm:rounded-xl text-sm focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                  >
                    {DAYS.map(d => {
                      const label = t(`doorGreeter.days.${d}`) || d
                      return <option key={d} value={d}>{label}</option>
                    })}
                  </select>
                </div>
              </div>
              <div className="p-4 sm:p-6">
                {studentSchedule.length === 0 ? (
                  <div className="text-center py-6 sm:py-8 text-gray-500">
                    <FontAwesomeIcon icon={faCalendar} className="text-3xl sm:text-4xl text-gray-300 mb-3" />
                    <p className="text-sm sm:text-base">{t('dashboard.noScheduleToday') || 'No schedule for today.'}</p>
                  </div>
                ) : (
                  <div className="space-y-2 sm:space-y-3">
                    {studentSchedule.map((it, i) => (
                      <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 p-3 sm:p-4 bg-gray-50 rounded-xl hover:bg-sky-50 transition-colors">
                        <div className="flex items-center gap-3 sm:gap-4">
                          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-sky-400 to-cyan-500 rounded-lg sm:rounded-xl flex items-center justify-center text-white font-bold text-sm sm:text-base flex-shrink-0">
                            {it.subject?.charAt(0) || 'S'}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-gray-800 text-sm sm:text-base truncate">{it.subject}</div>
                            <div className="text-xs sm:text-sm text-gray-500 truncate">{it.teacher}</div>
                          </div>
                        </div>
                        <div className="text-xs sm:text-sm font-medium text-gray-600 bg-white px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg border self-start sm:self-auto ml-13 sm:ml-0">
                          {it.start} - {it.end}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Tip Card */}
            <div className="bg-gradient-to-r from-sky-50 to-cyan-50 border border-sky-200 text-sky-800 p-3 sm:p-4 rounded-xl sm:rounded-2xl flex items-start sm:items-center gap-3">
              <span className="w-8 h-8 sm:w-10 sm:h-10 bg-sky-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 sm:mt-0">
                <FontAwesomeIcon icon={faQrcode} className="text-sky-600 text-sm sm:text-base" />
              </span>
              <p className="text-xs sm:text-sm">{t('student.scanHint') || 'Tip: Please allow location and camera access when scanning.'}</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-sky-50 to-cyan-50 p-4 md:p-6">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-r from-sky-500 via-cyan-500 to-teal-500 px-6 py-8 md:py-12 rounded-3xl shadow-xl">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-1/2 -right-1/4 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-1/2 -left-1/4 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
          {/* School logo watermark */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src="/images/login-logo.png" 
              alt="" 
              className="h-48 w-auto opacity-10"
              aria-hidden="true"
            />
          </div>
        </div>
        
        <div className="relative z-10">
          {searchParams?.get('forbidden') === '1' && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/20 backdrop-blur-sm text-white border border-red-300/30 text-sm">
              Access denied for the requested page.
            </div>
          )}
          
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              {userData?.user_profile_picture ? (
                <div className="relative">
                  <img 
                    src={userData.user_profile_picture} 
                    alt="Profile" 
                    className="w-16 h-16 md:w-20 md:h-20 rounded-2xl object-cover ring-4 ring-white/30 shadow-xl"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-400 rounded-full border-2 border-white"></div>
                </div>
              ) : (
                <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center ring-4 ring-white/30 shadow-xl">
                  <FontAwesomeIcon icon={faUser} className="text-2xl text-white" />
                </div>
              )}
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-white">
                  {t('common.welcome', { name: `${userData?.user_nama_depan || ''} ${userData?.user_nama_belakang || ''}`.trim() })} 👋
                </h1>
                <p className="text-sky-100 mt-1">{t('dashboard.subtitle')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="py-6 space-y-6">
        {error && (
          <div className="p-4 rounded-xl bg-red-50 text-red-700 border border-red-200 text-sm shadow-sm">
            {error}
          </div>
        )}

        {/* Door Greeter and Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Door Greeter Card */}
          {(() => {
            const isOnDuty = !!(doorGreeter.today || doorGreeter.tomorrow)
            if (isOnDuty) {
              const todayLabel = doorGreeter.today ? tr(`doorGreeter.days.${doorGreeter.today}`, doorGreeter.today) : null
              const tomorrowLabel = doorGreeter.tomorrow ? tr(`doorGreeter.days.${doorGreeter.tomorrow}`, doorGreeter.tomorrow) : null
              let message
              if (doorGreeter.today && doorGreeter.tomorrow) {
                message = tr('dashboard.doorGreeterTodayAndTomorrow', `Anda bertugas hari ini (${todayLabel}) dan besok (${tomorrowLabel}).`, { today: todayLabel, tomorrow: tomorrowLabel })
              } else if (doorGreeter.today) {
                message = tr('dashboard.doorGreeterToday', `Anda bertugas hari ini (${todayLabel}).`, { day: todayLabel })
              } else {
                message = tr('dashboard.doorGreeterTomorrow', `Anda bertugas sebagai Door Greeter besok (${tomorrowLabel}).`, { day: tomorrowLabel })
              }
              const isToday = !!doorGreeter.today
              const baseCard = isToday 
                ? 'bg-gradient-to-br from-rose-500 to-red-600 text-white' 
                : 'bg-gradient-to-br from-amber-400 to-orange-500 text-white'
              return (
                <div className={`rounded-2xl shadow-lg p-3 sm:p-5 ${baseCard}`}>
                  <div className="flex items-start gap-3 sm:gap-4">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/20 backdrop-blur rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                      <FontAwesomeIcon icon={faDoorOpen} className="text-lg sm:text-xl" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm sm:text-lg">{tr('dashboard.doorGreeterTitle', 'Tugas Door Greeter')}</h3>
                      <p className="text-xs sm:text-sm text-white/90 mt-1">{message}</p>
                    </div>
                  </div>
                </div>
              )
            }
            // Not on duty
            return (
              <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 p-3 sm:p-5">
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-100 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                    <FontAwesomeIcon icon={faDoorOpen} className="text-gray-400 text-lg sm:text-xl" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-800 text-sm sm:text-base">{tr('dashboard.doorGreeterTitle', 'Tugas Door Greeter')}</h3>
                    <p className="text-xs sm:text-sm text-gray-500 mt-1">{tr('dashboard.notDoorGreeter', 'Anda tidak bertugas sebagai Door Greeter.')}</p>
                  </div>
                </div>
              </div>
            )
          })()}

          {/* Teaching schedule (selectable day) */}
          <div className="md:col-span-1 lg:col-span-3 bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="px-4 sm:px-5 py-3 sm:py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0">
              <h3 className="font-semibold text-gray-800 flex items-center gap-2 text-sm sm:text-base">
                <span className="w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-br from-sky-400 to-cyan-500 rounded-lg flex items-center justify-center">
                  <FontAwesomeIcon icon={faChalkboardTeacher} className="text-white text-xs sm:text-sm" />
                </span>
                {tr('dashboard.teachingToday', 'Mengajar Hari Ini')}
              </h3>
              <select
                value={teacherSelectedDay}
                onChange={(e)=> setTeacherSelectedDay(e.target.value)}
                className="px-2 sm:px-3 py-1 sm:py-1.5 border border-gray-200 rounded-lg text-xs sm:text-sm bg-white focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
              >
                {DAYS.map(d => {
                  const label = tr(`doorGreeter.days.${d}`, d)
                  return <option key={d} value={d}>{label}</option>
                })}
              </select>
            </div>
            <div className="p-3 sm:p-4">
              {teacherToday.length === 0 ? (
                <div className="text-center py-6 sm:py-8">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-3">
                    <FontAwesomeIcon icon={faChalkboardTeacher} className="text-gray-400 text-xl sm:text-2xl" />
                  </div>
                  <p className="text-xs sm:text-sm text-gray-500">{tr('dashboard.noTeachingToday', 'Tidak ada jadwal mengajar hari ini.')}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {teacherToday.map((it, idx) => (
                    <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 p-2.5 sm:p-3 bg-gray-50 rounded-xl hover:bg-sky-50 transition-colors">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-sky-400 to-cyan-500 rounded-lg flex items-center justify-center text-white font-semibold text-xs sm:text-sm flex-shrink-0">
                          {it.subject?.charAt(0) || 'S'}
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium text-gray-800 text-sm truncate">{it.subject}</div>
                          <div className="text-xs sm:text-sm text-gray-500 truncate">{it.kelas}</div>
                        </div>
                      </div>
                      <div className="text-xs sm:text-sm font-medium text-gray-600 bg-white px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg border border-gray-200 self-start sm:self-auto ml-10 sm:ml-0">
                        {it.start} - {it.end}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Pending Assessments */}
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="px-4 sm:px-5 py-3 sm:py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2 text-sm sm:text-base">
              <span className="w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-br from-rose-400 to-pink-500 rounded-lg flex items-center justify-center">
                <FontAwesomeIcon icon={faClipboardCheck} className="text-white text-xs sm:text-sm" />
              </span>
              <span className="hidden sm:inline">{t('dashboard.pendingAssessments')}</span>
              <span className="sm:hidden">Penilaian</span>
            </h3>
            <span className="text-xs sm:text-sm bg-rose-100 text-rose-600 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full font-medium">
              {stats.pendingAssessments}
            </span>
          </div>
          <div className="p-3 sm:p-4">
            {recentAssessments.length === 0 ? (
              <div className="text-center py-6 sm:py-8">
                <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-3">
                  <FontAwesomeIcon icon={faClipboardCheck} className="text-gray-400 text-xl sm:text-2xl" />
                </div>
                <p className="text-xs sm:text-sm text-gray-500">{t('dashboard.noneRecent')}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {recentAssessments.map((a) => (
                  <div key={a.assessment_id} className="flex flex-col gap-2 p-2.5 sm:p-3 bg-gray-50 rounded-xl hover:bg-sky-50 transition-colors">
                    <div className="min-w-0">
                      <div className="font-medium text-gray-800 text-sm truncate">{a.assessment_nama}</div>
                      <div className="text-[10px] sm:text-xs text-gray-500 truncate">
                        {detailKelasMap[a.assessment_detail_kelas_id] || 'Mata pelajaran - Kelas'} · {usersMap[a.assessment_user_id] || 'Guru'}
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-[10px] sm:text-xs text-gray-600 whitespace-nowrap bg-white px-2 py-0.5 sm:py-1 rounded-lg border border-gray-200">{formatDate(a.assessment_tanggal)}</div>
                      <StatusBadge status={a.assessment_status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Combined Calendar (Assessment + Google) */}
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="px-3 sm:px-5 py-3 sm:py-4 border-b border-gray-100 flex flex-col gap-2 sm:gap-3 md:flex-row md:items-center md:justify-between">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2 text-sm sm:text-base">
              <span className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-lg flex items-center justify-center">
                <FontAwesomeIcon icon={faCalendar} className="text-white text-xs sm:text-sm" />
              </span>
              <span className="hidden sm:inline">Kalender</span>
              <span className="sm:hidden">Kalender</span>
              {/* Legend */}
              <div className="hidden md:flex items-center gap-3 ml-3 text-xs">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-gradient-to-r from-sky-500 to-cyan-500"></span>
                  <span className="text-gray-500">Penilaian</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-gradient-to-r from-red-500 to-orange-500"></span>
                  <span className="text-gray-500">Google</span>
                </span>
              </div>
            </h3>
            <div className="w-full md:w-auto overflow-x-auto -mx-1 px-1">
              <div className="inline-flex items-center gap-1 sm:gap-2">
                <Button variant="outline" size="sm" onClick={prevMonth} className="rounded-lg h-8 w-8 p-0">
                  <FontAwesomeIcon icon={faChevronLeft} className="text-xs" />
                </Button>
                <div className="text-xs sm:text-sm min-w-[100px] sm:min-w-[140px] text-center font-medium text-gray-700">
                  {calMonth.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' })}
                </div>
                <Button variant="outline" size="sm" onClick={nextMonth} className="rounded-lg h-8 w-8 p-0">
                  <FontAwesomeIcon icon={faChevronRight} className="text-xs" />
                </Button>
                <Button variant="outline" size="sm" onClick={thisMonth} className="rounded-lg text-xs px-2 hidden sm:inline-flex">Bulan Ini</Button>
                <select
                  className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs sm:text-sm shrink-0 bg-white focus:ring-2 focus:ring-sky-500 max-w-[100px] sm:max-w-none"
                  value={kelasFilter}
                  onChange={(e)=> setKelasFilter(e.target.value)}
                >
                  <option value="">Semua</option>
                  {kelasOptions.map(k => (
                    <option key={k.id} value={k.id}>{k.nama}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          <div className="p-2 sm:p-4">
            {calError && (
              <div className="p-2 sm:p-3 mb-2 sm:mb-3 rounded-lg sm:rounded-xl bg-red-50 text-red-700 border border-red-200 text-xs sm:text-sm">{calError}</div>
            )}
            <div className="grid grid-cols-7 gap-0.5 sm:gap-1 md:gap-2 text-[9px] sm:text-[11px] md:text-xs font-medium text-gray-500 mb-1 sm:mb-3">
              {['S','S','R','K','J','S','M'].map((d, i) => (
                <div key={i} className="text-center py-1 sm:py-2 bg-gray-50 rounded sm:rounded-lg">{d}</div>
              ))}
            </div>
            {/* Month grid */}
            {(() => {
              const first = startOfMonth(calMonth)
              const last = endOfMonth(calMonth)
              const firstWeekday = (first.getDay() + 6) % 7 // make Monday=0
              const days = []
              // leading blanks
              for (let i=0;i<firstWeekday;i++) days.push(null)
              // actual days
              for (let d=1; d<= last.getDate(); d++) {
                days.push(new Date(calMonth.getFullYear(), calMonth.getMonth(), d))
              }
              // pad to full weeks
              while (days.length % 7 !== 0) days.push(null)
              return (
                <div className="grid grid-cols-7 gap-0.5 sm:gap-1 md:gap-2">
                  {days.map((d, idx) => {
                    if (!d) return <div key={idx} className="h-12 sm:h-16 md:h-24 rounded-lg md:rounded-xl border border-gray-100 bg-gray-50/50" />
                    const key = toKey(d)
                    const info = calData[key]
                    const gEvents = googleEvents[key] || []
                    const total = info?.total || 0
                    const hasGoogleEvents = gEvents.length > 0
                    const top = (info?.perClass || []).slice().sort((a,b)=> b.count - a.count).slice(0,2)
                    const more = Math.max(0, (info?.perClass?.length || 0) - top.length)
                    return (
                      <button
                        key={idx}
                        className={`h-12 sm:h-16 md:h-24 rounded-lg md:rounded-xl border p-1 sm:p-1.5 md:p-2 text-left hover:bg-sky-50 hover:border-sky-200 transition-all ${(total>0 || hasGoogleEvents) ? 'bg-white border-gray-200' : 'bg-gray-50/50 border-gray-100'}`}
                        onClick={() => setDayDetail({ open: true, date: key, rows: (info?.perClass || []).slice().sort((a,b)=> b.count - a.count), googleEvents: gEvents })}
                      >
                        <div className="flex items-center justify-between">
                          <div className="text-[10px] sm:text-xs font-semibold text-gray-700">{d.getDate()}</div>
                          <div className="flex gap-0.5">
                            {hasGoogleEvents && <span className="text-[8px] sm:text-[10px] px-1 sm:px-1.5 py-0.5 rounded-full bg-gradient-to-r from-red-500 to-orange-500 text-white font-medium">{gEvents.length}</span>}
                            {total>0 && <span className="text-[8px] sm:text-[10px] px-1 sm:px-1.5 py-0.5 rounded-full bg-gradient-to-r from-sky-500 to-cyan-500 text-white font-medium">{total}</span>}
                          </div>
                        </div>
                        {/* Hide details on mobile, show only on tablet and up */}
                        <div className="hidden sm:block mt-1 space-y-0.5 md:space-y-1">
                          {/* Google events first */}
                          {gEvents.slice(0, 1).map((ev, i) => (
                            <div key={`g-${i}`} className="text-[8px] md:text-[10px] truncate">
                              <span className="px-0.5 md:px-1 py-0.5 rounded mr-0.5 md:mr-1 bg-red-100 text-red-700">G</span>
                              <span className="text-red-700 hidden md:inline">{ev.title}</span>
                            </div>
                          ))}
                          {top.slice(0, gEvents.length > 0 ? 1 : 2).map(c => (
                            <div key={c.detail_kelas_id} className="text-[8px] md:text-[10px] truncate">
                              <span className={`px-0.5 md:px-1 py-0.5 rounded mr-0.5 md:mr-1 ${colorToChip(c.color)}`}>{c.count}</span>
                              <span className={`${colorToText(c.color)} hidden md:inline`}>{c.kelas_nama}{c.subject_code ? ` (${c.subject_code})` : ''}</span>
                            </div>
                          ))}
                          {(more>0 || gEvents.length > 1) && (
                            <div className="text-[8px] md:text-[10px] text-gray-500 hidden md:block">+{more + Math.max(0, gEvents.length - 1)} lainnya</div>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              )
            })()}
          </div>
        </div>
      </div>

      {/* Day detail modal */}
      <Modal
        isOpen={dayDetail.open}
        onClose={() => setDayDetail({ open: false, date: '', rows: [], googleEvents: [] })}
        title={`Detail ${dayDetail.date}`}
      >
        <div className="space-y-3">
          {/* Google Calendar Events */}
          {dayDetail.googleEvents && dayDetail.googleEvents.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-red-600 mb-2 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-red-500"></span>
                Google Calendar
              </div>
              <div className="space-y-2">
                {dayDetail.googleEvents.map((ev, i) => (
                  <div key={`g-${i}`} className="p-2 bg-red-50 rounded-lg border border-red-200">
                    <div className="font-medium text-sm text-red-800">{ev.title}</div>
                    <div className="text-xs text-red-600 mt-1">
                      {ev.isAllDay ? 'Sepanjang hari' : `${ev.start?.split('T')[1]?.slice(0,5) || ''} - ${ev.end?.split('T')[1]?.slice(0,5) || ''}`}
                    </div>
                    {ev.location && <div className="text-xs text-gray-500 mt-1">📍 {ev.location}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Assessment Events */}
          {dayDetail.rows && dayDetail.rows.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-sky-600 mb-2 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-sky-500"></span>
                Penilaian
              </div>
              <div className="space-y-2">
                {dayDetail.rows.map(r => (
                  <div key={r.detail_kelas_id} className="flex items-center justify-between text-sm p-2 bg-gray-50 rounded-lg">
                    <div className={`${colorToText(r.color)}`}>{r.kelas_nama}{r.subject_code ? ` (${r.subject_code})` : ''}</div>
                    <div className={`px-2 py-0.5 rounded text-xs ${colorToChip(r.color)}`}>{r.count}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {(!dayDetail.googleEvents || dayDetail.googleEvents.length === 0) && (!dayDetail.rows || dayDetail.rows.length === 0) && (
            <div className="text-sm text-gray-500">Tidak ada event</div>
          )}
        </div>
      </Modal>

      {/* Academic Integrity Chatbot */}
      <AcademicIntegrityChatbot />
    </div>
  )
}
