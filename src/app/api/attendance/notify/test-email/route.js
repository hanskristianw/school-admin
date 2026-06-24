import { NextResponse } from 'next/server'
import { sendEmail } from '@/lib/mailer'
import { emailTemplates } from '@/lib/emailTemplates'

/**
 * POST /api/attendance/notify/test-email
 *
 * Sends a test email with all 4 violation types to the specified address.
 * No auth required (admin only page calls this), but protected by being server-only.
 *
 * Body: { email: "test@example.com" }
 */
export async function POST(request) {
  try {
    const { email } = await request.json()

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { success: false, message: 'Email tidak valid' },
        { status: 400 }
      )
    }

    if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL) {
      return NextResponse.json(
        { success: false, message: 'RESEND_API_KEY atau RESEND_FROM_EMAIL belum dikonfigurasi di .env' },
        { status: 503 }
      )
    }

    const today = new Date()
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
                    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
    const dateLabel = `${days[today.getDay()]}, ${today.getDate()} ${months[today.getMonth()]} ${today.getFullYear()}`

    const results = []

    // ── Test 1: Terlambat ────────────────────────────────────────────────────
    try {
      const { subject, html } = emailTemplates.attendanceLate({
        userName: 'Budi Santoso (Test)',
        date: dateLabel,
        issues: [{
          type: 'late',
          scheduledTime: '07:30',
          actualTime: '08:15',
          minutesDiff: 45
        }]
      })
      await sendEmail({ to: email, subject: `[TEST] ${subject}`, html })
      results.push({ type: 'late', label: '🕐 Terlambat', status: 'ok' })
    } catch (e) {
      results.push({ type: 'late', label: '🕐 Terlambat', status: 'error', error: e.message })
    }

    // ── Test 2: Pulang Awal ──────────────────────────────────────────────────
    try {
      const { subject, html } = emailTemplates.attendanceLate({
        userName: 'Siti Rahayu (Test)',
        date: dateLabel,
        issues: [{
          type: 'leave_early',
          scheduledTime: '16:00',
          actualTime: '14:30',
          minutesDiff: 90
        }]
      })
      await sendEmail({ to: email, subject: `[TEST] ${subject}`, html })
      results.push({ type: 'leave_early', label: '🚪 Pulang Awal', status: 'ok' })
    } catch (e) {
      results.push({ type: 'leave_early', label: '🚪 Pulang Awal', status: 'error', error: e.message })
    }

    // ── Test 3: Tidak Check-In ───────────────────────────────────────────────
    try {
      const { subject, html } = emailTemplates.attendanceLate({
        userName: 'Ahmad Fauzi (Test)',
        date: dateLabel,
        issues: [{
          type: 'no_checkin',
          scheduledTime: '07:30',
          actualTime: null,
          minutesDiff: null
        }]
      })
      await sendEmail({ to: email, subject: `[TEST] ${subject}`, html })
      results.push({ type: 'no_checkin', label: '❌ Tidak Check-In', status: 'ok' })
    } catch (e) {
      results.push({ type: 'no_checkin', label: '❌ Tidak Check-In', status: 'error', error: e.message })
    }

    // ── Test 4: Tidak Check-Out ──────────────────────────────────────────────
    try {
      const { subject, html } = emailTemplates.attendanceLate({
        userName: 'Dewi Lestari (Test)',
        date: dateLabel,
        issues: [{
          type: 'no_checkout',
          scheduledTime: '16:00',
          actualTime: null,
          minutesDiff: null
        }]
      })
      await sendEmail({ to: email, subject: `[TEST] ${subject}`, html })
      results.push({ type: 'no_checkout', label: '⚠️ Tidak Check-Out', status: 'ok' })
    } catch (e) {
      results.push({ type: 'no_checkout', label: '⚠️ Tidak Check-Out', status: 'error', error: e.message })
    }

    // ── Test 5: Gabungan (multiple issues) ───────────────────────────────────
    try {
      const { subject, html } = emailTemplates.attendanceLate({
        userName: 'Eko Prasetyo (Test)',
        date: dateLabel,
        issues: [
          { type: 'late',        scheduledTime: '07:30', actualTime: '08:00', minutesDiff: 30 },
          { type: 'leave_early', scheduledTime: '16:00', actualTime: '15:00', minutesDiff: 60 }
        ]
      })
      await sendEmail({ to: email, subject: `[TEST] ${subject}`, html })
      results.push({ type: 'combined', label: '🔀 Gabungan (Terlambat + Pulang Awal)', status: 'ok' })
    } catch (e) {
      results.push({ type: 'combined', label: '🔀 Gabungan', status: 'error', error: e.message })
    }

    // ── Test 6: Rekap Admin ──────────────────────────────────────────────────
    try {
      const { subject, html } = emailTemplates.attendanceSummaryAdmin({
        date: dateLabel,
        violations: [
          { userName: 'Budi Santoso',  roleName: 'Teacher', unitName: 'SD',   type: 'late',        scheduledTime: '07:30', actualTime: '08:15', minutesDiff: 45 },
          { userName: 'Siti Rahayu',   roleName: 'Staff',   unitName: 'SMP',  type: 'leave_early', scheduledTime: '16:00', actualTime: '14:30', minutesDiff: 90 },
          { userName: 'Ahmad Fauzi',   roleName: 'Teacher', unitName: 'SMA',  type: 'no_checkin',  scheduledTime: '07:30', actualTime: null,    minutesDiff: null },
          { userName: 'Dewi Lestari',  roleName: 'Staff',   unitName: 'SD',   type: 'no_checkout', scheduledTime: '16:00', actualTime: null,    minutesDiff: null },
        ]
      })
      await sendEmail({ to: email, subject: `[TEST] ${subject}`, html })
      results.push({ type: 'admin_summary', label: '📋 Rekap Admin', status: 'ok' })
    } catch (e) {
      results.push({ type: 'admin_summary', label: '📋 Rekap Admin', status: 'error', error: e.message })
    }

    const allOk = results.every(r => r.status === 'ok')
    const failCount = results.filter(r => r.status === 'error').length

    return NextResponse.json({
      success: allOk,
      sentTo: email,
      from: process.env.RESEND_FROM_EMAIL,
      total: results.length,
      failed: failCount,
      results,
      message: allOk
        ? `✅ Semua ${results.length} email test berhasil dikirim ke ${email}`
        : `⚠️ ${results.length - failCount} berhasil, ${failCount} gagal`
    })

  } catch (err) {
    console.error('[TestEmail] Error:', err)
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 }
    )
  }
}
