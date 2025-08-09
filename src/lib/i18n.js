"use client"

import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import en from '@/i18n/en.json'
import id from '@/i18n/id.json'
import zh from '@/i18n/zh.json'

const dictionaries = { en, id, zh }
const fallbackLang = 'id'

const I18nContext = createContext({
  lang: fallbackLang,
  setLang: () => {},
  t: (key, vars) => key,
  translateMenu: (keyOrPath, fallback) => fallback ?? keyOrPath,
})

function getByPath(obj, path) {
  return path.split('.').reduce((acc, k) => (acc && acc[k] !== undefined ? acc[k] : undefined), obj)
}

export function I18nProvider({ children }) {
  const [lang, setLang] = useState(fallbackLang)

  useEffect(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('lang') : null
    if (saved && dictionaries[saved]) setLang(saved)
  }, [])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('lang', lang)
      document.documentElement.lang = lang
    }
  }, [lang])

  const dict = useMemo(() => dictionaries[lang] || dictionaries[fallbackLang], [lang])

  const t = useMemo(() => (key, vars) => {
    const val = getByPath(dict, key) ?? getByPath(dictionaries[fallbackLang], key) ?? key
    if (!vars) return val
    return Object.keys(vars).reduce((s, k) => s.replace(new RegExp(`{${k}}`, 'g'), vars[k]), val)
  }, [dict])

  const translateMenu = (keyOrPath, fallback) => {
    const m = dict?.menus?.[keyOrPath]
    if (m) return m
    const fb = dictionaries[fallbackLang]?.menus?.[keyOrPath]
    return fb || fallback || keyOrPath
  }

  const value = useMemo(() => ({ lang, setLang, t, translateMenu }), [lang, t])
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  return useContext(I18nContext)
}
