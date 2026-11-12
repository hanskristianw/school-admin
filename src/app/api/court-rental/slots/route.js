import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export const DEFAULT_COURT_SLOTS = [
  // Weekday
  { id: 'def_w1', day_type: 'weekday', start_time: '16:00', end_time: '18:00', time_slot: '16:00 - 18:00', label: 'Sesi Sore', is_active: true, sort_order: 1 },
  { id: 'def_w2', day_type: 'weekday', start_time: '18:00', end_time: '20:00', time_slot: '18:00 - 20:00', label: 'Sesi Malam 1', is_active: true, sort_order: 2 },
  { id: 'def_w3', day_type: 'weekday', start_time: '20:00', end_time: '22:00', time_slot: '20:00 - 22:00', label: 'Sesi Malam 2', is_active: true, sort_order: 3 },
  // Weekend
  { id: 'def_e1', day_type: 'weekend', start_time: '06:00', end_time: '08:00', time_slot: '06:00 - 08:00', label: 'Sesi Pagi 1', is_active: true, sort_order: 1 },
  { id: 'def_e2', day_type: 'weekend', start_time: '08:00', end_time: '10:00', time_slot: '08:00 - 10:00', label: 'Sesi Pagi 2', is_active: true, sort_order: 2 },
  { id: 'def_e3', day_type: 'weekend', start_time: '10:00', end_time: '12:00', time_slot: '10:00 - 12:00', label: 'Sesi Siang 1', is_active: true, sort_order: 3 },
  { id: 'def_e4', day_type: 'weekend', start_time: '14:00', end_time: '16:00', time_slot: '14:00 - 16:00', label: 'Sesi Siang 2', is_active: true, sort_order: 4 },
  { id: 'def_e5', day_type: 'weekend', start_time: '16:00', end_time: '18:00', time_slot: '16:00 - 18:00', label: 'Sesi Sore', is_active: true, sort_order: 5 },
  { id: 'def_e6', day_type: 'weekend', start_time: '18:00', end_time: '20:00', time_slot: '18:00 - 20:00', label: 'Sesi Malam 1', is_active: true, sort_order: 6 },
  { id: 'def_e7', day_type: 'weekend', start_time: '20:00', end_time: '22:00', time_slot: '20:00 - 22:00', label: 'Sesi Malam 2', is_active: true, sort_order: 7 }
]

// GET: Ambil seluruh konfigurasi sesi jam sewa lapangan
export async function GET() {
  try {
    const { data: slots, error } = await supabaseAdmin
      .from('court_time_slots')
      .select('*')
      .order('day_type', { ascending: false })
      .order('sort_order', { ascending: true })

    if (error) {
      if (error.code === '42P01') {
        // Tabel belum dibuat di Supabase, kembalikan default
        return NextResponse.json({
          success: true,
          tableExists: false,
          slots: DEFAULT_COURT_SLOTS
        })
      }
      return NextResponse.json({ success: false, message: error.message }, { status: 500 })
    }

    if (!slots || slots.length === 0) {
      return NextResponse.json({
        success: true,
        tableExists: true,
        slots: DEFAULT_COURT_SLOTS
      })
    }

    return NextResponse.json({
      success: true,
      tableExists: true,
      slots
    })
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 })
  }
}

// POST: Tambah sesi jam sewa baru
export async function POST(request) {
  try {
    const body = await request.json()
    const { day_type = 'weekday', start_time, end_time, label = '', sort_order = 1, is_active = true } = body

    if (!start_time || !end_time) {
      return NextResponse.json({ success: false, message: 'Jam mulai dan jam selesai wajib diisi' }, { status: 400 })
    }

    const time_slot = `${start_time.slice(0, 5)} - ${end_time.slice(0, 5)}`

    const { data, error } = await supabaseAdmin
      .from('court_time_slots')
      .insert([
        {
          day_type,
          start_time,
          end_time,
          time_slot,
          label: label || null,
          sort_order: Number(sort_order) || 1,
          is_active: Boolean(is_active)
        }
      ])
      .select()
      .single()

    if (error) {
      if (error.code === '42P01') {
        return NextResponse.json({
          success: false,
          tableExists: false,
          message: 'Tabel court_time_slots belum dibuat di Supabase. Jalankan skrip migrations/add-court-time-slots-table.sql.'
        }, { status: 400 })
      }
      return NextResponse.json({ success: false, message: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, slot: data })
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 })
  }
}

// PUT: Perbarui status aktif/nonaktif atau data sesi jam
export async function PUT(request) {
  try {
    const body = await request.json()
    const { id, is_active, label, sort_order, start_time, end_time } = body

    if (!id) {
      return NextResponse.json({ success: false, message: 'ID slot diperlukan' }, { status: 400 })
    }

    const updateFields = {
      updated_at: new Date().toISOString()
    }

    if (typeof is_active === 'boolean') updateFields.is_active = is_active
    if (label !== undefined) updateFields.label = label
    if (sort_order !== undefined) updateFields.sort_order = Number(sort_order)
    if (start_time && end_time) {
      updateFields.start_time = start_time
      updateFields.end_time = end_time
      updateFields.time_slot = `${start_time.slice(0, 5)} - ${end_time.slice(0, 5)}`
    }

    const { data, error } = await supabaseAdmin
      .from('court_time_slots')
      .update(updateFields)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ success: false, message: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, slot: data })
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 })
  }
}

// DELETE: Hapus sesi jam
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ success: false, message: 'ID slot diperlukan' }, { status: 400 })
    }

    const { error } = await supabaseAdmin
      .from('court_time_slots')
      .delete()
      .eq('id', id)

    if (error) {
      return NextResponse.json({ success: false, message: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Sesi jam berhasil dihapus' })
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 })
  }
}
