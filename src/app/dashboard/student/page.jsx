"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { supabase } from '@/lib/supabase'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faUser, faCalendar, faQrcode, faClock } from '@fortawesome/free-solid-svg-icons'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/lib/i18n'
import AcademicIntegrityChatbot from '@/components/AcademicIntegrityChatbot'

export default function StudentDashboard() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { t } = useI18n()
  const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']

  const [loading, setLoading] = useState(true)
  const [userData, setUserData] = useState(null)
  const [studentSchedule, setStudentSchedule] = useState([])
  const [studentInfo, setStudentInfo] = useState({ kelas_nama: '' })
  const [selectedDay, setSelectedDay] = useState(() => new Date().toLocaleDateString('en-US', { weekday: 'long' }))

  useEffect(() => {
    const id = localStorage.getItem("kr_id")
    const role = localStorage.getItem("user_role")

    if (!id || !role) {
      localStorage.clear()
      router.replace("/login")
    } else {
      setLoading(true)
      const uid = parseInt(id, 10)
      Promise.all([fetchUserInfo(id), fetchStudentDashboardData(uid, selectedDay)])
        .catch((e) => {
          console.error(e)
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

  const fetchStudentDashboardData = async (userId, day) => {
    try {
      const { data: ds, error: dsErr } = await supabase
        .from('detail_siswa')
        .select('detail_siswa_kelas_id')
        .eq('detail_siswa_user_id', userId)
        .limit(1)
      if (dsErr) throw dsErr
      const kelasId = ds && ds[0]?.detail_siswa_kelas_id
      if (!kelasId) { 
        setStudentInfo({ kelas_nama: '' })
        setStudentSchedule([])
        return 
      }

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
        const times = rangeStr.match(/\b(\d{1,2}:\d{2})\b/g)
        if (times && times.length >= 2) return { start: times[0], end: times[1] }
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

  useEffect(() => {
    const id = localStorage.getItem('kr_id')
    if (!id) return
    const uid = parseInt(id, 10)
    fetchStudentDashboardData(uid, selectedDay)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDay])

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

      {/* Academic Integrity Chatbot */}
      <AcademicIntegrityChatbot />
    </div>
  )
}
