import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const SETTINGS_KEY = 'court_rental_markom_recipients'

// GET: Ambil daftar penerima notifikasi Markom dan daftar pengguna staf aktif
export async function GET() {
  try {
    // 1. Ambil setting penerima notifikasi dari tabel settings
    const { data: settingRow, error: settingErr } = await supabaseAdmin
      .from('settings')
      .select('value')
      .eq('key', SETTINGS_KEY)
      .maybeSingle()

    let recipients = []
    if (!settingErr && settingRow?.value) {
      try {
        recipients = typeof settingRow.value === 'string'
          ? JSON.parse(settingRow.value)
          : settingRow.value
      } catch (e) {
        recipients = []
      }
    }

    // 2. Ambil daftar user staf/guru/admin aktif yang memiliki email
    const { data: users, error: usersErr } = await supabaseAdmin
      .from('users')
      .select(`
        user_id,
        user_nama_depan,
        user_nama_belakang,
        user_email,
        role:user_role_id(role_id, role_name, is_student)
      `)
      .eq('is_active', true)
      .not('user_email', 'is', null)
      .neq('user_email', '')
      .order('user_nama_depan', { ascending: true })

    if (usersErr) {
      console.warn('[Markom Settings API] Failed to fetch users:', usersErr.message)
    }

    // Filter keluar student (hanya staf, guru, dan admin)
    const staffUsers = (users || []).filter(u => !u.role?.is_student)

    return NextResponse.json({
      success: true,
      recipients: Array.isArray(recipients) ? recipients : [],
      users: staffUsers
    })
  } catch (err) {
    console.error('[Markom Settings API] Unexpected error in GET:', err)
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 }
    )
  }
}

// POST: Simpan daftar penerima notifikasi Markom ke tabel settings
export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}))
    const { recipients = [] } = body

    if (!Array.isArray(recipients)) {
      return NextResponse.json(
        { success: false, message: 'Format recipients harus berupa array' },
        { status: 400 }
      )
    }

    // Bersihkan & validasi data penerima
    const cleanRecipients = recipients.map(r => ({
      user_id: r.user_id,
      user_nama_depan: r.user_nama_depan || '',
      user_nama_belakang: r.user_nama_belakang || '',
      user_email: String(r.user_email || '').trim().toLowerCase(),
      role_name: r.role_name || 'Staff',
      notify_email: r.notify_email !== false,
      notify_google_chat: r.notify_google_chat !== false,
      is_active: r.is_active !== false
    }))

    const payload = {
      key: SETTINGS_KEY,
      value: JSON.stringify(cleanRecipients),
      description: 'Daftar staf/Markom penerima notifikasi email & Google Chat saat ada pesanan sewa lapangan baru',
      updated_at: new Date().toISOString()
    }

    const { error: upsertErr } = await supabaseAdmin
      .from('settings')
      .upsert(payload, { onConflict: 'key' })

    if (upsertErr) {
      return NextResponse.json(
        { success: false, message: `Gagal menyimpan pengaturan: ${upsertErr.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Pengaturan penerima notifikasi Markom berhasil disimpan.',
      recipients: cleanRecipients
    })
  } catch (err) {
    console.error('[Markom Settings API] Unexpected error in POST:', err)
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 }
    )
  }
}
