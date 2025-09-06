import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

// Protect server-side for direct URL hits and prevent flashes
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Only guard app sections under these prefixes
  const protectedPrefixes = ['/data', '/settings', '/teacher', '/student', '/room']
  const isProtected = protectedPrefixes.some(p => pathname === p || pathname.startsWith(p + '/'))
  if (!isProtected) return NextResponse.next()

  const krId = req.cookies.get('kr_id')?.value
  if (!krId) {
    const url = req.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  const isAdmin = req.cookies.get('is_admin')?.value === '1'
  if (isAdmin) return NextResponse.next()

  // Normalize helper
  const normalize = (p: string) => {
    if (!p) return ''
    let s = String(p).trim()
    if (!s.startsWith('/')) s = '/' + s
    if (s.length > 1 && s.endsWith('/')) s = s.slice(0, -1)
    return s
  }

  const allowed = decodeURIComponent(req.cookies.get('allowed_paths')?.value || '')
  const defaults = ['/dashboard', '/profile']
  const allowedPaths = Array.from(new Set([
    ...defaults.map(normalize),
    ...((allowed ? allowed.split('|').filter(Boolean) : []).map(normalize))
  ]))

  const np = normalize(pathname)
  const hasAccess = allowedPaths.some(p => np === p || (p && p !== '/' && np.startsWith(p + '/')))
  if (hasAccess) return NextResponse.next()

  const url = req.nextUrl.clone()
  url.pathname = '/dashboard'
  url.searchParams.set('forbidden', '1')
  return NextResponse.redirect(url)
}

export const config = {
  matcher: ['/data/:path*', '/settings/:path*', '/teacher/:path*', '/student/:path*', '/room/:path*']
}
