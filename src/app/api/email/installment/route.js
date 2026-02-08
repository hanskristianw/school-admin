import { NextResponse } from 'next/server'
import { sendEmail } from '@/lib/mailer'

/**
 * POST /api/email/installment
 * 
 * Send installment agreement PDF to parent via Resend
 * Body: { email, parentName, studentName, applicationNumber, unitName, pdfBase64, fileName }
 */
export async function POST(request) {
  try {
    const body = await request.json()
    const { email, parentName, studentName, applicationNumber, unitName, pdfBase64, fileName } = body

    if (!email || !pdfBase64) {
      return NextResponse.json(
        { success: false, message: 'Email dan PDF wajib diisi' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, message: 'Format email tidak valid' },
        { status: 400 }
      )
    }

    // Check env vars
    if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL) {
      console.warn('⚠️ RESEND_API_KEY or RESEND_FROM_EMAIL not set')
      return NextResponse.json(
        { success: false, message: 'Email belum dikonfigurasi (RESEND_API_KEY)' },
        { status: 503 }
      )
    }

    const subject = `Perjanjian Pembayaran Cicilan — ${applicationNumber}`

    const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; margin: 0; padding: 0; }
  .container { max-width: 560px; margin: 24px auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.08); }
  .header { background: linear-gradient(135deg, #7c3aed, #6d28d9); color: #fff; padding: 32px 24px; text-align: center; }
  .header h1 { margin: 0; font-size: 20px; font-weight: 600; }
  .header p { margin: 8px 0 0; opacity: 0.9; font-size: 14px; }
  .body { padding: 28px 24px; color: #333; line-height: 1.6; }
  .detail-box { background: #f5f3ff; border: 1px solid #ddd6fe; border-radius: 12px; padding: 16px; margin: 16px 0; }
  .detail-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; }
  .detail-label { color: #666; }
  .detail-value { font-weight: 600; color: #111; }
  .footer { padding: 16px 24px; text-align: center; font-size: 12px; color: #999; border-top: 1px solid #f0f0f0; }
  .note { background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 12px; margin-top: 16px; font-size: 13px; color: #92400e; }
</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📋 Perjanjian Pembayaran Cicilan</h1>
      <p>Chung Chung Christian School</p>
    </div>
    <div class="body">
      <p>Yth. <strong>${parentName || 'Bapak/Ibu'}</strong>,</p>
      <p>Terlampir adalah <strong>Surat Perjanjian Pembayaran Biaya Pendidikan</strong> untuk putra/putri Anda di Chung Chung Christian School.</p>
      
      <div class="detail-box">
        <div class="detail-row"><span class="detail-label">Nama Siswa</span><span class="detail-value">${studentName || '-'}</span></div>
        <div class="detail-row"><span class="detail-label">No. Pendaftaran</span><span class="detail-value">${applicationNumber || '-'}</span></div>
        <div class="detail-row"><span class="detail-label">Jenjang</span><span class="detail-value">${unitName || '-'}</span></div>
      </div>
      
      <p>Silakan unduh dan cetak dokumen terlampir, kemudian tandatangani dan serahkan ke pihak sekolah pada saat pembayaran Uang Tanda Jadi (UTJ).</p>
      
      <div class="note">
        ⚠️ <strong>Penting:</strong> Dokumen ini harus ditandatangani oleh orang tua/wali murid dan diserahkan ke sekolah sebagai bukti persetujuan skema pembayaran.
      </div>
    </div>
    <div class="footer">
      Pesan ini dikirim otomatis oleh sistem CCS — Chung Chung Christian School<br/>
      Jl. Raya Gn. Anyar Sawah No.18, Surabaya | Telp: (031) 5017171
    </div>
  </div>
</body>
</html>`

    const result = await sendEmail({
      to: email,
      subject,
      html,
      attachments: [
        {
          filename: fileName || 'Perjanjian_Cicilan.pdf',
          content: pdfBase64
        }
      ]
    })

    return NextResponse.json({
      success: true,
      message: 'Email perjanjian cicilan terkirim',
      detail: result
    })

  } catch (error) {
    console.error('Email installment error:', error)
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    )
  }
}
