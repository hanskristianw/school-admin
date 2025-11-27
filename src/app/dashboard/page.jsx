"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { supabase } from '@/lib/supabase'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faUser, faCalendar, faClipboardCheck, faChevronLeft, faChevronRight, faDoorOpen, faQrcode } from '@fortawesome/free-solid-svg-icons'
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
  // calData: { 'YYYY-MM-DD': { total: number, perClass: Array<{kelas_id, kelas_nama, count}> } }
  const [calData, setCalData] = useState({})
  const [kelasOptions, setKelasOptions] = useState([]) // from current month data
  const [kelasFilter, setKelasFilter] = useState('')
  const [dayDetail, setDayDetail] = useState({ open: false, date: '', rows: [] })
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
    fetchMonth()
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
      <div className="p-6 space-y-4">
        <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 bg-gray-100 rounded-xl border animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  // Student-focused dashboard
  if (isStudent) {
    return (
      <div className="py-4 md:py-6 space-y-6">
        {searchParams?.get('forbidden') === '1' && (
          <div className="mx-1 md:mx-0 p-3 rounded-md bg-red-50 text-red-700 border border-red-200 text-sm">
            Access denied for the requested page.
          </div>
        )}
        <div className="px-1">
          <div className="mb-4">
            <h1 className="text-2xl md:text-3xl font-bold">
              {t('common.welcome', { name: `${userData?.user_nama_depan || ''} ${userData?.user_nama_belakang || ''}`.trim() })}
            </h1>
            {studentInfo.kelas_nama && (
              <p className="text-gray-600">{(t('dashboard.classLabel') || 'Class')}: {studentInfo.kelas_nama}</p>
            )}
          </div>
          
          {/* QR Scan Button - Enhanced for Mobile */}
          <Button 
            onClick={() => router.push('/student/scan')} 
            className="w-full md:w-auto bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold py-4 md:py-3 px-6 rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 flex items-center justify-center gap-3 text-lg md:text-base mb-4"
          >
            <FontAwesomeIcon icon={faQrcode} className="text-2xl md:text-xl" />
            <span>{t('student.qrScan') || 'QR Scan'}</span>
          </Button>
        </div>

        <Card>
          <CardHeader><CardTitle>{t('dashboard.todaySchedule') || "Today's Schedule"}</CardTitle></CardHeader>
          <CardContent>
            <div className="mb-3">
              <label className="text-sm text-gray-600 mr-2">{(t('dashboard.dayLabel') || 'Day')}:</label>
              <select
                value={selectedDay}
                onChange={(e)=> setSelectedDay(e.target.value)}
                className="px-2 py-1 border rounded"
              >
                {DAYS.map(d => {
                  const label = t(`doorGreeter.days.${d}`) || d
                  return <option key={d} value={d}>{label}</option>
                })}
              </select>
            </div>
            {studentSchedule.length === 0 ? (
              <div className="text-sm text-gray-500">{t('dashboard.noScheduleToday') || 'No schedule for today.'}</div>
            ) : (
              <div className="divide-y rounded border">
                {studentSchedule.map((it, i) => (
                  <div key={i} className="flex items-center justify-between p-3">
                    <div>
                      <div className="font-medium">{it.subject}</div>
                      <div className="text-sm text-gray-500">{it.teacher}</div>
                    </div>
                    <div className="text-sm text-gray-700 font-mono">{it.start} - {it.end}</div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="bg-blue-50 border border-blue-200 text-blue-800 p-3 rounded mx-1 md:mx-0">
          {t('student.scanHint') || 'Tip: Please allow location and camera access when scanning.'}
        </div>
      </div>
    )
  }

  return (
    <div className="py-4 md:py-6 space-y-6">
      {searchParams?.get('forbidden') === '1' && (
        <div className="mx-1 md:mx-0 p-3 rounded-md bg-red-50 text-red-700 border border-red-200 text-sm">
          Access denied for the requested page.
        </div>
      )}
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 px-1">
        <div className="flex items-center gap-4">
          {/* Avatar */}
          {userData?.user_profile_picture ? (
            <img 
              src={userData.user_profile_picture} 
              alt="Profile" 
              className="w-14 h-14 md:w-16 md:h-16 rounded-full object-cover ring-2 ring-blue-200"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-gray-200 flex items-center justify-center ring-2 ring-gray-200">
              <FontAwesomeIcon icon={faUser} className="text-2xl text-gray-400" />
            </div>
          )}
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">
              {t('common.welcome', { name: `${userData?.user_nama_depan || ''} ${userData?.user_nama_belakang || ''}`.trim() })} 👋
            </h1>
            <p className="text-gray-600">{t('dashboard.subtitle')}</p>
          </div>
        </div>
  {/* Quick action buttons removed; access via sidebar only */}
      </div>

      {error && (
        <div className="mx-1 md:mx-0 p-3 rounded-md bg-red-50 text-red-700 border border-red-200 text-sm">
          {error}
        </div>
      )}

      {/* Teaching Today (Teacher only) and Door Greeter */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
            const baseCard = isToday ? 'border-red-300 from-rose-50 to-red-50' : 'border-amber-300 from-amber-50 to-yellow-50'
            const circleBg = isToday ? 'bg-red-100' : 'bg-amber-100'
            const iconColor = isToday ? 'text-red-600' : 'text-amber-600'
            const titleColor = isToday ? 'text-red-800' : 'text-amber-800'
            const textColor = isToday ? 'text-red-700' : 'text-amber-700'
            return (
              <Card className={`border bg-gradient-to-br shadow-sm ${baseCard}`}>
                <CardContent className="pt-4">
                  <div className="flex items-start gap-3">
                    <div className={`flex-shrink-0 mt-0.5 w-10 h-10 rounded-full flex items-center justify-center ${circleBg}`}>
                      <FontAwesomeIcon icon={faDoorOpen} className={`${iconColor} text-lg`} />
                    </div>
                    <div className="space-y-1">
                      <div className={`font-semibold leading-snug ${titleColor}`}>{tr('dashboard.doorGreeterTitle', 'Tugas Door Greeter')}</div>
                      <p className={`text-sm leading-snug ${textColor}`}>{message}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          }
          // Not on duty today or tomorrow – show neutral card
          return (
            <Card className="border bg-gradient-to-br shadow-sm border-gray-200 from-gray-50 to-gray-50">
              <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5 w-10 h-10 rounded-full flex items-center justify-center bg-gray-100">
                    <FontAwesomeIcon icon={faDoorOpen} className="text-gray-500 text-lg" />
                  </div>
                  <div className="space-y-1">
                    <div className="font-semibold leading-snug text-gray-800">{tr('dashboard.doorGreeterTitle', 'Tugas Door Greeter')}</div>
                    <p className="text-sm leading-snug text-gray-600">{tr('dashboard.notDoorGreeter', 'Anda tidak bertugas sebagai Door Greeter.')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })()}

        {/* Teaching schedule (selectable day) */}
        <Card className="sm:col-span-2 lg:col-span-3">
          <CardHeader className="flex items-center justify-between">
            <CardTitle className="text-base">
              {tr('dashboard.teachingToday', 'Mengajar Hari Ini')}
            </CardTitle>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">{tr('dashboard.dayLabel', 'Hari')}:</label>
              <select
                value={teacherSelectedDay}
                onChange={(e)=> setTeacherSelectedDay(e.target.value)}
                className="px-2 py-1 border rounded text-sm"
              >
                {DAYS.map(d => {
                  const label = tr(`doorGreeter.days.${d}`, d)
                  return <option key={d} value={d}>{label}</option>
                })}
              </select>
            </div>
          </CardHeader>
          <CardContent>
            {teacherToday.length === 0 ? (
              <div className="text-sm text-gray-500">{tr('dashboard.noTeachingToday', 'Tidak ada jadwal mengajar hari ini.')}</div>
            ) : (
              <div className="divide-y rounded border">
                {teacherToday.map((it, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3">
                    <div>
                      <div className="font-medium">{it.subject}</div>
                      <div className="text-sm text-gray-500">{it.kelas}</div>
                    </div>
                    <div className="text-sm text-gray-700 font-mono">{it.start} - {it.end}</div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pending assessments */}
        <Card className="sm:col-span-2 lg:col-span-4">
          <CardHeader className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FontAwesomeIcon icon={faClipboardCheck} className="text-rose-500" />
              <CardTitle className="text-base">{t('dashboard.pendingAssessments')}</CardTitle>
            </div>
            <div className="text-sm text-gray-500">{stats.pendingAssessments} pending</div>
          </CardHeader>
          <CardContent>
            {recentAssessments.length === 0 ? (
              <div className="text-sm text-gray-500">{t('dashboard.noneRecent')}</div>
            ) : (
              <div className="divide-y rounded-lg border">
                {recentAssessments.map((a) => (
                  <div key={a.assessment_id} className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{a.assessment_nama}</div>
                      <div className="text-xs text-gray-600 truncate">
                        {detailKelasMap[a.assessment_detail_kelas_id] || 'Mata pelajaran - Kelas'} · {usersMap[a.assessment_user_id] || 'Guru'}
                      </div>
                    </div>
                      <div className="flex items-center gap-3 md:gap-6">
                      <div className="text-xs text-gray-600 whitespace-nowrap">{formatDate(a.assessment_tanggal)}</div>
                      <StatusBadge status={a.assessment_status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        {/* Assessment Calendar */}
        <Card className="sm:col-span-2 lg:col-span-4">
          <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-2">
              <FontAwesomeIcon icon={faCalendar} className="text-blue-500" />
              <CardTitle className="text-base">Kalender Penilaian</CardTitle>
            </div>
            <div className="w-full md:w-auto overflow-x-auto">
              <div className="inline-flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={prevMonth}>
                  <FontAwesomeIcon icon={faChevronLeft} />
                </Button>
                <div className="text-sm min-w-[140px] text-center">
                  {calMonth.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
                </div>
                <Button variant="outline" size="sm" onClick={nextMonth}>
                  <FontAwesomeIcon icon={faChevronRight} />
                </Button>
                <Button variant="outline" size="sm" onClick={thisMonth}>Bulan Ini</Button>
                <select
                  className="ml-2 border rounded px-2 py-1 text-sm shrink-0"
                  value={kelasFilter}
                  onChange={(e)=> setKelasFilter(e.target.value)}
                >
                  <option value="">Semua Kelas</option>
                  {kelasOptions.map(k => (
                    <option key={k.id} value={k.id}>{k.nama}</option>
                  ))}
                </select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {calError && (
              <div className="p-2 mb-3 rounded bg-red-50 text-red-700 border border-red-200 text-sm">{calError}</div>
            )}
            <div className="grid grid-cols-7 gap-1 sm:gap-2 text-[11px] sm:text-xs font-medium text-gray-500 mb-2">
              {['Sen','Sel','Rab','Kam','Jum','Sab','Min'].map(d => (
                <div key={d} className="text-center">{d}</div>
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
        <div className="grid grid-cols-7 gap-1 sm:gap-2">
                  {days.map((d, idx) => {
          if (!d) return <div key={idx} className="h-20 md:h-24 rounded border bg-gray-50" />
                    const key = toKey(d)
                    const info = calData[key]
                    const total = info?.total || 0
                    const top = (info?.perClass || []).slice().sort((a,b)=> b.count - a.count).slice(0,2)
                    const more = Math.max(0, (info?.perClass?.length || 0) - top.length)
                    return (
                      <button
                        key={idx}
            className={`h-20 md:h-24 rounded border p-2 text-left hover:bg-blue-50 transition ${total>0 ? 'bg-white' : 'bg-gray-50'}`}
                        onClick={() => setDayDetail({ open: true, date: key, rows: (info?.perClass || []).slice().sort((a,b)=> b.count - a.count) })}
                      >
                        <div className="flex items-center justify-between">
                          <div className="text-xs font-semibold">{d.getDate()}</div>
                          {total>0 && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700">{total}</span>}
                        </div>
                        <div className="mt-1 space-y-1">
                          {top.map(c => (
                            <div key={c.detail_kelas_id} className="text-[10px] truncate">
                              <span className={`px-1 py-0.5 rounded mr-1 ${colorToChip(c.color)}`}>{c.count}</span>
                              <span className={`${colorToText(c.color)}`}>{c.kelas_nama}{c.subject_code ? ` (${c.subject_code})` : ''}</span>
                            </div>
                          ))}
                          {more>0 && (
                            <div className="text-[10px] text-gray-500">+{more} kelas lainnya</div>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              )
            })()}
          </CardContent>
        </Card>
      </div>

      {/* Day detail modal */}
      <Modal
        isOpen={dayDetail.open}
        onClose={() => setDayDetail({ open: false, date: '', rows: [] })}
        title={`Detail ${dayDetail.date}`}
      >
        <div className="space-y-2">
          {dayDetail.rows.length === 0 ? (
      <div className="text-sm text-gray-500">Tidak ada assessment</div>
          ) : (
            dayDetail.rows.map(r => (
              <div key={r.detail_kelas_id} className="flex items-center justify-between text-sm">
                <div className={`${colorToText(r.color)}`}>{r.kelas_nama}{r.subject_code ? ` (${r.subject_code})` : ''}</div>
                <div className={`px-2 py-0.5 rounded text-xs ${colorToChip(r.color)}`}>{r.count}</div>
              </div>
            ))
          )}
        </div>
      </Modal>

      {/* Academic Integrity Chatbot */}
      <AcademicIntegrityChatbot />
    </div>
  )
}
