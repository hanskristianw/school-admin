import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

/**
 * GET /api/class/students?kelas_id=X&year_kelas_ids=1,2,3
 * Returns { assigned: [user_id,...], year_details: [{detail_siswa_user_id, detail_siswa_kelas_id},...] }
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const kelasId = parseInt(searchParams.get('kelas_id'))
    const yearKelasIds = (searchParams.get('year_kelas_ids') || '')
      .split(',')
      .map(Number)
      .filter(Boolean)

    if (!kelasId) {
      return NextResponse.json({ error: 'kelas_id required' }, { status: 400 })
    }


    // Fetch assigned students for this class
    const { data: details, error: detailErr } = await supabaseAdmin
      .from('detail_siswa')
      .select('detail_siswa_user_id')
      .eq('detail_siswa_kelas_id', kelasId)
    if (detailErr) throw new Error(detailErr.message)

    const assigned = (details || []).map(d => d.detail_siswa_user_id)

    // Fetch all assignments in same year (for conflict detection)
    let yearDetails = []
    if (yearKelasIds.length > 0) {
      const { data: yd, error: ydErr } = await supabaseAdmin
        .from('detail_siswa')
        .select('detail_siswa_user_id, detail_siswa_kelas_id')
        .in('detail_siswa_kelas_id', yearKelasIds)
      if (ydErr) throw new Error(ydErr.message)
      yearDetails = yd || []
    }

    return NextResponse.json({ assigned, year_details: yearDetails })
  } catch (err) {
    console.error('[class/students] GET error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

/**
 * POST /api/class/students
 * Saves student-class relations (insert new + delete removed).
 * Body: { kelas_id, to_add: [user_id,...], to_remove: [user_id,...] }
 */
export async function POST(request) {
  try {
    const { kelas_id, to_add = [], to_remove = [] } = await request.json()

    if (!kelas_id) {
      return NextResponse.json({ error: 'kelas_id required' }, { status: 400 })
    }

    // Insert new student-class relations
    if (to_add.length > 0) {
      const rows = to_add.map(userId => ({
        detail_siswa_user_id: userId,
        detail_siswa_kelas_id: kelas_id,
      }))
      const { error: insertErr } = await supabaseAdmin.from('detail_siswa').insert(rows)
      if (insertErr) throw new Error(insertErr.message)
    }

    // Delete removed student-class relations
    if (to_remove.length > 0) {
      const { error: deleteErr } = await supabaseAdmin
        .from('detail_siswa')
        .delete()
        .eq('detail_siswa_kelas_id', kelas_id)
        .in('detail_siswa_user_id', to_remove)
      if (deleteErr) throw new Error(deleteErr.message)
    }

    return NextResponse.json({ success: true, inserted: to_add.length, deleted: to_remove.length })
  } catch (err) {
    console.error('[class/students] POST error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
