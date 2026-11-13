import { NextResponse } from 'next/server'
import { getSupabaseAdmin, isMissingTableError } from '@/lib/agilityServer'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1)
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '15', 10) || 15))
    const search = (searchParams.get('search') || '').trim()
    const date = (searchParams.get('date') || '').trim()
    const interpretation = (searchParams.get('interpretation') || '').trim()

    const offset = (page - 1) * limit
    const supabaseAdmin = getSupabaseAdmin()

    let query = supabaseAdmin
      .from('agility_results')
      .select('*', { count: 'exact' })

    if (search) {
      query = query.or(`nama.ilike.%${search}%,posisi.ilike.%${search}%`)
    }
    if (date) {
      query = query.eq('tanggal', date)
    }
    if (interpretation) {
      query = query.eq('interpretation', interpretation)
    }

    const { data, count, error } = await query
      .order('id', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      return NextResponse.json(
        {
          success: false,
          tableMissing: isMissingTableError(error),
          message: error.message
        },
        { status: isMissingTableError(error) ? 200 : 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: data || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.max(1, Math.ceil((count || 0) / limit))
      }
    })
  } catch (err) {
    console.error('Unexpected error in GET /api/data/agility-check:', err)
    return NextResponse.json({ success: false, message: err.message }, { status: 500 })
  }
}
