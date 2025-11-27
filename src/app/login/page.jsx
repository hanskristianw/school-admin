'use client'

import { Suspense, useEffect, useState, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Image from "next/image"
import Script from "next/script"
import { customAuth, setAuthToken } from "@/lib/supabase"
import { Button } from '@/components/ui/button'
import { useI18n } from '@/lib/i18n'

// Animated background orbs component
function FloatingOrbs() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="absolute top-1/4 -left-20 w-72 h-72 bg-sky-400/30 rounded-full blur-3xl animate-pulse" />
      <div className="absolute top-3/4 -right-20 w-96 h-96 bg-cyan-400/20 rounded-full blur-3xl animate-pulse delay-1000" />
      <div className="absolute -top-20 right-1/4 w-80 h-80 bg-blue-400/20 rounded-full blur-3xl animate-pulse delay-500" />
      <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-teal-400/25 rounded-full blur-3xl animate-pulse delay-700" />
    </div>
  )
}

// Grid pattern overlay
function GridPattern() {
  return (
    <div 
      className="absolute inset-0 opacity-[0.03]"
      style={{
        backgroundImage: `linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)`,
        backgroundSize: '50px 50px'
      }}
    />
  )
}

// Futuristic loading spinner
function FuturisticSpinner({ size = 'default' }) {
  const sizeClasses = size === 'large' ? 'w-8 h-8' : 'w-5 h-5'
  return (
    <div className="flex items-center justify-center gap-2">
      <div className={`relative ${sizeClasses}`}>
        <div className="absolute inset-0 border-2 border-transparent border-t-white rounded-full animate-spin" />
        <div className="absolute inset-1 border-2 border-transparent border-t-white/50 rounded-full animate-spin animation-delay-150" style={{ animationDirection: 'reverse' }} />
      </div>
    </div>
  )
}

// Google Icon
function GoogleIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  )
}

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { t } = useI18n()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [googleReady, setGoogleReady] = useState(false)

  // Google Client ID from env
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID

  // Check if Google script is already loaded (e.g., after logout)
  useEffect(() => {
    if (window.google?.accounts?.oauth2) {
      setGoogleReady(true)
    }
  }, [])

  // Handle Google Sign-In callback - accepts either credential response or user object
  const handleCredentialResponse = useCallback(async (response) => {
    setError("")
    setIsSubmitting(true)

    try {
      let user = response.user
      
      // If we got a credential (from One Tap), call API to verify
      if (response.credential && !user) {
        console.log("📤 Verifying Google credential...")
        
        const res = await fetch('/api/auth/google', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ credential: response.credential })
        })
        
        const result = await res.json()
        console.log("📥 Google auth result:", result)

        if (!res.ok || !result.success) {
          console.log("❌ Login failed:", result.message || result.error)
          setError(result.message || 'Login gagal. Silakan coba lagi.')
          setIsSubmitting(false)
          return
        }
        
        user = result.user
      }
      
      if (!user) {
        setError('Login gagal. Silakan coba lagi.')
        setIsSubmitting(false)
        return
      }

      console.log("✅ Google login successful")
      
      // Save to localStorage
      localStorage.setItem("kr_id", user.userID)
      localStorage.setItem("user_role", user.roleName)
      localStorage.setItem("user_data", JSON.stringify(user))

        // Mint JWT for RLS
        try {
          const tokenRes = await fetch('/api/auth/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              user_id: user.userID, 
              role: user.roleName, 
              kr_id: user.userID 
            })
          })
          const tokenJson = await tokenRes.json()
          if (tokenRes.ok && tokenJson.token) {
            localStorage.setItem('app_jwt', tokenJson.token)
            setAuthToken(tokenJson.token)
          }
        } catch (e) {
          console.warn('JWT mint error', e)
        }

        // Fetch allowed menu paths
        let allowedPaths = []
        try {
          const menusRes = await customAuth.getMenusByRole(user.roleName, !!user.isAdmin)
          if (menusRes?.success) {
            const normalize = (p) => {
              if (!p) return ''
              let s = String(p).trim()
              if (!s.startsWith('/')) s = '/' + s
              if (s.length > 1 && s.endsWith('/')) s = s.slice(0, -1)
              return s
            }
            const defaults = ['/dashboard', '/profile']
            const raw = (menusRes.menus || []).map(m => m.menu_path).filter(Boolean)
            const counselorExtra = user.isCounselor ? ['/data/consultation'] : []
            const teacherExtra = user.isTeacher ? ['/teacher', '/teacher/assessment_submission', '/teacher/nilai', '/room', '/room/booking'] : []
            const studentExtra = user.isStudent ? ['/student', '/student/scan'] : []
            const merged = Array.from(new Set([
              ...raw.map(normalize),
              ...defaults.map(normalize),
              ...counselorExtra.map(normalize),
              ...teacherExtra.map(normalize),
              ...studentExtra.map(normalize)
            ]))
            allowedPaths = merged
          }
        } catch (e) {
          console.warn('Failed to fetch allowed menus', e)
        }

        // Set cookies for middleware
        const maxAge = 60 * 60 * 8 // 8 hours
        const safeJoin = encodeURIComponent((allowedPaths || []).join('|'))
        document.cookie = `kr_id=${user.userID}; Path=/; Max-Age=${maxAge}; SameSite=Lax`
        document.cookie = `role_name=${encodeURIComponent(user.roleName || '')}; Path=/; Max-Age=${maxAge}; SameSite=Lax`
        document.cookie = `is_admin=${user.isAdmin ? '1' : '0'}; Path=/; Max-Age=${maxAge}; SameSite=Lax`
        document.cookie = `allowed_paths=${safeJoin}; Path=/; Max-Age=${maxAge}; SameSite=Lax`
        
        console.log('🚀 Redirecting to dashboard...')
        router.push("/dashboard")
    } catch (err) {
      console.error("❌ Login error:", err)
      setError('Terjadi kesalahan saat login. Silakan coba lagi.')
    } finally {
      setIsSubmitting(false)
    }
  }, [router])

  // Check for error from URL params
  useEffect(() => {
    const errorType = searchParams.get('error')
    const email = searchParams.get('email')
    
    if (errorType === 'EmailNotFound') {
      setError(`Email ${email ? `(${decodeURIComponent(email)}) ` : ''}tidak terdaftar di sistem. Silakan hubungi administrator.`)
    } else if (errorType === 'UserInactive') {
      setError(`Akun dengan email ${email ? `(${decodeURIComponent(email)}) ` : ''}tidak aktif. Silakan hubungi administrator.`)
    } else if (errorType === 'DomainNotAllowed') {
      setError('Hanya email dengan domain @ccs.sch.id yang diizinkan.')
    }
  }, [searchParams])

  // Check if already logged in via localStorage
  useEffect(() => {
    const kr_id = localStorage.getItem("kr_id")
    if (kr_id) {
      router.replace("/dashboard")
    } else {
      setLoading(false)
    }
  }, [router])

  // Initialize Google Sign-In with OAuth2 Token (implicit) flow - no client secret needed
  useEffect(() => {
    if (googleReady && googleClientId && window.google) {
      // Use Token Client (implicit flow) - works for internal apps without client secret
      window.googleTokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: googleClientId,
        scope: 'email profile',
        callback: async (tokenResponse) => {
          if (tokenResponse.access_token) {
            // Get user info with the access token
            try {
              const res = await fetch('/api/auth/google', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ access_token: tokenResponse.access_token })
              })
              const result = await res.json()
              if (res.ok && result.success) {
                await handleCredentialResponse({ credential: null, user: result.user })
              } else {
                setError(result.message || 'Login gagal')
                setIsSubmitting(false)
              }
            } catch (err) {
              console.error('Auth error:', err)
              setError('Terjadi kesalahan saat login')
              setIsSubmitting(false)
            }
          } else {
            setIsSubmitting(false)
          }
        },
        error_callback: (error) => {
          console.error('Google OAuth error:', error)
          setError('Gagal login dengan Google')
          setIsSubmitting(false)
        }
      })
    }
  }, [googleReady, googleClientId, handleCredentialResponse])

  const handleGoogleLogin = () => {
    if (window.googleTokenClient) {
      setError("")
      setIsSubmitting(true)
      window.googleTokenClient.requestAccessToken()
    } else {
      setError('Google Sign-In belum siap. Silakan refresh halaman.')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="flex flex-col items-center gap-4">
          <FuturisticSpinner size="large" />
          <p className="text-white/70 text-sm">{t('login.loading')}</p>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Load Google Identity Services */}
      <Script 
        src="https://accounts.google.com/gsi/client" 
        onLoad={() => setGoogleReady(true)}
        strategy="afterInteractive"
      />

      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-sky-900/40 to-slate-900 px-4 relative overflow-hidden">
      {/* Background Effects */}
      <FloatingOrbs />
      <GridPattern />
      
      {/* Main Card */}
      <div className="w-full max-w-md relative z-10">
        {/* Large Logo Overlay Behind Card */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="relative w-80 h-80 opacity-[0.08]">
            <Image
              src="/images/login-logo.jpg"
              alt=""
              fill
              className="object-contain rounded-full"
              priority
            />
          </div>
        </div>
        
        {/* Glow effect behind card */}
        <div className="absolute -inset-1 bg-gradient-to-r from-sky-500 via-cyan-400 to-blue-500 rounded-2xl blur-xl opacity-30 animate-pulse" />
        
        {/* Glassmorphism Card */}
        <div className="relative backdrop-blur-xl bg-slate-900/80 border border-white/20 rounded-2xl shadow-2xl overflow-hidden">
          {/* Top gradient line */}
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-sky-400 to-transparent" />
          
          {/* Header */}
          <div className="pt-10 pb-8 px-8 text-center">
            {/* Logo */}
            <div className="flex justify-center mb-8">
              <div className="relative">
                <div className="absolute -inset-3 bg-gradient-to-r from-sky-400 to-cyan-400 rounded-full blur-lg opacity-40" />
                <Image
                  src="/images/login-logo.jpg"
                  alt="School Logo"
                  width={96}
                  height={96}
                  className="relative rounded-full ring-2 ring-white/40 shadow-lg"
                  priority
                />
              </div>
            </div>
            
            {/* Title */}
            <h1 className="text-2xl font-bold text-white mb-2 tracking-tight">
              {t('login.title')}
            </h1>
            <p className="text-sm text-white/60">
              {t('login.subtitle')}
            </p>
          </div>

          {/* Content */}
          <div className="px-8 pb-10">
            {/* Error Alert */}
            {error && (
              <div className="mb-6 p-4 bg-red-500/20 backdrop-blur-sm border border-red-500/30 rounded-xl">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center mt-0.5">
                    <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <p className="text-red-200 text-sm">{error}</p>
                </div>
              </div>
            )}

            {/* Hidden div for Google button fallback */}
            <div id="google-signin-button" className="hidden" />

            {/* Google Login Button */}
            <Button 
              type="button"
              onClick={handleGoogleLogin}
              disabled={isSubmitting || !googleReady} 
              className="w-full h-14 bg-white hover:bg-gray-100 text-gray-800 font-semibold rounded-xl shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 border-0"
            >
              {isSubmitting ? (
                <div className="flex items-center justify-center gap-3">
                  <div className="relative w-5 h-5">
                    <div className="absolute inset-0 border-2 border-transparent border-t-gray-600 rounded-full animate-spin" />
                  </div>
                  <span className="text-gray-600">{t('login.processing')}</span>
                </div>
              ) : !googleReady ? (
                <div className="flex items-center justify-center gap-3">
                  <div className="relative w-5 h-5">
                    <div className="absolute inset-0 border-2 border-transparent border-t-gray-600 rounded-full animate-spin" />
                  </div>
                  <span className="text-gray-600">{t('login.loading')}</span>
                </div>
              ) : (
                <span className="flex items-center justify-center gap-3">
                  <GoogleIcon />
                  <span>{t('login.googleSignIn')}</span>
                </span>
              )}
            </Button>

            {/* Info Text */}
            <p className="mt-6 text-center text-white/40 text-xs">
              {t('login.useGoogleAccount')}
            </p>
          </div>
          
          {/* Bottom gradient line */}
          <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-cyan-400 to-transparent" />
        </div>
      </div>

      {/* CSS for custom animations */}
      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.05); }
        }
        .animate-pulse {
          animation: pulse 4s ease-in-out infinite;
        }
        .delay-500 {
          animation-delay: 0.5s;
        }
        .delay-700 {
          animation-delay: 0.7s;
        }
        .delay-1000 {
          animation-delay: 1s;
        }
      `}</style>
    </div>
    </>
  )
}

export default function Login() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="flex flex-col items-center gap-4">
          <FuturisticSpinner size="large" />
          <p className="text-white/70 text-sm">Loading...</p>
        </div>
      </div>
    }>
      <LoginContent />
    </Suspense>
  )
}
