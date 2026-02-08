'use client'

import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Image from "next/image"
import Script from "next/script"
import { customAuth, setAuthToken } from "@/lib/supabase"
import { Button } from '@/components/ui/button'
import { useI18n } from '@/lib/i18n'

// Animated background orbs component - iOS style
function FloatingOrbs() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse" />
      <div className="absolute top-3/4 -right-20 w-80 h-80 bg-purple-500/15 rounded-full blur-3xl animate-pulse delay-1000" />
      <div className="absolute -top-20 right-1/4 w-72 h-72 bg-pink-500/15 rounded-full blur-3xl animate-pulse delay-500" />
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
  const [showAdmission, setShowAdmission] = useState(false)

  // Google Client ID from env
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID

  // Check if Google script is already loaded (e.g., after logout)
  useEffect(() => {
    if (typeof window !== 'undefined' && window.google?.accounts?.oauth2) {
      setGoogleReady(true)
    }
  }, [])

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

  // Helper function to complete login after getting access token
  const completeLogin = async (access_token, refresh_token, expires_in) => {
    // Save Google tokens to localStorage
    localStorage.setItem('google_access_token', access_token)
    if (refresh_token) {
      localStorage.setItem('google_refresh_token', refresh_token)
    }
    // Save token expiry time (current time + expires_in seconds - 5 min buffer)
    const expiresAt = Date.now() + ((expires_in || 3600) - 300) * 1000
    localStorage.setItem('google_token_expires_at', expiresAt.toString())
    console.log('🔐 Google tokens saved to localStorage')
    
    // Get user info with the access token
    try {
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ access_token })
      })
      const result = await res.json()
      if (res.ok && result.success) {
        // Process login directly here instead of calling handleCredentialResponse
        const user = result.user
        
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
        return true
      } else {
        setError(result.message || 'Login gagal')
        setIsSubmitting(false)
        return false
      }
    } catch (err) {
      console.error('Auth error:', err)
      setError('Terjadi kesalahan saat login')
      setIsSubmitting(false)
      return false
    }
  }

  // Initialize Google Sign-In with OAuth2 Code flow - provides refresh_token for long-term access
  useEffect(() => {
    if (!googleReady || !googleClientId || typeof window === 'undefined' || !window.google) {
      return
    }
    
    // Use Code Client (authorization code flow) - provides refresh_token
    // Include calendar scope for Google Calendar integration
    window.googleCodeClient = window.google.accounts.oauth2.initCodeClient({
      client_id: googleClientId,
      scope: 'email profile https://www.googleapis.com/auth/calendar.readonly',
      ux_mode: 'popup',
      callback: async (codeResponse) => {
        console.log('🔐 Google OAuth code callback:', codeResponse.code ? 'Code received' : 'No code')
        if (codeResponse.code) {
          try {
            // Exchange authorization code for tokens (including refresh_token)
            const tokenRes = await fetch('/api/auth/google/token', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                code: codeResponse.code,
                redirect_uri: window.location.origin
              })
            })
            const tokenData = await tokenRes.json()
            
            if (!tokenRes.ok || !tokenData.access_token) {
              console.error('Token exchange failed:', tokenData)
              setError(tokenData.details || 'Gagal mendapatkan token')
              setIsSubmitting(false)
              return
            }
            
            console.log('✅ Token exchange successful, has refresh_token:', !!tokenData.refresh_token)
            
            // Complete the login process
            await completeLogin(tokenData.access_token, tokenData.refresh_token, tokenData.expires_in)
          } catch (err) {
            console.error('Token exchange error:', err)
            setError('Terjadi kesalahan saat login')
            setIsSubmitting(false)
          }
        } else {
          setIsSubmitting(false)
        }
      },
      error_callback: (err) => {
        console.error('Google OAuth error:', err)
        setError('Gagal login dengan Google')
        setIsSubmitting(false)
      }
    })
  }, [googleReady, googleClientId, router])

  const handleGoogleLogin = () => {
    if (window.googleCodeClient) {
      setError("")
      setIsSubmitting(true)
      window.googleCodeClient.requestCode()
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

      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-white via-blue-50 to-purple-50 px-4 py-8 relative overflow-y-auto">
      {/* Background Effects */}
      <FloatingOrbs />
      
      {/* Main Card */}
      <div className="w-full max-w-md relative z-10">
        
        {/* iOS-style Frosted Glass Card */}
        <div className="relative backdrop-blur-2xl bg-white/70 border border-white/40 rounded-[2.5rem] shadow-2xl overflow-hidden">
          {/* Subtle top shimmer */}
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent" />
          
          {/* Header */}
          <div className="pt-8 pb-6 px-8 text-center">
            {/* Logo */}
            <div className="flex justify-center mb-6">
              <div className="relative">
                {/* Soft shadow */}
                <div className="absolute -inset-2 bg-gradient-to-br from-blue-100/50 to-purple-100/50 rounded-3xl blur-xl" />
                {/* White background for logo - iOS style */}
                <div className="relative bg-white rounded-3xl p-5 shadow-lg ring-1 ring-black/5">
                  <Image
                    src="/images/login-logo.png"
                    alt="School Logo"
                    width={140}
                    height={70}
                    style={{ width: 'auto', height: 'auto' }}
                    className="object-contain"
                    priority
                  />
                </div>
              </div>
            </div>
            
            {/* Title - iOS style typography */}
            <h1 className="text-2xl font-semibold text-gray-900 mb-1 tracking-tight">
              {t('login.title')}
            </h1>
            <p className="text-sm text-gray-500 font-normal">
              {t('login.subtitle')}
            </p>
          </div>

          {/* Content */}
          <div className="px-8 pb-8">
            {/* Error Alert - iOS style */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-2xl">
                <div className="flex items-start gap-2">
                  <div className="flex-shrink-0 w-4 h-4 flex items-center justify-center mt-0.5">
                    <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <p className="text-red-700 text-xs font-medium">{error}</p>
                </div>
              </div>
            )}

            {/* Hidden div for Google button fallback */}
            <div id="google-signin-button" className="hidden" />

            {/* Google Login Button - iOS style */}
            <Button 
              type="button"
              onClick={handleGoogleLogin}
              disabled={isSubmitting || !googleReady} 
              className="w-full h-12 bg-white hover:bg-gray-50 text-gray-900 font-semibold rounded-2xl shadow-lg transition-all duration-200 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 border border-gray-200/50"
            >
              {isSubmitting ? (
                <div className="flex items-center justify-center gap-3">
                  <div className="relative w-5 h-5">
                    <div className="absolute inset-0 border-2 border-transparent border-t-blue-500 rounded-full animate-spin" />
                  </div>
                  <span className="text-gray-700">{t('login.processing')}</span>
                </div>
              ) : !googleReady ? (
                <div className="flex items-center justify-center gap-3">
                  <div className="relative w-5 h-5">
                    <div className="absolute inset-0 border-2 border-transparent border-t-blue-500 rounded-full animate-spin" />
                  </div>
                  <span className="text-gray-700">{t('login.loading')}</span>
                </div>
              ) : (
                <span className="flex items-center justify-center gap-3">
                  <GoogleIcon />
                  <span>{t('login.googleSignIn')}</span>
                </span>
              )}
            </Button>

            {/* Info Text */}
            <p className="mt-3 text-center text-gray-400 text-xs">
              {t('login.useGoogleAccount')}
            </p>

            {/* Divider - iOS style */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-white/70 backdrop-blur-sm px-3 text-gray-500 font-medium">{t('login.orRegister') || 'atau'}</span>
              </div>
            </div>

            {/* Collapsible Admission Section */}
            <div className="space-y-2">
              {/* Toggle Button */}
              <button
                type="button"
                onClick={() => setShowAdmission(!showAdmission)}
                className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-xl transition-all duration-200 border border-gray-200"
              >
                <span className="text-sm font-medium text-gray-700">
                  {t('login.newStudentRegistration')}
                </span>
                <svg
                  className={`w-4 h-4 text-gray-600 transition-transform duration-200 ${showAdmission ? 'rotate-180' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Dropdown Content */}
              {showAdmission && (
                <div className="space-y-2 pt-1 animate-fadeIn">
                  <Button 
                    type="button"
                    onClick={() => router.push('/admission')}
                    variant="outline"
                    className="w-full h-11 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white border-0 font-semibold rounded-xl transition-all duration-200 hover:shadow-lg active:scale-95 text-sm"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                    </svg>
                    {t('login.registerNewStudent') || 'Daftar Siswa Baru'}
                  </Button>

                  <Button 
                    type="button"
                    onClick={() => router.push('/admission/status')}
                    variant="outline"
                    className="w-full h-11 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white border-0 font-semibold rounded-xl transition-all duration-200 hover:shadow-lg active:scale-95 text-sm"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                    </svg>
                    {t('login.checkStatus') || 'Cek Status'}
                  </Button>

                  {/* Footer text */}
                  <p className="text-center text-gray-400 text-xs pt-1">
                    {t('login.registerHint') || 'Pendaftaran untuk calon siswa baru'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* CSS for custom animations */}
      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.15; transform: scale(1); }
          50% { opacity: 0.25; transform: scale(1.03); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-pulse {
          animation: pulse 4s ease-in-out infinite;
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
        .delay-500 {
          animation-delay: 0.5s;
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
