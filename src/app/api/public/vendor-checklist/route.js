import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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
 * GET: Ambil status checklist ruangan hari ini berdasarkan qr_token ATAU ambil daftar cleaner
 * URL: /api/public/vendor-checklist?room_token=xxx
 * URL: /api/public/vendor-checklist?action=get_cleaners
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

      const formatted = (reports || []).map(r => ({
        id: r.id,
        room_id: r.room_id,
        room_name: r.room?.room_name || `Ruangan #${r.room_id}`,
        room_token: r.room?.qr_code_token || '',
        reporter_name: r.reporter_name,
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
      }))

      return NextResponse.json({ success: true, reports: formatted })
    }

    // 0b. Ambil daftar petugas kebersihan (role_id 14: Cleaning, is_active: true)
    if (action === 'get_cleaners') {
      const { data: cleaners, error: cErr } = await supabaseAdmin
        .from('users')
        .select('user_id, user_nama_depan, user_nama_belakang, user_role_id')
        .eq('user_role_id', 14)
        .eq('is_active', true)
        .order('user_nama_depan', { ascending: true })

      if (cErr) {
        return NextResponse.json({ success: false, message: cErr.message }, { status: 500 })
      }

      const list = (cleaners || []).map(u => ({
        user_id: u.user_id,
        name: `${u.user_nama_depan || ''} ${u.user_nama_belakang || ''}`.trim()
      }))

      return NextResponse.json({ success: true, cleaners: list })
    }

    const roomToken = searchParams.get('room_token')

    if (!roomToken) {
      return NextResponse.json(
        { success: false, message: 'Parameter room_token diperlukan' },
        { status: 400 }
      )
    }

    // 1. Cari ruangan berdasarkan token QR
    const { data: room, error: roomErr } = await supabaseAdmin
      .from('room')
      .select('room_id, room_name, qr_code_token, is_active')
      .eq('qr_code_token', roomToken)
      .maybeSingle()

    if (roomErr) {
      return NextResponse.json({ success: false, message: roomErr.message }, { status: 500 })
    }

    if (!room) {
      return NextResponse.json(
        { success: false, message: 'QR Code ruangan tidak valid atau tidak terdaftar di sistem.' },
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

    // 3. Ambil data komplain aktif untuk ruangan ini jika ada
    let activeReports = []
    try {
      const { data: repData, error: repErr } = await supabaseAdmin
        .from('room_facility_reports')
        .select('id, reporter_name, reporter_contact, issue_description, photo_file, hosting_url, status, created_at')
        .eq('room_id', room.room_id)
        .in('status', ['pending', 'in_progress'])
        .order('created_at', { ascending: false })

      if (!repErr && repData) {
        activeReports = repData
      }
    } catch (e) {
      console.warn('[VendorChecklist API] Error fetching active room reports:', e)
    }

    return NextResponse.json({
      success: true,
      room: {
        id: room.room_id,
        name: room.room_name,
        token: room.qr_code_token
      },
      todayDate: today,
      checklist: checklist || null,
      activeReports: activeReports
    })

  } catch (err) {
    console.error('[VendorChecklist API GET] Error:', err)
    return NextResponse.json({ success: false, message: err.message }, { status: 500 })
  }
}

/**
 * POST: Simpan aksi checklist dari cPanel PHP
 * Action: 'start_progress' (Before) | 'submit_finish' (After) | 'submit_revision' (Revision) | 'submit_report' (Pelaporan Fasilitas)
 */
export async function POST(request) {
  try {
    const body = await request.json()
    const {
      secret_token,
      action,
      room_token,
      worker_name,
      image_file,
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

    // ── AKSI 5: RESOLVE REPORT / COMPLAINT OLEH PIHAK CLEANING ────────────
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

      const nowISO = new Date().toISOString()
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

    if (!room_token) {
      return NextResponse.json(
        { success: false, message: 'Parameter room_token wajib diisi' },
        { status: 400 }
      )
    }

    // 1. Verifikasi ruangan
    const { data: room, error: roomErr } = await supabaseAdmin
      .from('room')
      .select('room_id, room_name, is_active')
      .eq('qr_code_token', room_token)
      .maybeSingle()

    if (roomErr || !room) {
      return NextResponse.json(
        { success: false, message: 'Ruangan tidak ditemukan' },
        { status: 404 }
      )
    }

    const today = getTodayWIB()
    const nowISO = new Date().toISOString()

    // ── AKSI 4: SUBMIT REPORT / COMPLAINT (Pelaporan Fasilitas Ruangan) ───
    if (action === 'submit_report' || action === 'submit_complaint') {
      const repName = (reporter_name || worker_name || '').trim()
      const desc = (issue_description || notes || '').trim()

      if (!repName) {
        return NextResponse.json({ success: false, message: 'Nama pelapor wajib diisi' }, { status: 400 })
      }
      if (!desc) {
        return NextResponse.json({ success: false, message: 'Deskripsi keluhan wajib diisi' }, { status: 400 })
      }

      const { data: reportData, error: reportErr } = await supabaseAdmin
        .from('room_facility_reports')
        .insert({
          room_id: room.room_id,
          reporter_name: repName,
          reporter_contact: reporter_contact?.trim() || null,
          issue_description: desc,
          photo_file: image_file || null,
          hosting_url: hosting_url || null,
          status: 'pending'
        })
        .select()
        .maybeSingle()

      if (reportErr) {
        console.error('[VendorChecklist API] Error inserting report:', reportErr)
        if (reportErr.code === '42P01') {
          return NextResponse.json({
            success: false,
            message: 'Tabel room_facility_reports belum dibuat di Supabase. Silakan jalankan file migrasi create-room-facility-reports-table.sql.'
          }, { status: 500 })
        }
        throw reportErr
      }

      return NextResponse.json({
        success: true,
        message: 'Laporan kerusakan/keluhan fasilitas berhasil dikirim',
        data: reportData
      })
    }

    // 2. Cek apakah sudah ada checklist untuk hari ini
    const { data: existing } = await supabaseAdmin
      .from('vendor_room_checklists')
      .select('*')
      .eq('room_id', room.room_id)
      .eq('check_date', today)
      .maybeSingle()

    // ── AKSI 1: START PROGRESS (Upload Foto Before) ────────────────────────
    if (action === 'start_progress') {
      if (!worker_name?.trim()) {
        return NextResponse.json({ success: false, message: 'Nama petugas wajib diisi' }, { status: 400 })
      }
      if (!image_file) {
        return NextResponse.json({ success: false, message: 'Foto Before wajib diunggah' }, { status: 400 })
      }

      if (existing) {
        // Jika sudah ada tapi statusnya in_progress, update Before
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
        // Buat record baru
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

    // ── AKSI 2: SUBMIT FINISH (Upload Foto After) ──────────────────────────
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

    // ── AKSI 3: SUBMIT REVISION (Upload Foto Perbaikan) ────────────────────
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
          status: 'pending_review', // kirim ulang untuk dicek lagi
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
