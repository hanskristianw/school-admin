import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const admin = (url && serviceKey) 
  ? createClient(url, serviceKey, { 
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false } 
    }) 
  : null

// Allowed domain for internal organization
const ALLOWED_DOMAIN = 'ccs.sch.id'

// Helper function to get user info from access token
async function getUserInfoFromAccessToken(accessToken) {
  const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!response.ok) {
    throw new Error('Failed to get user info from Google')
  }

  return await response.json()
}

// Helper function to decode JWT credential
function decodeCredential(credential) {
  const parts = credential.split('.')
  if (parts.length !== 3) {
    throw new Error('Invalid token format')
  }
  return JSON.parse(
    Buffer.from(parts[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString()
  )
}

export async function POST(req) {
  try {
    if (!admin) {
      return NextResponse.json({ error: 'Server not configured' }, { status: 500 })
    }

    const body = await req.json()
    const { credential, access_token } = body
    
    let email, name, picture, hd, email_verified

    // Handle access token (from implicit/token flow)
    if (access_token) {
      try {
        const userInfo = await getUserInfoFromAccessToken(access_token)
        console.log('Google userInfo:', userInfo)
        email = userInfo.email
        name = userInfo.name
        picture = userInfo.picture
        hd = userInfo.hd
        email_verified = userInfo.verified_email
      } catch (err) {
        console.error('Access token error:', err)
        return NextResponse.json({ error: 'Failed to verify access token' }, { status: 400 })
      }
    }
    // Handle JWT credential (from One Tap)
    else if (credential) {
      try {
        const payload = decodeCredential(credential)
        email = payload.email
        name = payload.name
        picture = payload.picture
        hd = payload.hd
        email_verified = payload.email_verified
      } catch (err) {
        return NextResponse.json({ error: 'Invalid credential' }, { status: 400 })
      }
    }
    else {
      return NextResponse.json({ error: 'No credential or access_token provided' }, { status: 400 })
    }

    // Verify email is from allowed domain
    if (!hd || hd !== ALLOWED_DOMAIN) {
      console.log('❌ Domain not allowed:', hd, 'email:', email)
      return NextResponse.json({ 
        success: false, 
        error: 'DomainNotAllowed',
        message: `Hanya email dengan domain @${ALLOWED_DOMAIN} yang diizinkan` 
      }, { status: 403 })
    }

    if (!email_verified) {
      return NextResponse.json({ 
        success: false, 
        error: 'EmailNotVerified',
        message: 'Email belum diverifikasi' 
      }, { status: 403 })
    }

    // Search for user by email in database
    const { data: dbUser, error: userError } = await admin
      .from('users')
      .select(`
        user_id, 
        user_nama_depan, 
        user_nama_belakang, 
        user_role_id, 
        user_unit_id, 
        is_active,
        user_email,
        user_profile_picture
      `)
      .ilike('user_email', email)
      .single()

    if (userError || !dbUser) {
      console.log('❌ Email not found in database:', email)
      return NextResponse.json({ 
        success: false, 
        error: 'EmailNotFound',
        message: `Email (${email}) tidak terdaftar di sistem. Silakan hubungi administrator.` 
      }, { status: 404 })
    }

    if (!dbUser.is_active) {
      console.log('❌ User is not active:', email)
      return NextResponse.json({ 
        success: false, 
        error: 'UserInactive',
        message: `Akun dengan email (${email}) tidak aktif. Silakan hubungi administrator.` 
      }, { status: 403 })
    }

    // Fetch role & unit info
    const [{ data: role }, { data: unit }] = await Promise.all([
      admin.from('role').select('role_id, role_name, is_admin, is_counselor, is_teacher, is_student, is_principal, can_void_transactions').eq('role_id', dbUser.user_role_id).single(),
      dbUser.user_unit_id ? admin.from('unit').select('unit_id, unit_name').eq('unit_id', dbUser.user_unit_id).single() : Promise.resolve({ data: null })
    ])

    // Always use Google profile picture if available (it's more up-to-date)
    // Google picture URL from userinfo API is in format: https://lh3.googleusercontent.com/...
    let finalProfilePicture = picture || dbUser.user_profile_picture
    
    console.log('📷 Profile picture from DB:', dbUser.user_profile_picture)
    console.log('📷 Profile picture from Google:', picture)
    
    // Update database with Google picture
    if (picture && picture !== dbUser.user_profile_picture) {
      const { error: updateError } = await admin
        .from('users')
        .update({ user_profile_picture: picture })
        .eq('user_id', dbUser.user_id)
      
      if (updateError) {
        console.warn('Failed to update profile picture:', updateError)
      } else {
        console.log('✅ Profile picture updated from Google')
      }
    }

    console.log('✅ Google login successful for:', email)
    console.log('📷 Final profile picture:', finalProfilePicture)

    return NextResponse.json({
      success: true,
      user: {
        userID: dbUser.user_id,
        username: dbUser.user_nama_depan,
        namaDepan: dbUser.user_nama_depan,
        namaBelakang: dbUser.user_nama_belakang,
        roleID: dbUser.user_role_id,
        roleName: role?.role_name || '',
        isAdmin: role?.is_admin || false,
        isCounselor: role?.is_counselor || false,
        isTeacher: role?.is_teacher || false,
        isStudent: role?.is_student || false,
        isPrincipal: role?.is_principal || false,
        canVoidTransactions: role?.can_void_transactions || false,
        unitID: dbUser.user_unit_id,
        unitName: unit?.unit_name || '',
        email: email,
        profilePicture: finalProfilePicture
      }
    })

  } catch (error) {
    console.error('Google auth error:', error)
    return NextResponse.json({ error: error.message || 'Authentication failed' }, { status: 500 })
  }
}
