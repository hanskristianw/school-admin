import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

/**
 * Helper to compute cumulative attendance statistics per student for a given class.
 */
async function computeClassAttendanceSummary(kelasId, studentsList = []) {
  const { data: allClassAtt, error } = await supabaseAdmin
    .from('kelas_attendance')
    .select('detail_siswa_id, tanggal, status')
    .eq('kelas_id', kelasId)

  if (error) {
    console.error('[kelas-attendance] computeSummary error:', error)
    return { summary: {}, totalDays: 0 }
  }

  const distinctDates = new Set((allClassAtt || []).map(r => r.tanggal))
  const totalDays = distinctDates.size

  const summary = {}
  for (const s of studentsList) {
    summary[s.detail_siswa_id] = {
      hadir: 0,
      terlambat: 0,
      pulang_cepat: 0,
      sakit: 0,
      ijin: 0,
      tidak_hadir: 0,
      total_masuk: 0,
      total_hari: totalDays,
      persentase: 0
    }
  }

  for (const r of (allClassAtt || [])) {
    if (!summary[r.detail_siswa_id]) {
      summary[r.detail_siswa_id] = {
        hadir: 0,
        terlambat: 0,
        pulang_cepat: 0,
        sakit: 0,
        ijin: 0,
        tidak_hadir: 0,
        total_masuk: 0,
        total_hari: totalDays,
        persentase: 0
      }
    }
    const st = r.status
    if (summary[r.detail_siswa_id][st] !== undefined) {
      summary[r.detail_siswa_id][st]++
    }
    if (['hadir', 'terlambat', 'pulang_cepat'].includes(st)) {
      summary[r.detail_siswa_id].total_masuk++
    }
  }

  for (const id in summary) {
    summary[id].total_hari = totalDays
    summary[id].persentase = totalDays > 0 ? Math.round((summary[id].total_masuk / totalDays) * 100) : 0
  }

  return { summary, totalDays }
}

/**
 * GET /api/kelas-attendance?kelas_id=X&tanggal=YYYY-MM-DD
 * Returns: { students: [...], records: {...}, summary: {...}, totalDays: N }
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

    // Compute cumulative attendance summary
    const { summary, totalDays } = await computeClassAttendanceSummary(kelasId, students)

    return NextResponse.json({ students, records, summary, totalDays })
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

    const validStatuses = ['hadir', 'tidak_hadir', 'ijin', 'sakit', 'terlambat', 'pulang_cepat']
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

    const { summary, totalDays } = await computeClassAttendanceSummary(parseInt(kelas_id))

    return NextResponse.json({ ...result.data, summary, totalDays })
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

    const { summary, totalDays } = await computeClassAttendanceSummary(parseInt(kelasId))

    return NextResponse.json({ success: true, summary, totalDays })
  } catch (err) {
    console.error('[kelas-attendance] DELETE error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
