import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-updated'

const SETTINGS_KEY = 'vendor_cleaner_room_assignments'

/**
 * Helper: Read cleaner <-> room assignments
 * Stored format in settings (JSON):
 * {
 *   "by_cleaner": { "57": [1, 3], "68": [2, 3] },
 *   "by_room": { "1": [57], "2": [68], "3": [57, 68] }
 * }
 * Backward-compatible with flat { "57": [1, 3] } format.
 */
export async function getCleanerAssignmentsMap() {
  // byRoomMap: { [room_id]: number[] (user_ids) }
  const byRoomMap = {}

  // 1. Read from settings
  try {
    const { data: settingRow } = await supabaseAdmin
      .from('settings')
      .select('value')
      .eq('key', SETTINGS_KEY)
      .maybeSingle()

    if (settingRow?.value) {
      const parsed = JSON.parse(settingRow.value)
      if (parsed && typeof parsed === 'object') {
        if (parsed.by_room && typeof parsed.by_room === 'object') {
          for (const [rId, uIds] of Object.entries(parsed.by_room)) {
            if (Array.isArray(uIds)) {
              byRoomMap[String(Number(rId))] = Array.from(
                new Set(uIds.map(id => Number(id)).filter(Boolean))
              )
            }
          }
        } else {
          // Legacy flat map { [user_id]: [room_ids] }
          for (const [uId, rIds] of Object.entries(parsed)) {
            const numUid = Number(uId)
            if (numUid && Array.isArray(rIds)) {
              rIds.forEach(rId => {
                const key = String(Number(rId))
                if (!byRoomMap[key]) byRoomMap[key] = []
                if (!byRoomMap[key].includes(numUid)) byRoomMap[key].push(numUid)
              })
            }
          }
        }
      }
    }
  } catch (e) {
    console.warn('[VendorAssignments] Error reading settings:', e?.message)
  }

  // 2. Also check room.cleaner_user_ids column if it exists
  try {
    const { data: roomRows, error: roomColErr } = await supabaseAdmin
      .from('room')
      .select('room_id, cleaner_user_ids')

    if (!roomColErr && Array.isArray(roomRows)) {
      for (const r of roomRows) {
        if (Array.isArray(r.cleaner_user_ids) && r.cleaner_user_ids.length > 0) {
          const key = String(Number(r.room_id))
          const existing = byRoomMap[key] || []
          byRoomMap[key] = Array.from(
            new Set([...existing, ...r.cleaner_user_ids.map(Number).filter(Boolean)])
          )
        }
      }
    }
  } catch {
    // Ignore if cleaner_user_ids column not yet added
  }

  // 3. Also merge from vendor_cleaner_rooms table if it exists
  try {
    const { data: rows, error } = await supabaseAdmin
      .from('vendor_cleaner_rooms')
      .select('user_id, room_id')

    if (!error && Array.isArray(rows) && rows.length > 0) {
      for (const r of rows) {
        const key = String(Number(r.room_id))
        const uId = Number(r.user_id)
        if (!byRoomMap[key]) byRoomMap[key] = []
        if (!byRoomMap[key].includes(uId)) {
          byRoomMap[key].push(uId)
        }
      }
    }
  } catch {
    // Ignore if table not yet created
  }

  // Build byCleanerMap: { [user_id]: number[] (room_ids) }
  const byCleanerMap = {}
  for (const [rIdStr, uIds] of Object.entries(byRoomMap)) {
    const rId = Number(rIdStr)
    if (!rId || !Array.isArray(uIds)) continue
    for (const uId of uIds) {
      const uKey = String(Number(uId))
      if (!byCleanerMap[uKey]) byCleanerMap[uKey] = []
      if (!byCleanerMap[uKey].includes(rId)) {
        byCleanerMap[uKey].push(rId)
      }
    }
  }

  return { byCleanerMap, byRoomMap }
}

/**
 * GET /api/vendor-checklist/assignments
 * Returns all cleaners (role 14), all rooms, and the Many-to-Many assignments
 * both per room (Computer Lab -> [Cleaner A, Cleaner B]) and per cleaner.
 */
export async function GET() {
  try {
    const [cleanersRes, roomsRes, maps] = await Promise.all([
      supabaseAdmin
        .from('users')
        .select('user_id, user_nama_depan, user_nama_belakang, user_role_id, is_active')
        .eq('user_role_id', 14)
        .eq('is_active', true)
        .order('user_nama_depan', { ascending: true }),
      supabaseAdmin
        .from('room')
        .select('room_id, room_name, qr_code_token, is_active')
        .order('room_name', { ascending: true }),
      getCleanerAssignmentsMap()
    ])

    if (cleanersRes.error) throw cleanersRes.error
    if (roomsRes.error) throw roomsRes.error

    const { byCleanerMap, byRoomMap } = maps

    const cleaners = (cleanersRes.data || []).map(u => {
      const fullName = `${u.user_nama_depan || ''} ${u.user_nama_belakang || ''}`.trim()
      const roomIds = byCleanerMap[String(u.user_id)] || []
      return {
        user_id: u.user_id,
        full_name: fullName,
        room_ids: roomIds
      }
    })

    const cleanerLookup = new Map(cleaners.map(c => [Number(c.user_id), c]))

    // Map room_id -> array of cleaner objects { user_id, full_name }
    const roomCleanersMap = {}
    for (const rm of roomsRes.data || []) {
      const uIds = byRoomMap[String(rm.room_id)] || []
      roomCleanersMap[rm.room_id] = uIds
        .map(uid => cleanerLookup.get(Number(uid)))
        .filter(Boolean)
        .map(c => ({ user_id: c.user_id, full_name: c.full_name }))
    }

    return NextResponse.json({
      success: true,
      cleaners,
      rooms: roomsRes.data || [],
      assignments_map: byCleanerMap,
      room_user_ids_map: byRoomMap,
      room_cleaners_map: roomCleanersMap
    })
  } catch (err) {
    console.error('[VendorAssignments GET] Error:', err)
    return NextResponse.json(
      { success: false, message: err.message || 'Internal Server Error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/vendor-checklist/assignments
 * Supports Room-Centric saving (recommended):
 *   Body: { room_id: 3, user_ids: [57, 68] }  --> Sets who cleans Computer Lab (1 or more cleaners)
 * Also supports Cleaner-Centric saving:
 *   Body: { user_id: 57, room_ids: [1, 3] }
 */
export async function POST(request) {
  try {
    const body = await request.json()
    const { byCleanerMap, byRoomMap } = await getCleanerAssignmentsMap()

    // MODE 1: Room-Centric (misal Computer Lab -> atur siapa saja yang membersihkan)
    if (body.room_id !== undefined && body.room_id !== null) {
      const rId = Number(body.room_id)
      if (!rId) {
        return NextResponse.json({ success: false, message: 'room_id tidak valid' }, { status: 400 })
      }

      const cleanUserIds = Array.isArray(body.user_ids)
        ? Array.from(new Set(body.user_ids.map(id => Number(id)).filter(Boolean)))
        : []

      byRoomMap[String(rId)] = cleanUserIds

      // Rebuild byCleanerMap from byRoomMap
      const nextByCleaner = {}
      for (const [roomKey, uIds] of Object.entries(byRoomMap)) {
        const numRoomId = Number(roomKey)
        for (const uId of uIds) {
          const uKey = String(Number(uId))
          if (!nextByCleaner[uKey]) nextByCleaner[uKey] = []
          if (!nextByCleaner[uKey].includes(numRoomId)) nextByCleaner[uKey].push(numRoomId)
        }
      }

      // 1. Save to public.settings
      const { error: upsertErr } = await supabaseAdmin
        .from('settings')
        .upsert(
          {
            key: SETTINGS_KEY,
            value: JSON.stringify({ by_room: byRoomMap, by_cleaner: nextByCleaner }),
            description: 'Pemetaan ruangan dengan petugas cleaning (1 ruangan bisa 1 atau lebih cleaner)'
          },
          { onConflict: 'key' }
        )

      if (upsertErr) throw upsertErr

      // 2. Sync to public.room.cleaner_user_ids if column exists
      try {
        await supabaseAdmin
          .from('room')
          .update({ cleaner_user_ids: cleanUserIds, updated_at: new Date().toISOString() })
          .eq('room_id', rId)
      } catch {
        // Ignore if column doesn't exist yet
      }

      // 3. Sync to public.vendor_cleaner_rooms if table exists
      try {
        const { error: delErr } = await supabaseAdmin
          .from('vendor_cleaner_rooms')
          .delete()
          .eq('room_id', rId)

        if (!delErr && cleanUserIds.length > 0) {
          const rowsToInsert = cleanUserIds.map(uId => ({
            user_id: uId,
            room_id: rId
          }))
          await supabaseAdmin
            .from('vendor_cleaner_rooms')
            .upsert(rowsToInsert, { onConflict: 'user_id,room_id' })
        }
      } catch {
        // Ignore if table doesn't exist yet
      }

      return NextResponse.json({
        success: true,
        message: 'Petugas kebersihan ruangan berhasil disimpan',
        room_id: rId,
        user_ids: cleanUserIds
      })
    }

    // MODE 2: Cleaner-Centric fallback
    if (body.user_id) {
      const uId = Number(body.user_id)
      const cleanRoomIds = Array.isArray(body.room_ids)
        ? Array.from(new Set(body.room_ids.map(id => Number(id)).filter(Boolean)))
        : []

      // Update byRoomMap for this user
      for (const [rKey, uIds] of Object.entries(byRoomMap)) {
        const filtered = (uIds || []).filter(id => Number(id) !== uId)
        if (cleanRoomIds.includes(Number(rKey))) {
          filtered.push(uId)
        }
        byRoomMap[rKey] = Array.from(new Set(filtered))
      }
      for (const rId of cleanRoomIds) {
        const rKey = String(rId)
        if (!byRoomMap[rKey]) byRoomMap[rKey] = [uId]
        else if (!byRoomMap[rKey].includes(uId)) byRoomMap[rKey].push(uId)
      }

      byCleanerMap[String(uId)] = cleanRoomIds

      const { error: upsertErr } = await supabaseAdmin
        .from('settings')
        .upsert(
          {
            key: SETTINGS_KEY,
            value: JSON.stringify({ by_room: byRoomMap, by_cleaner: byCleanerMap }),
            description: 'Pemetaan ruangan dengan petugas cleaning (1 ruangan bisa 1 atau lebih cleaner)'
          },
          { onConflict: 'key' }
        )

      if (upsertErr) throw upsertErr

      return NextResponse.json({
        success: true,
        message: 'Penugasan ruangan berhasil disimpan',
        user_id: uId,
        room_ids: cleanRoomIds
      })
    }

    return NextResponse.json(
      { success: false, message: 'room_id atau user_id wajib diisi' },
      { status: 400 }
    )
  } catch (err) {
    console.error('[VendorAssignments POST] Error:', err)
    return NextResponse.json(
      { success: false, message: err.message || 'Internal Server Error' },
      { status: 500 }
    )
  }
}
