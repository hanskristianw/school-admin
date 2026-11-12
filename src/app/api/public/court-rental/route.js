import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendEmail } from '@/lib/mailer'
import { emailTemplates } from '@/lib/emailTemplates'
import { sendGoogleChatMessage } from '@/lib/googleChat'

export const dynamic = 'force-dynamic'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const EXPECTED_SECRET = process.env.COURT_RENTAL_SECRET_KEY || 'ccs_court_auth_2026_x7k9p2m4'

function verifyAuth(request) {
  const authHeader = request.headers.get('authorization') || ''
  const token = authHeader.replace(/^Bearer\s+/i, '').trim()
  return Boolean(EXPECTED_SECRET && token === EXPECTED_SECRET)
}

// Helper: Dapatkan tanggal hari ini dalam zona waktu WIB (Asia/Jakarta, UTC+7) berformat YYYY-MM-DD
function getWibTodayStr() {
  const now = new Date()
  const wibTime = new Date(now.getTime() + 7 * 60 * 60 * 1000)
  return wibTime.toISOString().slice(0, 10)
}

function addDaysToDateStr(dateStr, days) {
  const d = new Date(`${dateStr}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

// Helper: Jadwal Rutin Klub Mitra (MOU Mahameru Basketball No: 013/MARCOMCCS/XII/2025)
// Berlaku sepanjang tahun 2026:
// - Setiap Senin: 19:00 - 21:00 WIB (Memotong slot 18:00 - 20:00 & 20:00 - 22:00)
// - Setiap Sabtu: 14:00 - 16:00 WIB
// - Setiap Minggu: 14:00 - 16:00 WIB
export function getRoutineClubBlocks(dateStr) {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return []
  const d = new Date(`${dateStr}T00:00:00Z`)
  const dayOfWeek = d.getUTCDay() // 0 = Minggu, 1 = Senin, ..., 6 = Sabtu
  const year = d.getUTCFullYear()

  if (year === 2026) {
    if (dayOfWeek === 1) { // Senin (19:00 - 21:00 WIB)
      return [
        { time_slot: '18:00 - 20:00', reason: 'Jadwal Rutin: Mahameru Basketball Club (19:00 - 21:00)' },
        { time_slot: '20:00 - 22:00', reason: 'Jadwal Rutin: Mahameru Basketball Club (19:00 - 21:00)' }
      ]
    }
    if (dayOfWeek === 6) { // Sabtu (14:00 - 16:00 WIB)
      return [
        { time_slot: '14:00 - 16:00', reason: 'Jadwal Rutin: Mahameru Basketball Club' }
      ]
    }
    if (dayOfWeek === 0) { // Minggu (14:00 - 16:00 WIB)
      return [
        { time_slot: '14:00 - 16:00', reason: 'Jadwal Rutin: Mahameru Basketball Club' }
      ]
    }
  }

  return []
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

    // Validasi tanggal sewa minimal 2 hari setelah tanggal pemesanan (H+2) berbasis WIB
    const todayWib = getWibTodayStr()
    const minAllowedDateStr = addDaysToDateStr(todayWib, 2)

    if (booking_date < minAllowedDateStr) {
      return NextResponse.json(
        { success: false, message: 'Pemesanan lapangan minimal dilakukan 2 hari setelah tanggal pemesanan (H+2). Tidak dapat memesan untuk hari ini atau besok.' },
        { status: 400 }
      )
    }

    // Cek apakah slot pada tanggal tersebut sudah dipesan (status aktif)
    const { data: existingBookings, error: checkErr } = await supabaseAdmin
      .from('court_rentals')
      .select('id, booking_code, status')
      .eq('booking_date', booking_date)
      .eq('time_slot', time_slot)
      .in('status', ['pending_payment', 'payment_uploaded', 'approved'])

    if (checkErr && checkErr.code === '42P01') {
      return NextResponse.json({
        success: false,
        message: 'Tabel court_rentals belum dibuat di Supabase. Jalankan skrip migrations/create-court-rental-tables.sql.',
        code: 'TABLE_NOT_FOUND'
      }, { status: 503 })
    }

    if (existingBookings && existingBookings.length > 0) {
      return NextResponse.json(
        { success: false, message: 'Maaf, sesi jam tersebut baru saja dipesan orang lain. Silakan pilih sesi jam lain.' },
        { status: 409 }
      )
    }

    // Cek blackout dates (Agenda Sekolah)
    const { data: blackouts } = await supabaseAdmin
      .from('court_blackout_dates')
      .select('*')
      .eq('date', booking_date)

    if (blackouts && blackouts.length > 0) {
      const matchedBlackout = blackouts.find(b => !b.time_slot || b.time_slot === time_slot)
      if (matchedBlackout) {
        return NextResponse.json(
          {
            success: false,
            message: `Maaf, sesi jam tersebut tidak tersedia karena digunakan untuk kegiatan sekolah (${matchedBlackout.reason || 'Agenda Sekolah'}).`
          },
          { status: 409 }
        )
      }
    }

    // Cek jadwal rutin klub mitra (MOU Mahameru Basketball No: 013/MARCOMCCS/XII/2025)
    const routineBlocks = getRoutineClubBlocks(booking_date)
    const matchedRoutine = routineBlocks.find(r => r.time_slot === time_slot)
    if (matchedRoutine) {
      return NextResponse.json(
        {
          success: false,
          message: `Maaf, sesi jam tersebut tidak dapat disewa untuk umum karena telah terisi ${matchedRoutine.reason}.`
        },
        { status: 409 }
      )
    }

    const newBooking = {
      booking_code: String(booking_code).trim().toUpperCase(),
      package_type: package_type || 'paket_1',
      package_name: package_name || 'Price List Persewaan Lapangan CCS',
      price: Number(price || 0),
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
      // Tangani race condition jika terjadi benturan insert di milidetik yang persis sama
      if (insertErr.code === '23505') {
        return NextResponse.json(
          { success: false, message: 'Maaf, sesi jam tersebut baru saja dipesan orang lain secara bersamaan. Silakan pilih sesi jam lain.' },
          { status: 409 }
        )
      }
      return NextResponse.json(
        { success: false, message: `Gagal menyimpan ke Supabase: ${insertErr.message}` },
        { status: 500 }
      )
    }

    // Kirim email notifikasi penerimaan pesanan ke penyewa via Resend (sesuai standar modul admission)
    let emailSent = false
    let emailError = null
    const cleanEmail = renter_email ? String(renter_email).trim() : ''
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

    if (cleanEmail && emailRegex.test(cleanEmail)) {
      try {
        if (emailTemplates && emailTemplates.courtRentalSubmitted) {
          const { subject, html } = emailTemplates.courtRentalSubmitted({
            renterName: inserted.renter_name,
            bookingCode: inserted.booking_code,
            packageName: inserted.package_name,
            price: Number(inserted.price || 0),
            bookingDate: inserted.booking_date,
            timeSlot: inserted.time_slot,
            status: inserted.status,
            hostingUrl: inserted.hosting_url || hosting_url
          })

          await sendEmail({
            to: cleanEmail,
            subject,
            html
          })
          emailSent = true
          console.log(`[CourtRental API] Notification email sent successfully to ${cleanEmail} for ${inserted.booking_code}`)
        }
      } catch (mailErr) {
        console.error('[CourtRental API] Failed to send notification email:', mailErr.message)
        emailError = mailErr.message
      }
    } else {
      console.warn(`[CourtRental API] Invalid or empty renter_email: "${renter_email}", skipping email dispatch`)
    }

    // Kirim notifikasi ke Staf / Markom yang terkonfigurasi (Email & Google Chat)
    try {
      const { data: markomSetting } = await supabaseAdmin
        .from('settings')
        .select('value')
        .eq('key', 'court_rental_markom_recipients')
        .maybeSingle()

      let markomRecipients = []
      if (markomSetting?.value) {
        markomRecipients = typeof markomSetting.value === 'string'
          ? JSON.parse(markomSetting.value)
          : markomSetting.value
      }

      if (Array.isArray(markomRecipients) && markomRecipients.length > 0) {
        const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'https://manageccs.online'
        const dashboardUrl = `${appBaseUrl.replace(/\/$/, '')}/data/court-rental`

        for (const recipient of markomRecipients) {
          if (!recipient || recipient.is_active === false || !recipient.user_email) continue

          const recipientEmail = String(recipient.user_email).trim()
          const recipientName = recipient.user_nama_depan || 'Tim Markom'

          // 1. Notifikasi Email ke Markom
          if (recipient.notify_email !== false && emailRegex.test(recipientEmail)) {
            try {
              if (emailTemplates && emailTemplates.courtRentalMarkomAlert) {
                const { subject: markomSubject, html: markomHtml } = emailTemplates.courtRentalMarkomAlert({
                  recipientName,
                  bookingCode: inserted.booking_code,
                  renterName: inserted.renter_name,
                  renterPhone: inserted.renter_phone,
                  renterEmail: inserted.renter_email,
                  renterOrg: inserted.renter_org,
                  renterPurpose: inserted.renter_purpose,
                  packageName: inserted.package_name,
                  price: Number(inserted.price || 0),
                  bookingDate: inserted.booking_date,
                  timeSlot: inserted.time_slot,
                  dashboardUrl
                })

                await sendEmail({
                  to: recipientEmail,
                  subject: markomSubject,
                  html: markomHtml
                })
                console.log(`[CourtRental API] Markom alert email sent to ${recipientEmail} for ${inserted.booking_code}`)
              }
            } catch (markomMailErr) {
              console.warn(`[CourtRental API] Failed sending Markom email to ${recipientEmail}:`, markomMailErr.message)
            }
          }

          // 2. Notifikasi Google Chat Bot ke Markom
          if (recipient.notify_google_chat !== false && emailRegex.test(recipientEmail)) {
            try {
              const formattedPrice = `Rp ${Number(inserted.price || 0).toLocaleString('id-ID')},-`
              const chatText = `🏸 *Pesanan Baru Sewa Lapangan — Sport Hall CCS*\n\n` +
                `Halo *${recipientName}*, ada permohonan reservasi sewa lapangan baru yang masuk melalui website:\n\n` +
                `📌 *Kode Booking:* *${inserted.booking_code}*\n` +
                `👤 *Nama Pemesan:* ${inserted.renter_name}\n` +
                `📱 *No. WhatsApp:* ${inserted.renter_phone || '-'}\n` +
                `✉️ *Email:* ${inserted.renter_email || '-'}\n` +
                `🏢 *Klub / Komunitas:* ${inserted.renter_org || 'Pribadi / Umum'}\n` +
                `🎯 *Tujuan:* ${inserted.renter_purpose || '-'}\n` +
                `📅 *Tanggal Bermain:* *${inserted.booking_date}*\n` +
                `⏰ *Sesi Jam:* *${inserted.time_slot}*\n` +
                `📦 *Paket:* ${inserted.package_name}\n` +
                `💰 *Total Biaya:* ${formattedPrice}\n` +
                `📋 *Status:* Menunggu Verifikasi Bukti Pembayaran\n\n` +
                `⏱️ *Catatan Waktu:* Pemesan telah diinformasikan bahwa pesanan diproses < 1x24 jam.\n\n` +
                `🌐 *Buka Dashboard untuk Review & Verifikasi:*\n${dashboardUrl}`

              await sendGoogleChatMessage(recipientEmail, chatText)
              console.log(`[CourtRental API] Google Chat notification sent to ${recipientEmail} for ${inserted.booking_code}`)
            } catch (chatErr) {
              console.warn(`[CourtRental API] Failed sending Google Chat alert to ${recipientEmail}:`, chatErr.message)
            }
          }
        }
      }
    } catch (markomErr) {
      console.warn('[CourtRental API] Could not process Markom notifications:', markomErr.message)
    }

    return NextResponse.json({
      success: true,
      message: 'Pesanan sewa lapangan berhasil disinkronkan ke sistem.',
      booking: inserted,
      emailSent,
      emailError
    })
  } catch (err) {
    console.error('[CourtRental API] Unexpected error:', err)
    return NextResponse.json(
      { success: false, message: `Internal server error: ${err.message}` },
      { status: 500 }
    )
  }
}

// GET: Mengambil ketersediaan slot per tanggal ATAU mengecek status booking berdasarkan booking_code
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')
    const bookingCode = searchParams.get('booking_code')

    // Mode 1: Cek status booking spesifik berdasarkan kode reservasi
    if (bookingCode && bookingCode.trim()) {
      const cleanCode = bookingCode.trim().toUpperCase()
      const { data: booking, error } = await supabaseAdmin
        .from('court_rentals')
        .select('booking_code, package_type, package_name, price, booking_date, time_slot, renter_name, renter_phone, renter_email, renter_org, renter_purpose, payment_proof_file, status, admin_notes, approved_by, approved_at, created_at, updated_at')
        .ilike('booking_code', cleanCode)
        .maybeSingle()

      if (error) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 })
      }

      if (!booking) {
        return NextResponse.json({ success: false, found: false, message: 'Kode booking tidak ditemukan' }, { status: 404 })
      }

      return NextResponse.json({
        success: true,
        found: true,
        booking
      })
    }

    // Mode 2: Cek ketersediaan slot & blackout pada tanggal tertentu
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { success: false, message: 'Parameter date (YYYY-MM-DD) atau booking_code diperlukan' },
        { status: 400 }
      )
    }

    // Ambil blackout dates untuk tanggal tersebut
    const { data: blackouts } = await supabaseAdmin
      .from('court_blackout_dates')
      .select('*')
      .eq('date', date)

    // Ambil semua bookings pada tanggal tersebut
    const { data: allBookingsOnDate } = await supabaseAdmin
      .from('court_rentals')
      .select('booking_code, time_slot, status, admin_notes')
      .eq('booking_date', date)

    const activeStatuses = ['pending_payment', 'payment_uploaded', 'approved']
    const bookedSlots = (allBookingsOnDate || [])
      .filter(b => activeStatuses.includes(b.status))
      .map(b => b.time_slot)

    // Ambil konfigurasi master sesi jam (court_time_slots) sesuai hari (weekday vs weekend)
    const dObj = new Date(`${date}T00:00:00Z`)
    const dayOfWeek = dObj.getUTCDay() // 0 = Minggu, 6 = Sabtu
    const dayType = (dayOfWeek === 0 || dayOfWeek === 6) ? 'weekend' : 'weekday'

    let configuredSlots = []
    try {
      const { data: dbSlots, error: slotsErr } = await supabaseAdmin
        .from('court_time_slots')
        .select('id, time_slot, label, sort_order')
        .eq('day_type', dayType)
        .eq('is_active', true)
        .order('sort_order', { ascending: true })

      if (!slotsErr && dbSlots && dbSlots.length > 0) {
        configuredSlots = dbSlots.map(s => s.time_slot)
      }
    } catch (slotFetchErr) {
      console.warn('[CourtRental API] Failed to fetch court_time_slots:', slotFetchErr.message)
    }

    // Fallback jika tabel belum dibuat atau belum ada data slot aktif
    if (configuredSlots.length === 0) {
      configuredSlots = dayType === 'weekend'
        ? [
            '06:00 - 08:00',
            '08:00 - 10:00',
            '10:00 - 12:00',
            '14:00 - 16:00',
            '16:00 - 18:00',
            '18:00 - 20:00',
            '20:00 - 22:00'
          ]
        : [
            '16:00 - 18:00',
            '18:00 - 20:00',
            '20:00 - 22:00'
          ]
    }

    // Ambil jadwal rutin klub mitra (MOU Mahameru Basketball Club)
    const routineBlocks = getRoutineClubBlocks(date)
    const combinedBlackouts = [
      ...(blackouts || []),
      ...routineBlocks.map(r => ({
        id: `routine_${r.time_slot}`,
        date,
        time_slot: r.time_slot,
        reason: r.reason,
        is_routine: true
      }))
    ]

    return NextResponse.json({
      success: true,
      date,
      day_type: dayType,
      available_slots: configuredSlots,
      blackouts: combinedBlackouts,
      bookedSlots,
      bookings: allBookingsOnDate || []
    })
  } catch (err) {
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 }
    )
  }
}
