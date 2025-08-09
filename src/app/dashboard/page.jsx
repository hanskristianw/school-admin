"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { supabase } from '@/lib/supabase'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faUser, faUsers, faBook, faCalendar, faClipboardCheck, faSchool } from '@fortawesome/free-solid-svg-icons'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/lib/i18n'

export default function Dashboard() {
  const router = useRouter()
  const { t } = useI18n()

  // UI states
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  // User profile
  const [userData, setUserData] = useState(null)

  // Stats
  const [stats, setStats] = useState({
    users: 0,
    classes: 0,
    subjects: 0,
    years: 0,
    pendingAssessments: 0,
  })

  // Recent assessments + lookup maps
  const [recentAssessments, setRecentAssessments] = useState([])
  const [subjectsMap, setSubjectsMap] = useState({})
  const [usersMap, setUsersMap] = useState({})

  useEffect(() => {
    const id = localStorage.getItem("kr_id")
    const role = localStorage.getItem("user_role")

    if (!id || !role) {
      localStorage.clear()
      router.replace("/login")
    } else {
      // Load profile and dashboard data in parallel
      setLoading(true)
      setError("")
      Promise.all([fetchUserInfo(id), fetchDashboardData()])
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

  const fetchDashboardData = async () => {
    // Fetch counts in parallel
    const [usersRes, classesRes, subjectsRes, yearsRes, pendingRes] = await Promise.all([
      supabase.from('users').select('*', { count: 'exact', head: true }),
      supabase.from('kelas').select('*', { count: 'exact', head: true }),
      supabase.from('subject').select('*', { count: 'exact', head: true }),
      supabase.from('year').select('*', { count: 'exact', head: true }),
      supabase.from('assessment').select('*', { count: 'exact', head: true }).eq('assessment_status', 0),
    ])

    setStats({
      users: usersRes.count ?? 0,
      classes: classesRes.count ?? 0,
      subjects: subjectsRes.count ?? 0,
      years: yearsRes.count ?? 0,
      pendingAssessments: pendingRes.count ?? 0,
    })

    // Recent assessments (last 5)
    const [{ data: assessments, error: aErr }, { data: subjects, error: sErr }, { data: users, error: uErr }] = await Promise.all([
      supabase
        .from('assessment')
        .select('assessment_id, assessment_nama, assessment_tanggal, assessment_status, assessment_user_id, assessment_subject_id')
        .order('assessment_tanggal', { ascending: false })
        .limit(5),
      supabase
        .from('subject')
        .select('subject_id, subject_name'),
      supabase
        .from('users')
        .select('user_id, user_nama_depan, user_nama_belakang'),
    ])

    if (aErr) throw aErr
    if (sErr) throw sErr
    if (uErr) throw uErr

    const sMap = Object.fromEntries((subjects || []).map(s => [s.subject_id, s.subject_name]))
    const uMap = Object.fromEntries((users || []).map(u => [u.user_id, `${u.user_nama_depan} ${u.user_nama_belakang}`.trim()]))

    setSubjectsMap(sMap)
    setUsersMap(uMap)
    setRecentAssessments(assessments || [])
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
      0: { text: 'Menunggu', cls: 'bg-yellow-100 text-yellow-800' },
      1: { text: 'Disetujui', cls: 'bg-green-100 text-green-800' },
      2: { text: 'Ditolak', cls: 'bg-red-100 text-red-800' },
    }), [])
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

  return (
    <div className="py-4 md:py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 px-1">
        <div className="flex items-center gap-4">
          {/* Avatar */}
          {userData?.user_profile_picture ? (
            <img src={userData.user_profile_picture} alt="Profile" className="w-14 h-14 md:w-16 md:h-16 rounded-full object-cover ring-2 ring-blue-200" />
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
        <div className="flex flex-wrap gap-2">
          <Link href="/profile"><Button variant="outline">{t('common.profile')}</Button></Link>
          <Link href="/data/user"><Button variant="outline">{t('common.manageUsers')}</Button></Link>
          <Link href="/data/class"><Button variant="outline">{t('common.manageClasses')}</Button></Link>
          <Link href="/data/assessment_approval"><Button>{t('common.assessmentApproval')}</Button></Link>
        </div>
      </div>

      {error && (
        <div className="mx-1 md:mx-0 p-3 rounded-md bg-red-50 text-red-700 border border-red-200 text-sm">
          {error}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle className="text-base">{t('dashboard.totalUsers')}</CardTitle>
            <FontAwesomeIcon icon={faUsers} className="text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.users}</div>
            <div className="text-sm text-gray-500">Semua role</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle className="text-base">{t('dashboard.classes')}</CardTitle>
            <FontAwesomeIcon icon={faSchool} className="text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.classes}</div>
            <div className="text-sm text-gray-500">Terdaftar</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle className="text-base">{t('dashboard.subjects')}</CardTitle>
            <FontAwesomeIcon icon={faBook} className="text-violet-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.subjects}</div>
            <div className="text-sm text-gray-500">Aktif</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle className="text-base">{t('dashboard.years')}</CardTitle>
            <FontAwesomeIcon icon={faCalendar} className="text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.years}</div>
            <div className="text-sm text-gray-500">Total</div>
          </CardContent>
        </Card>

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
                        {subjectsMap[a.assessment_subject_id] || 'Mata pelajaran'} · {usersMap[a.assessment_user_id] || 'Guru'}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 md:gap-6">
                      <div className="text-xs text-gray-600 whitespace-nowrap">{formatDate(a.assessment_tanggal)}</div>
                      <StatusBadge status={a.assessment_status} />
                      <Link href="/data/assessment_approval"><Button size="sm" variant="outline">Kelola</Button></Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
