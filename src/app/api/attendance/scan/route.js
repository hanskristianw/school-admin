import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { supabaseAdmin } from '@/lib/supabase-updated'

export async function POST(req) {
  try {
    const body = await req.json()
    const { sid, tok, day, user_id, deviceHash: clientDeviceHash, geo } = body || {}
    
    console.log('[scan] Request received:', { hasDay: !!day, hasSid: !!sid, day, user_id, tok: tok?.slice(0,8)+'...' });
    
    // Support both session-based (sid) and daily static (day) QR
    const isDaily = !!day && !sid
    
    if (!tok) {
      return NextResponse.json({ 
        error: 'bad_request',
        debug: 'Parameter "tok" (token) tidak ditemukan'
      }, { status: 400 })
    }
    
    if (!isDaily && !sid) {
      return NextResponse.json({
        error: 'bad_request',
        debug: 'Harus ada "day" (QR harian) atau "sid" (QR sesi)'
      }, { status: 400 })
    }
    
    if (!supabaseAdmin) {
      return NextResponse.json({ 
        error: 'no_admin_client',
        debug: 'Database admin client tidak tersedia'
      }, { status: 500 })
    }

    const ip = req.headers.get('x-forwarded-for') || ''
    const ua = req.headers.get('user-agent') || ''
    const uaIpHash = crypto.createHash('sha256').update((ua||'') + '|' + (ip||'')).digest('hex').slice(0,32)
    const deviceHash = (clientDeviceHash || '').trim() || uaIpHash

    let tokenValid = false

    if (isDaily) {
      console.log('[scan] Daily QR mode');
      
      // Daily static QR verification - use proper timezone
      const now = new Date();
      const wibTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
      const dayOfWeek = wibTime.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
      const currentDay = dayOfWeek === 0 ? 7 : dayOfWeek; // Convert to 1=Mon, 7=Sun

      console.log('[scan] Current day (WIB):', currentDay, 'Scanned day:', day);

      if (day < 1 || day > 7) {
        console.warn('[scan] Invalid day in QR:', day);
        await supabaseAdmin.from('attendance_scan_log').insert([{ result: 'invalid', ip, user_agent: ua, device_hash: deviceHash, device_hash_client: clientDeviceHash || null, device_hash_uaip: uaIpHash, flagged_reason: 'invalid_day' }])
        return NextResponse.json({ 
          error: 'invalid_day',
          debug: `Day ${day} harus 1-7 (Mon-Sun)`
        }, { status: 400 })
      }

      if (day !== currentDay) {
        console.warn('[scan] Day mismatch. Current:', currentDay, 'Scanned:', day);
        await supabaseAdmin.from('attendance_scan_log').insert([{ result: 'invalid', ip, user_agent: ua, device_hash: deviceHash, device_hash_client: clientDeviceHash || null, device_hash_uaip: uaIpHash, flagged_reason: 'wrong_day' }])
        return NextResponse.json({ 
          error: 'wrong_day',
          debug: `QR untuk hari ${['Sen','Sel','Rab','Kam','Jum','Sab','Min'][day-1]}, tapi sekarang hari ${['Sen','Sel','Rab','Kam','Jum','Sab','Min'][currentDay-1]}`
        }, { status: 400 })
      }

      const secretKey = `ATTENDANCE_SECRET_${['MON','TUE','WED','THU','FRI','SAT','SUN'][day-1]}`
      const dbKey = secretKey.toLowerCase();
      
      console.log('[scan] Looking for secret:', dbKey);
      
      let secret = process.env[secretKey]
      if (!secret) {
        const { data: setting } = await supabaseAdmin.from('settings').select('value').eq('key', dbKey).maybeSingle()
        if (setting) secret = setting.value
      }

      if (!secret || secret.trim() === '') {
        console.error('[scan] Secret not configured for', secretKey);
        return NextResponse.json({ 
          error: 'not_configured',
          debug: `Secret untuk hari ${['Sen','Sel','Rab','Kam','Jum','Sab','Min'][day-1]} belum diset di /data/settings/daily_qr`
        }, { status: 500 })
      }

      const expectedToken = crypto.createHmac('sha256', secret).update(`daily:${day}`).digest('hex').slice(0, 16)
      tokenValid = (tok === expectedToken)
      
      console.log('[scan] Token valid:', tokenValid, 'Expected:', expectedToken.slice(0,8)+'...', 'Got:', tok.slice(0,8)+'...');
      
      if (!tokenValid) {
        return NextResponse.json({
          error: 'invalid_token',
          debug: `Token tidak cocok. Expected: ${expectedToken.slice(0,8)}..., Got: ${tok.slice(0,8)}... (day=${day}, secret_key=${dbKey})`
        }, { status: 400 })
      }
    } else {
      console.log('[scan] Session-based QR mode');
      
      // Legacy session-based verification
      if (!sid) return NextResponse.json({ error: 'bad_request' }, { status: 400 })
      
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
      tokenValid = slots.some(s => {
        const payload = `${sid}:${s}`
        const t = crypto.createHmac('sha256', session.secret).update(payload).digest('hex').slice(0, 12)
        return t === tok
      })
      
      if (!tokenValid) {
        return NextResponse.json({
          error: 'invalid_session_token',
          debug: `Token sesi tidak cocok (sid=${sid})`
        }, { status: 400 })
      }
    }

    // This should not be reached if tokenValid check moved inside blocks
    if (!tokenValid) {
      console.warn('[scan] Token invalid - fallback check');
      await supabaseAdmin.from('attendance_scan_log').insert([{ session_id: sid || null, result: 'invalid', ip, user_agent: ua, device_hash: deviceHash, device_hash_client: clientDeviceHash || null, device_hash_uaip: uaIpHash }])
      return NextResponse.json({ 
        error: 'invalid',
        debug: 'Token validation failed (fallback)'
      }, { status: 400 })
    }

    console.log('[scan] Token validated successfully');

    // Resolve student by user_id (client should send user_id from local storage), then check scope
    const uid = parseInt(user_id)
    if (!uid) {
      await supabaseAdmin.from('attendance_scan_log').insert([{ session_id: sid || null, result: 'not_allowed', ip, user_agent: ua, device_hash: deviceHash, device_hash_client: clientDeviceHash || null, device_hash_uaip: uaIpHash }])
      return NextResponse.json({ 
        error: 'unauth',
        debug: 'User ID tidak valid atau tidak dikirim'
      }, { status: 401 })
    }

    // Find active detail_siswa for this date
    const { data: details, error: dErr } = await supabaseAdmin
      .from('detail_siswa')
      .select('detail_siswa_id, detail_siswa_kelas_id')
      .eq('detail_siswa_user_id', uid)
    if (dErr) throw dErr

    if (!details || details.length === 0) {
      await supabaseAdmin.from('attendance_scan_log').insert([{ session_id: sid || null, result: 'not_allowed', ip, user_agent: ua, device_hash: deviceHash, device_hash_client: clientDeviceHash || null, device_hash_uaip: uaIpHash }])
      return NextResponse.json({ 
        error: 'not_allowed',
        debug: `User ID ${uid} tidak memiliki data siswa aktif`
      }, { status: 403 })
    }

    // Check scope (only for session-based QR; daily QR has no scope restriction)
    let allowedDetail = details[0] // Default to first detail_siswa
    
    if (!isDaily && sid) {
      const { data: session, error: sessionErr } = await supabaseAdmin
        .from('attendance_session')
        .select('scope_type, scope_kelas_id, scope_year_id')
        .eq('session_id', sid)
        .single()
      
      if (!sessionErr && session) {
        if (session.scope_type === 'class' && session.scope_kelas_id) {
          allowedDetail = details.find(d => String(d.detail_siswa_kelas_id) === String(session.scope_kelas_id))
        } else if (session.scope_type === 'year' && session.scope_year_id) {
          const { data: kelasRow } = await supabaseAdmin.from('kelas').select('kelas_id, kelas_year_id').in('kelas_id', details.map(d=>d.detail_siswa_kelas_id))
          const okKelas = (kelasRow||[]).some(k => String(k.kelas_year_id) === String(session.scope_year_id))
          if (okKelas) allowedDetail = details[0]
          else allowedDetail = null
        }
      }
    }

    if (!allowedDetail) {
      await supabaseAdmin.from('attendance_scan_log').insert([{ session_id: sid || null, result: 'not_allowed', ip, user_agent: ua, device_hash: deviceHash, device_hash_client: clientDeviceHash || null, device_hash_uaip: uaIpHash }])
      return NextResponse.json({ 
        error: 'not_allowed',
        debug: 'Siswa tidak dalam scope sesi ini'
      }, { status: 403 })
    }

    // Require location and enforce optional geofence
    const centerLat = parseFloat(process.env.ATTENDANCE_CENTER_LAT || '0')
    const centerLng = parseFloat(process.env.ATTENDANCE_CENTER_LNG || '0')
    const centerRadiusM = parseInt(process.env.ATTENDANCE_RADIUS_M || '0')
    if (!geo || typeof geo.lat !== 'number' || typeof geo.lng !== 'number') {
      await supabaseAdmin.from('attendance_scan_log').insert([{ session_id: sid || null, result: 'not_allowed', ip, user_agent: ua, device_hash: deviceHash, device_hash_client: clientDeviceHash || null, device_hash_uaip: uaIpHash, flagged_reason: 'no_location' }])
      return NextResponse.json({ 
        error: 'location_required',
        debug: 'Lokasi GPS tidak terdeteksi atau tidak dikirim'
      }, { status: 403 })
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
        await supabaseAdmin.from('attendance_scan_log').insert([{ session_id: sid || null, result: 'not_allowed', ip, user_agent: ua, device_hash: deviceHash, device_hash_client: clientDeviceHash || null, device_hash_uaip: uaIpHash, lat: geo.lat, lng: geo.lng, accuracy: geo.accuracy, flagged_reason: 'outside_geofence' }])
        return NextResponse.json({ 
          error: 'outside_geofence',
          debug: `Anda berada ${Math.round(dist)}m dari sekolah (maks ${centerRadiusM}m)`
        }, { status: 403 })
      }
    }

  // Optional pre-check: multiple users on same device within window
  const windowMin = parseInt(process.env.ATTENDANCE_DEVICE_WINDOW_MIN || '15')
  const blockMulti = String(process.env.ATTENDANCE_BLOCK_MULTI_USER || 'false').toLowerCase() === 'true'
  const matchMode = String(process.env.ATTENDANCE_MULTI_MATCH || 'client_strict').toLowerCase() // client_strict | client_or_uaip
  let multiUser = false
  
  console.log('[scan] Multi-user detection config:', { windowMin, blockMulti, matchMode });
  console.log('[scan] Device hashes:', { clientDeviceHash, deviceHash: deviceHash.slice(0, 12) + '...', uaIpHash: uaIpHash.slice(0, 12) + '...' });
  
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
    
    console.log('[scan] Checking for recent scans since:', sinceIso);
    console.log('[scan] Query OR parts:', orParts);
    console.log('[scan] Excluding current student:', allowedDetail.detail_siswa_id);
    
    const { data: recent, error: queryError } = await supabaseAdmin
      .from('attendance_scan_log')
      .select('detail_siswa_id, created_at, device_hash_client, device_hash, device_hash_uaip, result')
      .or(orParts.join(','))
      .eq('result', 'ok')  // ⚠️ IMPORTANT: Only check successful scans!
      .gte('created_at', sinceIso)
      .not('detail_siswa_id', 'is', null)
      .neq('detail_siswa_id', allowedDetail.detail_siswa_id)
      .limit(10)  // Get multiple to debug
      
    if (queryError) {
      console.error('[scan] ❌ Query error:', queryError);
    }
    
    console.log('[scan] Recent scans found:', recent?.length || 0);
    if (recent && recent.length > 0) {
      console.log('[scan] 🚨 Multi-user detected! Recent scans:', recent);
      multiUser = true
    } else {
      console.log('[scan] ✅ No multi-user activity detected');
    }
  }

  if (blockMulti && multiUser) {
    await supabaseAdmin.from('attendance_scan_log').insert([{ session_id: sid || null, result: 'not_allowed', ip, user_agent: ua, device_hash: deviceHash, device_hash_client: clientDeviceHash || null, device_hash_uaip: uaIpHash, lat: geo?.lat, lng: geo?.lng, accuracy: geo?.accuracy, flagged_reason: 'device_multi_user' }])
    return NextResponse.json({ 
      error: 'device_multi_user',
      debug: 'Device ini baru digunakan siswa lain dalam 15 menit terakhir'
    }, { status: 403 })
  }

  // Upsert attendance for today (WIB/GMT+7) - use proper timezone conversion
  const now = new Date();
  const wibNow = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
  const today = wibNow.toISOString().slice(0,10)
    const { data: existing } = await supabaseAdmin
      .from('absen')
      .select('absen_id')
      .eq('absen_detail_siswa_id', allowedDetail.detail_siswa_id)
      .eq('absen_date', today)
      .maybeSingle?.() // ignore if not supported

    if (existing) {
      await supabaseAdmin.from('attendance_scan_log').insert([{ session_id: sid || null, result: 'duplicate', detail_siswa_id: allowedDetail.detail_siswa_id, ip, user_agent: ua, device_hash: deviceHash, device_hash_client: clientDeviceHash || null, device_hash_uaip: uaIpHash, lat: geo?.lat, lng: geo?.lng, accuracy: geo?.accuracy }])
      return NextResponse.json({ status: 'duplicate' })
    }

  const nowTime = wibNow.toISOString().slice(11,19)
    const { error: insErr } = await supabaseAdmin
      .from('absen')
      .insert([{ absen_detail_siswa_id: allowedDetail.detail_siswa_id, absen_date: today, absen_time: nowTime, absen_session_id: sid || null, absen_method: isDaily ? 'qr_daily' : 'qr' }])
    if (insErr) throw insErr

  // Log success; flagged if multiUser detected
  console.log('[scan] Recording success. MultiUser flag:', multiUser);
  await supabaseAdmin.from('attendance_scan_log').insert([{ session_id: sid || null, result: 'ok', detail_siswa_id: allowedDetail.detail_siswa_id, ip, user_agent: ua, device_hash: deviceHash, device_hash_client: clientDeviceHash || null, device_hash_uaip: uaIpHash, lat: geo?.lat, lng: geo?.lng, accuracy: geo?.accuracy, flagged_reason: multiUser ? 'device_multi_user' : null }])

  console.log('[scan] ✅ Success! Attendance recorded', { detail_siswa_id: allowedDetail.detail_siswa_id, flagged: multiUser });
  return NextResponse.json({ status: 'ok', flagged: multiUser ? 'device_multi_user' : null })
  } catch (e) {
    console.error('[scan] ERROR:', e)
    return NextResponse.json({ 
      error: 'server_error',
      debug: e.message,
      stack: process.env.NODE_ENV === 'development' ? e.stack : undefined
    }, { status: 500 })
  }
}
