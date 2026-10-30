import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

/**
 * Helper to fetch all rows across PostgREST's default 1,000 row cap using chunked range pagination.
 */
async function fetchAllAttendanceRows(queryFn, chunkSize = 1000) {
  let allRows = []
  let from = 0
  let hasMore = true

  while (hasMore) {
    const { data, error } = await queryFn(from, from + chunkSize - 1)
    if (error) throw error
    if (!data || data.length === 0) break

    allRows = allRows.concat(data)
    if (data.length < chunkSize) {
      hasMore = false
    } else {
      from += chunkSize
    }
  }

  return allRows
}

/**
 * Helper to compute cumulative attendance statistics per student for a given class.
 * Respects student's resign_date so days after resignation are not counted against the student.
 */
async function computeClassAttendanceSummary(kelasId, studentsList = []) {
  let students = studentsList
  if (!students || students.length === 0) {
    const { data: siswaData } = await supabaseAdmin
      .from('detail_siswa')
      .select('detail_siswa_id, users:detail_siswa_user_id(user_id, user_nama_depan, user_nama_belakang, is_active, resign_date)')
      .eq('detail_siswa_kelas_id', kelasId)
      .order('detail_siswa_id')

    students = (siswaData || []).map(d => ({
      detail_siswa_id: d.detail_siswa_id,
      user_id: d.users?.user_id,
      nama: `${d.users?.user_nama_depan || ''} ${d.users?.user_nama_belakang || ''}`.trim(),
      is_active: d.users?.is_active ?? true,
      resign_date: d.users?.resign_date || null
    }))
  }

  let allClassAtt = []
  try {
    allClassAtt = await fetchAllAttendanceRows((from, to) =>
      supabaseAdmin
        .from('kelas_attendance')
        .select('detail_siswa_id, tanggal, status')
        .eq('kelas_id', kelasId)
        .range(from, to)
    )
  } catch (error) {
    console.error('[kelas-attendance] computeSummary error:', error)
    return { summary: {}, totalDays: 0 }
  }

  const allDistinctDates = Array.from(new Set((allClassAtt || []).map(r => r.tanggal))).sort()
  const totalDays = allDistinctDates.length

  const summary = {}
  for (const s of students) {
    // If student has resign_date, effective days for this student only count dates <= resign_date
    const studentDates = s.resign_date
      ? allDistinctDates.filter(d => d <= s.resign_date)
      : allDistinctDates
    const studentTotalDays = studentDates.length

    summary[s.detail_siswa_id] = {
      hadir: 0,
      terlambat: 0,
      pulang_cepat: 0,
      sakit: 0,
      ijin: 0,
      tidak_hadir: 0,
      total_masuk: 0,
      total_hari: studentTotalDays,
      persentase: 0,
      is_active: s.is_active ?? true,
      resign_date: s.resign_date || null
    }
  }

  for (const r of (allClassAtt || [])) {
    if (!summary[r.detail_siswa_id]) continue
    const st = r.status
    if (summary[r.detail_siswa_id][st] !== undefined) {
      summary[r.detail_siswa_id][st]++
    }
    if (['hadir', 'terlambat', 'pulang_cepat'].includes(st)) {
      summary[r.detail_siswa_id].total_masuk++
    }
  }

  for (const id in summary) {
    const sHari = summary[id].total_hari
    summary[id].persentase = sHari > 0 ? Math.round((summary[id].total_masuk / sHari) * 100) : 0
  }

  return { summary, totalDays }
}

/**
 * GET /api/kelas-attendance?kelas_id=X&tanggal=YYYY-MM-DD
 * Mode export: /api/kelas-attendance?kelas_id=X&mode=export
 * Returns: { students: [...], records: {...}, summary: {...}, totalDays: N }
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const kelasId = searchParams.get('kelas_id')
    const tanggal = searchParams.get('tanggal')
    const mode = searchParams.get('mode')

    if (!kelasId) {
      return NextResponse.json({ error: 'kelas_id is required' }, { status: 400 })
    }

    // Export mode: fetch full attendance history across all months for the class
    if (mode === 'export' || !tanggal) {
      const { data: kelasData } = await supabaseAdmin
        .from('kelas')
        .select('kelas_id, kelas_nama')
        .eq('kelas_id', kelasId)
        .single()

      const { data: siswaData, error: siswaError } = await supabaseAdmin
        .from('detail_siswa')
        .select('detail_siswa_id, users:detail_siswa_user_id(user_id, user_nama_depan, user_nama_belakang, is_active, resign_date)')
        .eq('detail_siswa_kelas_id', kelasId)
        .order('detail_siswa_id')

      if (siswaError) throw siswaError

      const students = (siswaData || []).map(d => ({
        detail_siswa_id: d.detail_siswa_id,
        user_id: d.users?.user_id,
        nama: `${d.users?.user_nama_depan || ''} ${d.users?.user_nama_belakang || ''}`.trim(),
        is_active: d.users?.is_active ?? true,
        resign_date: d.users?.resign_date || null
      })).sort((a, b) => a.nama.localeCompare(b.nama))

      const records = await fetchAllAttendanceRows((from, to) =>
        supabaseAdmin
          .from('kelas_attendance')
          .select('id, detail_siswa_id, tanggal, status, keterangan')
          .eq('kelas_id', kelasId)
          .order('tanggal', { ascending: true })
          .range(from, to)
      )
      const distinctDates = Array.from(new Set(records.map(r => r.tanggal))).sort()
      const distinctMonths = Array.from(new Set(records.map(r => r.tanggal.slice(0, 7)))).sort()

      const { summary, totalDays } = await computeClassAttendanceSummary(kelasId, students)

      return NextResponse.json({
        kelas: kelasData || { kelas_id: kelasId, kelas_nama: `Kelas ${kelasId}` },
        students,
        records,
        dates: distinctDates,
        months: distinctMonths,
        summary,
        totalDays
      })
    }

    const { data: siswaData, error: siswaError } = await supabaseAdmin
      .from('detail_siswa')
      .select('detail_siswa_id, users:detail_siswa_user_id(user_id, user_nama_depan, user_nama_belakang, is_active, resign_date)')
      .eq('detail_siswa_kelas_id', kelasId)
      .order('detail_siswa_id')

    if (siswaError) throw siswaError

    // Filter students: if student has resigned, they only appear on dates <= resign_date
    const students = (siswaData || [])
      .map(d => ({
        detail_siswa_id: d.detail_siswa_id,
        user_id: d.users?.user_id,
        nama: `${d.users?.user_nama_depan || ''} ${d.users?.user_nama_belakang || ''}`.trim(),
        is_active: d.users?.is_active ?? true,
        resign_date: d.users?.resign_date || null
      }))
      .filter(s => {
        if (s.resign_date) {
          return tanggal <= s.resign_date
        }
        return s.is_active !== false
      })

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
 * Body (single): { kelas_id, detail_siswa_id, tanggal, status, keterangan, created_by, existing_id? }
 * Body (batch):  { kelas_id, tanggal, records: [{ detail_siswa_id, status, keterangan? }], created_by }
 */
export async function POST(request) {
  try {
    const body = await request.json()
    const { kelas_id, detail_siswa_id, tanggal, status, keterangan, created_by, existing_id, records } = body

    if (!kelas_id || !tanggal) {
      return NextResponse.json({ error: 'kelas_id and tanggal required' }, { status: 400 })
    }

    const validStatuses = ['hadir', 'tidak_hadir', 'ijin', 'sakit', 'terlambat', 'pulang_cepat']

    // Batch mode: records is an array of { detail_siswa_id, status, keterangan? }
    if (Array.isArray(records) && records.length > 0) {
      const recordsToUpsert = records
        .filter(r => r.detail_siswa_id && validStatuses.includes(r.status))
        .map(r => ({
          kelas_id: parseInt(kelas_id),
          detail_siswa_id: parseInt(r.detail_siswa_id),
          tanggal,
          status: r.status,
          keterangan: r.keterangan || null,
          created_by: created_by || null,
        }))

      const { data, error } = await supabaseAdmin
        .from('kelas_attendance')
        .upsert(recordsToUpsert, { onConflict: 'detail_siswa_id,tanggal' })
        .select('id, detail_siswa_id, status, keterangan')

      if (error) throw error

      const { summary, totalDays } = await computeClassAttendanceSummary(parseInt(kelas_id))
      return NextResponse.json({ success: true, saved: data || [], summary, totalDays })
    }

    if (!detail_siswa_id || !status) {
      return NextResponse.json({ error: 'kelas_id, detail_siswa_id, tanggal, status required' }, { status: 400 })
    }

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
