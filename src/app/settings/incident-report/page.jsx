'use client'

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useTheme } from '@/lib/theme'
import Modal from '@/components/ui/modal'
import NotificationModal from '@/components/ui/notification-modal'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faSliders,
  faBuilding,
  faUserPlus,
  faTrash,
  faSearch,
  faEnvelope,
  faSpinner,
  faShieldAlt,
  faPlus,
  faTimes,
  faUserSlash,
  faExclamationTriangle
} from '@fortawesome/free-solid-svg-icons'

// Staff Avatar with error fallback & initials matching StudentAvatar in /data/incident-report
function StaffAvatar({ user, theme, size = "w-6 h-6", textSize = "text-[9px]" }) {
  const [imgError, setImgError] = useState(false)
  const pic = user?.user_manual_picture || user?.user_profile_picture
  const initials = `${user?.user_nama_depan?.[0] || ''}${user?.user_nama_belakang?.[0] || ''}`.toUpperCase()

  if (pic && !imgError) {
    return (
      <img
        src={pic}
        alt=""
        referrerPolicy="no-referrer"
        onError={() => setImgError(true)}
        className={`${size} rounded-full object-cover border shrink-0`}
        style={{ borderColor: theme?.border || '#E5E7EB' }}
      />
    )
  }

  return (
    <div
      className={`${size} rounded-full flex items-center justify-center font-mono ${textSize} font-bold border shrink-0`}
      style={{
        background: theme?.subtleBg || '#F3F4F6',
        color: theme?.textSecondary || '#6B7280',
        borderColor: theme?.border || '#E5E7EB'
      }}
    >
      {initials || '?'}
    </div>
  )
}

export default function IncidentNotificationSettingsPage() {
  const router = useRouter()
  const { theme, isDark } = useTheme()

  const [loading, setLoading] = useState(true)
  const [units, setUnits] = useState([])
  const [selectedUnitId, setSelectedUnitId] = useState('')
  const [recipients, setRecipients] = useState([])
  const [allUsers, setAllUsers] = useState([])
  const [unitRecipientsMap, setUnitRecipientsMap] = useState({}) // { [unitId]: count }

  // User Autocomplete Search
  const [userSearchText, setUserSearchText] = useState('')
  const [selectedUserToAdd, setSelectedUserToAdd] = useState(null)
  const [showUserDropdown, setShowUserDropdown] = useState(false)
  const userDropdownRef = useRef(null)

  // List Search inside active unit
  const [searchInList, setSearchInList] = useState('')

  // Delete Confirmation Modal State
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [recipientToDelete, setRecipientToDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const [submitting, setSubmitting] = useState(false)
  const [notif, setNotif] = useState({ isOpen: false, title: '', message: '', type: 'success' })

  // Fetch Units & All Staff/Users
  const fetchUnitsAndUsers = async () => {
    try {
      setLoading(true)
      const [{ data: unitsData, error: uErr }, { data: usersData, error: usrErr }, { data: allRecipientsData, error: rErr }] = await Promise.all([
        supabase.from('unit').select('*').eq('is_school', true).order('unit_name'),
        supabase.from('users').select('user_id, user_nama_depan, user_nama_belakang, user_email, user_role_id, role:user_role_id(role_name)').eq('is_active', true).order('user_nama_depan'),
        supabase.from('incident_unit_recipients').select('id, unit_id, user_id')
      ])

      if (uErr) throw uErr
      if (usrErr) throw usrErr

      setUnits(unitsData || [])
      setAllUsers(usersData || [])

      // Build count map
      const countMap = {}
      ;(allRecipientsData || []).forEach(r => {
        countMap[r.unit_id] = (countMap[r.unit_id] || 0) + 1
      })
      setUnitRecipientsMap(countMap)

      if (unitsData && unitsData.length > 0) {
        setSelectedUnitId(String(unitsData[0].unit_id))
      }
    } catch (err) {
      console.error('Fetch units/users error:', err)
      setNotif({ isOpen: true, title: 'Error', message: err.message || 'Failed to load setup data', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  // Fetch recipients for selected unit
  const fetchUnitRecipients = useCallback(async (unitId) => {
    if (!unitId) return
    try {
      const { data, error } = await supabase
        .from('incident_unit_recipients')
        .select(`
          id,
          unit_id,
          user_id,
          user:user_id(user_id, user_nama_depan, user_nama_belakang, user_email, role:user_role_id(role_name))
        `)
        .eq('unit_id', parseInt(unitId))

      if (error) throw error
      setRecipients(data || [])
      setUnitRecipientsMap(prev => ({ ...prev, [unitId]: (data || []).length }))
    } catch (err) {
      console.error('Fetch recipients error:', err)
    }
  }, [])

  useEffect(() => {
    fetchUnitsAndUsers()
  }, [])

  useEffect(() => {
    if (selectedUnitId) {
      fetchUnitRecipients(selectedUnitId)
    }
  }, [selectedUnitId, fetchUnitRecipients])

  // Handle click outside autocomplete
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (userDropdownRef.current && !userDropdownRef.current.contains(e.target)) {
        setShowUserDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Filtered users for autocomplete (exclude already added users)
  const existingUserIds = useMemo(() => new Set(recipients.map(r => r.user_id)), [recipients])

  const matchingUsers = useMemo(() => {
    const q = userSearchText.trim().toLowerCase()
    if (!q) return []
    return allUsers
      .filter(u => !existingUserIds.has(u.user_id))
      .filter(u => {
        const fullName = `${u.user_nama_depan || ''} ${u.user_nama_belakang || ''}`.toLowerCase()
        const email = (u.user_email || '').toLowerCase()
        return fullName.includes(q) || email.includes(q)
      })
      .slice(0, 10)
  }, [allUsers, existingUserIds, userSearchText])

  // Add User Recipient
  const handleAddRecipient = async () => {
    if (!selectedUserToAdd || !selectedUnitId) return
    try {
      setSubmitting(true)
      const payload = {
        unit_id: parseInt(selectedUnitId),
        user_id: selectedUserToAdd.user_id
      }

      const { error } = await supabase
        .from('incident_unit_recipients')
        .insert([payload])

      if (error) throw error

      setSelectedUserToAdd(null)
      setUserSearchText('')
      setShowUserDropdown(false)
      setNotif({ isOpen: true, title: 'Recipient Added', message: 'Staff successfully configured for incident notifications.', type: 'success' })
      fetchUnitRecipients(selectedUnitId)

    } catch (err) {
      console.error('Add recipient error:', err)
      setNotif({ isOpen: true, title: 'Error', message: err.message || 'Failed to add recipient', type: 'error' })
    } finally {
      setSubmitting(false)
    }
  }

  // Confirm and Remove Recipient
  const handleConfirmDelete = async () => {
    if (!recipientToDelete) return
    const staffName = `${recipientToDelete.user?.user_nama_depan || ''} ${recipientToDelete.user?.user_nama_belakang || ''}`.trim() || 'Staff'
    try {
      setDeleting(true)
      const { error } = await supabase
        .from('incident_unit_recipients')
        .delete()
        .eq('id', recipientToDelete.id)

      if (error) throw error

      setNotif({ isOpen: true, title: 'Recipient Removed', message: `${staffName} has been removed from incident notifications.`, type: 'success' })
      setShowDeleteModal(false)
      setRecipientToDelete(null)
      fetchUnitRecipients(selectedUnitId)
    } catch (err) {
      console.error('Remove recipient error:', err)
      setNotif({ isOpen: true, title: 'Error', message: err.message || 'Failed to remove recipient', type: 'error' })
    } finally {
      setDeleting(false)
    }
  }

  const selectedUnitObj = units.find(u => String(u.unit_id) === String(selectedUnitId))

  const totalAllRecipients = useMemo(() => {
    return Object.values(unitRecipientsMap).reduce((a, b) => a + b, 0)
  }, [unitRecipientsMap])

  // Filtered recipients in current unit
  const filteredRecipients = useMemo(() => {
    if (!searchInList.trim()) return recipients
    const q = searchInList.toLowerCase().trim()
    return recipients.filter(r => {
      const name = `${r.user?.user_nama_depan || ''} ${r.user?.user_nama_belakang || ''}`.toLowerCase()
      const email = (r.user?.user_email || '').toLowerCase()
      const role = (r.user?.role?.role_name || '').toLowerCase()
      return name.includes(q) || email.includes(q) || role.includes(q)
    })
  }, [recipients, searchInList])

  return (
    <div 
      className="min-h-screen p-4 sm:p-8 space-y-6"
      style={{
        background: theme.pageBg,
        color: theme.textPrimary,
        fontFamily: "'SF Pro Display', 'Geist Sans', 'Helvetica Neue', sans-serif"
      }}
    >
      {/* Editorial Document Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b" style={{ borderColor: theme.border }}>
        <div>
          <div className="flex items-center gap-2 text-[10px] font-mono tracking-wider uppercase mb-1.5" style={{ color: theme.textSecondary }}>
            <span>[WORKSPACE]</span>
            <span>/</span>
            <span>[PASTORAL CARE]</span>
            <span>/</span>
            <span className="font-semibold" style={{ color: theme.blueText }}>[INCIDENT NOTIFICATION SETTINGS]</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight" style={{ color: theme.textPrimary, letterSpacing: '-0.02em' }}>
            Incident Notification Settings
          </h1>
          <p className="text-xs mt-1" style={{ color: theme.textSecondary, lineHeight: '1.6' }}>
            Configure staff and management recipient rules for automated incident report notifications across school units.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap self-start md:self-auto">
          <button
            onClick={() => router.push('/data/incident-report')}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded border transition-colors cursor-pointer"
            style={{
              background: theme.cardBg,
              borderColor: theme.border,
              color: theme.textPrimary,
              borderRadius: '4px'
            }}
          >
            <FontAwesomeIcon icon={faShieldAlt} className="text-[10px]" />
            <span>Incident Portal</span>
          </button>

          <button
            onClick={() => router.push('/data/incident-report-approval')}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded border transition-colors cursor-pointer"
            style={{
              background: theme.cardBg,
              borderColor: theme.border,
              color: theme.textPrimary,
              borderRadius: '4px'
            }}
          >
            <FontAwesomeIcon icon={faSliders} className="text-[10px]" />
            <span>Approval Queue</span>
          </button>
        </div>
      </div>

      {/* Live Segmented Tabs */}
      <div className="flex items-center p-1 rounded border gap-1 self-start flex-wrap" style={{ background: theme.cardBg, borderColor: theme.border, borderRadius: '4px' }}>
        {units.map((u, idx) => {
          const isActive = String(u.unit_id) === String(selectedUnitId)
          const count = unitRecipientsMap[u.unit_id] || 0
          return (
            <button
              key={u.unit_id}
              onClick={() => {
                setSelectedUnitId(String(u.unit_id))
                setSelectedUserToAdd(null)
                setUserSearchText('')
              }}
              className="flex items-center gap-2 px-3 py-1.5 rounded text-xs font-semibold transition-all cursor-pointer"
              style={{
                background: isActive ? (isDark ? '#232228' : theme.blueBg) : 'transparent',
                color: isActive ? (isDark ? '#F0EFE9' : theme.blueText) : theme.textSecondary,
                borderRadius: '4px'
              }}
            >
              <span className="font-mono text-[10px] opacity-60">{String(idx + 1).padStart(2, '0')}.</span>
              <span>Unit: {u.unit_name}</span>
              <span className="font-mono text-[10px] px-1.5 py-0.2 rounded border" style={{ borderColor: theme.border }}>
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Bento Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded border" style={{ background: theme.cardBg, borderColor: theme.border, borderRadius: '4px' }}>
          <span className="font-mono text-[10px] uppercase tracking-wider block mb-1" style={{ color: theme.textSecondary }}>// ACTIVE UNIT</span>
          <div className="text-xl sm:text-2xl font-bold font-mono tracking-tight" style={{ color: theme.textPrimary }}>
            {selectedUnitObj?.unit_name || '-'}
          </div>
          <span className="text-[10px] font-mono mt-1 block" style={{ color: theme.textSecondary }}>
            Department target
          </span>
        </div>

        <div className="p-4 rounded border" style={{ background: theme.cardBg, borderColor: theme.border, borderRadius: '4px' }}>
          <span className="font-mono text-[10px] uppercase tracking-wider block mb-1" style={{ color: theme.textSecondary }}>// CONFIGURED RECIPIENTS</span>
          <div className="text-xl sm:text-2xl font-bold font-mono tracking-tight" style={{ color: theme.blueText }}>
            {recipients.length}
          </div>
          <span className="text-[10px] font-mono mt-1 block" style={{ color: theme.textSecondary }}>
            Staff in active unit alert list
          </span>
        </div>

        <div className="p-4 rounded border col-span-2 sm:col-span-1" style={{ background: theme.cardBg, borderColor: theme.border, borderRadius: '4px' }}>
          <span className="font-mono text-[10px] uppercase tracking-wider block mb-1" style={{ color: theme.textSecondary }}>// TOTAL SYSTEM RECIPIENTS</span>
          <div className="text-xl sm:text-2xl font-bold font-mono tracking-tight" style={{ color: theme.textPrimary }}>
            {totalAllRecipients}
          </div>
          <span className="text-[10px] font-mono mt-1 block" style={{ color: theme.textSecondary }}>
            Across {units.length} registered school units
          </span>
        </div>
      </div>

      {/* Filtering & Add Toolbar */}
      <div className="p-3 rounded border flex flex-col md:flex-row md:items-center justify-between gap-4" style={{ background: theme.cardBg, borderColor: theme.border, borderRadius: '4px' }}>
        {/* Left: Add Staff Autocomplete */}
        <div className="flex items-center gap-2 flex-1 flex-wrap">
          <div className="relative flex-1" style={{ minWidth: '280px' }} ref={userDropdownRef}>
            <FontAwesomeIcon icon={faUserPlus} className="absolute left-3 top-1/2 -translate-y-1/2 text-xs" style={{ color: theme.textSecondary }} />
            <input
              type="text"
              placeholder={`Search staff name or email to add to ${selectedUnitObj?.unit_name || 'unit'}...`}
              value={selectedUserToAdd ? `${selectedUserToAdd.user_nama_depan} ${selectedUserToAdd.user_nama_belakang} (${selectedUserToAdd.user_email})` : userSearchText}
              onChange={e => {
                setSelectedUserToAdd(null)
                setUserSearchText(e.target.value)
                setShowUserDropdown(true)
              }}
              onFocus={() => {
                if (userSearchText.trim()) setShowUserDropdown(true)
              }}
              className="w-full pl-8 pr-8 py-1.5 text-xs font-mono rounded border outline-none transition-colors"
              style={{
                background: theme.inputBg,
                borderColor: theme.border,
                color: theme.textPrimary,
                borderRadius: '4px'
              }}
            />

            {selectedUserToAdd && (
              <button
                type="button"
                onClick={() => {
                  setSelectedUserToAdd(null)
                  setUserSearchText('')
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs cursor-pointer"
                style={{ color: theme.textSecondary }}
              >
                <FontAwesomeIcon icon={faTimes} />
              </button>
            )}

            {/* Dropdown Options */}
            {showUserDropdown && !selectedUserToAdd && userSearchText.trim().length > 0 && (
              <div
                className="absolute z-50 left-0 right-0 mt-1 max-h-56 overflow-y-auto rounded border shadow-lg text-xs"
                style={{ background: theme.cardBg, borderColor: theme.border, borderRadius: '4px' }}
              >
                {matchingUsers.length === 0 ? (
                  <div className="p-3 italic text-center font-mono text-[11px]" style={{ color: theme.textSecondary }}>
                    No staff found matching "{userSearchText}"
                  </div>
                ) : (
                  matchingUsers.map(usr => {
                    const name = `${usr.user_nama_depan} ${usr.user_nama_belakang}`
                    return (
                      <div
                        key={usr.user_id}
                        onClick={() => {
                          setSelectedUserToAdd(usr)
                          setShowUserDropdown(false)
                        }}
                        className="p-2.5 cursor-pointer flex items-center justify-between border-b last:border-b-0 transition-colors"
                        style={{ borderColor: theme.border, color: theme.textPrimary }}
                        onMouseEnter={e => e.currentTarget.style.background = theme.subtleBg}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <div>
                          <div className="font-semibold">{name}</div>
                          <div className="text-[10px] font-mono" style={{ color: theme.textSecondary }}>{usr.user_email}</div>
                        </div>
                        <span
                          className="text-[10px] px-2 py-0.5 rounded font-mono font-semibold"
                          style={{
                            background: theme.blueBg,
                            color: theme.blueText,
                            borderRadius: '3px'
                          }}
                        >
                          {usr.role?.role_name || 'Staff'}
                        </span>
                      </div>
                    )
                  })
                )}
              </div>
            )}
          </div>

          <button
            disabled={!selectedUserToAdd || submitting}
            onClick={handleAddRecipient}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
            style={{
              background: theme.textPrimary,
              color: isDark ? '#111111' : '#FFFFFF',
              borderRadius: '4px'
            }}
          >
            {submitting ? (
              <FontAwesomeIcon icon={faSpinner} spin className="text-[10px]" />
            ) : (
              <FontAwesomeIcon icon={faPlus} className="text-[10px]" />
            )}
            <span>Add Recipient</span>
          </button>
        </div>

        {/* Right: Search Filter in current unit list */}
        <div className="relative w-full md:w-64">
          <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 -translate-y-1/2 text-xs" style={{ color: theme.textSecondary }} />
          <input
            type="text"
            placeholder="Filter configured staff..."
            value={searchInList}
            onChange={e => setSearchInList(e.target.value)}
            className="w-full pl-8 pr-4 py-1.5 text-xs font-mono rounded border outline-none transition-colors"
            style={{
              background: theme.inputBg,
              borderColor: theme.border,
              color: theme.textPrimary,
              borderRadius: '4px'
            }}
          />
        </div>
      </div>

      {/* Table Container */}
      <div className="rounded border overflow-hidden" style={{ background: theme.cardBg, borderColor: theme.border, borderRadius: '4px' }}>
        <div className="p-3 border-b flex items-center justify-between" style={{ borderColor: theme.border }}>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold" style={{ color: theme.textPrimary }}>
              RECIPIENTS: {selectedUnitObj?.unit_name?.toUpperCase() || 'UNIT'}
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded border" style={{ borderColor: theme.border, color: theme.textSecondary }}>
              {filteredRecipients.length} configured
            </span>
          </div>
          <span className="text-[10px] font-mono hidden sm:inline" style={{ color: theme.textSecondary }}>
            Automatic notifications triggered on incident creation
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center" style={{ color: theme.textSecondary }}>
            <FontAwesomeIcon icon={faSpinner} spin className="text-xl mb-2" />
            <p className="text-xs font-mono">LOADING RECIPIENTS...</p>
          </div>
        ) : filteredRecipients.length === 0 ? (
          <div className="p-12 text-center" style={{ color: theme.textSecondary }}>
            <FontAwesomeIcon icon={faUserSlash} className="text-2xl mb-2 opacity-50" />
            <p className="text-xs font-mono">
              {searchInList ? 'NO MATCHING RECIPIENTS FOUND' : `NO RECIPIENTS CONFIGURED FOR ${selectedUnitObj?.unit_name?.toUpperCase() || 'THIS UNIT'}`}
            </p>
            {!searchInList && (
              <p className="text-[11px] font-mono mt-1 opacity-70">
                Use the search bar above to assign staff who should receive automated alerts.
              </p>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b text-[10px] font-mono font-bold uppercase tracking-wider" style={{ background: theme.subtleBg, borderColor: theme.border, color: theme.textSecondary }}>
                  <th className="py-3 px-4 w-12">#</th>
                  <th className="py-3 px-4">STAFF MEMBER</th>
                  <th className="py-3 px-4">NOTIFICATION EMAIL</th>
                  <th className="py-3 px-4">ROLE / POSITION</th>
                  <th className="py-3 px-4 text-right">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: theme.border }}>
                {filteredRecipients.map((r, idx) => {
                  const name = `${r.user?.user_nama_depan || ''} ${r.user?.user_nama_belakang || ''}`.trim() || 'Staff'
                  const email = r.user?.user_email || '—'
                  const roleName = r.user?.role?.role_name || 'Staff'

                  return (
                    <tr
                      key={r.id}
                      className="transition-colors"
                      style={{ background: 'transparent' }}
                      onMouseEnter={e => e.currentTarget.style.background = theme.subtleBg}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <td className="py-3 px-4 font-mono text-[11px]" style={{ color: theme.textSecondary }}>
                        {idx + 1}
                      </td>

                      <td className="py-3 px-4 font-semibold" style={{ color: theme.textPrimary }}>
                        <div className="flex items-center gap-2.5">
                          <StaffAvatar user={r.user} theme={theme} />
                          <span>{name}</span>
                        </div>
                      </td>

                      <td className="py-3 px-4 font-mono text-[11px]" style={{ color: theme.textSecondary }}>
                        <div className="flex items-center gap-1.5">
                          <FontAwesomeIcon icon={faEnvelope} style={{ fontSize: '10px', color: theme.textSecondary }} />
                          <span>{email}</span>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold"
                          style={{
                            background: theme.blueBg,
                            color: theme.blueText,
                            borderRadius: '3px'
                          }}
                        >
                          {roleName}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => {
                            setRecipientToDelete(r)
                            setShowDeleteModal(true)
                          }}
                          className="px-2.5 py-1 text-xs font-semibold rounded transition-colors cursor-pointer inline-flex items-center gap-1.5"
                          style={{
                            background: isDark ? '#3A1E1E' : '#FDEBEC',
                            border: `1px solid ${theme.border}`,
                            color: isDark ? '#DC8585' : '#9F2F2D',
                            borderRadius: '4px'
                          }}
                        >
                          <FontAwesomeIcon icon={faTrash} className="text-[10px]" />
                          <span>Remove</span>
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false)
          setRecipientToDelete(null)
        }}
        title="Confirm Remove Recipient"
        maxWidth="max-w-md"
      >
        <div className="space-y-3.5 text-xs" style={{ fontFamily: "'SF Pro Display', 'Geist Sans', 'Helvetica Neue', sans-serif" }}>
          <div className="p-3.5 rounded border flex items-start gap-3" style={{ background: isDark ? '#3A1E1E' : '#FDEBEC', borderColor: theme.border, borderRadius: '4px' }}>
            <FontAwesomeIcon icon={faExclamationTriangle} className="text-sm mt-0.5" style={{ color: isDark ? '#DC8585' : '#9F2F2D' }} />
            <div>
              <h4 className="font-bold uppercase font-mono tracking-wider" style={{ color: isDark ? '#DC8585' : '#9F2F2D' }}>
                Confirm Removal
              </h4>
              <p className="mt-1 leading-relaxed" style={{ color: theme.textPrimary }}>
                Are you sure you want to remove <strong>{recipientToDelete?.user?.user_nama_depan} {recipientToDelete?.user?.user_nama_belakang}</strong> from receiving incident notifications for <strong>{selectedUnitObj?.unit_name}</strong>?
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              onClick={() => {
                setShowDeleteModal(false)
                setRecipientToDelete(null)
              }}
              className="px-4 py-1.5 text-xs font-medium rounded border transition-colors cursor-pointer"
              style={{ background: theme.cardBg, borderColor: theme.border, color: theme.textPrimary, borderRadius: '4px' }}
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmDelete}
              disabled={deleting}
              className="px-4 py-1.5 text-xs font-semibold rounded transition-all cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
              style={{ background: isDark ? '#3A1E1E' : '#FDEBEC', color: isDark ? '#DC8585' : '#9F2F2D', border: `1px solid ${theme.border}`, borderRadius: '4px' }}
            >
              {deleting ? 'Removing...' : 'Remove Recipient'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Notification Toast Modal */}
      <NotificationModal
        isOpen={notif.isOpen}
        onClose={() => setNotif(p => ({ ...p, isOpen: false }))}
        title={notif.title}
        message={notif.message}
        type={notif.type}
      />
    </div>
  )
}
