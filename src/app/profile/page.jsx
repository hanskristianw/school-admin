"use client"

import { useEffect, useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { 
  faUser, faEdit, faSave, faTimes, faEnvelope, faPhone, 
  faCalendar, faCalendarAlt, faCalendarCheck, faCalendarPlus, faMapMarkerAlt, 
  faIdBadge, faShieldAlt, faClock, faCheck, faSun, faMoon, faPalette, 
  faArrowRight, faCheckCircle, faExclamationTriangle, faInfoCircle, 
  faBuilding, faSuitcase, faFileAlt, faPaperclip, faHistory
} from '@fortawesome/free-solid-svg-icons'
import { useI18n } from '@/lib/i18n'
import { useTheme } from '@/lib/theme'

// Minimalist Google logo SVG
const GoogleIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
)

export default function ProfilePage() {
  const router = useRouter()
  const { t, lang } = useI18n()
  const { theme, isDark, setTheme } = useTheme()

  // Layout color tokens matching /data/pyp
  const pageBg = isDark ? '#09090B' : '#FBFBFA'
  const cardBg = isDark ? '#18181B' : '#FFFFFF'
  const borderColor = isDark ? '#27272A' : '#EAEAEA'
  const textPrimary = isDark ? '#F4F4F5' : '#111111'
  const textSecondary = isDark ? '#A1A1AA' : '#787774'

  // Input styles matching /data/pyp
  const inputStyle = {
    background: isDark ? '#27272A' : '#FFFFFF',
    border: `1px solid ${borderColor}`,
    color: textPrimary,
    borderRadius: '6px',
    fontSize: '13px'
  }

  // Active Tab: 'overview' | 'leave' | 'preferences'
  const [activeTab, setActiveTab] = useState('overview')

  // User & Form States
  const [loading, setLoading] = useState(true)
  const [userData, setUserData] = useState(null)
  const [editing, setEditing] = useState(false)
  const [formData, setFormData] = useState({})
  const [originalData, setOriginalData] = useState({})
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState('')
  const [saveSuccess, setSaveSuccess] = useState(false)

  // Academic Years & Leave Quota States
  const [years, setYears] = useState([])
  const [selectedYearId, setSelectedYearId] = useState(null)
  const [leaveQuotas, setLeaveQuotas] = useState([])
  const [leaveTypes, setLeaveTypes] = useState([])
  const [userExcuses, setUserExcuses] = useState([])
  const [loadingLeave, setLoadingLeave] = useState(false)

  // Check if form has changes
  const hasChanges = JSON.stringify(formData) !== JSON.stringify(originalData)

  useEffect(() => {
    const id = localStorage.getItem("kr_id")
    const role = localStorage.getItem("user_role")

    if (!id || !role) {
      localStorage.clear()
      router.replace("/login")
    } else {
      fetchUserProfile(id)
    }
  }, [router])

  // Fetch Profile & Master Data
  const fetchUserProfile = async (userId) => {
    try {
      setLoading(true)
      const [userRes, yearsRes, typesRes] = await Promise.all([
        supabase
          .from('users')
          .select('*, role:user_role_id(role_name)')
          .eq('user_id', userId)
          .single(),
        supabase
          .from('year')
          .select('*')
          .order('start_date', { ascending: false }),
        supabase
          .from('leave_types')
          .select('*')
          .order('sort_order', { ascending: true })
      ])

      if (userRes.error) throw userRes.error
      const uData = userRes.data

      // Load unit if available
      let unitData = null
      if (uData?.user_unit_id) {
        const { data: u } = await supabase
          .from('unit')
          .select('unit_id, unit_name')
          .eq('unit_id', uData.user_unit_id)
          .single()
        unitData = u
      }

      const combinedData = { ...uData, unit: unitData }
      setUserData(combinedData)

      // Sync DB theme preference to UI
      if (combinedData.user_theme) {
        setTheme(combinedData.user_theme)
      }

      const initialFormData = {
        user_nama_depan: combinedData.user_nama_depan || '',
        user_nama_belakang: combinedData.user_nama_belakang || '',
        user_phone: combinedData.user_phone || '',
        user_bio: combinedData.user_bio || '',
        user_birth_date: combinedData.user_birth_date || '',
        user_address: combinedData.user_address || ''
      }
      setFormData(initialFormData)
      setOriginalData(initialFormData)

      // Set Academic Years & Pick Current Active Year
      if (yearsRes.data && yearsRes.data.length > 0) {
        setYears(yearsRes.data)
        const todayStr = new Date().toISOString().split('T')[0]
        const activeY = yearsRes.data.find(y => 
          y.start_date && y.end_date && todayStr >= y.start_date && todayStr <= y.end_date
        ) || yearsRes.data[0]

        if (activeY) {
          setSelectedYearId(activeY.year_id)
          await fetchLeaveData(userId, activeY.year_id, activeY, typesRes.data || [])
        }
      }

      if (typesRes.data) {
        setLeaveTypes(typesRes.data)
      }

    } catch (err) {
      console.error('Error fetching user profile:', err)
      setError(`${t('profile.validation.fetchFailedPrefix') || 'Failed to load user profile:'} ${err.message || 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  // Fetch Leave Quotas & Attendance Excuses for Selected Academic Year
  const fetchLeaveData = async (userId, yearId, yearObj, allTypes = leaveTypes) => {
    try {
      setLoadingLeave(true)
      // 1. Fetch Leave Quotas from API
      const quotaRes = await fetch(`/api/attendance/leave-quotas?user_id=${userId}&year_id=${yearId}`)
      const quotaJson = await quotaRes.json()

      if (quotaJson.success && quotaJson.data) {
        setLeaveQuotas(quotaJson.data)
      } else {
        setLeaveQuotas([])
      }

      // 2. Fetch User's Excuses/Leave Submissions in this Year Range
      if (yearObj?.start_date && yearObj?.end_date) {
        const { data: excuses } = await supabase
          .from('attendance_excuses')
          .select('*')
          .eq('user_id', userId)
          .gte('attendance_date', yearObj.start_date)
          .lte('attendance_date', yearObj.end_date)
          .order('attendance_date', { ascending: false })

        setUserExcuses(excuses || [])
      } else {
        setUserExcuses([])
      }
    } catch (err) {
      console.error('Error fetching leave quotas:', err)
    } finally {
      setLoadingLeave(false)
    }
  }

  // Handle Academic Year Change
  const handleYearChange = (newYearId) => {
    const yId = parseInt(newYearId)
    setSelectedYearId(yId)
    const targetY = years.find(y => y.year_id === yId)
    if (userData?.user_id && targetY) {
      fetchLeaveData(userData.user_id, yId, targetY)
    }
  }

  // Form Controls
  const handleEdit = () => {
    setEditing(true)
    setError('')
    setSaveSuccess(false)
  }

  const handleCancel = () => {
    setEditing(false)
    setFormData(originalData)
    setError('')
  }

  const handleSave = async () => {
    if (!formData.user_nama_depan || !formData.user_nama_belakang) {
      setError(t('profile.validation.nameRequired') || 'First and Last name are required.')
      return false
    }

    setUpdating(true)
    setError('')

    try {
      const { error } = await supabase
        .from('users')
        .update({
          user_nama_depan: formData.user_nama_depan,
          user_nama_belakang: formData.user_nama_belakang,
          user_phone: formData.user_phone,
          user_bio: formData.user_bio,
          user_birth_date: formData.user_birth_date || null,
          user_address: formData.user_address
        })
        .eq('user_id', userData.user_id)

      if (error) throw error

      await fetchUserProfile(userData.user_id)
      setEditing(false)
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
      return true
    } catch (err) {
      console.error('Error updating profile:', err)
      setError(t('profile.validation.saveFailed') || 'Failed to update profile.')
      return false
    } finally {
      setUpdating(false)
    }
  }

  const handleThemeToggle = async (newMode) => {
    setTheme(newMode)
    setUserData(prev => ({ ...prev, user_theme: newMode }))
    try {
      await supabase
        .from('users')
        .update({ user_theme: newMode })
        .eq('user_id', userData.user_id)
    } catch (err) {
      console.error('Failed to save theme preference:', err)
    }
  }

  // Handle keyboard shortcuts globally
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!editing) return
      
      if (e.key === 'Escape') {
        e.preventDefault()
        handleCancel()
      }
      
      if (e.key === 'Enter' && !e.shiftKey && e.target.tagName !== 'TEXTAREA') {
        e.preventDefault()
        if (hasChanges && !updating) handleSave()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [editing, hasChanges, updating])

  const formatDate = (dateStr) => {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleDateString(
      lang === 'en' ? 'en-US' : lang === 'zh' ? 'zh-CN' : 'id-ID',
      { year: 'numeric', month: 'short', day: 'numeric' }
    )
  }

  // Leave Quotas Computation & Deduplication (Individual quota overrides Global template)
  const resolvedQuotas = useMemo(() => {
    const map = new Map()

    // 1. Insert global quotas first (only if total_days > 0, e.g. incidental_leave)
    leaveQuotas
      .filter(q => q.is_global && (q.total_days || 0) > 0)
      .forEach(q => {
        map.set(q.leave_type_code, {
          ...q,
          name: q.leave_type?.name_id || q.leave_type_code,
          nameEn: q.leave_type?.name_en || q.leave_type_code,
          remaining: Math.max(0, (q.total_days || 0) - (q.used_days || 0)),
          isPersonal: false
        })
      })

    // 2. Overwrite with individual user quotas (e.g. annual_leave for operational staff)
    leaveQuotas
      .filter(q => !q.is_global && (q.total_days || 0) > 0)
      .forEach(q => {
        map.set(q.leave_type_code, {
          ...q,
          name: q.leave_type?.name_id || q.leave_type_code,
          nameEn: q.leave_type?.name_en || q.leave_type_code,
          remaining: Math.max(0, (q.total_days || 0) - (q.used_days || 0)),
          isPersonal: true
        })
      })

    return Array.from(map.values())
  }, [leaveQuotas])

  // Extract primary Annual Leave and Incidental Leave metrics
  const annualQuota = resolvedQuotas.find(q => q.leave_type_code === 'annual_leave')
  const hasAnnualLeave = Boolean(annualQuota && (annualQuota.total_days || 0) > 0)
  const incidentalQuota = resolvedQuotas.find(q => q.leave_type_code === 'incidental_leave')

  // Selected Academic Year Object
  const currentYearObj = years.find(y => y.year_id === selectedYearId) || years[0]

  // Map of leave types by code for quick lookup in excuses table
  const leaveTypeMap = useMemo(() => {
    const map = new Map()
    leaveTypes.forEach(t => map.set(t.code, t))
    return map
  }, [leaveTypes])

  if (loading) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center" 
        style={{ background: pageBg, color: textSecondary, fontFamily: "'Geist Sans', 'SF Pro Display', system-ui, -apple-system, sans-serif" }}
      >
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: isDark ? '#60A5FA' : '#0284C7', borderTopColor: 'transparent' }} />
          <span className="text-xs font-mono uppercase tracking-widest">LOADING PROFILE &amp; LEAVE DATA...</span>
        </div>
      </div>
    )
  }

  if (!userData) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center p-4" 
        style={{ background: pageBg, color: textPrimary, fontFamily: "'Geist Sans', 'SF Pro Display', system-ui, -apple-system, sans-serif" }}
      >
        <div className="text-center p-8 border rounded-lg max-w-sm" style={{ borderColor, background: cardBg }}>
          <FontAwesomeIcon icon={faExclamationTriangle} className="text-3xl text-amber-500 mb-3" />
          <p className="text-sm font-semibold mb-2">{t('profile.loadError') || 'Gagal memuat profil pengguna'}</p>
          <p className="text-xs mb-4" style={{ color: textSecondary }}>Silakan login ulang atau periksa sesi akun Anda.</p>
          <Button 
            onClick={() => window.location.reload()} 
            style={{ background: textPrimary, color: isDark ? '#111111' : '#FFFFFF', borderRadius: '4px', fontSize: '12px' }}
          >
            Muat Ulang Halaman
          </Button>
        </div>
      </div>
    )
  }

  const fullName = `${userData.user_nama_depan || ''} ${userData.user_nama_belakang || ''}`.trim()
  const initials = ((userData.user_nama_depan?.[0] || '') + (userData.user_nama_belakang?.[0] || 'U')).toUpperCase()

  return (
    <div 
      style={{ 
        background: pageBg, 
        minHeight: '100vh', 
        padding: '24px 32px', 
        color: textPrimary, 
        fontFamily: "'Geist Sans', 'SF Pro Display', system-ui, -apple-system, sans-serif" 
      }}
    >
      {/* Toast Notification */}
      {saveSuccess && (
        <div className="fixed top-6 right-6 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          <div 
            className="px-4 py-2.5 rounded text-xs font-semibold flex items-center gap-2 shadow-lg"
            style={{ 
              background: isDark ? '#1E2E1E' : '#EDF3EC', 
              color: isDark ? '#7BAF7B' : '#346538', 
              border: `1px solid ${borderColor}` 
            }}
          >
            <FontAwesomeIcon icon={faCheck} className="w-3.5 h-3.5" />
            <span>Perubahan profil berhasil disimpan.</span>
          </div>
        </div>
      )}

      {/* ── HEADER & BREADCRUMBS (MATCHING /data/pyp LAYOUT) ─────────── */}
      <div className="pb-5 border-b flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6" style={{ borderColor }}>
        <div>
          <div className="flex items-center gap-2 text-[10px] font-mono tracking-wider uppercase mb-1.5" style={{ color: textSecondary }}>
            <span>[AKUN SAYA]</span>
            <span>/</span>
            <span>[PENGATURAN]</span>
            <span>/</span>
            <span className="font-semibold" style={{ color: isDark ? '#60A5FA' : '#0284C7' }}>[PROFIL &amp; SISA CUTI]</span>
          </div>
          <div className="flex items-center gap-3">
            <div 
              className="w-9 h-9 rounded flex items-center justify-center border" 
              style={{ 
                background: isDark ? 'rgba(59, 130, 246, 0.15)' : '#E1F3FE', 
                borderColor: isDark ? '#2563EB' : '#BAE6FD', 
                color: isDark ? '#60A5FA' : '#0284C7' 
              }}
            >
              <FontAwesomeIcon icon={faUser} className="text-base" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight" style={{ color: textPrimary, letterSpacing: '-0.02em', margin: 0 }}>
                User Profile &amp; Leave Quotas
              </h1>
              <p className="text-xs" style={{ color: textSecondary, margin: '2px 0 0 0' }}>
                Informasi identitas akun, hak alokasi cuti tahunan, preferensi tema, dan riwayat absensi.
              </p>
            </div>
          </div>
        </div>

        {/* Top Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {!editing ? (
            <button
              onClick={handleEdit}
              className="px-3.5 py-1.5 text-xs font-semibold rounded transition-all active:scale-[0.98] flex items-center gap-1.5 cursor-pointer"
              style={{ 
                background: textPrimary, 
                color: isDark ? '#111111' : '#FFFFFF',
                borderRadius: '6px'
              }}
            >
              <FontAwesomeIcon icon={faEdit} className="text-xs" />
              <span>Edit Profile</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-amber-600 dark:text-amber-400 mr-2 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                EDITING MODE
              </span>
              <button
                onClick={handleCancel}
                disabled={updating}
                className="px-3 py-1.5 text-xs font-medium rounded border transition-colors cursor-pointer"
                style={{ borderColor, background: cardBg, color: textPrimary, borderRadius: '6px' }}
              >
                Batal
              </button>
              <button
                onClick={handleSave}
                disabled={updating || !hasChanges}
                className="px-3.5 py-1.5 text-xs font-semibold rounded transition-all active:scale-[0.98] flex items-center gap-1.5 cursor-pointer"
                style={hasChanges ? {
                  background: textPrimary,
                  color: isDark ? '#111111' : '#FFFFFF',
                  borderRadius: '6px'
                } : {
                  background: isDark ? '#27272A' : '#EAEAEA',
                  color: textSecondary,
                  borderRadius: '6px',
                  cursor: 'not-allowed'
                }}
              >
                <FontAwesomeIcon icon={faSave} className="text-xs" />
                <span>{updating ? 'Menyimpan...' : 'Simpan'}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── ACADEMIC YEAR FILTER BAR (MATCHING /data/pyp) ── */}
      <div className="p-3.5 rounded border mb-6" style={{ background: cardBg, borderColor, borderRadius: '8px' }}>
        <div style={{ maxWidth: '280px' }}>
          <label className="text-[10px] font-mono uppercase block mb-1 font-bold" style={{ color: isDark ? '#60A5FA' : '#0284C7' }}>
            1. Academic Year *
          </label>
          <select
            value={selectedYearId || ''}
            onChange={e => handleYearChange(e.target.value)}
            className="w-full px-2.5 py-1.5 text-xs font-mono rounded border outline-none cursor-pointer font-bold"
            style={{ background: isDark ? '#18181B' : '#FFFFFF', borderColor, color: textPrimary, borderRadius: '4px' }}
          >
            {years.map(y => (
              <option key={y.year_id} value={y.year_id}>
                {y.year_name} ({formatDate(y.start_date)} - {formatDate(y.end_date)})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ── TABS NAVIGATION (MATCHING /data/pyp UNDERLINE TABS) ─────────── */}
      <div style={{ display: 'flex', borderBottom: `1px solid ${borderColor}`, marginBottom: '24px', gap: '24px', flexWrap: 'wrap' }}>
        
        {/* TAB 1: Profile & Preferences */}
        <button
          onClick={() => setActiveTab('overview')}
          style={{
            padding: '12px 0',
            fontSize: '14px',
            fontWeight: activeTab === 'overview' ? 600 : 400,
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            color: activeTab === 'overview' ? textPrimary : textSecondary,
            borderBottom: activeTab === 'overview' ? `2px solid ${textPrimary}` : '2px solid transparent',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.15s ease'
          }}
        >
          <FontAwesomeIcon icon={faIdBadge} style={{ fontSize: '13px' }} />
          Profil &amp; Pengaturan Akun
        </button>

        {/* TAB 2: Leave Quotas & Balances */}
        <button
          onClick={() => setActiveTab('leave')}
          style={{
            padding: '12px 0',
            fontSize: '14px',
            fontWeight: activeTab === 'leave' ? 600 : 400,
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            color: activeTab === 'leave' ? textPrimary : textSecondary,
            borderBottom: activeTab === 'leave' ? `2px solid ${textPrimary}` : '2px solid transparent',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.15s ease'
          }}
        >
          <FontAwesomeIcon icon={faCalendarCheck} style={{ fontSize: '13px' }} />
          <span>Informasi &amp; Sisa Cuti</span>
          <span 
            className="px-1.5 py-0.5 text-[10px] font-mono rounded font-bold"
            style={{
              background: isDark ? 'rgba(59, 130, 246, 0.2)' : '#E1F3FE',
              color: isDark ? '#60A5FA' : '#0284C7'
            }}
          >
            {hasAnnualLeave 
              ? `${annualQuota.remaining} Hari Cuti` 
              : `${incidentalQuota ? incidentalQuota.remaining : 2} Hari Insidental`}
          </span>
        </button>

      </div>

      {/* Error Alert */}
      {error && (
        <div 
          className="mb-6 p-4 rounded text-xs font-medium border"
          style={{ 
            background: isDark ? '#3A1E1E' : '#FDEBEC', 
            color: isDark ? '#DC8585' : '#9F2F2D', 
            borderColor 
          }}
        >
          {error}
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* TAB 1: OVERVIEW & PERSONAL CONTACT DETAILS                    */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          
          {/* Bento Card: Identity Banner */}
          <div 
            className="p-6 rounded border transition-all"
            style={{ 
              background: cardBg, 
              borderColor,
              borderRadius: '8px'
            }}
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
              <div className="flex items-center gap-5">
                {/* Avatar Frame */}
                <div className="relative">
                  {userData.user_profile_picture ? (
                    <img
                      src={userData.user_profile_picture}
                      alt={fullName}
                      className="w-16 h-16 rounded-lg object-cover border"
                      style={{ borderColor }}
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div 
                      className="w-16 h-16 rounded-lg border flex items-center justify-center font-bold text-lg font-mono"
                      style={{ background: isDark ? '#27272A' : '#F3F4F6', borderColor, color: textPrimary }}
                    >
                      {initials}
                    </div>
                  )}
                  {/* Google SSO Indicator */}
                  <div 
                    className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-white border flex items-center justify-center shadow-sm"
                    style={{ borderColor }}
                    title="Google Workspace SSO Terverifikasi"
                  >
                    <GoogleIcon className="w-3 h-3" />
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h2 className="text-lg font-bold" style={{ color: textPrimary, letterSpacing: '-0.01em', margin: 0 }}>
                      {fullName || 'No Name Provided'}
                    </h2>
                    {/* Role Pill */}
                    <span 
                      className="text-[11px] font-mono px-2.5 py-0.5 rounded-full font-semibold uppercase tracking-wider"
                      style={{ 
                        background: isDark ? 'rgba(59, 130, 246, 0.2)' : '#E1F3FE', 
                        color: isDark ? '#60A5FA' : '#0284C7' 
                      }}
                    >
                      {userData.role?.role_name || 'Staff User'}
                    </span>
                    {/* Unit Pill */}
                    {userData.unit?.unit_name && (
                      <span 
                        className="text-[11px] font-mono px-2.5 py-0.5 rounded-full font-semibold uppercase tracking-wider"
                        style={{ 
                          background: isDark ? '#1F2937' : '#F3F4F6', 
                          color: textSecondary 
                        }}
                      >
                        {userData.unit.unit_name}
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-mono mt-1" style={{ color: textSecondary }}>
                    {userData.user_email || '—'}
                  </p>
                </div>
              </div>

              {/* Quick Metadata Pill */}
              <div className="flex items-center gap-4 text-xs font-mono" style={{ color: textSecondary }}>
                <div>
                  <span className="block text-[10px] uppercase tracking-wider">User ID</span>
                  <span className="font-semibold text-xs" style={{ color: textPrimary }}>#{userData.user_id}</span>
                </div>
                {userData.user_pin && (
                  <>
                    <div className="h-6 w-[1px]" style={{ background: borderColor }} />
                    <div>
                      <span className="block text-[10px] uppercase tracking-wider">PIN Mesin</span>
                      <span className="font-semibold text-xs" style={{ color: textPrimary }}>PIN {userData.user_pin}</span>
                    </div>
                  </>
                )}
                <div className="h-6 w-[1px]" style={{ background: borderColor }} />
                <div>
                  <span className="block text-[10px] uppercase tracking-wider">Status Akun</span>
                  <span className="font-semibold text-xs text-emerald-600 dark:text-emerald-400">ACTIVE</span>
                </div>
              </div>
            </div>
          </div>

          {/* Grid: Personal Details & Address */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            
            {/* Bento Card: Personal Details (Span 7) */}
            <div 
              className="md:col-span-7 p-6 rounded border space-y-5"
              style={{ 
                background: cardBg, 
                borderColor,
                borderRadius: '8px'
              }}
            >
              <div className="flex items-center justify-between border-b pb-3" style={{ borderColor }}>
                <h3 className="text-xs font-bold uppercase tracking-wider font-mono" style={{ color: textPrimary, margin: 0 }}>
                  01. Personal Details
                </h3>
                {editing && (
                  <span className="text-[10px] font-mono" style={{ color: textSecondary }}>
                    Tekan <kbd className="px-1 py-0.5 border rounded bg-zinc-100 dark:bg-zinc-800 font-mono text-[10px]">Enter</kbd> untuk simpan
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* First Name */}
                <div>
                  <Label className="text-[11px] font-mono uppercase tracking-wider block mb-1.5" style={{ color: textSecondary }}>
                    Nama Depan *
                  </Label>
                  {editing ? (
                    <Input
                      value={formData.user_nama_depan}
                      onChange={(e) => setFormData(prev => ({ ...prev, user_nama_depan: e.target.value }))}
                      className="text-xs font-medium"
                      style={inputStyle}
                    />
                  ) : (
                    <p className="text-sm font-semibold py-1" style={{ color: textPrimary }}>
                      {userData.user_nama_depan || '—'}
                    </p>
                  )}
                </div>

                {/* Last Name */}
                <div>
                  <Label className="text-[11px] font-mono uppercase tracking-wider block mb-1.5" style={{ color: textSecondary }}>
                    Nama Belakang *
                  </Label>
                  {editing ? (
                    <Input
                      value={formData.user_nama_belakang}
                      onChange={(e) => setFormData(prev => ({ ...prev, user_nama_belakang: e.target.value }))}
                      className="text-xs font-medium"
                      style={inputStyle}
                    />
                  ) : (
                    <p className="text-sm font-semibold py-1" style={{ color: textPrimary }}>
                      {userData.user_nama_belakang || '—'}
                    </p>
                  )}
                </div>

                {/* Phone */}
                <div>
                  <Label className="text-[11px] font-mono uppercase tracking-wider block mb-1.5" style={{ color: textSecondary }}>
                    Nomor WhatsApp / Telepon
                  </Label>
                  {editing ? (
                    <Input
                      type="tel"
                      value={formData.user_phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, user_phone: e.target.value }))}
                      className="text-xs font-medium font-mono"
                      style={inputStyle}
                    />
                  ) : (
                    <p className="text-sm font-mono py-1" style={{ color: textPrimary }}>
                      {userData.user_phone || '—'}
                    </p>
                  )}
                </div>

                {/* Birth Date */}
                <div>
                  <Label className="text-[11px] font-mono uppercase tracking-wider block mb-1.5" style={{ color: textSecondary }}>
                    Tanggal Lahir
                  </Label>
                  {editing ? (
                    <Input
                      type="date"
                      value={formData.user_birth_date}
                      onChange={(e) => setFormData(prev => ({ ...prev, user_birth_date: e.target.value }))}
                      className="text-xs font-medium font-mono"
                      style={inputStyle}
                    />
                  ) : (
                    <p className="text-sm font-mono py-1" style={{ color: textPrimary }}>
                      {formatDate(userData.user_birth_date)}
                    </p>
                  )}
                </div>
              </div>

              {/* Bio Field */}
              <div className="pt-2 border-t" style={{ borderColor }}>
                <Label className="text-[11px] font-mono uppercase tracking-wider block mb-1.5" style={{ color: textSecondary }}>
                  Biografi Profesional / Peran
                </Label>
                {editing ? (
                  <textarea
                    rows="3"
                    value={formData.user_bio}
                    onChange={(e) => setFormData(prev => ({ ...prev, user_bio: e.target.value }))}
                    className="w-full p-2.5 text-xs font-normal rounded outline-none resize-none transition-colors"
                    style={{ 
                      background: inputStyle.background, 
                      border: `1px solid ${borderColor}`, 
                      color: textPrimary,
                      borderRadius: '6px',
                      lineHeight: '1.6'
                    }}
                    placeholder="Tuliskan ringkasan peran atau deskripsi tanggung jawab akademik..."
                  />
                ) : (
                  <p className="text-xs leading-relaxed" style={{ color: userData.user_bio ? textPrimary : textSecondary }}>
                    {userData.user_bio || <span className="italic">Belum ada keterangan biografi tersimpan.</span>}
                  </p>
                )}
              </div>
            </div>

            {/* Bento Card: Address & Leave Glance (Span 5) */}
            <div className="md:col-span-5 space-y-6">
              
              {/* Address Card */}
              <div 
                className="p-6 rounded border space-y-4"
                style={{ 
                  background: cardBg, 
                  borderColor,
                  borderRadius: '8px'
                }}
              >
                <div className="flex items-center justify-between border-b pb-3" style={{ borderColor }}>
                  <h3 className="text-xs font-bold uppercase tracking-wider font-mono" style={{ color: textPrimary, margin: 0 }}>
                    02. Alamat Domisili
                  </h3>
                  <FontAwesomeIcon icon={faMapMarkerAlt} className="text-xs" style={{ color: textSecondary }} />
                </div>

                {editing ? (
                  <textarea
                    rows="3"
                    value={formData.user_address}
                    onChange={(e) => setFormData(prev => ({ ...prev, user_address: e.target.value }))}
                    className="w-full p-2.5 text-xs font-normal rounded outline-none resize-none"
                    style={{ background: inputStyle.background, border: `1px solid ${borderColor}`, color: textPrimary, borderRadius: '6px' }}
                    placeholder="Jalan, RT/RW, Kelurahan, Kecamatan, Kota, Kode Pos..."
                  />
                ) : (
                  <p className="text-xs leading-relaxed" style={{ color: userData.user_address ? textPrimary : textSecondary }}>
                    {userData.user_address || <span className="italic">Belum ada data alamat tercatat.</span>}
                  </p>
                )}
              </div>

              {/* Interface Theme Card */}
              <div 
                className="p-6 rounded border space-y-4"
                style={{ 
                  background: cardBg, 
                  borderColor,
                  borderRadius: '8px'
                }}
              >
                <div className="flex items-center justify-between border-b pb-3" style={{ borderColor }}>
                  <h3 className="text-xs font-bold uppercase tracking-wider font-mono" style={{ color: textPrimary, margin: 0 }}>
                    03. Mode Tampilan
                  </h3>
                  <FontAwesomeIcon icon={faPalette} className="text-xs" style={{ color: textSecondary }} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* Light Theme Button */}
                  <button
                    type="button"
                    onClick={() => handleThemeToggle('light')}
                    className="p-3.5 rounded border text-left transition-all cursor-pointer flex flex-col justify-between h-20"
                    style={{
                      background: !isDark ? '#F7F6F3' : 'transparent',
                      borderColor: !isDark ? textPrimary : borderColor,
                      borderRadius: '6px'
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <FontAwesomeIcon icon={faSun} className="text-xs" style={{ color: !isDark ? textPrimary : textSecondary }} />
                      {!isDark && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
                    </div>
                    <div>
                      <span className="text-xs font-bold block" style={{ color: textPrimary }}>Warm Light</span>
                      <span className="text-[10px] font-mono" style={{ color: textSecondary }}>Mode Terang</span>
                    </div>
                  </button>

                  {/* Dark Theme Button */}
                  <button
                    type="button"
                    onClick={() => handleThemeToggle('dark')}
                    className="p-3.5 rounded border text-left transition-all cursor-pointer flex flex-col justify-between h-20"
                    style={{
                      background: isDark ? '#232228' : 'transparent',
                      borderColor: isDark ? textPrimary : borderColor,
                      borderRadius: '6px'
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <FontAwesomeIcon icon={faMoon} className="text-xs" style={{ color: isDark ? textPrimary : textSecondary }} />
                      {isDark && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
                    </div>
                    <div>
                      <span className="text-xs font-bold block" style={{ color: textPrimary }}>Obsidian Dark</span>
                      <span className="text-[10px] font-mono" style={{ color: textSecondary }}>Mode Gelap</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Account Security & Timestamps Card */}
              <div 
                className="p-6 rounded border space-y-4"
                style={{ 
                  background: cardBg, 
                  borderColor,
                  borderRadius: '8px'
                }}
              >
                <div className="flex items-center justify-between border-b pb-3" style={{ borderColor }}>
                  <h3 className="text-xs font-bold uppercase tracking-wider font-mono" style={{ color: textPrimary, margin: 0 }}>
                    04. Informasi Akun
                  </h3>
                  <FontAwesomeIcon icon={faShieldAlt} className="text-xs" style={{ color: textSecondary }} />
                </div>

                <div className="grid grid-cols-2 gap-3 font-mono text-xs">
                  <div className="p-2.5 rounded border" style={{ background: isDark ? '#1F2937' : '#F9FAFB', borderColor }}>
                    <span className="text-[10px] uppercase tracking-wider block mb-1" style={{ color: textSecondary }}>Akun Dibuat</span>
                    <p className="font-semibold text-xs" style={{ color: textPrimary, margin: 0 }}>{formatDate(userData.user_created_at)}</p>
                  </div>

                  <div className="p-2.5 rounded border" style={{ background: isDark ? '#1F2937' : '#F9FAFB', borderColor }}>
                    <span className="text-[10px] uppercase tracking-wider block mb-1" style={{ color: textSecondary }}>Diperbarui</span>
                    <p className="font-semibold text-xs" style={{ color: textPrimary, margin: 0 }}>{formatDate(userData.user_updated_at)}</p>
                  </div>

                  <div className="p-2.5 rounded border" style={{ background: isDark ? '#1F2937' : '#F9FAFB', borderColor }}>
                    <span className="text-[10px] uppercase tracking-wider block mb-1" style={{ color: textSecondary }}>Metode Masuk</span>
                    <p className="font-semibold text-xs text-emerald-600 dark:text-emerald-400" style={{ margin: 0 }}>Google SSO</p>
                  </div>

                  <div className="p-2.5 rounded border" style={{ background: isDark ? '#1F2937' : '#F9FAFB', borderColor }}>
                    <span className="text-[10px] uppercase tracking-wider block mb-1" style={{ color: textSecondary }}>Peran Akun</span>
                    <p className="font-semibold text-xs" style={{ color: textPrimary, margin: 0 }}>{userData.role?.role_name || 'Staff'}</p>
                  </div>
                </div>
              </div>

            </div>

          </div>

        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* TAB 2: LEAVE QUOTA & BALANCES (SISA CUTI)                     */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === 'leave' && (
        <div className="space-y-6">
          
          {/* Section Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b" style={{ borderColor }}>
            <div>
              <h2 className="text-base font-bold tracking-tight" style={{ color: textPrimary, margin: 0 }}>
                Alokasi Kuota &amp; Sisa Cuti
              </h2>
              <p className="text-xs mt-0.5" style={{ color: textSecondary }}>
                Rincian jatah dan sisa hak cuti Anda untuk Tahun Ajaran <strong>{currentYearObj?.year_name}</strong>.
              </p>
            </div>
          </div>

          {/* Bento Quota Cards Grid */}
          {resolvedQuotas.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {resolvedQuotas.map((quota) => {
                const total = quota.total_days || 0
                const used = quota.used_days || 0
                const remaining = quota.remaining
                const percentUsed = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0

                const isLow = remaining <= 2 && remaining > 0
                const isDepleted = remaining === 0

                return (
                  <div 
                    key={quota.leave_type_code}
                    className="p-5 rounded border flex flex-col justify-between"
                    style={{ 
                      background: cardBg, 
                      borderColor,
                      borderRadius: '8px'
                    }}
                  >
                    <div>
                      {/* Card Header */}
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div>
                          <h3 className="text-sm font-bold tracking-tight mt-0.5" style={{ color: textPrimary, margin: 0 }}>
                            {quota.name}
                          </h3>
                          {quota.nameEn && quota.nameEn !== quota.name && (
                            <p className="text-[11px] italic" style={{ color: textSecondary, margin: 0 }}>
                              {quota.nameEn}
                            </p>
                          )}
                        </div>
                        
                        <div 
                          className="w-8 h-8 rounded flex items-center justify-center border shrink-0"
                          style={{ 
                            background: isDark ? 'rgba(59, 130, 246, 0.1)' : '#E1F3FE', 
                            borderColor: isDark ? '#2563EB' : '#BAE6FD', 
                            color: isDark ? '#60A5FA' : '#0284C7' 
                          }}
                        >
                          <FontAwesomeIcon icon={quota.leave_type_code === 'annual_leave' ? faSuitcase : faClock} className="text-xs" />
                        </div>
                      </div>

                      {/* Big Metric Display */}
                      <div className="my-4">
                        <div className="flex items-baseline gap-2">
                          <span 
                            className="text-4xl font-extrabold font-mono tracking-tight"
                            style={{
                              color: isDepleted 
                                ? (isDark ? '#F87171' : '#DC2626') 
                                : isLow 
                                  ? (isDark ? '#FBBF24' : '#D97706') 
                                  : (isDark ? '#34D399' : '#059669')
                            }}
                          >
                            {remaining}
                          </span>
                          <span className="text-xs font-mono font-semibold" style={{ color: textSecondary }}>
                            Hari Tersisa
                          </span>
                        </div>
                        <p className="text-[11px] font-mono mt-1" style={{ color: textSecondary }}>
                          Dari total jatah {total} hari ({used} hari telah terpakai)
                        </p>
                      </div>

                      {/* Progress Bar */}
                      <div className="space-y-1.5 my-3">
                        <div className="flex items-center justify-between text-[10px] font-mono" style={{ color: textSecondary }}>
                          <span>Terpakai: {percentUsed}%</span>
                          <span>Sisa: {100 - percentUsed}%</span>
                        </div>
                        <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: isDark ? '#27272A' : '#E5E7EB' }}>
                          <div 
                            className="h-full rounded-full transition-all duration-300"
                            style={{ 
                              width: `${percentUsed}%`,
                              background: isDepleted 
                                ? '#EF4444' 
                                : isLow 
                                  ? '#F59E0B' 
                                  : isDark ? '#10B981' : '#059669'
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Footer Tag */}
                    <div className="pt-3 border-t mt-2 flex items-center justify-between text-[11px] font-mono" style={{ borderColor }}>
                      <span style={{ color: textSecondary }}>Tahun Ajaran:</span>
                      <span className="font-semibold" style={{ color: textPrimary }}>{currentYearObj?.year_name}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div 
              className="p-6 rounded border text-center"
              style={{ background: cardBg, borderColor, borderRadius: '8px', color: textSecondary }}
            >
              <FontAwesomeIcon icon={faCalendarAlt} className="text-2xl mb-2 opacity-50" />
              <p className="text-xs font-medium">Tidak ada alokasi kuota cuti pada tahun ajaran ini.</p>
            </div>
          )}

          {/* User's Leave Requests History Table */}
          <div 
            className="p-5 rounded border"
            style={{ 
              background: cardBg, 
              borderColor,
              borderRadius: '8px'
            }}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3 mb-4" style={{ borderColor }}>
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider font-mono" style={{ color: textPrimary, margin: 0 }}>
                  Riwayat Pengajuan Cuti &amp; Izin Saya ({userExcuses.length})
                </h3>
                <p className="text-[11px] mt-0.5" style={{ color: textSecondary }}>
                  Daftar pengajuan ketidakhadiran, cuti tahunan, dan surat izin pada Tahun Ajaran {currentYearObj?.year_name}.
                </p>
              </div>
            </div>

            {loadingLeave ? (
              <div className="py-12 text-center text-xs font-mono" style={{ color: textSecondary }}>
                Memuat riwayat permohonan cuti...
              </div>
            ) : userExcuses.length === 0 ? (
              <div className="py-12 text-center" style={{ color: textSecondary }}>
                <FontAwesomeIcon icon={faHistory} className="text-2xl mb-2 opacity-50" />
                <p className="text-xs font-medium">Belum ada permohonan cuti atau izin yang tercatat pada tahun ajaran ini.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="border-b text-[10px] uppercase font-bold tracking-wider" style={{ borderColor, color: textSecondary }}>
                      <th className="py-2.5 px-3">Tanggal</th>
                      <th className="py-2.5 px-3">Jenis Permohonan</th>
                      <th className="py-2.5 px-3">Kategori</th>
                      <th className="py-2.5 px-3">Alasan / Catatan</th>
                      <th className="py-2.5 px-3">Bukti</th>
                      <th className="py-2.5 px-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y" style={{ borderColor }}>
                    {userExcuses.map((exc) => {
                      const lType = leaveTypeMap.get(exc.category)
                      const isDeduct = exc.category === 'annual_leave'

                      // Status badge styling
                      let statusBg = isDark ? '#27272A' : '#F3F4F6'
                      let statusText = textSecondary
                      let statusLabel = exc.status

                      if (exc.status === 'approved') {
                        statusBg = isDark ? '#1E2E1E' : '#EDF3EC'
                        statusText = isDark ? '#7BAF7B' : '#346538'
                        statusLabel = 'Disetujui Penuh'
                      } else if (exc.status === 'approved_1') {
                        statusBg = isDark ? 'rgba(59, 130, 246, 0.15)' : '#E1F3FE'
                        statusText = isDark ? '#60A5FA' : '#0284C7'
                        statusLabel = 'Disetujui Tahap 1'
                      } else if (exc.status === 'pending') {
                        statusBg = isDark ? '#2A2618' : '#FBF3DB'
                        statusText = isDark ? '#C4A24A' : '#956400'
                        statusLabel = 'Menunggu Persetujuan'
                      } else if (exc.status === 'rejected') {
                        statusBg = isDark ? '#3A1E1E' : '#FDEBEC'
                        statusText = isDark ? '#DC8585' : '#9F2F2D'
                        statusLabel = 'Ditolak'
                      }

                      return (
                        <tr key={exc.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/40 transition-colors">
                          <td className="py-3 px-3 font-bold whitespace-nowrap" style={{ color: textPrimary }}>
                            {formatDate(exc.attendance_date)}
                          </td>
                          <td className="py-3 px-3 uppercase text-[11px]" style={{ color: textSecondary }}>
                            {exc.excuse_type || 'absent'}
                          </td>
                          <td className="py-3 px-3">
                            <span className="font-semibold block" style={{ color: textPrimary }}>
                              {lType?.name_id || exc.category || '—'}
                            </span>
                            {isDeduct && (
                              <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">
                                • Memotong Kuota Tahunan
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 max-w-xs truncate" style={{ color: textSecondary }}>
                            {exc.other_reason || '—'}
                          </td>
                          <td className="py-3 px-3">
                            {exc.attachment_url ? (
                              <a
                                href={exc.attachment_url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] underline hover:opacity-80"
                                style={{ color: isDark ? '#60A5FA' : '#0284C7' }}
                              >
                                <FontAwesomeIcon icon={faPaperclip} className="text-[10px]" />
                                <span>Lihat File</span>
                              </a>
                            ) : (
                              <span style={{ color: textSecondary }}>—</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <span 
                              className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider inline-block"
                              style={{ background: statusBg, color: statusText }}
                            >
                              {statusLabel}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      )}

      {/* ── FLOATING ACTION BAR IN EDIT MODE ────────────────────────── */}
      {editing && (
        <div 
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded border shadow-2xl flex items-center gap-4 transition-all"
          style={{ 
            background: cardBg, 
            borderColor,
            borderRadius: '8px'
          }}
        >
          <div className="text-xs font-mono flex items-center gap-2">
            {hasChanges ? (
              <span className="text-amber-600 dark:text-amber-400 font-semibold">• Perubahan belum disimpan</span>
            ) : (
              <span style={{ color: textSecondary }}>Belum ada perubahan data</span>
            )}
          </div>

          <div className="h-4 w-[1px]" style={{ background: borderColor }} />

          <div className="flex items-center gap-2">
            <button
              onClick={handleCancel}
              disabled={updating}
              className="px-3 py-1.5 text-xs font-semibold rounded border transition-colors cursor-pointer"
              style={{ borderColor, background: isDark ? '#27272A' : '#F3F4F6', color: textPrimary, borderRadius: '4px' }}
            >
              Batal (<kbd className="font-mono text-[10px]">Esc</kbd>)
            </button>
            <button
              onClick={handleSave}
              disabled={updating || !hasChanges}
              className="px-4 py-1.5 text-xs font-semibold rounded transition-all active:scale-[0.98] cursor-pointer"
              style={hasChanges ? {
                background: textPrimary,
                color: isDark ? '#111111' : '#FFFFFF',
                borderRadius: '4px'
              } : {
                background: isDark ? '#27272A' : '#EAEAEA',
                color: textSecondary,
                borderRadius: '4px',
                cursor: 'not-allowed'
              }}
            >
              {updating ? 'Menyimpan...' : 'Simpan Profil'}
            </button>
          </div>
        </div>
      )}

    </div>
  )
}
