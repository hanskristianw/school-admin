import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { AGILITY_INTERPRETATION_BANDS } from '@/lib/agilityCalculator'

export const loadImgBase64 = async (url) => {
  if (!url) return null
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const blob = await res.blob()
    return await new Promise((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result)
      reader.onerror = () => resolve(null)
      reader.readAsDataURL(blob)
    })
  } catch (err) {
    console.warn('Could not load image base64:', err)
    return null
  }
}

export const formatIndonesianDate = (dateStr) => {
  if (!dateStr) return '-'
  try {
    const d = new Date(dateStr)
    if (Number.isNaN(d.getTime())) return dateStr
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
  } catch {
    return dateStr
  }
}

/**
 * Generator PDF Resmi Hasil Agility Check — Khusus HR / Interviewer
 */
export async function generateAgilityPDF({ result, items, summary, logoUrl = '/images/login-logo.png' }) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  })

  const pw = 210
  const ph = 297
  const ml = 14
  const mr = 14
  const mt = 14
  const mb = 14
  const cw = pw - ml - mr

  let logoBase64 = null
  if (typeof window !== 'undefined' && logoUrl) {
    logoBase64 = await loadImgBase64(logoUrl)
  }

  const drawWatermark = () => {
    if (!logoBase64) return
    try {
      doc.saveGraphicsState()
      doc.setGState(new doc.GState({ opacity: 0.05 }))
      const wmW = 100
      const imgProps = doc.getImageProperties(logoBase64)
      const wmH = (imgProps.height / imgProps.width) * wmW
      doc.addImage(logoBase64, 'PNG', (pw - wmW) / 2, (ph - wmH) / 2, wmW, wmH)
      doc.restoreGraphicsState()
    } catch {}
  }

  const drawHeader = (startY = mt) => {
    const y = startY
    let logoW = 0

    if (logoBase64) {
      try {
        const logoH = 18
        const imgProps = doc.getImageProperties(logoBase64)
        logoW = (imgProps.width / imgProps.height) * logoH
        doc.addImage(logoBase64, 'PNG', ml, y, logoW, logoH)
      } catch {
        logoW = 0
      }
    }

    const txStart = ml + (logoW > 0 ? logoW + 4 : 0)

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(14)
    doc.setTextColor(15, 23, 42)
    doc.text('CHUNG CHUNG CHRISTIAN SCHOOL', txStart, y + 6)

    doc.setFontSize(11)
    doc.setTextColor(217, 119, 6)
    doc.text('Agility Check Result - Situational Judgment Assessment (HR)', txStart, y + 12)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(100, 116, 139)
    doc.text('Surabaya, East Java - Indonesia', txStart, y + 17)

    const lineY = y + 21
    doc.setDrawColor(203, 213, 225)
    doc.setLineWidth(0.4)
    doc.line(ml, lineY, pw - mr, lineY)

    return lineY + 6
  }

  const drawFooter = (pageNo, totalPages) => {
    const footY = ph - mb + 2
    doc.setDrawColor(226, 232, 240)
    doc.setLineWidth(0.3)
    doc.line(ml, footY - 4, pw - mr, footY - 4)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(100, 116, 139)
    doc.text('admin@ccs.sch.id | +62 81 2165 11168 | www.ccs.sch.id', ml, footY)
    doc.text('Raya Gunung Anyar Sawah No 18 Surabaya - 60294', ml, footY + 3.5)

    doc.setFont('helvetica', 'bold')
    doc.text(`Halaman ${pageNo} dari ${totalPages}`, pw - mr, footY, { align: 'right' })
  }

  // ─── HALAMAN 1: BIODATA, RINGKASAN SKOR & INTERPRETASI HR ───────────────
  drawWatermark()
  let curY = drawHeader()

  // Biodata Peserta
  doc.setFontSize(9)
  const labelX = ml
  const valX = ml + 28

  const metaRows = [
    ['Nama Pelamar', result.nama || '-'],
    ['Posisi Dilamar', result.posisi || '-'],
    ['Tanggal Tes', formatIndonesianDate(result.tanggal)]
  ]
  metaRows.forEach(([label, val], i) => {
    const rowY = curY + i * 5.5
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(71, 85, 105)
    doc.text(label, labelX, rowY)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(15, 23, 42)
    doc.text(`: ${val}`, valX, rowY)
  })

  curY += 18

  // Kotak Skor Total & Interpretasi HR
  doc.setFillColor(248, 250, 252)
  doc.setDrawColor(203, 213, 225)
  doc.roundedRect(ml, curY, cw, 24, 2, 2, 'FD')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.setTextColor(100, 116, 139)
  doc.text('SKOR TOTAL', ml + 5, curY + 6)
  doc.text('INTERPRETASI HR / INTERVIEWER', ml + 55, curY + 6)

  doc.setFontSize(16)
  doc.setTextColor(15, 23, 42)
  doc.text(`${summary.total_score} / ${summary.max_score}`, ml + 5, curY + 14.5)

  doc.setFontSize(9)
  doc.setTextColor(100, 116, 139)
  doc.text(`(${summary.percentage}%)`, ml + 29, curY + 14.5)

  doc.setFontSize(12)
  doc.setTextColor(180, 83, 9)
  doc.text(summary.interpretation || '-', ml + 55, curY + 14)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(71, 85, 105)
  const descText = summary.interpretation_detail?.description || ''
  doc.text(descText, ml + 55, curY + 19.5, { maxWidth: cw - 60 })

  curY += 29

  // Tabel Ringkasan per Dimensi
  if (Array.isArray(summary.dimensions) && summary.dimensions.length > 0) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9.5)
    doc.setTextColor(15, 23, 42)
    doc.text('Rincian Skor per Dimensi', ml, curY)
    curY += 3

    autoTable(doc, {
      startY: curY,
      margin: { left: ml, right: mr },
      head: [['Dimensi', 'Jawaban Benar', 'Total Soal', 'Persentase']],
      body: summary.dimensions.map(d => [
        { content: d.dimension, styles: { fontStyle: 'bold' } },
        { content: String(d.correct), styles: { halign: 'center' } },
        { content: String(d.total), styles: { halign: 'center' } },
        { content: `${d.percentage}%`, styles: { halign: 'center', fontStyle: 'bold' } }
      ]),
      theme: 'grid',
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: [255, 255, 255],
        fontSize: 8,
        fontStyle: 'bold',
        halign: 'center'
      },
      styles: {
        cellPadding: 2.2,
        fontSize: 8,
        lineColor: [203, 213, 225],
        lineWidth: 0.2
      },
      columnStyles: {
        0: { cellWidth: 72 },
        1: { cellWidth: 36 },
        2: { cellWidth: 36 },
        3: { cellWidth: 38 }
      }
    })

    curY = doc.lastAutoTable.finalY + 7
  }

  // Tabel Panduan Penilaian Resmi HR
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9.5)
  doc.setTextColor(15, 23, 42)
  doc.text('Panduan Penilaian & Interpretasi (Khusus HR / Interviewer)', ml, curY)
  curY += 3

  autoTable(doc, {
    startY: curY,
    margin: { left: ml, right: mr },
    head: [['Rentang Skor (Skala 16)', 'Kategori Interpretasi', 'Catatan Evaluasi']],
    body: AGILITY_INTERPRETATION_BANDS.map(b => [
      { content: b.rangeLabel16, styles: { halign: 'center', fontStyle: 'bold' } },
      { content: b.label, styles: { fontStyle: 'bold' } },
      { content: b.description }
    ]),
    theme: 'grid',
    headStyles: {
      fillColor: [51, 65, 85],
      textColor: [255, 255, 255],
      fontSize: 7.5,
      fontStyle: 'bold'
    },
    styles: {
      cellPadding: 2,
      fontSize: 7.5,
      lineColor: [203, 213, 225],
      lineWidth: 0.2
    },
    columnStyles: {
      0: { cellWidth: 38 },
      1: { cellWidth: 52 },
      2: { cellWidth: 92 }
    }
  })

  curY = doc.lastAutoTable.finalY + 4
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(7.5)
  doc.setTextColor(100, 116, 139)
  doc.text(
    'Catatan: Gunakan hasil sebagai bahan diskusi seleksi, bukan sebagai satu-satunya dasar keputusan rekrutmen.',
    ml,
    curY + 2
  )

  // ─── HALAMAN 2+: RINCIAN JAWABAN PER SOAL ──────────────────────────────
  doc.addPage()
  drawWatermark()
  curY = drawHeader()

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10.5)
  doc.setTextColor(15, 23, 42)
  doc.text('RINCIAN JAWABAN PESERTA & KUNCI JAWABAN', ml, curY)
  curY += 4

  const optionTextFor = (item, letter) => {
    if (!letter) return '-'
    const key = `option_${String(letter).toLowerCase()}`
    const txt = item[key]
    return txt ? `${letter}. ${txt}` : letter
  }

  autoTable(doc, {
    startY: curY,
    margin: { left: ml, right: mr, bottom: mb + 8 },
    head: [['No', 'Dimensi & Pertanyaan', 'Pilihan Peserta', 'Kunci', 'Status']],
    body: (items || []).map(item => [
      { content: String(item.question_no), styles: { halign: 'center', fontStyle: 'bold' } },
      {
        content: `[${item.dimension || '-'}]\n${item.question_text || ''}\n\n• Dipilih: ${optionTextFor(item, item.selected_option)}`,
        styles: { fontSize: 7.3 }
      },
      { content: item.selected_option || '-', styles: { halign: 'center', fontStyle: 'bold' } },
      { content: item.correct_answer || '-', styles: { halign: 'center', fontStyle: 'bold' } },
      {
        content: item.is_correct ? 'Benar (+1)' : 'Salah (0)',
        styles: {
          halign: 'center',
          fontStyle: 'bold',
          textColor: item.is_correct ? [22, 163, 74] : [220, 38, 38]
        }
      }
    ]),
    theme: 'grid',
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'center'
    },
    styles: {
      cellPadding: 2,
      fontSize: 8,
      lineColor: [203, 213, 225],
      lineWidth: 0.2,
      overflow: 'linebreak'
    },
    columnStyles: {
      0: { cellWidth: 10 },
      1: { cellWidth: 112 },
      2: { cellWidth: 20 },
      3: { cellWidth: 16 },
      4: { cellWidth: 24 }
    }
  })

  const totalPages = doc.internal.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    drawFooter(i, totalPages)
  }

  const pdfBlob = doc.output('blob')
  let pdfUrl = null
  if (typeof window !== 'undefined' && typeof URL !== 'undefined' && URL.createObjectURL) {
    pdfUrl = URL.createObjectURL(pdfBlob)
    window.open(pdfUrl, '_blank')
  }

  return { doc, pdfBlob, pdfUrl }
}
