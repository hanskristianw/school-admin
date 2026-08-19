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
  doc.setFontSize(14.5)
  doc.setTextColor(17, 24, 39)
  doc.text('Chung Chung Christian School', txStart, y + 6.5)
  doc.text('PYP Report', txStart, y + 12.5)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(55, 65, 81)
  doc.text(`${semesterOrdinal} (${formattedYear})`, txStart, y + 18)

  doc.setFontSize(8.5)
  doc.setTextColor(107, 114, 128)
  doc.text(`Prepared : ${preparedDate}`, txStart, y + 23)

  // Top Right: IB Primary Years Programme Logo
  const ibW = 40
  const ibH = 13
  const ibX = pw - mr - ibW
  drawIbPypLogo(doc, ibX, y + 1.5, ibW, ibH)

  // 3. Student Name & Metadata (Grade + Homeroom Teachers)
  y = mt + 38

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(17)
  doc.setTextColor(17, 24, 39)
  doc.text(studentName, ml, y)

  y += 8
  const col2X = ml + 82

  // Column 1: Grade
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(17, 24, 39)
  doc.text('Grade', ml, y)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9.5)
  doc.setTextColor(55, 65, 81)
  doc.text(gradeName, ml, y + 5)

  // Column 2: Homeroom Teacher(s)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(17, 24, 39)
  doc.text('Homeroom Teacher', col2X, y)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9.5)
  doc.setTextColor(55, 65, 81)

  let teacherY = y + 5
  const teachersList = Array.isArray(homeroomTeachers) && homeroomTeachers.length > 0 
    ? homeroomTeachers 
    : [typeof homeroomTeachers === 'string' ? homeroomTeachers : 'Homeroom Teacher']

  teachersList.forEach((t) => {
    if (t && t !== '-') {
      doc.text(t, col2X, teacherY)
      teacherY += 4.5
    }
  })

  // 4. Letter to Parents
  y = Math.max(y + 18, teacherY + 6)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9.5)
  doc.setTextColor(17, 24, 39)
  doc.text('Dear Parents,', ml, y)

  y += 6
  const letterParagraph = `At Chung Chung Christian School, we believe in an education that actively combines challenging and enriching experiences with academic rigor and creative opportunities. Our goal is to empower students to courageously push the boundaries of their experiences and explore the vast possibilities available to them. While we take pride in their academic achievements, our commitment goes beyond test scores. We aim for our students to discover the excitement of realizing their capabilities far exceed what they might have thought possible. We hold high expectations for our students, and they, in turn, have high expectations for themselves. It is crucial that parents wholeheartedly embrace and support the school's ethos. With this, I am pleased to present your child's report card for this semester. Let's collaborate to create an environment that fosters growth and development.`

  const letterLines = doc.splitTextToSize(letterParagraph, cw)
  const lineH = 4.8
  letterLines.forEach((line) => {
    doc.text(line, ml, y)
    y += lineH
  })

  // Kind regards
  y += 3
  doc.text('Kind regards,', ml, y)

  // Signature
  y += 4
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
  doc.setFontSize(9.5)
  doc.setTextColor(17, 24, 39)
  doc.text(principalName, ml, y)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(55, 65, 81)
  doc.text(principalTitle, ml, y + 4.5)

  // 5. Attendance Section
  y += 15
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(17, 24, 39)
  doc.text('Attendance', ml, y)

  y += 5
  const badges = [
    { label: 'Absent', count: attendance.absent ?? 0, bg: [239, 68, 68] },     // Red #EF4444
    { label: 'Present', count: attendance.present ?? 0, bg: [34, 197, 94] },   // Green #22C55E
    { label: 'Late', count: attendance.late ?? 0, bg: [234, 179, 8] },         // Yellow/Amber #EAB308
    { label: 'Excused', count: attendance.excused ?? 0, bg: [79, 70, 229] }    // Indigo/Blue #4F46E5
  ]

  let bx = ml
  const badgeH = 6.2
  const badgeR = 1.2

  badges.forEach((b) => {
    const txt = `${b.count} ${b.label}`
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    const tw = doc.getTextWidth(txt)
    const bw = tw + 8

    doc.setFillColor(b.bg[0], b.bg[1], b.bg[2])
    doc.roundedRect(bx, y, bw, badgeH, badgeR, badgeR, 'F')

    doc.setTextColor(255, 255, 255)
    doc.text(txt, bx + 4, y + 4.3)

    bx += bw + 3
  })
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

    // 5. Load School Logo Base64
    const logoBase64 = await loadImgBase64('/images/login-logo.png')

    // 6. Generate PDF Doc with jsPDF
    const doc = new jsPDF('portrait', 'mm', 'a4')

    for (let i = 0; i < students.length; i++) {
      if (i > 0) {
        doc.addPage()
      }

      const st = students[i]
      const fullName = `${st.user_nama_depan || ''} ${st.user_nama_belakang || ''}`.trim() || 'Student Name'
      const att = attendanceMap[st.user_id] || { absent: 1, present: 92, late: 0, excused: 8 }

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
        attendance: att
      })
    }

    // 7. Output PDF Blob & open in preview
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
