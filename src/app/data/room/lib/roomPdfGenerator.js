import { jsPDF } from 'jspdf'
import QRCode from 'qrcode'

const BASE_CHECKLIST_URL = 'https://ccs.sch.id/checklist/'

/**
 * Generates QR Code data URL for a room
 */
export async function getRoomQrDataUrl(tokenOrId) {
  const targetUrl = `${BASE_CHECKLIST_URL}?room=${tokenOrId}`
  return await QRCode.toDataURL(targetUrl, {
    width: 500,
    margin: 2,
    color: {
      dark: '#022c46',
      light: '#ffffff'
    }
  })
}

/**
 * Renders a single door sticker card onto the current page of the jsPDF instance.
 * Perfectly centered on an A4 portrait sheet (210mm x 297mm).
 */
export async function renderRoomStickerPage(doc, room) {
  const token = room.qr_code_token || 'rm_' + room.room_id
  const qrDataUrl = await getRoomQrDataUrl(token)

  // Card Dimensions (Centered on A4)
  const cardW = 140
  const cardH = 175
  const cardX = (210 - cardW) / 2 // 35mm
  const cardY = (297 - cardH) / 2 // 61mm

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
  doc.text('CHECKLIST KEBERSIHAN RUANGAN', 105, cardY + 25.5, { align: 'center' })

  // Header Divider
  doc.setDrawColor(2, 44, 70)
  doc.setLineWidth(0.35)
  doc.line(cardX + ribbonMargin, cardY + 29, cardX + cardW - ribbonMargin, cardY + 29)

  // 4. Room Location & Name
  doc.setFontSize(8)
  doc.setTextColor(113, 113, 122) // #71717a
  doc.text('LOKASI RUANGAN', 105, cardY + 36, { align: 'center' })

  const roomName = room.room_name || 'Ruangan'
  doc.setTextColor(11, 72, 119) // #0b4877
  if (roomName.length > 24) {
    doc.setFontSize(13)
  } else if (roomName.length > 16) {
    doc.setFontSize(15)
  } else {
    doc.setFontSize(18)
  }
  doc.text(roomName, 105, cardY + 44, { align: 'center' })

  // 5. QR Code Box & Image
  const qrBoxW = 78
  const qrBoxH = 78
  const qrBoxX = 105 - qrBoxW / 2 // 66mm
  const qrBoxY = cardY + 49

  doc.setFillColor(248, 250, 252) // #f8fafc
  doc.setDrawColor(226, 232, 240) // #e2e8f0
  doc.setLineWidth(0.25)
  doc.roundedRect(qrBoxX, qrBoxY, qrBoxW, qrBoxH, 4, 4, 'FD')

  // QR Image inside box
  const qrImgW = 68
  const qrImgH = 68
  const qrImgX = 105 - qrImgW / 2
  const qrImgY = qrBoxY + 5
  doc.addImage(qrDataUrl, 'PNG', qrImgX, qrImgY, qrImgW, qrImgH)

  // 6. Footer Section
  doc.setDrawColor(226, 232, 240)
  doc.setLineWidth(0.25)
  doc.line(cardX + ribbonMargin, cardY + 138, cardX + cardW - ribbonMargin, cardY + 138)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9.5)
  doc.setTextColor(2, 44, 70)
  doc.text('Pindai (Scan) QR Sebelum & Sesudah Membersihkan', 105, cardY + 146, { align: 'center' })

  doc.setFont('courier', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(113, 113, 122)
  doc.text(`Token: ${token}`, 105, cardY + 152, { align: 'center' })
}

/**
 * Generates and triggers print/download for a single room
 */
export async function generateSingleRoomPDF(room, { action = 'print' } = {}) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  await renderRoomStickerPage(doc, room)

  const cleanName = (room.room_name || 'Ruangan').replace(/[^a-zA-Z0-9_-]/g, '_')
  const filename = `Label_QR_${cleanName}.pdf`

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
 * Generates and triggers print/download for all rooms (1 page per room)
 */
export async function generateBatchRoomPDF(rooms, { action = 'print' } = {}) {
  if (!rooms || rooms.length === 0) return null

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  for (let i = 0; i < rooms.length; i++) {
    if (i > 0) {
      doc.addPage('a4', 'portrait')
    }
    await renderRoomStickerPage(doc, rooms[i])
  }

  const filename = `Label_QR_Semua_Ruangan_CCS_${rooms.length}_Lembar.pdf`

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
