import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('court_blackout_dates')
      .select('*')
      .order('date', { ascending: true })

    if (error) {
      if (error.code === '42P01') {
        return NextResponse.json({ success: true, blackoutDates: [] })
      }
      return NextResponse.json({ success: false, message: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, blackoutDates: data || [] })
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { date, time_slot, reason } = body

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ success: false, message: 'Format tanggal harus YYYY-MM-DD' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('court_blackout_dates')
      .insert([{
        date,
        time_slot: time_slot || null,
        reason: reason || 'Kegiatan Sekolah'
      }])
      .select()
      .single()

    if (error) {
      return NextResponse.json({ success: false, message: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, blackoutDate: data })
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 })
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ success: false, message: 'ID blackout date diperlukan' }, { status: 400 })
    }

    const { error } = await supabaseAdmin
      .from('court_blackout_dates')
      .delete()
      .eq('id', id)

    if (error) {
      return NextResponse.json({ success: false, message: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Jadwal blackout berhasil dihapus' })
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 })
  }
}
