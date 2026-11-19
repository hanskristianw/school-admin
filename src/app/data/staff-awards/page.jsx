'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import Modal from '@/components/ui/modal'
import StaffNomineeAutocomplete from '@/components/StaffNomineeAutocomplete'
import { useTheme } from '@/lib/theme'
import AwardIconBadge from './components/AwardIconBadge'
import StaffAwardsAdminResults from './components/StaffAwardsAdminResults'
import StaffAwardsAdminManage from './components/StaffAwardsAdminManage'
import {
  CheckIcon,
  CloseIcon,
  CheckCircleIcon,
  LockIcon,
  UserBlockedIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  SendIcon,
  ShieldIcon,
  ChartIcon,
  SlidersIcon,
  BallotIcon,
  AlertIcon,
  SpinnerIcon
} from './components/MinimalIcons'

function formatWibDateTime(isoStr) {
  if (!isoStr) return ''
  try {
    return (
      new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Jakarta',
        year: 'numeric',
        month: 'long',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }).format(new Date(isoStr)) + ' WIB'
    )
  } catch {
    return String(isoStr)
  }
}

export default function StaffAwardsPage() {
  const { isDark } = useTheme()

  const [currentUserId, setCurrentUserId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState(null)

  // Server payload state
  const [isAdmin, setIsAdmin] = useState(false)
  const [isEligibleVoter, setIsEligibleVoter] = useState(true)
  const [storageMode, setStorageMode] = useState('settings_fallback')
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [categories, setCategories] = useState([])
  const [nominees, setNominees] = useState([])
  const [hasVoted, setHasVoted] = useState(false)
  const [submittedAt, setSubmittedAt] = useState(null)

  // Admin-only payload state
  const [years, setYears] = useState([])
  const [events, setEvents] = useState([])
  const [participation, setParticipation] = useState(null)
  const [results, setResults] = useState([])
  const [adminEventId, setAdminEventId] = useState(null)

  // Navigation state: 'vote' | 'results' | 'manage'
  const [activeTab, setActiveTab] = useState('vote')

  // Card Wizard state
  const [wizardStep, setWizardStep] = useState(0) // 0..N-1 for categories
  const [selections, setSelections] = useState({})
  const [confirmModalOpen, setConfirmModalOpen] = useState(false)

  useEffect(() => {
    const krId = localStorage.getItem('kr_id')
    if (krId) {
      setCurrentUserId(Number(krId))
    } else {
      setLoading(false)
    }
  }, [])

  const fetchStaffAwards = useCallback(async (uid, targetEventId = null, silent = false) => {
    if (!uid) return
    if (!silent) setLoading(true)
    else setRefreshing(true)
    setErrorMsg(null)

    try {
      const params = new URLSearchParams({ user_id: String(uid) })
      if (targetEventId) params.set('event_id', String(targetEventId))

      const res = await fetch(`/api/staff-awards?${params.toString()}`)
      const data = await res.json()

      if (!data.success) {
        setErrorMsg(data.message || 'Failed to load Staff Awards data.')
        return
      }

      setStorageMode(data.storage_mode || 'settings_fallback')
      setIsAdmin(Boolean(data.is_admin))
      setIsEligibleVoter(Boolean(data.is_eligible_voter))
      setSelectedEvent(data.selected_event || null)
      setCategories(data.categories || [])
      setNominees(data.nominees || [])
      setHasVoted(Boolean(data.has_voted))
      setSubmittedAt(data.submitted_at || null)

      if (data.is_admin) {
        setYears(data.years || [])
        setEvents(data.events || [])
        setParticipation(data.participation || null)
        setResults(data.results || [])
        if (data.selected_event?.id) {
          setAdminEventId(data.selected_event.id)
        }
      } else {
        setActiveTab('vote')
      }
    } catch (err) {
      setErrorMsg(err.message || 'Network error while loading Staff Awards.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    if (currentUserId) {
      fetchStaffAwards(currentUserId, null, false)
    }
  }, [currentUserId, fetchStaffAwards])

  // Keyboard navigation between wizard cards when not focused inside an input/select/textarea
  useEffect(() => {
    if (activeTab !== 'vote' || hasVoted || !selectedEvent || selectedEvent.status !== 'active' || categories.length === 0) {
      return
    }
    const handleKeyDown = (e) => {
      const tag = e.target?.tagName?.toLowerCase()
      if (tag === 'input' || tag === 'textarea' || tag === 'select' || confirmModalOpen) return

      if (e.key === 'ArrowRight') {
        e.preventDefault()
        setWizardStep(prev => Math.min(Math.max(0, categories.length - 1), prev + 1))
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        setWizardStep(prev => Math.max(0, prev - 1))
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeTab, hasVoted, selectedEvent, categories.length, confirmModalOpen])

  const handleAdminSelectEvent = (eventId) => {
    setAdminEventId(eventId)
    setSelections({})
    setWizardStep(0)
    fetchStaffAwards(currentUserId, eventId, true)
  }

  const handleSelectNominee = (categoryId, nomineeUserId) => {
    setSelections(prev => {
      const next = { ...prev }
      if (!nomineeUserId) {
        delete next[categoryId]
      } else {
        next[categoryId] = Number(nomineeUserId)
      }
      return next
    })
  }

  const completedCount = useMemo(
    () => categories.filter(c => Boolean(selections[c.id])).length,
    [categories, selections]
  )
  const totalCategories = categories.length
  const remainingCount = Math.max(0, totalCategories - completedCount)
  const progressPct = totalCategories > 0 ? Math.round((completedCount / totalCategories) * 100) : 0
  const isReadyToSubmit = totalCategories > 0 && remainingCount === 0

  const nomineeMap = useMemo(
    () => new Map(nominees.map(n => [Number(n.user_id), n])),
    [nominees]
  )

  const getUsedNomineeMapForCategory = useCallback(
    (currentCategoryId) => {
      const map = new Map()
      for (const cat of categories) {
        if (Number(cat.id) === Number(currentCategoryId)) continue
        const chosenUserId = selections[cat.id]
        if (chosenUserId) {
          map.set(Number(chosenUserId), {
            number: cat.sort_order,
            title: cat.title
          })
        }
      }
      return map
    },
    [categories, selections]
  )

  // Find next unvoted category index (preferring ahead of current step, else wrapping to first unvoted)
  const nextUnvotedIndex = useMemo(() => {
    if (remainingCount === 0) return -1
    for (let i = wizardStep + 1; i < categories.length; i++) {
      if (!selections[categories[i].id]) return i
    }
    for (let i = 0; i < categories.length; i++) {
      if (!selections[categories[i].id]) return i
    }
    return -1
  }, [categories, selections, wizardStep, remainingCount])

  const firstMissingIndex = useMemo(() => {
    return categories.findIndex(c => !selections[c.id])
  }, [categories, selections])

  const handleFinalSubmit = async () => {
    if (!selectedEvent || !currentUserId || !isReadyToSubmit || submitting) return
    setSubmitting(true)
    setErrorMsg(null)

    try {
      const payloadSelections = categories.map(cat => ({
        category_id: cat.id,
        nominee_user_id: selections[cat.id]
      }))

      const res = await fetch('/api/staff-awards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'cast_vote',
          user_id: currentUserId,
          event_id: selectedEvent.id,
          selections: payloadSelections
        })
      })
      const json = await res.json()

      if (!json.success) {
        setConfirmModalOpen(false)
        setErrorMsg(json.message || 'Failed to record your ballot.')
        return
      }

      setConfirmModalOpen(false)
      setHasVoted(true)
      setSubmittedAt(json.submitted_at || new Date().toISOString())
      setSelections({})
      setWizardStep(0)
      await fetchStaffAwards(currentUserId, adminEventId, true)
    } catch (err) {
      setConfirmModalOpen(false)
      setErrorMsg(err.message || 'An error occurred while submitting your ballot.')
    } finally {
      setSubmitting(false)
    }
  }

  const sansStyle = { fontFamily: "'SF Pro Display', 'Geist Sans', 'Helvetica Neue', -apple-system, BlinkMacSystemFont, sans-serif" }
  const serifStyle = { fontFamily: "'Lyon Text', 'Newsreader', 'Playfair Display', 'Instrument Serif', Georgia, serif" }
  const monoStyle = { fontFamily: "'Geist Mono', 'SF Mono', 'JetBrains Mono', ui-monospace, monospace" }

  const borderColor = isDark ? '#2C2C29' : '#EAEAEA'
  const canvasBg = isDark ? '#161615' : '#FBFBFA'
  const surfaceBg = isDark ? '#1E1E1C' : '#FFFFFF'
  const secondaryBg = isDark ? '#242421' : '#F7F6F3'
  const inkPrimary = isDark ? '#F2F2EF' : '#111111'
  const inkMuted = isDark ? '#8C8B87' : '#787774'

  if (loading) {
    return (
      <div
        className="min-h-[70vh] flex flex-col items-center justify-center gap-3 rounded-[12px]"
        style={{ backgroundColor: canvasBg, color: inkMuted, ...sansStyle }}
      >
        <SpinnerIcon className="w-6 h-6" />
        <p className="text-sm font-medium">Loading Teachers &amp; Staff Recognition...</p>
      </div>
    )
  }

  const safeStepIndex = Math.min(wizardStep, Math.max(0, totalCategories - 1))
  const isLastStep = totalCategories > 0 && safeStepIndex === totalCategories - 1
  const activeCategory = categories[safeStepIndex] || null

  return (
    <div
      className="min-h-full relative rounded-[12px] overflow-x-clip pb-20"
      style={{ backgroundColor: canvasBg, color: inkPrimary, ...sansStyle }}
    >
      <style jsx>{`
        @keyframes editorialEnter {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .editorial-enter {
          animation: editorialEnter 420ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .editorial-card-hover {
          transition: box-shadow 200ms ease, border-color 200ms ease;
        }
        .editorial-card-hover:hover {
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
        }
      `}</style>

      {/* Quiet geometric dot-grid background layer */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: `radial-gradient(${isDark ? '#FFFFFF' : '#111111'} 0.75px, transparent 0.75px)`,
          backgroundSize: '24px 24px',
          opacity: isDark ? 0.035 : 0.04
        }}
      />

      {/* Top Admin Switcher Bar (Strictly visible ONLY when server verified is_admin === true) */}
      {isAdmin && (
        <div
          className="sticky top-0 z-20 px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3 backdrop-blur-sm"
          style={{
            backgroundColor: isDark ? 'rgba(30, 30, 28, 0.92)' : 'rgba(255, 255, 255, 0.92)',
            borderBottom: `1px solid ${borderColor}`
          }}
        >
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase tracking-[0.06em]"
            style={{
              backgroundColor: isDark ? '#2C2515' : '#FBF3DB',
              color: isDark ? '#E8C56E' : '#956400',
              ...monoStyle
            }}
          >
            <ShieldIcon className="w-3.5 h-3.5" />
            Admin Access
          </span>

          <div
            className="inline-flex p-1 rounded-[8px]"
            style={{
              backgroundColor: secondaryBg,
              border: `1px solid ${borderColor}`
            }}
          >
            {[
              { key: 'vote', label: 'Cast Vote', Icon: BallotIcon },
              { key: 'results', label: 'Participation & Results', Icon: ChartIcon },
              { key: 'manage', label: 'Manage Event & Categories', Icon: SlidersIcon }
            ].map(tab => {
              const active = activeTab === tab.key
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className="px-3.5 py-1.5 rounded-[6px] text-xs font-semibold inline-flex items-center gap-1.5 transition-all cursor-pointer"
                  style={
                    active
                      ? {
                          backgroundColor: isDark ? '#F2F2EF' : '#111111',
                          color: isDark ? '#111111' : '#FFFFFF'
                        }
                      : {
                          color: inkMuted
                        }
                  }
                >
                  <tab.Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* TAB 2: ADMIN PARTICIPATION & RESULTS */}
      {isAdmin && activeTab === 'results' && (
        <div className="relative">
          <StaffAwardsAdminResults
            events={events}
            selectedEvent={selectedEvent}
            onSelectEvent={handleAdminSelectEvent}
            participation={participation}
            results={results}
            onRefresh={() => fetchStaffAwards(currentUserId, adminEventId, true)}
            refreshing={refreshing}
            isDark={isDark}
          />
        </div>
      )}

      {/* TAB 3: ADMIN MANAGE EVENT & CATEGORIES */}
      {isAdmin && activeTab === 'manage' && (
        <div className="relative">
          <StaffAwardsAdminManage
            storageMode={storageMode}
            years={years}
            events={events}
            selectedEvent={selectedEvent}
            onSelectEvent={handleAdminSelectEvent}
            categories={categories}
            submissionCount={participation?.voted_count || 0}
            currentUserId={currentUserId}
            onReload={(evId) => fetchStaffAwards(currentUserId, evId || adminEventId, true)}
            isDark={isDark}
          />
        </div>
      )}

      {/* TAB 1: EDITORIAL CARD WIZARD VOTING EXPERIENCE */}
      {activeTab === 'vote' && (
        <div className="relative">
          {/* Editorial Header */}
          <header className="max-w-4xl mx-auto px-4 pt-12 pb-10 text-center space-y-5 editorial-enter">
            <div className="flex justify-center">
              <img
                src="/images/login-logo.png"
                alt="Chung Chung Christian School Emblem"
                className="h-14 md:h-16 w-auto object-contain"
              />
            </div>

            {selectedEvent?.year_name && (
              <div
                className="text-[11px] font-semibold uppercase tracking-[0.12em]"
                style={{ color: inkMuted, ...monoStyle }}
              >
                {selectedEvent.year_name} • Annual Recognition
              </div>
            )}

            <h1
              className="text-4xl sm:text-5xl font-bold tracking-[-0.03em] leading-[1.08]"
              style={{ ...serifStyle, color: inkPrimary }}
            >
              Teachers &amp; Staff Recognition
            </h1>

            <p
              className="max-w-2xl mx-auto text-sm md:text-[15px] leading-[1.65]"
              style={{ color: inkMuted }}
            >
              {selectedEvent?.description ||
                'Celebrate the dedication, steady care, and daily contributions of our teachers and staff. Nominate one colleague for each award category below.'}
            </p>

            {/* 3 Spot Pastel Policy Tags */}
            <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
              <span
                className="px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-[0.06em]"
                style={{
                  backgroundColor: isDark ? '#19291B' : '#EDF3EC',
                  color: isDark ? '#9BD09F' : '#346538',
                  ...monoStyle
                }}
              >
                One Vote Per Account
              </span>
              <span
                className="px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-[0.06em]"
                style={{
                  backgroundColor: isDark ? '#2C191A' : '#FDEBEC',
                  color: isDark ? '#ECA3A1' : '#9F2F2D',
                  ...monoStyle
                }}
              >
                No Self-Nomination
              </span>
              <span
                className="px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-[0.06em]"
                style={{
                  backgroundColor: isDark ? '#2C2515' : '#FBF3DB',
                  color: isDark ? '#E8C56E' : '#956400',
                  ...monoStyle
                }}
              >
                One Colleague Per Category
              </span>
            </div>
          </header>

          {/* Main Constrained Editorial Content */}
          <main className="max-w-3xl mx-auto px-4">
            {errorMsg && (
              <div
                className="mb-6 p-4 rounded-[8px] flex items-center gap-3 text-sm font-medium"
                style={{
                  backgroundColor: isDark ? '#2C191A' : '#FDEBEC',
                  color: isDark ? '#ECA3A1' : '#9F2F2D',
                  border: `1px solid ${isDark ? '#4A2627' : '#F5D0D2'}`
                }}
              >
                <AlertIcon className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Gate 1: Ineligible Voter */}
            {!isEligibleVoter ? (
              <div
                className="rounded-[12px] p-10 text-center space-y-4 editorial-enter"
                style={{ backgroundColor: surfaceBg, border: `1px solid ${borderColor}` }}
              >
                <div
                  className="mx-auto w-12 h-12 rounded-[8px] flex items-center justify-center"
                  style={{ backgroundColor: secondaryBg, color: inkMuted }}
                >
                  <UserBlockedIcon className="w-6 h-6" />
                </div>
                <h2 className="text-2xl font-bold" style={serifStyle}>
                  Teachers &amp; Staff Only
                </h2>
                <p className="text-sm max-w-md mx-auto leading-[1.65]" style={{ color: inkMuted }}>
                  Participation in Teachers &amp; Staff Recognition is restricted to active CCS faculty and non-vendor operational staff.
                </p>
              </div>
            ) : !selectedEvent || selectedEvent.status !== 'active' ? (
              /* Gate 2: Draft or Closed Event */
              <div
                className="rounded-[12px] p-10 text-center space-y-4 editorial-enter"
                style={{ backgroundColor: surfaceBg, border: `1px solid ${borderColor}` }}
              >
                <div
                  className="mx-auto w-12 h-12 rounded-[8px] flex items-center justify-center"
                  style={{
                    backgroundColor: isDark ? '#2C2515' : '#FBF3DB',
                    color: isDark ? '#E8C56E' : '#956400'
                  }}
                >
                  <LockIcon className="w-6 h-6" />
                </div>
                <h2 className="text-2xl font-bold" style={serifStyle}>
                  {selectedEvent?.status === 'closed' ? 'Voting Period Closed' : 'Voting Not Open Yet'}
                </h2>
                <p className="text-sm max-w-md mx-auto leading-[1.65]" style={{ color: inkMuted }}>
                  {selectedEvent?.status === 'closed'
                    ? `The voting window for "${selectedEvent.title}" has concluded. Thank you for participating.`
                    : 'Please check back once the school administration opens this recognition cycle.'}
                </p>
              </div>
            ) : hasVoted ? (
              /* Gate 3: Already Voted — Permanent Lock */
              <div
                className="rounded-[12px] p-10 text-center space-y-5 editorial-enter"
                style={{ backgroundColor: surfaceBg, border: `1px solid ${borderColor}` }}
              >
                <div
                  className="mx-auto w-14 h-14 rounded-[8px] flex items-center justify-center"
                  style={{
                    backgroundColor: isDark ? '#19291B' : '#EDF3EC',
                    color: isDark ? '#9BD09F' : '#346538',
                    border: `1px solid ${isDark ? '#29422C' : '#C8DEC5'}`
                  }}
                >
                  <CheckCircleIcon className="w-7 h-7" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-3xl font-bold tracking-tight" style={serifStyle}>
                    Ballot Recorded
                  </h2>
                  <p className="text-sm max-w-md mx-auto leading-[1.65]" style={{ color: inkMuted }}>
                    Thank you for recognizing your colleagues at Chung Chung Christian School. Your anonymous ballot is permanently locked to your account.
                  </p>
                </div>
                <div
                  className="inline-flex flex-wrap items-center justify-center gap-3 px-4 py-2 rounded-[6px] text-xs font-medium"
                  style={{
                    backgroundColor: secondaryBg,
                    border: `1px solid ${borderColor}`,
                    color: inkMuted,
                    ...monoStyle
                  }}
                >
                  {submittedAt && <span>SUBMITTED {formatWibDateTime(submittedAt)}</span>}
                  <span>•</span>
                  <span>STATUS: LOCKED (1 USER / 1 VOTE)</span>
                </div>
              </div>
            ) : (
              /* Active Card Wizard Flow */
              <div className="space-y-6 editorial-enter">
                {/* Wizard Stepper Header Card */}
                <div
                  className="rounded-[12px] p-5 space-y-4"
                  style={{ backgroundColor: surfaceBg, border: `1px solid ${borderColor}` }}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-semibold" style={monoStyle}>
                    <span>
                      CATEGORY {String(safeStepIndex + 1).padStart(2, '0')} OF {String(totalCategories).padStart(2, '0')}
                    </span>
                    <span style={{ color: inkMuted }}>
                      {completedCount} OF {totalCategories} COMPLETED • {remainingCount} REMAINING
                    </span>
                  </div>

                  {/* Flat 2px Progress Track */}
                  <div className="w-full h-[2px]" style={{ backgroundColor: borderColor }}>
                    <div
                      className="h-full transition-all duration-300"
                      style={{
                        width: `${progressPct}%`,
                        backgroundColor: inkPrimary
                      }}
                    />
                  </div>

                  {/* Clickable 01..N Step Indicators: Red + X (unvoted) / Green + Check (voted) */}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {categories.map((cat, idx) => {
                      const isCurrent = safeStepIndex === idx
                      const isFilled = Boolean(selections[cat.id])
                      const stepBg = isFilled
                        ? isDark ? '#19291B' : '#EDF3EC'
                        : isDark ? '#2C191A' : '#FDEBEC'
                      const stepColor = isFilled
                        ? isDark ? '#9BD09F' : '#346538'
                        : isDark ? '#ECA3A1' : '#9F2F2D'
                      const statusBorder = isFilled
                        ? isDark ? '#29422C' : '#C8DEC5'
                        : isDark ? '#4A2627' : '#F5D0D2'

                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setWizardStep(idx)}
                          title={`${cat.sort_order}. ${cat.title} — ${isFilled ? 'Completed' : 'Not Yet Voted'}`}
                          aria-label={`Category ${cat.sort_order}: ${cat.title} (${isFilled ? 'Completed' : 'Not Yet Voted'})`}
                          className="h-8 min-w-[48px] px-2.5 rounded-[6px] text-xs font-semibold inline-flex items-center justify-center gap-1 transition-transform active:scale-[0.98] cursor-pointer"
                          style={{
                            ...monoStyle,
                            backgroundColor: stepBg,
                            color: stepColor,
                            border: isCurrent ? `2px solid ${inkPrimary}` : `1px solid ${statusBorder}`,
                            outline: isCurrent
                              ? `2px solid ${isDark ? 'rgba(242, 242, 239, 0.22)' : 'rgba(17, 17, 17, 0.16)'}`
                              : 'none',
                            outlineOffset: '1px'
                          }}
                        >
                          <span>{String(cat.sort_order).padStart(2, '0')}</span>
                          {isFilled ? <CheckIcon className="w-3 h-3" /> : <CloseIcon className="w-3 h-3" />}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Active Category Card */}
                {activeCategory && (
                  <div
                    key={activeCategory.id}
                    className="rounded-[12px] p-7 md:p-10 space-y-7 editorial-card-hover editorial-enter"
                    style={{ backgroundColor: surfaceBg, border: `1px solid ${borderColor}` }}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <AwardIconBadge
                          icon={activeCategory.icon}
                          gradient={activeCategory.color_gradient}
                          size="md"
                          isDark={isDark}
                        />
                        <div className="text-xs font-semibold uppercase tracking-[0.08em]" style={{ color: inkMuted, ...monoStyle }}>
                          Award {String(activeCategory.sort_order).padStart(2, '0')} of {String(totalCategories).padStart(2, '0')}
                        </div>
                      </div>

                      {selections[activeCategory.id] ? (
                        <span
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-[0.05em]"
                          style={{
                            backgroundColor: isDark ? '#19291B' : '#EDF3EC',
                            color: isDark ? '#9BD09F' : '#346538',
                            ...monoStyle
                          }}
                        >
                          <CheckIcon className="w-3 h-3" />
                          Completed
                        </span>
                      ) : (
                        <span
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-[0.05em]"
                          style={{
                            backgroundColor: isDark ? '#2C191A' : '#FDEBEC',
                            color: isDark ? '#ECA3A1' : '#9F2F2D',
                            ...monoStyle
                          }}
                        >
                          <CloseIcon className="w-3 h-3" />
                          Not Yet Voted
                        </span>
                      )}
                    </div>

                    <div className="space-y-3">
                      <h2
                        className="text-2xl md:text-3xl font-bold tracking-[-0.02em] leading-[1.15]"
                        style={serifStyle}
                      >
                        {activeCategory.title}
                      </h2>
                      <p className="text-sm md:text-[15px] leading-[1.65]" style={{ color: inkMuted }}>
                        {activeCategory.description}
                      </p>
                    </div>

                    <div className="pt-5" style={{ borderTop: `1px solid ${borderColor}` }}>
                      <label
                        className="block text-[11px] font-semibold uppercase tracking-[0.08em] mb-2.5"
                        style={{ color: inkMuted, ...monoStyle }}
                      >
                        Nominate a Colleague
                      </label>
                      <StaffNomineeAutocomplete
                        nominees={nominees}
                        value={selections[activeCategory.id] || null}
                        onChange={(uid) => handleSelectNominee(activeCategory.id, uid)}
                        currentUserId={currentUserId}
                        usedNomineeMap={getUsedNomineeMapForCategory(activeCategory.id)}
                        isDark={isDark}
                      />
                    </div>

                    {/* Missing Categories Banner on Last Card */}
                    {isLastStep && remainingCount > 0 && (
                      <div
                        className="p-4 rounded-[8px] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        style={{
                          backgroundColor: isDark ? '#2C191A' : '#FDEBEC',
                          border: `1px solid ${isDark ? '#4A2627' : '#F5D0D2'}`,
                          color: isDark ? '#ECA3A1' : '#9F2F2D'
                        }}
                      >
                        <div className="text-xs font-medium">
                          {remainingCount} {remainingCount === 1 ? 'category is' : 'categories are'} still missing a nominee. Complete all {totalCategories} categories to enable submission.
                        </div>
                        {firstMissingIndex !== -1 && (
                          <button
                            type="button"
                            onClick={() => setWizardStep(firstMissingIndex)}
                            className="px-3.5 py-1.5 rounded-[6px] text-xs font-semibold shrink-0 cursor-pointer"
                            style={{ backgroundColor: '#9F2F2D', color: '#FFFFFF' }}
                          >
                            Go to #{String(categories[firstMissingIndex].sort_order).padStart(2, '0')}
                          </button>
                        )}
                      </div>
                    )}

                    {/* Wizard Footer Controls */}
                    <div
                      className="pt-6 flex flex-wrap items-center justify-between gap-3"
                      style={{ borderTop: `1px solid ${borderColor}` }}
                    >
                      <button
                        type="button"
                        disabled={safeStepIndex === 0}
                        onClick={() => setWizardStep(prev => Math.max(0, prev - 1))}
                        className="px-4 py-2.5 rounded-[6px] text-xs font-semibold inline-flex items-center gap-1.5 transition-transform active:scale-[0.98] disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer"
                        style={{
                          backgroundColor: surfaceBg,
                          color: inkPrimary,
                          border: `1px solid ${borderColor}`
                        }}
                      >
                        <ArrowLeftIcon className="w-3.5 h-3.5" />
                        <span>Previous</span>
                      </button>

                      <div className="hidden sm:flex items-center gap-3 text-xs" style={{ color: inkMuted }}>
                        {nextUnvotedIndex !== -1 && nextUnvotedIndex !== safeStepIndex && (
                          <button
                            type="button"
                            onClick={() => setWizardStep(nextUnvotedIndex)}
                            className="underline underline-offset-4 hover:opacity-80 cursor-pointer"
                            style={monoStyle}
                          >
                            Next unvoted: #{String(categories[nextUnvotedIndex].sort_order).padStart(2, '0')}
                          </button>
                        )}
                        <span className="inline-flex items-center gap-1">
                          <kbd
                            className="px-1.5 py-0.5 text-[10px] rounded-[4px]"
                            style={{ backgroundColor: secondaryBg, border: `1px solid ${borderColor}`, ...monoStyle }}
                          >
                            ←
                          </kbd>
                          <kbd
                            className="px-1.5 py-0.5 text-[10px] rounded-[4px]"
                            style={{ backgroundColor: secondaryBg, border: `1px solid ${borderColor}`, ...monoStyle }}
                          >
                            →
                          </kbd>
                        </span>
                      </div>

                      {isLastStep ? (
                        <button
                          type="button"
                          disabled={!isReadyToSubmit || submitting}
                          onClick={() => setConfirmModalOpen(true)}
                          className="px-5 py-2.5 rounded-[6px] text-xs font-semibold inline-flex items-center gap-2 transition-transform active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                          style={{
                            backgroundColor: inkPrimary,
                            color: isDark ? '#111111' : '#FFFFFF'
                          }}
                        >
                          <SendIcon className="w-3.5 h-3.5" />
                          <span>Submit Nominations</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setWizardStep(prev => Math.min(Math.max(0, totalCategories - 1), prev + 1))}
                          className="px-5 py-2.5 rounded-[6px] text-xs font-semibold inline-flex items-center gap-1.5 transition-transform active:scale-[0.98] cursor-pointer"
                          style={{
                            backgroundColor: inkPrimary,
                            color: isDark ? '#111111' : '#FFFFFF'
                          }}
                        >
                          <span>Next Category</span>
                          <ArrowRightIcon className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </main>
        </div>
      )}

      {/* Final Confirmation Summary Modal */}
      <Modal
        isOpen={confirmModalOpen}
        onClose={() => !submitting && setConfirmModalOpen(false)}
        title="Review & Confirm Ballot Submission"
        size="md"
        disableBackdropClose={submitting}
      >
        <div className="space-y-4">
          <div
            className="p-3.5 rounded-[8px] text-xs leading-relaxed"
            style={{
              backgroundColor: isDark ? '#2C2515' : '#FBF3DB',
              border: `1px solid ${isDark ? '#453A1E' : '#EFE2BA'}`,
              color: isDark ? '#E8C56E' : '#956400'
            }}
          >
            <strong>Final Notice:</strong> Your nominations are anonymous and permanent. Once submitted, your account&apos;s ballot will be locked and cannot be modified.
          </div>

          <div
            className="rounded-[8px] max-h-80 overflow-y-auto divide-y"
            style={{
              border: `1px solid ${borderColor}`,
              borderColor: borderColor
            }}
          >
            {categories.map(cat => {
              const nom = nomineeMap.get(Number(selections[cat.id]))
              return (
                <div
                  key={cat.id}
                  className="px-4 py-2.5 flex items-center justify-between gap-3"
                  style={{ borderColor: borderColor }}
                >
                  <div className="min-w-0">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.05em]" style={{ color: inkMuted, ...monoStyle }}>
                      #{String(cat.sort_order).padStart(2, '0')} • {cat.title}
                    </div>
                    <div className="text-sm font-semibold truncate mt-0.5">
                      {nom?.full_name || '-'}
                    </div>
                    {nom && (
                      <div className="text-[11px] truncate" style={{ color: inkMuted }}>
                        {nom.unit_name} • {nom.role_name}
                      </div>
                    )}
                  </div>
                  <span
                    className="p-1 rounded-full shrink-0"
                    style={{
                      backgroundColor: isDark ? '#19291B' : '#EDF3EC',
                      color: isDark ? '#9BD09F' : '#346538'
                    }}
                  >
                    <CheckIcon className="w-3.5 h-3.5" />
                  </span>
                </div>
              )
            })}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              disabled={submitting}
              onClick={() => setConfirmModalOpen(false)}
              className={`px-4 py-2 text-xs font-semibold rounded-[6px] border cursor-pointer ${
                isDark ? 'border-[#2C2C29] hover:bg-[#242421]' : 'border-[#EAEAEA] hover:bg-[#F7F6F3]'
              }`}
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={handleFinalSubmit}
              className="px-5 py-2 text-xs font-semibold rounded-[6px] inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
              style={{
                backgroundColor: inkPrimary,
                color: isDark ? '#111111' : '#FFFFFF'
              }}
            >
              {submitting ? <SpinnerIcon className="w-3.5 h-3.5" /> : <SendIcon className="w-3.5 h-3.5" />}
              <span>{submitting ? 'Submitting...' : 'Confirm & Submit'}</span>
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
