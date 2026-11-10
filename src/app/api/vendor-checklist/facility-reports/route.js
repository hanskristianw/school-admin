import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') // 'all' | 'pending' | 'in_progress' | 'resolved'
    const limit = Math.min(parseInt(searchParams.get('limit') || '100', 10), 500)

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
      .order('created_at', { ascending: false })
      .limit(limit)

    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    const { data: reports, error } = await query

    if (error) {
      if (error.code === '42P01') {
        return NextResponse.json({ success: true, reports: [] })
      }
      return NextResponse.json({ success: false, message: error.message }, { status: 500 })
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
  } catch (err) {
    console.error('[Facility Reports GET] Error:', err)
    return NextResponse.json({ success: false, message: err.message }, { status: 500 })
  }
}

export async function PATCH(request) {
  try {
    const body = await request.json()
    const { id, status, resolution_notes, resolved_by_name } = body

    if (!id) {
      return NextResponse.json({ success: false, message: 'ID laporan wajib diisi' }, { status: 400 })
    }

    const updatePayload = {
      updated_at: new Date().toISOString()
    }

    if (status) {
      updatePayload.status = status
      if (status === 'resolved') {
        updatePayload.resolved_at = new Date().toISOString()
      } else if (status === 'pending') {
        updatePayload.resolved_at = null
      }
    }

    if (resolution_notes !== undefined) {
      updatePayload.resolution_notes = resolution_notes
    }

    if (resolved_by_name !== undefined) {
      updatePayload.resolved_by_name = resolved_by_name
    }

    const { data, error } = await supabaseAdmin
      .from('room_facility_reports')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .maybeSingle()

    if (error) {
      return NextResponse.json({ success: false, message: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Status komplain fasilitas berhasil diperbarui',
      data
    })
  } catch (err) {
    console.error('[Facility Reports PATCH] Error:', err)
    return NextResponse.json({ success: false, message: err.message }, { status: 500 })
  }
}
