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
  const { theme } = useTheme()

  const inputStyle = { background: theme.inputBg, border: `1px solid ${theme.border}`, color: theme.textBody }
  const selectStyle = { background: theme.inputBg, border: `1px solid ${theme.border}`, color: theme.textBody }

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
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: theme.textPrimary }}>
            <FontAwesomeIcon icon={faSliders} className="text-indigo-500" />
            Incident Report Unit Recipients
          </h1>
          <p className="text-xs mt-1" style={{ color: theme.textSecondary }}>
            Configure specific users who receive Email and Google Chat alerts when an incident report or follow-up is logged for a school unit.
          </p>
        </div>
      </div>

      {/* Main Settings Card */}
      <Card style={{ background: theme.cardBg, borderColor: theme.border }}>
        <CardHeader className="pb-3 border-b" style={{ borderColor: theme.border }}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2" style={{ color: theme.textPrimary }}>
              <FontAwesomeIcon icon={faBuilding} className="text-indigo-500" />
              <span>Select Unit Configuration</span>
            </CardTitle>

            {/* Select Unit Dropdown */}
            <div className="w-full sm:w-72">
              <select
                value={selectedUnitId}
                onChange={e => setSelectedUnitId(e.target.value)}
                className="w-full text-xs p-2 rounded-md font-bold border focus:outline-none"
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
        </CardHeader>

        <CardContent className="pt-4 space-y-6">
          {/* Add Recipient Form */}
          <div className="p-4 rounded-lg border space-y-3" style={{ background: theme.subtleBg, borderColor: theme.border }}>
            <div className="text-xs font-bold flex items-center gap-2" style={{ color: theme.textPrimary }}>
              <FontAwesomeIcon icon={faUserPlus} className="text-indigo-500" />
              <span>Add Specific Recipient for {selectedUnitObj?.unit_name || 'Unit'}</span>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2">
              {/* Autocomplete Input */}
              <div className="relative flex-1 w-full" ref={userDropdownRef}>
                <Input
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
                  className="text-xs"
                  style={inputStyle}
                />
                {selectedUserToAdd && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedUserToAdd(null)
                      setUserSearchText('')
                    }}
                    className="absolute right-2.5 top-2 text-xs text-gray-400 hover:text-gray-600 font-bold"
                  >
                    ✕
                  </button>
                )}

                {/* Dropdown Options */}
                {showUserDropdown && !selectedUserToAdd && userSearchText.trim().length > 0 && (
                  <div
                    className="absolute z-50 left-0 right-0 mt-1 max-h-48 overflow-y-auto rounded-md shadow-lg border text-xs"
                    style={{ background: theme.cardBg, borderColor: theme.border }}
                  >
                    {matchingUsers.length === 0 ? (
                      <div className="p-3 text-gray-400 italic text-center">No user found matching "{userSearchText}"</div>
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
                            className="p-2.5 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 cursor-pointer flex items-center justify-between border-b last:border-b-0 transition-colors"
                            style={{ borderColor: theme.border }}
                          >
                            <div>
                              <div className="font-bold" style={{ color: theme.textBody }}>{name}</div>
                              <div className="text-[10px] text-gray-400">{usr.user_email}</div>
                            </div>
                            <span className="text-[10px] px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-medium">
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
              <Button
                disabled={!selectedUserToAdd || submitting}
                onClick={handleAddRecipient}
                className="w-full sm:w-auto text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-semibold flex items-center gap-1.5"
              >
                {submitting ? (
                  <FontAwesomeIcon icon={faSpinner} spin />
                ) : (
                  <>
                    <FontAwesomeIcon icon={faUserPlus} />
                    <span>Add Recipient</span>
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Current Recipients Table */}
          <div>
            <h3 className="text-xs font-bold mb-3 uppercase tracking-wider flex items-center justify-between" style={{ color: theme.textSecondary }}>
              <span>Configured Recipients ({recipients.length})</span>
              <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold normal-case">
                Unit: {selectedUnitObj?.unit_name}
              </span>
            </h3>

            {loading ? (
              <div className="py-8 text-center text-xs text-gray-400 flex items-center justify-center gap-2">
                <FontAwesomeIcon icon={faSpinner} spin />
                <span>Loading recipients...</span>
              </div>
            ) : recipients.length === 0 ? (
              <div className="py-8 text-center text-xs text-gray-400 border rounded-lg border-dashed">
                No notification recipients configured for <strong>{selectedUnitObj?.unit_name}</strong> unit yet. Use the search bar above to add specific users.
              </div>
            ) : (
              <div className="overflow-x-auto border rounded-lg" style={{ borderColor: theme.border }}>
                <table className="min-w-full text-xs">
                  <thead>
                    <tr className="text-left border-b bg-gray-50 dark:bg-gray-800/60 font-semibold text-gray-500" style={{ borderColor: theme.border }}>
                      <th className="py-2.5 px-3">Name</th>
                      <th className="py-2.5 px-3">Email Address</th>
                      <th className="py-2.5 px-3">Role</th>
                      <th className="py-2.5 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y" style={{ borderColor: theme.border }}>
                    {recipients.map(r => {
                      const name = `${r.user?.user_nama_depan || ''} ${r.user?.user_nama_belakang || ''}`.trim() || 'User'
                      const email = r.user?.user_email || '-'
                      const roleName = r.user?.role?.role_name || 'Staff'

                      return (
                        <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                          <td className="py-2.5 px-3 font-bold" style={{ color: theme.textPrimary }}>
                            {name}
                          </td>
                          <td className="py-2.5 px-3 flex items-center gap-1.5 text-gray-600 dark:text-gray-300">
                            <FontAwesomeIcon icon={faEnvelope} className="text-gray-400 text-[10px]" />
                            <span>{email}</span>
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 font-semibold text-[10px]">
                              {roleName}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleRemoveRecipient(r.id)}
                              className="text-[11px] px-2 py-1 flex items-center gap-1 ml-auto"
                            >
                              <FontAwesomeIcon icon={faTrash} />
                              <span>Remove</span>
                            </Button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

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
