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
  faCalendar, faMapMarkerAlt, faIdBadge, faShieldAlt, faClock, faCheckCircle,
  faSun, faMoon, faPalette
} from '@fortawesome/free-solid-svg-icons'
import { useI18n } from '@/lib/i18n'
import { useTheme } from '@/lib/theme'

// Google logo SVG component
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
      setError(t('profile.validation.nameRequired'))
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
      setError(t('profile.validation.saveFailed'))
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
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString(
      lang === 'en' ? 'en-US' : lang === 'zh' ? 'zh-CN' : 'id-ID',
      { year: 'numeric', month: 'long', day: 'numeric' }
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: theme.pageBg }}>
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p style={{ color: theme.textSecondary }}>{t('profile.loading')}</p>
        </div>
      </div>
    )
  }

  if (!userData) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: theme.pageBg }}>
        <div className="text-center">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: theme.redBg }}>
            <FontAwesomeIcon icon={faUser} className="text-3xl" style={{ color: theme.redText }} />
          </div>
          <p className="text-lg" style={{ color: theme.redText }}>{t('profile.loadError')}</p>
        </div>
      </div>
    )
  }

  const fullName = `${userData.user_nama_depan || ''} ${userData.user_nama_belakang || ''}`.trim()

  return (
    <div className="min-h-screen pb-20" style={{ background: theme.pageBg }}>
      {/* Success Toast */}
      {saveSuccess && (
        <div className="fixed top-20 right-4 z-50 animate-in slide-in-from-top-2 fade-in duration-300">
          <div className="bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2">
            <FontAwesomeIcon icon={faCheckCircle} />
            <span>{t('profile.saved') || 'Saved successfully!'}</span>
          </div>
        </div>
      )}

      {/* Hero Section with Profile Picture */}
      <div className="relative">
        {/* Background Pattern - extended height */}
        <div className="absolute inset-0 bg-gradient-to-r from-sky-500 via-cyan-500 to-teal-500 h-80 overflow-hidden">
          {/* Cross pattern */}
          <div className="absolute inset-0 opacity-20">
            <div className="absolute inset-0" style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }} />
          </div>
          
          {/* School Logo Overlay - Large watermark style */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/login-logo.png"
              alt=""
              className="w-auto h-64 object-contain opacity-15"
              aria-hidden="true"
            />
          </div>
        </div>

        {/* Profile Content */}
        <div className="relative px-4 sm:px-6 lg:px-8 pt-8 pb-8">
          <div className="max-w-5xl mx-auto">
            {/* Edit Button - Only show when not editing */}
            {!editing && (
              <div className="flex justify-end mb-4">
                <Button 
                  onClick={handleEdit} 
                  className="bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white border border-white/30 shadow-lg"
                >
                  <FontAwesomeIcon icon={faEdit} className="mr-2" />
                  {t('profile.edit')}
                </Button>
              </div>
            )}

            {/* Editing Mode Indicator */}
            {editing && (
              <div className="flex justify-end mb-4">
                <div className="bg-amber-500/90 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2">
                  <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                  Editing Mode - Press Enter to save, Esc to cancel
                </div>
              </div>
            )}

            {/* Profile Picture & Name */}
            <div className="text-center">
              <div className="relative inline-block">
                {userData?.user_profile_picture ? (
                  <img
                    src={userData.user_profile_picture}
                    alt="Profile"
                    className="w-36 h-36 rounded-full object-cover border-4 border-white shadow-2xl"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-36 h-36 rounded-full bg-white/80 backdrop-blur flex items-center justify-center border-4 border-white shadow-2xl">
                    <FontAwesomeIcon icon={faUser} className="text-5xl text-sky-400" />
                  </div>
                )}
                {/* Google Badge */}
                <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-1.5 shadow-lg" title={t('profile.photoFromGoogle')}>
                  <GoogleIcon className="w-4 h-4" />
                </div>
              </div>
              
              <h1 className="mt-4 text-3xl font-bold text-white drop-shadow-lg">
                {fullName || '-'}
              </h1>
              
              <div className="mt-2 inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full">
                <FontAwesomeIcon icon={faShieldAlt} className="text-white/80" />
                <span className="text-white font-medium">
                  {userData.role?.role_name || t('profile.noRole')}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative px-4 sm:px-6 lg:px-8 pb-12">
        <div className="max-w-5xl mx-auto">
          {/* Error Message */}
          {error && (
            <div className="mb-6 border-l-4 border-red-500 px-6 py-4 rounded-r-lg shadow-sm" style={{ background: theme.redBg, color: theme.redText }}>
              {error}
            </div>
          )}

          {/* Info Cards Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Quick Info */}
            <div className="space-y-6">
              {/* Contact Card */}
              <div className="rounded-2xl shadow-lg p-6" style={{ background: theme.cardBg, border: `1px solid ${theme.border}` }}>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: theme.textPrimary }}>
                  <span className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: theme.subtleBg }}>
                    <FontAwesomeIcon icon={faIdBadge} className="text-sky-500" />
                  </span>
                  {t('profile.accountInfo')}
                </h3>
                
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <FontAwesomeIcon icon={faEnvelope} className="w-5" style={{ color: theme.textSecondary }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs uppercase tracking-wide" style={{ color: theme.textSecondary }}>{t('profile.email')}</p>
                      <p className="font-medium truncate" style={{ color: theme.textPrimary }}>{userData.user_email || '-'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <FontAwesomeIcon icon={faPhone} className="w-5" style={{ color: theme.textSecondary }} />
                    <div className="flex-1">
                      <p className="text-xs uppercase tracking-wide" style={{ color: theme.textSecondary }}>{t('profile.phone')}</p>
                      {editing ? (
                        <Input
                          type="tel"
                          value={formData.user_phone}
                          onChange={(e) => setFormData(prev => ({ ...prev, user_phone: e.target.value }))}
                          className="mt-1"
                          style={{ background: theme.inputBg, border: `1px solid ${theme.border}`, color: theme.textBody }}
                        />
                      ) : (
                        <p className="font-medium" style={{ color: theme.textPrimary }}>{userData.user_phone || '-'}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <FontAwesomeIcon icon={faCalendar} className="w-5" style={{ color: theme.textSecondary }} />
                    <div className="flex-1">
                      <p className="text-xs uppercase tracking-wide" style={{ color: theme.textSecondary }}>{t('profile.birthDate')}</p>
                      {editing ? (
                        <Input
                          type="date"
                          value={formData.user_birth_date}
                          onChange={(e) => setFormData(prev => ({ ...prev, user_birth_date: e.target.value }))}
                          className="mt-1"
                          style={{ background: theme.inputBg, border: `1px solid ${theme.border}`, color: theme.textBody }}
                        />
                      ) : (
                        <p className="font-medium" style={{ color: theme.textPrimary }}>{formatDate(userData.user_birth_date)}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Account Timeline */}
              <div className="rounded-2xl shadow-lg p-6" style={{ background: theme.cardBg, border: `1px solid ${theme.border}` }}>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: theme.textPrimary }}>
                  <span className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: theme.subtleBg }}>
                    <FontAwesomeIcon icon={faClock} className="text-teal-500" />
                  </span>
                  Timeline
                </h3>
                
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-3 h-3 bg-green-500 rounded-full mt-1.5 ring-4 ring-green-500/20"></div>
                    <div>
                      <p className="text-xs uppercase tracking-wide" style={{ color: theme.textSecondary }}>{t('profile.createdAt')}</p>
                      <p className="font-medium" style={{ color: theme.textPrimary }}>{formatDate(userData.user_created_at)}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-3 h-3 bg-sky-500 rounded-full mt-1.5 ring-4 ring-sky-500/20"></div>
                    <div>
                      <p className="text-xs uppercase tracking-wide" style={{ color: theme.textSecondary }}>{t('profile.updatedAt')}</p>
                      <p className="font-medium" style={{ color: theme.textPrimary }}>{formatDate(userData.user_updated_at)}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Details */}
            <div className="lg:col-span-2 space-y-6">
              {/* Personal Information */}
              <div className="rounded-2xl shadow-lg p-6" style={{ background: theme.cardBg, border: `1px solid ${theme.border}` }}>
                <h3 className="text-lg font-semibold mb-6 flex items-center gap-2" style={{ color: theme.textPrimary }}>
                  <span className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: theme.subtleBg }}>
                    <FontAwesomeIcon icon={faUser} className="text-cyan-500" />
                  </span>
                  {t('profile.infoTitle')}
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* First Name */}
                  <div>
                    <Label className="text-sm" style={{ color: theme.textSecondary }}>{t('profile.firstName')} *</Label>
                    {editing ? (
                      <Input
                        value={formData.user_nama_depan}
                        onChange={(e) => setFormData(prev => ({ ...prev, user_nama_depan: e.target.value }))}
                        className="mt-1"
                        style={{ background: theme.inputBg, border: `1px solid ${theme.border}`, color: theme.textBody }}
                      />
                    ) : (
                      <p className="mt-1 text-lg font-medium" style={{ color: theme.textPrimary }}>
                        {userData.user_nama_depan || '-'}
                      </p>
                    )}
                  </div>

                  {/* Last Name */}
                  <div>
                    <Label className="text-sm" style={{ color: theme.textSecondary }}>{t('profile.lastName')} *</Label>
                    {editing ? (
                      <Input
                        value={formData.user_nama_belakang}
                        onChange={(e) => setFormData(prev => ({ ...prev, user_nama_belakang: e.target.value }))}
                        className="mt-1"
                        style={{ background: theme.inputBg, border: `1px solid ${theme.border}`, color: theme.textBody }}
                      />
                    ) : (
                      <p className="mt-1 text-lg font-medium" style={{ color: theme.textPrimary }}>
                        {userData.user_nama_belakang || '-'}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Bio Section */}
              <div className="rounded-2xl shadow-lg p-6" style={{ background: theme.cardBg, border: `1px solid ${theme.border}` }}>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: theme.textPrimary }}>
                  <span className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: theme.subtleBg }}>
                    <FontAwesomeIcon icon={faEdit} style={{ color: theme.textSecondary }} />
                  </span>
                  {t('profile.bio')}
                </h3>

                {editing ? (
                  <textarea
                    rows="4"
                    value={formData.user_bio}
                    onChange={(e) => setFormData(prev => ({ ...prev, user_bio: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl focus:outline-none resize-none"
                    style={{ background: theme.inputBg, border: `1px solid ${theme.border}`, color: theme.textBody }}
                    placeholder={t('profile.bioPlaceholder')}
                  />
                ) : (
                  <p className="leading-relaxed" style={{ color: theme.textBody }}>
                    {userData.user_bio || (
                      <span className="italic" style={{ color: theme.textSecondary }}>{t('profile.bioPlaceholder')}</span>
                    )}
                  </p>
                )}
              </div>

              {/* Address Section */}
              <div className="rounded-2xl shadow-lg p-6" style={{ background: theme.cardBg, border: `1px solid ${theme.border}` }}>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: theme.textPrimary }}>
                  <span className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: theme.subtleBg }}>
                    <FontAwesomeIcon icon={faMapMarkerAlt} style={{ color: theme.textSecondary }} />
                  </span>
                  {t('profile.address')}
                </h3>

                {editing ? (
                  <textarea
                    rows="3"
                    value={formData.user_address}
                    onChange={(e) => setFormData(prev => ({ ...prev, user_address: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl focus:outline-none resize-none"
                    style={{ background: theme.inputBg, border: `1px solid ${theme.border}`, color: theme.textBody }}
                    placeholder={t('profile.addressPlaceholder')}
                  />
                ) : (
                  <p className="leading-relaxed" style={{ color: theme.textBody }}>
                    {userData.user_address || (
                      <span className="italic" style={{ color: theme.textSecondary }}>{t('profile.addressPlaceholder')}</span>
                    )}
                  </p>
                )}
              </div>

              {/* Appearance Card */}
              <div className="rounded-2xl shadow-lg p-6" style={{ background: theme.cardBg, border: `1px solid ${theme.border}` }}>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: theme.textPrimary }}>
                  <span className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: theme.subtleBg }}>
                    <FontAwesomeIcon icon={faPalette} style={{ color: theme.textSecondary }} />
                  </span>
                  Appearance
                </h3>

                <p className="text-sm mb-4" style={{ color: theme.textSecondary }}>
                  Choose your preferred display mode. Changes are saved instantly.
                </p>

                <div className="flex gap-3">
                  {/* Light Mode Button */}
                  <button
                    onClick={() => handleThemeToggle('light')}
                    className="flex-1 flex flex-col items-center gap-2 py-4 px-3 rounded-xl transition-all"
                    style={
                      !isDark
                        ? { background: theme.blueBg, border: `2px solid ${theme.blueText}`, color: theme.blueText }
                        : { background: theme.subtleBg, border: `2px solid ${theme.border}`, color: theme.textSecondary }
                    }
                  >
                    <FontAwesomeIcon icon={faSun} className="text-xl" />
                    <span className="text-sm font-medium">Light</span>
                  </button>

                  {/* Dark Mode Button */}
                  <button
                    onClick={() => handleThemeToggle('dark')}
                    className="flex-1 flex flex-col items-center gap-2 py-4 px-3 rounded-xl transition-all"
                    style={
                      isDark
                        ? { background: theme.blueBg, border: `2px solid ${theme.blueText}`, color: theme.blueText }
                        : { background: theme.subtleBg, border: `2px solid ${theme.border}`, color: theme.textSecondary }
                    }
                  >
                    <FontAwesomeIcon icon={faMoon} className="text-xl" />
                    <span className="text-sm font-medium">Dark</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Action Bar - Shows when editing */}
      {editing && (
        <div className="fixed bottom-0 left-0 right-0 z-50 backdrop-blur-lg shadow-2xl" style={{ background: theme.cardBg, borderTop: `1px solid ${theme.border}` }}>
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              {/* Left side - status */}
              <div className="flex items-center gap-3">
                {hasChanges ? (
                  <span className="text-amber-600 text-sm flex items-center gap-2">
                    <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></span>
                    {t('profile.unsavedChanges') || 'Unsaved changes'}
                  </span>
                ) : (
                  <span className="text-sm" style={{ color: theme.textSecondary }}>
                    {t('profile.noChanges') || 'No changes'}
                  </span>
                )}
                {error && (
                  <span className="text-sm" style={{ color: theme.redText }}>• {error}</span>
                )}
              </div>

              {/* Right side - actions */}
              <div className="flex items-center gap-3">
                <Button 
                  variant="outline" 
                  onClick={handleCancel} 
                  disabled={updating}
                  className="px-6"
                  style={{ background: theme.cardBg, color: theme.textPrimary, borderColor: theme.border }}
                >
                  <FontAwesomeIcon icon={faTimes} className="mr-2" />
                  {t('profile.cancel')}
                </Button>
                <Button 
                  onClick={handleSave} 
                  disabled={updating || !hasChanges}
                  className="px-6"
                  style={hasChanges
                    ? { background: theme.textPrimary, color: theme.cardBg, border: 'none' }
                    : { background: theme.subtleBg, color: theme.textSecondary, border: 'none', cursor: 'not-allowed' }
                  }
                >
                  {updating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      {t('profile.saving')}
                    </>
                  ) : (
                    <>
                      <FontAwesomeIcon icon={faSave} className="mr-2" />
                      {t('profile.save')}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
