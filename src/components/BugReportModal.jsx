'use client'

import React, { useState, useEffect, useRef, useMemo } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useTheme } from '@/lib/theme'
import { useI18n } from '@/lib/i18n'
import { supabase } from '@/lib/supabase'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faBug,
  faLightbulb,
  faTimes,
  faSpinner,
  faUpload,
  faTrashAlt,
  faImage,
  faExternalLinkAlt,
  faCheckCircle,
  faPaperPlane,
  faHeadset,
  faClock,
  faTools,
  faSearch,
  faSyncAlt,
  faCog,
  faPlus,
  faUser,
  faArrowLeft,
  faTasks,
  faChevronRight
} from '@fortawesome/free-solid-svg-icons'

export default function BugReportModal({ isOpen, onClose, onSuccess, initialTab = 'report' }) {
  const router = useRouter()
  const pathname = usePathname()
  const { theme, isDark } = useTheme()
  const { t, lang } = useI18n()
  const dateLocale = lang === 'zh' ? 'zh-CN' : lang === 'en' ? 'en-US' : 'id-ID'

  // Safe multilingual i18n lookup helper with reactive lang fallback
  const tr = (key, fallback) => {
    const val = t(key)
    if (val && typeof val === 'string' && val !== key) {
      return val
    }
    if (fallback && typeof fallback === 'object') {
      return fallback[lang] || fallback.en || fallback.id || ''
    }
    return fallback || ''
  }

  // Active Tab: 'report' (Ongoing & Report) | 'tickets' (My Tickets)
  const [activeTab, setActiveTab] = useState(initialTab)

  // View Mode inside Tab 1: 'overview' (2 Action Buttons + Ongoing list) | 'form' (Submission Form)
  const [viewMode, setViewMode] = useState('overview')

  // Filter for ongoing items: 'all' | 'bug' | 'feature'
  const [ongoingFilter, setOngoingFilter] = useState('all')

  // Current logged in user & role
  const [currentUser, setCurrentUser] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)

  // ── FORM STATE ─────────────────────────────────────────────────────────────
  const [formType, setFormType] = useState('bug') // 'bug' | 'feature'
  const [formTitle, setFormTitle] = useState('')
  const [formPageUrl, setFormPageUrl] = useState('')
  const [formPriority, setFormPriority] = useState('medium')
  const [formDescription, setFormDescription] = useState('')
  const [formAttachmentUrl, setFormAttachmentUrl] = useState('')
  const [attachmentFileName, setAttachmentFileName] = useState('')
  const [uploadingAttachment, setUploadingAttachment] = useState(false)
  const [uploadAttachmentError, setUploadAttachmentError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const fileInputRef = useRef(null)

  // ── TICKETS STATE ──────────────────────────────────────────────────────────
  const [feedbacks, setFeedbacks] = useState([])
  const [loadingTickets, setLoadingTickets] = useState(false)
  const [adminScope, setAdminScope] = useState('my') // 'my' | 'all'
  const [ticketTypeFilter, setTicketTypeFilter] = useState('all') // 'all' | 'bug' | 'feature'
  const [ticketStatusFilter, setTicketStatusFilter] = useState('all')
  const [ticketSearch, setTicketSearch] = useState('')

  // Admin Quick Status Editor state
  const [editingTicket, setEditingTicket] = useState(null)
  const [adminStatus, setAdminStatus] = useState('')
  const [adminNotes, setAdminNotes] = useState('')
  const [savingAdmin, setSavingAdmin] = useState(false)

  // ── 1. LOAD USER AND TICKETS ───────────────────────────────────────────────
  const fetchTickets = async () => {
    setLoadingTickets(true)
    try {
      const res = await fetch('/api/system-feedback')
      const json = await res.json()
      if (json.success && Array.isArray(json.data)) {
        setFeedbacks(json.data)
      } else {
        setFeedbacks([])
      }
    } catch (err) {
      console.error('BugReportModal: Error fetching tickets:', err)
      setFeedbacks([])
    } finally {
      setLoadingTickets(false)
    }
  }

  useEffect(() => {
    async function loadUser() {
      try {
        let parsedId = null
        if (typeof window !== 'undefined') {
          const stored = localStorage.getItem('kr_id')
          if (stored) parsedId = parseInt(stored, 10)
        }

        if (!parsedId) {
          const { data: { session } } = await supabase.auth.getSession()
          if (session?.user) {
            const { data: u } = await supabase
              .from('users')
              .select('user_id, user_nama_depan, user_nama_belakang, user_email, user_role_id')
              .eq('auth_user_id', session.user.id)
              .single()
            if (u) {
              setCurrentUser(u)
              checkAdmin(u)
              fetchTickets()
              return
            }
          }
        }

        if (parsedId) {
          const { data: u } = await supabase
            .from('users')
            .select('user_id, user_nama_depan, user_nama_belakang, user_email, user_role_id')
            .eq('user_id', parsedId)
            .single()
          if (u) {
            setCurrentUser(u)
            checkAdmin(u)
            fetchTickets()
            return
          }
        }

        try {
          const ud = JSON.parse(localStorage.getItem('user_data') || '{}')
          if (ud?.user_id) {
            setCurrentUser(ud)
            setIsAdmin(ud?.isAdmin === true || ud?.is_admin === true)
            fetchTickets()
            return
          }
        } catch {
          // Ignore
        }

        fetchTickets()
      } catch (err) {
        console.error('BugReportModal loadUser error:', err)
        fetchTickets()
      }
    }

    const checkAdmin = async (u) => {
      try {
        if (u?.user_role_id) {
          const { data: r } = await supabase
            .from('role')
            .select('role_id, role_name, is_admin')
            .eq('role_id', u.user_role_id)
            .single()
          setIsAdmin(r?.is_admin === true)
        } else {
          setIsAdmin(false)
        }
      } catch {
        setIsAdmin(false)
      }
    }

    if (isOpen) {
      loadUser()
      setFormPageUrl(pathname || (typeof window !== 'undefined' ? window.location.pathname : ''))
      setIsSuccess(false)
      setViewMode('overview')
      if (initialTab) setActiveTab(initialTab)
    }
  }, [isOpen, pathname, initialTab])

  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        if (editingTicket) {
          setEditingTicket(null)
        } else if (viewMode === 'form') {
          setViewMode('overview')
        } else {
          onClose()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, editingTicket, viewMode, onClose])

  // Listen for feedback:created global event
  useEffect(() => {
    const handleCreated = () => {
      fetchTickets()
    }
    window.addEventListener('feedback:created', handleCreated)
    return () => window.removeEventListener('feedback:created', handleCreated)
  }, [])

  // ── 2. TICKETS FILTERING & CALCULATIONS ────────────────────────────────────
  // Ongoing tickets (in_progress, under_review, planned)
  const ongoingTickets = useMemo(() => {
    const list = feedbacks.filter(f => ['in_progress', 'under_review', 'planned'].includes(f.status))
    if (ongoingFilter === 'bug') return list.filter(f => f.type === 'bug')
    if (ongoingFilter === 'feature') return list.filter(f => f.type === 'feature' || f.type === 'feature_request')
    return list
  }, [feedbacks, ongoingFilter])

  const ongoingBugsCount = useMemo(() => {
    return feedbacks.filter(f => ['in_progress', 'under_review', 'planned'].includes(f.status) && f.type === 'bug').length
  }, [feedbacks])

  const ongoingFeaturesCount = useMemo(() => {
    return feedbacks.filter(f => ['in_progress', 'under_review', 'planned'].includes(f.status) && (f.type === 'feature' || f.type === 'feature_request')).length
  }, [feedbacks])

  // Current user's personal tickets
  const myTickets = useMemo(() => {
    if (!currentUser?.user_id) return []
    return feedbacks.filter(f => String(f.user_id) === String(currentUser.user_id))
  }, [feedbacks, currentUser])

  const displayedMyTickets = useMemo(() => {
    let list = (isAdmin && adminScope === 'all') ? feedbacks : myTickets

    if (ticketTypeFilter !== 'all') {
      list = list.filter(t => t.type === ticketTypeFilter)
    }

    if (ticketStatusFilter !== 'all') {
      list = list.filter(t => t.status === ticketStatusFilter)
    }

    if (ticketSearch.trim()) {
      const q = ticketSearch.toLowerCase().trim()
      list = list.filter(t =>
        (t.title && t.title.toLowerCase().includes(q)) ||
        (t.description && t.description.toLowerCase().includes(q)) ||
        (t.author_name && t.author_name.toLowerCase().includes(q))
      )
    }

    return list
  }, [isAdmin, adminScope, feedbacks, myTickets, ticketTypeFilter, ticketStatusFilter, ticketSearch])

  // ── 3. UPLOAD SCREENSHOT TO SUPABASE STORAGE ───────────────────────────────
  const handleFileUpload = async (file) => {
    if (!file) return

    const fileExt = file.name ? file.name.split('.').pop().toLowerCase() : ''
    const isImage = (file.type && file.type.startsWith('image/')) || ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(fileExt)

    if (!isImage) {
      setUploadAttachmentError(
        lang === 'zh' ? '文件格式必须为图片 (PNG, JPG, WEBP, GIF)' : lang === 'en' ? 'File format must be an image (PNG, JPG, WEBP, GIF).' : 'Format file harus berupa gambar (PNG, JPG, WEBP, GIF).'
      )
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setUploadAttachmentError(
        lang === 'zh' ? '图片大小不能超过 10MB' : lang === 'en' ? 'Image size cannot exceed 10MB.' : 'Ukuran gambar maksimal 10MB.'
      )
      return
    }

    setUploadingAttachment(true)
    setUploadAttachmentError('')

    try {
      const formData = new FormData()
      formData.append('file', file)
      if (currentUser?.user_id) {
        formData.append('user_id', String(currentUser.user_id))
      }

      const res = await fetch('/api/system-feedback/upload', {
        method: 'POST',
        body: formData
      })

      const json = await res.json()
      const uploadedUrl = json.publicUrl || json.url

      if (json.success && uploadedUrl) {
        setFormAttachmentUrl(uploadedUrl)
        setAttachmentFileName(file.name)
        setUploadAttachmentError('')
      } else {
        setUploadAttachmentError(
          json.message || (lang === 'zh' ? '上传截图失败' : lang === 'en' ? 'Failed to upload screenshot.' : 'Gagal mengunggah gambar lampiran.')
        )
      }
    } catch (err) {
      console.error('File upload error:', err)
      setUploadAttachmentError(
        lang === 'zh' ? '上传发生网络错误' : lang === 'en' ? 'Network error occurred while uploading.' : 'Terjadi kesalahan koneksi saat mengunggah gambar.'
      )
    } finally {
      setUploadingAttachment(false)
    }
  }

  // ── 4. SUBMIT NEW REPORT ───────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formTitle.trim() || !formDescription.trim()) {
      alert(
        lang === 'zh' ? '请填写标题与详细描述' : lang === 'en' ? 'Please fill in both title and description' : 'Harap isi judul dan deskripsi laporan.'
      )
      return
    }

    setSubmitting(true)
    try {
      const payload = {
        user_id: currentUser?.user_id || 1,
        author_name: currentUser?.user_nama_depan
          ? `${currentUser.user_nama_depan} ${currentUser.user_nama_belakang || ''}`.trim()
          : 'Staff',
        type: formType,
        title: formTitle.trim(),
        description: formDescription.trim(),
        page_url: formPageUrl.trim() || pathname || null,
        priority: formPriority,
        attachment_url: formAttachmentUrl.trim() || null
      }

      const res = await fetch('/api/system-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const json = await res.json()
      if (json.success) {
        fetchTickets()
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('feedback:created', { detail: json.data }))
        }
        if (onSuccess) onSuccess(json.data)
        setIsSuccess(true)
      } else {
        alert(json.message || (lang === 'zh' ? '提交报告失败' : lang === 'en' ? 'Failed to submit report.' : 'Gagal mengirimkan laporan.'))
      }
    } catch (err) {
      console.error('Submit feedback error:', err)
      alert(lang === 'zh' ? '提交发生错误' : lang === 'en' ? 'An error occurred while submitting.' : 'Terjadi kesalahan saat mengirim laporan.')
    } finally {
      setSubmitting(false)
    }
  }

  // ── 5. ADMIN UPDATE TICKET STATUS ─────────────────────────────────────────
  const handleAdminUpdateStatus = async () => {
    if (!editingTicket || !isAdmin) return
    setSavingAdmin(true)
    try {
      const res = await fetch(`/api/system-feedback/${editingTicket.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: adminStatus,
          admin_notes: adminNotes
        })
      })
      const json = await res.json()
      if (json.success) {
        fetchTickets()
        setEditingTicket(null)
      } else {
        alert(json.message || (lang === 'zh' ? '更新状态失败' : lang === 'en' ? 'Failed to update status.' : 'Gagal memperbarui status.'))
      }
    } catch (err) {
      console.error('Admin update status error:', err)
      alert(lang === 'zh' ? '更新状态发生错误' : lang === 'en' ? 'An error occurred while updating status.' : 'Terjadi kesalahan saat memperbarui status.')
    } finally {
      setSavingAdmin(false)
    }
  }

  const handleOpenForm = (type) => {
    setFormType(type)
    setViewMode('form')
    setIsSuccess(false)
  }

  const handleResetForm = () => {
    setFormTitle('')
    setFormDescription('')
    setFormAttachmentUrl('')
    setAttachmentFileName('')
    setUploadAttachmentError('')
    setIsSuccess(false)
  }

  const handleClose = () => {
    handleResetForm()
    setEditingTicket(null)
    setViewMode('overview')
    onClose()
  }

  if (!isOpen) return null

  // ── DESIGN TOKENS ──────────────────────────────────────────────────────────
  const cardBg = isDark ? '#18181B' : '#FFFFFF'
  const subBg = isDark ? '#27272A' : '#F4F4F5'
  const inputBg = isDark ? '#27272A' : '#FAFAFA'
  const borderColor = isDark ? '#27272A' : '#E4E4E7'
  const textPrimary = isDark ? '#F4F4F5' : '#18181B'
  const textSecondary = isDark ? '#A1A1AA' : '#71717A'

  const getStatusBadge = (status) => {
    switch (status) {
      case 'resolved':
        return { label: lang === 'zh' ? '已解决' : lang === 'en' ? 'Resolved / Live' : 'Selesai / Live', bg: isDark ? 'rgba(16, 185, 129, 0.2)' : '#D1FAE5', text: isDark ? '#34D399' : '#065F46', border: '#10B981' }
      case 'in_progress':
        return { label: lang === 'zh' ? '处理中' : lang === 'en' ? 'In Progress' : 'Sedang Dikerjakan', bg: isDark ? 'rgba(59, 130, 246, 0.2)' : '#DBEAFE', text: isDark ? '#60A5FA' : '#1E40AF', border: '#3B82F6' }
      case 'under_review':
        return { label: lang === 'zh' ? '审核中' : lang === 'en' ? 'Under Review' : 'Sedang Ditinjau', bg: isDark ? 'rgba(245, 158, 11, 0.2)' : '#FEF3C7', text: isDark ? '#FBBF24' : '#92400E', border: '#F59E0B' }
      case 'planned':
        return { label: lang === 'zh' ? '已规划' : lang === 'en' ? 'Planned' : 'Direncanakan', bg: isDark ? 'rgba(139, 92, 246, 0.2)' : '#EDE9FE', text: isDark ? '#A78BFA' : '#5B21B6', border: '#8B5CF6' }
      case 'declined':
        return { label: lang === 'zh' ? '已关闭' : lang === 'en' ? 'Declined' : 'Ditolak', bg: isDark ? 'rgba(107, 114, 128, 0.2)' : '#F3F4F6', text: isDark ? '#9CA3AF' : '#4B5563', border: '#6B7280' }
      case 'submitted':
      default:
        return { label: lang === 'zh' ? '已提交' : lang === 'en' ? 'Submitted' : 'Terkirim', bg: isDark ? 'rgba(14, 165, 233, 0.2)' : '#E0F2FE', text: isDark ? '#38BDF8' : '#0369A1', border: '#0284C7' }
    }
  }

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'critical':
        return { label: lang === 'zh' ? '紧急' : lang === 'en' ? 'CRITICAL' : 'KRITIS', bg: 'rgba(239, 68, 68, 0.2)', text: '#EF4444' }
      case 'high':
        return { label: lang === 'zh' ? '高' : lang === 'en' ? 'HIGH' : 'TINGGI', bg: 'rgba(249, 115, 22, 0.2)', text: '#F97316' }
      case 'low':
        return { label: lang === 'zh' ? '低' : lang === 'en' ? 'LOW' : 'RENDAH', bg: 'rgba(107, 114, 128, 0.2)', text: '#9CA3AF' }
      case 'medium':
      default:
        return { label: lang === 'zh' ? '中' : lang === 'en' ? 'MEDIUM' : 'SEDANG', bg: 'rgba(59, 130, 246, 0.2)', text: isDark ? '#60A5FA' : '#2563EB' }
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
      <div
        className="w-full max-w-3xl rounded-lg border shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150"
        style={{ background: cardBg, borderColor, borderRadius: '10px' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── MODAL HEADER ───────────────────────────────────────────────── */}
        <div className="px-5 py-4 border-b flex items-start justify-between gap-3 shrink-0" style={{ borderColor }}>
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
              style={{
                background: activeTab === 'report'
                  ? (viewMode === 'form'
                    ? (formType === 'bug' ? (isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEE2E2') : (isDark ? 'rgba(234, 179, 8, 0.15)' : '#FEF3C7'))
                    : (isDark ? 'rgba(59, 130, 246, 0.15)' : '#E0F2FE'))
                  : (isDark ? 'rgba(139, 92, 246, 0.15)' : '#EDE9FE'),
                color: activeTab === 'report'
                  ? (viewMode === 'form'
                    ? (formType === 'bug' ? '#EF4444' : '#EAB308')
                    : (isDark ? '#60A5FA' : '#0284C7'))
                  : (isDark ? '#A78BFA' : '#7C3AED')
              }}
            >
              <FontAwesomeIcon
                icon={activeTab === 'report' ? (viewMode === 'form' ? (formType === 'bug' ? faBug : faLightbulb) : faTasks) : faHeadset}
                className="text-base"
              />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight" style={{ color: textPrimary, margin: 0 }}>
                {activeTab === 'report'
                  ? (viewMode === 'form'
                    ? (formType === 'bug'
                      ? tr('feedback.formBugHeader', { id: 'Laporkan Bug / Kendala Error', en: 'Report Bug / Issue', zh: '报告系统错误 / 故障' })
                      : tr('feedback.formFeatureHeader', { id: 'Usulkan Fitur Baru', en: 'Propose New Feature', zh: '提出新功能建议' }))
                    : tr('feedback.modalReportTitle', { id: 'Layanan Bantuan & Transparansi Project', en: 'Support Desk & System Transparency', zh: '客户服务台与项目透明度' }))
                  : tr('feedback.modalTicketsTitle', { id: 'Layanan Bantuan & Tiket Saya', en: 'Support Desk & My Tickets', zh: '客户服务台与我的工单' })}
              </h3>
              <p className="text-xs" style={{ color: textSecondary, margin: '2px 0 0 0' }}>
                {activeTab === 'report'
                  ? (viewMode === 'form'
                    ? tr('feedback.modalFormDesc', { id: 'Isi detail di bawah agar tim pengembang dapat segera menindaklanjuti kendala Anda.', en: 'Provide details so our development team can quickly investigate and address the issue.', zh: '请填写下方信息以便开发团队快速定位并处理您的问题。' })
                    : tr('feedback.ongoingSectionDesc', { id: 'Transparansi sistem: pantau bug yang sedang diperbaiki atau ajukan laporan baru.', en: 'Transparency for all staff: view active fixes or submit a new report.', zh: '全员透明公开：查看当前正在处理的修复项目或提交新报告。' }))
                  : tr('feedback.modalTicketsDesc', { id: 'Pantau perkembangan status tiket dan catatan solusi dari tim pengembang.', en: 'Track your ticket lifecycle and developer resolution notes.', zh: '跟踪您提交的工单处理状态及开发人员答复。' })}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="w-8 h-8 rounded-md flex items-center justify-center transition-colors hover:bg-neutral-500/10 cursor-pointer shrink-0"
            style={{ color: textSecondary }}
            aria-label="Close"
          >
            <FontAwesomeIcon icon={faTimes} className="text-sm" />
          </button>
        </div>

        {/* ── MODAL TAB SWITCHER (ONGOING & REPORT vs TIKET SAYA) ─────────── */}
        <div
          className="px-5 border-b flex items-center justify-between gap-2 shrink-0"
          style={{ background: isDark ? '#1F1F23' : '#F9FAFB', borderColor }}
        >
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              type="button"
              onClick={() => { setActiveTab('report'); setIsSuccess(false); }}
              className="py-2.5 px-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer"
              style={{
                borderBottomColor: activeTab === 'report' ? (isDark ? '#60A5FA' : '#0284C7') : 'transparent',
                color: activeTab === 'report' ? (isDark ? '#60A5FA' : '#0284C7') : textSecondary
              }}
            >
              <FontAwesomeIcon icon={faTasks} className="text-[11px]" />
              <span>{tr('feedback.tabOngoingAndReport', { id: 'Ongoing & Laporkan', en: 'Ongoing & Report', zh: '进行中与提交' })}</span>
              {ongoingTickets.length > 0 && (
                <span
                  className="text-[10px] font-bold px-1.5 py-0.2 rounded-full"
                  style={{
                    background: isDark ? 'rgba(59, 130, 246, 0.2)' : '#DBEAFE',
                    color: isDark ? '#93C5FD' : '#1E40AF'
                  }}
                >
                  {ongoingTickets.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => { setActiveTab('tickets'); fetchTickets(); }}
              className="py-2.5 px-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer"
              style={{
                borderBottomColor: activeTab === 'tickets' ? (isDark ? '#60A5FA' : '#0284C7') : 'transparent',
                color: activeTab === 'tickets' ? (isDark ? '#60A5FA' : '#0284C7') : textSecondary
              }}
            >
              <FontAwesomeIcon icon={faHeadset} className="text-[11px]" />
              <span>{tr('feedback.tabMyTickets', { id: 'Tiket Saya', en: 'My Tickets', zh: '我的工单' })}</span>
              <span
                className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                style={{
                  background: activeTab === 'tickets' ? (isDark ? '#2563EB' : '#0284C7') : (isDark ? '#27272A' : '#E4E4E7'),
                  color: activeTab === 'tickets' ? '#FFFFFF' : textPrimary
                }}
              >
                {myTickets.length}
              </span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => fetchTickets()}
            title="Refresh tickets"
            className="px-2 py-1 text-xs rounded border transition-colors cursor-pointer flex items-center gap-1.5"
            style={{ borderColor, color: textSecondary, borderRadius: '4px' }}
          >
            <FontAwesomeIcon icon={faSyncAlt} className={`text-[10px] ${loadingTickets ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline text-[11px]">Refresh</span>
          </button>
        </div>

        {/* ── MODAL BODY: TAB 1 (ONGOING OVERVIEW vs SUBMISSION FORM) ─────── */}
        {activeTab === 'report' && (
          <div className="flex-1 overflow-y-auto p-5">
            {/* ── SUB-VIEW A: OVERVIEW (2 ACTION BUTTONS + ONGOING STREAM) ── */}
            {viewMode === 'overview' && (
              <div className="space-y-6">
                {/* 2 Prominent Action Cards */}
                <div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {/* Action 1: Report Bug */}
                    <button
                      type="button"
                      onClick={() => handleOpenForm('bug')}
                      className="p-4 rounded-lg border text-left transition-all cursor-pointer group hover:shadow-md flex items-center justify-between gap-3 active:scale-[0.99]"
                      style={{
                        background: isDark ? 'rgba(239, 68, 68, 0.08)' : '#FEF2F2',
                        borderColor: isDark ? 'rgba(239, 68, 68, 0.3)' : '#FECACA',
                        borderRadius: '8px'
                      }}
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-transform group-hover:scale-105"
                          style={{
                            background: isDark ? 'rgba(239, 68, 68, 0.2)' : '#FEE2E2',
                            color: '#EF4444'
                          }}
                        >
                          <FontAwesomeIcon icon={faBug} className="text-lg" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold truncate group-hover:text-red-500 transition-colors" style={{ color: textPrimary, margin: 0 }}>
                            {tr('feedback.btnActionReportBug', { id: 'Laporkan Bug / Error', en: 'Report Bug / Issue', zh: '报告错误 / 缺陷' })}
                          </h4>
                          <p className="text-[11px] leading-snug mt-0.5 line-clamp-2" style={{ color: textSecondary, margin: '2px 0 0 0' }}>
                            {tr('feedback.btnActionReportBugDesc', { id: 'Laporkan masalah teknis, error, atau kendala sistem', en: 'Report technical bugs, errors, or broken features', zh: '提交系统错误、运行异常或故障' })}
                          </p>
                        </div>
                      </div>
                      <FontAwesomeIcon icon={faChevronRight} className="text-xs text-red-400 shrink-0 transition-transform group-hover:translate-x-1" />
                    </button>

                    {/* Action 2: Propose Feature */}
                    <button
                      type="button"
                      onClick={() => handleOpenForm('feature')}
                      className="p-4 rounded-lg border text-left transition-all cursor-pointer group hover:shadow-md flex items-center justify-between gap-3 active:scale-[0.99]"
                      style={{
                        background: isDark ? 'rgba(245, 158, 11, 0.08)' : '#FFFBEB',
                        borderColor: isDark ? 'rgba(245, 158, 11, 0.3)' : '#FDE68A',
                        borderRadius: '8px'
                      }}
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-transform group-hover:scale-105"
                          style={{
                            background: isDark ? 'rgba(245, 158, 11, 0.2)' : '#FEF3C7',
                            color: '#F59E0B'
                          }}
                        >
                          <FontAwesomeIcon icon={faLightbulb} className="text-lg" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold truncate group-hover:text-amber-500 transition-colors" style={{ color: textPrimary, margin: 0 }}>
                            {tr('feedback.btnActionProposeFeature', { id: 'Usulkan Fitur Baru', en: 'Request New Feature', zh: '提出新功能建议' })}
                          </h4>
                          <p className="text-[11px] leading-snug mt-0.5 line-clamp-2" style={{ color: textSecondary, margin: '2px 0 0 0' }}>
                            {tr('feedback.btnActionProposeFeatureDesc', { id: 'Ajukan ide perbaikan fitur atau modul baru sekolah', en: 'Propose workflow improvements or new feature ideas', zh: '提交功能优化构想或新模块需求' })}
                          </p>
                        </div>
                      </div>
                      <FontAwesomeIcon icon={faChevronRight} className="text-xs text-amber-500 shrink-0 transition-transform group-hover:translate-x-1" />
                    </button>
                  </div>
                </div>

                {/* ── ONGOING PROJECTS & ACTIVE FIXES STREAM ─────────────────── */}
                <div className="space-y-3 pt-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-2.5" style={{ borderColor }}>
                    <div className="flex items-center gap-2">
                      <FontAwesomeIcon icon={faTools} className="text-xs text-blue-500" />
                      <h4 className="text-xs font-bold uppercase tracking-wider" style={{ color: textPrimary, margin: 0 }}>
                        {tr('feedback.ongoingSectionTitle', { id: 'Perbaikan & Project yang Sedang Berjalan', en: 'Active Fixes & Ongoing Development', zh: '正在处理与开发中的项目' })}
                      </h4>
                      <span
                        className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full"
                        style={{
                          background: isDark ? 'rgba(59, 130, 246, 0.2)' : '#DBEAFE',
                          color: isDark ? '#93C5FD' : '#1E40AF'
                        }}
                      >
                        {ongoingTickets.length}
                      </span>
                    </div>

                    {/* Filter pills */}
                    <div className="inline-flex rounded border p-0.5" style={{ background: inputBg, borderColor, borderRadius: '4px' }}>
                      <button
                        type="button"
                        onClick={() => setOngoingFilter('all')}
                        className={`px-2 py-0.5 text-[10.5px] font-semibold rounded cursor-pointer transition-colors ${ongoingFilter === 'all' ? (isDark ? 'bg-zinc-700 text-white' : 'bg-neutral-800 text-white') : ''}`}
                        style={{ color: ongoingFilter === 'all' ? '#FFFFFF' : textSecondary, borderRadius: '3px' }}
                      >
                        {tr('feedback.filterAllOngoing', { id: 'Semua', en: 'All', zh: '全部' })} ({ongoingBugsCount + ongoingFeaturesCount})
                      </button>
                      <button
                        type="button"
                        onClick={() => setOngoingFilter('bug')}
                        className={`px-2 py-0.5 text-[10.5px] font-semibold rounded cursor-pointer transition-colors ${ongoingFilter === 'bug' ? 'bg-red-500 text-white' : ''}`}
                        style={{ color: ongoingFilter === 'bug' ? '#FFFFFF' : textSecondary, borderRadius: '3px' }}
                      >
                        🐞 Bug ({ongoingBugsCount})
                      </button>
                      <button
                        type="button"
                        onClick={() => setOngoingFilter('feature')}
                        className={`px-2 py-0.5 text-[10.5px] font-semibold rounded cursor-pointer transition-colors ${ongoingFilter === 'feature' ? 'bg-amber-500 text-white' : ''}`}
                        style={{ color: ongoingFilter === 'feature' ? '#FFFFFF' : textSecondary, borderRadius: '3px' }}
                      >
                        💡 Fitur ({ongoingFeaturesCount})
                      </button>
                    </div>
                  </div>

                  {/* List of Ongoing Items */}
                  {loadingTickets ? (
                    <div className="p-8 text-center text-xs font-mono" style={{ color: textSecondary }}>
                      <FontAwesomeIcon icon={faSpinner} className="animate-spin text-lg mb-2" />
                      <p>{tr('feedback.loading', { id: 'MEMUAT DAFTAR ONGOING...', en: 'LOADING ONGOING ITEMS...', zh: '正在加载进行中项目...' })}</p>
                    </div>
                  ) : ongoingTickets.length === 0 ? (
                    <div
                      className="p-8 rounded-lg border flex flex-col items-center justify-center text-center"
                      style={{ background: cardBg, borderColor, borderRadius: '8px' }}
                    >
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center mb-3"
                        style={{ background: isDark ? 'rgba(16, 185, 129, 0.15)' : '#D1FAE5', color: '#10B981' }}
                      >
                        <FontAwesomeIcon icon={faCheckCircle} className="text-lg" />
                      </div>
                      <h4 className="text-sm font-semibold text-center mb-1" style={{ color: textPrimary, margin: 0 }}>
                        {tr('feedback.emptyOngoingTitle', { id: 'Tidak Ada Kendala yang Sedang Berjalan', en: 'No Ongoing Issues Right Now', zh: '当前暂无进行中的处理项目' })}
                      </h4>
                      <p className="text-xs text-center max-w-md mx-auto leading-relaxed mt-1" style={{ color: textSecondary }}>
                        {tr('feedback.emptyOngoingDesc', { id: 'Semua perbaikan sebelumnya telah selesai. Klik tombol di atas untuk melaporkan kendala atau mengusulkan fitur baru.', en: 'All previous issues have been resolved. Click a button above to report a bug or request a feature.', zh: '此前的所有问题均已处理完毕。如需反馈新问题或建议，请点击上方按钮。' })}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {ongoingTickets.map(item => {
                        const statusInfo = getStatusBadge(item.status)
                        const priorityInfo = getPriorityBadge(item.priority)
                        const isBug = item.type === 'bug'
                        const formattedDate = new Date(item.created_at).toLocaleDateString(dateLocale, {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })

                        return (
                          <div
                            key={item.id}
                            className="p-3.5 rounded-lg border transition-all flex flex-col gap-2"
                            style={{ background: subBg, borderColor, borderRadius: '8px' }}
                          >
                            {/* Badges & Meta */}
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span
                                  className="px-2 py-0.5 text-[9.5px] font-mono font-bold rounded"
                                  style={{
                                    background: isBug ? 'rgba(239, 68, 68, 0.15)' : 'rgba(139, 92, 246, 0.15)',
                                    color: isBug ? (isDark ? '#F87171' : '#DC2626') : (isDark ? '#C084FC' : '#7C3AED'),
                                    borderRadius: '4px'
                                  }}
                                >
                                  {isBug ? `🐞 BUG` : `💡 FITUR`}
                                </span>

                                <span
                                  className="px-2 py-0.5 text-[9.5px] font-mono font-semibold rounded border"
                                  style={{ background: statusInfo.bg, color: statusInfo.text, borderColor: statusInfo.border, borderRadius: '4px' }}
                                >
                                  {statusInfo.label}
                                </span>

                                <span
                                  className="px-1.5 py-0.5 text-[9px] font-mono font-bold rounded"
                                  style={{ background: priorityInfo.bg, color: priorityInfo.text, borderRadius: '4px' }}
                                >
                                  {priorityInfo.label}
                                </span>
                              </div>

                              <span className="text-[10px] font-mono" style={{ color: textSecondary }}>
                                {formattedDate}
                              </span>
                            </div>

                            {/* Title & Desc */}
                            <div>
                              <h4 className="text-xs font-bold tracking-tight" style={{ color: textPrimary, margin: 0 }}>
                                {item.title}
                              </h4>
                              <p className="text-xs leading-relaxed whitespace-pre-wrap mt-1 line-clamp-3" style={{ color: textSecondary, margin: '3px 0 0 0' }}>
                                {item.description}
                              </p>
                            </div>

                            {/* Extra details (URL / Attachment) */}
                            {(item.page_url || item.attachment_url) && (
                              <div className="flex items-center gap-3 text-[10px] font-mono flex-wrap pt-0.5" style={{ color: textSecondary }}>
                                {item.page_url && (
                                  <span className="flex items-center gap-1 truncate max-w-[200px]">
                                    <FontAwesomeIcon icon={faExternalLinkAlt} className="text-[8px]" />
                                    <span>{item.page_url}</span>
                                  </span>
                                )}
                                {item.attachment_url && (
                                  <a
                                    href={item.attachment_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1 hover:underline font-semibold"
                                    style={{ color: isDark ? '#60A5FA' : '#0284C7' }}
                                  >
                                    <FontAwesomeIcon icon={faImage} className="text-[9px]" />
                                    <span>{tr('feedback.viewScreenshot', { id: 'Lihat Screenshot', en: 'View Screenshot', zh: '查看截图' })}</span>
                                  </a>
                                )}
                              </div>
                            )}

                            {/* Developer Notes / Catatan Pengembang */}
                            {item.admin_notes && (
                              <div
                                className="p-2 rounded border text-xs space-y-0.5 mt-1"
                                style={{
                                  background: isDark ? '#1C1917' : '#FFFBEB',
                                  borderColor: isDark ? 'rgba(245, 158, 11, 0.3)' : '#FDE68A',
                                  borderRadius: '6px'
                                }}
                              >
                                <span className="font-semibold text-amber-700 dark:text-amber-400 block text-[10px]">
                                  {tr('feedback.adminNotesHeader', { id: '💬 Catatan Tim Pengembang:', en: '💬 Developer Notes:', zh: '💬 开发团队处理答复：' })}
                                </span>
                                <p className="text-[11px] whitespace-pre-wrap leading-relaxed m-0" style={{ color: textPrimary }}>
                                  {item.admin_notes}
                                </p>
                              </div>
                            )}

                            {/* Admin Action Button */}
                            {isAdmin && (
                              <div className="pt-1 flex items-center justify-end border-t" style={{ borderColor }}>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingTicket(item)
                                    setAdminStatus(item.status)
                                    setAdminNotes(item.admin_notes || '')
                                  }}
                                  className="px-2 py-0.5 text-[10.5px] font-semibold rounded border cursor-pointer flex items-center gap-1 transition-colors"
                                  style={{
                                    background: isDark ? '#27272A' : '#FFFFFF',
                                    borderColor,
                                    color: textPrimary,
                                    borderRadius: '4px'
                                  }}
                                >
                                  <FontAwesomeIcon icon={faCog} className="text-[9px]" />
                                  <span>{tr('feedback.btnManageStatusAdmin', { id: 'Kelola Status (Admin)', en: 'Manage Status (Admin)', zh: '管理状态（管理员）' })}</span>
                                </button>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── SUB-VIEW B: SUBMISSION FORM (AFTER CLICKING A BUTTON) ─── */}
            {viewMode === 'form' && (
              <div>
                {/* Back to overview button */}
                <div className="flex items-center justify-between pb-3 mb-3 border-b" style={{ borderColor }}>
                  <button
                    type="button"
                    onClick={() => { setViewMode('overview'); handleResetForm(); }}
                    className="text-xs font-semibold flex items-center gap-1.5 cursor-pointer hover:underline"
                    style={{ color: isDark ? '#60A5FA' : '#0284C7' }}
                  >
                    <FontAwesomeIcon icon={faArrowLeft} className="text-[10px]" />
                    <span>{tr('feedback.btnBackToOngoing', { id: 'Kembali ke Beranda Ongoing', en: 'Back to Ongoing Overview', zh: '返回进行中概览' })}</span>
                  </button>

                  <span
                    className="px-2.5 py-0.5 text-[11px] font-mono font-bold rounded"
                    style={{
                      background: formType === 'bug' ? (isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEE2E2') : (isDark ? 'rgba(245, 158, 11, 0.15)' : '#FEF3C7'),
                      color: formType === 'bug' ? '#EF4444' : '#F59E0B',
                      borderRadius: '4px'
                    }}
                  >
                    {formType === 'bug' ? '🐞 Form Bug / Error' : '💡 Form Usulan Fitur'}
                  </span>
                </div>

                {isSuccess ? (
                  <div className="p-8 text-center space-y-4 my-auto">
                    <div
                      className="w-14 h-14 rounded-full mx-auto flex items-center justify-center animate-bounce"
                      style={{ background: isDark ? 'rgba(16, 185, 129, 0.2)' : '#D1FAE5', color: '#10B981' }}
                    >
                      <FontAwesomeIcon icon={faCheckCircle} className="text-2xl" />
                    </div>
                    <div>
                      <h4 className="text-base font-bold" style={{ color: textPrimary }}>
                        {tr('feedback.modalSuccessTitle', { id: 'Laporan Berhasil Dikirimkan!', en: 'Report Submitted Successfully!', zh: '报告已成功提交！' })}
                      </h4>
                      <p className="text-xs max-w-sm mx-auto mt-1" style={{ color: textSecondary }}>
                        {tr('feedback.modalSuccessDesc', {
                          id: 'Tiket Anda telah terdaftar dan notifikasi bot telah dikirimkan ke admin. Anda dapat memantau respon pengembang di tab Tiket Saya.',
                          en: 'Your ticket has been queued and admin bot alerts sent. You can track developer progress in the My Tickets tab.',
                          zh: '您的工单已登记并已通知管理员。您可在“我的工单”标签页中跟踪进展与答复。'
                        })}
                      </p>
                    </div>
                    <div className="flex items-center justify-center gap-2.5 pt-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => { setActiveTab('tickets'); setIsSuccess(false); setViewMode('overview'); fetchTickets(); }}
                        className="px-4 py-2 text-xs font-semibold rounded border cursor-pointer flex items-center gap-1.5 shadow-xs"
                        style={{
                          background: isDark ? '#2563EB' : '#0284C7',
                          borderColor: isDark ? '#3B82F6' : '#0369A1',
                          color: '#FFFFFF',
                          borderRadius: '6px'
                        }}
                      >
                        <FontAwesomeIcon icon={faHeadset} />
                        <span>{tr('feedback.btnViewInMyTickets', { id: 'Lihat di Tiket Saya', en: 'View in My Tickets', zh: '前往我的工单查看' })}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => { setViewMode('overview'); handleResetForm(); }}
                        className="px-3.5 py-2 text-xs font-semibold rounded border cursor-pointer transition-colors"
                        style={{ borderColor, color: textPrimary, borderRadius: '6px' }}
                      >
                        <span>{tr('feedback.btnBackToOngoing', { id: 'Kembali ke Beranda Ongoing', en: 'Back to Ongoing Overview', zh: '返回进行中概览' })}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleClose}
                        className="px-3.5 py-2 text-xs font-semibold rounded border cursor-pointer transition-colors"
                        style={{ borderColor, color: textSecondary, borderRadius: '6px' }}
                      >
                        {tr('feedback.btnCancel', { id: 'Tutup', en: 'Close', zh: '关闭' })}
                      </button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Brief Title */}
                    <div>
                      <label className="block text-xs font-semibold mb-1.5" style={{ color: textPrimary }}>
                        {tr('feedback.formTitleLabel', { id: 'Judul Singkat', en: 'Brief Title', zh: '简短标题' })} *
                      </label>
                      <input
                        type="text"
                        required
                        maxLength={150}
                        placeholder={formType === 'bug'
                          ? tr('feedback.formTitlePlaceholderBug', { id: 'cth: Tombol simpan cuti di profil tidak merespon', en: 'e.g. Leave save button is unresponsive on profile page', zh: '例如：个人资料页请假保存按钮无响应' })
                          : tr('feedback.formTitlePlaceholderFeature', { id: 'cth: Tambahkan tombol ekspor laporan ke format PDF', en: 'e.g. Add PDF export button for grade reports', zh: '例如：增加成绩单导出为 PDF 按钮' })}
                        value={formTitle}
                        onChange={(e) => setFormTitle(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded border focus:outline-none focus:ring-1 focus:ring-sky-500"
                        style={{ background: inputBg, borderColor, color: textPrimary, borderRadius: '6px' }}
                      />
                    </div>

                    {/* Module URL & Severity */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold mb-1.5" style={{ color: textPrimary }}>
                          {tr('feedback.formPageUrlLabel', { id: 'Halaman / Modul Terkait', en: 'Related Page / Module URL', zh: '相关页面 / 模块地址' })}
                        </label>
                        <input
                          type="text"
                          placeholder={tr('feedback.formPageUrlPlaceholder', { id: '/data/attendance, /data/students, dll', en: '/data/attendance, /data/students, etc.', zh: '/data/attendance, /data/students 等' })}
                          value={formPageUrl}
                          onChange={(e) => setFormPageUrl(e.target.value)}
                          className="w-full px-3 py-2 text-xs rounded border focus:outline-none"
                          style={{ background: inputBg, borderColor, color: textPrimary, borderRadius: '6px' }}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold mb-1.5" style={{ color: textPrimary }}>
                          {tr('feedback.formPriorityLabel', { id: 'Tingkat Urgensi', en: 'Severity / Urgency Level', zh: '紧急程度' })}
                        </label>
                        <select
                          value={formPriority}
                          onChange={(e) => setFormPriority(e.target.value)}
                          className="w-full px-3 py-2 text-xs rounded border focus:outline-none cursor-pointer"
                          style={{ background: inputBg, borderColor, color: textPrimary, borderRadius: '6px' }}
                        >
                          <option value="low">{tr('feedback.priorityOptLow', { id: 'Rendah (Kosmetik / Saran)', en: 'Low (Cosmetic / Suggestion)', zh: '低（界面优化 / 建议）' })}</option>
                          <option value="medium">{tr('feedback.priorityOptMedium', { id: 'Sedang (Normal / Standar)', en: 'Medium (Standard)', zh: '中（常规标准）' })}</option>
                          <option value="high">{tr('feedback.priorityOptHigh', { id: 'Tinggi (Mengganggu Pekerjaan)', en: 'High (Blocks Workflow)', zh: '高（影响日常工作）' })}</option>
                          <option value="critical">{tr('feedback.priorityOptCritical', { id: 'Kritis (Sistem Error / Blocker)', en: 'Critical (System Down / Blocker)', zh: '紧急（系统崩溃 / 阻碍运行）' })}</option>
                        </select>
                      </div>
                    </div>

                    {/* Detailed Description */}
                    <div>
                      <label className="block text-xs font-semibold mb-1.5" style={{ color: textPrimary }}>
                        {tr('feedback.formDescLabel', { id: 'Deskripsi Lengkap & Langkah Terjadinya', en: 'Detailed Description', zh: '详细描述及重现步骤' })} *
                      </label>
                      <textarea
                        required
                        rows={4}
                        placeholder={formType === 'bug'
                          ? tr('feedback.formDescPlaceholderBug', { id: 'Jelaskan apa yang terjadi, pesan error yang muncul, atau langkah-langkah untuk mereproduksi masalah...', en: 'Describe what happened, any error messages, or steps to reproduce the issue...', zh: '描述具体情况、出现的错误提示或复现步骤...' })
                          : tr('feedback.formDescPlaceholderFeature', { id: 'Jelaskan fitur apa yang Anda usulkan dan bagaimana fitur tersebut dapat mempermudah pekerjaan sehari-hari...', en: 'Describe the feature you are proposing and how it will improve daily workflows...', zh: '描述您建议的新功能以及它如何提高日常工作效率...' })}
                        value={formDescription}
                        onChange={(e) => setFormDescription(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded border focus:outline-none leading-relaxed"
                        style={{ background: inputBg, borderColor, color: textPrimary, borderRadius: '6px' }}
                      />
                    </div>

                    {/* Screenshot Upload direct to Supabase Storage bucket 'attachments' */}
                    <div>
                      <label className="block text-xs font-semibold mb-1.5" style={{ color: textPrimary }}>
                        {tr('feedback.formAttachmentLabel', { id: 'Upload Screenshot / Bukti Masalah (Opsional)', en: 'Upload Screenshot / Proof of Issue (Optional)', zh: '上传错误截图 / 凭证（可选）' })}
                      </label>

                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) handleFileUpload(file)
                        }}
                      />

                      {formAttachmentUrl ? (
                        <div
                          className="p-3 rounded border flex items-center justify-between gap-3"
                          style={{ background: isDark ? 'rgba(59, 130, 246, 0.1)' : '#EFF6FF', borderColor: isDark ? '#2563EB' : '#93C5FD', borderRadius: '6px' }}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <img
                              src={formAttachmentUrl}
                              alt="Screenshot preview"
                              className="w-12 h-12 object-cover rounded border shrink-0"
                              style={{ borderColor }}
                            />
                            <div className="min-w-0">
                              <p className="text-xs font-semibold truncate" style={{ color: textPrimary, margin: 0 }}>
                                {attachmentFileName || 'screenshot-terupload.png'}
                              </p>
                              <a
                                href={formAttachmentUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[11px] hover:underline flex items-center gap-1 mt-0.5"
                                style={{ color: isDark ? '#60A5FA' : '#0284C7' }}
                              >
                                <FontAwesomeIcon icon={faImage} className="text-[10px]" />
                                <span>{tr('feedback.viewFullImage', { id: 'Lihat Gambar Penuh', en: 'View Full Image', zh: '查看完整图片' })}</span>
                                <FontAwesomeIcon icon={faExternalLinkAlt} className="text-[8px]" />
                              </a>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              setFormAttachmentUrl('')
                              setAttachmentFileName('')
                              if (fileInputRef.current) fileInputRef.current.value = ''
                            }}
                            className="px-2.5 py-1 text-xs rounded border text-red-500 hover:bg-red-500/10 cursor-pointer transition-colors"
                            style={{ borderColor: 'rgba(239, 68, 68, 0.3)', borderRadius: '4px' }}
                            title="Delete screenshot"
                          >
                            <FontAwesomeIcon icon={faTrashAlt} />
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div
                            onClick={() => fileInputRef.current?.click()}
                            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                            onDrop={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              const file = e.dataTransfer.files?.[0]
                              if (file) handleFileUpload(file)
                            }}
                            className="p-4 rounded border-2 border-dashed flex flex-col items-center justify-center text-center cursor-pointer transition-all hover:opacity-85"
                            style={{
                              background: isDark ? 'rgba(39, 39, 42, 0.5)' : '#FAFAFA',
                              borderColor: isDark ? '#3F3F46' : '#D4D4D8',
                              borderRadius: '6px'
                            }}
                          >
                            {uploadingAttachment ? (
                              <div className="flex flex-col items-center gap-2 py-1">
                                <FontAwesomeIcon icon={faSpinner} className="animate-spin text-lg" style={{ color: isDark ? '#60A5FA' : '#0284C7' }} />
                                <span className="text-xs font-mono">{tr('feedback.uploadingAttachment', { id: 'Mengunggah screenshot ke Supabase...', en: 'Uploading screenshot...', zh: '正在上传截图至存储空间...' })}</span>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center gap-1 py-1">
                                <div
                                  className="w-8 h-8 rounded-full flex items-center justify-center mb-1"
                                  style={{ background: isDark ? 'rgba(59, 130, 246, 0.2)' : '#EFF6FF', color: isDark ? '#60A5FA' : '#0284C7' }}
                                >
                                  <FontAwesomeIcon icon={faUpload} className="text-xs" />
                                </div>
                                <p className="text-xs font-semibold" style={{ color: textPrimary, margin: 0 }}>
                                  {tr('feedback.uploadPrompt', { id: 'Klik atau tarik gambar ke sini', en: 'Click or drag image here to upload', zh: '点击或拖拽图片至此处上传' })}
                                </p>
                                <p className="text-[11px]" style={{ color: textSecondary, margin: 0 }}>
                                  {tr('feedback.uploadHint', { id: 'Format PNG, JPG, WEBP hingga 10MB', en: 'PNG, JPG, WEBP up to 10MB', zh: '支持 PNG、JPG、WEBP 格式，最大 10MB' })}
                                </p>
                              </div>
                            )}
                          </div>

                          {uploadAttachmentError && (
                            <p className="text-xs text-red-500 font-medium" style={{ margin: 0 }}>
                              {uploadAttachmentError}
                            </p>
                          )}

                          <input
                            type="url"
                            placeholder={tr('feedback.formAttachmentPlaceholder', { id: 'Atau tempel link gambar (Google Drive, Imgur, Cloudinary)', en: 'Or paste image URL (Google Drive, Imgur, Cloudinary)', zh: '或粘贴图片链接（Google Drive、Imgur、云存储等）' })}
                            value={formAttachmentUrl}
                            onChange={(e) => setFormAttachmentUrl(e.target.value)}
                            className="w-full px-3 py-1.5 text-[11px] rounded border focus:outline-none"
                            style={{ background: inputBg, borderColor, color: textPrimary, borderRadius: '6px' }}
                          />
                        </div>
                      )}
                    </div>

                    {/* Footer Buttons */}
                    <div className="pt-2 flex items-center justify-end gap-2.5 border-t" style={{ borderColor }}>
                      <button
                        type="button"
                        onClick={() => { setViewMode('overview'); handleResetForm(); }}
                        className="px-4 py-2 text-xs font-semibold rounded border transition-colors cursor-pointer"
                        style={{ borderColor, color: textSecondary, borderRadius: '6px' }}
                      >
                        {tr('feedback.btnCancel', { id: 'Batal', en: 'Cancel', zh: '取消' })}
                      </button>

                      <button
                        type="submit"
                        disabled={submitting || uploadingAttachment}
                        className="px-5 py-2 text-xs font-semibold rounded border transition-all cursor-pointer flex items-center gap-2"
                        style={{
                          background: isDark ? '#2563EB' : '#0284C7',
                          borderColor: isDark ? '#3B82F6' : '#0369A1',
                          color: '#FFFFFF',
                          borderRadius: '6px',
                          opacity: (submitting || uploadingAttachment) ? 0.6 : 1
                        }}
                      >
                        {submitting ? <FontAwesomeIcon icon={faSpinner} className="animate-spin text-xs" /> : <FontAwesomeIcon icon={faPaperPlane} className="text-xs" />}
                        <span>{submitting ? tr('feedback.btnSubmitting', { id: 'Mengirim...', en: 'Submitting...', zh: '正在提交...' }) : tr('feedback.btnSubmit', { id: 'Kirim Laporan', en: 'Submit Report', zh: '提交报告' })}</span>
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── MODAL BODY: TAB 2 (TIKET SAYA / SUPPORT DESK) ───────────────── */}
        {activeTab === 'tickets' && (
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {/* Admin Scope Toggle (Only visible if is_admin) */}
            {isAdmin && (
              <div
                className="p-1 rounded-md border flex items-center justify-between gap-2"
                style={{ background: subBg, borderColor }}
              >
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setAdminScope('my')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded cursor-pointer transition-all flex items-center gap-1.5 ${adminScope === 'my' ? (isDark ? 'bg-zinc-800 text-white shadow-xs' : 'bg-white text-neutral-900 shadow-xs') : ''}`}
                    style={{
                      color: adminScope === 'my' ? textPrimary : textSecondary,
                      borderRadius: '4px'
                    }}
                  >
                    <FontAwesomeIcon icon={faUser} className="text-[10px]" />
                    <span>{tr('feedback.tabMyTicketsOnly', { id: 'Tiket Saya', en: 'My Tickets', zh: '我的工单' })}</span>
                    <span
                      className="text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold"
                      style={{
                        background: adminScope === 'my' ? (isDark ? '#3F3F46' : '#E4E4E7') : 'transparent',
                        color: textPrimary
                      }}
                    >
                      {myTickets.length}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAdminScope('all')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded cursor-pointer transition-all flex items-center gap-1.5 ${adminScope === 'all' ? (isDark ? 'bg-zinc-800 text-white shadow-xs' : 'bg-white text-neutral-900 shadow-xs') : ''}`}
                    style={{
                      color: adminScope === 'all' ? textPrimary : textSecondary,
                      borderRadius: '4px'
                    }}
                  >
                    <FontAwesomeIcon icon={faTools} className="text-[10px]" />
                    <span>{tr('feedback.tabAllStaffAdmin', { id: 'Semua Laporan Staf (Admin)', en: 'All Staff Reports (Admin)', zh: '全部员工报告（管理员）' })}</span>
                    <span
                      className="text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold"
                      style={{
                        background: adminScope === 'all' ? (isDark ? '#3F3F46' : '#E4E4E7') : 'transparent',
                        color: textPrimary
                      }}
                    >
                      {feedbacks.length}
                    </span>
                  </button>
                </div>

                <span className="text-[10px] font-mono uppercase px-2 text-amber-500 font-semibold hidden sm:inline">
                  {tr('feedback.badgeAdminMode', { id: '👑 Mode Admin', en: '👑 Admin Mode', zh: '👑 管理员模式' })}
                </span>
              </div>
            )}

            {/* Filter Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 p-2 rounded-md border" style={{ background: subBg, borderColor }}>
              <div className="flex items-center gap-1.5 flex-wrap">
                {/* Type buttons */}
                <div className="inline-flex rounded border p-0.5" style={{ background: inputBg, borderColor, borderRadius: '4px' }}>
                  <button
                    type="button"
                    onClick={() => setTicketTypeFilter('all')}
                    className={`px-2 py-0.5 text-[11px] font-semibold rounded cursor-pointer transition-colors ${ticketTypeFilter === 'all' ? (isDark ? 'bg-zinc-700 text-white' : 'bg-neutral-800 text-white') : ''}`}
                    style={{ color: ticketTypeFilter === 'all' ? '#FFFFFF' : textSecondary, borderRadius: '3px' }}
                  >
                    {tr('feedback.filterAll', { id: 'Semua', en: 'All', zh: '全部' })}
                  </button>
                  <button
                    type="button"
                    onClick={() => setTicketTypeFilter('bug')}
                    className={`px-2 py-0.5 text-[11px] font-semibold rounded cursor-pointer transition-colors ${ticketTypeFilter === 'bug' ? 'bg-red-500 text-white' : ''}`}
                    style={{ color: ticketTypeFilter === 'bug' ? '#FFFFFF' : textSecondary, borderRadius: '3px' }}
                  >
                    🐞 {tr('feedback.filterBug', { id: 'Bug', en: 'Bug', zh: '错误' })}
                  </button>
                  <button
                    type="button"
                    onClick={() => setTicketTypeFilter('feature')}
                    className={`px-2 py-0.5 text-[11px] font-semibold rounded cursor-pointer transition-colors ${ticketTypeFilter === 'feature' ? 'bg-amber-500 text-white' : ''}`}
                    style={{ color: ticketTypeFilter === 'feature' ? '#FFFFFF' : textSecondary, borderRadius: '3px' }}
                  >
                    💡 {tr('feedback.filterFeature', { id: 'Fitur', en: 'Feature', zh: '建议' })}
                  </button>
                </div>

                {/* Status select */}
                <select
                  value={ticketStatusFilter}
                  onChange={(e) => setTicketStatusFilter(e.target.value)}
                  className="px-2 py-1 text-[11px] rounded border focus:outline-none cursor-pointer"
                  style={{ background: inputBg, borderColor, color: textPrimary, borderRadius: '4px' }}
                >
                  <option value="all">{tr('feedback.statusAll', { id: 'Semua Status', en: 'All Statuses', zh: '全部状态' })}</option>
                  <option value="submitted">{tr('feedback.statusSubmitted', { id: '📥 Submitted (Terkirim)', en: '📥 Submitted', zh: '📥 已提交' })}</option>
                  <option value="under_review">{tr('feedback.statusUnderReview', { id: '🔍 Under Review (Ditinjau)', en: '🔍 Under Review', zh: '🔍 审核中' })}</option>
                  <option value="in_progress">{tr('feedback.statusInProgress', { id: '🛠️ In Progress (Dikerjakan)', en: '🛠️ In Progress', zh: '🛠️ 处理中' })}</option>
                  <option value="planned">{tr('feedback.statusPlanned', { id: '⏸️ Planned (Direncanakan)', en: '⏸️ Planned', zh: '⏸️ 已规划' })}</option>
                  <option value="resolved">{tr('feedback.statusResolved', { id: '✅ Resolved (Selesai/Live)', en: '✅ Resolved / Live', zh: '✅ 已解决' })}</option>
                  <option value="declined">{tr('feedback.statusDeclined', { id: '❌ Declined (Ditolak)', en: '❌ Declined', zh: '❌ 已关闭' })}</option>
                </select>
              </div>

              {/* Search input */}
              <div className="relative w-full sm:w-48">
                <FontAwesomeIcon icon={faSearch} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px]" style={{ color: textSecondary }} />
                <input
                  type="text"
                  placeholder={tr('feedback.searchPlaceholder', { id: 'Cari tiket...', en: 'Search tickets...', zh: '搜索工单...' })}
                  value={ticketSearch}
                  onChange={(e) => setTicketSearch(e.target.value)}
                  className="w-full pl-7 pr-2.5 py-1 text-[11px] rounded border focus:outline-none"
                  style={{ background: inputBg, borderColor, color: textPrimary, borderRadius: '4px' }}
                />
              </div>
            </div>

            {/* Ticket Cards Stream */}
            {loadingTickets ? (
              <div className="p-8 text-center" style={{ color: textSecondary }}>
                <FontAwesomeIcon icon={faSpinner} className="animate-spin text-xl mb-2" />
                <p className="text-xs font-mono">{tr('feedback.loading', { id: 'MEMUAT TIKET...', en: 'LOADING TICKETS...', zh: '正在加载工单...' })}</p>
              </div>
            ) : displayedMyTickets.length === 0 ? (
              <div
                className="p-8 rounded-lg border flex flex-col items-center justify-center text-center space-y-3"
                style={{ background: cardBg, borderColor, borderRadius: '8px' }}
              >
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center"
                  style={{ background: isDark ? 'rgba(59, 130, 246, 0.15)' : '#EFF6FF', color: isDark ? '#60A5FA' : '#0284C7' }}
                >
                  <FontAwesomeIcon icon={faHeadset} className="text-xl" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-center mb-1" style={{ color: textPrimary, margin: 0 }}>
                    {tr('feedback.emptyMyTicketsTitle', { id: 'Belum Ada Tiket yang Diajukan', en: 'No Tickets Submitted Yet', zh: '暂无提交的工单' })}
                  </h4>
                  <p className="text-xs text-center max-w-md mx-auto leading-relaxed mt-1" style={{ color: textSecondary }}>
                    {tr('feedback.emptyMyTicketsDesc', {
                      id: 'Setiap kali Anda melaporkan kendala atau mengusulkan fitur baru, riwayat status tiket dan respon resmi pengembang akan muncul di sini.',
                      en: 'Whenever you report an issue or suggest a feature, ticket progress and official developer responses will appear here.',
                      zh: '每当您提交错误报告或新功能建议，处理进度与开发团队的答复都会显示在这里。'
                    })}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => { setActiveTab('report'); setViewMode('overview'); }}
                  className="px-4 py-2 text-xs font-semibold rounded border cursor-pointer inline-flex items-center gap-1.5"
                  style={{
                    background: isDark ? '#2563EB' : '#0284C7',
                    borderColor: isDark ? '#3B82F6' : '#0369A1',
                    color: '#FFFFFF',
                    borderRadius: '6px'
                  }}
                >
                  <FontAwesomeIcon icon={faPlus} />
                  <span>{tr('feedback.btnReport', { id: 'Kirim Laporan Baru', en: 'Submit New Report', zh: '提交新报告' })}</span>
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {displayedMyTickets.map(item => {
                  const statusInfo = getStatusBadge(item.status)
                  const priorityInfo = getPriorityBadge(item.priority)
                  const isBug = item.type === 'bug'
                  const formattedDate = new Date(item.created_at).toLocaleDateString(dateLocale, {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })

                  return (
                    <div
                      key={item.id}
                      className="p-3.5 rounded-lg border transition-all flex flex-col gap-2.5"
                      style={{ background: cardBg, borderColor, borderRadius: '8px' }}
                    >
                      {/* Top Row: Badges & Date */}
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className="px-2 py-0.5 text-[9.5px] font-mono font-bold rounded"
                            style={{
                              background: isBug ? 'rgba(239, 68, 68, 0.15)' : 'rgba(139, 92, 246, 0.15)',
                              color: isBug ? (isDark ? '#F87171' : '#DC2626') : (isDark ? '#C084FC' : '#7C3AED'),
                              borderRadius: '4px'
                            }}
                          >
                            {isBug ? `🐞 ${tr('feedback.badgeBug', { id: 'BUG', en: 'BUG', zh: '错误' })}` : `💡 ${tr('feedback.badgeFeature', { id: 'FITUR', en: 'FEATURE', zh: '建议' })}`}
                          </span>

                          <span
                            className="px-1.5 py-0.5 text-[9px] font-mono font-bold rounded"
                            style={{ background: priorityInfo.bg, color: priorityInfo.text, borderRadius: '4px' }}
                          >
                            {priorityInfo.label}
                          </span>

                          <span
                            className="px-2 py-0.5 text-[9.5px] font-mono font-semibold rounded border"
                            style={{ background: statusInfo.bg, color: statusInfo.text, borderColor: statusInfo.border, borderRadius: '4px' }}
                          >
                            {statusInfo.label}
                          </span>
                        </div>

                        <span className="text-[10px] font-mono" style={{ color: textSecondary }}>
                          {formattedDate}
                        </span>
                      </div>

                      {/* Title & Description */}
                      <div>
                        <h4 className="text-xs font-bold tracking-tight" style={{ color: textPrimary, margin: 0 }}>
                          {item.title}
                        </h4>
                        <p className="text-xs leading-relaxed whitespace-pre-wrap mt-1" style={{ color: textSecondary, margin: '4px 0 0 0' }}>
                          {item.description}
                        </p>
                      </div>

                      {/* Meta links (URL & Screenshot) */}
                      <div className="flex items-center gap-3 text-[10.5px] font-mono flex-wrap" style={{ color: textSecondary }}>
                        {isAdmin && adminScope === 'all' && (
                          <span>{tr('feedback.reporter', { id: 'Pelapor', en: 'Reporter', zh: '报告人' })}: <strong style={{ color: textPrimary }}>{item.author_name}</strong></span>
                        )}
                        {item.page_url && (
                          <span className="flex items-center gap-1 truncate max-w-[240px]">
                            <FontAwesomeIcon icon={faExternalLinkAlt} className="text-[8px]" />
                            <span>{item.page_url}</span>
                          </span>
                        )}
                        {item.attachment_url && (
                          <a
                            href={item.attachment_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 hover:underline font-semibold"
                            style={{ color: isDark ? '#60A5FA' : '#0284C7' }}
                          >
                            <FontAwesomeIcon icon={faImage} className="text-[9px]" />
                            <span>{tr('feedback.viewScreenshot', { id: 'Lihat Screenshot', en: 'View Screenshot', zh: '查看截图' })}</span>
                            <FontAwesomeIcon icon={faExternalLinkAlt} className="text-[7px]" />
                          </a>
                        )}
                      </div>

                      {/* Lifecycle Status Box */}
                      <div
                        className="p-2 rounded border text-[11px] flex items-center gap-2"
                        style={{
                          background: item.status === 'resolved'
                            ? (isDark ? 'rgba(16, 185, 129, 0.1)' : '#ECFDF5')
                            : item.status === 'declined'
                            ? (isDark ? 'rgba(107, 114, 128, 0.1)' : '#F9FAFB')
                            : item.status === 'in_progress'
                            ? (isDark ? 'rgba(59, 130, 246, 0.1)' : '#EFF6FF')
                            : (isDark ? 'rgba(245, 158, 11, 0.1)' : '#FFFBEB'),
                          borderColor: item.status === 'resolved'
                            ? '#10B981'
                            : item.status === 'declined'
                            ? '#9CA3AF'
                            : item.status === 'in_progress'
                            ? '#3B82F6'
                            : '#F59E0B',
                          borderRadius: '6px'
                        }}
                      >
                        <FontAwesomeIcon
                          icon={item.status === 'resolved' ? faCheckCircle : item.status === 'in_progress' ? faTools : faClock}
                          className="text-[11px] shrink-0"
                          style={{
                            color: item.status === 'resolved' ? '#10B981' : item.status === 'in_progress' ? '#3B82F6' : '#F59E0B'
                          }}
                        />
                        <span className="leading-relaxed">
                          {item.status === 'submitted' && tr('feedback.lifecycleSubmitted', { id: 'Tiket Anda telah terkirim dan berada dalam antrean review tim pengembang.', en: 'Your ticket has been submitted and is currently in the review queue.', zh: '工单已提交，正在等待开发团队审核处理。' })}
                          {item.status === 'under_review' && tr('feedback.lifecycleUnderReview', { id: 'Tim pengembang sedang meninjau dan mereproduksi kendala Anda.', en: 'Developers are reviewing and attempting to reproduce the issue.', zh: '开发团队正在重现并排查该问题。' })}
                          {item.status === 'in_progress' && tr('feedback.lifecycleInProgress', { id: 'Tim pengembang sedang aktif mengerjakan perbaikan untuk tiket ini.', en: 'Developers are actively working on a fix or implementation.', zh: '开发团队正在全力修复/开发此工单。' })}
                          {item.status === 'planned' && tr('feedback.lifecyclePlanned', { id: 'Usulan Anda disetujui dan masuk dalam agenda rilis berikutnya.', en: 'Approved and scheduled for an upcoming system release.', zh: '该建议已被采纳并加入后续版本发布计划。' })}
                          {item.status === 'resolved' && tr('feedback.lifecycleResolved', { id: 'Tiket telah diselesaikan! Perbaikan/fitur ini sudah live di sistem.', en: 'Resolved! The fix or feature is now live in the system.', zh: '工单已解决！相关修复或新功能已正式上线。' })}
                          {item.status === 'declined' && tr('feedback.lifecycleDeclined', { id: 'Tiket ditutup. Silakan baca catatan pengembang di bawah.', en: 'Ticket closed. Please refer to the developer notes below.', zh: '工单已关闭，请查阅下方的开发团队反馈备注。' })}
                        </span>
                      </div>

                      {/* Developer Notes / Catatan Pengembang */}
                      {item.admin_notes && (
                        <div
                          className="p-2.5 rounded border text-xs space-y-1"
                          style={{
                            background: isDark ? '#1C1917' : '#FFFBEB',
                            borderColor: isDark ? 'rgba(245, 158, 11, 0.3)' : '#FDE68A',
                            borderRadius: '6px'
                          }}
                        >
                          <span className="font-semibold text-amber-700 dark:text-amber-400 block text-[10.5px]">
                            {tr('feedback.adminNotesHeader', { id: '💬 Catatan Pengembang / Solusi:', en: '💬 Developer Notes / Resolution:', zh: '💬 开发团队处理答复 / 解决方案：' })}
                          </span>
                          <p className="text-xs whitespace-pre-wrap leading-relaxed m-0" style={{ color: textPrimary }}>
                            {item.admin_notes}
                          </p>
                        </div>
                      )}

                      {/* Admin Manage Status Button */}
                      {isAdmin && (
                        <div className="pt-1 flex items-center justify-end border-t" style={{ borderColor }}>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingTicket(item)
                              setAdminStatus(item.status)
                              setAdminNotes(item.admin_notes || '')
                            }}
                            className="px-2.5 py-1 text-[11px] font-semibold rounded border cursor-pointer flex items-center gap-1.5 transition-colors"
                            style={{
                              background: isDark ? '#27272A' : '#F4F4F5',
                              borderColor,
                              color: textPrimary,
                              borderRadius: '4px'
                            }}
                          >
                            <FontAwesomeIcon icon={faCog} className="text-[10px]" />
                            <span>{tr('feedback.btnManageStatusAdmin', { id: 'Kelola Status (Admin)', en: 'Manage Status (Admin)', zh: '管理状态（管理员）' })}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ── ADMIN STATUS UPDATE OVERLAY DIALOG ──────────────────────────── */}
        {editingTicket && (
          <div className="absolute inset-0 z-20 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
            <div
              className="w-full max-w-md rounded-lg border shadow-xl p-5 space-y-4 animate-in fade-in zoom-in-95"
              style={{ background: cardBg, borderColor, borderRadius: '8px' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b pb-3" style={{ borderColor }}>
                <h4 className="text-xs font-bold uppercase tracking-wider" style={{ color: textPrimary }}>
                  {tr('feedback.modalAdminTitle', { id: 'Kelola Status Tiket', en: 'Manage Ticket Status', zh: '管理工单状态' })} #{editingTicket.id}
                </h4>
                <button
                  type="button"
                  onClick={() => setEditingTicket(null)}
                  className="text-xs text-neutral-400 hover:text-white cursor-pointer"
                >
                  <FontAwesomeIcon icon={faTimes} />
                </button>
              </div>

              <div>
                <p className="text-xs font-semibold truncate" style={{ color: textPrimary, margin: '0 0 6px 0' }}>
                  {editingTicket.title}
                </p>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: textPrimary }}>
                  {tr('feedback.modalAdminNewStatus', { id: 'Status Baru', en: 'New Status', zh: '新状态' })} *
                </label>
                <select
                  value={adminStatus}
                  onChange={(e) => setAdminStatus(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded border focus:outline-none cursor-pointer"
                  style={{ background: inputBg, borderColor, color: textPrimary, borderRadius: '6px' }}
                >
                  <option value="submitted">{tr('feedback.statusSubmitted', { id: '📥 Submitted (Terkirim)', en: '📥 Submitted', zh: '📥 已提交' })}</option>
                  <option value="under_review">{tr('feedback.statusUnderReview', { id: '🔍 Under Review (Sedang Ditinjau)', en: '🔍 Under Review', zh: '🔍 审核中' })}</option>
                  <option value="in_progress">{tr('feedback.statusInProgress', { id: '🛠️ In Progress (Sedang Dikerjakan)', en: '🛠️ In Progress', zh: '🛠️ 处理中' })}</option>
                  <option value="planned">{tr('feedback.statusPlanned', { id: '⏸️ Planned (Diterima & Dijadwalkan)', en: '⏸️ Planned', zh: '⏸️ 已规划' })}</option>
                  <option value="resolved">{tr('feedback.statusResolved', { id: '✅ Resolved (Selesai & Live)', en: '✅ Resolved / Live', zh: '✅ 已解决' })}</option>
                  <option value="declined">{tr('feedback.statusDeclined', { id: '❌ Declined (Ditolak / Ditutup)', en: '❌ Declined', zh: '❌ 已关闭' })}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: textPrimary }}>
                  {tr('feedback.modalAdminNotesPrompt', { id: 'Catatan Pengembang / Solusi untuk Pelapor', en: 'Developer Notes / Resolution for Reporter', zh: '开发处理备注 / 解决方案（通知提交人）' })}
                </label>
                <textarea
                  rows={3}
                  placeholder={tr('feedback.modalAdminNotesPlaceholder', {
                    id: 'Tuliskan catatan perbaikan atau alasan kepada pelapor. Pesan ini akan otomatis dikirimkan ke bot Google Chat pelapor...',
                    en: 'Write resolution notes or remarks. This message will be sent automatically via Google Chat bot to the reporter...',
                    zh: '填写问题处理备注或解决方案，此内容将通过 Google Chat 机器人自动私聊通知提交人...'
                  })}
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded border focus:outline-none leading-relaxed"
                  style={{ background: inputBg, borderColor, color: textPrimary, borderRadius: '6px' }}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t" style={{ borderColor }}>
                <button
                  type="button"
                  onClick={() => setEditingTicket(null)}
                  className="px-3 py-1.5 text-xs font-semibold rounded border cursor-pointer"
                  style={{ borderColor, color: textSecondary, borderRadius: '6px' }}
                >
                  {tr('feedback.btnCancel', { id: 'Batal', en: 'Cancel', zh: '取消' })}
                </button>
                <button
                  type="button"
                  disabled={savingAdmin}
                  onClick={handleAdminUpdateStatus}
                  className="px-4 py-1.5 text-xs font-semibold rounded border cursor-pointer flex items-center gap-1.5"
                  style={{
                    background: isDark ? '#2563EB' : '#0284C7',
                    borderColor: isDark ? '#3B82F6' : '#0369A1',
                    color: '#FFFFFF',
                    borderRadius: '6px'
                  }}
                >
                  {savingAdmin ? <FontAwesomeIcon icon={faSpinner} className="animate-spin text-xs" /> : <FontAwesomeIcon icon={faCheckCircle} className="text-xs" />}
                  <span>{tr('feedback.modalAdminBtnSave', { id: 'Simpan & Kirim Notif', en: 'Save & Notify Reporter', zh: '保存并通知提交人' })}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
