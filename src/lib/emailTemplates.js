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
  },

  // ─── Attendance Notification Templates ────────────────────────────────────

  /**
   * Sent to the individual user (teacher/staff) who had an attendance issue
   * @param {object} params
   * @param {string} params.userName - Full name of the user
   * @param {string} params.date - Date string (e.g. "Kamis, 19 Juni 2026")
   * @param {Array}  params.issues - Array of issue objects: { type, scheduledTime, actualTime, minutesDiff }
   */
  attendanceLate: ({ userName, date, issues, baseUrl }) => {
    const typeLabel = (type) => {
      switch (type) {
        case 'late':        return { icon: '🕐', label: 'Terlambat',          engLabel: 'Late Attendance',   color: '#d97706', bg: '#fef3c7', headerGrad: 'linear-gradient(135deg, #d97706, #f59e0b)' }
        case 'leave_early': return { icon: '🚪', label: 'Pulang Lebih Awal',  engLabel: 'Early Departure',  color: '#dc2626', bg: '#fee2e2', headerGrad: 'linear-gradient(135deg, #dc2626, #ef4444)' }
        case 'absent':      return { icon: '🚫', label: 'Tidak Masuk',        engLabel: 'Absence',          color: '#6b21a8', bg: '#f3e8ff', headerGrad: 'linear-gradient(135deg, #6b21a8, #9333ea)' }
        case 'no_checkin':  return { icon: '❌', label: 'Tidak Check-In',     engLabel: 'Missing Check-In', color: '#7c3aed', bg: '#ede9fe', headerGrad: 'linear-gradient(135deg, #7c3aed, #8b5cf6)' }
        case 'no_checkout': return { icon: '⚠️', label: 'Tidak Check-Out',    engLabel: 'Missing Check-Out',color: '#ea580c', bg: '#ffedd5', headerGrad: 'linear-gradient(135deg, #ea580c, #f97316)' }
        default:            return { icon: '❓', label: type,                  engLabel: type,               color: '#374151', bg: '#f3f4f6', headerGrad: 'linear-gradient(135deg, #6b7280, #9ca3af)' }
      }
    }

    const issueList = issues || []
    const primaryMeta = typeLabel(issueList[0]?.type || 'late')

    // Subject: "Notice of [Violation Type]" — use English label
    const engLabels = issueList.map(i => typeLabel(i.type).engLabel)
    const subject = issueList.length === 1
      ? `Notice of ${engLabels[0]}`
      : `Notice of ${engLabels.join(' & ')}`

    // Format duration helper
    const formatDuration = (mins) => {
      if (!mins && mins !== 0) return ''
      const h = Math.floor(mins / 60)
      const m = mins % 60
      const parts = []
      if (h > 0) parts.push(`${h} hour${h > 1 ? 's' : ''}`)
      if (m > 0) parts.push(`${m} minute${m > 1 ? 's' : ''}`)
      return parts.join(' ') || '0 minutes'
    }

    // Build one plain-text style sentence per issue (matching screenshot style)
    const issueLines = issueList.map(issue => {
      const { label } = typeLabel(issue.type)
      if (issue.type === 'late') {
        return `On <strong>${date}</strong>, you were <span style="background:#fef08a;padding:1px 4px;border-radius:3px;">late</span> by ${formatDuration(issue.minutesDiff)}.`
      } else if (issue.type === 'leave_early') {
        return `On <strong>${date}</strong>, you were <span style="background:#fef08a;padding:1px 4px;border-radius:3px;">leave early</span> by ${formatDuration(issue.minutesDiff)}.`
      } else if (issue.type === 'absent') {
        return `On <strong>${date}</strong>, you were recorded as <span style="background:#fef08a;padding:1px 4px;border-radius:3px;">absent</span> (no attendance recorded).`
      } else if (issue.type === 'no_checkin') {
        return `On <strong>${date}</strong>, there was <span style="background:#fef08a;padding:1px 4px;border-radius:3px;">no check-in record</span> found. Scheduled check-in: ${issue.scheduledTime || '—'}.`
      } else if (issue.type === 'no_checkout') {
        return `On <strong>${date}</strong>, there was <span style="background:#fef08a;padding:1px 4px;border-radius:3px;">no check-out record</span> found. Scheduled check-out: ${issue.scheduledTime || '—'}.`
      }
      return `On <strong>${date}</strong>, a <strong>${label}</strong> was recorded.`
    })

    // Portal URL — hardcoded to production domain
    const portalUrl = 'https://manageccs.online/data/attendance-excuses'

    const html = wrapHtml(`
      <div class="container">
        <div class="header" style="background: ${primaryMeta.headerGrad};">
          <h1>${issueList.length === 1 ? `${primaryMeta.icon} ${primaryMeta.engLabel}` : '⚠️ Attendance Notice'}</h1>
          <p>Chung Chung Christian School</p>
        </div>
        <div class="body">
          <p>Good Morning, <strong>${userName}</strong>.</p>
          ${issueLines.map(l => `<p>${l}</p>`).join('')}
          <p style="margin-top:16px;">
            Please fill Form in CCS Portal
            (<a href="${portalUrl}" style="color:#1d4ed8;">${portalUrl}</a>)
            &gt;&gt; Absence List<br>
            Thank you.
          </p>
          <p style="margin-top:20px;color:#444;">
            HCM Chung Chung Christian School
          </p>
          <p style="margin-top:12px;font-size:12px;color:#999;">
            This email was sent to you by <strong>Chung Chung Christian School</strong>.
            We kindly request that you <em>do not mark this email as spam.</em>
          </p>
        </div>
        <div class="footer">
          HCM Chung Chung Christian School
        </div>
      </div>
    `)
    return { subject, html }
  },

  /**
   * Sent to admin/HR with a summary table of all attendance violations for the day
   * @param {object} params
   * @param {string} params.date - Date string (e.g. "Kamis, 19 Juni 2026")
   * @param {Array}  params.violations - Array of { userName, roleName, unitName, type, scheduledTime, actualTime, minutesDiff }
   */
  attendanceSummaryAdmin: ({ date, violations }) => {
    const subject = `📋 Rekap Kehadiran ${date} — ${violations.length} Pelanggaran`

    const typeLabel = (type) => {
      switch (type) {
        case 'late':        return '🕐 Terlambat'
        case 'leave_early': return '🚪 Pulang Awal'
        case 'absent':      return '🚫 Tidak Masuk'
        case 'no_checkin':  return '❌ Tidak Check-In'
        case 'no_checkout': return '⚠️ Tidak Check-Out'
        default:            return type
      }
    }

    const rows = (violations || []).map((v, i) => {
      const bgColor = i % 2 === 0 ? '#f9fafb' : '#ffffff'
      const detail = (v.type === 'absent' || v.type === 'no_checkin' || v.type === 'no_checkout')
        ? '—'
        : `${v.actualTime} (${v.minutesDiff > 0 ? '+' : ''}${v.minutesDiff} mnt)`
      return `
        <tr style="background:${bgColor}">
          <td style="padding:8px 12px;font-size:13px;border-bottom:1px solid #f0f0f0;">${v.userName}</td>
          <td style="padding:8px 12px;font-size:13px;border-bottom:1px solid #f0f0f0;color:#6b7280;">${v.roleName || '-'}</td>
          <td style="padding:8px 12px;font-size:13px;border-bottom:1px solid #f0f0f0;color:#6b7280;">${v.unitName || '-'}</td>
          <td style="padding:8px 12px;font-size:13px;border-bottom:1px solid #f0f0f0;">${typeLabel(v.type)}</td>
          <td style="padding:8px 12px;font-size:13px;border-bottom:1px solid #f0f0f0;color:#6b7280;">${v.scheduledTime || '—'}</td>
          <td style="padding:8px 12px;font-size:13px;border-bottom:1px solid #f0f0f0;">${detail}</td>
        </tr>`
    }).join('')

    const html = wrapHtml(`
      <div class="container" style="max-width:720px;">
        <div class="header" style="background: linear-gradient(135deg, #1e40af, #3b82f6);">
          <h1>📋 Rekap Kehadiran Harian</h1>
          <p>Chung Chung Christian School — ${date}</p>
        </div>
        <div class="body">
          <p>Berikut adalah rekap pelanggaran kehadiran pada tanggal <strong>${date}</strong>:</p>
          <div class="detail-box" style="padding:0;overflow:hidden;">
            <table style="width:100%;border-collapse:collapse;">
              <thead>
                <tr style="background:#f0f9ff;">
                  <th style="padding:10px 12px;font-size:12px;text-align:left;color:#374151;border-bottom:2px solid #e5e7eb;">Nama</th>
                  <th style="padding:10px 12px;font-size:12px;text-align:left;color:#374151;border-bottom:2px solid #e5e7eb;">Role</th>
                  <th style="padding:10px 12px;font-size:12px;text-align:left;color:#374151;border-bottom:2px solid #e5e7eb;">Unit</th>
                  <th style="padding:10px 12px;font-size:12px;text-align:left;color:#374151;border-bottom:2px solid #e5e7eb;">Jenis</th>
                  <th style="padding:10px 12px;font-size:12px;text-align:left;color:#374151;border-bottom:2px solid #e5e7eb;">Seharusnya</th>
                  <th style="padding:10px 12px;font-size:12px;text-align:left;color:#374151;border-bottom:2px solid #e5e7eb;">Aktual</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
          </div>
          <p style="font-size:13px;color:#666;margin-top:16px;">
            Total: <strong>${violations.length} catatan</strong> dari mesin absensi hari ${date}.
          </p>
        </div>
        <div class="footer">
          Rekap ini dikirim otomatis setiap hari jam 00:01 WIB — Sistem Absensi CCS
        </div>
      </div>
    `)
    return { subject, html }
  }
}
