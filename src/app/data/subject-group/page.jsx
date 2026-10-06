'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { useTheme } from '@/lib/theme'
import Modal from '@/components/ui/modal'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faLayerGroup,
  faPlus,
  faSearch,
  faEdit,
  faTrash,
  faSave,
  faSpinner,
  faCheck,
  faCheckCircle,
  faExclamationTriangle,
  faStar,
  faBan,
  faBookOpen
} from '@fortawesome/free-solid-svg-icons'

const CRITERIA = ['A', 'B', 'C', 'D']
const BANDS = [
  { label: '1-2', min: 1, max: 2 },
  { label: '3-4', min: 3, max: 4 },
  { label: '5-6', min: 5, max: 6 },
  { label: '7-8', min: 7, max: 8 }
]
const MYP_YEARS = [1, 2, 3, 4, 5]
const UNIVERSAL_YEAR = 0 // myp_year=0 applies to all years (e.g. Community Project)
const SEMESTERS = [
  { value: 0, label: 'Shared (S1 & S2)' },
  { value: 1, label: 'Semester 1' },
  { value: 2, label: 'Semester 2' }
]

export default function SubjectGroupPage() {
  const { theme, isDark } = useTheme()

  // ─── Minimalist UI Design Tokens (matching /data/pyp) ─────────────
  const pageBg = isDark ? '#09090B' : '#FBFBFA'
  const cardBg = isDark ? '#18181B' : '#FFFFFF'
  const cardBgAlt = isDark ? '#27272A' : '#F4F4F5'
  const borderColor = isDark ? '#27272A' : '#EAEAEA'
  const textPrimary = isDark ? '#F4F4F5' : '#111111'
  const textSecondary = isDark ? '#A1A1AA' : '#787774'

  // Muted Pastels
  const pastelGreen = {
    bg: isDark ? 'rgba(52, 211, 153, 0.12)' : '#EDF3EC',
    text: isDark ? '#34d399' : '#346538',
    border: isDark ? 'rgba(52, 211, 153, 0.25)' : '#C3E6CB'
  }
  const pastelBlue = {
    bg: isDark ? 'rgba(96, 165, 250, 0.12)' : '#E1F3FE',
    text: isDark ? '#60a5fa' : '#1F6C9F',
    border: isDark ? 'rgba(96, 165, 250, 0.25)' : '#BAE6FD'
  }
  const pastelYellow = {
    bg: isDark ? 'rgba(251, 191, 36, 0.12)' : '#FBF3DB',
    text: isDark ? '#fbbf24' : '#956400',
    border: isDark ? 'rgba(251, 191, 36, 0.25)' : '#FCE9A6'
  }
  const pastelRed = {
    bg: isDark ? 'rgba(248, 113, 113, 0.12)' : '#FDEBEC',
    text: isDark ? '#f87171' : '#9F2F2D',
    border: isDark ? 'rgba(248, 113, 113, 0.25)' : '#F8B4B4'
  }
  const pastelPurple = {
    bg: isDark ? 'rgba(168, 85, 247, 0.12)' : '#F3E8FF',
    text: isDark ? '#c084fc' : '#6B21A8',
    border: isDark ? 'rgba(168, 85, 247, 0.25)' : '#E9D5FF'
  }

  const criterionColors = {
    A: pastelBlue,
    B: pastelGreen,
    C: pastelYellow,
    D: pastelPurple
  }

  const inputStyle = {
    background: isDark ? '#27272A' : '#FFFFFF',
    border: `1px solid ${borderColor}`,
    color: textPrimary,
    borderRadius: '6px',
    fontSize: '13px',
    padding: '8px 12px',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box'
  }

  const btnPrimary = {
    background: textPrimary,
    color: isDark ? '#09090B' : '#FFFFFF',
    border: 'none',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: 600,
    padding: '8px 16px',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    transition: 'all 0.15s ease'
  }

  const btnSecondary = {
    background: 'transparent',
    color: textPrimary,
    border: `1px solid ${borderColor}`,
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: 500,
    padding: '8px 14px',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    transition: 'all 0.15s ease'
  }

  // ─── States ───────────────────────────────────────────────────────
  const [groups, setGroups] = useState([])
  const [loadingGroups, setLoadingGroups] = useState(true)
  const [groupSearch, setGroupSearch] = useState('')

  // Add / Edit Group Modal
  const [showGroupModal, setShowGroupModal] = useState(false)
  const [editingGroup, setEditingGroup] = useState(null)
  const [groupName, setGroupName] = useState('')
  const [savingGroup, setSavingGroup] = useState(false)

  // Delete Group State & Protection
  const [groupToDelete, setGroupToDelete] = useState(null)
  const [deleteBlockReason, setDeleteBlockReason] = useState(null) // { subjectCount, descCount }
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deletingGroup, setDeletingGroup] = useState(false)

  // Descriptor Editor States
  const [selectedGroupId, setSelectedGroupId] = useState('')
  const [selectedYear, setSelectedYear] = useState(1)
  const [selectedSemester, setSelectedSemester] = useState(0)
  const [descriptors, setDescriptors] = useState({}) // key: "A_1", value: { id, text, dirty }
  const [loadingDesc, setLoadingDesc] = useState(false)
  const [savingDesc, setSavingDesc] = useState(false)

  // Toast Notification State
  const [toast, setToast] = useState(null)
  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 4000)
  }

  // ─── Load Subject Groups ──────────────────────────────────────────
  const fetchGroups = async (autoSelectId = null) => {
    try {
      setLoadingGroups(true)
      const { data, error } = await supabase
        .from('subject_group')
        .select('id, name')
        .order('name')

      if (error) throw error
      const list = data || []
      setGroups(list)

      if (autoSelectId) {
        setSelectedGroupId(String(autoSelectId))
      } else if (list.length > 0 && !selectedGroupId) {
        setSelectedGroupId(String(list[0].id))
      }
    } catch (e) {
      console.error('Error fetching groups:', e)
      showToast('Gagal memuat subject group: ' + e.message, 'error')
    } finally {
      setLoadingGroups(false)
    }
  }

  useEffect(() => {
    fetchGroups()
  }, [])

  // ─── Load Descriptors ─────────────────────────────────────────────
  const fetchDescriptors = async (groupId, year, sem) => {
    if (!groupId) return
    try {
      setLoadingDesc(true)
      const { data, error } = await supabase
        .from('criterion_descriptors')
        .select('id, criterion, band_min, band_max, descriptor')
        .eq('subject_group_id', groupId)
        .eq('myp_year', year)
        .eq('semester', sem)

      if (error) throw error

      const map = {}
      ;(data || []).forEach((d) => {
        map[`${d.criterion}_${d.band_min}`] = {
          id: d.id,
          text: d.descriptor || '',
          dirty: false
        }
      })

      // Ensure all 16 cells exist (4 criteria x 4 bands)
      CRITERIA.forEach((c) =>
        BANDS.forEach((b) => {
          const key = `${c}_${b.min}`
          if (!map[key]) {
            map[key] = { id: null, text: '', dirty: false }
          }
        })
      )

      setDescriptors(map)
    } catch (e) {
      console.error('Error fetching descriptors:', e)
      showToast('Gagal memuat deskriptor: ' + e.message, 'error')
    } finally {
      setLoadingDesc(false)
    }
  }

  useEffect(() => {
    if (selectedGroupId && selectedYear !== undefined && selectedSemester !== undefined) {
      fetchDescriptors(selectedGroupId, selectedYear, selectedSemester)
    }
  }, [selectedGroupId, selectedYear, selectedSemester])

  // ─── Group Save Handler ───────────────────────────────────────────
  const handleGroupSave = async (e) => {
    e?.preventDefault()
    if (!groupName.trim()) return

    try {
      setSavingGroup(true)
      const trimmed = groupName.trim()

      if (editingGroup) {
        const { error } = await supabase
          .from('subject_group')
          .update({ name: trimmed })
          .eq('id', editingGroup.id)
        if (error) throw error
        showToast('Subject group berhasil diperbarui.', 'success')
        await fetchGroups(editingGroup.id)
      } else {
        const { data, error } = await supabase
          .from('subject_group')
          .insert([{ name: trimmed }])
          .select('id')
          .single()
        if (error) throw error
        showToast('Subject group baru berhasil ditambahkan.', 'success')
        await fetchGroups(data?.id)
      }

      setShowGroupModal(false)
      setEditingGroup(null)
      setGroupName('')
    } catch (e) {
      console.error('Save group error:', e)
      showToast('Gagal menyimpan group: ' + e.message, 'error')
    } finally {
      setSavingGroup(false)
    }
  }

  // ─── Group Delete Protection & Handler ────────────────────────────
  const handleDeleteGroupClick = async (group, e) => {
    e.stopPropagation()
    setGroupToDelete(group)

    try {
      // Check subjects referencing this group
      const { count: subjectCount, error: subErr } = await supabase
        .from('subject')
        .select('*', { count: 'exact', head: true })
        .eq('subject_group_id', group.id)

      if (subErr) throw subErr

      // Check descriptors
      const { count: descCount, error: descErr } = await supabase
        .from('criterion_descriptors')
        .select('*', { count: 'exact', head: true })
        .eq('subject_group_id', group.id)

      if (descErr) throw descErr

      setDeleteBlockReason({
        subjectCount: subjectCount || 0,
        descCount: descCount || 0
      })
      setShowDeleteModal(true)
    } catch (err) {
      console.error('Delete check error:', err)
      showToast('Gagal memeriksa relasi data: ' + err.message, 'error')
    }
  }

  const confirmDeleteGroup = async () => {
    if (!groupToDelete) return
    try {
      setDeletingGroup(true)

      // If descriptors exist, delete them first cleanly
      if (deleteBlockReason?.descCount > 0) {
        await supabase
          .from('criterion_descriptors')
          .delete()
          .eq('subject_group_id', groupToDelete.id)
      }

      const { error } = await supabase
        .from('subject_group')
        .delete()
        .eq('id', groupToDelete.id)

      if (error) {
        if (error.code === '23503' || error.message?.includes('foreign key')) {
          throw new Error('Database mencegah penghapusan karena group masih terhubung dengan mata pelajaran.')
        }
        throw error
      }

      showToast(`Subject group "${groupToDelete.name}" berhasil dihapus.`, 'success')

      const remaining = groups.filter((g) => g.id !== groupToDelete.id)
      setGroups(remaining)
      if (selectedGroupId === String(groupToDelete.id)) {
        setSelectedGroupId(remaining.length > 0 ? String(remaining[0].id) : '')
        setDescriptors({})
      }

      setShowDeleteModal(false)
      setGroupToDelete(null)
    } catch (err) {
      console.error('Error deleting group:', err)
      showToast('Gagal menghapus group: ' + err.message, 'error')
    } finally {
      setDeletingGroup(false)
    }
  }

  // ─── Descriptors Changes & Save ───────────────────────────────────
  const handleDescriptorChange = (criterion, bandMin, value) => {
    const key = `${criterion}_${bandMin}`
    setDescriptors((prev) => ({
      ...prev,
      [key]: { ...prev[key], text: value, dirty: true }
    }))
  }

  const handleSaveAllDescriptors = async () => {
    if (!selectedGroupId || selectedYear === undefined || selectedYear === null) return
    setSavingDesc(true)
    try {
      const dirtyEntries = Object.entries(descriptors).filter(([, v]) => v.dirty)
      for (const [key, val] of dirtyEntries) {
        const [criterion, bandMinStr] = key.split('_')
        const bandMin = parseInt(bandMinStr)
        const band = BANDS.find((b) => b.min === bandMin)
        const trimmed = val.text.trim()
        let err

        if (val.id) {
          if (!trimmed) {
            // Cleared descriptor -> delete row
            ;({ error: err } = await supabase
              .from('criterion_descriptors')
              .delete()
              .eq('id', val.id))
            if (!err) {
              setDescriptors((p) => ({
                ...p,
                [key]: { text: '', dirty: false, id: null }
              }))
            }
          } else {
            ;({ error: err } = await supabase
              .from('criterion_descriptors')
              .update({ descriptor: trimmed })
              .eq('id', val.id))
          }
        } else {
          if (!trimmed) continue
          const payload = {
            subject_group_id: parseInt(selectedGroupId),
            myp_year: selectedYear,
            semester: selectedSemester,
            criterion,
            band_min: bandMin,
            band_max: band.max,
            descriptor: trimmed
          }
          const { data: inserted, error: insertErr } = await supabase
            .from('criterion_descriptors')
            .insert([payload])
            .select('id')
            .single()
          err = insertErr
          if (inserted) {
            setDescriptors((p) => ({
              ...p,
              [key]: { ...p[key], id: inserted.id, dirty: false }
            }))
          }
        }
        if (err) throw err
      }

      setDescriptors((prev) => {
        const next = { ...prev }
        Object.keys(next).forEach((k) => {
          next[k] = { ...next[k], dirty: false }
        })
        return next
      })

      showToast('Semua deskriptor berhasil disimpan.', 'success')
    } catch (e) {
      console.error('Error saving descriptors:', e)
      showToast('Gagal menyimpan deskriptor: ' + e.message, 'error')
    } finally {
      setSavingDesc(false)
    }
  }

  // ─── Computed Values ──────────────────────────────────────────────
  const selectedGroup = groups.find((g) => String(g.id) === String(selectedGroupId))
  const hasDirty = Object.values(descriptors).some((v) => v.dirty)

  const filteredGroups = useMemo(() => {
    if (!groupSearch.trim()) return groups
    const q = groupSearch.toLowerCase().trim()
    return groups.filter((g) => (g.name || '').toLowerCase().includes(q))
  }, [groups, groupSearch])

  // ─── Render ───────────────────────────────────────────────────────
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
      {/* ── TOAST NOTIFICATION ──────────────────────────────────────── */}
      {toast && (
        <div
          className="fixed top-5 right-5 z-50 px-4 py-2.5 rounded text-xs font-mono flex items-center gap-2 border animate-in fade-in slide-in-from-top-2"
          style={{
            background: toast.type === 'error' ? pastelRed.bg : pastelGreen.bg,
            borderColor: toast.type === 'error' ? pastelRed.border : pastelGreen.border,
            color: toast.type === 'error' ? pastelRed.text : pastelGreen.text,
            boxShadow: '0 4px 12px rgba(0,0,0,0.06)'
          }}
        >
          <FontAwesomeIcon icon={toast.type === 'error' ? faExclamationTriangle : faCheckCircle} />
          <span>{toast.message}</span>
        </div>
      )}

      {/* ── HEADER & BREADCRUMBS (MATCHING /DATA/PYP STYLE) ─────────── */}
      <div
        className="pb-5 border-b flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6"
        style={{ borderColor }}
      >
        <div>
          <div
            className="flex items-center gap-2 text-[10px] font-mono tracking-wider uppercase mb-1.5"
            style={{ color: textSecondary }}
          >
            <span>[ACADEMIC]</span>
            <span>/</span>
            <span>[CURRICULUM & FRAMEWORKS]</span>
            <span>/</span>
            <span className="font-semibold" style={{ color: isDark ? '#60A5FA' : '#0284C7' }}>
              [SUBJECT GROUPS & DESCRIPTORS]
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded flex items-center justify-center border"
              style={{
                background: pastelBlue.bg,
                borderColor: pastelBlue.border,
                color: pastelBlue.text
              }}
            >
              <FontAwesomeIcon icon={faLayerGroup} className="text-base" />
            </div>
            <div>
              <h1
                className="text-xl font-bold tracking-tight"
                style={{ color: textPrimary, letterSpacing: '-0.02em', margin: 0 }}
              >
                Subject Groups & Descriptors
              </h1>
            </div>
          </div>
        </div>

        <button
          onClick={() => {
            setEditingGroup(null)
            setGroupName('')
            setShowGroupModal(true)
          }}
          style={btnPrimary}
        >
          <FontAwesomeIcon icon={faPlus} className="text-xs" />
          <span>Tambah Subject Group</span>
        </button>
      </div>

      {/* ── SECTION 1: SUBJECT GROUPS BENTO SELECTOR ─────────────────── */}
      <div
        className="p-4 rounded border mb-6"
        style={{ background: cardBg, borderColor, borderRadius: '8px' }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div className="text-xs font-mono uppercase font-semibold" style={{ color: textSecondary }}>
            Pilih Subject Group ({groups.length})
          </div>
          <div className="relative max-w-xs">
            <FontAwesomeIcon
              icon={faSearch}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs"
              style={{ color: textSecondary }}
            />
            <input
              type="text"
              placeholder="Cari group..."
              value={groupSearch}
              onChange={(e) => setGroupSearch(e.target.value)}
              style={{
                ...inputStyle,
                padding: '5px 10px 5px 28px',
                fontSize: '12px',
                width: '180px'
              }}
            />
          </div>
        </div>

        {loadingGroups ? (
          <div className="py-6 text-center">
            <FontAwesomeIcon icon={faSpinner} spin className="text-sm mr-2" style={{ color: textSecondary }} />
            <span className="text-xs font-mono" style={{ color: textSecondary }}>
              Memuat data group...
            </span>
          </div>
        ) : filteredGroups.length === 0 ? (
          <div className="py-4 text-center text-xs" style={{ color: textSecondary }}>
            {groupSearch ? `Tidak ada grup yang sesuai "${groupSearch}".` : 'Belum ada subject group.'}
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {filteredGroups.map((g) => {
              const isSelected = String(selectedGroupId) === String(g.id)
              return (
                <div
                  key={g.id}
                  onClick={() => setSelectedGroupId(String(g.id))}
                  className="group relative flex items-center gap-2 px-3 py-1.5 rounded border text-xs cursor-pointer transition-all select-none"
                  style={{
                    background: isSelected ? (isDark ? '#27272A' : '#F4F4F5') : 'transparent',
                    borderColor: isSelected ? textPrimary : borderColor,
                    color: isSelected ? textPrimary : textSecondary,
                    fontWeight: isSelected ? 600 : 400
                  }}
                >
                  <span>{g.name}</span>
                  <div className="flex items-center gap-1.5 ml-1 opacity-70 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setEditingGroup(g)
                        setGroupName(g.name)
                        setShowGroupModal(true)
                      }}
                      className="hover:opacity-100 p-0.5"
                      title="Edit Nama Group"
                      style={{ color: textSecondary }}
                    >
                      <FontAwesomeIcon icon={faEdit} className="text-[10px]" />
                    </button>
                    <button
                      onClick={(e) => handleDeleteGroupClick(g, e)}
                      className="hover:opacity-100 p-0.5"
                      title="Hapus Group"
                      style={{ color: pastelRed.text }}
                    >
                      <FontAwesomeIcon icon={faTrash} className="text-[10px]" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── SECTION 2: CRITERION DESCRIPTORS MATRIX ─────────────────── */}
      {selectedGroupId && (
        <div
          className="rounded border overflow-hidden"
          style={{ background: cardBg, borderColor, borderRadius: '8px' }}
        >
          {/* Matrix Control Bar */}
          <div
            className="p-4 border-b flex flex-col lg:flex-row lg:items-center justify-between gap-4"
            style={{ borderColor, background: cardBgAlt }}
          >
            <div>
              <div className="text-[10px] font-mono uppercase tracking-wider mb-1" style={{ color: textSecondary }}>
                Criterion Descriptors Matrix
              </div>
              <div className="text-base font-bold font-mono" style={{ color: textPrimary }}>
                {selectedGroup?.name}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              {/* MYP Year Selector */}
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-mono uppercase font-semibold mr-1" style={{ color: textSecondary }}>
                  Tahun:
                </span>
                <div
                  className="inline-flex rounded p-0.5 border"
                  style={{ background: cardBg, borderColor }}
                >
                  <button
                    onClick={() => setSelectedYear(UNIVERSAL_YEAR)}
                    className="px-2 py-1 rounded text-xs font-mono font-medium transition-all"
                    style={{
                      background: selectedYear === UNIVERSAL_YEAR ? textPrimary : 'transparent',
                      color: selectedYear === UNIVERSAL_YEAR ? (isDark ? '#09090B' : '#FFFFFF') : textSecondary
                    }}
                    title="Universal — Berlaku untuk semua tahun (e.g. Community Project)"
                  >
                    <FontAwesomeIcon icon={faStar} className="mr-1 text-[10px]" />
                    All
                  </button>
                  {MYP_YEARS.map((yr) => (
                    <button
                      key={yr}
                      onClick={() => setSelectedYear(yr)}
                      className="px-2.5 py-1 rounded text-xs font-mono font-medium transition-all"
                      style={{
                        background: selectedYear === yr ? textPrimary : 'transparent',
                        color: selectedYear === yr ? (isDark ? '#09090B' : '#FFFFFF') : textSecondary
                      }}
                    >
                      MYP {yr}
                    </button>
                  ))}
                </div>
              </div>

              {/* Semester Selector */}
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-mono uppercase font-semibold mr-1" style={{ color: textSecondary }}>
                  Semester:
                </span>
                <div
                  className="inline-flex rounded p-0.5 border"
                  style={{ background: cardBg, borderColor }}
                >
                  {SEMESTERS.map((s) => (
                    <button
                      key={s.value}
                      onClick={() => setSelectedSemester(s.value)}
                      className="px-2.5 py-1 rounded text-xs font-mono font-medium transition-all"
                      style={{
                        background: selectedSemester === s.value ? textPrimary : 'transparent',
                        color: selectedSemester === s.value ? (isDark ? '#09090B' : '#FFFFFF') : textSecondary
                      }}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Save Status & Action */}
              <div className="flex items-center gap-3">
                <div className="text-xs font-mono flex items-center gap-1.5">
                  {hasDirty ? (
                    <span
                      className="px-2 py-0.5 rounded text-[11px] font-medium border"
                      style={{
                        background: pastelYellow.bg,
                        borderColor: pastelYellow.border,
                        color: pastelYellow.text
                      }}
                    >
                      Perubahan belum disimpan
                    </span>
                  ) : (
                    <span
                      className="px-2 py-0.5 rounded text-[11px] font-medium border"
                      style={{
                        background: pastelGreen.bg,
                        borderColor: pastelGreen.border,
                        color: pastelGreen.text
                      }}
                    >
                      <FontAwesomeIcon icon={faCheck} className="mr-1 text-[10px]" />
                      Semua tersimpan
                    </span>
                  )}
                </div>

                <button
                  onClick={handleSaveAllDescriptors}
                  disabled={savingDesc || !hasDirty}
                  style={{
                    ...btnPrimary,
                    opacity: savingDesc || !hasDirty ? 0.5 : 1,
                    cursor: savingDesc || !hasDirty ? 'not-allowed' : 'pointer'
                  }}
                >
                  {savingDesc ? (
                    <>
                      <FontAwesomeIcon icon={faSpinner} spin className="text-xs" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <>
                      <FontAwesomeIcon icon={faSave} className="text-xs" />
                      <span>Simpan Deskriptor</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Matrix Content Table */}
          <div className="p-4">
            {loadingDesc ? (
              <div className="py-20 text-center">
                <FontAwesomeIcon icon={faSpinner} spin className="text-xl mb-3" style={{ color: textSecondary }} />
                <div className="text-xs font-mono" style={{ color: textSecondary }}>
                  Memuat matriks deskriptor kriteria...
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse" style={{ fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: cardBgAlt, borderBottom: `1px solid ${borderColor}` }}>
                      <th
                        className="p-3 text-center font-mono text-[11px] uppercase tracking-wider font-semibold border-r"
                        style={{ color: textSecondary, borderColor, width: '100px' }}
                      >
                        Criterion
                      </th>
                      {BANDS.map((b) => (
                        <th
                          key={b.label}
                          className="p-3 text-center font-mono text-[11px] uppercase tracking-wider font-semibold border-r last:border-r-0"
                          style={{ color: textSecondary, borderColor, minWidth: '220px' }}
                        >
                          Band {b.label} (Skor {b.min}–{b.max})
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y" style={{ borderColor }}>
                    {CRITERIA.map((c) => {
                      const color = criterionColors[c] || pastelBlue
                      return (
                        <tr
                          key={c}
                          className="align-top transition-colors hover:bg-neutral-50/30 dark:hover:bg-neutral-900/30"
                          style={{ borderBottom: `1px solid ${borderColor}` }}
                        >
                          {/* Criterion Row Header */}
                          <td
                            className="p-3 text-center border-r font-mono"
                            style={{ borderColor }}
                          >
                            <div
                              className="w-10 h-10 mx-auto rounded flex items-center justify-center font-bold text-base border"
                              style={{
                                background: color.bg,
                                borderColor: color.border,
                                color: color.text
                              }}
                            >
                              {c}
                            </div>
                            <div className="text-[10px] font-mono uppercase mt-1" style={{ color: textSecondary }}>
                              Kriteria {c}
                            </div>
                          </td>

                          {/* Bands Columns */}
                          {BANDS.map((b) => {
                            const key = `${c}_${b.min}`
                            const cell = descriptors[key] || { text: '', dirty: false }

                            return (
                              <td
                                key={b.label}
                                className="p-2 border-r last:border-r-0 transition-colors"
                                style={{
                                  borderColor,
                                  background: cell.dirty ? pastelYellow.bg : 'transparent'
                                }}
                              >
                                <textarea
                                  value={cell.text}
                                  onChange={(e) => handleDescriptorChange(c, b.min, e.target.value)}
                                  rows={5}
                                  placeholder={`Deskriptor Kriteria ${c} (Band ${b.label})...`}
                                  className="w-full text-xs font-sans rounded p-2 resize-y outline-none transition-all leading-relaxed"
                                  style={{
                                    background: isDark ? '#27272A' : '#FFFFFF',
                                    border: cell.dirty
                                      ? `1px solid ${pastelYellow.text}`
                                      : `1px solid ${borderColor}`,
                                    color: textPrimary
                                  }}
                                />
                              </td>
                            )
                          })}
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

      {/* ── MODAL: ADD / EDIT SUBJECT GROUP ─────────────────────────── */}
      <Modal
        isOpen={showGroupModal}
        onClose={() => {
          setShowGroupModal(false)
          setEditingGroup(null)
          setGroupName('')
        }}
        title={editingGroup ? 'Edit Subject Group' : 'Tambah Subject Group Baru'}
        size="sm"
        containerStyle={{ background: cardBg, borderColor }}
      >
        <form onSubmit={handleGroupSave} className="space-y-4">
          <div>
            <label className="text-xs font-mono uppercase font-semibold block mb-1.5" style={{ color: textSecondary }}>
              Nama Subject Group *
            </label>
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Contoh: Mathematics, Sciences, Arts"
              style={inputStyle}
              autoFocus
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t" style={{ borderColor }}>
            <button
              type="button"
              onClick={() => {
                setShowGroupModal(false)
                setEditingGroup(null)
                setGroupName('')
              }}
              style={btnSecondary}
              disabled={savingGroup}
            >
              Batal
            </button>
            <button
              type="submit"
              style={btnPrimary}
              disabled={savingGroup || !groupName.trim()}
            >
              {savingGroup ? (
                <>
                  <FontAwesomeIcon icon={faSpinner} spin className="text-xs" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <span>{editingGroup ? 'Perbarui Group' : 'Simpan Group'}</span>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── MODAL: CONFIRM / PREVENT DELETE GROUP ───────────────────── */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false)
          setGroupToDelete(null)
          setDeleteBlockReason(null)
        }}
        title={deleteBlockReason?.subjectCount > 0 ? 'Penghapusan Dicegah' : 'Konfirmasi Hapus Subject Group'}
        size="sm"
        containerStyle={{ background: cardBg, borderColor }}
      >
        {groupToDelete && (
          <div className="space-y-4">
            {deleteBlockReason?.subjectCount > 0 ? (
              <>
                <div
                  className="p-3.5 rounded border flex items-start gap-3"
                  style={{
                    background: pastelRed.bg,
                    borderColor: pastelRed.border,
                    color: pastelRed.text
                  }}
                >
                  <FontAwesomeIcon icon={faBan} className="text-lg mt-0.5 shrink-0" />
                  <div className="text-xs leading-relaxed">
                    <div className="font-semibold mb-1">Tidak Dapat Dihapus</div>
                    <div>
                      Subject group &ldquo;<strong>{groupToDelete.name}</strong>&rdquo; masih digunakan oleh{' '}
                      <strong>{deleteBlockReason.subjectCount} mata pelajaran</strong> aktif.
                    </div>
                  </div>
                </div>

                <div className="text-xs leading-relaxed" style={{ color: textSecondary }}>
                  Harap ubah atau pindahkan subject group pada mata pelajaran terkait terlebih dahulu sebelum menghapus group ini.
                </div>

                <div className="flex justify-end pt-2 border-t" style={{ borderColor }}>
                  <button
                    type="button"
                    onClick={() => {
                      setShowDeleteModal(false)
                      setGroupToDelete(null)
                      setDeleteBlockReason(null)
                    }}
                    style={btnPrimary}
                  >
                    Tutup
                  </button>
                </div>
              </>
            ) : (
              <>
                <div
                  className="p-3.5 rounded border flex items-start gap-3"
                  style={{
                    background: pastelYellow.bg,
                    borderColor: pastelYellow.border,
                    color: pastelYellow.text
                  }}
                >
                  <FontAwesomeIcon icon={faExclamationTriangle} className="text-lg mt-0.5 shrink-0" />
                  <div className="text-xs leading-relaxed">
                    <div className="font-semibold mb-1">Peringatan Penghapusan</div>
                    <div>
                      Apakah Anda yakin ingin menghapus group &ldquo;<strong>{groupToDelete.name}</strong>&rdquo;?
                      {deleteBlockReason?.descCount > 0 && (
                        <span> Sebanyak <strong>{deleteBlockReason.descCount} deskriptor</strong> terkait akan ikut dihapus.</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2 border-t" style={{ borderColor }}>
                  <button
                    type="button"
                    onClick={() => {
                      setShowDeleteModal(false)
                      setGroupToDelete(null)
                    }}
                    style={btnSecondary}
                    disabled={deletingGroup}
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={confirmDeleteGroup}
                    disabled={deletingGroup}
                    style={{
                      background: pastelRed.text,
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 600,
                      padding: '8px 16px',
                      cursor: deletingGroup ? 'not-allowed' : 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    {deletingGroup ? (
                      <>
                        <FontAwesomeIcon icon={faSpinner} spin />
                        <span>Menghapus...</span>
                      </>
                    ) : (
                      <>
                        <FontAwesomeIcon icon={faTrash} />
                        <span>Ya, Hapus</span>
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
