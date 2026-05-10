'use client'

import { useState, useEffect, useCallback, createContext, useContext } from 'react'

export const LIGHT = {
  pageBg:        '#F7F6F3',
  cardBg:        '#FFFFFF',
  cardBgAlt:     '#F9F9F8',
  border:        '#EAEAEA',
  borderHover:   '#D4D4D4',
  textPrimary:   '#111111',
  textSecondary: '#787774',
  textBody:      '#2F3437',
  subtleBg:      '#F7F6F3',
  inputBg:       '#FFFFFF',
  // pastels
  greenBg:  '#EDF3EC', greenText:  '#346538',
  blueBg:   '#E1F3FE', blueText:   '#1F6C9F',
  yellowBg: '#FBF3DB', yellowText: '#956400',
  redBg:    '#FDEBEC', redText:    '#9F2F2D',
  // today badge
  todayBg:   '#111111',
  todayText: '#FFFFFF',
  // card accents (menu grid)
  CARD_ACCENTS: [
    { bg: '#EDF3EC', text: '#346538' },
    { bg: '#E1F3FE', text: '#1F6C9F' },
    { bg: '#FBF3DB', text: '#956400' },
    { bg: '#FDEBEC', text: '#9F2F2D' },
  ],
  // toggle button
  toggleBg:   '#F7F6F3',
  toggleIcon: '#787774',
}

export const DARK = {
  pageBg:        '#18171A',
  cardBg:        '#232228',
  cardBgAlt:     '#1D1C21',
  border:        'rgba(255,255,255,0.08)',
  borderHover:   'rgba(255,255,255,0.15)',
  textPrimary:   '#F0EFE9',
  textSecondary: '#8C8985',
  textBody:      '#C5C2BC',
  subtleBg:      '#1D1C21',
  inputBg:       '#232228',
  // pastels – muted for dark mode
  greenBg:  '#1E2E1E', greenText:  '#7BAF7B',
  blueBg:   '#1A2F3D', blueText:   '#7CB8DC',
  yellowBg: '#2A2618', yellowText: '#C4A24A',
  redBg:    '#3A1E1E', redText:    '#DC8585',
  // today badge
  todayBg:   '#F0EFE9',
  todayText: '#18171A',
  // card accents (menu grid)
  CARD_ACCENTS: [
    { bg: '#1E2E1E', text: '#7BAF7B' },
    { bg: '#1A2F3D', text: '#7CB8DC' },
    { bg: '#2A2618', text: '#C4A24A' },
    { bg: '#3A1E1E', text: '#DC8585' },
  ],
  // toggle button
  toggleBg:   '#2A2830',
  toggleIcon: '#8C8985',
}

const STORAGE_KEY = 'ui_theme'

// ─── Context ────────────────────────────────────────────────────────────────

const ThemeContext = createContext(null)

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    const dark = stored === 'dark'
    setIsDark(dark)
    if (dark) document.documentElement.classList.add('dark-theme')
    else document.documentElement.classList.remove('dark-theme')
  }, [])

  const toggle = useCallback(() => {
    setIsDark(prev => {
      const next = !prev
      localStorage.setItem(STORAGE_KEY, next ? 'dark' : 'light')
      if (next) document.documentElement.classList.add('dark-theme')
      else document.documentElement.classList.remove('dark-theme')
      return next
    })
  }, [])

  // Set theme to a specific mode ('light' | 'dark') — used to sync from DB on login/profile load
  const setTheme = useCallback((mode) => {
    const dark = mode === 'dark'
    setIsDark(dark)
    localStorage.setItem(STORAGE_KEY, dark ? 'dark' : 'light')
    if (dark) document.documentElement.classList.add('dark-theme')
    else document.documentElement.classList.remove('dark-theme')
  }, [])

  const theme = isDark ? DARK : LIGHT

  return (
    <ThemeContext.Provider value={{ isDark, toggle, setTheme, theme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>')
  return ctx
}
