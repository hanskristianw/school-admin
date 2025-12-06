import { NextResponse } from 'next/server'

// Google OAuth2 token endpoint
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'

// Exchange authorization code for tokens OR refresh access token
export async function POST(req) {
  try {
    const { code, refresh_token, redirect_uri } = await req.json()
    
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET
    
    if (!clientId || !clientSecret) {
      console.error('Missing GOOGLE_CLIENT_SECRET or NEXT_PUBLIC_GOOGLE_CLIENT_ID')
      return NextResponse.json({ 
        error: 'Server not configured for OAuth', 
        details: 'Missing client credentials'
      }, { status: 500 })
    }

    let tokenData

    // Case 1: Exchange authorization code for tokens
    if (code) {
      console.log('🔐 Exchanging authorization code for tokens...')
      
      const response = await fetch(GOOGLE_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirect_uri || `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/google/callback`,
          grant_type: 'authorization_code'
        })
      })

      tokenData = await response.json()

      if (!response.ok) {
        console.error('Token exchange error:', tokenData)
        return NextResponse.json({ 
          error: 'Failed to exchange code',
          details: tokenData.error_description || tokenData.error
        }, { status: 400 })
      }

      console.log('✅ Token exchange successful, has refresh_token:', !!tokenData.refresh_token)
    }
    // Case 2: Refresh access token using refresh_token
    else if (refresh_token) {
      console.log('🔄 Refreshing access token...')
      
      const response = await fetch(GOOGLE_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          refresh_token,
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: 'refresh_token'
        })
      })

      tokenData = await response.json()

      if (!response.ok) {
        console.error('Token refresh error:', tokenData)
        // If refresh token is invalid, user needs to re-authenticate
        if (tokenData.error === 'invalid_grant') {
          return NextResponse.json({ 
            error: 'RefreshTokenExpired',
            needsReauth: true,
            details: 'Refresh token has expired or been revoked'
          }, { status: 401 })
        }
        return NextResponse.json({ 
          error: 'Failed to refresh token',
          details: tokenData.error_description || tokenData.error
        }, { status: 400 })
      }

      console.log('✅ Token refresh successful')
    }
    else {
      return NextResponse.json({ 
        error: 'Missing code or refresh_token' 
      }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token, // Only present on initial code exchange
      expires_in: tokenData.expires_in, // Usually 3600 (1 hour)
      token_type: tokenData.token_type
    })

  } catch (error) {
    console.error('Google token error:', error)
    return NextResponse.json({ error: error.message || 'Token operation failed' }, { status: 500 })
  }
}
