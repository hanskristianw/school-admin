"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { 
  faUser, faEdit, faSave, faTimes, faEnvelope, faPhone, 
  faCalendar, faMapMarkerAlt, faIdBadge, faShieldAlt, faClock, faCheck,
  faSun, faMoon, faPalette, faArrowLeft, faCheckCircle
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
  const [loading, setLoading] = useState(true)
  const [userData, setUserData] = useState(null)
  const [editing, setEditing] = useState(false)
  const [formData, setFormData] = useState({})
  const [originalData, setOriginalData] = useState({})
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState('')
  const [saveSuccess, setSaveSuccess] = useState(false)

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

  const fetchUserProfile = async (userId) => {
    try {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (userError) throw userError

      let roleData = null
      if (userData.user_role_id) {
        const { data: role, error: roleError } = await supabase
          .from('role')
          .select('role_name')
          .eq('role_id', userData.user_role_id)
          .single()

        if (!roleError) roleData = role
      }

      const combinedData = { ...userData, role: roleData }
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
    } catch (error) {
      console.error('Error fetching user profile:', error)
      setError(`${t('profile.validation.fetchFailedPrefix')} ${error.message || 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

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
    } catch (error) {
      console.error('Error updating profile:', error)
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

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center" style={{ background: theme.pageBg }}>
        <div className="text-center font-mono text-xs tracking-wider" style={{ color: theme.textSecondary }}>
          LOADING PROFILE...
        </div>
      </div>
    )
  }

  if (!userData) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center" style={{ background: theme.pageBg }}>
        <div className="text-center p-8 border rounded-lg max-w-sm" style={{ borderColor: theme.border, background: theme.cardBg }}>
          <p className="text-sm font-medium mb-3" style={{ color: theme.redText }}>{t('profile.loadError') || 'Failed to load profile'}</p>
          <Button onClick={() => window.location.reload()} style={{ background: theme.textPrimary, color: theme.cardBg, borderRadius: '4px', fontSize: '12px' }}>
            Reload Page
          </Button>
        </div>
      </div>
    )
  }

  const fullName = `${userData.user_nama_depan || ''} ${userData.user_nama_belakang || ''}`.trim()
  const initials = ((userData.user_nama_depan?.[0] || '') + (userData.user_nama_belakang?.[0] || 'U')).toUpperCase()

  return (
    <div 
      className="min-h-full py-8 px-4 sm:px-8 max-w-5xl mx-auto" 
      style={{ 
        fontFamily: "'SF Pro Display', 'Geist Sans', 'Helvetica Neue', sans-serif",
        color: theme.textBody 
      }}
    >
      {/* Toast Notification */}
      {saveSuccess && (
        <div className="fixed top-6 right-6 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          <div 
            className="px-4 py-2.5 rounded text-xs font-semibold flex items-center gap-2"
            style={{ background: theme.greenBg, color: theme.greenText, border: `1px solid ${theme.border}` }}
          >
            <FontAwesomeIcon icon={faCheck} className="w-3.5 h-3.5" />
            <span>Profile changes saved successfully.</span>
          </div>
        </div>
      )}

      {/* Top Document Header */}
      <div className="border-b pb-6 mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4" style={{ borderColor: theme.border }}>
        <div>
          <div className="flex items-center gap-2 mb-2 font-mono text-[11px] uppercase tracking-widest" style={{ color: theme.textSecondary }}>
            <span>WORKSPACE</span>
            <span>/</span>
            <span>SETTINGS</span>
            <span>/</span>
            <span style={{ color: theme.textPrimary }}>PROFILE</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: theme.textPrimary, letterSpacing: '-0.02em' }}>
            User Account & Preferences
          </h1>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {!editing ? (
            <button
              onClick={handleEdit}
              className="px-4 py-2 text-xs font-semibold rounded transition-all active:scale-[0.98] flex items-center gap-2 cursor-pointer"
              style={{ 
                background: theme.textPrimary, 
                color: isDark ? '#111111' : '#FFFFFF',
                borderRadius: '6px'
              }}
            >
              <FontAwesomeIcon icon={faEdit} className="w-3 h-3" />
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
                style={{ borderColor: theme.border, background: theme.cardBg, color: theme.textPrimary, borderRadius: '6px' }}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={updating || !hasChanges}
                className="px-4 py-1.5 text-xs font-semibold rounded transition-all active:scale-[0.98] flex items-center gap-1.5 cursor-pointer"
                style={hasChanges ? {
                  background: theme.textPrimary,
                  color: isDark ? '#111111' : '#FFFFFF',
                  borderRadius: '6px'
                } : {
                  background: theme.subtleBg,
                  color: theme.textSecondary,
                  borderRadius: '6px',
                  cursor: 'not-allowed'
                }}
              >
                {updating ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div 
          className="mb-6 p-4 rounded text-xs font-medium border"
          style={{ background: theme.redBg, color: theme.redText, borderColor: theme.border }}
        >
          {error}
        </div>
      )}

      {/* Bento Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* BENTO CARD 1: Identity & Role Badge (Span 12) */}
        <div 
          className="md:col-span-12 p-6 rounded-lg border transition-all"
          style={{ 
            background: theme.cardBg, 
            borderColor: theme.border,
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
                    style={{ borderColor: theme.border }}
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div 
                    className="w-16 h-16 rounded-lg border flex items-center justify-center font-bold text-lg font-mono"
                    style={{ background: theme.subtleBg, borderColor: theme.border, color: theme.textPrimary }}
                  >
                    {initials}
                  </div>
                )}
                {/* Google SSO Indicator */}
                <div 
                  className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-white border flex items-center justify-center"
                  style={{ borderColor: theme.border }}
                  title="Google Workspace Verified"
                >
                  <GoogleIcon className="w-3 h-3" />
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h2 className="text-lg font-bold" style={{ color: theme.textPrimary, letterSpacing: '-0.01em' }}>
                    {fullName || 'No Name Provided'}
                  </h2>
                  {/* Spot Pastel Role Badge */}
                  <span 
                    className="text-[11px] font-mono px-2.5 py-0.5 rounded-full font-semibold uppercase tracking-wider"
                    style={{ background: theme.blueBg, color: theme.blueText }}
                  >
                    {userData.role?.role_name || 'Staff User'}
                  </span>
                </div>
                <p className="text-xs font-mono mt-1" style={{ color: theme.textSecondary }}>
                  {userData.user_email || '—'}
                </p>
              </div>
            </div>

            {/* Quick Metadata Pill */}
            <div className="flex items-center gap-4 text-xs font-mono" style={{ color: theme.textSecondary }}>
              <div>
                <span className="block text-[10px] uppercase tracking-wider">User ID</span>
                <span className="font-semibold text-xs" style={{ color: theme.textPrimary }}>#{userData.user_id}</span>
              </div>
              <div className="h-6 w-[1px]" style={{ background: theme.border }} />
              <div>
                <span className="block text-[10px] uppercase tracking-wider">Status</span>
                <span className="font-semibold text-xs text-emerald-600 dark:text-emerald-400">ACTIVE</span>
              </div>
            </div>
          </div>
        </div>

        {/* BENTO CARD 2: Personal & Contact Information (Span 7) */}
        <div 
          className="md:col-span-7 p-6 rounded-lg border space-y-5"
          style={{ 
            background: theme.cardBg, 
            borderColor: theme.border,
            borderRadius: '8px'
          }}
        >
          <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: theme.border }}>
            <h3 className="text-xs font-bold uppercase tracking-wider font-mono" style={{ color: theme.textPrimary }}>
              01. Personal Details
            </h3>
            {editing && (
              <span className="text-[10px] font-mono" style={{ color: theme.textSecondary }}>
                Press <kbd className="px-1 py-0.5 border rounded bg-zinc-100 dark:bg-zinc-800 font-mono text-[10px]">Enter</kbd> to save
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* First Name */}
            <div>
              <Label className="text-[11px] font-mono uppercase tracking-wider block mb-1.5" style={{ color: theme.textSecondary }}>
                First Name *
              </Label>
              {editing ? (
                <Input
                  value={formData.user_nama_depan}
                  onChange={(e) => setFormData(prev => ({ ...prev, user_nama_depan: e.target.value }))}
                  className="text-xs font-medium"
                  style={{ background: theme.inputBg, border: `1px solid ${theme.border}`, color: theme.textPrimary, borderRadius: '4px' }}
                />
              ) : (
                <p className="text-sm font-semibold py-1" style={{ color: theme.textPrimary }}>
                  {userData.user_nama_depan || '—'}
                </p>
              )}
            </div>

            {/* Last Name */}
            <div>
              <Label className="text-[11px] font-mono uppercase tracking-wider block mb-1.5" style={{ color: theme.textSecondary }}>
                Last Name *
              </Label>
              {editing ? (
                <Input
                  value={formData.user_nama_belakang}
                  onChange={(e) => setFormData(prev => ({ ...prev, user_nama_belakang: e.target.value }))}
                  className="text-xs font-medium"
                  style={{ background: theme.inputBg, border: `1px solid ${theme.border}`, color: theme.textPrimary, borderRadius: '4px' }}
                />
              ) : (
                <p className="text-sm font-semibold py-1" style={{ color: theme.textPrimary }}>
                  {userData.user_nama_belakang || '—'}
                </p>
              )}
            </div>

            {/* Phone */}
            <div>
              <Label className="text-[11px] font-mono uppercase tracking-wider block mb-1.5" style={{ color: theme.textSecondary }}>
                Phone Number
              </Label>
              {editing ? (
                <Input
                  type="tel"
                  value={formData.user_phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, user_phone: e.target.value }))}
                  className="text-xs font-medium font-mono"
                  style={{ background: theme.inputBg, border: `1px solid ${theme.border}`, color: theme.textPrimary, borderRadius: '4px' }}
                />
              ) : (
                <p className="text-sm font-mono py-1" style={{ color: theme.textPrimary }}>
                  {userData.user_phone || '—'}
                </p>
              )}
            </div>

            {/* Birth Date */}
            <div>
              <Label className="text-[11px] font-mono uppercase tracking-wider block mb-1.5" style={{ color: theme.textSecondary }}>
                Date of Birth
              </Label>
              {editing ? (
                <Input
                  type="date"
                  value={formData.user_birth_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, user_birth_date: e.target.value }))}
                  className="text-xs font-medium font-mono"
                  style={{ background: theme.inputBg, border: `1px solid ${theme.border}`, color: theme.textPrimary, borderRadius: '4px' }}
                />
              ) : (
                <p className="text-sm font-mono py-1" style={{ color: theme.textPrimary }}>
                  {formatDate(userData.user_birth_date)}
                </p>
              )}
            </div>
          </div>

          {/* Bio Field */}
          <div className="pt-2 border-t" style={{ borderColor: theme.border }}>
            <Label className="text-[11px] font-mono uppercase tracking-wider block mb-1.5" style={{ color: theme.textSecondary }}>
              Professional Biography
            </Label>
            {editing ? (
              <textarea
                rows="3"
                value={formData.user_bio}
                onChange={(e) => setFormData(prev => ({ ...prev, user_bio: e.target.value }))}
                className="w-full p-2.5 text-xs font-normal rounded outline-none resize-none transition-colors"
                style={{ 
                  background: theme.inputBg, 
                  border: `1px solid ${theme.border}`, 
                  color: theme.textBody,
                  borderRadius: '4px',
                  lineHeight: '1.6'
                }}
                placeholder="Add a concise biographical summary or responsibilities..."
              />
            ) : (
              <p className="text-xs leading-relaxed" style={{ color: userData.user_bio ? theme.textBody : theme.textSecondary }}>
                {userData.user_bio || <span className="italic">No biography recorded.</span>}
              </p>
            )}
          </div>
        </div>

        {/* BENTO CARD 3: Workspace Theme & Display (Span 5) */}
        <div 
          className="md:col-span-5 p-6 rounded-lg border space-y-5 flex flex-col justify-between"
          style={{ 
            background: theme.cardBg, 
            borderColor: theme.border,
            borderRadius: '8px'
          }}
        >
          <div>
            <div className="flex items-center justify-between border-b pb-3 mb-4" style={{ borderColor: theme.border }}>
              <h3 className="text-xs font-bold uppercase tracking-wider font-mono" style={{ color: theme.textPrimary }}>
                02. Interface Theme
              </h3>
              <span className="text-[10px] font-mono" style={{ color: theme.textSecondary }}>INSTANT SYNC</span>
            </div>

            <p className="text-xs leading-relaxed mb-4" style={{ color: theme.textSecondary }}>
              Select your default color scheme. Your choice is automatically persisted across all school modules.
            </p>

            <div className="grid grid-cols-2 gap-3">
              {/* Light Theme Button */}
              <button
                type="button"
                onClick={() => handleThemeToggle('light')}
                className="p-3.5 rounded border text-left transition-all cursor-pointer flex flex-col justify-between h-24"
                style={{
                  background: !isDark ? (isDark ? '#2E2D35' : '#F7F6F3') : 'transparent',
                  borderColor: !isDark ? theme.textPrimary : theme.border,
                  borderRadius: '6px'
                }}
              >
                <div className="flex items-center justify-between">
                  <FontAwesomeIcon icon={faSun} className="text-xs" style={{ color: !isDark ? theme.textPrimary : theme.textSecondary }} />
                  {!isDark && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
                </div>
                <div>
                  <span className="text-xs font-bold block" style={{ color: theme.textPrimary }}>Warm Light</span>
                  <span className="text-[10px] font-mono" style={{ color: theme.textSecondary }}>#F7F6F3 Canvas</span>
                </div>
              </button>

              {/* Dark Theme Button */}
              <button
                type="button"
                onClick={() => handleThemeToggle('dark')}
                className="p-3.5 rounded border text-left transition-all cursor-pointer flex flex-col justify-between h-24"
                style={{
                  background: isDark ? (isDark ? '#232228' : '#F7F6F3') : 'transparent',
                  borderColor: isDark ? theme.textPrimary : theme.border,
                  borderRadius: '6px'
                }}
              >
                <div className="flex items-center justify-between">
                  <FontAwesomeIcon icon={faMoon} className="text-xs" style={{ color: isDark ? theme.textPrimary : theme.textSecondary }} />
                  {isDark && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
                </div>
                <div>
                  <span className="text-xs font-bold block" style={{ color: theme.textPrimary }}>Obsidian Dark</span>
                  <span className="text-[10px] font-mono" style={{ color: theme.textSecondary }}>#18171A Canvas</span>
                </div>
              </button>
            </div>
          </div>

          {/* Location / Address Preview */}
          <div className="pt-4 border-t" style={{ borderColor: theme.border }}>
            <Label className="text-[11px] font-mono uppercase tracking-wider block mb-1" style={{ color: theme.textSecondary }}>
              Registered Address
            </Label>
            {editing ? (
              <textarea
                rows="2"
                value={formData.user_address}
                onChange={(e) => setFormData(prev => ({ ...prev, user_address: e.target.value }))}
                className="w-full p-2 text-xs font-normal rounded outline-none resize-none"
                style={{ background: theme.inputBg, border: `1px solid ${theme.border}`, color: theme.textBody, borderRadius: '4px' }}
                placeholder="Street name, City, Postal code..."
              />
            ) : (
              <p className="text-xs leading-relaxed" style={{ color: userData.user_address ? theme.textBody : theme.textSecondary }}>
                {userData.user_address || <span className="italic">No address recorded.</span>}
              </p>
            )}
          </div>
        </div>

        {/* BENTO CARD 4: System Timestamps & Security Audit (Span 12) */}
        <div 
          className="md:col-span-12 p-6 rounded-lg border"
          style={{ 
            background: theme.cardBg, 
            borderColor: theme.border,
            borderRadius: '8px'
          }}
        >
          <div className="flex items-center justify-between border-b pb-3 mb-4" style={{ borderColor: theme.border }}>
            <h3 className="text-xs font-bold uppercase tracking-wider font-mono" style={{ color: theme.textPrimary }}>
              03. Audit Log & Timestamps
            </h3>
            <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400">ENCRYPTED RLS</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 font-mono text-xs">
            <div>
              <span className="text-[10px] uppercase tracking-wider block mb-1" style={{ color: theme.textSecondary }}>Account Created</span>
              <p className="font-medium" style={{ color: theme.textPrimary }}>{formatDate(userData.user_created_at)}</p>
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-wider block mb-1" style={{ color: theme.textSecondary }}>Last Modified</span>
              <p className="font-medium" style={{ color: theme.textPrimary }}>{formatDate(userData.user_updated_at)}</p>
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-wider block mb-1" style={{ color: theme.textSecondary }}>Security Protocol</span>
              <p className="font-medium text-emerald-600 dark:text-emerald-400">OAuth 2.0 / Google Auth</p>
            </div>
          </div>
        </div>

      </div>

      {/* Floating Bottom Bar in Edit Mode */}
      {editing && (
        <div 
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-lg border shadow-xl flex items-center gap-4 transition-all"
          style={{ 
            background: theme.cardBg, 
            borderColor: theme.border,
            borderRadius: '8px'
          }}
        >
          <div className="text-xs font-mono flex items-center gap-2">
            {hasChanges ? (
              <span className="text-amber-600 dark:text-amber-400 font-semibold">• Unsaved modifications</span>
            ) : (
              <span style={{ color: theme.textSecondary }}>No changes made</span>
            )}
          </div>

          <div className="h-4 w-[1px]" style={{ background: theme.border }} />

          <div className="flex items-center gap-2">
            <button
              onClick={handleCancel}
              disabled={updating}
              className="px-3 py-1.5 text-xs font-semibold rounded border transition-colors cursor-pointer"
              style={{ borderColor: theme.border, background: theme.subtleBg, color: theme.textPrimary, borderRadius: '4px' }}
            >
              Cancel (<kbd className="font-mono text-[10px]">Esc</kbd>)
            </button>
            <button
              onClick={handleSave}
              disabled={updating || !hasChanges}
              className="px-4 py-1.5 text-xs font-semibold rounded transition-all active:scale-[0.98] cursor-pointer"
              style={hasChanges ? {
                background: theme.textPrimary,
                color: isDark ? '#111111' : '#FFFFFF',
                borderRadius: '4px'
              } : {
                background: theme.subtleBg,
                color: theme.textSecondary,
                borderRadius: '4px',
                cursor: 'not-allowed'
              }}
            >
              {updating ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
