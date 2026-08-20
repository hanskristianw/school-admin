import { jsPDF } from 'jspdf'
import { supabase } from '@/lib/supabase'

/**
 * Loads image URL as Base64 data URI
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
 * Draws the IB Primary Years Programme Logo vector badge on jsPDF
 */
export const drawIbPypLogo = (doc, x, y, width = 42, height = 14) => {
  try {
    // 1. Right Yellow/Gold curved pill banner
    const pillX = x + 10
    const pillY = y + 1.5
    const pillW = width - 10
    const pillH = height - 3
    const radius = 3.5

    // Yellow background fill
    doc.setFillColor(255, 199, 44) // IB Gold #FFC72C
    doc.roundedRect(pillX, pillY, pillW, pillH, radius, radius, 'F')

    // Yellow text inside pill: "Primary Years" / "Programme"
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(6.5)
    doc.setTextColor(0, 114, 206) // IB Blue #0072CE
    doc.text('Primary Years', pillX + 5.5, pillY + 4)
    doc.text('Programme', pillX + 5.5, pillY + 7.5)

    // 2. Left Blue Circle with "ib"
    const circleRadius = 6.2
    const circleCenterX = x + circleRadius
    const circleCenterY = y + (height / 2)

    doc.setFillColor(0, 114, 206) // #0072CE
    doc.circle(circleCenterX, circleCenterY, circleRadius, 'F')

    // White "ib" text
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10.5)
    doc.setTextColor(255, 255, 255)
    doc.text('ib', circleCenterX - 4.2, circleCenterY + 3.2)
  } catch (e) {
    console.warn('Failed to draw IB logo:', e)
  }
}

/**
 * Draws the Principal Signature vector stroke
 */
export const drawPrincipalSignature = (doc, x, y) => {
  try {
    doc.saveGraphicsState()
    doc.setDrawColor(31, 41, 55)
    doc.setLineWidth(0.45)
    
    // Artistic representation of Christin Anggraeni cursive signature loop
    doc.line(x + 4, y + 12, x + 7, y + 2)
    doc.line(x + 7, y + 2, x + 9, y + 5)
    doc.line(x + 9, y + 5, x + 6, y + 14)
    doc.line(x + 6, y + 14, x + 11, y + 4)
    doc.line(x + 11, y + 4, x + 13, y + 12)
    doc.line(x + 13, y + 12, x + 15, y + 8)
    doc.line(x + 15, y + 8, x + 17, y + 13)
    doc.line(x + 17, y + 13, x + 21, y + 6)
    doc.line(x + 21, y + 6, x + 19, y + 15)
    
    // Underline loop
    doc.line(x + 5, y + 13, x + 24, y + 11)
    doc.restoreGraphicsState()
  } catch (e) {
    console.warn('Failed to draw signature:', e)
  }
}

/**
 * Builds a single student's Page 1 PYP Report PDF on the given jsPDF doc
 */
export const renderPypReportPage1 = async (doc, {
  studentName = 'Timothy Lauda',
  gradeName = 'Elementary 1 Humility',
  homeroomTeachers = ['Wundung Hermina Napitupulu', 'Hulda Tabitha Pingkan Polimpung'],
  semester = '2',
  yearName = '2025/2026',
  preparedDate = '12 June 2026',
  principalName = 'Christin Anggraeni',
  principalTitle = 'PYP Principal',
  signatureUrl = null,
  logoBase64 = null,
  ibLogoBase64 = null,
  attendance = { absent: 1, present: 92, late: 0, excused: 8 }
}) => {
  const pw = doc.internal.pageSize.getWidth()   // 210mm
  const ph = doc.internal.pageSize.getHeight()  // 297mm
  const ml = 18
  const mr = 18
  const mt = 16
  const cw = pw - ml - mr // 174mm

  const semesterOrdinal = semester === '1' || semester === 1 ? 'First Semester' : 'Second Semester'
  const formattedYear = (yearName || '').replace('/', ' - ')

  // 1. Watermark: Subtle school crest in the center background
  if (logoBase64) {
    try {
      doc.saveGraphicsState()
      doc.setGState(new doc.GState({ opacity: 0.05 }))
      const wmW = 100
      const imgProps = doc.getImageProperties(logoBase64)
      const wmH = (imgProps.height / imgProps.width) * wmW
      doc.addImage(logoBase64, 'PNG', (pw - wmW) / 2, (ph - wmH) / 2, wmW, wmH)
      doc.restoreGraphicsState()
    } catch (e) {}
  }

  // 2. Header: Logo + School Name + PYP Report + Semester + Prepared Date
  let y = mt
  let logoW = 0
  if (logoBase64) {
    try {
      const logoH = 25
      const imgProps = doc.getImageProperties(logoBase64)
      logoW = (imgProps.width / imgProps.height) * logoH
      doc.addImage(logoBase64, 'PNG', ml, y, logoW, logoH)
    } catch (e) {
      logoW = 0
    }
  }

  const txStart = ml + (logoW > 0 ? logoW + 5 : 0)

  // School Title & Report Name
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(15.5)
  doc.setTextColor(17, 24, 39)
  doc.text('Chung Chung Christian School', txStart, y + 6.5)
  doc.text('PYP Report', txStart, y + 13)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  doc.setTextColor(55, 65, 81)
  doc.text(`${semesterOrdinal} (${formattedYear})`, txStart, y + 19)

  doc.setFontSize(9.5)
  doc.setTextColor(107, 114, 128)
  doc.text(`Prepared : ${preparedDate}`, txStart, y + 24.5)

  // Top Right: IB Primary Years Programme Logo Image
  if (ibLogoBase64) {
    try {
      const ibH = 14
      const imgProps = doc.getImageProperties(ibLogoBase64)
      const ibW = (imgProps.width / imgProps.height) * ibH
      const ibX = pw - mr - ibW
      doc.addImage(ibLogoBase64, 'JPEG', ibX, y + 1.5, ibW, ibH)
    } catch (e) {
      const ibW = 40
      const ibH = 13
      drawIbPypLogo(doc, pw - mr - ibW, y + 1.5, ibW, ibH)
    }
  } else {
    const ibW = 40
    const ibH = 13
    const ibX = pw - mr - ibW
    drawIbPypLogo(doc, ibX, y + 1.5, ibW, ibH)
  }

  // 3. Student Name & Metadata (Grade + Homeroom Teachers)
  y = mt + 38

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.setTextColor(17, 24, 39)
  doc.text(studentName, ml, y)

  y += 8
  const col2X = ml + 82

  // Column 1: Grade
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(17, 24, 39)
  doc.text('Grade', ml, y)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10.5)
  doc.setTextColor(55, 65, 81)
  doc.text(gradeName, ml, y + 5.2)

  // Column 2: Homeroom Teacher(s)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(17, 24, 39)
  doc.text('Homeroom Teacher', col2X, y)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10.5)
  doc.setTextColor(55, 65, 81)

  let teacherY = y + 5.2
  const teachersList = Array.isArray(homeroomTeachers) && homeroomTeachers.length > 0 
    ? homeroomTeachers 
    : [typeof homeroomTeachers === 'string' ? homeroomTeachers : 'Homeroom Teacher']

  teachersList.forEach((t) => {
    if (t && t !== '-') {
      doc.text(t, col2X, teacherY)
      teacherY += 5
    }
  })

  // 4. Letter to Parents (Fully Justified)
  y = Math.max(y + 19, teacherY + 6)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10.5)
  doc.setTextColor(17, 24, 39)
  doc.text('Dear Parents,', ml, y)

  y += 7.5
  const letterParagraph = `At Chung Chung Christian School, we believe in an education that actively combines challenging and enriching experiences with academic rigor and creative opportunities. Our goal is to empower students to courageously push the boundaries of their experiences and explore the vast possibilities available to them. While we take pride in their academic achievements, our commitment goes beyond test scores. We aim for our students to discover the excitement of realizing their capabilities far exceed what they might have thought possible. We hold high expectations for our students, and they, in turn, have high expectations for themselves. It is crucial that parents wholeheartedly embrace and support the school's ethos. With this, I am pleased to present your child's report card for this semester. Let's collaborate to create an environment that fosters growth and development.`

  const words = letterParagraph.trim().split(/\s+/)
  const normalSpaceW = doc.getTextWidth(' ')
  const lines = []
  let currentLine = []
  let currentLineWidth = 0

  for (const word of words) {
    const wWidth = doc.getTextWidth(word)
    const testWidth = currentLine.length === 0 ? wWidth : currentLineWidth + normalSpaceW + wWidth

    if (testWidth > cw && currentLine.length > 0) {
      lines.push(currentLine)
      currentLine = [{ text: word, width: wWidth }]
      currentLineWidth = wWidth
    } else {
      currentLine.push({ text: word, width: wWidth })
      currentLineWidth = testWidth
    }
  }
  if (currentLine.length > 0) {
    lines.push(currentLine)
  }

  const lineH = 5.2
  for (let lIdx = 0; lIdx < lines.length; lIdx++) {
    const line = lines[lIdx]
    const isLastLine = (lIdx === lines.length - 1)
    const totalWordsWidth = line.reduce((sum, item) => sum + item.width, 0)
    const spacesCount = line.length - 1

    let spaceW = normalSpaceW
    if (!isLastLine && spacesCount > 0) {
      spaceW = (cw - totalWordsWidth) / spacesCount
    }

    let curX = ml
    for (let wIdx = 0; wIdx < line.length; wIdx++) {
      const item = line[wIdx]
      doc.text(item.text, curX, y)
      curX += item.width + spaceW
    }

    y += lineH
  }

  // Kind regards
  y += 5.5
  doc.text('Kind regards,', ml, y)

  // Signature
  y += 6.5
  if (signatureUrl) {
    try {
      const sigB64 = await loadImgBase64(signatureUrl)
      if (sigB64) {
        doc.addImage(sigB64, 'PNG', ml, y, 28, 14)
      } else {
        drawPrincipalSignature(doc, ml, y)
      }
    } catch (e) {
      drawPrincipalSignature(doc, ml, y)
    }
  } else {
    drawPrincipalSignature(doc, ml, y)
  }

  // Principal Name & Title
  y += 18
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10.5)
  doc.setTextColor(17, 24, 39)
  doc.text(principalName, ml, y)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(55, 65, 81)
  doc.text(principalTitle, ml, y + 4.8)

  // 5. Attendance Section
  y += 15
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(17, 24, 39)
  doc.text('Attendance', ml, y)

  y += 5.5
  const badges = [
    { label: 'Absent', count: attendance.absent ?? 0, bg: [239, 68, 68] },     // Red #EF4444
    { label: 'Present', count: attendance.present ?? 0, bg: [34, 197, 94] },   // Green #22C55E
    { label: 'Late', count: attendance.late ?? 0, bg: [234, 179, 8] },         // Yellow/Amber #EAB308
    { label: 'Excused', count: attendance.excused ?? 0, bg: [79, 70, 229] }    // Indigo/Blue #4F46E5
  ]

  let bx = ml
  const badgeH = 6.8
  const badgeR = 1.4

  badges.forEach((b) => {
    const txt = `${b.count} ${b.label}`
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    const tw = doc.getTextWidth(txt)
    const bw = tw + 9

    doc.setFillColor(b.bg[0], b.bg[1], b.bg[2])
    doc.roundedRect(bx, y, bw, badgeH, badgeR, badgeR, 'F')

    doc.setTextColor(255, 255, 255)
    doc.text(txt, bx + 4.5, y + 4.7)

    bx += bw + 3.5
  })

  // 6. Page Footer (Divider Line + Contact info + Address)
  renderPypReportFooter(doc)
}

/**
 * Renders the standardized School Footer on the current page
 */
export const renderPypReportFooter = (doc) => {
  try {
    const pw = doc.internal.pageSize.getWidth()
    const ph = doc.internal.pageSize.getHeight()
    const ml = 18
    const mr = 18

    // Dynamically anchored to the bottom of the active page size (A4, Letter, etc.)
    const footerLineY = ph - 16
    const line1Y = ph - 11
    const line2Y = ph - 6.5

    doc.saveGraphicsState()
    
    // Thin separator line across the page width
    doc.setDrawColor(209, 213, 219) // #D1D5DB
    doc.setLineWidth(0.25)
    doc.line(ml, footerLineY, pw - mr, footerLineY)

    // Line 1: Contact information
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(31, 41, 55) // #1F2937
    doc.text('admin@ccs.sch.id | +62 81 2165 11168 | www.ccs.sch.id', pw / 2, line1Y, { align: 'center' })

    // Line 2: School address
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(75, 85, 99) // #4B5563
    doc.text('Raya Gunung Anyar Sawah No 18 Surabaya, East Java - 60294', pw / 2, line2Y, { align: 'center' })

    doc.restoreGraphicsState()
  } catch (e) {
    console.warn('Failed to render PYP footer:', e)
  }
}

/**
 * Builds Page 2: Student Progress Descriptor on the given jsPDF doc
 */
export const renderPypReportPage2 = async (doc, {
  logoBase64 = null,
  descriptorIconBase64 = null
}) => {
  const pw = doc.internal.pageSize.getWidth()
  const ph = doc.internal.pageSize.getHeight()
  const ml = 18
  const mr = 18
  const mt = 18
  const cw = pw - ml - mr

  // 1. Watermark: Subtle school crest in the center background
  if (logoBase64) {
    try {
      doc.saveGraphicsState()
      doc.setGState(new doc.GState({ opacity: 0.05 }))
      const wmW = 100
      const imgProps = doc.getImageProperties(logoBase64)
      const wmH = (imgProps.height / imgProps.width) * wmW
      doc.addImage(logoBase64, 'PNG', (pw - wmW) / 2, (ph - wmH) / 2, wmW, wmH)
      doc.restoreGraphicsState()
    } catch (e) {}
  }

  // 2. Header Card / Box
  const boxY = mt
  const boxH = 22

  doc.saveGraphicsState()
  doc.setDrawColor(31, 41, 55) // Dark border
  doc.setLineWidth(0.35)
  doc.rect(ml, boxY, cw, boxH, 'S')

  const iconH = 14
  const iconW = 14
  const iconX = ml + 5
  const iconY = boxY + (boxH - iconH) / 2

  if (descriptorIconBase64) {
    try {
      doc.addImage(descriptorIconBase64, 'PNG', iconX, iconY, iconW, iconH)
    } catch (e) {
      console.warn('Could not render descriptor icon image:', e)
    }
  }

  // Title: Student Progress Descriptor
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14.5)
  doc.setTextColor(17, 24, 39)
  doc.text('Student Progress Descriptor', iconX + iconW + 4, boxY + (boxH / 2) + 1.8)
  doc.restoreGraphicsState()

  // 3. Descriptors Bullet List
  const descriptors = [
    {
      title: 'Beginning',
      desc: 'This indicates that a student is just starting to acquire the skills or knowledge related to a specific learning outcome or objective. They are at the initial stages of development and may require additional support and guidance to progress further.'
    },
    {
      title: 'Developing',
      desc: 'This suggests that a student is making progress and showing improvement in the targeted areas. They are in the process of acquiring the skills and knowledge expected at their grade level but may not have fully mastered them yet.'
    },
    {
      title: 'Achieving',
      desc: 'When a student is described as achieving, it means they have successfully reached the expected level of competence or proficiency in the given subject or skill. They have met the learning outcomes and are performing at or near the expected grade level.'
    },
    {
      title: 'Exceeding',
      desc: 'Exceeding indicates that a student has surpassed the expected level of achievement. They have not only met the learning objectives but have demonstrated a higher level of mastery.'
    }
  ]

  let curY = boxY + boxH + 11
  const bulletX = ml
  const textX = ml + 5.5
  const textW = cw - 5.5
  const lineHeight = 5.2
  const fontSize = 10.5

  descriptors.forEach((item) => {
    doc.setFontSize(fontSize)

    // 1. Draw bullet symbol at bulletX
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(17, 24, 39)
    doc.text('•', bulletX, curY)

    // 2. Tokenize: Title (bold) + Description words (normal)
    const titleText = `${item.title}:`
    const descWords = item.desc.trim().split(/\s+/)
    const allWords = [
      { text: titleText, isBold: true },
      ...descWords.map(w => ({ text: w, isBold: false }))
    ]

    // 3. Break into lines using natural word widths
    const lines = []
    let currentLine = []
    let currentLineWidth = 0

    doc.setFont('helvetica', 'normal')
    const normalSpaceW = doc.getTextWidth(' ')

    for (const wordObj of allWords) {
      if (wordObj.isBold) {
        doc.setFont('helvetica', 'bold')
      } else {
        doc.setFont('helvetica', 'normal')
      }
      const wWidth = doc.getTextWidth(wordObj.text)

      const testWidth = currentLine.length === 0
        ? wWidth
        : currentLineWidth + normalSpaceW + wWidth

      if (testWidth > textW && currentLine.length > 0) {
        lines.push(currentLine)
        currentLine = [{ ...wordObj, width: wWidth }]
        currentLineWidth = wWidth
      } else {
        currentLine.push({ ...wordObj, width: wWidth })
        currentLineWidth = testWidth
      }
    }
    if (currentLine.length > 0) {
      lines.push(currentLine)
    }

    // 4. Render lines (Justified for all lines except the last line)
    for (let lIdx = 0; lIdx < lines.length; lIdx++) {
      const line = lines[lIdx]
      const isLastLine = (lIdx === lines.length - 1)

      const totalWordsWidth = line.reduce((sum, itm) => sum + itm.width, 0)
      const spacesCount = line.length - 1

      let spaceW = normalSpaceW
      if (!isLastLine && spacesCount > 0) {
        spaceW = (textW - totalWordsWidth) / spacesCount
      }

      let lineX = textX
      for (let wIdx = 0; wIdx < line.length; wIdx++) {
        const itm = line[wIdx]
        if (itm.isBold) {
          doc.setFont('helvetica', 'bold')
          doc.setTextColor(17, 24, 39)
        } else {
          doc.setFont('helvetica', 'normal')
          doc.setTextColor(31, 41, 55)
        }

        doc.text(itm.text, lineX, curY)
        lineX += itm.width + spaceW
      }

      curY += lineHeight
    }

    curY += 4 // Gap between descriptor paragraphs
  })

  // 4. Render Standardized Footer on Page 2
  renderPypReportFooter(doc)
}

/**
 * Builds Page 3: IB Learner Profile on the given jsPDF doc
 */
export const renderPypReportPage3 = async (doc, {
  logoBase64 = null,
  headerIconBase64 = null,
  diagramBase64 = null,
  icons = {}
}) => {
  const pw = doc.internal.pageSize.getWidth()
  const ph = doc.internal.pageSize.getHeight()
  const ml = 18
  const mr = 18
  const mt = 16
  const cw = pw - ml - mr

  // 1. Watermark: Subtle school crest in the center background
  if (logoBase64) {
    try {
      doc.saveGraphicsState()
      doc.setGState(new doc.GState({ opacity: 0.05 }))
      const wmW = 100
      const imgProps = doc.getImageProperties(logoBase64)
      const wmH = (imgProps.height / imgProps.width) * wmW
      doc.addImage(logoBase64, 'PNG', (pw - wmW) / 2, (ph - wmH) / 2, wmW, wmH)
      doc.restoreGraphicsState()
    } catch (e) {}
  }

  // 2. Header Card / Box
  const boxY = mt
  const boxH = 22

  doc.saveGraphicsState()
  doc.setDrawColor(31, 41, 55) // Dark border
  doc.setLineWidth(0.35)
  doc.rect(ml, boxY, cw, boxH, 'S')

  const hIconH = 14
  const hIconW = 14
  const hIconX = ml + 5
  const hIconY = boxY + (boxH - hIconH) / 2

  if (headerIconBase64) {
    try {
      const imgFmt = headerIconBase64.includes('image/png') ? 'PNG' : 'JPEG'
      doc.addImage(headerIconBase64, imgFmt, hIconX, hIconY, hIconW, hIconH)
    } catch (e) {
      console.warn('Could not render LP header icon:', e)
    }
  }

  // Title: IB Learner Profile
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14.5)
  doc.setTextColor(17, 24, 39)
  doc.text('IB Learner Profile', hIconX + hIconW + 4, boxY + (boxH / 2) + 1.8)
  doc.restoreGraphicsState()

  // 3. Center Circular Diagram
  const diaW = 60
  const diaH = 60
  const diaX = (pw - diaW) / 2
  const diaY = boxY + boxH + 5

  if (diagramBase64) {
    try {
      const imgFmt = diagramBase64.includes('image/png') ? 'PNG' : 'JPEG'
      doc.addImage(diagramBase64, imgFmt, diaX, diaY, diaW, diaH)
    } catch (e) {
      console.warn('Could not render LP diagram image:', e)
    }
  }

  // 4. Learner Profile Attributes List
  const attributes = [
    {
      key: 'balanced',
      title: 'Balanced',
      desc: 'We understand the importance of balancing different aspects of our lives - intellectual, physical, (spiritual) and emotional - to achieve well-being for ourselves and others. We recognise our interdependence with other people and with the world in which we live.'
    },
    {
      key: 'caring',
      title: 'Caring',
      desc: 'We show empathy, compassion and respect. We have a commitment to service, and we act to make a positive difference in the lives of others and in the world around us.'
    },
    {
      key: 'communicators',
      title: 'Communicators',
      desc: 'We express ourselves confidently and creatively in more than one language and in many ways. We collaborate effectively, listening carefully to the perspectives of other individuals and groups.'
    },
    {
      key: 'inquirers',
      title: 'Inquirers',
      desc: 'We nurture our curiosity, developing skills for inquiry and research. We know how to learn independently and with others. We learn with enthusiasm and sustain our love of learning throughout life.'
    },
    {
      key: 'knowledgeable',
      title: 'Knowledgeable',
      desc: 'We develop and use conceptual understanding, exploring knowledge across a range of disciplines. We engage with issues and ideas that have local and global significance.'
    },
    {
      key: 'open-minded',
      title: 'Open-minded',
      desc: 'We critically appreciate our own cultures and personal histories, as well as the values and traditions of others. We seek and evaluate a range of points of view, and we are willing to grow from the experience.'
    },
    {
      key: 'principled',
      title: 'Principled',
      desc: 'We act with integrity and honesty, with a strong sense of fairness and justice, and with respect for the dignity and rights of people everywhere. We take responsibility for our actions and their consequences.'
    },
    {
      key: 'reflective',
      title: 'Reflective',
      desc: 'We thoughtfully consider the world and our own ideas and experience. We work to understand our strengths and weaknesses in order to support our learning and personal development.'
    }
  ]

  let curY = diaY + diaH + 6
  const textX = ml + 14
  const textW = cw - 14
  const iconW = 8.5
  const iconH = 8.5
  const lineH = 4.4
  const fontSize = 9.8

  attributes.forEach((attr) => {
    const iconB64 = icons[attr.key]
    if (iconB64) {
      const ext = iconB64.includes('image/jpeg') ? 'JPEG' : 'PNG'
      try {
        doc.addImage(iconB64, ext, ml + 2, curY - 0.5, iconW, iconH)
      } catch (e) {}
    }

    // Title
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10.5)
    doc.setTextColor(17, 24, 39)
    doc.text(attr.title, textX, curY + 2.5)

    // Justified Description
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(fontSize)
    doc.setTextColor(31, 41, 55)

    const words = attr.desc.trim().split(/\s+/)
    const normalSpaceW = doc.getTextWidth(' ')
    const lines = []
    let currentLine = []
    let currentLineWidth = 0

    for (const word of words) {
      const wWidth = doc.getTextWidth(word)
      const testWidth = currentLine.length === 0 ? wWidth : currentLineWidth + normalSpaceW + wWidth
      if (testWidth > textW && currentLine.length > 0) {
        lines.push(currentLine)
        currentLine = [{ text: word, width: wWidth }]
        currentLineWidth = wWidth
      } else {
        currentLine.push({ text: word, width: wWidth })
        currentLineWidth = testWidth
      }
    }
    if (currentLine.length > 0) lines.push(currentLine)

    let descY = curY + 7.2
    for (let lIdx = 0; lIdx < lines.length; lIdx++) {
      const line = lines[lIdx]
      const isLastLine = (lIdx === lines.length - 1)
      const totalWordsWidth = line.reduce((sum, itm) => sum + itm.width, 0)
      const spacesCount = line.length - 1

      let spaceW = normalSpaceW
      if (!isLastLine && spacesCount > 0) {
        spaceW = (textW - totalWordsWidth) / spacesCount
      }

      let lineX = textX
      for (let wIdx = 0; wIdx < line.length; wIdx++) {
        const itm = line[wIdx]
        doc.text(itm.text, lineX, descY)
        lineX += itm.width + spaceW
      }
      descY += lineH
    }

    curY = Math.max(curY + iconH + 3.8, descY + 2.2)
  })

  // 5. Render Standardized Footer on Page 3
  renderPypReportFooter(doc)
}

/**
 * Builds Page 4: IB Learner Profile (Part 2: Risk-takers & Thinkers) on the given jsPDF doc
 */
export const renderPypReportPage4 = async (doc, {
  logoBase64 = null,
  headerIconBase64 = null,
  diagramBase64 = null,
  icons = {}
}) => {
  const pw = doc.internal.pageSize.getWidth()
  const ph = doc.internal.pageSize.getHeight()
  const ml = 18
  const mr = 18
  const mt = 18
  const cw = pw - ml - mr

  // 1. Watermark: Subtle school crest in the center background
  if (logoBase64) {
    try {
      doc.saveGraphicsState()
      doc.setGState(new doc.GState({ opacity: 0.05 }))
      const wmW = 100
      const imgProps = doc.getImageProperties(logoBase64)
      const wmH = (imgProps.height / imgProps.width) * wmW
      doc.addImage(logoBase64, 'PNG', (pw - wmW) / 2, (ph - wmH) / 2, wmW, wmH)
      doc.restoreGraphicsState()
    } catch (e) {}
  }

  // 2. Header Box (identical to Page 3 Header Box)
  const boxY = mt
  const boxH = 20
  doc.setDrawColor(20, 45, 85) // Dark navy border
  doc.setLineWidth(0.6)
  doc.rect(ml, boxY, cw, boxH)

  // Header Box Icon (Blue circular profile icon)
  if (headerIconBase64) {
    const ext = headerIconBase64.includes('image/jpeg') ? 'JPEG' : 'PNG'
    try {
      doc.addImage(headerIconBase64, ext, ml + 5, boxY + 3.5, 13, 13)
    } catch (e) {}
  } else {
    // Vector fallback if image not available
    doc.setFillColor(235, 245, 255)
    doc.circle(ml + 11.5, boxY + 10, 6.5, 'F')
    doc.setDrawColor(59, 130, 246)
    doc.setLineWidth(0.5)
    doc.circle(ml + 11.5, boxY + 10, 6.5, 'S')
    doc.setFillColor(59, 130, 246)
    doc.circle(ml + 11.5, boxY + 8, 2.2, 'F')
  }

  // Header Title
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14.5)
  doc.setTextColor(20, 45, 85)
  doc.text('IB Learner Profile', ml + 23, boxY + 12.5)

  // 3. Center Circular Infographic Diagram (same as Page 3)
  const diaW = 58
  const diaH = 58
  const diaX = (pw - diaW) / 2
  const diaY = boxY + boxH + 6

  if (diagramBase64) {
    const ext = diagramBase64.includes('image/jpeg') ? 'JPEG' : 'PNG'
    try {
      doc.addImage(diagramBase64, ext, diaX, diaY, diaW, diaH)
    } catch (e) {}
  }

  // 4. Learner Profile Attributes (Part 2: Risk-takers & Thinkers)
  const attributes = [
    {
      key: 'risk-takers',
      title: 'Risk-takers (Courageous)',
      desc: 'We approach uncertainty with forethought and determination; we work independently and cooperatively to explore new ideas and innovative strategies. We are resourceful and resilient in the face of challenges and change.'
    },
    {
      key: 'thinkers',
      title: 'Thinkers',
      desc: 'We use critical and creative thinking skills to analyse and take responsible action on complex problems. We exercise initiative in making reasoned, ethical decisions.'
    }
  ]

  let curY = diaY + diaH + 7
  const textX = ml + 14
  const textW = cw - 14
  const iconW = 8.5
  const iconH = 8.5
  const lineH = 4.8
  const fontSize = 10

  attributes.forEach((attr) => {
    const iconB64 = icons[attr.key]
    if (iconB64) {
      const ext = iconB64.includes('image/jpeg') ? 'JPEG' : 'PNG'
      try {
        doc.addImage(iconB64, ext, ml + 2, curY - 0.5, iconW, iconH)
      } catch (e) {}
    }

    // Title
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10.5)
    doc.setTextColor(17, 24, 39)
    doc.text(attr.title, textX, curY + 2.5)

    // Justified Description
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(fontSize)
    doc.setTextColor(31, 41, 55)

    const words = attr.desc.trim().split(/\s+/)
    const normalSpaceW = doc.getTextWidth(' ')
    const lines = []
    let currentLine = []
    let currentLineWidth = 0

    for (const word of words) {
      const wWidth = doc.getTextWidth(word)
      const testWidth = currentLine.length === 0 ? wWidth : currentLineWidth + normalSpaceW + wWidth
      if (testWidth > textW && currentLine.length > 0) {
        lines.push(currentLine)
        currentLine = [{ text: word, width: wWidth }]
        currentLineWidth = wWidth
      } else {
        currentLine.push({ text: word, width: wWidth })
        currentLineWidth = testWidth
      }
    }
    if (currentLine.length > 0) lines.push(currentLine)

    let descY = curY + 7.2
    for (let lIdx = 0; lIdx < lines.length; lIdx++) {
      const line = lines[lIdx]
      const isLastLine = (lIdx === lines.length - 1)
      const totalWordsWidth = line.reduce((sum, itm) => sum + itm.width, 0)
      const spacesCount = line.length - 1

      let spaceW = normalSpaceW
      if (!isLastLine && spacesCount > 0) {
        spaceW = (textW - totalWordsWidth) / spacesCount
      }

      let lineX = textX
      for (let wIdx = 0; wIdx < line.length; wIdx++) {
        const itm = line[wIdx]
        doc.text(itm.text, lineX, descY)
        lineX += itm.width + spaceW
      }
      descY += lineH
    }

    curY = Math.max(curY + iconH + 4, descY + 5)
  })

  // 3. Render Standardized Footer on Page 4
  renderPypReportFooter(doc)
}

/**
 * Builds a single Programme of Inquiry (Unit of Inquiry) Page for a student on the given jsPDF doc
 */
export const renderPypProgrammeOfInquiryPage = async (doc, {
  unit = {},
  lois = [],
  kcs = [],
  rating = 'Achieving',
  logoBase64 = null,
  headerIconBase64 = null,
  sectionIcons = {},
  kcIcons = {}
}) => {
  const pw = doc.internal.pageSize.getWidth()   // 210mm
  const ph = doc.internal.pageSize.getHeight()  // 297mm
  const ml = 18
  const mr = 18
  const mt = 16
  const cw = pw - ml - mr // 174mm

  // 1. Watermark: Subtle school crest in the center background
  if (logoBase64) {
    try {
      doc.saveGraphicsState()
      doc.setGState(new doc.GState({ opacity: 0.05 }))
      const wmW = 100
      const imgProps = doc.getImageProperties(logoBase64)
      const wmH = (imgProps.height / imgProps.width) * wmW
      doc.addImage(logoBase64, 'PNG', (pw - wmW) / 2, (ph - wmH) / 2, wmW, wmH)
      doc.restoreGraphicsState()
    } catch (e) {}
  }

  // 2. Header Box: "Programme of Inquiry" with blue circular book icon
  let y = mt
  const boxH = 20
  doc.setDrawColor(20, 45, 85) // Navy border
  doc.setLineWidth(0.6)
  doc.rect(ml, y, cw, boxH)

  if (headerIconBase64) {
    try {
      const ext = headerIconBase64.includes('image/jpeg') ? 'JPEG' : 'PNG'
      doc.addImage(headerIconBase64, ext, ml + 5, y + 2.5, 15, 15)
    } catch (e) {}
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(17)
  doc.setTextColor(17, 24, 39) // #111827
  doc.text('Programme of Inquiry', ml + 24, y + 12.8)

  y += boxH + 8

  // 3. Unit Banner
  const bannerH = 10
  doc.setFillColor(235, 237, 240) // #EBEDF0 light grey
  doc.rect(ml, y, cw, bannerH, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(17, 24, 39)
  const unitTitle = unit.title || 'Unit of Inquiry'
  doc.text(unitTitle, ml + 3.5, y + 6.8)

  // Descriptor / Rating on the right
  if (rating) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11.5)
    doc.setTextColor(31, 41, 55)
    const ratingW = doc.getTextWidth(rating)
    doc.text(rating, ml + cw - 3.5 - ratingW, y + 6.8)
  }

  // Spacing between Unit banner and The Central Idea
  y += bannerH + 8.5

  // Helper for section header with icon
  const drawSectionHeader = (title, iconKey, currentY) => {
    const iconB64 = sectionIcons[iconKey]
    let txX = ml
    if (iconB64) {
      try {
        const ext = iconB64.includes('image/jpeg') ? 'JPEG' : 'PNG'
        doc.addImage(iconB64, ext, ml, currentY - 4.2, 5, 5)
        txX = ml + 7
      } catch (e) {}
    }
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11.5)
    doc.setTextColor(17, 24, 39)
    doc.text(title, txX, currentY)
    return currentY + 6
  }

  // 4. The Central Idea
  y = drawSectionHeader('The Central Idea', 'ci', y)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10.5)
  doc.setTextColor(31, 41, 55)
  const ciText = unit.central_idea || unit.centralIdea || '-'
  const ciLines = doc.splitTextToSize(ciText, cw)
  doc.text(ciLines, ml, y)
  y += (ciLines.length * 4.8) + 8.5 // Generous gap to Lines of Inquiry

  // 5. Lines of Inquiry
  y = drawSectionHeader('Lines of Inquiry', 'loi', y)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(31, 41, 55)

  if (lois && lois.length > 0) {
    lois.forEach(loi => {
      doc.text('•', ml + 2, y)
      const loiLines = doc.splitTextToSize(loi, cw - 8)
      doc.text(loiLines, ml + 6, y)
      y += (loiLines.length * 4.6) + 1.8
    })
  } else {
    doc.setFont('helvetica', 'italic')
    doc.text('No lines of inquiry specified for this unit.', ml + 2, y)
    y += 6
  }

  // Generous gap to Specified Concepts table
  y += 8

  // 6. Specified Concepts
  y = drawSectionHeader('Specified Concepts', 'key', y)

  // Table Header
  const col1W = 55
  const col2W = cw - col1W // 119mm
  const tableHeaderH = 8.5

  doc.setFillColor(235, 237, 240)
  doc.rect(ml, y, cw, tableHeaderH, 'F')
  doc.setDrawColor(31, 41, 55)
  doc.setLineWidth(0.3)
  doc.rect(ml, y, cw, tableHeaderH, 'S')
  doc.line(ml + col1W, y, ml + col1W, y + tableHeaderH)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10.5)
  doc.setTextColor(17, 24, 39)
  doc.text('Specified Concept', ml + 3, y + 5.8)
  doc.text('Question and Definition', ml + col1W + 3, y + 5.8)

  y += tableHeaderH

  // Concept Rows
  if (kcs && kcs.length > 0) {
    const textPaddingX = 4
    const maxTextW = col2W - (textPaddingX * 2)
    const fontSize = 10
    const lineH = 4.8

    kcs.forEach(kc => {
      const qText = kc.question || `What is ${kc.key}?`
      const dText = kc.definition || ''

      // 1. Format Question (Bold 10pt)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(fontSize)
      const qLines = doc.splitTextToSize(qText, maxTextW)

      // 2. Format Definition (Normal 10pt with custom justified wrapping)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(fontSize)
      const words = dText.trim().split(/\s+/)
      const normalSpaceW = doc.getTextWidth(' ')
      const defLines = []
      let curLine = []
      let curLineW = 0

      for (const w of words) {
        const wW = doc.getTextWidth(w)
        const testW = curLine.length === 0 ? wW : curLineW + normalSpaceW + wW
        if (testW > maxTextW && curLine.length > 0) {
          defLines.push(curLine)
          curLine = [{ text: w, width: wW }]
          curLineW = wW
        } else {
          curLine.push({ text: w, width: wW })
          curLineW = testW
        }
      }
      if (curLine.length > 0) defLines.push(curLine)

      // Calculate exact height of right-cell text block
      const qHeight = qLines.length * lineH
      const dHeight = defLines.length * lineH
      const gapBetweenQD = 1.2
      const totalContentH = qHeight + gapBetweenQD + dHeight
      
      // Row height with comfortable top and bottom padding (minimum 26mm)
      const rowH = Math.max(totalContentH + 10, 26)

      // Draw row borders
      doc.rect(ml, y, cw, rowH, 'S')
      doc.line(ml + col1W, y, ml + col1W, y + rowH)

      // Left Cell: Centered Unit (Icon if uploaded + Name)
      const iconB64 = kc.iconBase64 || null
      if (iconB64) {
        const iconW = 12
        const iconH = 11
        const nameGap = 2.5
        const textH = 3.5
        const leftBlockH = iconH + nameGap + textH // Total block height ~17mm
        const leftBlockY = y + (rowH - leftBlockH) / 2

        try {
          const ext = iconB64.includes('image/png') ? 'PNG' : 'JPEG'
          doc.addImage(iconB64, ext, ml + (col1W / 2) - (iconW / 2), leftBlockY, iconW, iconH)
        } catch (e) {}

        doc.setFont('helvetica', 'normal')
        doc.setFontSize(10)
        doc.setTextColor(17, 24, 39)
        const nameW = doc.getTextWidth(kc.key || kc.name || '')
        doc.text(kc.key || kc.name || '', ml + (col1W / 2) - (nameW / 2), leftBlockY + iconH + nameGap + 2.8)
      } else {
        // No uploaded image: cleanly center the Key Concept name vertically in the left cell
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(10.5)
        doc.setTextColor(17, 24, 39)
        const nameW = doc.getTextWidth(kc.key || kc.name || '')
        doc.text(kc.key || kc.name || '', ml + (col1W / 2) - (nameW / 2), y + (rowH / 2) + 1.8)
      }

      // Right Cell: Perfectly Vertically Centered (Question + Definition)
      const rightPadTop = (rowH - totalContentH) / 2
      let rY = y + rightPadTop + 3.6

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(fontSize)
      doc.setTextColor(17, 24, 39)
      for (const ql of qLines) {
        doc.text(ql, ml + col1W + textPaddingX, rY)
        rY += lineH
      }

      rY += gapBetweenQD

      // Right Cell: Justified Definition (Identical 10pt font size across all concepts)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(fontSize)
      doc.setTextColor(31, 41, 55)

      for (let lIdx = 0; lIdx < defLines.length; lIdx++) {
        const line = defLines[lIdx]
        const isLastLine = (lIdx === defLines.length - 1)
        const wordsW = line.reduce((sum, itm) => sum + itm.width, 0)
        const spacesCount = line.length - 1

        let spaceW = normalSpaceW
        if (!isLastLine && spacesCount > 0) {
          spaceW = (maxTextW - wordsW) / spacesCount
        }

        let lineX = ml + col1W + textPaddingX
        for (let wIdx = 0; wIdx < line.length; wIdx++) {
          const itm = line[wIdx]
          doc.text(itm.text, lineX, rY)
          lineX += itm.width + spaceW
        }
        rY += lineH
      }

      y += rowH
    })
  }

  // 7. Render Standardized Footer on Programme of Inquiry page
  renderPypReportFooter(doc)
}

/**
 * Main handler to generate and open PYP Report PDF for a class & semester
 */
export const generatePypClassReportPDF = async ({
  classId,
  className,
  yearId,
  yearName,
  semester = '1',
  paperSize = 'a4',
  targetStudentId = null, // null | 'all' | student_user_id (number/string)
  customReportDate = null,
  onLoading = () => {},
  onError = () => {}
}) => {
  try {
    onLoading(true)

    // 1. Fetch Class details & Homeroom teacher
    const { data: classData } = await supabase
      .from('kelas')
      .select('kelas_id, kelas_nama, kelas_user_id, kelas_unit_id, kelas_year_id')
      .eq('kelas_id', Number(classId))
      .single()

    const activeClassName = className || classData?.kelas_nama || 'PYP Class'

    let homeroomTeachers = []
    if (classData?.kelas_user_id) {
      const { data: teacherData } = await supabase
        .from('users')
        .select('user_nama_depan, user_nama_belakang')
        .eq('user_id', classData.kelas_user_id)
        .single()

      if (teacherData) {
        homeroomTeachers.push(`${teacherData.user_nama_depan || ''} ${teacherData.user_nama_belakang || ''}`.trim())
      }
    }
    if (homeroomTeachers.length === 0) {
      homeroomTeachers = ['Homeroom Teacher']
    }

    // 2. Fetch Students in Class via detail_siswa and users (per DATABASE_SCHEMA.md)
    const { data: detailSiswaData, error: dsErr } = await supabase
      .from('detail_siswa')
      .select('detail_siswa_id, detail_siswa_user_id')
      .eq('detail_siswa_kelas_id', Number(classId))

    if (dsErr) {
      console.warn('Error querying detail_siswa:', dsErr)
    }

    let students = []
    if (detailSiswaData && detailSiswaData.length > 0) {
      const userIds = [...new Set(detailSiswaData.map(ds => ds.detail_siswa_user_id).filter(Boolean))]
      if (userIds.length > 0) {
        const { data: usersData, error: uErr } = await supabase
          .from('users')
          .select('user_id, user_nama_depan, user_nama_belakang, user_birth_date')
          .in('user_id', userIds)

        if (!uErr && usersData) {
          const userMap = new Map()
          usersData.forEach(u => userMap.set(u.user_id, u))

          students = detailSiswaData.map(ds => {
            const u = userMap.get(ds.detail_siswa_user_id)
            return {
              detail_siswa_id: ds.detail_siswa_id,
              user_id: ds.detail_siswa_user_id,
              user_nama_depan: u?.user_nama_depan || 'Unknown',
              user_nama_belakang: u?.user_nama_belakang || '',
              user_birth_date: u?.user_birth_date || null
            }
          }).sort((a, b) => (a.user_nama_depan || '').localeCompare(b.user_nama_depan || ''))
        }
      }
    }

    // Fallback sample student if class has no enrolled students yet
    if (students.length === 0) {
      students = [{
        detail_siswa_id: 0,
        user_id: 0,
        user_nama_depan: 'Timothy',
        user_nama_belakang: 'Lauda'
      }]
    }

    // Filter to single target student if requested
    if (targetStudentId && targetStudentId !== 'all') {
      const singleMatch = students.filter(s => String(s.user_id) === String(targetStudentId))
      if (singleMatch.length > 0) {
        students = singleMatch
      }
    }

    // 3. Fetch Mentor Comment / Attendance records for these students
    const studentUserIds = students.map(s => s.user_id).filter(id => id > 0)
    let attendanceMap = {}
    if (studentUserIds.length > 0) {
      const { data: mentorComments } = await supabase
        .from('mentor_comment')
        .select('student_user_id, absent, present, late, excused, sick')
        .eq('kelas_id', Number(classId))
        .eq('semester', Number(semester))
        .in('student_user_id', studentUserIds)

      for (const mc of (mentorComments || [])) {
        attendanceMap[mc.student_user_id] = {
          absent: mc.absent ?? 1,
          present: mc.present ?? 92,
          late: mc.late ?? 0,
          excused: (mc.excused ?? 0) + (mc.sick ?? 0)
        }
      }
    }

    // 4. Fetch PYP Report Settings (Principal Name, Title, Date)
    let principalName = 'Christin Anggraeni'
    let principalTitle = 'PYP Principal'
    let preparedDate = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    let signatureUrl = null

    // Check report_settings table if available
    const { data: reportSettings } = await supabase
      .from('report_settings')
      .select('principal_name, principal_title, report_date_s1, report_date_s2, signature_principal_url')
      .eq('unit_id', classData?.kelas_unit_id || 1)
      .order('id', { ascending: false })
      .limit(1)

    if (reportSettings && reportSettings.length > 0) {
      const rs = reportSettings[0]
      if (rs.principal_name) principalName = rs.principal_name
      if (rs.principal_title) principalTitle = rs.principal_title
      if (rs.signature_principal_url) signatureUrl = rs.signature_principal_url
      const rawDate = semester === '1' ? rs.report_date_s1 : rs.report_date_s2
      if (rawDate) {
        preparedDate = new Date(rawDate + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
      }
    }

    // Override with custom user-selected report date if provided
    if (customReportDate) {
      try {
        const dateObj = new Date(customReportDate + (customReportDate.includes('T') ? '' : 'T00:00:00'))
        if (!isNaN(dateObj.getTime())) {
          preparedDate = dateObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
        }
      } catch (e) {
        console.warn('Custom date parsing fallback:', e)
      }
    }

    // 5. Fetch Units of Inquiry for this class in this semester
    const semNum = parseInt(semester, 10) || 1
    let classUnits = []
    try {
      const { data: dedicatedUnits } = await supabase
        .from('pyp_unit')
        .select('*')
        .eq('kelas_id', Number(classId))
        .eq('semester', semNum)
        .or('is_deleted.eq.0,is_deleted.is.null')
        .order('id', { ascending: true })

      if (dedicatedUnits && dedicatedUnits.length > 0) {
        classUnits = dedicatedUnits
      } else {
        // Fallback: Check if there are units without semester column populated
        const { data: allDedicated } = await supabase
          .from('pyp_unit')
          .select('*')
          .eq('kelas_id', Number(classId))
          .or('is_deleted.eq.0,is_deleted.is.null')
          .order('id', { ascending: true })

        if (allDedicated && allDedicated.length > 0) {
          classUnits = allDedicated.filter(u => Number(u.semester || 1) === semNum)
        }
      }
    } catch (e) {
      console.warn('Error querying class units for PYP report:', e)
    }

    // Fallback to topic if no dedicated units
    if (classUnits.length === 0) {
      try {
        const { data: fallbackTopics } = await supabase
          .from('topic')
          .select('*')
          .eq('topic_kelas_id', Number(classId))
          .eq('topic_status', 'published')
          .order('topic_id', { ascending: true })

        if (fallbackTopics && fallbackTopics.length > 0) {
          classUnits = fallbackTopics.map(t => ({
            id: t.topic_id,
            title: t.topic_nama,
            central_idea: t.topic_statement,
            theme: t.topic_global_context,
            duration_weeks: t.topic_duration || 6,
            semester: 1,
            isDedicated: false
          }))
        }
      } catch (e) {}
    }

    // Fetch LOI & Key Concept pivots for the units
    const unitIds = classUnits.map(u => u.id)
    let unitLoiMap = {}
    let unitKcMap = {}

    if (unitIds.length > 0) {
      try {
        const [resLoiPiv, resKcPiv, resLoiList, resKcList] = await Promise.all([
          supabase.from('pyploiunit').select('*').in('unitId', unitIds).or('is_deleted.eq.0,is_deleted.is.null'),
          supabase.from('pypkcunit').select('*').in('unitId', unitIds).or('is_deleted.eq.0,is_deleted.is.null'),
          supabase.from('pyp_loi_list').select('*').or('is_deleted.eq.0,is_deleted.is.null'),
          supabase.from('pyp_kc_list').select('*').or('is_deleted.eq.0,is_deleted.is.null')
        ])

        const loiMap = {}
        if (resLoiList.data) resLoiList.data.forEach(l => { loiMap[l.id] = l.name })

        const kcMap = {}
        if (resKcList.data) {
          await Promise.all(resKcList.data.map(async (k) => {
            let b64 = null
            const customImgUrl = k.image_url || (k.icon && (k.icon.startsWith('http') || k.icon.startsWith('/') || k.icon.startsWith('data:')) ? k.icon : null)
            if (customImgUrl) {
              b64 = await loadImgBase64(customImgUrl)
            }
            kcMap[k.id] = { ...k, iconBase64: b64 }
          }))
        }

        if (resLoiPiv.data) {
          resLoiPiv.data.forEach(p => {
            if (!unitLoiMap[p.unitId]) unitLoiMap[p.unitId] = []
            if (loiMap[p.loiId]) unitLoiMap[p.unitId].push(loiMap[p.loiId])
          })
        }

        if (resKcPiv.data) {
          resKcPiv.data.forEach(p => {
            if (!unitKcMap[p.unitId]) unitKcMap[p.unitId] = []
            if (kcMap[p.kcId]) unitKcMap[p.unitId].push(kcMap[p.kcId])
          })
        }
      } catch (e) {
        console.warn('Error loading LOI/KC pivots for POI pages:', e)
      }
    }

    // 6. Load Logos & Page Icons Base64
    const [
      logoBase64,
      descriptorIconBase64,
      ibLogoBase64,
      lpHeaderIconBase64,
      lpDiagramBase64,
      iconBalanced,
      iconCaring,
      iconCommunicators,
      iconInquirers,
      iconKnowledgeable,
      iconOpenMinded,
      iconPrincipled,
      iconReflective,
      iconRiskTakers,
      iconThinkers,
      poiHeaderIconBase64,
      poiCiIconBase64,
      poiLoiIconBase64,
      poiKeyIconBase64,
      kcHeadingBase64,
      kcFormBase64,
      kcFuncBase64,
      kcCausBase64,
      kcChanBase64,
      kcConnBase64,
      kcPerspBase64,
      kcRespBase64
    ] = await Promise.all([
      loadImgBase64('/images/login-logo.png'),
      loadImgBase64('/images/pyp-descriptor-icon.png'),
      loadImgBase64('/images/ib-pyp-logo.jpg'),
      loadImgBase64('/images/lp-header-icon.jpg'),
      loadImgBase64('/images/lp-diagram.jpg'),
      loadImgBase64('/images/lp-balanced.jpg'),
      loadImgBase64('/images/lp-caring.jpg'),
      loadImgBase64('/images/lp-communicators.jpg'),
      loadImgBase64('/images/lp-inquirers.jpg'),
      loadImgBase64('/images/lp-knowledgeable.jpg'),
      loadImgBase64('/images/lp-open-minded.jpg'),
      loadImgBase64('/images/lp-principled.jpg'),
      loadImgBase64('/images/lp-reflective.jpg'),
      loadImgBase64('/images/lp-risk-takers.jpg'),
      loadImgBase64('/images/lp-thinkers.jpg'),
      loadImgBase64('/images/poi-header-icon.jpg') || loadImgBase64('/images/poi-header-icon.png'),
      loadImgBase64('/images/poi-ci-icon.jpg') || loadImgBase64('/images/poi-ci-icon.png'),
      loadImgBase64('/images/poi-loi-icon.jpg') || loadImgBase64('/images/poi-loi-icon.png'),
      loadImgBase64('/images/poi-key-icon.jpg') || loadImgBase64('/images/poi-key-icon.png'),
      loadImgBase64('/images/kc_heading.jpg'),
      loadImgBase64('/images/kc_form.jpg'),
      loadImgBase64('/images/kc_function.jpg'),
      loadImgBase64('/images/kc_causation.jpg'),
      loadImgBase64('/images/kc_change.jpg'),
      loadImgBase64('/images/kc_connection.jpg'),
      loadImgBase64('/images/kc_perspective.jpg'),
      loadImgBase64('/images/kc_responsibility.jpg')
    ])

    const lpIcons = {
      balanced: iconBalanced,
      caring: iconCaring,
      communicators: iconCommunicators,
      inquirers: iconInquirers,
      knowledgeable: iconKnowledgeable,
      'open-minded': iconOpenMinded,
      principled: iconPrincipled,
      reflective: iconReflective,
      'risk-takers': iconRiskTakers,
      thinkers: iconThinkers
    }

    const sectionIcons = {
      ci: poiCiIconBase64,
      loi: poiLoiIconBase64,
      key: kcHeadingBase64 || poiKeyIconBase64
    }

    const kcIcons = {
      form: kcFormBase64,
      function: kcFuncBase64,
      causation: kcCausBase64,
      change: kcChanBase64,
      connection: kcConnBase64,
      perspective: kcPerspBase64,
      responsibility: kcRespBase64,
      kc_form: kcFormBase64,
      kc_function: kcFuncBase64,
      kc_causation: kcCausBase64,
      kc_change: kcChanBase64,
      kc_connection: kcConnBase64,
      kc_perspective: kcPerspBase64,
      kc_responsibility: kcRespBase64
    }

    // 7. Generate PDF Doc with jsPDF
    const doc = new jsPDF('portrait', 'mm', paperSize || 'a4')

    for (let i = 0; i < students.length; i++) {
      if (i > 0) {
        doc.addPage()
      }

      const st = students[i]
      const fullName = `${st.user_nama_depan || ''} ${st.user_nama_belakang || ''}`.trim() || 'Student Name'
      const att = attendanceMap[st.user_id] || { absent: 1, present: 92, late: 0, excused: 8 }

      // ── Page 1: Student Details, Message to Parents, Signature, Attendance ──
      await renderPypReportPage1(doc, {
        studentName: fullName,
        gradeName: activeClassName,
        homeroomTeachers: homeroomTeachers,
        semester: semester,
        yearName: yearName || '2025/2026',
        preparedDate: preparedDate,
        principalName: principalName,
        principalTitle: principalTitle,
        signatureUrl: signatureUrl,
        logoBase64: logoBase64,
        ibLogoBase64: ibLogoBase64,
        attendance: att
      })

      // ── Page 2: Student Progress Descriptor ──
      doc.addPage()
      await renderPypReportPage2(doc, {
        logoBase64: logoBase64,
        descriptorIconBase64: descriptorIconBase64
      })

      // ── Page 3: IB Learner Profile (Part 1) ──
      doc.addPage()
      await renderPypReportPage3(doc, {
        logoBase64: logoBase64,
        headerIconBase64: lpHeaderIconBase64,
        diagramBase64: lpDiagramBase64,
        icons: lpIcons
      })

      // ── Page 4: IB Learner Profile (Part 2: Risk-takers & Thinkers) ──
      doc.addPage()
      await renderPypReportPage4(doc, {
        logoBase64: logoBase64,
        headerIconBase64: lpHeaderIconBase64,
        diagramBase64: lpDiagramBase64,
        icons: lpIcons
      })

      // ── Page 5+: Programme of Inquiry (1 page per Unit in this semester) ──
      for (const unit of classUnits) {
        doc.addPage()
        await renderPypProgrammeOfInquiryPage(doc, {
          unit: unit,
          lois: unitLoiMap[unit.id] || [],
          kcs: unitKcMap[unit.id] || [],
          rating: 'Achieving',
          logoBase64: logoBase64,
          headerIconBase64: poiHeaderIconBase64,
          sectionIcons: sectionIcons,
          kcIcons: kcIcons
        })
      }
    }

    // 8. Output PDF Blob & open in preview
    const pdfBlob = doc.output('blob')
    const pdfUrl = URL.createObjectURL(pdfBlob)
    window.open(pdfUrl, '_blank')
  } catch (err) {
    console.error('Error generating PYP report PDF:', err)
    onError(err)
  } finally {
    onLoading(false)
  }
}
