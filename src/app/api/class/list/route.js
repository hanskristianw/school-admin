import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

/**
 * GET /api/class/list
 * Returns kelas list. Admin: all classes. Non-admin: only classes where kelas_user_id matches.
 * Query params:
 *   user_id  - filter by wali kelas (optional for admin)
 *   year_id  - filter by academic year (optional)
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('user_id')
    const yearId = searchParams.get('year_id')
    const isMyp = searchParams.get('is_myp')

    let query = supabaseAdmin
      .from('kelas')
      .select('kelas_id, kelas_nama, kelas_year_id, kelas_unit_id')
      .order('kelas_nama')

    if (userId) {
      query = query.eq('kelas_user_id', parseInt(userId))
    }
    if (yearId) {
      query = query.eq('kelas_year_id', parseInt(yearId))
    }

    const { data, error } = await query
    if (error) throw error

    let result = data || []

    if (isMyp === 'true') {
      const { data: unitsData } = await supabaseAdmin
        .from('unit')
        .select('unit_id, unit_name, is_myp')

      const mypIds = new Set(
        (unitsData || [])
          .filter(u => u.is_myp === true || (u.unit_name && u.unit_name.toUpperCase().includes('MYP')))
          .map(u => u.unit_id)
      )

      result = result.filter(k => mypIds.has(k.kelas_unit_id))
    }

    return NextResponse.json({ success: true, data: result })
  } catch (err) {
    console.error('[GET /api/class/list]', err)
    return NextResponse.json({ success: false, message: err.message }, { status: 500 })
  }
}
