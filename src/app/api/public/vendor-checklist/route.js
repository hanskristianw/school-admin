import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getCleanerAssignmentsMap } from '@/app/api/vendor-checklist/assignments/route'

export const dynamic = 'force-dynamic'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const VALID_SECRETS = [
  process.env.VENDOR_CHECKLIST_SECRET_KEY,
  process.env.COURT_RENTAL_SECRET_KEY,
  'ccs_vendor_auth_2026_v9x2k7p4',
  'ccs_court_auth_2026_x7k9p2m4'
].filter(Boolean)

function verifyAuth(request, bodySecret) {
  const authHeader = request.headers.get('authorization') || ''
  const token = authHeader.replace(/^Bearer\s+/i, '').trim()
  return (token && VALID_SECRETS.includes(token)) || (bodySecret && VALID_SECRETS.includes(bodySecret))
}

// Helper WIB date (YYYY-MM-DD)
function getTodayWIB() {
  const now = new Date()
  const wib = new Date(now.getTime() + 7 * 60 * 60 * 1000)
  return wib.toISOString().slice(0, 10)
}

/**
 * GET /api/public/vendor-checklist
 * Mendukung:
 * - ?action=get_cleaners
 * - ?action=get_cleaner_rooms&user_id=xxx (atau &worker_name=xxx)
 * - ?action=get_active_reports
 * - ?action=get_resolved_reports
 * - ?room_id=xxx atau ?room_token=xxx
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    // 0a. Ambil daftar komplain fasilitas (aktif ATAU riwayat resolved) untuk pihak cleaning
    if (action === 'get_active_reports' || action === 'get_resolved_reports') {
      const isResolved = action === 'get_resolved_reports'
      let query = supabaseAdmin
        .from('room_facility_reports')
        .select(`
          id,
          room_id,
          reporter_name,
          reporter_contact,
          issue_description,
          photo_file,
          hosting_url,
          status,
          notes,
          created_at,
          resolved_at,
          resolved_by_name,
          resolution_photo_file,
          resolution_notes,
          room:room_id (room_id, room_name, qr_code_token)
        `)

      if (isResolved) {
        query = query.eq('status', 'resolved').order('resolved_at', { ascending: false }).limit(50)
      } else {
        query = query.in('status', ['pending', 'in_progress']).order('created_at', { ascending: false }).limit(30)
      }

      const { data: reports, error: rErr } = await query

      if (rErr) {
        if (rErr.code === '42P01') {
          return NextResponse.json({ success: true, reports: [] })
        }
        return NextResponse.json({ success: false, message: rErr.message }, { status: 500 })
      }

      const formatted = (reports || []).map(r => {
        const isGeneralQr = !r.room_id || r.notes === 'GENERAL_QR'
        return {
          id: r.id,
          room_id: isGeneralQr ? null : r.room_id,
          room_name: isGeneralQr ? 'Laporan Umum (QR General)' : (r.room?.room_name || `Ruangan #${r.room_id}`),
          room_token: isGeneralQr ? '' : (r.room?.qr_code_token || ''),
          reporter_name: r.reporter_name || 'Anonim',
          reporter_contact: r.reporter_contact,
          issue_description: r.issue_description,
          photo_file: r.photo_file,
          hosting_url: r.hosting_url,
          status: r.status,
          created_at: r.created_at,
          resolved_at: r.resolved_at,
          resolved_by_name: r.resolved_by_name,
          resolution_photo_file: r.resolution_photo_file,
          resolution_notes: r.resolution_notes
        }
      })

      return NextResponse.json({ success: true, reports: formatted })
    }

    // 0b. Ambil daftar petugas kebersihan (role_id 14: Cleaning, is_active: true) beserta jumlah ruangan tugasnya
    if (action === 'get_cleaners') {
      const [cleanersRes, maps] = await Promise.all([
        supabaseAdmin
          .from('users')
          .select('user_id, user_nama_depan, user_nama_belakang, user_role_id')
          .eq('user_role_id', 14)
          .eq('is_active', true)
          .order('user_nama_depan', { ascending: true }),
        getCleanerAssignmentsMap()
      ])

      if (cleanersRes.error) {
        return NextResponse.json({ success: false, message: cleanersRes.error.message }, { status: 500 })
      }

      const assignmentsMap = maps.byCleanerMap || {}

      const list = (cleanersRes.data || []).map(u => {
        const fullName = `${u.user_nama_depan || ''} ${u.user_nama_belakang || ''}`.trim()
        const assignedRoomIds = assignmentsMap[String(u.user_id)] || []
        return {
          user_id: u.user_id,
          name: fullName,
          full_name: fullName,
          assigned_room_ids: assignedRoomIds
        }
      })

      return NextResponse.json({ success: true, cleaners: list })
    }

    // 0c. Ambil daftar ruangan yang di-handle oleh petugas tertentu (Si X -> Ruangan A, B, C, D)
    //     beserta status checklist hari ini untuk masing-masing ruangan tersebut
    if (action === 'get_cleaner_rooms') {
      const userIdParam = searchParams.get('user_id')
      const workerNameParam = (searchParams.get('worker_name') || '').trim()

      const [cleanersRes, roomsRes, maps] = await Promise.all([
        supabaseAdmin
          .from('users')
          .select('user_id, user_nama_depan, user_nama_belakang')
          .eq('user_role_id', 14)
          .eq('is_active', true),
        supabaseAdmin
          .from('room')
          .select('room_id, room_name, qr_code_token, is_active')
          .eq('is_active', true)
          .order('room_name', { ascending: true }),
        getCleanerAssignmentsMap()
      ])

      if (roomsRes.error) {
        return NextResponse.json({ success: false, message: roomsRes.error.message }, { status: 500 })
      }

      const assignmentsMap = maps.byCleanerMap || {}

      let targetUserId = userIdParam ? String(userIdParam) : null
      let cleanerObj = null

      const allCleaners = (cleanersRes.data || []).map(u => ({
        user_id: u.user_id,
        name: `${u.user_nama_depan || ''} ${u.user_nama_belakang || ''}`.trim()
      }))

      if (targetUserId) {
        cleanerObj = allCleaners.find(c => String(c.user_id) === targetUserId) || null
      } else if (workerNameParam) {
        cleanerObj = allCleaners.find(c => c.name.toLowerCase() === workerNameParam.toLowerCase()) || null
        if (cleanerObj) targetUserId = String(cleanerObj.user_id)
      }

      const assignedRoomIds = targetUserId ? (assignmentsMap[targetUserId] || []) : []
      const allActiveRooms = roomsRes.data || []

      // Filter ruangan yang ditugaskan ke Si X
      const assignedRooms = allActiveRooms.filter(r => assignedRoomIds.includes(Number(r.room_id)))

      // Ambil status checklist hari ini untuk ruangan-ruangan tersebut
      const today = getTodayWIB()
      let checklistsByRoom = {}
      if (assignedRooms.length > 0) {
        const rIds = assignedRooms.map(r => r.room_id)
        const { data: chkData } = await supabaseAdmin
          .from('vendor_room_checklists')
          .select('*')
          .in('room_id', rIds)
          .eq('check_date', today)

        ;(chkData || []).forEach(c => {
          checklistsByRoom[c.room_id] = c
        })
      }

      const formattedRooms = assignedRooms.map(r => {
        const chk = checklistsByRoom[r.room_id] || null
        return {
          room_id: r.room_id,
          room_name: r.room_name,
          room_token: r.qr_code_token || `rm_${r.room_id}`,
          checklist: chk,
          status: chk ? chk.status : 'not_started'
        }
      })

      return NextResponse.json({
        success: true,
        todayDate: today,
        cleaner: cleanerObj || { user_id: targetUserId, name: workerNameParam },
        rooms: formattedRooms
      })
    }

    // 1. Cari ruangan berdasarkan room_id ATAU room_token
    const roomIdParam = searchParams.get('room_id')
    const roomToken = searchParams.get('room_token')

    if (!roomIdParam && !roomToken) {
      return NextResponse.json(
        { success: false, message: 'Parameter room_id atau room_token diperlukan' },
        { status: 400 }
      )
    }

    let roomQuery = supabaseAdmin
      .from('room')
      .select('room_id, room_name, qr_code_token, is_active')

    if (roomIdParam) {
      roomQuery = roomQuery.eq('room_id', Number(roomIdParam))
    } else {
      roomQuery = roomQuery.eq('qr_code_token', roomToken)
    }

    const { data: room, error: roomErr } = await roomQuery.maybeSingle()

    if (roomErr) {
      return NextResponse.json({ success: false, message: roomErr.message }, { status: 500 })
    }

    if (!room) {
      return NextResponse.json(
        { success: false, message: 'Ruangan tidak ditemukan di sistem.' },
        { status: 404 }
      )
    }

    if (room.is_active === false) {
      return NextResponse.json(
        { success: false, message: `Ruangan "${room.room_name}" sedang dinonaktifkan dari jadwal kebersihan.` },
        { status: 403 }
      )
    }

    // 2. Ambil data checklist hari ini (WIB)
    const today = getTodayWIB()
    const { data: checklist, error: checkErr } = await supabaseAdmin
      .from('vendor_room_checklists')
      .select('*')
      .eq('room_id', room.room_id)
      .eq('check_date', today)
      .maybeSingle()

    if (checkErr && checkErr.code !== 'PGRST116' && checkErr.code !== '42P01') {
      console.error('[VendorChecklist API] Error fetching checklist:', checkErr)
    }

    return NextResponse.json({
      success: true,
      room: {
        id: room.room_id,
        name: room.room_name,
        token: room.qr_code_token || `rm_${room.room_id}`
      },
      todayDate: today,
      checklist: checklist || null
    })

  } catch (err) {
    console.error('[VendorChecklist API GET] Error:', err)
    return NextResponse.json({ success: false, message: err.message }, { status: 500 })
  }
}

/**
 * POST: Simpan aksi checklist & laporan fasilitas
 * Actions:
 * - 'submit_before_after' (Upload Foto Before & After sekaligus untuk ruangan Si X)
 * - 'start_progress' (Before)
 * - 'submit_finish' (After)
 * - 'submit_revision' (Revision)
 * - 'submit_report' / 'submit_complaint' (Pelaporan Keluhan General QR /report_facility)
 * - 'resolve_report' (Penyelesaian komplain oleh Cleaner)
 */
export async function POST(request) {
  try {
    const body = await request.json()
    const {
      secret_token,
      action,
      room_id,
      room_token,
      worker_name,
      image_file,
      image_before_file,
      image_after_file,
      hosting_url,
      notes,
      reporter_name,
      reporter_contact,
      issue_description
    } = body

    if (!verifyAuth(request, secret_token)) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized: Invalid secret token' },
        { status: 401 }
      )
    }

    if (!action) {
      return NextResponse.json(
        { success: false, message: 'Parameter action wajib diisi' },
        { status: 400 }
      )
    }

    const today = getTodayWIB()
    const nowISO = new Date().toISOString()

    // ── AKSI 1: SUBMIT REPORT / COMPLAINT (Dari QR General /report_facility) ──
    if (action === 'submit_report' || action === 'submit_complaint') {
      const repName = (reporter_name || '').trim() || 'Anonim'
      const desc = (issue_description || notes || '').trim()

      if (!desc) {
        return NextResponse.json({ success: false, message: 'Deskripsi keluhan wajib diisi' }, { status: 400 })
      }

      let finalPhotoFile = image_file || null

      // Jika dikirim menggunakan image_base64
      if (!finalPhotoFile && body.image_base64) {
        try {
          const base64Data = body.image_base64.replace(/^data:image\/\w+;base64,/, '')
          const buffer = Buffer.from(base64Data, 'base64')
          const filePath = `facility-reports/report_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.jpg`
          const { error: upErr } = await supabaseAdmin.storage
            .from('attachments')
            .upload(filePath, buffer, { contentType: 'image/jpeg', upsert: false })
          if (!upErr) {
            const { data: pubData } = supabaseAdmin.storage.from('attachments').getPublicUrl(filePath)
            if (pubData?.publicUrl) finalPhotoFile = pubData.publicUrl
          }
        } catch (e) {
          console.warn('[VendorChecklist API] Failed uploading base64 photo to storage:', e)
        }
      }

      if (!finalPhotoFile) {
        return NextResponse.json(
          { success: false, message: 'Foto kondisi wajib dilampirkan' },
          { status: 400 }
        )
      }

      // Cari room_id jika kebetulan disertakan (opsional), jika tidak biarkan null (General QR)
      let targetRoomId = room_id ? Number(room_id) : null
      if (!targetRoomId && room_token) {
        const { data: rm } = await supabaseAdmin
          .from('room')
          .select('room_id')
          .eq('qr_code_token', room_token)
          .maybeSingle()
        if (rm) targetRoomId = rm.room_id
      }

      const insertPayload = {
        room_id: targetRoomId,
        reporter_name: repName,
        reporter_contact: reporter_contact?.trim() || null,
        issue_description: desc,
        photo_file: finalPhotoFile,
        hosting_url: hosting_url || null,
        status: 'pending',
        notes: targetRoomId ? null : 'GENERAL_QR'
      }

      let { data: reportData, error: reportErr } = await supabaseAdmin
        .from('room_facility_reports')
        .insert(insertPayload)
        .select()
        .maybeSingle()

      // Fallback jika ALTER TABLE room_id DROP NOT NULL belum dijalankan di Supabase
      if (reportErr && reportErr.code === '23502' && !targetRoomId) {
        const { data: firstRoom } = await supabaseAdmin
          .from('room')
          .select('room_id')
          .order('room_id', { ascending: true })
          .limit(1)
          .maybeSingle()

        if (firstRoom?.room_id) {
          const retryRes = await supabaseAdmin
            .from('room_facility_reports')
            .insert({
              ...insertPayload,
              room_id: firstRoom.room_id,
              notes: 'GENERAL_QR'
            })
            .select()
            .maybeSingle()
          reportData = retryRes.data
          reportErr = retryRes.error
        }
      }

      if (reportErr) {
        console.error('[VendorChecklist API] Error inserting report:', reportErr)
        return NextResponse.json({ success: false, message: reportErr.message }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        message: 'Laporan keluhan fasilitas berhasil dikirim',
        data: reportData
      })
    }

    // ── AKSI 2: RESOLVE REPORT / COMPLAINT OLEH PIHAK CLEANING ────────────
    if (action === 'resolve_report') {
      const reportId = body.report_id
      const workerName = (body.worker_name || '').trim()
      const resNotes = (body.resolution_notes || '').trim()
      const imageFile = body.image_file

      if (!reportId) {
        return NextResponse.json({ success: false, message: 'ID laporan wajib disertakan' }, { status: 400 })
      }
      if (!workerName) {
        return NextResponse.json({ success: false, message: 'Nama petugas wajib diisi' }, { status: 400 })
      }
      if (!imageFile) {
        return NextResponse.json({ success: false, message: 'Foto bukti penanganan komplain wajib diunggah' }, { status: 400 })
      }

      const { data: updData, error: updErr } = await supabaseAdmin
        .from('room_facility_reports')
        .update({
          status: 'resolved',
          resolved_at: nowISO,
          resolved_by_name: workerName,
          resolution_photo_file: imageFile,
          resolution_notes: resNotes || null,
          hosting_url: body.hosting_url || null,
          updated_at: nowISO
        })
        .eq('id', reportId)
        .select()
        .maybeSingle()

      if (updErr) {
        console.error('[VendorChecklist API] Error resolving report:', updErr)
        return NextResponse.json({ success: false, message: updErr.message }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        message: 'Komplain fasilitas berhasil ditandai selesai (resolved)',
        data: updData
      })
    }

    // ── UNTUK AKSI CHECKLIST RUANGAN: Cari Ruangan via room_id atau room_token ──
    if (!room_id && !room_token) {
      return NextResponse.json(
        { success: false, message: 'Parameter room_id atau room_token wajib diisi' },
        { status: 400 }
      )
    }

    let rQuery = supabaseAdmin.from('room').select('room_id, room_name, is_active')
    if (room_id) {
      rQuery = rQuery.eq('room_id', Number(room_id))
    } else {
      rQuery = rQuery.eq('qr_code_token', room_token)
    }
    const { data: room, error: roomErr } = await rQuery.maybeSingle()

    if (roomErr || !room) {
      return NextResponse.json(
        { success: false, message: 'Ruangan tidak ditemukan' },
        { status: 404 }
      )
    }

    // Cek apakah sudah ada checklist untuk ruangan ini hari ini
    const { data: existing } = await supabaseAdmin
      .from('vendor_room_checklists')
      .select('*')
      .eq('room_id', room.room_id)
      .eq('check_date', today)
      .maybeSingle()

    // ── AKSI 3: SUBMIT BEFORE & AFTER SEKALIGUS (1 Halaman Praktis) ──────────
    if (action === 'submit_before_after') {
      if (!worker_name?.trim()) {
        return NextResponse.json({ success: false, message: 'Nama petugas wajib dipilih' }, { status: 400 })
      }
      if (!image_before_file || !image_after_file) {
        return NextResponse.json(
          { success: false, message: 'Foto Before dan Foto After wajib diunggah keduanya' },
          { status: 400 }
        )
      }

      if (existing) {
        const { error: updErr } = await supabaseAdmin
          .from('vendor_room_checklists')
          .update({
            vendor_worker_name: worker_name.trim(),
            image_before_file,
            image_after_file,
            hosting_url: hosting_url || existing.hosting_url || null,
            notes: notes?.trim() || existing.notes || null,
            status: 'pending_review',
            start_time: existing.start_time || nowISO,
            end_time: nowISO,
            updated_at: nowISO
          })
          .eq('id', existing.id)

        if (updErr) throw updErr
      } else {
        const { error: insErr } = await supabaseAdmin
          .from('vendor_room_checklists')
          .insert({
            room_id: room.room_id,
            check_date: today,
            vendor_worker_name: worker_name.trim(),
            image_before_file,
            image_after_file,
            hosting_url: hosting_url || null,
            notes: notes?.trim() || null,
            status: 'pending_review',
            start_time: nowISO,
            end_time: nowISO
          })

        if (insErr) throw insErr
      }

      return NextResponse.json({
        success: true,
        message: 'Foto Before & After berhasil disimpan dan dikirim untuk ditinjau supervisor'
      })
    }

    // ── AKSI 4: START PROGRESS (Upload Foto Before saja - kompatibilitas) ───
    if (action === 'start_progress') {
      if (!worker_name?.trim()) {
        return NextResponse.json({ success: false, message: 'Nama petugas wajib diisi' }, { status: 400 })
      }
      if (!image_file) {
        return NextResponse.json({ success: false, message: 'Foto Before wajib diunggah' }, { status: 400 })
      }

      if (existing) {
        const { error: updErr } = await supabaseAdmin
          .from('vendor_room_checklists')
          .update({
            vendor_worker_name: worker_name.trim(),
            image_before_file: image_file,
            hosting_url: hosting_url || null,
            status: 'in_progress',
            start_time: nowISO,
            updated_at: nowISO
          })
          .eq('id', existing.id)

        if (updErr) throw updErr
        return NextResponse.json({ success: true, message: 'Pekerjaan kebersihan dimulai (Before diupdate)' })
      } else {
        const { error: insErr } = await supabaseAdmin
          .from('vendor_room_checklists')
          .insert({
            room_id: room.room_id,
            check_date: today,
            vendor_worker_name: worker_name.trim(),
            image_before_file: image_file,
            hosting_url: hosting_url || null,
            status: 'in_progress',
            start_time: nowISO
          })

        if (insErr) throw insErr
        return NextResponse.json({ success: true, message: 'Pekerjaan kebersihan berhasil dimulai' })
      }
    }

    // ── AKSI 5: SUBMIT FINISH (Upload Foto After saja - kompatibilitas) ─────
    if (action === 'submit_finish') {
      if (!existing) {
        return NextResponse.json(
          { success: false, message: 'Ruangan belum difoto Sebelum (Before). Harap mulai dari foto Before.' },
          { status: 400 }
        )
      }
      if (!image_file) {
        return NextResponse.json({ success: false, message: 'Foto After wajib diunggah' }, { status: 400 })
      }

      const { error: updErr } = await supabaseAdmin
        .from('vendor_room_checklists')
        .update({
          image_after_file: image_file,
          notes: notes?.trim() || existing.notes || null,
          status: 'pending_review',
          end_time: nowISO,
          updated_at: nowISO
        })
        .eq('id', existing.id)

      if (updErr) throw updErr
      return NextResponse.json({ success: true, message: 'Pekerjaan selesai dan dikirim untuk ditinjau supervisor' })
    }

    // ── AKSI 6: SUBMIT REVISION (Upload Foto Perbaikan) ────────────────────
    if (action === 'submit_revision') {
      if (!existing) {
        return NextResponse.json({ success: false, message: 'Data checklist tidak ditemukan' }, { status: 404 })
      }
      if (!image_file) {
        return NextResponse.json({ success: false, message: 'Foto perbaikan revisi wajib diunggah' }, { status: 400 })
      }

      const { error: updErr } = await supabaseAdmin
        .from('vendor_room_checklists')
        .update({
          image_revision_file: image_file,
          notes: notes?.trim() ? `${existing.notes ? existing.notes + ' | ' : ''}Revisi: ${notes.trim()}` : existing.notes,
          status: 'pending_review',
          updated_at: nowISO
        })
        .eq('id', existing.id)

      if (updErr) throw updErr
      return NextResponse.json({ success: true, message: 'Foto revisi berhasil dikirim ulang ke supervisor' })
    }

    return NextResponse.json({ success: false, message: `Action "${action}" tidak dikenali` }, { status: 400 })

  } catch (err) {
    console.error('[VendorChecklist API POST] Error:', err)
    return NextResponse.json({ success: false, message: err.message }, { status: 500 })
  }
}
