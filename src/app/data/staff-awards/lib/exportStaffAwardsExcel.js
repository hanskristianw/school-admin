/**
 * Executive-grade ExcelJS report builder and browser downloader for Staff Awards.
 * All headings, columns, and status values are strictly in English.
 */

function formatWibTimestamp(isoStr) {
  if (!isoStr) return '-'
  try {
    return (
      new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Jakarta',
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }).format(new Date(isoStr)) + ' WIB'
    )
  } catch {
    return String(isoStr)
  }
}

function styleHairlineBorder(cell, color = 'FFD8D6D0') {
  cell.border = {
    top: { style: 'thin', color: { argb: color } },
    left: { style: 'thin', color: { argb: color } },
    bottom: { style: 'thin', color: { argb: color } },
    right: { style: 'thin', color: { argb: color } }
  }
}

function styleHeaderRow(row, bgArgb = 'FF111111') {
  row.height = 24
  row.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgArgb } }
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } }
    cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true }
    styleHairlineBorder(cell, 'FF2F3437')
  })
}

/**
 * Builds an ExcelJS Workbook instance containing 3 styled sheets:
 * 1. Executive Summary
 * 2. Category Breakdown
 * 3. Unit & Staff Turnout
 */
export async function buildStaffAwardsWorkbook({ event, participation, results = [] }) {
  const ExcelJS = (await import('exceljs')).default
  const wb = new ExcelJS.Workbook()
  wb.creator = 'Chung Chung Christian School'
  wb.created = new Date()

  const totalEligible = participation?.total_eligible || 0
  const votedCount = participation?.voted_count || 0
  const notVotedCount = participation?.not_voted_count || 0
  const turnoutPct = participation?.turnout_percentage ?? 0
  const generatedAt = formatWibTimestamp(new Date().toISOString())

  // ──────────────────────────────────────────────────────────────
  // SHEET 1: Executive Summary
  // ──────────────────────────────────────────────────────────────
  const wsSummary = wb.addWorksheet('Executive Summary', {
    pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 }
  })
  wsSummary.views = [{ state: 'frozen', ySplit: 9 }]
  wsSummary.columns = [
    { width: 6 },
    { width: 28 },
    { width: 32 },
    { width: 15 },
    { width: 24 },
    { width: 10 },
    { width: 12 },
    { width: 16 },
    { width: 32 }
  ]

  wsSummary.mergeCells('A1:I1')
  wsSummary.getCell('A1').value = 'CHUNG CHUNG CHRISTIAN SCHOOL'
  wsSummary.getCell('A1').font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF787774' } }

  wsSummary.mergeCells('A2:I2')
  wsSummary.getCell('A2').value = 'TEACHERS & STAFF RECOGNITION — OFFICIAL REPORT'
  wsSummary.getCell('A2').font = { name: 'Georgia', size: 16, bold: true, color: { argb: 'FF111111' } }

  const metaLines = [
    ['Event Title:', event?.title || 'Teachers & Staff Recognition', 'Generated At:', generatedAt],
    ['Academic Year:', event?.year_name || '-', 'Event Status:', String(event?.status || 'active').toUpperCase()]
  ]
  metaLines.forEach((m, idx) => {
    const r = wsSummary.getRow(4 + idx)
    r.getCell(1).value = m[0]
    r.getCell(1).font = { bold: true, size: 10, color: { argb: 'FF787774' } }
    wsSummary.mergeCells(4 + idx, 2, 4 + idx, 4)
    r.getCell(2).value = m[1]
    r.getCell(2).font = { size: 10, color: { argb: 'FF111111' } }
    r.getCell(6).value = m[2]
    r.getCell(6).font = { bold: true, size: 10, color: { argb: 'FF787774' } }
    wsSummary.mergeCells(4 + idx, 7, 4 + idx, 9)
    r.getCell(7).value = m[3]
    r.getCell(7).font = { size: 10, color: { argb: 'FF111111' } }
  })

  // Turnout KPI Strip on Row 7
  const kpiRow = wsSummary.getRow(7)
  kpiRow.height = 22
  const kpiItems = [
    { label: 'Eligible Staff', val: totalEligible, fill: 'FFF7F6F3', text: 'FF111111' },
    { label: 'Voted', val: votedCount, fill: 'FFEDF3EC', text: 'FF346538' },
    { label: 'Not Yet Voted', val: notVotedCount, fill: 'FFFDEBEC', text: 'FF9F2F2D' },
    { label: 'Turnout Rate', val: `${turnoutPct}%`, fill: 'FFFBF3DB', text: 'FF956400' }
  ]
  kpiItems.forEach((item, i) => {
    const labelCol = i * 2 + 1
    const valCol = i * 2 + 2
    const cLabel = kpiRow.getCell(labelCol)
    const cVal = kpiRow.getCell(valCol)
    cLabel.value = item.label
    cVal.value = item.val
    cLabel.font = { bold: true, size: 10, color: { argb: item.text } }
    cVal.font = { bold: true, size: 11, color: { argb: item.text } }
    cVal.alignment = { horizontal: 'center', vertical: 'middle' }
    cLabel.alignment = { horizontal: 'left', vertical: 'middle' }
    ;[cLabel, cVal].forEach(c => {
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: item.fill } }
      styleHairlineBorder(c)
    })
  })

  // Section header & Winners Table
  const winnersHeaderRow = wsSummary.getRow(9)
  winnersHeaderRow.values = [
    '#',
    'Award Category',
    'Winner(s) — Rank #1',
    'Unit',
    'Role',
    'Votes',
    'Vote Share',
    'Total Category Votes',
    'Runner-Up — Rank #2'
  ]
  styleHeaderRow(winnersHeaderRow)
  winnersHeaderRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' }
  winnersHeaderRow.getCell(6).alignment = { horizontal: 'center', vertical: 'middle' }
  winnersHeaderRow.getCell(7).alignment = { horizontal: 'center', vertical: 'middle' }
  winnersHeaderRow.getCell(8).alignment = { horizontal: 'center', vertical: 'middle' }

  results.forEach((cat, idx) => {
    const rowIdx = 10 + idx
    const rank1 = (cat.rankings || []).filter(r => r.rank === 1)
    const rank2 = (cat.rankings || []).filter(r => r.rank === 2)
    const winnerText = rank1.map(w => w.full_name).join(', ') || 'No votes cast'
    const winnerUnits = Array.from(new Set(rank1.map(w => w.unit_name))).join(', ') || '-'
    const winnerRoles = Array.from(new Set(rank1.map(w => w.role_name))).join(', ') || '-'
    const topVotes = rank1[0]?.vote_count || 0
    const topShare = rank1[0]?.percentage ? `${rank1[0].percentage}%` : '0%'
    const runnerUpText = rank2.length > 0
      ? rank2.map(r => `${r.full_name} (${r.vote_count})`).join(', ')
      : '-'

    const row = wsSummary.getRow(rowIdx)
    row.height = 24
    row.values = [
      cat.sort_order,
      cat.title,
      winnerText,
      winnerUnits,
      winnerRoles,
      topVotes,
      topShare,
      cat.total_votes || 0,
      runnerUpText
    ]

    const bg = rank1.length > 0 ? 'FFEDF3EC' : 'FFFFFFFF'
    row.eachCell((cell, colNumber) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colNumber === 3 && rank1.length > 0 ? bg : idx % 2 === 1 ? 'FFFBFBFA' : 'FFFFFFFF' } }
      cell.font = {
        name: 'Calibri',
        size: 10,
        bold: colNumber === 3 && rank1.length > 0,
        color: { argb: colNumber === 3 && rank1.length > 0 ? 'FF346538' : 'FF111111' }
      }
      cell.alignment = {
        vertical: 'middle',
        horizontal: [1, 6, 7, 8].includes(colNumber) ? 'center' : 'left',
        wrapText: true
      }
      styleHairlineBorder(cell)
    })
  })

  // ──────────────────────────────────────────────────────────────
  // SHEET 2: Category Breakdown
  // ──────────────────────────────────────────────────────────────
  const wsBreakdown = wb.addWorksheet('Category Breakdown', {
    pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 }
  })
  wsBreakdown.views = [{ state: 'frozen', ySplit: 3 }]
  wsBreakdown.columns = [
    { width: 8 },
    { width: 32 },
    { width: 8 },
    { width: 34 },
    { width: 16 },
    { width: 26 },
    { width: 10 },
    { width: 12 }
  ]

  wsBreakdown.mergeCells('A1:H1')
  wsBreakdown.getCell('A1').value = `${event?.title || 'Staff Awards'} — Detailed Category Breakdown`
  wsBreakdown.getCell('A1').font = { name: 'Georgia', size: 13, bold: true, color: { argb: 'FF111111' } }

  const bdHeader = wsBreakdown.getRow(3)
  bdHeader.values = ['Cat #', 'Award Category', 'Rank', 'Nominee Name', 'Unit', 'Role', 'Votes', 'Share (%)']
  styleHeaderRow(bdHeader)
  bdHeader.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' }
  bdHeader.getCell(3).alignment = { horizontal: 'center', vertical: 'middle' }
  bdHeader.getCell(7).alignment = { horizontal: 'center', vertical: 'middle' }
  bdHeader.getCell(8).alignment = { horizontal: 'center', vertical: 'middle' }

  let bdRowIdx = 4
  for (const cat of results) {
    const list = cat.rankings || []
    if (list.length === 0) {
      const r = wsBreakdown.getRow(bdRowIdx++)
      r.height = 20
      r.values = [cat.sort_order, cat.title, '-', 'No votes recorded', '-', '-', 0, '0%']
      r.eachCell((cell, col) => {
        cell.font = { name: 'Calibri', size: 10, italic: col === 4, color: { argb: 'FF787774' } }
        cell.alignment = { vertical: 'middle', horizontal: [1, 3, 7, 8].includes(col) ? 'center' : 'left' }
        styleHairlineBorder(cell)
      })
    } else {
      for (const item of list) {
        const r = wsBreakdown.getRow(bdRowIdx++)
        r.height = 20
        r.values = [
          cat.sort_order,
          cat.title,
          item.rank,
          item.full_name,
          item.unit_name,
          item.role_name,
          item.vote_count,
          `${item.percentage}%`
        ]
        const isFirst = item.rank === 1
        r.eachCell((cell, col) => {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: isFirst ? 'FFFBF3DB' : 'FFFFFFFF' }
          }
          cell.font = {
            name: 'Calibri',
            size: 10,
            bold: isFirst && [3, 4, 7].includes(col),
            color: { argb: isFirst ? 'FF956400' : 'FF111111' }
          }
          cell.alignment = { vertical: 'middle', horizontal: [1, 3, 7, 8].includes(col) ? 'center' : 'left' }
          styleHairlineBorder(cell)
        })
      }
    }
  }

  // ──────────────────────────────────────────────────────────────
  // SHEET 3: Unit & Staff Turnout
  // ──────────────────────────────────────────────────────────────
  const wsTurnout = wb.addWorksheet('Unit & Staff Turnout', {
    pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 }
  })
  wsTurnout.columns = [
    { width: 8 },
    { width: 34 },
    { width: 18 },
    { width: 28 },
    { width: 18 },
    { width: 24 }
  ]

  wsTurnout.mergeCells('A1:F1')
  wsTurnout.getCell('A1').value = `${event?.title || 'Staff Awards'} — Unit & Staff Participation Roster`
  wsTurnout.getCell('A1').font = { name: 'Georgia', size: 13, bold: true, color: { argb: 'FF111111' } }

  // Section A: Unit Summary
  wsTurnout.getCell('A3').value = 'SECTION A — TURNOUT BY UNIT'
  wsTurnout.getCell('A3').font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF787774' } }

  const unitHeader = wsTurnout.getRow(4)
  unitHeader.values = ['#', 'Unit', 'Eligible Staff', 'Voted', 'Not Yet Voted', 'Turnout Rate']
  styleHeaderRow(unitHeader)
  ;[1, 3, 4, 5, 6].forEach(c => { unitHeader.getCell(c).alignment = { horizontal: 'center', vertical: 'middle' } })

  const unitStatsMap = new Map()
  const addUnitStat = (unitName, voted) => {
    const key = unitName || 'School'
    if (!unitStatsMap.has(key)) unitStatsMap.set(key, { unit: key, eligible: 0, voted: 0, notVoted: 0 })
    const s = unitStatsMap.get(key)
    s.eligible += 1
    if (voted) s.voted += 1
    else s.notVoted += 1
  }
  ;(participation?.voted_users || []).forEach(u => addUnitStat(u.unit_name, true))
  ;(participation?.not_voted_users || []).forEach(u => addUnitStat(u.unit_name, false))
  const unitRows = Array.from(unitStatsMap.values()).sort((a, b) => a.unit.localeCompare(b.unit, 'en'))

  let uRowIdx = 5
  unitRows.forEach((u, idx) => {
    const rate = u.eligible > 0 ? `${((u.voted / u.eligible) * 100).toFixed(1)}%` : '0%'
    const r = wsTurnout.getRow(uRowIdx++)
    r.height = 20
    r.values = [idx + 1, u.unit, u.eligible, u.voted, u.notVoted, rate]
    r.eachCell((cell, col) => {
      cell.font = { name: 'Calibri', size: 10, color: { argb: 'FF111111' } }
      cell.alignment = { vertical: 'middle', horizontal: col === 2 ? 'left' : 'center' }
      styleHairlineBorder(cell)
    })
  })

  const totalUnitRow = wsTurnout.getRow(uRowIdx++)
  totalUnitRow.height = 22
  totalUnitRow.values = ['', 'TOTAL', totalEligible, votedCount, notVotedCount, `${turnoutPct}%`]
  totalUnitRow.eachCell((cell, col) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF7F6F3' } }
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF111111' } }
    cell.alignment = { vertical: 'middle', horizontal: col === 2 ? 'left' : 'center' }
    styleHairlineBorder(cell)
  })

  // Section B: Full Roster (Not Yet Voted listed first for rapid follow-up)
  const rosterTitleIdx = uRowIdx + 1
  wsTurnout.getCell(rosterTitleIdx, 1).value = 'SECTION B — STAFF PARTICIPATION ROSTER (NOT YET VOTED LISTED FIRST)'
  wsTurnout.getCell(rosterTitleIdx, 1).font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF787774' } }

  const rosterHeaderIdx = rosterTitleIdx + 1
  const rosterHeader = wsTurnout.getRow(rosterHeaderIdx)
  rosterHeader.values = ['No.', 'Full Name', 'Unit', 'Role', 'Status', 'Submitted At (WIB)']
  styleHeaderRow(rosterHeader)
  rosterHeader.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' }
  rosterHeader.getCell(5).alignment = { horizontal: 'center', vertical: 'middle' }

  const roster = [
    ...(participation?.not_voted_users || []).map(u => ({ ...u, has_voted: false, submitted_at: null })),
    ...(participation?.voted_users || []).map(u => ({ ...u, has_voted: true }))
  ]

  roster.forEach((staff, idx) => {
    const r = wsTurnout.getRow(rosterHeaderIdx + 1 + idx)
    r.height = 20
    r.values = [
      idx + 1,
      staff.full_name,
      staff.unit_name,
      staff.role_name,
      staff.has_voted ? 'Voted' : 'Not Yet Voted',
      staff.has_voted ? formatWibTimestamp(staff.submitted_at) : '-'
    ]
    r.eachCell((cell, col) => {
      let fg = 'FFFFFFFF'
      let textColor = 'FF111111'
      if (col === 5) {
        fg = staff.has_voted ? 'FFEDF3EC' : 'FFFDEBEC'
        textColor = staff.has_voted ? 'FF346538' : 'FF9F2F2D'
      }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fg } }
      cell.font = {
        name: 'Calibri',
        size: 10,
        bold: col === 5,
        color: { argb: textColor }
      }
      cell.alignment = {
        vertical: 'middle',
        horizontal: [1, 5].includes(col) ? 'center' : 'left'
      }
      styleHairlineBorder(cell)
    })
  })

  return wb
}

/**
 * Generates and downloads the official Staff Awards Excel report in the browser.
 */
export async function exportStaffAwardsExcel({ event, participation, results = [] }) {
  const wb = await buildStaffAwardsWorkbook({ event, participation, results })
  const buffer = await wb.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  })
  const safeTitle = String(event?.title || 'Staff_Awards').replace(/[^a-zA-Z0-9_-]+/g, '_')
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${safeTitle}_Official_Report.xlsx`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
