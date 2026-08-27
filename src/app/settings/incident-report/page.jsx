'use client'

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useTheme } from '@/lib/theme'
import { Button } from '@/components/ui/button'
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
  faLayerGroup,
  faShieldAlt,
  faBell,
  faPlus,
  faTimes,
  faUserSlash,
  faCheck
} from '@fortawesome/free-solid-svg-icons'

export default function IncidentNotificationSettingsPage() {
  const router = useRouter()
  const { theme, isDark } = useTheme()

  // UI Theme Tokens matching /data/pyp
  const pageBg = theme?.pageBg || (isDark ? '#09090B' : '#FBFBFA')
  const cardBg = theme?.cardBg || (isDark ? '#18181B' : '#FFFFFF')
  const borderColor = theme?.border || (isDark ? '#27272A' : '#EAEAEA')
  const textPrimary = theme?.textPrimary || (isDark ? '#F4F4F5' : '#111111')
  const textSecondary = theme?.textSecondary || (isDark ? '#A1A1AA' : '#787774')
  const inputBg = theme?.inputBg || (isDark ? '#18181B' : '#FFFFFF')

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
      setNotif({ isOpen: true, title: 'Berhasil', message: 'Penerima notifikasi insiden berhasil ditambahkan.', type: 'success' })
      fetchUnitRecipients(selectedUnitId)

    } catch (err) {
      console.error('Add recipient error:', err)
      setNotif({ isOpen: true, title: 'Error', message: err.message || 'Gagal menambahkan penerima', type: 'error' })
    } finally {
      setSubmitting(false)
    }
  }

  // Remove Recipient
  const handleRemoveRecipient = async (recipient) => {
    const staffName = `${recipient.user?.user_nama_depan || ''} ${recipient.user?.user_nama_belakang || ''}`.trim() || 'Staf'
    if (!confirm(`Hapus ${staffName} dari daftar penerima notifikasi insiden unit ini?`)) return
    try {
      const { error } = await supabase
        .from('incident_unit_recipients')
        .delete()
        .eq('id', recipient.id)

      if (error) throw error

      setNotif({ isOpen: true, title: 'Berhasil Dihapus', message: `${staffName} telah dihapus dari daftar penerima.`, type: 'success' })
      fetchUnitRecipients(selectedUnitId)
    } catch (err) {
      console.error('Remove recipient error:', err)
      setNotif({ isOpen: true, title: 'Error', message: err.message || 'Gagal menghapus penerima', type: 'error' })
    }
  }

  const selectedUnitObj = units.find(u => String(u.unit_id) === String(selectedUnitId))

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
    <div style={{ background: pageBg, minHeight: '100vh', padding: '24px 32px', color: textPrimary, fontFamily: "'Geist Sans', 'SF Pro Display', system-ui, -apple-system, sans-serif" }}>

      {/* ── HEADER & BREADCRUMBS (MATCHING /data/pyp LAYOUT) ─────────────── */}
      <div className="pb-5 border-b flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6" style={{ borderColor }}>
        <div>
          <div className="flex items-center gap-2 text-[10px] font-mono tracking-wider uppercase mb-1.5" style={{ color: textSecondary }}>
            <span>[SETTINGS]</span>
            <span>/</span>
            <span>[SYSTEM CONFIGURATION]</span>
            <span>/</span>
            <span className="font-semibold" style={{ color: isDark ? '#60A5FA' : '#0284C7' }}>[INCIDENT NOTIFICATION RECIPIENTS]</span>
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
              <FontAwesomeIcon icon={faBell} className="text-base" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight" style={{ color: textPrimary, letterSpacing: '-0.02em', margin: 0 }}>
                Incident Notification Settings
              </h1>
              <p className="text-xs" style={{ color: textSecondary, margin: '2px 0 0 0' }}>
                Konfigurasi staf dan manajemen penerima notifikasi otomatis (Email &amp; Google Chat) untuk laporan insiden setiap unit sekolah.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── UNIT SELECTION & ADD RECIPIENT BAR (MATCHING /data/pyp) ───────── */}
      <div
        className="p-3.5 rounded border mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4"
        style={{ background: cardBg, borderColor, borderRadius: '8px' }}
      >
        <div className="flex items-center gap-4 flex-wrap flex-1">
          {/* Unit Selector */}
          <div style={{ minWidth: '220px' }}>
            <label className="text-[10px] font-mono uppercase block mb-1 font-bold" style={{ color: isDark ? '#60A5FA' : '#0284C7' }}>
              1. School Unit *
            </label>
            <select
              value={selectedUnitId}
              onChange={e => {
                setSelectedUnitId(e.target.value)
                setSelectedUserToAdd(null)
                setUserSearchText('')
              }}
              className="w-full px-2.5 py-1.5 text-xs font-mono rounded border outline-none cursor-pointer font-bold"
              style={{ background: inputBg, borderColor, color: textPrimary, borderRadius: '4px' }}
            >
              {units.map(u => (
                <option key={u.unit_id} value={u.unit_id}>
                  Unit: {u.unit_name}
                </option>
              ))}
            </select>
          </div>

          {/* Add Staff Search Autocomplete */}
          <div className="relative flex-1" style={{ minWidth: '260px' }} ref={userDropdownRef}>
            <label className="text-[10px] font-mono uppercase block mb-1 font-bold" style={{ color: textSecondary }}>
              2. Tambah Penerima Notifikasi (Staf)
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Ketik nama atau email staf untuk menambahkan..."
                value={selectedUserToAdd ? `${selectedUserToAdd.user_nama_depan} ${selectedUserToAdd.user_nama_belakang} (${selectedUserToAdd.user_email})` : userSearchText}
                onChange={e => {
                  setSelectedUserToAdd(null)
                  setUserSearchText(e.target.value)
                  setShowUserDropdown(true)
                }}
                onFocus={() => {
                  if (userSearchText.trim()) setShowUserDropdown(true)
                }}
                className="w-full pl-7 pr-7 py-1.5 text-xs font-mono rounded border outline-none"
                style={{ background: inputBg, borderColor, color: textPrimary, borderRadius: '4px' }}
              />
              <FontAwesomeIcon icon={faSearch} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs" style={{ color: textSecondary }} />
              
              {selectedUserToAdd && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedUserToAdd(null)
                    setUserSearchText('')
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs cursor-pointer"
                  style={{ color: textSecondary }}
                >
                  <FontAwesomeIcon icon={faTimes} />
                </button>
              )}
            </div>

            {/* Dropdown Options */}
            {showUserDropdown && !selectedUserToAdd && userSearchText.trim().length > 0 && (
              <div
                className="absolute z-50 left-0 right-0 mt-1 max-h-56 overflow-y-auto rounded-md border shadow-lg text-xs"
                style={{ background: cardBg, borderColor }}
              >
                {matchingUsers.length === 0 ? (
                  <div className="p-3 italic text-center font-mono text-[11px]" style={{ color: textSecondary }}>
                    Tidak ada staf ditemukan dengan kata kunci "{userSearchText}"
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
                        className="p-2.5 cursor-pointer flex items-center justify-between border-b last:border-b-0 hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition-colors"
                        style={{ borderColor, color: textPrimary }}
                      >
                        <div>
                          <div className="font-semibold">{name}</div>
                          <div className="text-[10px] font-mono" style={{ color: textSecondary }}>{usr.user_email}</div>
                        </div>
                        <span
                          className="text-[10px] px-2 py-0.5 rounded font-mono font-semibold"
                          style={{
                            background: isDark ? 'rgba(59, 130, 246, 0.15)' : '#E1F3FE',
                            color: isDark ? '#60A5FA' : '#1F6C9F'
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
        </div>

        {/* Add Button */}
        <div>
          <Button
            disabled={!selectedUserToAdd || submitting}
            onClick={handleAddRecipient}
            style={{
              background: textPrimary,
              color: isDark ? '#09090B' : '#FFFFFF',
              fontSize: '12px',
              padding: '8px 16px',
              borderRadius: '6px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              opacity: (!selectedUserToAdd || submitting) ? 0.5 : 1
            }}
          >
            {submitting ? (
              <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
            ) : (
              <FontAwesomeIcon icon={faPlus} />
            )}
            <span>{submitting ? 'Menambahkan...' : 'Tambah Penerima'}</span>
          </Button>
        </div>
      </div>

      {/* ── HORIZONTAL UNIT TABS (MATCHING /data/pyp TABS) ─────────────────── */}
      <div style={{ display: 'flex', borderBottom: `1px solid ${borderColor}`, marginBottom: '20px', gap: '24px', flexWrap: 'wrap' }}>
        {units.map(u => {
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
              style={{
                padding: '12px 0',
                fontSize: '14px',
                fontWeight: isActive ? 600 : 400,
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                color: isActive ? textPrimary : textSecondary,
                borderBottom: isActive ? `2px solid ${textPrimary}` : '2px solid transparent',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.15s ease'
              }}
            >
              <FontAwesomeIcon icon={faBuilding} style={{ fontSize: '13px' }} />
              <span>Unit: {u.unit_name}</span>
              <span
                style={{
                  fontSize: '11px',
                  padding: '1px 6px',
                  borderRadius: '999px',
                  background: isActive ? (isDark ? '#27272A' : '#EAEAEA') : (isDark ? '#1F2937' : '#F4F4F5'),
                  color: textSecondary,
                  fontWeight: 700
                }}
              >
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* ── CONFIGURED RECIPIENTS BENTO CARD ───────────────────────────────── */}
      <div
        style={{
          background: cardBg,
          border: `1px solid ${borderColor}`,
          borderRadius: '8px',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}
      >
        {/* Card Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="text-[10px] font-mono uppercase tracking-wider font-bold" style={{ color: isDark ? '#60A5FA' : '#0284C7' }}>
                Unit: {selectedUnitObj?.unit_name || 'School Unit'}
              </span>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '4px',
                  background: isDark ? 'rgba(59, 130, 246, 0.15)' : '#E1F3FE',
                  color: isDark ? '#60A5FA' : '#1F6C9F',
                  fontFamily: 'monospace'
                }}
              >
                {recipients.length} Penerima Dikonfigurasi
              </span>
            </div>
            <p style={{ fontSize: '12px', color: textSecondary, margin: '4px 0 0 0' }}>
              Daftar staf yang otomatis menerima email &amp; webhook notifikasi saat ada insiden baru di unit {selectedUnitObj?.unit_name}.
            </p>
          </div>

          {/* Filter Search within unit recipients list */}
          {recipients.length > 4 && (
            <div className="relative" style={{ width: '220px' }}>
              <input
                type="text"
                placeholder="Filter penerima..."
                value={searchInList}
                onChange={e => setSearchInList(e.target.value)}
                className="w-full pl-7 pr-2.5 py-1 text-xs font-mono rounded border outline-none"
                style={{ background: inputBg, borderColor, color: textPrimary, borderRadius: '4px' }}
              />
              <FontAwesomeIcon icon={faSearch} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs" style={{ color: textSecondary }} />
            </div>
          )}
        </div>

        {/* Recipients List Table */}
        {loading ? (
          <div style={{ padding: '48px 0', textAlign: 'center', color: textSecondary, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <FontAwesomeIcon icon={faSpinner} className="animate-spin text-xl" />
            <span style={{ fontSize: '13px' }}>Memuat daftar penerima notifikasi...</span>
          </div>
        ) : filteredRecipients.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '48px 20px',
              borderRadius: '6px',
              border: `1px dashed ${borderColor}`,
              background: isDark ? '#151419' : '#FBFBFA',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            <FontAwesomeIcon icon={faUserSlash} style={{ fontSize: '24px', color: textSecondary }} />
            <p style={{ fontSize: '13px', color: textSecondary, margin: 0 }}>
              {searchInList
                ? 'Tidak ada penerima yang cocok dengan kata kunci pencarian.'
                : `Belum ada penerima notifikasi yang dikonfigurasi untuk unit ${selectedUnitObj?.unit_name}.`}
            </p>
            {!searchInList && (
              <span style={{ fontSize: '11px', color: textSecondary, fontStyle: 'italic' }}>
                Gunakan bilah pencarian di atas untuk menambahkan staf sebagai penerima notifikasi.
              </span>
            )}
          </div>
        ) : (
          <div
            style={{
              border: `1px solid ${borderColor}`,
              borderRadius: '6px',
              overflow: 'hidden'
            }}
          >
            <table className="w-full text-xs">
              <thead>
                <tr
                  style={{
                    background: isDark ? '#27272A' : '#FBFBFA',
                    borderBottom: `1px solid ${borderColor}`,
                    color: textSecondary
                  }}
                >
                  <th className="text-left px-3.5 py-2.5 font-mono uppercase tracking-wider text-[10px] font-bold">#</th>
                  <th className="text-left px-3.5 py-2.5 font-mono uppercase tracking-wider text-[10px] font-bold">Nama Staf</th>
                  <th className="text-left px-3.5 py-2.5 font-mono uppercase tracking-wider text-[10px] font-bold">Email Notifikasi</th>
                  <th className="text-left px-3.5 py-2.5 font-mono uppercase tracking-wider text-[10px] font-bold">Role / Jabatan</th>
                  <th className="text-right px-3.5 py-2.5 font-mono uppercase tracking-wider text-[10px] font-bold">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ divideColor: borderColor, background: cardBg }}>
                {filteredRecipients.map((r, idx) => {
                  const name = `${r.user?.user_nama_depan || ''} ${r.user?.user_nama_belakang || ''}`.trim() || 'Staf'
                  const email = r.user?.user_email || '—'
                  const roleName = r.user?.role?.role_name || 'Staff'

                  return (
                    <tr
                      key={r.id}
                      className="hover:bg-neutral-50 dark:hover:bg-neutral-800/30 transition-colors"
                    >
                      <td className="px-3.5 py-3 font-mono text-[11px]" style={{ color: textSecondary, width: '36px' }}>
                        {idx + 1}
                      </td>

                      <td className="px-3.5 py-3 font-semibold" style={{ color: textPrimary }}>
                        <div className="flex items-center gap-2">
                          <FontAwesomeIcon icon={faUser} style={{ fontSize: '11px', color: textSecondary }} />
                          <span>{name}</span>
                        </div>
                      </td>

                      <td className="px-3.5 py-3 font-mono text-[11px]" style={{ color: textSecondary }}>
                        <div className="flex items-center gap-1.5">
                          <FontAwesomeIcon icon={faEnvelope} style={{ fontSize: '10px', color: textSecondary }} />
                          <span>{email}</span>
                        </div>
                      </td>

                      <td className="px-3.5 py-3">
                        <span
                          className="px-2.5 py-0.5 rounded-full text-[10px] uppercase font-semibold tracking-wider"
                          style={{
                            background: isDark ? 'rgba(59, 130, 246, 0.15)' : '#E1F3FE',
                            border: `1px solid ${isDark ? '#2563EB' : '#BAE6FD'}`,
                            color: isDark ? '#60A5FA' : '#1F6C9F'
                          }}
                        >
                          {roleName}
                        </span>
                      </td>

                      <td className="px-3.5 py-3 text-right">
                        <button
                          onClick={() => handleRemoveRecipient(r)}
                          className="px-2.5 py-1 text-xs font-semibold rounded transition-colors cursor-pointer inline-flex items-center gap-1"
                          style={{
                            background: isDark ? '#3A1E1E' : '#FDEBEC',
                            border: `1px solid ${isDark ? '#542626' : '#F8C9CC'}`,
                            color: isDark ? '#DC8585' : '#9F2F2D'
                          }}
                        >
                          <FontAwesomeIcon icon={faTrash} style={{ fontSize: '10px' }} />
                          <span>Hapus</span>
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

      {/* ── NOTIFICATION MODAL ─────────────────────────────────────────────── */}
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
