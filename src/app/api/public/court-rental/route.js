import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const EXPECTED_SECRET = process.env.COURT_RENTAL_SECRET_KEY

function verifyAuth(request) {
  const authHeader = request.headers.get('authorization') || ''
  const token = authHeader.replace(/^Bearer\s+/i, '').trim()
  return token === EXPECTED_SECRET
}

// POST: Terima pesanan baru dari formulir cPanel PHP
export async function POST(request) {
  try {
    if (!verifyAuth(request)) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized: Invalid API secret token' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const {
      booking_code,
      package_type,
      package_name,
      price,
      booking_date,
      time_slot,
      renter_name,
      renter_phone,
      renter_email,
      renter_org,
      renter_purpose,
      payment_proof_file,
      hosting_url,
      status
    } = body

    if (!booking_code || !booking_date || !time_slot || !renter_name || !renter_phone || !renter_email || !payment_proof_file) {
      return NextResponse.json(
        { success: false, message: 'Data permohonan sewa lapangan tidak lengkap (bukti transfer pembayaran wajib diunggah)' },
        { status: 400 }
      )
    }

    // Cek apakah tabel court_rentals sudah ada di Supabase
    const { data: existingBookings, error: checkErr } = await supabaseAdmin
      .from('court_rentals')
      .select('id, status')
      .eq('booking_date', booking_date)
      .eq('time_slot', time_slot)
      .in('status', ['pending_payment', 'payment_uploaded', 'approved'])

    if (checkErr && checkErr.code === '42P01') {
      // Tabel belum ada, return informative error
      return NextResponse.json({
        success: false,
        message: 'Tabel court_rentals belum dibuat di Supabase. Jalankan skrip migrations/create-court-rental-tables.sql.',
        code: 'TABLE_NOT_FOUND'
      }, { status: 503 })
    }

    if (existingBookings && existingBookings.length > 0) {
      return NextResponse.json(
        { success: false, message: 'Maaf, sesi jam tersebut baru saja dipesan orang lain.' },
        { status: 409 }
      )
    }

    // Cek blackout dates
    const { data: blackouts } = await supabaseAdmin
      .from('court_blackout_dates')
      .select('*')
      .eq('date', booking_date)

    if (blackouts && blackouts.length > 0) {
      const isBlocked = blackouts.some(b => !b.time_slot || b.time_slot === time_slot)
      if (isBlocked) {
        return NextResponse.json(
          { success: false, message: 'Maaf, sesi jam tersebut sedang digunakan untuk kegiatan sekolah.' },
          { status: 409 }
        )
      }
    }

    const newBooking = {
      booking_code,
      package_type: package_type || 'paket_1',
      package_name: package_name || 'Price List Persewaan Lapangan CCS',
      price: price || 0,
      booking_date,
      time_slot,
      renter_name,
      renter_phone,
      renter_email,
      renter_org: renter_org || null,
      renter_purpose: renter_purpose || null,
      payment_proof_file: payment_proof_file || null,
      hosting_url: hosting_url || null,
      status: status || (payment_proof_file ? 'payment_uploaded' : 'pending_payment'),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    const { data: inserted, error: insertErr } = await supabaseAdmin
      .from('court_rentals')
      .insert([newBooking])
      .select()
      .single()

    if (insertErr) {
      console.error('[CourtRental API] Insert error:', insertErr)
      return NextResponse.json(
        { success: false, message: `Gagal menyimpan ke Supabase: ${insertErr.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Pesanan sewa lapangan berhasil disinkronkan ke sistem.',
      booking: inserted
    })
  } catch (err) {
    console.error('[CourtRental API] Unexpected error:', err)
    return NextResponse.json(
      { success: false, message: `Internal server error: ${err.message}` },
      { status: 500 }
    )
  }
}

// GET: Mengambil ketersediaan slot untuk tanggal tertentu
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { success: false, message: 'Parameter date (YYYY-MM-DD) diperlukan' },
        { status: 400 }
      )
    }

    // Ambil blackout dates untuk tanggal tersebut
    const { data: blackouts } = await supabaseAdmin
      .from('court_blackout_dates')
      .select('*')
      .eq('date', date)

    // Ambil bookings aktif untuk tanggal tersebut
    const { data: bookings } = await supabaseAdmin
      .from('court_rentals')
      .select('time_slot, status')
      .eq('booking_date', date)
      .in('status', ['pending_payment', 'payment_uploaded', 'approved'])

    return NextResponse.json({
      success: true,
      date,
      blackouts: blackouts || [],
      bookedSlots: (bookings || []).map(b => b.time_slot)
    })
  } catch (err) {
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 }
    )
  }
}
