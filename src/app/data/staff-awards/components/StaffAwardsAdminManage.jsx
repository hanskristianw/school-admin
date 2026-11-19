'use client'

import React, { useState } from 'react'
import Modal from '@/components/ui/modal'
import { AWARD_ICON_OPTIONS, AWARD_TONE_PRESETS, resolveAwardTone } from '@/lib/staffAwards'
import {
  PlusIcon,
  EditIcon,
  TrashIcon,
  ResetIcon,
  DatabaseIcon,
  AlertIcon,
  CalendarIcon,
  SaveIcon
} from './MinimalIcons'
import AwardIconBadge from './AwardIconBadge'

const STATUS_BADGE = {
  active: { label: 'ACTIVE (OPEN)', bg: '#EDF3EC', text: '#346538', darkBg: '#19291B', darkText: '#9BD09F' },
  draft: { label: 'DRAFT (NOT OPEN)', bg: '#FBF3DB', text: '#956400', darkBg: '#2C2515', darkText: '#E8C56E' },
  closed: { label: 'CLOSED (FINAL)', bg: '#F3F2EE', text: '#575652', darkBg: '#242421', darkText: '#C5C3BC' }
}

export default function StaffAwardsAdminManage({
  storageMode,
  years = [],
  events = [],
  selectedEvent,
  onSelectEvent,
  categories = [],
  submissionCount = 0,
  currentUserId,
  onReload,
  isDark = false
}) {
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState(null)

  const [eventModalOpen, setEventModalOpen] = useState(false)
  const [eventForm, setEventForm] = useState({
    id: null,
    year_id: '',
    title: '',
    description: '',
    status: 'active',
    seed_defaults: true
  })

  const [catModalOpen, setCatModalOpen] = useState(false)
  const [catForm, setCatForm] = useState({
    id: null,
    sort_order: 1,
    title: '',
    description: '',
    icon: 'award',
    color_gradient: 'amber'
  })

  const [confirmModal, setConfirmModal] = useState({ open: false, type: null, payload: null, title: '', message: '' })

  const monoStyle = { fontFamily: "'Geist Mono', 'SF Mono', 'JetBrains Mono', ui-monospace, monospace" }
  const serifStyle = { fontFamily: "'Lyon Text', 'Newsreader', 'Playfair Display', 'Instrument Serif', Georgia, serif" }

  const borderColor = isDark ? '#2C2C29' : '#EAEAEA'
  const cardStyle = {
    backgroundColor: isDark ? '#1E1E1C' : '#FFFFFF',
    border: `1px solid ${borderColor}`
  }
  const inputClass = `w-full px-3 py-2 text-sm rounded-[6px] outline-none ${
    isDark
      ? 'bg-[#161615] border border-[#2C2C29] text-[#F2F2EF] focus:border-[#D4D4CE]'
      : 'bg-[#FBFBFA] border border-[#EAEAEA] text-[#111111] focus:bg-white focus:border-[#111111]'
  }`

  const callApi = async (body) => {
    setBusy(true)
    setFeedback(null)
    try {
      const res = await fetch('/api/staff-awards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...body, user_id: currentUserId })
      })
      const json = await res.json()
      if (!json.success) {
        setFeedback({ type: 'error', text: json.message || 'Request failed.' })
        return null
      }
      setFeedback({ type: 'success', text: json.message || 'Changes saved.' })
      await onReload?.(json.data?.id && body.action === 'create_or_update_event' ? json.data.id : undefined)
      return json
    } catch (err) {
      setFeedback({ type: 'error', text: err.message })
      return null
    } finally {
      setBusy(false)
    }
  }

  const openNewEventModal = () => {
    const defaultYear = years.find(y => Number(y.year_id) === 3) || years[0]
    setEventForm({
      id: null,
      year_id: defaultYear?.year_id || '',
      title: `Teachers & Staff Recognition ${defaultYear?.year_name || ''}`.trim(),
      description:
        'There are 10 awards presented in this year’s CCS Teachers & Staff Recognition. This special recognition aims to celebrate and acknowledge the dedication, hard work, and positive contributions of our teachers and staff.',
      status: 'active',
      seed_defaults: true
    })
    setEventModalOpen(true)
  }

  const openEditEventModal = () => {
    if (!selectedEvent) return
    setEventForm({
      id: selectedEvent.id,
      year_id: selectedEvent.year_id || '',
      title: selectedEvent.title || '',
      description: selectedEvent.description || '',
      status: selectedEvent.status || 'draft',
      seed_defaults: false
    })
    setEventModalOpen(true)
  }

  const handleSaveEvent = async (e) => {
    e.preventDefault()
    const res = await callApi({
      action: 'create_or_update_event',
      ...eventForm
    })
    if (res) setEventModalOpen(false)
  }

  const openAddCatModal = () => {
    const nextOrder = categories.length > 0 ? Math.max(...categories.map(c => Number(c.sort_order) || 0)) + 1 : 1
    setCatForm({
      id: null,
      sort_order: nextOrder,
      title: '',
      description: '',
      icon: 'award',
      color_gradient: AWARD_TONE_PRESETS[(nextOrder - 1) % AWARD_TONE_PRESETS.length].value
    })
    setCatModalOpen(true)
  }

  const openEditCatModal = (cat) => {
    const resolvedTone = resolveAwardTone(cat.color_gradient)
    setCatForm({
      id: cat.id,
      sort_order: cat.sort_order,
      title: cat.title,
      description: cat.description || '',
      icon: cat.icon || 'award',
      color_gradient: resolvedTone.value
    })
    setCatModalOpen(true)
  }

  const handleSaveCategory = async (e) => {
    e.preventDefault()
    if (!selectedEvent) return
    const res = await callApi({
      action: 'create_or_update_category',
      event_id: selectedEvent.id,
      ...catForm
    })
    if (res) setCatModalOpen(false)
  }

  const handleConfirmAction = async () => {
    const { type, payload } = confirmModal
    setConfirmModal({ open: false, type: null, payload: null, title: '', message: '' })
    if (type === 'reset_votes') {
      await callApi({ action: 'reset_event_votes', event_id: payload.event_id })
    } else if (type === 'delete_category') {
      await callApi({ action: 'delete_category', category_id: payload.category_id, event_id: payload.event_id })
    } else if (type === 'delete_event') {
      await callApi({ action: 'delete_event', event_id: payload.event_id })
    }
  }

  const statusMeta = STATUS_BADGE[selectedEvent?.status] || STATUS_BADGE.draft

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      {feedback && (
        <div
          className="px-4 py-3 rounded-[8px] text-sm font-medium"
          style={
            feedback.type === 'error'
              ? {
                  backgroundColor: isDark ? '#2C191A' : '#FDEBEC',
                  color: isDark ? '#ECA3A1' : '#9F2F2D',
                  border: `1px solid ${isDark ? '#4A2627' : '#F5D0D2'}`
                }
              : {
                  backgroundColor: isDark ? '#19291B' : '#EDF3EC',
                  color: isDark ? '#9BD09F' : '#346538',
                  border: `1px solid ${isDark ? '#29422C' : '#C8DEC5'}`
                }
          }
        >
          {feedback.text}
        </div>
      )}

      {/* Event Management */}
      <div className="rounded-[12px] p-6 space-y-5" style={cardStyle}>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="text-xl font-bold tracking-tight flex items-center gap-2" style={serifStyle}>
                <CalendarIcon className="w-5 h-5" />
                Event Management
              </h2>
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-[0.05em]"
                style={{
                  backgroundColor: storageMode === 'database_tables' ? (isDark ? '#19291B' : '#EDF3EC') : (isDark ? '#162530' : '#E1F3FE'),
                  color: storageMode === 'database_tables' ? (isDark ? '#9BD09F' : '#346538') : (isDark ? '#8CC8EE' : '#1F6C9F'),
                  ...monoStyle
                }}
              >
                <DatabaseIcon className="w-3 h-3" />
                {storageMode === 'database_tables' ? 'PostgreSQL Tables' : 'Settings Storage Mode'}
              </span>
            </div>
            {storageMode !== 'database_tables' && (
              <p className={`text-xs mt-1.5 ${isDark ? 'text-[#8C8B87]' : 'text-[#787774]'}`}>
                Operating on Settings JSON storage. Optionally run{' '}
                <code className="px-1.5 py-0.5 rounded-[4px] bg-[#F3F2EE] dark:bg-[#242421]" style={monoStyle}>
                  migrations/create-staff-awards-tables.sql
                </code>{' '}
                in Supabase SQL Editor to switch to dedicated tables.
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={openNewEventModal}
            disabled={busy}
            className="px-4 py-2 text-xs font-semibold rounded-[6px] inline-flex items-center gap-1.5 transition-transform active:scale-[0.98] cursor-pointer shrink-0"
            style={{
              backgroundColor: isDark ? '#F2F2EF' : '#111111',
              color: isDark ? '#111111' : '#FFFFFF'
            }}
          >
            <PlusIcon className="w-3.5 h-3.5" />
            <span>Create New Event</span>
          </button>
        </div>

        {selectedEvent && (
          <div
            className="p-5 rounded-[8px] space-y-4"
            style={{
              backgroundColor: isDark ? '#161615' : '#FBFBFA',
              border: `1px solid ${borderColor}`
            }}
          >
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
              <div className="space-y-2 flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2.5">
                  <select
                    value={selectedEvent.id}
                    onChange={(e) => onSelectEvent?.(Number(e.target.value))}
                    className={`px-3 py-1.5 text-sm font-semibold rounded-[6px] outline-none ${
                      isDark ? 'bg-[#1E1E1C] border border-[#2C2C29] text-[#F2F2EF]' : 'bg-white border border-[#EAEAEA] text-[#111111]'
                    }`}
                  >
                    {events.map(ev => (
                      <option key={ev.id} value={ev.id}>
                        {ev.title} ({ev.year_name || 'All Years'})
                      </option>
                    ))}
                  </select>
                  <span
                    className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-[0.05em]"
                    style={{
                      backgroundColor: isDark ? statusMeta.darkBg : statusMeta.bg,
                      color: isDark ? statusMeta.darkText : statusMeta.text,
                      ...monoStyle
                    }}
                  >
                    {statusMeta.label}
                  </span>
                </div>
                <p className={`text-xs leading-relaxed ${isDark ? 'text-[#8C8B87]' : 'text-[#787774]'}`}>
                  {selectedEvent.description || 'No description provided.'}
                </p>
                <div className={`text-xs ${isDark ? 'text-[#C5C3BC]' : 'text-[#2F3437]'}`} style={monoStyle}>
                  Categories: <strong>{categories.length}</strong> • Submitted Ballots: <strong>{submissionCount}</strong>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={openEditEventModal}
                  disabled={busy}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-[6px] inline-flex items-center gap-1.5 transition-transform active:scale-[0.98] cursor-pointer ${
                    isDark ? 'bg-[#242421] border border-[#2C2C29] text-[#F2F2EF] hover:bg-[#2F2F2B]' : 'bg-white border border-[#EAEAEA] text-[#111111] hover:bg-[#F7F6F3]'
                  }`}
                >
                  <EditIcon className="w-3.5 h-3.5" />
                  <span>Edit Event</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setConfirmModal({
                      open: true,
                      type: 'reset_votes',
                      payload: { event_id: selectedEvent.id },
                      title: 'Reset All Event Votes?',
                      message: `This will permanently delete all ${submissionCount} submitted ballots for "${selectedEvent.title}" so staff members can vote again.`
                    })
                  }
                  disabled={busy || submissionCount === 0}
                  className="px-3 py-1.5 text-xs font-semibold rounded-[6px] inline-flex items-center gap-1.5 transition-transform active:scale-[0.98] cursor-pointer disabled:opacity-40"
                  style={{
                    backgroundColor: isDark ? '#2C2515' : '#FBF3DB',
                    color: isDark ? '#E8C56E' : '#956400',
                    border: `1px solid ${isDark ? '#453A1E' : '#EFE2BA'}`
                  }}
                >
                  <ResetIcon className="w-3.5 h-3.5" />
                  <span>Reset Votes</span>
                </button>
                {events.length > 1 && (
                  <button
                    type="button"
                    onClick={() =>
                      setConfirmModal({
                        open: true,
                        type: 'delete_event',
                        payload: { event_id: selectedEvent.id },
                        title: 'Delete Recognition Event?',
                        message: `Permanently delete "${selectedEvent.title}" along with all its categories and votes?`
                      })
                    }
                    disabled={busy}
                    className="px-3 py-1.5 text-xs font-semibold rounded-[6px] inline-flex items-center gap-1.5 transition-transform active:scale-[0.98] cursor-pointer"
                    style={{
                      backgroundColor: isDark ? '#2C191A' : '#FDEBEC',
                      color: isDark ? '#ECA3A1' : '#9F2F2D',
                      border: `1px solid ${isDark ? '#4A2627' : '#F5D0D2'}`
                    }}
                  >
                    <TrashIcon className="w-3.5 h-3.5" />
                    <span>Delete Event</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Category Management */}
      {selectedEvent && (
        <div className="rounded-[12px] overflow-hidden" style={cardStyle}>
          <div
            className="p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
            style={{ borderBottom: `1px solid ${borderColor}` }}
          >
            <div>
              <h3 className="text-lg font-bold tracking-tight" style={serifStyle}>
                Award Categories ({categories.length})
              </h3>
              <p className={`text-xs mt-1 ${isDark ? 'text-[#8C8B87]' : 'text-[#787774]'}`}>
                Manage display order, icons, muted pastel tones, and descriptions shown in the voting wizard.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {categories.length === 0 && (
                <button
                  type="button"
                  onClick={() => callApi({ action: 'seed_default_categories', event_id: selectedEvent.id })}
                  disabled={busy}
                  className="px-3.5 py-2 text-xs font-semibold rounded-[6px] inline-flex items-center gap-1.5 cursor-pointer"
                  style={{
                    backgroundColor: isDark ? '#2C2515' : '#FBF3DB',
                    color: isDark ? '#E8C56E' : '#956400',
                    border: `1px solid ${isDark ? '#453A1E' : '#EFE2BA'}`
                  }}
                >
                  <span>Load 10 Default CCS Categories</span>
                </button>
              )}
              <button
                type="button"
                onClick={openAddCatModal}
                disabled={busy}
                className="px-3.5 py-2 text-xs font-semibold rounded-[6px] inline-flex items-center gap-1.5 transition-transform active:scale-[0.98] cursor-pointer"
                style={{
                  backgroundColor: isDark ? '#F2F2EF' : '#111111',
                  color: isDark ? '#111111' : '#FFFFFF'
                }}
              >
                <PlusIcon className="w-3.5 h-3.5" />
                <span>Add Category</span>
              </button>
            </div>
          </div>

          <div>
            {categories.length === 0 ? (
              <div className={`p-8 text-center text-xs ${isDark ? 'text-[#8C8B87]' : 'text-[#787774]'}`}>
                No award categories configured yet. Use &ldquo;Load 10 Default CCS Categories&rdquo; or &ldquo;Add Category&rdquo;.
              </div>
            ) : (
              categories.map(cat => (
                <div
                  key={cat.id}
                  className="px-6 py-4 flex items-start justify-between gap-4"
                  style={{ borderBottom: `1px solid ${borderColor}` }}
                >
                  <div className="flex items-start gap-4 min-w-0">
                    <span
                      className="w-7 h-7 rounded-[6px] text-xs font-bold flex items-center justify-center shrink-0 mt-1"
                      style={{
                        backgroundColor: isDark ? '#242421' : '#F3F2EE',
                        color: isDark ? '#C5C3BC' : '#575652',
                        ...monoStyle
                      }}
                    >
                      {String(cat.sort_order).padStart(2, '0')}
                    </span>
                    <AwardIconBadge icon={cat.icon} gradient={cat.color_gradient} size="sm" isDark={isDark} />
                    <div className="min-w-0">
                      <h4 className="font-bold text-base leading-snug" style={serifStyle}>
                        {cat.title}
                      </h4>
                      <p className={`text-xs mt-1 leading-relaxed ${isDark ? 'text-[#8C8B87]' : 'text-[#787774]'}`}>
                        {cat.description}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => openEditCatModal(cat)}
                      disabled={busy}
                      title="Edit category"
                      aria-label="Edit category"
                      className={`p-2 rounded-[6px] cursor-pointer ${
                        isDark ? 'border border-[#2C2C29] hover:bg-[#242421] text-[#C5C3BC]' : 'border border-[#EAEAEA] hover:bg-[#F7F6F3] text-[#2F3437]'
                      }`}
                    >
                      <EditIcon className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setConfirmModal({
                          open: true,
                          type: 'delete_category',
                          payload: { category_id: cat.id, event_id: selectedEvent.id },
                          title: 'Delete Category?',
                          message: `Are you sure you want to delete "${cat.title}"?`
                        })
                      }
                      disabled={busy || submissionCount > 0}
                      title={submissionCount > 0 ? 'Cannot delete category while votes exist' : 'Delete category'}
                      aria-label="Delete category"
                      className="p-2 rounded-[6px] disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer"
                      style={{
                        backgroundColor: isDark ? '#2C191A' : '#FDEBEC',
                        color: isDark ? '#ECA3A1' : '#9F2F2D',
                        border: `1px solid ${isDark ? '#4A2627' : '#F5D0D2'}`
                      }}
                    >
                      <TrashIcon className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Create / Edit Event Modal */}
      <Modal
        isOpen={eventModalOpen}
        onClose={() => setEventModalOpen(false)}
        title={eventForm.id ? 'Edit Staff Awards Event' : 'Create New Staff Awards Event'}
        size="md"
      >
        <form onSubmit={handleSaveEvent} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1.5">Academic Year</label>
              <select
                value={eventForm.year_id}
                onChange={(e) => setEventForm(prev => ({ ...prev, year_id: e.target.value }))}
                className={inputClass}
              >
                <option value="">-- Select Academic Year --</option>
                {years.map(y => (
                  <option key={y.year_id} value={y.year_id}>{y.year_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5">Voting Status</label>
              <select
                value={eventForm.status}
                onChange={(e) => setEventForm(prev => ({ ...prev, status: e.target.value }))}
                className={inputClass}
              >
                <option value="draft">Draft (Not Open)</option>
                <option value="active">Active (Voting Open)</option>
                <option value="closed">Closed (Voting Ended)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1.5">Event Title</label>
            <input
              type="text"
              required
              value={eventForm.title}
              onChange={(e) => setEventForm(prev => ({ ...prev, title: e.target.value }))}
              className={inputClass}
              placeholder="e.g., Teachers & Staff Recognition 2026/2027"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1.5">Introduction Description</label>
            <textarea
              rows={3}
              value={eventForm.description}
              onChange={(e) => setEventForm(prev => ({ ...prev, description: e.target.value }))}
              className={inputClass}
            />
          </div>

          {!eventForm.id && (
            <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
              <input
                type="checkbox"
                checked={eventForm.seed_defaults}
                onChange={(e) => setEventForm(prev => ({ ...prev, seed_defaults: e.target.checked }))}
                className="rounded border-[#EAEAEA]"
              />
              Automatically seed 10 standard CCS Teachers &amp; Staff Recognition categories
            </label>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setEventModalOpen(false)}
              className={`px-4 py-2 text-xs font-semibold rounded-[6px] border cursor-pointer ${
                isDark ? 'border-[#2C2C29] hover:bg-[#242421]' : 'border-[#EAEAEA] hover:bg-[#F7F6F3]'
              }`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="px-4 py-2 text-xs font-semibold rounded-[6px] inline-flex items-center gap-1.5 cursor-pointer"
              style={{
                backgroundColor: isDark ? '#F2F2EF' : '#111111',
                color: isDark ? '#111111' : '#FFFFFF'
              }}
            >
              <SaveIcon className="w-3.5 h-3.5" />
              <span>Save Event</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Create / Edit Category Modal */}
      <Modal
        isOpen={catModalOpen}
        onClose={() => setCatModalOpen(false)}
        title={catForm.id ? 'Edit Award Category' : 'Add Award Category'}
        size="md"
      >
        <form onSubmit={handleSaveCategory} className="space-y-4">
          <div
            className="flex items-center gap-4 p-3.5 rounded-[8px]"
            style={{
              backgroundColor: isDark ? '#161615' : '#FBFBFA',
              border: `1px solid ${borderColor}`
            }}
          >
            <AwardIconBadge icon={catForm.icon} gradient={catForm.color_gradient} isDark={isDark} />
            <div className="min-w-0">
              <div className={`text-[11px] uppercase tracking-[0.05em] font-semibold ${isDark ? 'text-[#8C8B87]' : 'text-[#787774]'}`} style={monoStyle}>
                Icon &amp; Pastel Preview
              </div>
              <div className="font-bold text-base truncate" style={serifStyle}>
                {catForm.title || 'Category Title'}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold mb-1.5">Category Title</label>
              <input
                type="text"
                required
                value={catForm.title}
                onChange={(e) => setCatForm(prev => ({ ...prev, title: e.target.value }))}
                className={inputClass}
                placeholder="e.g., The Resilience Award"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5">Display Order</label>
              <input
                type="number"
                min={1}
                required
                value={catForm.sort_order}
                onChange={(e) => setCatForm(prev => ({ ...prev, sort_order: Number(e.target.value) || 1 }))}
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1.5">Criterion Description</label>
            <textarea
              rows={3}
              value={catForm.description}
              onChange={(e) => setCatForm(prev => ({ ...prev, description: e.target.value }))}
              className={inputClass}
              placeholder="Describe the qualities represented by this award..."
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1.5">Icon</label>
              <select
                value={catForm.icon}
                onChange={(e) => setCatForm(prev => ({ ...prev, icon: e.target.value }))}
                className={inputClass}
              >
                {AWARD_ICON_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5">Muted Pastel Accent</label>
              <select
                value={catForm.color_gradient}
                onChange={(e) => setCatForm(prev => ({ ...prev, color_gradient: e.target.value }))}
                className={inputClass}
              >
                {AWARD_TONE_PRESETS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setCatModalOpen(false)}
              className={`px-4 py-2 text-xs font-semibold rounded-[6px] border cursor-pointer ${
                isDark ? 'border-[#2C2C29] hover:bg-[#242421]' : 'border-[#EAEAEA] hover:bg-[#F7F6F3]'
              }`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="px-4 py-2 text-xs font-semibold rounded-[6px] inline-flex items-center gap-1.5 cursor-pointer"
              style={{
                backgroundColor: isDark ? '#F2F2EF' : '#111111',
                color: isDark ? '#111111' : '#FFFFFF'
              }}
            >
              <SaveIcon className="w-3.5 h-3.5" />
              <span>Save Category</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Destructive Action Confirmation Modal */}
      <Modal
        isOpen={confirmModal.open}
        onClose={() => setConfirmModal({ open: false, type: null, payload: null, title: '', message: '' })}
        title={confirmModal.title}
        size="sm"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <span className="shrink-0 mt-0.5 text-[#9F2F2D]">
              <AlertIcon className="w-5 h-5" />
            </span>
            <p className="text-sm leading-relaxed">{confirmModal.message}</p>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setConfirmModal({ open: false, type: null, payload: null, title: '', message: '' })}
              className={`px-4 py-2 text-xs font-semibold rounded-[6px] border cursor-pointer ${
                isDark ? 'border-[#2C2C29] hover:bg-[#242421]' : 'border-[#EAEAEA] hover:bg-[#F7F6F3]'
              }`}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmAction}
              disabled={busy}
              className="px-4 py-2 text-xs font-semibold rounded-[6px] cursor-pointer"
              style={{
                backgroundColor: '#9F2F2D',
                color: '#FFFFFF'
              }}
            >
              Confirm
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
