import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

/**
 * GET /api/kelas-attendance?kelas_id=X&tanggal=YYYY-MM-DD
 * Returns: { students: [...], records: {...} }
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const kelasId = searchParams.get('kelas_id')
    const tanggal = searchParams.get('tanggal')

    if (!kelasId || !tanggal) {
      return NextResponse.json({ error: 'kelas_id and tanggal required' }, { status: 400 })
    }

    const { data: siswaData, error: siswaError } = await supabaseAdmin
      .from('detail_siswa')
      .select('detail_siswa_id, users:detail_siswa_user_id(user_id, user_nama_depan, user_nama_belakang)')
      .eq('detail_siswa_kelas_id', kelasId)
      .order('detail_siswa_id')

    if (siswaError) throw siswaError

    const students = (siswaData || []).map(d => ({
      detail_siswa_id: d.detail_siswa_id,
      user_id: d.users?.user_id,
      nama: `${d.users?.user_nama_depan || ''} ${d.users?.user_nama_belakang || ''}`.trim()
    }))

    const { data: attData, error: attError } = await supabaseAdmin
      .from('kelas_attendance')
      .select('id, detail_siswa_id, status, keterangan')
      .eq('kelas_id', kelasId)
      .eq('tanggal', tanggal)

    if (attError) throw attError

    const records = {}
    for (const r of (attData || [])) {
      records[r.detail_siswa_id] = { id: r.id, status: r.status, keterangan: r.keterangan || '' }
    }

    return NextResponse.json({ students, records })
  } catch (err) {
    console.error('[kelas-attendance] GET error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

/**
 * POST /api/kelas-attendance
 * Body: { kelas_id, detail_siswa_id, tanggal, status, keterangan, created_by, existing_id? }
 */
export async function POST(request) {
  try {
    const body = await request.json()
    const { kelas_id, detail_siswa_id, tanggal, status, keterangan, created_by, existing_id } = body

    if (!kelas_id || !detail_siswa_id || !tanggal || !status) {
      return NextResponse.json({ error: 'kelas_id, detail_siswa_id, tanggal, status required' }, { status: 400 })
    }

    const validStatuses = ['hadir', 'tidak_hadir', 'ijin', 'terlambat', 'pulang_cepat']
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    let result
    if (existing_id) {
      result = await supabaseAdmin
        .from('kelas_attendance')
        .update({ status, keterangan: keterangan || null })
        .eq('id', existing_id)
        .select('id, status, keterangan')
        .single()
    } else {
      result = await supabaseAdmin
        .from('kelas_attendance')
        .upsert(
          {
            kelas_id: parseInt(kelas_id),
            detail_siswa_id: parseInt(detail_siswa_id),
            tanggal,
            status,
            keterangan: keterangan || null,
            created_by: created_by || null,
          },
          { onConflict: 'detail_siswa_id,tanggal' }
        )
        .select('id, status, keterangan')
        .single()
    }

    if (result.error) throw result.error
    return NextResponse.json(result.data)
  } catch (err) {
    console.error('[kelas-attendance] POST error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

/**
 * DELETE /api/kelas-attendance?kelas_id=X&tanggal=YYYY-MM-DD
 * Clears all attendance records for a class on a specific date.
 */
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url)
    const kelasId = searchParams.get('kelas_id')
    const tanggal = searchParams.get('tanggal')

    if (!kelasId || !tanggal) {
      return NextResponse.json({ error: 'kelas_id and tanggal required' }, { status: 400 })
    }

    const { error } = await supabaseAdmin
      .from('kelas_attendance')
      .delete()
      .eq('kelas_id', kelasId)
      .eq('tanggal', tanggal)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[kelas-attendance] DELETE error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
