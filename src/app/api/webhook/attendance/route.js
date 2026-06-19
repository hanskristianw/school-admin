import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// ─── Supabase Admin Client ─────────────────────────────────────────────────
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY

const admin = supabaseUrl && serviceKey
  ? createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false }
    })
  : null

// ─── Parse berbagai format payload dari mesin absensi ─────────────────────
// Mendukung:
//   Format A (custom JSON): { "type":"attlog", "data": { "pin":"155", "scan":"2026-06-19 08:30:00", "status_scan":"0" } }
//   Format B (ZKTeco array): { "sn":"xxx", "table":"attlog", "data": [ { "pin":"155", "time":"2026-06-19 08:30:00", "status":"0" } ] }
//   Format C (ZKTeco string): { "sn":"xxx", "table":"attlog", "data": "155\t2026-06-19 08:30:00\t0\t0\t\t0" }
//   Format D (flat): { "pin":"155", "scan":"2026-06-19 08:30:00", "status_scan":"0" }
function parsePayload(body) {
  const results = []

  // Format A — data adalah object tunggal dengan key "pin" dan "scan"
  if (body?.data && !Array.isArray(body.data) && typeof body.data === 'object') {
    const d = body.data
    const pin  = d.pin  ?? d.user_id ?? d.userid ?? d.emp_id
    const scan = d.scan ?? d.time    ?? d.datetime ?? d.check_time ?? d.scan_time
    const stat = d.status_scan ?? d.status ?? d.verify_type ?? '0'
    if (pin && scan) return [{ pin: String(pin).trim(), scan: String(scan).trim(), status: String(stat) }]
  }

  // Format B — data adalah array of objects (ZKTeco multi-record)
  if (Array.isArray(body?.data)) {
    for (const d of body.data) {
      const pin  = d.pin  ?? d.user_id ?? d.userid
      const scan = d.scan ?? d.time    ?? d.datetime ?? d.check_time
      const stat = d.status_scan ?? d.status ?? d.verify_type ?? '0'
      if (pin && scan) results.push({ pin: String(pin).trim(), scan: String(scan).trim(), status: String(stat) })
    }
    if (results.length > 0) return results
  }

  // Format C — data adalah string tab-separated: "PIN\tDATETIME\tSTATUS\t..."
  if (typeof body?.data === 'string') {
    for (const line of body.data.split('\n')) {
      const parts = line.trim().split('\t')
      if (parts.length >= 2) {
        results.push({ pin: parts[0].trim(), scan: parts[1].trim(), status: (parts[2] ?? '0').trim() })
      }
    }
    if (results.length > 0) return results
  }

  // Format D — flat JSON (tanpa nesting "data")
  const pin  = body?.pin  ?? body?.user_id ?? body?.userid
  const scan = body?.scan ?? body?.time    ?? body?.datetime ?? body?.check_time
  const stat = body?.status_scan ?? body?.status ?? '0'
  if (pin && scan) return [{ pin: String(pin).trim(), scan: String(scan).trim(), status: String(stat) }]

  return []
}

// ─── GET — health check / debug ───────────────────────────────────────────
export async function GET() {
  return NextResponse.json({
    ok: true,
    endpoint: 'POST /api/webhook/attendance',
    note: 'Send POST with Authorization: Bearer <ATTENDANCE_WEBHOOK_SECRET>',
    expected_format: {
      type: 'attlog',
      data: { pin: '155', scan: '2026-06-19 08:30:00', status_scan: '0' }
    }
  })
}

// ─── POST — terima absensi ─────────────────────────────────────────────────
export async function POST(req) {
  if (!admin) {
    console.error('[webhook/attendance] Supabase admin client not configured.')
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
  }

  // Validasi secret — cek header X-Webhook-Secret (proxy-safe) ATAU Authorization Bearer
  const webhookSecret = process.env.ATTENDANCE_WEBHOOK_SECRET
  if (!webhookSecret) {
    console.error('[webhook/attendance] ATTENDANCE_WEBHOOK_SECRET env var not set.')
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
  }

  const xSecret   = req.headers.get('x-webhook-secret') ?? ''
  const authHeader = req.headers.get('authorization') ?? ''
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader
  const token = xSecret || bearerToken

  if (token !== webhookSecret) {
    console.warn('[webhook/attendance] Unauthorized. x-webhook-secret:', xSecret ? '[set]' : '[empty]', '| authorization:', authHeader ? '[set]' : '[empty]')
    return NextResponse.json({
      error: 'Unauthorized',
      debug: {
        received: token ? token.slice(0, 6) + '...' : '[empty]',
        expected: webhookSecret.slice(0, 6) + '...',
        x_secret_header: xSecret ? xSecret.slice(0, 6) + '...' : '[empty]',
        auth_header: authHeader ? authHeader.slice(0, 13) + '...' : '[empty]',
      }
    }, { status: 401 })
  }

  // Parse body
  let body
  const rawText = await req.text()
  try {
    body = JSON.parse(rawText)
  } catch {
    console.error('[webhook/attendance] Invalid JSON body received:', rawText.slice(0, 500))
    return NextResponse.json({ error: 'Invalid JSON body', received: rawText.slice(0, 200) }, { status: 400 })
  }

  // Log seluruh payload untuk debugging
  console.log('[webhook/attendance] Payload received:', JSON.stringify(body).slice(0, 1000))

  // Parse payload ke format standar
  const records = parsePayload(body)

  if (records.length === 0) {
    console.warn('[webhook/attendance] Could not extract pin/scan from payload:', JSON.stringify(body).slice(0, 500))
    return NextResponse.json({
      error: 'Could not parse attendance data from payload',
      received_structure: Object.keys(body || {}),
      received_data_type: typeof body?.data,
    }, { status: 400 })
  }

  const saved = []
  const errors = []

  for (const record of records) {
    const { pin, scan: scanRaw, status: statusScan } = record

    // Parse scan_time — paksa WIB (+07:00)
    const scanTimeISO = scanRaw.replace(' ', 'T') + '+07:00'
    const scanTimeParsed = new Date(scanTimeISO)
    if (isNaN(scanTimeParsed.getTime())) {
      errors.push({ pin, error: `Invalid scan time: "${scanRaw}"` })
      continue
    }

    // Cari user berdasarkan PIN
    const { data: userRows, error: userError } = await admin
      .from('users')
      .select('user_id, user_nama_depan, user_nama_belakang')
      .eq('user_pin', pin)
      .limit(1)

    if (userError) {
      console.error('[webhook/attendance] DB error looking up pin:', pin, userError)
      errors.push({ pin, error: 'DB error' })
      continue
    }

    if (!userRows || userRows.length === 0) {
      console.warn(`[webhook/attendance] PIN "${pin}" not found in users table`)
      errors.push({ pin, error: `PIN "${pin}" not registered` })
      continue
    }

    const { user_id, user_nama_depan, user_nama_belakang } = userRows[0]

    // Insert ke attendances
    const { error: insertError } = await admin
      .from('attendances')
      .insert({
        user_id,
        scan_time:   scanTimeParsed.toISOString(),
        status_scan: statusScan !== null ? String(statusScan) : null,
        raw_payload: body,
      })

    if (insertError) {
      if (insertError.code === '23505') {
        // Duplicate dari retry mesin — anggap sukses
        saved.push({ pin, name: `${user_nama_depan} ${user_nama_belakang}`, note: 'duplicate_ignored' })
      } else {
        console.error('[webhook/attendance] Insert error for pin', pin, ':', insertError)
        errors.push({ pin, error: insertError.message })
      }
      continue
    }

    console.log(`[webhook/attendance] Saved: PIN=${pin} | ${user_nama_depan} ${user_nama_belakang} | ${scanTimeParsed.toISOString()}`)
    saved.push({ pin, name: `${user_nama_depan} ${user_nama_belakang}` })
  }

  return NextResponse.json({
    success: true,
    saved: saved.length,
    errors: errors.length > 0 ? errors : undefined,
    detail: saved,
  })
}
