'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useTheme } from '@/lib/theme'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faSearch, faCheckCircle, faClock, faExclamationTriangle,
  faPaperPlane, faFileExcel, faSync, faFilter, faUserCheck,
  faTimesCircle, faArrowRight, faCalendarAlt, faBell, faTasks,
  faChevronDown, faChevronRight, faUser, faCommentDots, faTimes,
  faPaperclip, faExternalLinkAlt, faShieldAlt
} from '@fortawesome/free-solid-svg-icons'

// ── Helpers ───────────────────────────────────────────────────────────────────
function getMonthStart(ym) { return `${ym}-01` }
function getMonthEnd(ym) {
  const [y, m] = ym.split('-').map(Number)
  const lastDay = new Date(y, m, 0).getDate()
  return `${ym}-${String(lastDay).padStart(2, '0')}`
}

function fmtMins(mins) {
  if (!mins) return ''
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

const CATEGORY_LABEL = {
  woke_up_late:          'Woke Up Late',
  traffic_jam:           'Traffic Jam / Transport Issue',
  sick:                  'Sick / Unwell',
  family_personal:       'Family / Personal Matter',
  sick_no_letter:        'Sick without letter (unpaid)',
  sick_with_letter:      'Sick with doctor letter',
  marriage_employee:     "Employee's Marriage Leave",
  marriage_child:        "Child's Marriage Leave",
  bereavement_core:      'Bereavement Leave (Core Family)',
  bereavement_sibling:   'Bereavement Leave (Sibling)',
  childbirth:            'Childbirth / Miscarriage Leave',
  circumcision_child:    "Child's Circumcision Leave",
  baptism_child:         "Child's Baptism Leave",
  ib_trainer:            'Official IB Trainer / Examiner',
  school_duty:           'School Duty / Workshop',
  annual_leave:          'Annual Leave',
  unpaid_leave:          'Unpaid Personal Leave',
  forgot_scan:           'Forgot to check in/out',
  scanned_not_recorded:  'Scanned but not recorded',
  other:                 'Other'
}

function getApproverName(appObj) {
  if (!appObj) return null
  const name = `${appObj.user_nama_depan || ''} ${appObj.user_nama_belakang || ''}`.trim()
  return name || null
}

const ISSUE_LABELS = {
  late:        { name: 'Late Check-in', bg: '#fef3c7', color: '#92400e', border: '#fde68a' },
  leave_early: { name: 'Early Leave',    bg: '#fee2e2', color: '#991b1b', border: '#fca5a5' },
  absent:      { name: 'Absent',         bg: '#f3e8ff', color: '#6b21a8', border: '#e9d5ff' },
  no_checkin:  { name: 'No Check-in',   bg: '#fce7f3', color: '#9d174d', border: '#fbcfe8' },
  no_checkout: { name: 'No Check-out',  bg: '#ffedd5', color: '#9a3412', border: '#fed7aa' },
}

export default function AttendanceCheckPage() {
  const { theme } = useTheme()
  const router = useRouter()

  // ── Filters & State ────────────────────────────────────────────────────────
  const todayStr = new Date().toISOString().slice(0, 10)
  const firstDayOfMonth = `${todayStr.slice(0, 7)}-01`

  const [dateMode, setDateMode]           = useState('range') // 'range' | 'month'
  const [startDate, setStartDate]         = useState(firstDayOfMonth) // Default: 1st of current month
  const [endDate, setEndDate]             = useState(todayStr)         // Default: Today's date
  const [selectedMonth, setSelectedMonth] = useState(todayStr.slice(0, 7))

  const [statusFilter, setStatusFilter]   = useState('unfiled') // 'unfiled' | 'pending' | 'approved' | 'rejected' | 'all'
  const [selectedUnit, setSelectedUnit]   = useState('all')
  const [searchQuery, setSearchQuery]     = useState('')

  const [loading, setLoading]             = useState(true)
  const [units, setUnits]                 = useState([])
  const [rawIssues, setRawIssues]         = useState([])
  const [notif, setNotif]                 = useState({ show: false, message: '', type: 'success' })
  const [sendingId, setSendingId]         = useState(null)
  const [sendingAll, setSendingAll]       = useState(false)

  // Track expanded employee cards (set of user_ids)
  const [expandedUsers, setExpandedUsers] = useState(new Set())

  // Confirmation & Message Preview Modal State
  const [confirmModal, setConfirmModal]   = useState({
    show: false,
    title: '',
    targetLabel: '',
    recipientCount: 1,
    messagePreview: '',
    onConfirm: null
  })

  const showNotification = (message, type = 'success') => {
    setNotif({ show: true, message, type })
    setTimeout(() => setNotif({ show: false, message: '', type: 'success' }), 4000)
  }

  // ── 1. Fetch metadata (Units) ──────────────────────────────────────────────
  useEffect(() => {
    const fetchMeta = async () => {
      const { data } = await supabase.from('unit').select('unit_id, unit_name').order('unit_name')
      const unitList = data || []
      setUnits(unitList)
      if (unitList.length > 0) {
        setSelectedUnit(String(unitList[0].unit_id))
      }
    }
    fetchMeta()
  }, [])

  // ── 2. Fetch Attendance Report & Excuses ───────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      let start, end
      if (dateMode === 'range') {
        start = startDate
        end   = endDate
      } else {
        start = getMonthStart(selectedMonth)
        end   = getMonthEnd(selectedMonth)
      }

      // Fetch attendance report and submitted excuses in parallel
      const [rRes, eRes] = await Promise.all([
        fetch(`/api/attendance/report?start=${start}&end=${end}`),
        fetch(`/api/attendance/excuses?start=${start}&end=${end}`),
      ])

      const rJson = await rRes.json()
      const eJson = await eRes.json()

      const excusesList = eJson.success ? eJson.data || [] : []
      // Map excuses by user_id and date for instant lookup
      const excuseMap = new Map()
      excusesList.forEach(e => {
        const key = `${e.user_id}_${e.attendance_date}`
        excuseMap.set(key, e)
      })

      // Combine report daily logs with excuses
      const combinedIssues = []
      if (rJson.success && rJson.data) {
        for (const user of rJson.data) {
          // Skip users with flexible working hours, part-time staff, or vendor roles
          if (user.is_flexible_hours || user.is_part_time_staff || user.is_vendor) continue

          for (const day of user.daily || []) {
            if (['holiday', 'dayoff', 'off'].includes(day.status)) continue

            // Check if day has any issue flags
            const issueTypes = (day.issues || []).filter(i =>
              ['late', 'leave_early', 'absent', 'no_checkin', 'no_checkout'].includes(i)
            )

            if (issueTypes.length > 0) {
              const key = `${user.user_id}_${day.date}`
              const excuse = excuseMap.get(key) || null

              let excuseStatus = 'unfiled'
              if (excuse) {
                if (excuse.status === 'approved' || excuse.status === 'approved_2') excuseStatus = 'approved'
                else if (excuse.status === 'rejected') excuseStatus = 'rejected'
                else excuseStatus = 'pending' // pending or approved_1
              }

              combinedIssues.push({
                key,
                user_id: user.user_id,
                name: user.name,
                email: user.user_email,
                unit_id: user.unit_id,
                unit_name: user.unit_name,
                role_name: user.role_name,
                date: day.date,
                checkIn: day.checkin_time ? day.checkin_time.slice(0, 5) : '—',
                checkOut: day.checkout_time ? day.checkout_time.slice(0, 5) : '—',
                lateMins: day.late_minutes || 0,
                earlyMins: day.leave_early_minutes || 0,
                issueTypes,
                excuse,
                excuseStatus
              })
            }
          }
        }
      }

      setRawIssues(combinedIssues)
    } catch (e) {
      console.error('Error loading attendance check data:', e)
      showNotification('Failed to load attendance monitoring data: ' + e.message, 'error')
    } finally {
      setLoading(false)
    }
  }, [dateMode, startDate, endDate, selectedMonth])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // ── Filtered Raw Issues ─────────────────────────────────────────────────────
  const filteredIssues = useMemo(() => {
    return rawIssues.filter(item => {
      // Status filter
      if (statusFilter !== 'all' && item.excuseStatus !== statusFilter) return false
      // Unit filter
      if (selectedUnit !== 'all' && String(item.unit_id) !== String(selectedUnit)) return false
      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const nameMatch = item.name?.toLowerCase().includes(q)
        const emailMatch = item.email?.toLowerCase().includes(q)
        const unitMatch = item.unit_name?.toLowerCase().includes(q)
        if (!nameMatch && !emailMatch && !unitMatch) return false
      }
      return true
    })
  }, [rawIssues, statusFilter, selectedUnit, searchQuery])

  // ── Grouped Employees ──────────────────────────────────────────────────────
  const groupedEmployees = useMemo(() => {
    const groupsMap = new Map()

    for (const item of filteredIssues) {
      if (!groupsMap.has(item.user_id)) {
        groupsMap.set(item.user_id, {
          user_id: item.user_id,
          name: item.name,
          email: item.email,
          unit_name: item.unit_name,
          role_name: item.role_name,
          items: [],
          unfiledCount: 0,
          pendingCount: 0,
          approvedCount: 0,
          rejectedCount: 0
        })
      }

      const group = groupsMap.get(item.user_id)
      group.items.push(item)
      if (item.excuseStatus === 'unfiled') group.unfiledCount++
      else if (item.excuseStatus === 'pending') group.pendingCount++
      else if (item.excuseStatus === 'approved') group.approvedCount++
      else if (item.excuseStatus === 'rejected') group.rejectedCount++
    }

    return Array.from(groupsMap.values()).sort((a, b) => a.name.localeCompare(b.name))
  }, [filteredIssues])

  // Automatically expand all users if total grouped count is small (e.g. <= 5)
  useEffect(() => {
    if (groupedEmployees.length > 0 && groupedEmployees.length <= 5) {
      setExpandedUsers(new Set(groupedEmployees.map(g => g.user_id)))
    }
  }, [groupedEmployees])

  const toggleExpandUser = (userId) => {
    setExpandedUsers(prev => {
      const next = new Set(prev)
      if (next.has(userId)) next.delete(userId)
      else next.add(userId)
      return next
    })
  }

  const handleExpandAll = () => {
    setExpandedUsers(new Set(groupedEmployees.map(g => g.user_id)))
  }

  const handleCollapseAll = () => {
    setExpandedUsers(new Set())
  }

  // ── Counters ───────────────────────────────────────────────────────────────
  const counts = useMemo(() => {
    const unfiled  = rawIssues.filter(i => i.excuseStatus === 'unfiled')
    const pending  = rawIssues.filter(i => i.excuseStatus === 'pending')
    const approved = rawIssues.filter(i => i.excuseStatus === 'approved')
    const rejected = rawIssues.filter(i => i.excuseStatus === 'rejected')

    const unfiledUserCount = new Set(unfiled.map(i => i.user_id)).size

    return {
      unfiled: unfiled.length,
      unfiledUsers: unfiledUserCount,
      pending: pending.length,
      approved: approved.length,
      rejected: rejected.length,
      total: rawIssues.length
    }
  }, [rawIssues])

  // ── PROMPT & EXECUTE: Single Employee Reminder ──────────────────────────────
  const promptSendUserReminder = (group) => {
    const unfiledItems = group.items.filter(i => i.excuseStatus === 'unfiled')
    if (unfiledItems.length === 0) return

    const dateList = unfiledItems.map(i => {
      const issueNames = i.issueTypes.map(t => ISSUE_LABELS[t]?.name || t).join(', ')
      return `• *${i.date}*: ${issueNames}`
    }).join('\n')

    const msgText = `🔔 *HCM Attendance Reminder*\n\n` +
      `Hello *${group.name}*,\n` +
      `You currently have *${unfiledItems.length} pending HCM form(s)* for the following date(s):\n` +
      `${dateList}\n\n` +
      `Please log in to the portal and submit your Attendance Excuse Form for these dates.\n` +
      `Thank you for your prompt action!`

    setConfirmModal({
      show: true,
      title: `Send Reminder to ${group.name}`,
      targetLabel: `${group.name} (${group.email}) — ${unfiledItems.length} Unfiled Date(s)`,
      recipientCount: 1,
      messagePreview: msgText,
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, show: false }))
        setSendingId(`user_${group.user_id}`)
        try {
          const res = await fetch('/api/attendance/test-chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: group.email, message: msgText })
          })
          const json = await res.json()
          if (!json.success) throw new Error(json.error || 'Failed to send Google Chat message')

          showNotification(`Reminder successfully sent to ${group.name} (${unfiledItems.length} dates)!`, 'success')
        } catch (e) {
          showNotification(`Failed to send reminder to ${group.name}: ${e.message}`, 'error')
        } finally {
          setSendingId(null)
        }
      }
    })
  }

  // ── PROMPT & EXECUTE: Single Date Item Reminder ─────────────────────────────
  const promptSendSingleReminder = (item) => {
    const issueNames = item.issueTypes.map(t => ISSUE_LABELS[t]?.name || t).join(', ')
    const msgText = `🔔 *HCM Attendance Reminder*\n\n` +
      `Hello *${item.name}*,\n` +
      `Our records show an unfiled attendance issue on *${item.date}* (*${issueNames}*).\n\n` +
      `Please log in to the portal and submit your Attendance Excuse Form as soon as possible.\n` +
      `Thank you!`

    setConfirmModal({
      show: true,
      title: `Send Reminder for ${item.date}`,
      targetLabel: `${item.name} (${item.email}) — Date: ${item.date}`,
      recipientCount: 1,
      messagePreview: msgText,
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, show: false }))
        setSendingId(item.key)
        try {
          const res = await fetch('/api/attendance/test-chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: item.email, message: msgText })
          })
          const json = await res.json()
          if (!json.success) throw new Error(json.error || 'Failed to send Google Chat message')

          showNotification(`Reminder sent to ${item.name} for ${item.date}!`, 'success')
        } catch (e) {
          showNotification(`Failed to send reminder: ${e.message}`, 'error')
        } finally {
          setSendingId(null)
        }
      }
    })
  }

  // ── PROMPT & EXECUTE: Batch Remind All Unfiled Employees ───────────────────
  const promptBatchSendReminders = () => {
    const unfiledList = rawIssues.filter(i => i.excuseStatus === 'unfiled')
    if (unfiledList.length === 0) {
      showNotification('No unfiled attendance issues to send reminders for.', 'info')
      return
    }

    // Group by user
    const userGroupMap = new Map()
    for (const item of unfiledList) {
      if (!userGroupMap.has(item.user_id)) {
        userGroupMap.set(item.user_id, { name: item.name, email: item.email, dates: [] })
      }
      const issueNames = item.issueTypes.map(t => ISSUE_LABELS[t]?.name || t).join(', ')
      userGroupMap.get(item.user_id).dates.push(`• *${item.date}*: ${issueNames}`)
    }

    const sampleUser = Array.from(userGroupMap.values())[0]
    const sampleMsgText = `🔔 *HCM Attendance Reminder Notice*\n\n` +
      `Hello *${sampleUser.name}*,\n` +
      `You currently have *${sampleUser.dates.length} pending HCM form(s)* for the following date(s):\n` +
      `${sampleUser.dates.join('\n')}\n\n` +
      `Please log in to the portal and submit your Attendance Excuse Forms for these dates. Thank you!`

    setConfirmModal({
      show: true,
      title: `Batch Send Google Chat Reminders`,
      targetLabel: `Target: ${userGroupMap.size} Employees (${unfiledList.length} total unfiled issues)`,
      recipientCount: userGroupMap.size,
      messagePreview: sampleMsgText,
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, show: false }))
        setSendingAll(true)
        let successCount = 0
        let failCount = 0

        for (const [uId, uData] of userGroupMap.entries()) {
          try {
            const msgText = `🔔 *HCM Attendance Reminder Notice*\n\n` +
              `Hello *${uData.name}*,\n` +
              `You currently have *${uData.dates.length} pending HCM form(s)* for the following date(s):\n` +
              `${uData.dates.join('\n')}\n\n` +
              `Please log in to the portal and submit your Attendance Excuse Forms for these dates. Thank you!`

            const res = await fetch('/api/attendance/test-chat', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: uData.email, message: msgText })
            })
            const json = await res.json()
            if (json.success) successCount++
            else failCount++
          } catch (err) {
            failCount++
          }
        }

        setSendingAll(false)
        showNotification(`Reminders sent! ${successCount} successful, ${failCount} failed.`, successCount > 0 ? 'success' : 'error')
      }
    })
  }

  // ── Export CSV ─────────────────────────────────────────────────────────────
  const handleExportCSV = () => {
    if (filteredIssues.length === 0) return
    const headers = ['Employee Name', 'Email', 'Unit', 'Role', 'Date', 'Check In', 'Check Out', 'Issue Types', 'Excuse Status', 'Category', 'Reason Note']
    const csvRows = [headers.join(',')]

    for (const i of filteredIssues) {
      const issuesStr = i.issueTypes.map(t => ISSUE_LABELS[t]?.name || t).join('; ')
      const categoryStr = i.excuse?.category || ''
      const reasonStr = (i.excuse?.reason || i.excuse?.other_reason || '').replace(/"/g, '""')
      csvRows.push([
        `"${i.name}"`,
        `"${i.email}"`,
        `"${i.unit_name || ''}"`,
        `"${i.role_name || ''}"`,
        `"${i.date}"`,
        `"${i.checkIn || ''}"`,
        `"${i.checkOut || ''}"`,
        `"${issuesStr}"`,
        `"${i.excuseStatus}"`,
        `"${categoryStr}"`,
        `"${reasonStr}"`
      ].join(','))
    }

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href  = url
    link.setAttribute('download', `Attendance_Excuse_Audit_${startDate}_to_${endDate}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="p-4 md:p-6 space-y-6" style={{ color: theme.textBody }}>
      
      {/* Toast Notification */}
      {notif.show && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium transition-all ${
          notif.type === 'error' ? 'bg-red-600 text-white' :
          notif.type === 'warning' ? 'bg-amber-500 text-white' : 'bg-emerald-600 text-white'
        }`}>
          {notif.message}
        </div>
      )}

      {/* Confirmation & Google Chat Message Preview Modal */}
      {confirmModal.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border max-w-lg w-full overflow-hidden transition-all" style={{ borderColor: theme.border }}>
            
            {/* Modal Header */}
            <div className="p-5 border-b flex items-center justify-between" style={{ borderColor: theme.border }}>
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-600 flex items-center justify-center text-lg font-bold">
                  <FontAwesomeIcon icon={faCommentDots} />
                </div>
                <div>
                  <h3 className="font-bold text-base" style={{ color: theme.textPrimary }}>
                    {confirmModal.title}
                  </h3>
                  <p className="text-xs" style={{ color: theme.textSecondary }}>
                    Google Chat Direct Message Confirmation
                  </p>
                </div>
              </div>
              <button
                onClick={() => setConfirmModal(prev => ({ ...prev, show: false }))}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1"
              >
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 text-xs">
              
              {/* Target info */}
              <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-900 text-purple-900 dark:text-purple-200 font-medium">
                <span className="font-bold">Target Recipient:</span> {confirmModal.targetLabel}
              </div>

              {/* Message Content Preview Label */}
              <div>
                <label className="font-bold text-xs mb-1.5 block" style={{ color: theme.textPrimary }}>
                  💬 Google Chat Message Content Preview:
                </label>
                <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-900 border font-sans text-xs whitespace-pre-wrap leading-relaxed shadow-inner" style={{ borderColor: theme.border, color: theme.textBody }}>
                  {confirmModal.messagePreview}
                </div>
              </div>

              <div className="text-[11px] text-gray-500 italic">
                * Note: The notification will be delivered directly to the employee's Google Chat inbox.
              </div>

            </div>

            {/* Modal Footer Buttons */}
            <div className="p-4 border-t flex items-center justify-end gap-2 bg-gray-50 dark:bg-gray-900/50" style={{ borderColor: theme.border }}>
              <button
                onClick={() => setConfirmModal(prev => ({ ...prev, show: false }))}
                className="px-4 py-2 text-xs font-semibold rounded-xl border bg-white dark:bg-gray-800 hover:bg-gray-100 text-gray-700 dark:text-gray-200 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={confirmModal.onConfirm}
                className="px-5 py-2 text-xs font-semibold rounded-xl bg-purple-600 hover:bg-purple-700 text-white shadow-md transition-all flex items-center gap-2"
              >
                <FontAwesomeIcon icon={faPaperPlane} />
                Send Notification Now
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Header */}
      <div className="border-b pb-4" style={{ borderColor: theme.border }}>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
            HCM Audit & HR Control
          </span>
        </div>
        <h1 className="text-2xl font-bold flex items-center gap-2.5" style={{ color: theme.textPrimary }}>
          <FontAwesomeIcon icon={faShieldAlt} className="text-purple-600" />
          HCM Form Checker
        </h1>
      </div>

      {/* Filter Controls & Action Bar */}
      <div className="p-4 rounded-xl border space-y-4" style={{ background: theme.cardBg, borderColor: theme.border }}>
        
        {/* Top Control Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          
          {/* Status Filter Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-gray-100 dark:bg-gray-800 text-xs">
            {[
              { id: 'unfiled', label: '🚨 Unfiled', count: counts.unfiled },
              { id: 'pending', label: '⏳ Pending Approval', count: counts.pending },
              { id: 'approved', label: '✅ Approved', count: counts.approved },
              { id: 'rejected', label: '❌ Rejected', count: counts.rejected },
              { id: 'all', label: '🌐 All Issues', count: counts.total },
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setStatusFilter(t.id)}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 ${
                  statusFilter === t.id
                    ? 'bg-white dark:bg-gray-700 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
                }`}
                style={{ color: statusFilter === t.id ? theme.textPrimary : undefined }}
              >
                <span>{t.label}</span>
                <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-gray-200 dark:bg-gray-600 font-bold">
                  {t.count}
                </span>
              </button>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={promptBatchSendReminders}
              disabled={sendingAll || counts.unfiled === 0}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white rounded-lg shadow transition-all disabled:opacity-50"
            >
              <FontAwesomeIcon icon={sendingAll ? faSync : faPaperPlane} spin={sendingAll} />
              Remind All Unfiled ({counts.unfiledUsers} Employees)
            </button>

            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border"
              style={{ background: theme.inputBg, borderColor: theme.border, color: theme.textPrimary }}
            >
              <FontAwesomeIcon icon={faFileExcel} className="text-emerald-600" /> Export CSV
            </button>
          </div>

        </div>

        {/* Secondary Filter Row: Date Range / Month & Unit */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-3 border-t" style={{ borderColor: theme.border }}>
          
          <div className="flex flex-wrap items-center gap-3">
            
            {/* Mode Switcher */}
            <div className="flex items-center p-0.5 rounded-lg border bg-gray-100 dark:bg-gray-800 text-xs font-semibold">
              <button
                onClick={() => setDateMode('range')}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  dateMode === 'range' ? 'bg-white dark:bg-gray-700 shadow-sm text-purple-700 dark:text-purple-300 font-bold' : 'text-gray-600 dark:text-gray-400'
                }`}
              >
                📅 Date Range
              </button>
              <button
                onClick={() => setDateMode('month')}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  dateMode === 'month' ? 'bg-white dark:bg-gray-700 shadow-sm text-purple-700 dark:text-purple-300 font-bold' : 'text-gray-600 dark:text-gray-400'
                }`}
              >
                🗓️ Full Month
              </button>
            </div>

            {/* Inputs depending on Mode */}
            {dateMode === 'range' ? (
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <label className="text-xs font-semibold" style={{ color: theme.textSecondary }}>From:</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    className="text-xs px-2.5 py-1.5 rounded-lg border font-medium"
                    style={{ background: theme.inputBg, borderColor: theme.border, color: theme.textPrimary }}
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <label className="text-xs font-semibold" style={{ color: theme.textSecondary }}>To:</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    className="text-xs px-2.5 py-1.5 rounded-lg border font-medium"
                    style={{ background: theme.inputBg, borderColor: theme.border, color: theme.textPrimary }}
                  />
                </div>

                {/* Quick Presets */}
                <div className="hidden sm:flex items-center gap-1 text-[11px]">
                  <button
                    onClick={() => { setStartDate(firstDayOfMonth); setEndDate(todayStr) }}
                    className="px-2 py-1 rounded border bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 text-gray-700 dark:text-gray-300"
                    title="1st of month to Today"
                  >
                    1st – Today
                  </button>
                  <button
                    onClick={() => {
                      const d7 = new Date()
                      d7.setDate(d7.getDate() - 7)
                      setStartDate(d7.toISOString().slice(0, 10))
                      setEndDate(todayStr)
                    }}
                    className="px-2 py-1 rounded border bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 text-gray-700 dark:text-gray-300"
                  >
                    Last 7 Days
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold flex items-center gap-1.5" style={{ color: theme.textSecondary }}>
                  <FontAwesomeIcon icon={faCalendarAlt} /> Month:
                </label>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={e => setSelectedMonth(e.target.value)}
                  className="text-xs px-3 py-1.5 rounded-lg border font-medium"
                  style={{ background: theme.inputBg, borderColor: theme.border, color: theme.textPrimary }}
                />
              </div>
            )}

            {/* Unit Filter */}
            <div className="flex items-center gap-1.5">
              <label className="text-xs font-semibold" style={{ color: theme.textSecondary }}>Unit:</label>
              <select
                value={selectedUnit}
                onChange={e => setSelectedUnit(e.target.value)}
                className="text-xs px-3 py-1.5 rounded-lg border font-medium"
                style={{ background: theme.inputBg, borderColor: theme.border, color: theme.textPrimary }}
              >
                {units.map(u => (
                  <option key={u.unit_id} value={u.unit_id}>{u.unit_name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-64">
            <input
              type="text"
              placeholder="Search employee or unit..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full text-xs pl-8 pr-3 py-1.5 rounded-lg border"
              style={{ background: theme.inputBg, borderColor: theme.border, color: theme.textPrimary }}
            />
            <FontAwesomeIcon icon={faSearch} className="absolute left-2.5 top-2.5 text-xs text-gray-400" />
          </div>

        </div>

      </div>

      {/* Main Grouped Employee Accordion View */}
      <div className="space-y-3">
        
        {/* Table Top Controls & Expand/Collapse All */}
        <div className="flex items-center justify-between px-1 text-xs">
          <div className="font-semibold text-gray-500">
            Showing <span className="font-bold text-purple-600">{groupedEmployees.length}</span> Employee(s) ({filteredIssues.length} Attendance Issues)
          </div>
          {groupedEmployees.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleExpandAll}
                className="px-2.5 py-1 rounded border bg-white dark:bg-gray-800 hover:bg-gray-50 text-gray-700 dark:text-gray-300 font-medium"
              >
                Expand All
              </button>
              <button
                onClick={handleCollapseAll}
                className="px-2.5 py-1 rounded border bg-white dark:bg-gray-800 hover:bg-gray-50 text-gray-700 dark:text-gray-300 font-medium"
              >
                Collapse All
              </button>
            </div>
          )}
        </div>

        {loading ? (
          <div className="p-12 text-center text-sm rounded-xl border" style={{ background: theme.cardBg, borderColor: theme.border, color: theme.textSecondary }}>
            <FontAwesomeIcon icon={faSync} spin className="text-xl mb-2 text-purple-600 block mx-auto" />
            Loading attendance issues and excuse forms...
          </div>
        ) : groupedEmployees.length === 0 ? (
          <div className="p-12 text-center space-y-2 rounded-xl border" style={{ background: theme.cardBg, borderColor: theme.border }}>
            <FontAwesomeIcon icon={faCheckCircle} className="text-4xl text-emerald-500 mb-2" />
            <h3 className="text-base font-semibold" style={{ color: theme.textPrimary }}>No Attendance Issues Found</h3>
            <p className="text-xs max-w-sm mx-auto" style={{ color: theme.textSecondary }}>
              {statusFilter === 'unfiled'
                ? 'Great news! All employees with attendance issues for this period have submitted their excuse forms.'
                : 'No attendance issues matching the selected filters.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {groupedEmployees.map((group) => {
              const isExpanded = expandedUsers.has(group.user_id)
              const isSendingUser = sendingId === `user_${group.user_id}`

              return (
                <div
                  key={group.user_id}
                  className="rounded-xl border shadow-sm transition-all overflow-hidden"
                  style={{ background: theme.cardBg, borderColor: theme.border }}
                >
                  
                  {/* Employee Card Header (Click to Expand / Collapse) */}
                  <div
                    onClick={() => toggleExpandUser(group.user_id)}
                    className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 cursor-pointer hover:bg-gray-50/50 dark:hover:bg-gray-800/40 transition-colors"
                  >
                    
                    {/* Left: User Info & Expand Icon */}
                    <div className="flex items-center gap-3">
                      <div className="w-6 text-center text-gray-400">
                        <FontAwesomeIcon icon={isExpanded ? faChevronDown : faChevronRight} className="text-sm" />
                      </div>

                      <div className="w-9 h-9 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-600 flex items-center justify-center font-bold text-sm">
                        <FontAwesomeIcon icon={faUser} />
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-sm" style={{ color: theme.textPrimary }}>
                            {group.name}
                          </h3>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 font-medium" style={{ color: theme.textSecondary }}>
                            {group.unit_name || '—'}
                          </span>
                        </div>
                        <div className="text-xs flex items-center gap-2" style={{ color: theme.textSecondary }}>
                          <span>{group.email}</span>
                          <span>•</span>
                          <span>{group.role_name || '—'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Badges & Employee-level Action */}
                    <div className="flex items-center gap-3 ml-9 md:ml-0" onClick={e => e.stopPropagation()}>
                      
                      {/* Summary Counters Badges */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-gray-100 dark:bg-gray-800" style={{ color: theme.textPrimary }}>
                          {group.items.length} {group.items.length === 1 ? 'Issue' : 'Issues'}
                        </span>

                        {group.unfiledCount > 0 && (
                          <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 border border-red-200">
                            🚨 {group.unfiledCount} Unfiled
                          </span>
                        )}

                        {group.pendingCount > 0 && (
                          <span className="px-2 py-1 text-xs font-bold rounded-lg bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200">
                            ⏳ {group.pendingCount} Pending
                          </span>
                        )}

                        {group.approvedCount > 0 && (
                          <span className="px-2 py-1 text-xs font-bold rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200">
                            ✅ {group.approvedCount} Approved
                          </span>
                        )}

                        {group.rejectedCount > 0 && (
                          <span className="px-2 py-1 text-xs font-bold rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300">
                            ❌ {group.rejectedCount} Rejected
                          </span>
                        )}
                      </div>

                      {/* Remind Employee Button */}
                      {group.unfiledCount > 0 && (
                        <button
                          onClick={() => promptSendUserReminder(group)}
                          disabled={isSendingUser}
                          className="px-3.5 py-1.5 text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white rounded-lg shadow-sm transition-all flex items-center gap-1.5"
                        >
                          <FontAwesomeIcon icon={isSendingUser ? faSync : faPaperPlane} spin={isSendingUser} />
                          {isSendingUser ? 'Sending...' : `Remind Employee (${group.unfiledCount})`}
                        </button>
                      )}

                    </div>

                  </div>

                  {/* Expandable Sub-Table of Attendance Issues */}
                  {isExpanded && (
                    <div className="border-t overflow-x-auto" style={{ borderColor: theme.border, background: theme.subtleBg }}>
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b text-gray-500 uppercase tracking-wider text-[10px]" style={{ borderColor: theme.border }}>
                            <th className="p-3 pl-12 font-semibold">Date</th>
                            <th className="p-3 font-semibold">Scan Times</th>
                            <th className="p-3 font-semibold">Attendance Issues</th>
                            <th className="p-3 font-semibold">Excuse Form & Approval Status</th>
                            <th className="p-3 font-semibold text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y" style={{ borderColor: theme.border }}>
                          {group.items.map((item) => {
                            const isSendingSingle = sendingId === item.key

                            return (
                              <tr key={item.key} className="hover:bg-white/60 dark:hover:bg-gray-800/60 transition-colors">
                                
                                {/* Date */}
                                <td className="p-3 pl-12 font-semibold whitespace-nowrap" style={{ color: theme.textPrimary }}>
                                  {item.date}
                                </td>

                                {/* Scan Times */}
                                <td className="p-3 whitespace-nowrap text-[11px]">
                                  <div>CI: <span className="font-mono font-medium">{item.checkIn || '—'}</span></div>
                                  <div>CO: <span className="font-mono font-medium">{item.checkOut || '—'}</span></div>
                                </td>

                                {/* Issues */}
                                <td className="p-3">
                                  <div className="flex flex-wrap gap-1">
                                    {item.issueTypes.map(t => {
                                      const meta = ISSUE_LABELS[t] || { name: t, bg: '#f3f4f6', color: '#374151', border: '#e5e7eb' }
                                      let extraInfo = ''
                                      if (t === 'late' && item.lateMins) extraInfo = ` (${fmtMins(item.lateMins)})`
                                      if (t === 'leave_early' && item.earlyMins) extraInfo = ` (${fmtMins(item.earlyMins)})`
                                      return (
                                        <span
                                          key={t}
                                          className="px-2 py-0.5 text-[10px] font-bold rounded-md border"
                                          style={{ background: meta.bg, color: meta.color, borderColor: meta.border }}
                                        >
                                          {meta.name}{extraInfo}
                                        </span>
                                      )
                                    })}
                                  </div>
                                </td>

                                {/* Excuse Form & Approval Progress */}
                                <td className="p-3">
                                  {item.excuseStatus === 'unfiled' ? (
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold rounded-full bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 border border-red-200">
                                      <FontAwesomeIcon icon={faExclamationTriangle} className="text-xs" />
                                      Belum Mengajukan (Unfiled)
                                    </span>
                                  ) : (
                                    <div className="space-y-1.5 min-w-[220px]">
                                      {/* Category / Reason Badge */}
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className="font-semibold text-xs text-purple-700 dark:text-purple-300">
                                          {CATEGORY_LABEL[item.excuse?.category] || item.excuse?.category || 'Form Submitted'}
                                        </span>
                                        {item.excuse?.other_reason && (
                                          <span className="text-[11px] text-gray-500 italic max-w-xs truncate">
                                            ({item.excuse.other_reason})
                                          </span>
                                        )}
                                      </div>

                                      {/* Attachment File Link (If uploaded by employee) */}
                                      {item.excuse?.attachment_url && (
                                        <div className="pt-0.5">
                                          <a
                                            href={item.excuse.attachment_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-300 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 hover:underline transition-all"
                                            title="Click to view/download uploaded attachment"
                                          >
                                            <FontAwesomeIcon icon={faPaperclip} className="text-[10px]" />
                                            Attachment File <FontAwesomeIcon icon={faExternalLinkAlt} className="text-[9px]" />
                                          </a>
                                        </div>
                                      )}

                                      {/* Approver 1 (L1) Status */}
                                      {item.excuse?.approver1 ? (
                                        <div className="flex items-center gap-1.5 text-[11px]">
                                          <span className="font-semibold text-gray-400 w-6">L1:</span>
                                          {item.excuse.approver1_action === 'approved' || item.excuse.status === 'approved_1' || item.excuse.status === 'approved' ? (
                                            <span className="text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1">
                                              <FontAwesomeIcon icon={faCheckCircle} className="text-xs" />
                                              {getApproverName(item.excuse.approver1)} (Approved)
                                            </span>
                                          ) : item.excuse.approver1_action === 'rejected' || item.excuse.status === 'rejected' ? (
                                            <span className="text-red-700 dark:text-red-400 font-semibold flex items-center gap-1">
                                              <FontAwesomeIcon icon={faTimesCircle} className="text-xs" />
                                              {getApproverName(item.excuse.approver1)} (Rejected)
                                            </span>
                                          ) : (
                                            <span className="text-amber-700 dark:text-amber-400 font-semibold flex items-center gap-1">
                                              <FontAwesomeIcon icon={faClock} className="text-xs" />
                                              {getApproverName(item.excuse.approver1)} (Pending)
                                            </span>
                                          )}
                                        </div>
                                      ) : null}

                                      {/* Approver 2 (L2) Status */}
                                      {item.excuse?.approver2 ? (
                                        <div className="flex items-center gap-1.5 text-[11px]">
                                          <span className="font-semibold text-gray-400 w-6">L2:</span>
                                          {item.excuse.approver2_action === 'approved' || item.excuse.status === 'approved' ? (
                                            <span className="text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1">
                                              <FontAwesomeIcon icon={faCheckCircle} className="text-xs" />
                                              {getApproverName(item.excuse.approver2)} (Approved)
                                            </span>
                                          ) : item.excuse.approver2_action === 'rejected' ? (
                                            <span className="text-red-700 dark:text-red-400 font-semibold flex items-center gap-1">
                                              <FontAwesomeIcon icon={faTimesCircle} className="text-xs" />
                                              {getApproverName(item.excuse.approver2)} (Rejected)
                                            </span>
                                          ) : (
                                            <span className="text-amber-700 dark:text-amber-400 font-semibold flex items-center gap-1">
                                              <FontAwesomeIcon icon={faClock} className="text-xs" />
                                              {getApproverName(item.excuse.approver2)} (Pending)
                                            </span>
                                          )}
                                        </div>
                                      ) : null}
                                    </div>
                                  )}
                                </td>

                                {/* Action Column */}
                                <td className="p-3 text-right whitespace-nowrap">
                                  {item.excuseStatus === 'unfiled' ? (
                                    <button
                                      onClick={() => promptSendSingleReminder(item)}
                                      disabled={isSendingSingle}
                                      className="px-2.5 py-1 text-xs font-semibold bg-purple-100 hover:bg-purple-200 text-purple-700 dark:bg-purple-950 dark:text-purple-300 rounded-lg transition-all flex items-center gap-1 ml-auto"
                                    >
                                      <FontAwesomeIcon icon={isSendingSingle ? faSync : faPaperPlane} spin={isSendingSingle} />
                                      {isSendingSingle ? 'Sending...' : 'Remind Date'}
                                    </button>
                                  ) : item.excuseStatus === 'pending' ? (
                                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950 px-2.5 py-1 rounded-md border border-amber-200">
                                      <FontAwesomeIcon icon={faClock} /> Pending Approval
                                    </span>
                                  ) : item.excuseStatus === 'approved' ? (
                                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950 px-2.5 py-1 rounded-md border border-emerald-200">
                                      <FontAwesomeIcon icon={faCheckCircle} /> Completed
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950 px-2.5 py-1 rounded-md border border-red-200">
                                      <FontAwesomeIcon icon={faTimesCircle} /> Rejected
                                    </span>
                                  )}
                                </td>

                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}

                </div>
              )
            })}
          </div>
        )}

      </div>

    </div>
  )
}
