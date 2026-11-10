import { jsPDF } from 'jspdf'
import QRCode from 'qrcode'

export const DEFAULT_GENERAL_REPORT_URL = 'https://ccs.sch.id/reportfacility'

/**
 * Generates QR Code data URL for the General Facility Report Portal
 */
export async function getGeneralReportQrDataUrl(targetUrl = DEFAULT_GENERAL_REPORT_URL) {
  return await QRCode.toDataURL(targetUrl, {
    width: 520,
    margin: 2,
    color: {
      dark: '#022c46',
      light: '#ffffff'
    }
  })
}

/**
 * Backward-compatible alias that now generates the General Reporter QR
 */
export async function getRoomQrDataUrl(customUrl) {
  const url = customUrl && customUrl.startsWith('http') ? customUrl : DEFAULT_GENERAL_REPORT_URL
  return await getGeneralReportQrDataUrl(url)
}

/**
 * Renders the General Reporter QR Sticker Card onto the current page of the jsPDF instance.
 * Perfectly centered on an A4 portrait sheet (210mm x 297mm).
 */
export async function renderGeneralReporterStickerPage(doc, { targetUrl = DEFAULT_GENERAL_REPORT_URL } = {}) {
  const qrDataUrl = await getGeneralReportQrDataUrl(targetUrl)

  // Card Dimensions (Centered on A4)
  const cardW = 140
  const cardH = 180
  const cardX = (210 - cardW) / 2 // 35mm
  const cardY = (297 - cardH) / 2 // 58.5mm

  // 1. Card Background & Outer Navy Border
  doc.setDrawColor(2, 44, 70) // #022c46
  doc.setLineWidth(0.8)
  doc.setFillColor(255, 255, 255)
  doc.roundedRect(cardX, cardY, cardW, cardH, 5, 5, 'FD')

  // 2. Authentic Chung Chung Christian School 3-Color Ribbon
  const ribbonMargin = 10
  const ribbonW = cardW - ribbonMargin * 2 // 120mm
  const segW = ribbonW / 3 // 40mm
  const ribbonY = cardY + 9
  const ribbonH = 2.5

  // Green / Teal (#2da397)
  doc.setFillColor(45, 163, 151)
  doc.roundedRect(cardX + ribbonMargin, ribbonY, segW, ribbonH, 1, 1, 'F')

  // Orange (#f16101)
  doc.setFillColor(241, 97, 1)
  doc.rect(cardX + ribbonMargin + segW, ribbonY, segW, ribbonH, 'F')

  // Purple (#7c4bc0)
  doc.setFillColor(124, 75, 192)
  doc.roundedRect(cardX + ribbonMargin + segW * 2, ribbonY, segW, ribbonH, 1, 1, 'F')

  // 3. School Header
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(2, 44, 70) // #022c46
  doc.text('CHUNG CHUNG CHRISTIAN SCHOOL', 105, cardY + 20, { align: 'center' })

  doc.setFontSize(9)
  doc.setTextColor(241, 97, 1) // #f16101
  doc.text('PORTAL PELAPORAN KELUHAN & FASILITAS', 105, cardY + 25.5, { align: 'center' })

  // Header Divider
  doc.setDrawColor(2, 44, 70)
  doc.setLineWidth(0.35)
  doc.line(cardX + ribbonMargin, cardY + 29, cardX + cardW - ribbonMargin, cardY + 29)

  // 4. General Heading
  doc.setFontSize(8)
  doc.setTextColor(113, 113, 122) // #71717a
  doc.text('QR CODE UMUM (GENERAL)', 105, cardY + 36, { align: 'center' })

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(15)
  doc.setTextColor(11, 72, 119) // #0b4877
  doc.text('LAPOR KELUHAN & KEBERSIHAN', 105, cardY + 43.5, { align: 'center' })

  // 5. QR Code Box & Image
  const qrBoxW = 80
  const qrBoxH = 80
  const qrBoxX = 105 - qrBoxW / 2
  const qrBoxY = cardY + 49

  doc.setFillColor(248, 250, 252) // #f8fafc
  doc.setDrawColor(226, 232, 240) // #e2e8f0
  doc.setLineWidth(0.25)
  doc.roundedRect(qrBoxX, qrBoxY, qrBoxW, qrBoxH, 4, 4, 'FD')

  // QR Image inside box
  const qrImgW = 70
  const qrImgH = 70
  const qrImgX = 105 - qrImgW / 2
  const qrImgY = qrBoxY + 5
  doc.addImage(qrDataUrl, 'PNG', qrImgX, qrImgY, qrImgW, qrImgH)

  // 6. Footer Section
  doc.setDrawColor(226, 232, 240)
  doc.setLineWidth(0.25)
  doc.line(cardX + ribbonMargin, cardY + 137, cardX + cardW - ribbonMargin, cardY + 137)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9.5)
  doc.setTextColor(2, 44, 70)
  doc.text('Pindai (Scan) QR untuk Melaporkan Keluhan / Fasilitas', 105, cardY + 145, { align: 'center' })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(113, 113, 122)
  doc.text('Foto Kondisi & Deskripsi Keluhan Wajib • Nama Pelapor Opsional', 105, cardY + 151, { align: 'center' })

  doc.setFont('courier', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(148, 163, 184)
  doc.text(targetUrl, 105, cardY + 157, { align: 'center' })
}

/**
 * Generates and triggers print/download for the General Reporter QR Sticker
 */
export async function generateGeneralReporterPDF({
  targetUrl = DEFAULT_GENERAL_REPORT_URL,
  copies = 1,
  action = 'print'
} = {}) {
  const totalCopies = Math.max(1, Math.min(50, Number(copies) || 1))
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  for (let i = 0; i < totalCopies; i++) {
    if (i > 0) {
      doc.addPage('a4', 'portrait')
    }
    await renderGeneralReporterStickerPage(doc, { targetUrl })
  }

  const filename = totalCopies > 1
    ? `Label_QR_General_Pelapor_CCS_${totalCopies}_Lembar.pdf`
    : `Label_QR_General_Pelapor_CCS.pdf`

  if (action === 'download') {
    doc.save(filename)
  } else {
    const blob = doc.output('blob')
    const blobUrl = URL.createObjectURL(blob)
    const w = window.open(blobUrl, '_blank')
    if (!w) {
      doc.save(filename)
    }
  }

  return doc
}

/**
 * Backward-compatible wrappers so any call to single/batch room PDF
 * generates the General Reporter QR PDF.
 */
export async function renderRoomStickerPage(doc) {
  return await renderGeneralReporterStickerPage(doc)
}

export async function generateSingleRoomPDF(_room, { action = 'print', targetUrl = DEFAULT_GENERAL_REPORT_URL } = {}) {
  return await generateGeneralReporterPDF({ targetUrl, copies: 1, action })
}

export async function generateBatchRoomPDF(rooms, { action = 'print', targetUrl = DEFAULT_GENERAL_REPORT_URL } = {}) {
  const count = Array.isArray(rooms) && rooms.length > 0 ? rooms.length : 1
  return await generateGeneralReporterPDF({ targetUrl, copies: count, action })
}
