'use client'

import { useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'

// Simple client-side access guard using menu_permissions
// Logic:
// - Admins can access everything
// - Non-admins: load allowed menus via customAuth.getMenusByRole
// - Allow if pathname equals a menu_path or starts with menu_path + '/'
export default function AccessGuard({ children }) {
  const pathname = usePathname()
  const router = useRouter()
  const [authorized, setAuthorized] = useState(false)
  const [checking, setChecking] = useState(true)

  const { roleName, isAdmin, isCounselor, isTeacher, isStudent } = useMemo(() => {
    if (typeof window === 'undefined') return { roleName: null, isAdmin: false }
    try {
      const userRaw = localStorage.getItem('user_data')
      const user = userRaw ? JSON.parse(userRaw) : null
      const storedRole = localStorage.getItem('user_role')
      const roleName = user?.roleName || storedRole || null
      const isAdmin = !!user?.isAdmin || roleName === 'admin' || roleName === 'Admin'
      const isCounselor = !!user?.isCounselor
  const isTeacher = !!user?.isTeacher
  const isStudent = !!user?.isStudent
  return { roleName, isAdmin, isCounselor, isTeacher, isStudent }
    } catch {
  return { roleName: null, isAdmin: false, isCounselor: false, isTeacher: false, isStudent: false }
    }
  }, [])

  useEffect(() => {
    let mounted = true
    const check = async () => {
      try {
        // Basic auth presence check
        const kr_id = typeof window !== 'undefined' ? localStorage.getItem('kr_id') : null
        if (!kr_id) {
          router.replace('/login')
          return
        }

        if (isAdmin) {
          if (!mounted) return
          setAuthorized(true)
          setChecking(false)
          return
        }

        // Helper to normalize any path variants from DB (with/without leading/trailing slash)
        const normalize = (p) => {
          if (!p) return ''
          let s = String(p).trim()
          if (!s.startsWith('/')) s = '/' + s
          // keep root as '/'; otherwise drop trailing '/'
          if (s.length > 1 && s.endsWith('/')) s = s.slice(0, -1)
          return s
        }

        // Load allowed menus for role
        const cacheKey = roleName ? `allowed_menu_paths:${roleName}` : null
        let allowedPaths = []
        if (cacheKey) {
          try {
            const cached = sessionStorage.getItem(cacheKey)
            if (cached) allowedPaths = JSON.parse(cached)
          } catch {}
        }

    if (!allowedPaths || allowedPaths.length === 0) {
          const { customAuth } = await import('@/lib/supabase')
          const res = await customAuth.getMenusByRole(roleName || '', false)
          if (res.success) {
            allowedPaths = (res.menus || []).map(m => m.menu_path).filter(Boolean)
            if (cacheKey) sessionStorage.setItem(cacheKey, JSON.stringify(allowedPaths))
      // Refresh cookie for SSR middleware (include defaults after normalization below)
          }
        }

        // Normalize paths and add default always-allowed sections
        const defaults = ['/dashboard', '/profile']
        const normalizedList = Array.isArray(allowedPaths) ? allowedPaths.map(normalize) : []
        // Counselor override: ensure consultation is allowed even if menu permission missing
        const counselorExtra = isCounselor ? ['/data/consultation'] : []
  // Teacher override: ensure teacher & room sections are allowed when role is teacher
  const teacherExtra = isTeacher ? ['/teacher', '/teacher/assessment_submission', '/teacher/nilai', '/room', '/room/booking'] : []
        // Student override: ensure student scan is allowed when role is student
        const studentExtra = isStudent ? ['/student', '/student/scan'] : []
        const merged = Array.from(new Set([
          ...normalizedList,
          ...defaults.map(normalize),
          ...counselorExtra.map(normalize),
          ...teacherExtra.map(normalize),
          ...studentExtra.map(normalize)
        ]))

        // Update cookie for SSR middleware (while SSR currently guards /data|/settings only)
        try {
          const maxAge = 60 * 60 * 8
          const safeJoin = encodeURIComponent(merged.join('|'))
          document.cookie = `allowed_paths=${safeJoin}; Path=/; Max-Age=${maxAge}; SameSite=Lax`
        } catch {}

        const hasAccess = (path) => {
          if (!Array.isArray(merged)) return false
          const np = normalize(path)
          return merged.some(p => np === p || (p && p !== '/' && np.startsWith(p + '/')))
        }

        if (!mounted) return
        if (hasAccess(pathname)) {
          setAuthorized(true)
          setChecking(false)
        } else {
          setAuthorized(false)
          setChecking(false)
          // Redirect softly to dashboard
          router.replace('/dashboard?forbidden=1')
        }
      } catch (e) {
        if (!mounted) return
        setAuthorized(false)
        setChecking(false)
        router.replace('/dashboard?forbidden=1')
      }
    }

    check()
    return () => { mounted = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  if (checking) return null
  if (!authorized) return null
  return children
}
