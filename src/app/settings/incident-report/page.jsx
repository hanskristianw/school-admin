'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useTheme } from '@/lib/theme'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import NotificationModal from '@/components/ui/notification-modal'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faSliders,
  faBuilding,
  faUserPlus,
  faTrash,
  faSearch,
  faUser,
  faEnvelope,
  faSpinner,
  faCheckCircle,
  faArrowLeft,
  faExclamationTriangle
} from '@fortawesome/free-solid-svg-icons'

export default function IncidentNotificationSettingsPage() {
  const router = useRouter()
  const { theme, isDark } = useTheme()

  // Dynamic Styles tied to useTheme() (100% Light & Dark Mode Compatible)
  const inputStyle = { background: theme.inputBg, border: `1px solid ${theme.border}`, color: theme.textPrimary, borderRadius: '6px' }
  const selectStyle = { background: theme.inputBg, border: `1px solid ${theme.border}`, color: theme.textPrimary, borderRadius: '6px' }
  const btnPrimaryStyle = { background: theme.textPrimary, color: isDark ? '#18171A' : '#FFFFFF', border: 'none' }
  const btnSecondaryStyle = { background: theme.cardBg, color: theme.textPrimary, border: `1px solid ${theme.border}` }

  const [loading, setLoading] = useState(true)
  const [units, setUnits] = useState([])
  const [selectedUnitId, setSelectedUnitId] = useState('')
  const [recipients, setRecipients] = useState([])
  const [allUsers, setAllUsers] = useState([])

  // User Autocomplete Search
  const [userSearchText, setUserSearchText] = useState('')
  const [selectedUserToAdd, setSelectedUserToAdd] = useState(null)
  const [showUserDropdown, setShowUserDropdown] = useState(false)
  const userDropdownRef = useRef(null)

  const [submitting, setSubmitting] = useState(false)
  const [notif, setNotif] = useState({ isOpen: false, title: '', message: '', type: 'success' })

  // Fetch Units & All Staff/Users
  const fetchUnitsAndUsers = async () => {
    try {
      setLoading(true)
      const [{ data: unitsData, error: uErr }, { data: usersData, error: usrErr }] = await Promise.all([
        supabase.from('unit').select('*').eq('is_school', true).order('unit_name'),
        supabase.from('users').select('user_id, user_nama_depan, user_nama_belakang, user_email, user_role_id, role:user_role_id(role_name)').eq('is_active', true).order('user_nama_depan')
      ])

      if (uErr) throw uErr
      if (usrErr) throw usrErr

      setUnits(unitsData || [])
      setAllUsers(usersData || [])

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
  const fetchUnitRecipients = async (unitId) => {
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
    } catch (err) {
      console.error('Fetch recipients error:', err)
    }
  }

  useEffect(() => {
    fetchUnitsAndUsers()
  }, [])

  useEffect(() => {
    if (selectedUnitId) {
      fetchUnitRecipients(selectedUnitId)
    }
  }, [selectedUnitId])

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
      setNotif({ isOpen: true, title: 'Success', message: 'Recipient added to unit notification list.', type: 'success' })
      fetchUnitRecipients(selectedUnitId)

    } catch (err) {
      console.error('Add recipient error:', err)
      setNotif({ isOpen: true, title: 'Error', message: err.message || 'Failed to add recipient', type: 'error' })
    } finally {
      setSubmitting(false)
    }
  }

  // Remove Recipient
  const handleRemoveRecipient = async (recipientId) => {
    if (!confirm('Remove this recipient from unit notifications?')) return
    try {
      const { error } = await supabase
        .from('incident_unit_recipients')
        .delete()
        .eq('id', recipientId)

      if (error) throw error

      setNotif({ isOpen: true, title: 'Removed', message: 'Recipient removed.', type: 'success' })
      fetchUnitRecipients(selectedUnitId)
    } catch (err) {
      console.error('Remove recipient error:', err)
      setNotif({ isOpen: true, title: 'Error', message: err.message || 'Failed to remove recipient', type: 'error' })
    }
  }

  const selectedUnitObj = units.find(u => String(u.unit_id) === String(selectedUnitId))

  return (
    <div className="min-h-screen p-4 sm:p-6 md:p-8 font-sans antialiased space-y-6" style={{ background: theme.pageBg, color: theme.textPrimary }}>

      {/* ─── Minimalist Editorial Header ─── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b" style={{ borderColor: theme.border }}>
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wider uppercase mb-2" style={{ background: theme.subtleBg, color: theme.textSecondary, border: `1px solid ${theme.border}` }}>
            <FontAwesomeIcon icon={faSliders} className="text-xs" />
            <span>Incident Notification Recipients</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight" style={{ color: theme.textPrimary }}>
            Incident Notification Settings
          </h1>
          <p className="text-xs sm:text-sm mt-1" style={{ color: theme.textSecondary }}>
            Configure staff members who receive Email and Google Chat alerts for each school unit.
          </p>
        </div>
      </div>

      {/* ─── Main Configuration Card ─── */}
      <div className="rounded-lg border overflow-hidden" style={{ background: theme.cardBg, borderColor: theme.border }}>
        {/* Card Header & Unit Selector */}
        <div className="p-4 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3" style={{ borderColor: theme.border }}>
          <div className="flex items-center gap-2">
            <FontAwesomeIcon icon={faBuilding} className="text-xs" style={{ color: theme.textSecondary }} />
            <h2 className="text-sm font-semibold" style={{ color: theme.textPrimary }}>Select Unit Configuration</h2>
          </div>

          <div className="w-full sm:w-72">
            <select
              value={selectedUnitId}
              onChange={e => setSelectedUnitId(e.target.value)}
              className="w-full text-xs p-2 rounded-md font-semibold border cursor-pointer"
              style={selectStyle}
            >
              {units.map(u => (
                <option key={u.unit_id} value={u.unit_id}>
                  Unit: {u.unit_name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Card Content Body */}
        <div className="p-4 space-y-6">
          {/* Add Recipient Section */}
          <div className="p-4 rounded-lg border space-y-3" style={{ background: theme.subtleBg, borderColor: theme.border }}>
            <div className="text-xs font-semibold flex items-center gap-2" style={{ color: theme.textPrimary }}>
              <FontAwesomeIcon icon={faUserPlus} className="text-xs" style={{ color: theme.textSecondary }} />
              <span>Add Specific Recipient for {selectedUnitObj?.unit_name || 'Unit'}</span>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2">
              {/* Autocomplete Input */}
              <div className="relative flex-1 w-full" ref={userDropdownRef}>
                <input
                  type="text"
                  placeholder="Search user by name or email to add..."
                  value={selectedUserToAdd ? `${selectedUserToAdd.user_nama_depan} ${selectedUserToAdd.user_nama_belakang} (${selectedUserToAdd.user_email})` : userSearchText}
                  onChange={e => {
                    setSelectedUserToAdd(null)
                    setUserSearchText(e.target.value)
                    setShowUserDropdown(true)
                  }}
                  onFocus={() => {
                    if (userSearchText.trim()) setShowUserDropdown(true)
                  }}
                  className="w-full text-xs px-3 py-2 rounded-md"
                  style={inputStyle}
                />
                {selectedUserToAdd && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedUserToAdd(null)
                      setUserSearchText('')
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold cursor-pointer"
                    style={{ color: theme.textSecondary }}
                  >
                    ✕
                  </button>
                )}

                {/* Dropdown Options */}
                {showUserDropdown && !selectedUserToAdd && userSearchText.trim().length > 0 && (
                  <div
                    className="absolute z-50 left-0 right-0 mt-1 max-h-48 overflow-y-auto rounded-md border shadow-md text-xs"
                    style={{ background: theme.cardBg, borderColor: theme.border }}
                  >
                    {matchingUsers.length === 0 ? (
                      <div className="p-3 italic text-center" style={{ color: theme.textSecondary }}>No user found matching "{userSearchText}"</div>
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
                            onMouseEnter={e => { e.currentTarget.style.background = theme.subtleBg }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                          >
                            <div>
                              <div className="font-semibold">{name}</div>
                              <div className="text-[10px] font-mono" style={{ color: theme.textSecondary }}>{usr.user_email}</div>
                            </div>
                            <span className="text-[10px] px-2 py-0.5 rounded font-mono" style={{ background: theme.subtleBg, color: theme.textSecondary }}>
                              {usr.role?.role_name || 'Staff'}
                            </span>
                          </div>
                        )
                      })
                    )}
                  </div>
                )}
              </div>

              {/* Add Button */}
              <button
                disabled={!selectedUserToAdd || submitting}
                onClick={handleAddRecipient}
                className="w-full sm:w-auto text-xs font-medium px-4 py-2 rounded-md transition-all cursor-pointer disabled:opacity-50 inline-flex items-center justify-center gap-1.5 whitespace-nowrap"
                style={btnPrimaryStyle}
              >
                {submitting ? (
                  <FontAwesomeIcon icon={faSpinner} spin />
                ) : (
                  <>
                    <FontAwesomeIcon icon={faUserPlus} className="text-xs" />
                    <span>Add Recipient</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Configured Recipients List Table */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: theme.textSecondary }}>
                Configured Recipients ({recipients.length})
              </h3>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded" style={{ background: theme.subtleBg, color: theme.textSecondary }}>
                Unit: {selectedUnitObj?.unit_name}
              </span>
            </div>

            {loading ? (
              <div className="py-8 text-center text-xs flex items-center justify-center gap-2" style={{ color: theme.textSecondary }}>
                <FontAwesomeIcon icon={faSpinner} spin style={{ color: theme.textPrimary }} />
                <span>Loading recipients...</span>
              </div>
            ) : recipients.length === 0 ? (
              <div className="py-8 text-center text-xs border rounded-md" style={{ color: theme.textSecondary, borderColor: theme.border, background: theme.subtleBg }}>
                No notification recipients configured for <strong>{selectedUnitObj?.unit_name}</strong> unit yet. Use the search bar above to add staff members.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-md border" style={{ borderColor: theme.border }}>
                <table className="min-w-full text-xs border-collapse">
                  <thead>
                    <tr className="text-left border-b font-semibold uppercase tracking-wider text-[10px]" style={{ background: theme.subtleBg, borderColor: theme.border, color: theme.textSecondary }}>
                      <th className="py-3 px-4">Name</th>
                      <th className="py-3 px-4">Email Address</th>
                      <th className="py-3 px-4">Role</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y" style={{ borderColor: theme.border }}>
                    {recipients.map(r => {
                      const name = `${r.user?.user_nama_depan || ''} ${r.user?.user_nama_belakang || ''}`.trim() || 'User'
                      const email = r.user?.user_email || '-'
                      const roleName = r.user?.role?.role_name || 'Staff'

                      return (
                        <tr
                          key={r.id}
                          className="transition-colors duration-150"
                          style={{ borderBottom: `1px solid ${theme.border}` }}
                          onMouseEnter={e => { e.currentTarget.style.background = theme.subtleBg }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                        >
                          <td className="py-3 px-4 font-semibold" style={{ color: theme.textPrimary }}>
                            {name}
                          </td>
                          <td className="py-3 px-4 font-mono text-[11px]" style={{ color: theme.textSecondary }}>
                            <div className="flex items-center gap-1.5">
                              <FontAwesomeIcon icon={faEnvelope} className="text-[10px]" style={{ color: theme.textSecondary }} />
                              <span>{email}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] uppercase font-semibold tracking-wider" style={{ background: theme.blueBg, color: theme.blueText }}>
                              {roleName}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => handleRemoveRecipient(r.id)}
                              className="px-2.5 py-1 text-xs font-medium rounded transition-colors cursor-pointer inline-flex items-center gap-1"
                              style={{ background: theme.redBg, color: theme.redText, border: `1px solid ${theme.redBg}` }}
                            >
                              <FontAwesomeIcon icon={faTrash} />
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
        </div>
      </div>

      {/* Notification Toast */}
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
