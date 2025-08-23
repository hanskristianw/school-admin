import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { supabaseAdmin } from '@/lib/supabase-updated'

export async function POST(req) {
  try {
  const body = await req.json()
  const { sid, tok, user_id, deviceHash: clientDeviceHash, geo } = body || {}
    if (!sid || !tok) return NextResponse.json({ error: 'bad_request' }, { status: 400 })
    if (!supabaseAdmin) return NextResponse.json({ error: 'no_admin_client' }, { status: 500 })

    const { data: session, error } = await supabaseAdmin
      .from('attendance_session')
      .select('*')
      .eq('session_id', sid)
      .single()
    if (error) throw error

    if (session.status !== 'open') return NextResponse.json({ error: 'closed' }, { status: 400 })

    const step = session.token_step_seconds || 20
    const now = Math.floor(Date.now() / 1000)
    const slot = Math.floor(now / step)

    const slots = [slot - 1, slot, slot + 1]
    const ok = slots.some(s => {
      const payload = `${sid}:${s}`
      const t = crypto.createHmac('sha256', session.secret).update(payload).digest('hex').slice(0, 12)
      return t === tok
    })

  const ip = req.headers.get('x-forwarded-for') || ''
  const ua = req.headers.get('user-agent') || ''
  // Compute a stable server-side fallback hash from UA+IP, and prefer client hash if provided
  const uaIpHash = crypto.createHash('sha256').update((ua||'') + '|' + (ip||'')).digest('hex').slice(0,32)
  const deviceHash = (clientDeviceHash || '').trim() || uaIpHash

    if (!ok) {
      await supabaseAdmin.from('attendance_scan_log').insert([{ session_id: sid, token_slot: slot, result: 'invalid', ip, user_agent: ua, device_hash: deviceHash, device_hash_client: clientDeviceHash || null, device_hash_uaip: uaIpHash }])
      return NextResponse.json({ error: 'invalid' }, { status: 400 })
    }

    // Resolve student by user_id (client should send user_id from local storage), then check scope
    const uid = parseInt(user_id)
    if (!uid) {
      await supabaseAdmin.from('attendance_scan_log').insert([{ session_id: sid, token_slot: slot, result: 'not_allowed', ip, user_agent: ua, device_hash: deviceHash, device_hash_client: clientDeviceHash || null, device_hash_uaip: uaIpHash }])
      return NextResponse.json({ error: 'unauth' }, { status: 401 })
    }

    // Find active detail_siswa for this date
    const { data: details, error: dErr } = await supabaseAdmin
      .from('detail_siswa')
      .select('detail_siswa_id, detail_siswa_kelas_id')
      .eq('detail_siswa_user_id', uid)
    if (dErr) throw dErr

    if (!details || details.length === 0) {
      await supabaseAdmin.from('attendance_scan_log').insert([{ session_id: sid, token_slot: slot, result: 'not_allowed', ip, user_agent: ua, device_hash: deviceHash, device_hash_client: clientDeviceHash || null, device_hash_uaip: uaIpHash }])
      return NextResponse.json({ error: 'not_allowed' }, { status: 403 })
    }

    // Check scope if class/year provided
    let allowedDetail = null
    if (session.scope_type === 'class' && session.scope_kelas_id) {
      allowedDetail = details.find(d => String(d.detail_siswa_kelas_id) === String(session.scope_kelas_id))
    } else {
      // For 'year' we need kelas_year_id -> join kelas
      if (session.scope_type === 'year' && session.scope_year_id) {
        // fetch kelas by id
        const { data: kelasRow } = await supabaseAdmin.from('kelas').select('kelas_id, kelas_year_id').in('kelas_id', details.map(d=>d.detail_siswa_kelas_id))
        const okKelas = (kelasRow||[]).some(k => String(k.kelas_year_id) === String(session.scope_year_id))
        if (okKelas) allowedDetail = details[0]
      } else {
        allowedDetail = details[0]
      }
    }

    if (!allowedDetail) {
      await supabaseAdmin.from('attendance_scan_log').insert([{ session_id: sid, token_slot: slot, result: 'not_allowed', ip, user_agent: ua, device_hash: deviceHash, device_hash_client: clientDeviceHash || null, device_hash_uaip: uaIpHash }])
      return NextResponse.json({ error: 'not_allowed' }, { status: 403 })
    }

    // Require location and enforce optional geofence
    const centerLat = parseFloat(process.env.ATTENDANCE_CENTER_LAT || '0')
    const centerLng = parseFloat(process.env.ATTENDANCE_CENTER_LNG || '0')
    const centerRadiusM = parseInt(process.env.ATTENDANCE_RADIUS_M || '0')
    if (!geo || typeof geo.lat !== 'number' || typeof geo.lng !== 'number') {
      await supabaseAdmin.from('attendance_scan_log').insert([{ session_id: sid, token_slot: slot, result: 'not_allowed', ip, user_agent: ua, device_hash: deviceHash, device_hash_client: clientDeviceHash || null, device_hash_uaip: uaIpHash, flagged_reason: 'no_location' }])
      return NextResponse.json({ error: 'location_required' }, { status: 403 })
    }
    const haversine = (lat1, lon1, lat2, lon2) => {
      const R = 6371000; // meters
      const toRad = (d) => d * Math.PI / 180;
      const dLat = toRad(lat2-lat1);
      const dLon = toRad(lon2-lon1);
      const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)**2;
      return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    }
    if (centerRadiusM > 0 && isFinite(centerLat) && isFinite(centerLng)) {
      const dist = haversine(geo.lat, geo.lng, centerLat, centerLng)
      if (!(dist <= centerRadiusM + (geo.accuracy || 0))) {
        await supabaseAdmin.from('attendance_scan_log').insert([{ session_id: sid, token_slot: slot, result: 'not_allowed', ip, user_agent: ua, device_hash: deviceHash, device_hash_client: clientDeviceHash || null, device_hash_uaip: uaIpHash, lat: geo.lat, lng: geo.lng, accuracy: geo.accuracy, flagged_reason: 'outside_geofence' }])
        return NextResponse.json({ error: 'outside_geofence' }, { status: 403 })
      }
    }

  // Optional pre-check: multiple users on same device within window
  const windowMin = parseInt(process.env.ATTENDANCE_DEVICE_WINDOW_MIN || '15')
  const blockMulti = String(process.env.ATTENDANCE_BLOCK_MULTI_USER || 'false').toLowerCase() === 'true'
  const matchMode = String(process.env.ATTENDANCE_MULTI_MATCH || 'client_strict').toLowerCase() // client_strict | client_or_uaip
  let multiUser = false
  if (windowMin > 0) {
    const sinceIso = new Date(Date.now() - windowMin * 60 * 1000).toISOString()
    let orParts = []
    if (clientDeviceHash && clientDeviceHash.trim()) {
      orParts.push(`device_hash.eq.${clientDeviceHash}`, `device_hash_client.eq.${clientDeviceHash}`)
      if (matchMode === 'client_or_uaip') {
        orParts.push(`device_hash.eq.${uaIpHash}`, `device_hash_uaip.eq.${uaIpHash}`)
      }
    } else {
      // No client hash -> only UA+IP option
      orParts.push(`device_hash.eq.${uaIpHash}`, `device_hash_uaip.eq.${uaIpHash}`)
    }
    const { data: recent } = await supabaseAdmin
      .from('attendance_scan_log')
      .select('detail_siswa_id')
      .or(orParts.join(','))
      .gte('created_at', sinceIso)
      .not('detail_siswa_id', 'is', null)
      .neq('detail_siswa_id', allowedDetail.detail_siswa_id)
      .limit(1)
    if (recent && recent.length > 0) multiUser = true
  }

  if (blockMulti && multiUser) {
    await supabaseAdmin.from('attendance_scan_log').insert([{ session_id: sid, token_slot: slot, result: 'not_allowed', ip, user_agent: ua, device_hash: deviceHash, device_hash_client: clientDeviceHash || null, device_hash_uaip: uaIpHash, lat: geo?.lat, lng: geo?.lng, accuracy: geo?.accuracy, flagged_reason: 'device_multi_user' }])
    return NextResponse.json({ error: 'device_multi_user' }, { status: 403 })
  }

  // Upsert attendance for today (WIB/GMT+7)
  const wibNow = new Date(Date.now() + 7 * 60 * 60 * 1000)
  const today = wibNow.toISOString().slice(0,10)
    const { data: existing } = await supabaseAdmin
      .from('absen')
      .select('absen_id')
      .eq('absen_detail_siswa_id', allowedDetail.detail_siswa_id)
      .eq('absen_date', today)
      .maybeSingle?.() // ignore if not supported

    if (existing) {
      await supabaseAdmin.from('attendance_scan_log').insert([{ session_id: sid, token_slot: slot, result: 'duplicate', detail_siswa_id: allowedDetail.detail_siswa_id, ip, user_agent: ua, device_hash: deviceHash, device_hash_client: clientDeviceHash || null, device_hash_uaip: uaIpHash, lat: geo?.lat, lng: geo?.lng, accuracy: geo?.accuracy }])
      return NextResponse.json({ status: 'duplicate' })
    }

  const nowTime = wibNow.toISOString().slice(11,19)
    const { error: insErr } = await supabaseAdmin
      .from('absen')
      .insert([{ absen_detail_siswa_id: allowedDetail.detail_siswa_id, absen_date: today, absen_time: nowTime, absen_session_id: sid, absen_method: 'qr' }])
    if (insErr) throw insErr

  // Log success; flagged if multiUser detected
  await supabaseAdmin.from('attendance_scan_log').insert([{ session_id: sid, token_slot: slot, result: 'ok', detail_siswa_id: allowedDetail.detail_siswa_id, ip, user_agent: ua, device_hash: deviceHash, device_hash_client: clientDeviceHash || null, device_hash_uaip: uaIpHash, lat: geo?.lat, lng: geo?.lng, accuracy: geo?.accuracy, flagged_reason: multiUser ? 'device_multi_user' : null }])

    return NextResponse.json({ status: 'ok' })
  } catch (e) {
    console.error('scan error', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
