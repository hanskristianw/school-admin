import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const EXPECTED_SECRET = process.env.VENDOR_CHECKLIST_SECRET_KEY || process.env.COURT_RENTAL_SECRET_KEY || 'ccs_vendor_auth_2026_v9x2k7p4'

function verifyAuth(request, bodySecret) {
  const authHeader = request.headers.get('authorization') || ''
  const token = authHeader.replace(/^Bearer\s+/i, '').trim()
  return token === EXPECTED_SECRET || bodySecret === EXPECTED_SECRET
}

// Helper WIB date (YYYY-MM-DD)
function getTodayWIB() {
  const now = new Date()
  const wib = new Date(now.getTime() + 7 * 60 * 60 * 1000)
  return wib.toISOString().slice(0, 10)
}

/**
 * GET: Ambil status checklist ruangan hari ini berdasarkan qr_token
 * URL: /api/public/vendor-checklist?room_token=xxx
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
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

    return NextResponse.json({
      success: true,
      room: {
        id: room.room_id,
        name: room.room_name,
        token: room.qr_code_token
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
 * POST: Simpan aksi checklist dari cPanel PHP
 * Action: 'start_progress' (Before) | 'submit_finish' (After) | 'submit_revision' (Revision)
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
      notes
    } = body

    if (!verifyAuth(request, secret_token)) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized: Invalid secret token' },
        { status: 401 }
      )
    }

    if (!room_token || !action) {
      return NextResponse.json(
        { success: false, message: 'Parameter room_token dan action wajib diisi' },
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
