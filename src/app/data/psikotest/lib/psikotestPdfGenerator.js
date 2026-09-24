import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

/**
 * Memuat gambar URL menjadi Base64 data URI
 */
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

/**
 * Format tanggal Indonesia (misal: 24 September 2026)
 */
export const formatIndonesianDate = (dateStr) => {
  if (!dateStr) return '-'
  try {
    const d = new Date(dateStr)
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
  } catch (e) {
    return dateStr
  }
}

/**
 * Generator PDF Resmi Hasil Tes Psikotes DISC CCS
 * Menggunakan pendekatan jsPDF + autoTable persis seperti /data/pyp
 */
export async function generatePsikotestPDF({ result, items, calculation, logoUrl = '/images/login-logo.png' }) {
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
  const cw = pw - ml - mr // 182mm

  // 1. Muat Logo Base64
  let logoBase64 = null
  if (typeof window !== 'undefined' && logoUrl) {
    logoBase64 = await loadImgBase64(logoUrl)
  }

  // Helper menggambar Watermark
  const drawWatermark = () => {
    if (logoBase64) {
      try {
        doc.saveGraphicsState()
        doc.setGState(new doc.GState({ opacity: 0.05 }))
        const wmW = 100
        const imgProps = doc.getImageProperties(logoBase64)
        const wmH = (imgProps.height / imgProps.width) * wmW
        doc.addImage(logoBase64, 'PNG', (pw - wmW) / 2, (ph - wmH) / 2, wmW, wmH)
        doc.restoreGraphicsState()
      } catch (e) {
        // Fallback jika browser tidak support GState
      }
    }
  }

  // Helper menggambar Kop Surat Resmi
  const drawHeader = (startY = mt) => {
    let y = startY
    let logoW = 0

    if (logoBase64) {
      try {
        const logoH = 18
        const imgProps = doc.getImageProperties(logoBase64)
        logoW = (imgProps.width / imgProps.height) * logoH
        doc.addImage(logoBase64, 'PNG', ml, y, logoW, logoH)
      } catch (e) {
        logoW = 0
      }
    }

    const txStart = ml + (logoW > 0 ? logoW + 4 : 0)

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(14)
    doc.setTextColor(15, 23, 42) // #0F172A
    doc.text('CHUNG CHUNG CHRISTIAN SCHOOL', txStart, y + 6)

    doc.setFontSize(11)
    doc.setTextColor(37, 99, 235) // #2563EB
    doc.text('Psikotest Result - DISC Personality Assessment', txStart, y + 12)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(100, 116, 139)
    doc.text('Surabaya, East Java - Indonesia', txStart, y + 17)

    // Garis pemisah kop
    const lineY = y + 21
    doc.setDrawColor(203, 213, 225) // #CBD5E1
    doc.setLineWidth(0.4)
    doc.line(ml, lineY, pw - mr, lineY)

    return lineY + 5
  }

  // Helper menggambar Footer Resmi
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

  // ─── HALAMAN 1: IDENTITAS & 24 KELOMPOK PERNYATAAN ─────────────────────
  drawWatermark()
  let curY = drawHeader()

  // Biodata Peserta (Clean text layout: Nama, Posisi, Tanggal)
  doc.setFontSize(9)
  const labelX = ml
  const valX = ml + 24

  doc.setFont('helvetica', 'normal')
  doc.setTextColor(30, 41, 59)
  doc.text('Nama', labelX, curY + 4)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(15, 23, 42)
  doc.text(result.nama || '-', valX, curY + 4)

  doc.setFont('helvetica', 'normal')
  doc.setTextColor(30, 41, 59)
  doc.text('Posisi', labelX, curY + 9.5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(15, 23, 42)
  doc.text(result.posisi || '-', valX, curY + 9.5)

  doc.setFont('helvetica', 'normal')
  doc.setTextColor(30, 41, 59)
  doc.text('Tanggal', labelX, curY + 15)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(15, 23, 42)
  doc.text(formatIndonesianDate(result.tanggal), valX, curY + 15)

  curY += 20

  // Susun data tabel 24 nomor soal
  const grouped = {}
  items.forEach(it => {
    if (!grouped[it.group_no]) grouped[it.group_no] = []
    grouped[it.group_no].push(it)
  })

  const tableBody = []
  Object.keys(grouped).sort((a, b) => Number(a) - Number(b)).forEach(groupNo => {
    // Header baris kelompok
    tableBody.push([
      {
        content: `Nomor ${groupNo}`,
        colSpan: 3,
        styles: {
          fillColor: [241, 245, 249],
          fontStyle: 'bold',
          textColor: [30, 41, 59],
          fontSize: 8
        }
      }
    ])

    const groupQuestions = grouped[groupNo]
    groupQuestions.forEach(q => {
      const isP = q.is_p_selected
      const isK = q.is_k_selected
      const isPTriangle = isP && q.p_icon === '▲'
      const isKTriangle = isK && q.k_icon === '▲'

      tableBody.push([
        { content: q.statement_text || '', styles: { fontSize: 7.5 } },
        {
          content: isPTriangle ? '' : (isP ? q.p_icon : '-'),
          isTriangle: isPTriangle,
          styles: { halign: 'center', fontStyle: isP ? 'bold' : 'normal', fontSize: 8 }
        },
        {
          content: isKTriangle ? '' : (isK ? q.k_icon : '-'),
          isTriangle: isKTriangle,
          styles: { halign: 'center', fontStyle: isK ? 'bold' : 'normal', fontSize: 8 }
        }
      ])
    })
  })

  // Render Tabel Indikator dengan autoTable
  autoTable(doc, {
    startY: curY,
    margin: { left: ml, right: mr, bottom: mb + 8 },
    head: [['Indikator', 'Paling Mirip (P)', 'Paling Tidak Mirip (K)']],
    body: tableBody,
    theme: 'grid',
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'center'
    },
    columnStyles: {
      0: { cellWidth: 132 },
      1: { cellWidth: 25, halign: 'center' },
      2: { cellWidth: 25, halign: 'center' }
    },
    styles: {
      cellPadding: 1.6,
      lineColor: [203, 213, 225],
      lineWidth: 0.2,
      font: 'helvetica',
      overflow: 'linebreak'
    },
    didDrawCell: (data) => {
      // Jika cell adalah segitiga ▲, gambar vector triangle agar tajam dan tidak korup font (%²)
      if (data.section === 'body' && (data.column.index === 1 || data.column.index === 2)) {
        if (data.cell.raw && data.cell.raw.isTriangle) {
          const cx = data.cell.x + data.cell.width / 2
          const cy = data.cell.y + data.cell.height / 2
          doc.setFillColor(15, 23, 42)
          // Ukuran proporsional sesuai font size 8pt (~1.7mm tinggi x 1.8mm lebar)
          doc.triangle(cx, cy - 0.9, cx - 0.9, cy + 0.8, cx + 0.9, cy + 0.8, 'F')
        }
      }
    }
  })

  // ─── HALAMAN BARU: REKAPITULASI HASIL & SCORING MATRIX DISC ────────────
  doc.addPage()
  drawWatermark()
  curY = drawHeader()

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(15, 23, 42)
  doc.text('REKAPITULASI SKOR & ANALISIS KEPRIBADIAN DISC', ml, curY + 2)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(100, 116, 139)
  doc.text('Hasil kalkulasi raw score, konversi pola norma segmen 1 - 6, serta 2 dimensi kepribadian dominan.', ml, curY + 7)

  curY += 12

  // Tabel Rekapitulasi Scoring DISC
  const discSummaryRows = [
    [
      { content: 'D (Dominance)', styles: { fontStyle: 'bold' } },
      { content: String(calculation.raw.most.D), styles: { halign: 'center' } },
      { content: String(calculation.raw.least.D), styles: { halign: 'center' } },
      { content: String(calculation.raw.diff.D), styles: { halign: 'center', fontStyle: 'bold' } }
    ],
    [
      { content: 'I (Influence)', styles: { fontStyle: 'bold' } },
      { content: String(calculation.raw.most.I), styles: { halign: 'center' } },
      { content: String(calculation.raw.least.I), styles: { halign: 'center' } },
      { content: String(calculation.raw.diff.I), styles: { halign: 'center', fontStyle: 'bold' } }
    ],
    [
      { content: 'S (Steadiness)', styles: { fontStyle: 'bold' } },
      { content: String(calculation.raw.most.S), styles: { halign: 'center' } },
      { content: String(calculation.raw.least.S), styles: { halign: 'center' } },
      { content: String(calculation.raw.diff.S), styles: { halign: 'center', fontStyle: 'bold' } }
    ],
    [
      { content: 'C (Conscientiousness)', styles: { fontStyle: 'bold' } },
      { content: String(calculation.raw.most.C), styles: { halign: 'center' } },
      { content: String(calculation.raw.least.C), styles: { halign: 'center' } },
      { content: String(calculation.raw.diff.C), styles: { halign: 'center', fontStyle: 'bold' } }
    ],
    [
      { content: 'Pola (Segmen 1 - 6)', styles: { fontStyle: 'bold', fillColor: [248, 250, 252] } },
      { content: calculation.patterns.most, styles: { halign: 'center', fontStyle: 'bold', fillColor: [248, 250, 252] } },
      { content: calculation.patterns.least, styles: { halign: 'center', fontStyle: 'bold', fillColor: [248, 250, 252] } },
      { content: calculation.patterns.diff, styles: { halign: 'center', fontStyle: 'bold', fillColor: [248, 250, 252] } }
    ],
    [
      { content: '2 Tertinggi (Top Two)', styles: { fontStyle: 'bold', fillColor: [239, 246, 255], textColor: [30, 58, 138] } },
      { content: calculation.top_two.most.code, styles: { halign: 'center', fontStyle: 'bold', fontSize: 10, fillColor: [239, 246, 255], textColor: [29, 78, 216] } },
      { content: calculation.top_two.least.code, styles: { halign: 'center', fontStyle: 'bold', fontSize: 10, fillColor: [239, 246, 255], textColor: [29, 78, 216] } },
      { content: calculation.top_two.diff.code, styles: { halign: 'center', fontStyle: 'bold', fontSize: 10, fillColor: [239, 246, 255], textColor: [29, 78, 216] } }
    ]
  ]

  autoTable(doc, {
    startY: curY,
    margin: { left: ml, right: mr },
    head: [['Dimensi Kepribadian', 'Most (Paling Mirip)', 'Least (Paling Tidak)', 'Difference (Selisih)']],
    body: discSummaryRows,
    theme: 'grid',
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontSize: 8.5,
      fontStyle: 'bold',
      halign: 'center'
    },
    columnStyles: {
      0: { cellWidth: 55 },
      1: { cellWidth: 42, halign: 'center' },
      2: { cellWidth: 42, halign: 'center' },
      3: { cellWidth: 43, halign: 'center' }
    },
    styles: {
      cellPadding: 3,
      lineColor: [203, 213, 225],
      lineWidth: 0.25,
      font: 'helvetica',
      fontSize: 8.5
    }
  })

  // Keterangan Penjelasan Tipe DISC
  const noteY = doc.lastAutoTable.finalY + 8
  doc.setFillColor(248, 250, 252)
  doc.setDrawColor(226, 232, 240)
  doc.roundedRect(ml, noteY, cw, 42, 1.5, 1.5, 'FD')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.setTextColor(15, 23, 42)
  doc.text('Keterangan Dimensi Kepribadian DISC:', ml + 4, noteY + 5.5)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(71, 85, 105)
  doc.text('• D (Dominance): Berorientasi pada hasil, kompetitif, tegas, berani mengambil risiko, dan suka tantangan.', ml + 4, noteY + 11.5)
  doc.text('• I (Influence): Ramah, antusias, komunikatif, persuasif, optimis, dan pandai menjalin relasi sosial.', ml + 4, noteY + 17)
  doc.text('• S (Steadiness): Tenang, setia, sabar, dapat diandalkan, menyukai keteraturan, dan cinta kedamaian.', ml + 4, noteY + 22.5)
  doc.text('• C (Conscientiousness): Teliti, analitis, sistematis, berhati-hati, taat pada aturan, dan standar kualitas tinggi.', ml + 4, noteY + 28)

  doc.setFont('helvetica', 'italic')
  doc.setTextColor(100, 116, 139)
  doc.text('* Most = Perilaku di ruang publik (Mask) | Least = Perilaku bawah tekanan (Core) | Difference = Perilaku terintegrasi harian.', ml + 4, noteY + 36)

  // ─── TAMBAHKAN NOMOR HALAMAN KE SEMUA HALAMAN ──────────────────────────
  const totalPages = doc.internal.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    drawFooter(i, totalPages)
  }

  // ─── OUTPUT HASIL: Buka di Tab Baru jika di Browser ─────────────────
  const pdfBlob = doc.output('blob')
  let pdfUrl = null
  if (typeof window !== 'undefined' && typeof URL !== 'undefined' && URL.createObjectURL) {
    pdfUrl = URL.createObjectURL(pdfBlob)
    window.open(pdfUrl, '_blank')
  }

  return { doc, pdfBlob, pdfUrl }
}
