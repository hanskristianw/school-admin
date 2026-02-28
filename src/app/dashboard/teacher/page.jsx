"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { supabase } from '@/lib/supabase'
import {
  LayoutDashboard, BookOpen, GraduationCap, Users, UserPlus, ClipboardCheck,
  ClipboardList, FileText, MessageCircle, MessageSquare, CalendarDays, Calendar,
  QrCode, School, Settings, ShieldCheck, ShoppingCart, ShoppingBag, Package,
  Truck, Warehouse, Shirt, Ruler, DoorOpen, BarChart2, FileBarChart2, SlidersHorizontal,
  BadgeCheck, Lightbulb, Hash, Building, Wand2, Calculator, LayoutGrid, ScanLine,
  BookMarked, NotebookPen, Clock, Star, Trophy, Megaphone, ChevronLeft, ChevronRight,
  User
} from 'lucide-react'

// Map menu path prefixes to Lucide icon components
const PATH_ICONS = [
  ['/teacher/assessment_submission', ClipboardCheck],
  ['/teacher',                       NotebookPen],
  ['/data/assessment_approval',      BadgeCheck],
  ['/data/topic-new',                BookMarked],
  ['/data/consultation',             MessageCircle],
  ['/data/comment',                  MessageSquare],
  ['/data/class',                    School],
  ['/data/kelas',                    School],
  ['/data/subject',                  BookOpen],
  ['/data/schedule',                 Clock],
  ['/data/timetable',                CalendarDays],
  ['/data/report',                   FileBarChart2],
  ['/data/user',                     Users],
  ['/data/admission',                UserPlus],
  ['/data/uniform',                  Shirt],
  ['/data/attendance',               ScanLine],
  ['/data/door_greeter',             DoorOpen],
  ['/data/menu_management',          SlidersHorizontal],
  ['/data/role',                     ShieldCheck],
  ['/data/stock',                    Package],
  ['/data/supplier',                 Truck],
  ['/data/purchase',                 ShoppingBag],
  ['/data/atl',                      Star],
  ['/data/criteria',                 Trophy],
  ['/data/rubric',                   ClipboardList],
  ['/data/announcement',             Megaphone],
  ['/data/goal',                     Lightbulb],
  ['/data/calendar',                 Calendar],
  ['/sales',                         ShoppingCart],
  ['/student',                       GraduationCap],
  ['/room',                          DoorOpen],
  ['/settings',                      Settings],
  ['/reports',                       BarChart2],
  ['/dashboard',                     LayoutDashboard],
]

function getPathIcon(path) {
  if (!path) return LayoutGrid
  const norm = path.trim().toLowerCase()
  for (const [prefix, Icon] of PATH_ICONS) {
    if (norm === prefix || norm.startsWith(prefix + '/') || norm.startsWith(prefix + '?')) return Icon
  }
  return LayoutGrid
}
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Modal from '@/components/ui/modal'
import { useI18n } from '@/lib/i18n'
import AcademicIntegrityChatbot from '@/components/AcademicIntegrityChatbot'

export default function TeacherDashboard() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { t } = useI18n()
  const tr = (key, fallback, params) => {
    try {
      const val = params ? t(key, params) : t(key)
      return val === key ? fallback : val
    } catch {
      return fallback
    }
  }

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [userData, setUserData] = useState(null)
  const [menuItems, setMenuItems] = useState([])

  const CARD_COLORS = [
    { bg: 'bg-pink-50', icon: 'from-pink-400 to-rose-400', text: 'text-pink-700' },
    { bg: 'bg-amber-50', icon: 'from-amber-400 to-orange-400', text: 'text-amber-700' },
    { bg: 'bg-emerald-50', icon: 'from-emerald-400 to-teal-400', text: 'text-emerald-700' },
    { bg: 'bg-sky-50', icon: 'from-sky-400 to-cyan-400', text: 'text-sky-700' },
    { bg: 'bg-violet-50', icon: 'from-violet-400 to-purple-400', text: 'text-violet-700' },
    { bg: 'bg-rose-50', icon: 'from-rose-400 to-pink-500', text: 'text-rose-700' },
    { bg: 'bg-teal-50', icon: 'from-teal-400 to-emerald-500', text: 'text-teal-700' },
    { bg: 'bg-orange-50', icon: 'from-orange-400 to-amber-500', text: 'text-orange-700' },
  ]
  
  const [calMonth, setCalMonth] = useState(() => {
    const d = new Date()
    d.setDate(1)
    d.setHours(0,0,0,0)
    return d
  })
  const [calLoading, setCalLoading] = useState(false)
  const [calError, setCalError] = useState('')
  const [calData, setCalData] = useState({})
  const [googleEvents, setGoogleEvents] = useState({})
  const [googleCalError, setGoogleCalError] = useState('')
  const [kelasOptions, setKelasOptions] = useState([])
  const [kelasFilter, setKelasFilter] = useState('')
  const [dayDetail, setDayDetail] = useState({ open: false, date: '', rows: [], googleEvents: [] })

  useEffect(() => {
    const id = localStorage.getItem("kr_id")
    const role = localStorage.getItem("user_role")

    if (!id || !role) {
      localStorage.clear()
      router.replace("/login")
    } else {
      setLoading(true)
      setError("")
      const uid = parseInt(id, 10)
      // Load menus for card grid
      const loadMenus = async () => {
        try {
          const rawData = localStorage.getItem("user_data")
          let userRole = role
          let isAdmin = false
          if (rawData) {
            try { const u = JSON.parse(rawData); userRole = u.roleName || role; isAdmin = !!u.isAdmin } catch {}
          }
          const { customAuth } = await import('@/lib/supabase')
          const result = await customAuth.getMenusByRole(userRole, isAdmin)
          if (result.success && Array.isArray(result.menus)) {
            const items = result.menus
              .filter(m => m.menu_show_dashboard === true)
              .map(m => ({ name: m.menu_name, path: m.menu_path || '#', icon: m.menu_icon || '', order: m.menu_order || 0 }))
              .filter(m => m.path && m.path !== '#')
              .sort((a, b) => (a.order || 0) - (b.order || 0))
            setMenuItems(items)
          }
        } catch (e) { console.warn('Menu load failed', e) }
      }
      Promise.all([
        fetchUserInfo(id),
        loadMenus(),
      ])
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
    const fetchMonth = async () => {
      try {
        setCalLoading(true)
        setCalError('')
        const from = startOfMonth(calMonth)
        const to = endOfMonth(calMonth)
        const fromStr = toKey(from)
        const toStr = toKey(to)
        
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
        
        const agg = new Map()
        for (const a of (assess||[])) {
          const day = String(a.assessment_tanggal).slice(0,10)
          const info = dkInfo.get(a.assessment_detail_kelas_id)
          if (!info) continue
          const kid = info.kelas_id
          if (kelasFilter && parseInt(kelasFilter) !== kid) continue
          const key = `${day}|${a.assessment_detail_kelas_id}`
          agg.set(key, (agg.get(key)||0) + 1)
        }
        
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

    const getValidGoogleToken = async () => {
      const accessToken = localStorage.getItem('google_access_token')
      const expiresAt = localStorage.getItem('google_token_expires_at')
      if (!accessToken) return null
      if (expiresAt && Date.now() > parseInt(expiresAt, 10)) {
        return await refreshGoogleToken()
      }
      return accessToken
    }
    
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-sky-50 to-cyan-50 p-4 md:p-6">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-r from-sky-500 via-cyan-500 to-teal-500 px-6 py-8 md:py-12 rounded-3xl shadow-xl">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-1/2 -right-1/4 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-1/2 -left-1/4 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
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
                  <User size={32} className="text-white" />
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

        {/* Quick Access Menu Grid */}
        {menuItems.length > 0 && (
          <div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {menuItems.map((item, idx) => {
                const color = CARD_COLORS[idx % CARD_COLORS.length]
                const Icon = getPathIcon(item.path)
                return (
                  <button
                    key={idx}
                    onClick={() => router.push(item.path)}
                    className="flex items-stretch bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-md hover:border-gray-200 transition-all text-left group overflow-hidden"
                  >
                    {/* Colored background section on left */}
                    <div className={`${color.bg} w-24 flex-shrink-0 flex items-center justify-center`}>
                      <Icon size={36} className={color.text} strokeWidth={1.5} />
                    </div>
                    {/* Name */}
                    <span className="flex-1 font-medium text-gray-800 text-base leading-snug flex items-center px-5 py-6">{item.name}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Calendar */}
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="px-3 sm:px-5 py-3 sm:py-4 border-b border-gray-100 flex flex-col gap-2 sm:gap-3 md:flex-row md:items-center md:justify-between">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2 text-sm sm:text-base">
              <span className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-lg flex items-center justify-center">
                <Calendar size={14} className="text-white" />
              </span>
              <span className="hidden sm:inline">Kalender</span>
              <span className="sm:hidden">Kalender</span>
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
                  <ChevronLeft size={14} />
                </Button>
                <div className="text-xs sm:text-sm min-w-[100px] sm:min-w-[140px] text-center font-medium text-gray-700">
                  {calMonth.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' })}
                </div>
                <Button variant="outline" size="sm" onClick={nextMonth} className="rounded-lg h-8 w-8 p-0">
                  <ChevronRight size={14} />
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
            {(() => {
              const first = startOfMonth(calMonth)
              const last = endOfMonth(calMonth)
              const firstWeekday = (first.getDay() + 6) % 7
              const days = []
              for (let i=0;i<firstWeekday;i++) days.push(null)
              for (let d=1; d<= last.getDate(); d++) {
                days.push(new Date(calMonth.getFullYear(), calMonth.getMonth(), d))
              }
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
                        <div className="hidden sm:block mt-1 space-y-0.5 md:space-y-1">
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
