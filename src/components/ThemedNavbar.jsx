'use client'

import React, { useState, useEffect } from 'react'
import { useTheme } from '@/lib/theme'
import { useI18n } from '@/lib/i18n'
import { usePathname } from 'next/navigation'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faBars, faXmark } from '@fortawesome/free-solid-svg-icons'
import BugReportModal from '@/components/BugReportModal'

const SIDEBAR_ROUTE_PREFIXES = [
  '/dashboard',
  '/data',
  '/profile',
  '/reports',
  '/room',
  '/sales',
  '/settings',
  '/stock',
  '/student',
  '/teacher'
]

function isSidebarRoute(pathname) {
  if (!pathname) return false
  if (pathname.startsWith('/data/athletic-day/live') || pathname.startsWith('/data/topic/print')) {
    return false
  }
  return SIDEBAR_ROUTE_PREFIXES.some(prefix => pathname === prefix || pathname.startsWith(`${prefix}/`))
}

export default function ThemedNavbar() {
  const { theme, isDark, toggle } = useTheme()
  const { lang, setLang, t } = useI18n()
  const pathname = usePathname()
  const [showBugModal, setShowBugModal] = useState(false)
  const [sidebarState, setSidebarState] = useState({ mounted: null, isOpen: false })

  // Listen to open-bug-report events across the app
  useEffect(() => {
    const handleOpen = () => setShowBugModal(true)
    window.addEventListener('open-bug-report', handleOpen)
    return () => window.removeEventListener('open-bug-report', handleOpen)
  }, [])

  // Listen to Sidebar mount/open status so hamburger button lives inside the navbar flex flow
  useEffect(() => {
    const handleSidebarState = (e) => {
      const detail = e?.detail || {}
      setSidebarState({
        mounted: Boolean(detail.mounted),
        isOpen: Boolean(detail.isOpen)
      })
    }
    window.addEventListener('sidebar-state', handleSidebarState)
    return () => window.removeEventListener('sidebar-state', handleSidebarState)
  }, [])

  if (pathname?.startsWith('/data/athletic-day/live')) {
    return null
  }

  const showMobileHamburger = sidebarState.mounted !== null ? sidebarState.mounted : isSidebarRoute(pathname)

  return (
    <>
      <div
        className="shrink-0 z-40 border-b"
        style={{ background: theme.cardBg, borderColor: theme.border }}
      >
        <div className="max-w-7xl mx-auto px-2.5 sm:px-4 h-12 flex items-center justify-between gap-2 min-w-0">
          {/* Left slot: docked mobile hamburger button (never overlaps right controls) */}
          <div className="flex items-center shrink-0">
            {showMobileHamburger && (
              <button
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent('toggle-mobile-sidebar'))}
                className="lg:hidden inline-flex items-center justify-center w-8 h-8 rounded-md border transition-colors cursor-pointer shrink-0"
                style={{
                  background: theme.inputBg,
                  borderColor: theme.border,
                  color: theme.textPrimary
                }}
                aria-label={sidebarState.isOpen ? 'Close navigation menu' : 'Open navigation menu'}
              >
                <FontAwesomeIcon
                  icon={sidebarState.isOpen ? faXmark : faBars}
                  className="w-3.5 h-3.5"
                />
              </button>
            )}
          </div>

          {/* Right slot: responsive single-row controls */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 ml-auto min-w-0">
            {/* Quick Bug Reporting Button */}
            <button
              type="button"
              onClick={() => setShowBugModal(true)}
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm px-2 sm:px-2.5 py-1 rounded-md transition-all hover:opacity-85 cursor-pointer shadow-2xs active:scale-95 whitespace-nowrap shrink-0"
              style={{
                border: `1px solid ${theme.border}`,
                background: theme.inputBg,
                color: theme.textBody,
              }}
              title={t('feedback.bugReportingQuick') || 'Laporkan Kendala / Usulan Fitur (Akses Cepat)'}
            >
              <span style={{ fontSize: '13px', lineHeight: 1 }}>🐞</span>
              <span style={{ color: theme.textSecondary, fontWeight: 500 }}>
                {t('feedback.bugReporting') || 'Bug Reporting'}
              </span>
            </button>

            {/* Divider */}
            <span
              className="hidden sm:inline-block shrink-0"
              style={{ width: '1px', height: '18px', background: theme.border }}
            />

            {/* Dark mode toggle */}
            <button
              type="button"
              onClick={toggle}
              title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm px-2 sm:px-2.5 py-1 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              style={{
                border: `1px solid ${theme.border}`,
                background: theme.inputBg,
                color: theme.textBody,
              }}
            >
              <span style={{ fontSize: '14px', lineHeight: 1 }}>{isDark ? '☀️' : '🌙'}</span>
              <span className="hidden sm:inline" style={{ color: theme.textSecondary }}>
                {isDark ? 'Light' : 'Dark'}
              </span>
            </button>

            {/* Divider */}
            <span
              className="hidden md:inline-block shrink-0"
              style={{ width: '1px', height: '18px', background: theme.border }}
            />

            {/* Language selector */}
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="hidden md:inline text-sm whitespace-nowrap" style={{ color: theme.textSecondary }}>
                Language:
              </span>
              <select
                value={lang}
                onChange={e => setLang(e.target.value)}
                aria-label="Language"
                className="text-xs sm:text-sm px-1.5 sm:px-2 py-1 shrink-0"
                style={{
                  border: `1px solid ${theme.border}`,
                  borderRadius: '6px',
                  background: theme.inputBg,
                  color: theme.textBody,
                  outline: 'none',
                }}
              >
                <option value="id">Indonesia</option>
                <option value="en">English</option>
                <option value="zh">中文</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Global Bug & Issue Reporting Modal */}
      <BugReportModal
        isOpen={showBugModal}
        onClose={() => setShowBugModal(false)}
      />
    </>
  )
}
