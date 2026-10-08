import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  try {
    const body = await request.json()
    const { id, status, review_notes, reviewed_by } = body

    if (!id || !status) {
      return NextResponse.json(
        { success: false, message: 'ID dan status wajib diisi' },
        { status: 400 }
      )
    }

    if (!['approved', 'revision', 'rejected'].includes(status)) {
      return NextResponse.json(
        { success: false, message: 'Status tidak valid. Harus approved, revision, atau rejected.' },
        { status: 400 }
      )
    }

    if (status === 'revision' && !review_notes?.trim()) {
      return NextResponse.json(
        { success: false, message: 'Catatan instruksi revisi wajib diisi jika meminta revisi.' },
        { status: 400 }
      )
    }

    const nowISO = new Date().toISOString()

    const { data, error } = await supabaseAdmin
      .from('vendor_room_checklists')
      .update({
        status,
        review_notes: review_notes?.trim() || null,
        reviewed_by: reviewed_by ? parseInt(reviewed_by, 10) : null,
        reviewed_at: nowISO,
        updated_at: nowISO
      })
      .eq('id', id)
      .select('*, room:room_id(room_name)')
      .single()

    if (error) throw error

    return NextResponse.json({
      success: true,
      message: `Pemeriksaan ruangan berhasil diperbarui: status "${status}"`,
      data
    })

  } catch (err) {
    console.error('[VendorChecklist Review API] Error:', err)
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 }
    )
  }
}
