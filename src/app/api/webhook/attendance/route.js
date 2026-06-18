import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// ─── Supabase Admin Client ─────────────────────────────────────────────────
// Menggunakan service role agar bisa bypass RLS dan query tabel users.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY

const admin = supabaseUrl && serviceKey
  ? createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false }
    })
  : null

// ─── Handler ──────────────────────────────────────────────────────────────
export async function POST(req) {
  // 1. Pastikan admin client terkonfigurasi
  if (!admin) {
    console.error('[webhook/attendance] Supabase admin client not configured.')
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
  }

  // 2. Validasi Bearer Token (proteksi dari request iseng)
  const webhookSecret = process.env.ATTENDANCE_WEBHOOK_SECRET
  if (!webhookSecret) {
    console.error('[webhook/attendance] ATTENDANCE_WEBHOOK_SECRET env var not set.')
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
  }

  const authHeader = req.headers.get('authorization') ?? ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
  if (token !== webhookSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 3. Parse body JSON
  let body
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  // 4. Validasi struktur payload
  // Contoh yang diharapkan:
  // { "type": "attlog", "cloud_id": "...", "data": { "pin": "123", "scan": "2026-06-18 07:30:00", "status_scan": "0" } }
  const pin        = body?.data?.pin
  const scanRaw    = body?.data?.scan
  const statusScan = body?.data?.status_scan ?? null

  if (!pin || !scanRaw) {
    return NextResponse.json({ error: 'Missing required fields: data.pin, data.scan' }, { status: 400 })
  }

  // 5. Parse scan_time: format dari mesin adalah "YYYY-MM-DD HH:mm:ss" tanpa timezone.
  //    Paksa offset +07:00 (WIB) sebelum disimpan ke TIMESTAMPTZ.
  //    Contoh: "2026-06-18 07:30:00" → "2026-06-18T07:30:00+07:00"
  const scanTimeISO = scanRaw.trim().replace(' ', 'T') + '+07:00'
  const scanTimeParsed = new Date(scanTimeISO)
  if (isNaN(scanTimeParsed.getTime())) {
    return NextResponse.json({ error: `Invalid scan time format: "${scanRaw}"` }, { status: 400 })
  }

  // 6. Cari user berdasarkan PIN di tabel users
  const { data: userRows, error: userError } = await admin
    .from('users')
    .select('user_id')
    .eq('user_pin', String(pin).trim())
    .limit(1)

  if (userError) {
    console.error('[webhook/attendance] Error looking up user by pin:', userError)
    return NextResponse.json({ error: 'Database error while looking up user' }, { status: 500 })
  }

  if (!userRows || userRows.length === 0) {
    return NextResponse.json(
      { error: `Employee with PIN "${pin}" is not registered` },
      { status: 404 }
    )
  }

  const userId = userRows[0].user_id

  // 7. Insert ke tabel attendances
  const { error: insertError } = await admin
    .from('attendances')
    .insert({
      user_id:     userId,
      scan_time:   scanTimeParsed.toISOString(),
      status_scan: statusScan !== null ? String(statusScan) : null,
      raw_payload: body,
    })

  if (insertError) {
    // Error code 23505 = unique_violation (PostgreSQL)
    // Terjadi saat mesin retry karena koneksi terputus sebelum menerima 200 OK.
    // Abaikan saja — data sudah tercatat sebelumnya.
    if (insertError.code === '23505') {
      return NextResponse.json({ success: true, note: 'duplicate_ignored' })
    }

    console.error('[webhook/attendance] Insert error:', insertError)
    return NextResponse.json({ error: 'Failed to save attendance record' }, { status: 500 })
  }

  // 8. Sukses
  return NextResponse.json({ success: true })
}
