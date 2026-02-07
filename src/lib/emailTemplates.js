/**
 * HTML email templates for admission notifications
 * Matches the WhatsApp notification templates but with richer formatting
 */

const baseStyle = `
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; margin: 0; padding: 0; }
  .container { max-width: 560px; margin: 24px auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.08); }
  .header { background: linear-gradient(135deg, #059669, #0d9488); color: #fff; padding: 32px 24px; text-align: center; }
  .header h1 { margin: 0; font-size: 22px; font-weight: 600; }
  .header p { margin: 8px 0 0; opacity: 0.9; font-size: 14px; }
  .body { padding: 28px 24px; color: #333; line-height: 1.6; }
  .detail-box { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 16px; margin: 16px 0; }
  .detail-box.rejected { background: #fef2f2; border-color: #fecaca; }
  .detail-box.review { background: #eff6ff; border-color: #bfdbfe; }
  .detail-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; }
  .detail-label { color: #666; }
  .detail-value { font-weight: 600; color: #111; }
  .footer { padding: 16px 24px; text-align: center; font-size: 12px; color: #999; border-top: 1px solid #f0f0f0; }
  .badge { display: inline-block; padding: 4px 14px; border-radius: 999px; font-size: 13px; font-weight: 600; }
  .badge-success { background: #d1fae5; color: #065f46; }
  .badge-danger { background: #fee2e2; color: #991b1b; }
  .badge-info { background: #dbeafe; color: #1e40af; }
`

function wrapHtml(content) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>${baseStyle}</style></head>
<body>${content}</body>
</html>`
}

export const emailTemplates = {
  admissionReceived: ({ parentName, studentName, applicationNumber, schoolName }) => {
    const subject = `Pendaftaran Diterima — ${applicationNumber}`
    const html = wrapHtml(`
      <div class="container">
        <div class="header">
          <h1>📋 Pendaftaran Berhasil</h1>
          <p>Chung Chung Christian School</p>
        </div>
        <div class="body">
          <p>Yth. <strong>${parentName}</strong>,</p>
          <p>Terima kasih telah mendaftarkan putra/putri Anda di <strong>Chung Chung Christian School</strong>.</p>
          
          <div class="detail-box">
            <div class="detail-row"><span class="detail-label">Nama Siswa</span><span class="detail-value">${studentName}</span></div>
            <div class="detail-row"><span class="detail-label">No. Pendaftaran</span><span class="detail-value">${applicationNumber}</span></div>
            <div class="detail-row"><span class="detail-label">Sekolah Tujuan</span><span class="detail-value">${schoolName || '-'}</span></div>
          </div>
          
          <p>Kami akan segera meninjau pendaftaran Anda dan menginformasikan hasilnya melalui email atau WhatsApp.</p>
          <p>Simpan nomor pendaftaran <strong>${applicationNumber}</strong> untuk mengecek status pendaftaran Anda.</p>
        </div>
        <div class="footer">
          Pesan ini dikirim otomatis oleh sistem CCS — Chung Chung Christian School
        </div>
      </div>
    `)
    return { subject, html }
  },

  admissionApproved: ({ parentName, studentName, applicationNumber }) => {
    const subject = `🎉 Pendaftaran Diterima — ${applicationNumber}`
    const html = wrapHtml(`
      <div class="container">
        <div class="header">
          <h1>🎉 Pendaftaran Diterima!</h1>
          <p>Chung Chung Christian School</p>
        </div>
        <div class="body">
          <p>Yth. <strong>${parentName}</strong>,</p>
          <p>Selamat! Pendaftaran putra/putri Anda telah <span class="badge badge-success">DITERIMA</span>.</p>
          
          <div class="detail-box">
            <div class="detail-row"><span class="detail-label">Nama Siswa</span><span class="detail-value">${studentName}</span></div>
            <div class="detail-row"><span class="detail-label">No. Pendaftaran</span><span class="detail-value">${applicationNumber}</span></div>
          </div>
          
          <p>Silakan hubungi pihak sekolah untuk langkah selanjutnya.</p>
        </div>
        <div class="footer">
          Pesan ini dikirim otomatis oleh sistem CCS — Chung Chung Christian School
        </div>
      </div>
    `)
    return { subject, html }
  },

  admissionRejected: ({ parentName, studentName, applicationNumber }) => {
    const subject = `Informasi Pendaftaran — ${applicationNumber}`
    const html = wrapHtml(`
      <div class="container">
        <div class="header" style="background: linear-gradient(135deg, #dc2626, #ef4444);">
          <h1>Informasi Pendaftaran</h1>
          <p>Chung Chung Christian School</p>
        </div>
        <div class="body">
          <p>Yth. <strong>${parentName}</strong>,</p>
          <p>Mohon maaf, pendaftaran putra/putri Anda <span class="badge badge-danger">belum dapat kami terima</span> saat ini.</p>
          
          <div class="detail-box rejected">
            <div class="detail-row"><span class="detail-label">Nama Siswa</span><span class="detail-value">${studentName}</span></div>
            <div class="detail-row"><span class="detail-label">No. Pendaftaran</span><span class="detail-value">${applicationNumber}</span></div>
          </div>
          
          <p>Silakan hubungi pihak sekolah untuk informasi lebih lanjut.</p>
        </div>
        <div class="footer">
          Pesan ini dikirim otomatis oleh sistem CCS — Chung Chung Christian School
        </div>
      </div>
    `)
    return { subject, html }
  },

  admissionUnderReview: ({ parentName, studentName, applicationNumber }) => {
    const subject = `Pendaftaran Dalam Peninjauan — ${applicationNumber}`
    const html = wrapHtml(`
      <div class="container">
        <div class="header" style="background: linear-gradient(135deg, #2563eb, #3b82f6);">
          <h1>📝 Sedang Ditinjau</h1>
          <p>Chung Chung Christian School</p>
        </div>
        <div class="body">
          <p>Yth. <strong>${parentName}</strong>,</p>
          <p>Pendaftaran putra/putri Anda sedang dalam proses <span class="badge badge-info">peninjauan</span>.</p>
          
          <div class="detail-box review">
            <div class="detail-row"><span class="detail-label">Nama Siswa</span><span class="detail-value">${studentName}</span></div>
            <div class="detail-row"><span class="detail-label">No. Pendaftaran</span><span class="detail-value">${applicationNumber}</span></div>
          </div>
          
          <p>Kami akan segera menginformasikan hasilnya melalui email atau WhatsApp.</p>
        </div>
        <div class="footer">
          Pesan ini dikirim otomatis oleh sistem CCS — Chung Chung Christian School
        </div>
      </div>
    `)
    return { subject, html }
  }
}
