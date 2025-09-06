// Lightweight JWT issuer and client helper.
import jwt from 'jsonwebtoken'

// Sign a JWT with custom claims required by RLS.
export function signAppJwt(payload, options = {}) {
  const secret = process.env.SUPABASE_JWT_SECRET || process.env.NEXT_PUBLIC_SUPABASE_JWT_SECRET
  if (!secret) {
    throw new Error('Missing SUPABASE_JWT_SECRET. Set it in your env to enable RLS auth.')
  }
  const now = Math.floor(Date.now() / 1000)
  const base = {
    iat: now,
    nbf: now,
    exp: now + (options.expiresInSec ?? 60 * 60 * 8), // 8h default
  // Supabase expects 'role' to be 'authenticated' for RLS
  role: 'authenticated',
  }
  return jwt.sign({ ...base, ...payload }, secret, { algorithm: 'HS256' })
}

// Build the Authorization header for fetch/Supabase.
export function bearerHeaders(token) {
  return token ? { Authorization: `Bearer ${token}` } : {}
}
