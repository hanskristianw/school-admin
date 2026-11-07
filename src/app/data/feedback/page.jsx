'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useTheme } from '@/lib/theme'
import { useI18n } from '@/lib/i18n'
import { SYSTEM_RELEASES } from '@/data/changelog'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faCodeBranch,
  faCalendarAlt,
  faPlus,
  faSearch,
  faExternalLinkAlt,
  faCheckCircle,
  faTools,
  faTag,
  faBell,
  faTimes,
  faTrashAlt,
  faCopy,
  faSpinner,
  faHeadset,
  faChevronDown
} from '@fortawesome/free-solid-svg-icons'

export default function SystemFeedbackPage() {
  const router = useRouter()
  const { theme, isDark } = useTheme()
  const { t, lang } = useI18n()
  const dateLocale = lang === 'zh' ? 'zh-CN' : lang === 'en' ? 'en-US' : 'id-ID'

  // Safe i18n lookup helper
  const tr = (key, fallback) => {
    const val = t(key)
    if (val && typeof val === 'string' && val !== key) return val
    if (fallback && typeof fallback === 'object') {
      return fallback[lang] || fallback.en || fallback.id || ''
    }
    return fallback || ''
  }

  // User session & admin state
  const [currentUser, setCurrentUser] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)

  // Changelog filter states
  const [selectedCategory, setSelectedCategory] = useState('all') // 'all' | 'added' | 'changed' | 'fixed'
  const [searchQuery, setSearchQuery] = useState('')

  // Expandable version cards state (per version)
  const [expandedVersions, setExpandedVersions] = useState({})

  const toggleVersion = (version) => {
    setExpandedVersions(prev => ({
      ...prev,
      [version]: !prev[version]
    }))
  }

  const handleToggleAllVersions = () => {
    const isAnyExpanded = filteredReleases.some(r => expandedVersions[r.version])
    if (isAnyExpanded) {
      setExpandedVersions({})
    } else {
      const all = {}
      filteredReleases.forEach(r => { all[r.version] = true })
      setExpandedVersions(all)
    }
  }

  // Notification Recipients Manager Modal (Admin only)
  const [showRecipientsModal, setShowRecipientsModal] = useState(false)
  const [recipients, setRecipients] = useState([])
  const [loadingRecipients, setLoadingRecipients] = useState(false)
  const [staffList, setStaffList] = useState([])
  const [selectedStaffId, setSelectedStaffId] = useState('')
  const [savingRecipient, setSavingRecipient] = useState(false)
  const [recipientsTableMissing, setRecipientsTableMissing] = useState(false)
  const [sqlCopied, setSqlCopied] = useState(false)

  // 1. Fetch Logged-in User
  useEffect(() => {
    const krId = typeof window !== 'undefined' ? localStorage.getItem('kr_id') : null
    if (!krId) return

    const parsedId = parseInt(krId, 10)
    const loadUser = async () => {
      try {
        const { data: u } = await supabase
          .from('users')
          .select('user_id, user_nama_depan, user_nama_belakang, user_role_id')
          .eq('user_id', parsedId)
          .single()

        if (u) {
          setCurrentUser(u)
          if (u.user_role_id) {
            const { data: r } = await supabase
              .from('role')
              .select('role_id, role_name, is_admin')
              .eq('role_id', u.user_role_id)
              .single()

            setIsAdmin(r?.is_admin === true)
          } else {
            setIsAdmin(false)
          }
        } else {
          setCurrentUser({ user_id: parsedId, user_nama_depan: 'Staff', user_nama_belakang: `#${parsedId}` })
          setIsAdmin(false)
        }
      } catch (err) {
        console.error('Error loading user:', err)
        try {
          const ud = JSON.parse(localStorage.getItem('user_data') || '{}')
          setIsAdmin(ud?.isAdmin === true || ud?.is_admin === true)
        } catch {
          setIsAdmin(false)
        }
      }
    }

    loadUser()
  }, [])

  // 2. Notification Recipients Management (Admin only)
  const fetchRecipients = async () => {
    setLoadingRecipients(true)
    try {
      const res = await fetch('/api/system-feedback/recipients')
      const json = await res.json()
      if (json.tableMissing) {
        setRecipientsTableMissing(true)
        setRecipients([])
      } else if (json.success && Array.isArray(json.data)) {
        setRecipients(json.data)
        setRecipientsTableMissing(false)
      } else {
        setRecipients([])
      }
    } catch (err) {
      console.error('Fetch recipients error:', err)
      setRecipients([])
    } finally {
      setLoadingRecipients(false)
    }
  }

  const fetchStaffList = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select(`
          user_id,
          user_nama_depan,
          user_nama_belakang,
          user_email,
          role:user_role_id (role_name)
        `)
        .order('user_nama_depan', { ascending: true })

      if (!error && data) {
        setStaffList(data)
      }
    } catch (err) {
      console.error('Fetch staff list error:', err)
    }
  }

  const handleAddRecipient = async () => {
    if (!selectedStaffId) return
    setSavingRecipient(true)
    try {
      const res = await fetch('/api/system-feedback/recipients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: parseInt(selectedStaffId, 10) })
      })
      const json = await res.json()
      if (json.success) {
        setSelectedStaffId('')
        fetchRecipients()
      } else {
        alert(json.message || 'Gagal menambahkan penerima.')
      }
    } catch (err) {
      console.error('Add recipient error:', err)
      alert('Terjadi kesalahan koneksi.')
    } finally {
      setSavingRecipient(false)
    }
  }

  const handleToggleRecipient = async (recipient) => {
    try {
      const res = await fetch(`/api/system-feedback/recipients?id=${recipient.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !recipient.is_active })
      })
      const json = await res.json()
      if (json.success) {
        fetchRecipients()
      }
    } catch (err) {
      console.error('Toggle recipient error:', err)
    }
  }

  const handleDeleteRecipient = async (recipientId) => {
    if (!confirm('Hapus staf ini dari daftar penerima notifikasi laporan?')) return
    try {
      const res = await fetch(`/api/system-feedback/recipients?id=${recipientId}`, {
        method: 'DELETE'
      })
      const json = await res.json()
      if (json.success) {
        fetchRecipients()
      }
    } catch (err) {
      console.error('Delete recipient error:', err)
    }
  }

  // 3. Filtered Releases (Changelog Feed)
  const filteredReleases = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()

    return SYSTEM_RELEASES.map(release => {
      const sections = release.sections || {}
      const added = (sections.added || []).filter(item => {
        if (selectedCategory !== 'all' && selectedCategory !== 'added') return false
        if (!q) return true
        const text = (item[lang] || item.id || '').toLowerCase()
        return text.includes(q)
      })

      const changed = (sections.changed || []).filter(item => {
        if (selectedCategory !== 'all' && selectedCategory !== 'changed') return false
        if (!q) return true
        const text = (item[lang] || item.id || '').toLowerCase()
        return text.includes(q)
      })

      const fixed = (sections.fixed || []).filter(item => {
        if (selectedCategory !== 'all' && selectedCategory !== 'fixed') return false
        if (!q) return true
        const text = (item[lang] || item.id || '').toLowerCase()
        return text.includes(q)
      })

      const hasItems = added.length > 0 || changed.length > 0 || fixed.length > 0
      const summaryText = (release.summary?.[lang] || release.summary?.id || '').toLowerCase()
      const versionMatch = release.version.toLowerCase().includes(q)
      const summaryMatch = q ? summaryText.includes(q) : true

      const isMatch = hasItems || (selectedCategory === 'all' && (versionMatch || summaryMatch))

      return {
        ...release,
        filteredSections: { added, changed, fixed },
        isMatch
      }
    }).filter(r => r.isMatch)
  }, [selectedCategory, searchQuery, lang])

  // Design Tokens
  const pageBg = isDark ? '#09090B' : '#FBFBFA'
  const cardBg = isDark ? '#18181B' : '#FFFFFF'
  const borderColor = isDark ? '#27272A' : '#EAEAEA'
  const textPrimary = isDark ? '#F4F4F5' : '#111111'
  const textSecondary = isDark ? '#A1A1AA' : '#787774'
  const inputBg = isDark ? '#27272A' : '#FFFFFF'

  return (
    <div
      className="w-full"
      style={{
        background: pageBg,
        minHeight: '100vh',
        padding: '24px 32px',
        color: textPrimary,
        fontFamily: "'Geist Sans', 'SF Pro Display', system-ui, -apple-system, sans-serif"
      }}
    >
      {/* ── HEADER & BREADCRUMBS ────────────────────────────────────────── */}
      <div className="pb-5 border-b flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6" style={{ borderColor }}>
        <div>
          <div className="flex items-center gap-2 text-[10px] font-mono tracking-wider uppercase mb-1.5" style={{ color: textSecondary }}>
            <span>{tr('feedback.breadcrumbSystem', 'SISTEM')}</span>
            <span>/</span>
            <span className="font-semibold" style={{ color: isDark ? '#60A5FA' : '#0284C7' }}>[CHANGELOG]</span>
          </div>
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded flex items-center justify-center border shrink-0"
              style={{
                background: isDark ? 'rgba(59, 130, 246, 0.15)' : '#E1F3FE',
                borderColor: isDark ? '#2563EB' : '#BAE6FD',
                color: isDark ? '#60A5FA' : '#0284C7',
                borderRadius: '6px'
              }}
            >
              <FontAwesomeIcon icon={faCodeBranch} className="text-base" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight" style={{ color: textPrimary, letterSpacing: '-0.02em', margin: 0 }}>
                {tr('feedback.changelogStandardTitle', 'Changelog & Pembaruan Sistem')}
              </h1>
              <p className="text-xs" style={{ color: textSecondary, margin: '2px 0 0 0' }}>
                {tr('feedback.changelogStandardDesc', 'Semua perubahan penting, fitur baru, dan perbaikan bug')}
              </p>
            </div>
          </div>
        </div>

        {isAdmin && (
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                setShowRecipientsModal(true)
                fetchRecipients()
                fetchStaffList()
              }}
              className="px-3 py-2 text-xs font-semibold rounded border transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
              style={{
                background: isDark ? '#27272A' : '#F4F4F5',
                borderColor,
                color: textPrimary,
                borderRadius: '6px'
              }}
            >
              <FontAwesomeIcon icon={faBell} className="text-xs text-amber-500" />
              <span>{tr('feedback.btnRecipients', 'Penerima Notifikasi')}</span>
            </button>
          </div>
        )}
      </div>

      {/* ── CHANGELOG CONTENT STREAM ────────────────────────────────────── */}
      <div className="space-y-6 max-w-5xl">
        {/* Category Filters Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded border" style={{ background: cardBg, borderColor, borderRadius: '8px' }}>
          <div className="inline-flex rounded border p-0.5" style={{ background: inputBg, borderColor, borderRadius: '6px' }}>
            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1 text-xs font-semibold rounded cursor-pointer transition-colors ${selectedCategory === 'all' ? (isDark ? 'bg-zinc-700 text-white' : 'bg-neutral-800 text-white') : ''}`}
              style={{ color: selectedCategory === 'all' ? '#FFFFFF' : textSecondary, borderRadius: '4px' }}
            >
              {tr('feedback.filterAll', 'Semua')}
            </button>
            <button
              type="button"
              onClick={() => setSelectedCategory('added')}
              className={`px-3 py-1 text-xs font-semibold rounded cursor-pointer transition-colors ${selectedCategory === 'added' ? 'bg-emerald-600 text-white' : ''}`}
              style={{ color: selectedCategory === 'added' ? '#FFFFFF' : textSecondary, borderRadius: '4px' }}
            >
              ✨ Added
            </button>
            <button
              type="button"
              onClick={() => setSelectedCategory('changed')}
              className={`px-3 py-1 text-xs font-semibold rounded cursor-pointer transition-colors ${selectedCategory === 'changed' ? 'bg-blue-600 text-white' : ''}`}
              style={{ color: selectedCategory === 'changed' ? '#FFFFFF' : textSecondary, borderRadius: '4px' }}
            >
              🔄 Changed
            </button>
            <button
              type="button"
              onClick={() => setSelectedCategory('fixed')}
              className={`px-3 py-1 text-xs font-semibold rounded cursor-pointer transition-colors ${selectedCategory === 'fixed' ? 'bg-amber-600 text-white' : ''}`}
              style={{ color: selectedCategory === 'fixed' ? '#FFFFFF' : textSecondary, borderRadius: '4px' }}
            >
              🛠️ Fixed
            </button>
          </div>

          <div className="relative w-full sm:w-64">
            <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 -translate-y-1/2 text-xs" style={{ color: textSecondary }} />
            <input
              type="text"
              placeholder={tr('feedback.searchReleasesPlaceholder', { id: 'Cari versi atau perubahan...', en: 'Search version or changes...', zh: '搜索版本或更新内容...' })}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded border focus:outline-none"
              style={{ background: inputBg, borderColor, color: textPrimary, borderRadius: '6px' }}
            />
          </div>
        </div>

        {/* Releases Timeline */}
        {filteredReleases.length === 0 ? (
          <div className="p-12 rounded border text-center space-y-2" style={{ background: cardBg, borderColor, borderRadius: '8px' }}>
            <p className="text-sm font-semibold" style={{ color: textPrimary }}>
              {tr('feedback.emptyReleasesTitle', { id: 'Tidak Ada Catatan Rilis yang Cocok', en: 'No Matching Release Notes', zh: '未找到匹配的更新日志' })}
            </p>
            <p className="text-xs" style={{ color: textSecondary }}>
              {tr('feedback.emptyReleasesDesc', { id: 'Coba gunakan kata kunci pencarian lain atau pilih kategori rilis Semua.', en: 'Try another search term or select All categories.', zh: '请尝试其他搜索关键词或选择“全部”分类。' })}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
          {/* Controls: Releases Count & Expand/Collapse All */}
        {filteredReleases.length > 0 && (
          <div className="flex items-center justify-between text-xs font-mono mb-3 px-1">
            <span style={{ color: textSecondary }}>
              {filteredReleases.length} {tr('feedback.releaseVersionsCount', { id: 'versi rilis', en: 'versions', zh: '个版本' })}
            </span>
            <button
              type="button"
              onClick={handleToggleAllVersions}
              className="text-[11px] font-mono hover:underline cursor-pointer flex items-center gap-1.5 transition-colors"
              style={{ color: textSecondary }}
            >
              <FontAwesomeIcon icon={faChevronDown} className={`text-[10px] transition-transform ${filteredReleases.some(r => expandedVersions[r.version]) ? 'rotate-180' : ''}`} />
              <span>
                {filteredReleases.some(r => expandedVersions[r.version])
                  ? tr('feedback.collapseAll', { id: 'Tutup Semua Detail', en: 'Collapse All Details', zh: '折叠全部详情' })
                  : tr('feedback.expandAll', { id: 'Buka Semua Detail', en: 'Buka Semua Detail', zh: '展开全部详情' })}
              </span>
            </button>
          </div>
        )}

        <div className="space-y-4">
          {filteredReleases.map((release, relIdx) => {
            const formattedDate = new Date(release.date).toLocaleDateString(dateLocale, {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })

            const summaryText = release.summary?.[lang] || release.summary?.id || ''
            const sections = release.filteredSections || release.sections || {}
            const addedItems = sections.added || []
            const changedItems = sections.changed || []
            const fixedItems = sections.fixed || []

            const isExpanded = searchQuery.trim().length > 0 ? true : !!expandedVersions[release.version]

            return (
              <article
                key={release.version ? `${release.version}-${relIdx}` : relIdx}
                className="rounded border transition-all shadow-xs overflow-hidden"
                style={{ background: cardBg, borderColor, borderRadius: '8px' }}
              >
                {/* Header Dropdown (Clickable to Expand / Collapse) */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => toggleVersion(release.version)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      toggleVersion(release.version)
                    }
                  }}
                  className="p-5 sm:p-6 w-full text-left cursor-pointer transition-colors select-none group"
                  style={{
                    background: isExpanded ? (isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.01)') : 'transparent'
                  }}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-xl font-bold font-mono tracking-tight group-hover:text-blue-500 transition-colors" style={{ color: textPrimary }}>
                        [{release.version}]
                      </span>
                      {release.isLatest && (
                        <span
                          className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase rounded border"
                          style={{
                            background: isDark ? 'rgba(16, 185, 129, 0.2)' : '#D1FAE5',
                            borderColor: '#10B981',
                            color: isDark ? '#34D399' : '#065F46',
                            borderRadius: '4px'
                          }}
                        >
                          {tr('feedback.badgeLatestRelease', { id: 'Rilis Terbaru', en: 'Latest Release', zh: '最新版本' })}
                        </span>
                      )}

                      {/* Category Badges Preview */}
                      <div className="flex items-center gap-1.5 text-[10.5px] font-mono font-semibold">
                        {addedItems.length > 0 && (
                          <span
                            className="px-1.5 py-0.5 rounded border"
                            style={{
                              background: isDark ? 'rgba(16, 185, 129, 0.12)' : '#ECFDF5',
                              borderColor: isDark ? 'rgba(16, 185, 129, 0.3)' : '#A7F3D0',
                              color: isDark ? '#34D399' : '#065F46'
                            }}
                          >
                            +{addedItems.length} Added
                          </span>
                        )}
                        {changedItems.length > 0 && (
                          <span
                            className="px-1.5 py-0.5 rounded border"
                            style={{
                              background: isDark ? 'rgba(59, 130, 246, 0.12)' : '#EFF6FF',
                              borderColor: isDark ? 'rgba(59, 130, 246, 0.3)' : '#BFDBFE',
                              color: isDark ? '#60A5FA' : '#1D4ED8'
                            }}
                          >
                            ~{changedItems.length} Changed
                          </span>
                        )}
                        {fixedItems.length > 0 && (
                          <span
                            className="px-1.5 py-0.5 rounded border"
                            style={{
                              background: isDark ? 'rgba(245, 158, 11, 0.12)' : '#FFFBEB',
                              borderColor: isDark ? 'rgba(245, 158, 11, 0.3)' : '#FDE68A',
                              color: isDark ? '#FBBF24' : '#B45309'
                            }}
                          >
                            ✓{fixedItems.length} Fixed
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-auto">
                      <div className="flex items-center gap-2 text-xs font-mono" style={{ color: textSecondary }}>
                        <FontAwesomeIcon icon={faCalendarAlt} className="text-[11px]" />
                        <span>{formattedDate}</span>
                      </div>

                      {/* Dropdown Downward Arrow Button */}
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center border transition-all duration-200 shrink-0"
                        style={{
                          borderColor,
                          background: isExpanded ? (isDark ? '#27272A' : '#F4F4F5') : 'transparent',
                          color: isExpanded ? (isDark ? '#60A5FA' : '#2563EB') : textSecondary
                        }}
                        title={isExpanded ? tr('feedback.hideDetails', 'Tutup Detail') : tr('feedback.viewDetails', 'Lihat Detail')}
                      >
                        <FontAwesomeIcon
                          icon={faChevronDown}
                          className={`text-xs transition-transform duration-200 ${isExpanded ? 'rotate-180 text-blue-500' : 'rotate-0'}`}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Summary preview */}
                  {summaryText && (
                    <p className="text-xs leading-relaxed mt-2.5" style={{ color: textSecondary, margin: 0 }}>
                      {summaryText}
                    </p>
                  )}
                </div>

                {/* Expandable Detailed Sections */}
                {isExpanded && (
                  <div className="px-5 sm:px-6 pb-6 pt-3 border-t space-y-4" style={{ borderColor }}>
                    {/* Added */}
                    {addedItems.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span
                            className="px-2 py-0.5 text-[10.5px] font-mono font-bold uppercase rounded"
                            style={{ background: 'rgba(16, 185, 129, 0.15)', color: isDark ? '#34D399' : '#059669', borderRadius: '4px' }}
                          >
                            Added
                          </span>
                          <span className="text-[11px] font-mono" style={{ color: textSecondary }}>
                            ({addedItems.length})
                          </span>
                        </div>
                        <ul className="list-disc list-inside space-y-1.5 pl-1">
                          {addedItems.map((item, idx) => (
                            <li key={idx} className="text-xs leading-relaxed" style={{ color: textPrimary }}>
                              {item[lang] || item.id}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Changed */}
                    {changedItems.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span
                            className="px-2 py-0.5 text-[10.5px] font-mono font-bold uppercase rounded"
                            style={{ background: 'rgba(59, 130, 246, 0.15)', color: isDark ? '#60A5FA' : '#2563EB', borderRadius: '4px' }}
                          >
                            Changed
                          </span>
                          <span className="text-[11px] font-mono" style={{ color: textSecondary }}>
                            ({changedItems.length})
                          </span>
                        </div>
                        <ul className="list-disc list-inside space-y-1.5 pl-1">
                          {changedItems.map((item, idx) => (
                            <li key={idx} className="text-xs leading-relaxed" style={{ color: textPrimary }}>
                              {item[lang] || item.id}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Fixed */}
                    {fixedItems.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span
                            className="px-2 py-0.5 text-[10.5px] font-mono font-bold uppercase rounded"
                            style={{ background: 'rgba(245, 158, 11, 0.15)', color: isDark ? '#FBBF24' : '#D97706', borderRadius: '4px' }}
                          >
                            Fixed
                          </span>
                          <span className="text-[11px] font-mono" style={{ color: textSecondary }}>
                            ({fixedItems.length})
                          </span>
                        </div>
                        <ul className="list-disc list-inside space-y-1.5 pl-1">
                          {fixedItems.map((item, idx) => (
                            <li key={idx} className="text-xs leading-relaxed" style={{ color: textPrimary }}>
                              {item[lang] || item.id}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </article>
            )
          })}
        </div>
          </div>
        )}
      </div>

      {/* ───────────────────────────────────────────────────────────────── */}
      {/* NOTIFICATION RECIPIENTS MANAGER (ADMIN ONLY)                      */}
      {/* ───────────────────────────────────────────────────────────────── */}
      {showRecipientsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div
            className="w-full max-w-2xl rounded-lg border shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            style={{ background: cardBg, borderColor, borderRadius: '8px' }}
          >
            {/* Modal Header */}
            <div className="p-4 border-b flex items-start justify-between gap-3" style={{ borderColor }}>
              <div>
                <h3 className="text-sm font-bold tracking-tight flex items-center gap-2" style={{ color: textPrimary, margin: 0 }}>
                  <FontAwesomeIcon icon={faBell} className="text-amber-500 text-xs" />
                  <span>{tr('feedback.recipientsModalTitle', 'Pengaturan Penerima Notifikasi Bot')}</span>
                </h3>
                <p className="text-xs mt-1 leading-relaxed" style={{ color: textSecondary, margin: '2px 0 0 0' }}>
                  {tr('feedback.recipientsModalDesc', 'Staf yang didaftarkan di sini akan menerima notifikasi otomatis via bot Google Chat setiap kali ada laporan kendala baru.')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowRecipientsModal(false)}
                className="p-1 rounded text-lg hover:opacity-70 cursor-pointer"
                style={{ color: textSecondary }}
              >
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto overflow-x-hidden">
              {/* If Table Missing Alert */}
              {recipientsTableMissing && (
                <div
                  className="p-4 rounded border text-xs space-y-2.5"
                  style={{
                    background: isDark ? 'rgba(239, 68, 68, 0.1)' : '#FEF2F2',
                    borderColor: isDark ? 'rgba(239, 68, 68, 0.3)' : '#FECACA',
                    borderRadius: '6px'
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-red-600 dark:text-red-400">
                      ⚠️ {tr('feedback.tableMissingTitle', 'Tabel Belum Dibuat di Supabase')}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const sql = `CREATE TABLE IF NOT EXISTS public.system_feedback_recipients (\n  id SERIAL PRIMARY KEY,\n  user_id INTEGER NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,\n  is_active BOOLEAN NOT NULL DEFAULT true,\n  notify_on_new_ticket BOOLEAN NOT NULL DEFAULT true,\n  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),\n  UNIQUE(user_id)\n);\n\nALTER TABLE public.system_feedback_recipients ENABLE ROW LEVEL SECURITY;\nCREATE POLICY "Allow all read feedback recipients" ON public.system_feedback_recipients FOR SELECT USING (true);\nCREATE POLICY "Allow all manage feedback recipients" ON public.system_feedback_recipients FOR ALL USING (true) WITH CHECK (true);`
                        navigator.clipboard.writeText(sql)
                        setSqlCopied(true)
                        setTimeout(() => setSqlCopied(false), 2000)
                      }}
                      className="px-2.5 py-1 text-[11px] font-semibold rounded border bg-red-600 text-white cursor-pointer hover:bg-red-700 transition-colors flex items-center gap-1"
                    >
                      <FontAwesomeIcon icon={faCopy} />
                      <span>{sqlCopied ? tr('feedback.copiedSql', 'SQL Disalin!') : tr('feedback.btnCopySql', 'Salin SQL')}</span>
                    </button>
                  </div>
                  <p style={{ color: textSecondary, margin: 0 }}>
                    {tr('feedback.tableMissingDesc', 'Tabel system_feedback_recipients belum tersedia. Silakan jalankan script SQL berikut di Supabase SQL Editor:')}
                  </p>
                  <pre
                    className="p-2.5 rounded font-mono text-[10px] overflow-x-auto leading-relaxed"
                    style={{ background: isDark ? '#18181B' : '#FFFFFF', border: `1px solid ${borderColor}`, color: textPrimary }}
                  >
{`CREATE TABLE IF NOT EXISTS public.system_feedback_recipients (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  notify_on_new_ticket BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);`}
                  </pre>
                </div>
              )}

              {/* Add Recipient Selector */}
              <div>
                <label className="block text-xs font-mono font-medium uppercase tracking-wider mb-1.5" style={{ color: textSecondary }}>
                  {tr('feedback.addRecipientPrompt', 'Pilih Staf untuk Ditambahkan:')}
                </label>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <select
                      value={selectedStaffId}
                      onChange={(e) => setSelectedStaffId(e.target.value)}
                      className="w-full min-w-0 px-3 py-2 text-xs rounded border focus:outline-none cursor-pointer truncate"
                      style={{ background: inputBg, borderColor, color: textPrimary, borderRadius: '6px' }}
                    >
                      <option value="">-- {tr('feedback.selectStaffPlaceholder', 'Pilih Staf Penerima')} --</option>
                      {staffList.map(st => {
                        const name = `${st.user_nama_depan || ''} ${st.user_nama_belakang || ''}`.trim()
                        const email = st.user_email ? ` (${st.user_email})` : ''
                        const role = st.role?.role_name ? ` - ${st.role.role_name}` : ''
                        return (
                          <option key={st.user_id} value={st.user_id}>
                            {name}{email}{role}
                          </option>
                        )
                      })}
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddRecipient}
                    disabled={!selectedStaffId || savingRecipient}
                    className="px-4 py-2 text-xs font-semibold rounded border cursor-pointer shrink-0 whitespace-nowrap transition-all flex items-center justify-center gap-1.5"
                    style={{
                      background: isDark ? '#2563EB' : '#0284C7',
                      borderColor: isDark ? '#3B82F6' : '#0369A1',
                      color: '#FFFFFF',
                      borderRadius: '6px',
                      opacity: (!selectedStaffId || savingRecipient) ? 0.6 : 1
                    }}
                  >
                    {savingRecipient ? <FontAwesomeIcon icon={faSpinner} className="animate-spin text-xs" /> : <FontAwesomeIcon icon={faPlus} className="text-xs" />}
                    <span>{tr('feedback.btnAddRecipient', 'Tambah Penerima')}</span>
                  </button>
                </div>
              </div>

              {/* Recipients List */}
              <div className="space-y-2 pt-2 border-t" style={{ borderColor }}>
                <span className="text-xs font-mono font-medium uppercase tracking-wider block" style={{ color: textSecondary }}>
                  Daftar Penerima Aktif ({recipients.length})
                </span>

                {loadingRecipients ? (
                  <div className="p-6 text-center text-xs font-mono" style={{ color: textSecondary }}>
                    <FontAwesomeIcon icon={faSpinner} className="animate-spin mr-2" />
                    <span>Memuat daftar penerima...</span>
                  </div>
                ) : recipients.length === 0 ? (
                  <div className="p-6 rounded border text-center text-xs" style={{ background: inputBg, borderColor, borderRadius: '6px', color: textSecondary }}>
                    Belum ada staf yang didaftarkan sebagai penerima notifikasi bot. Pilih staf di atas dan klik tombol tambah.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {recipients.map(r => {
                      const u = r.user || {}
                      const fullName = `${u.user_nama_depan || ''} ${u.user_nama_belakang || ''}`.trim() || 'Staf'
                      const roleName = u.role?.role_name || 'Staff'

                      return (
                        <div
                          key={r.id}
                          className="p-3 rounded border flex items-center justify-between gap-3"
                          style={{ background: inputBg, borderColor, borderRadius: '6px' }}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold truncate" style={{ color: textPrimary }}>
                                {fullName}
                              </span>
                              <span
                                className="px-1.5 py-0.2 text-[9.5px] font-mono rounded font-semibold"
                                style={{ background: isDark ? '#3F3F46' : '#E4E4E7', color: textPrimary }}
                              >
                                {roleName}
                              </span>
                            </div>
                            <p className="text-[11px] font-mono mt-0.5 truncate" style={{ color: textSecondary, margin: 0 }}>
                              {u.user_email || 'Tidak ada email'}
                            </p>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleToggleRecipient(r)}
                              className={`px-2.5 py-1 text-[11px] font-mono font-semibold rounded border cursor-pointer transition-colors ${r.is_active ? 'bg-emerald-500/15 border-emerald-500 text-emerald-600 dark:text-emerald-400' : 'bg-zinc-500/15 border-zinc-500 text-zinc-500'}`}
                              style={{ borderRadius: '4px' }}
                            >
                              {r.is_active ? tr('feedback.recipientStatusActive', 'Aktif') : tr('feedback.recipientStatusInactive', 'Nonaktif')}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteRecipient(r.id)}
                              className="px-2 py-1 text-xs rounded border text-red-500 hover:bg-red-500/10 cursor-pointer transition-colors"
                              style={{ borderColor: 'rgba(239, 68, 68, 0.3)', borderRadius: '4px' }}
                              title="Hapus penerima"
                            >
                              <FontAwesomeIcon icon={faTrashAlt} />
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="pt-3 border-t flex justify-end" style={{ borderColor }}>
                <button
                  type="button"
                  onClick={() => setShowRecipientsModal(false)}
                  className="px-4 py-1.5 text-xs font-semibold rounded border cursor-pointer"
                  style={{ borderColor, color: textSecondary, borderRadius: '6px' }}
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
