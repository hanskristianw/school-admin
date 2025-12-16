/**
 * Assessment HTML Generation API
 * Returns styled HTML ready for printing to PDF via browser (Ctrl+P)
 * Format matches the original Puppeteer PDF assessment layout
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import fs from 'fs/promises';
import path from 'path';

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export async function POST(request) {
  try {
    const payload = await request.json();
    
    // Load logo as base64
    let logoDataUrl = '';
    try {
      const logoPath = path.join(process.cwd(), 'public', 'images', 'login-logo.png');
      const logoBuffer = await fs.readFile(logoPath);
      logoDataUrl = `data:image/png;base64,${logoBuffer.toString('base64')}`;
    } catch (err) {
      console.warn('Could not load logo:', err);
    }
    
    const html = buildHtml(payload, { logoDataUrl });
    
    return new Response(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    console.error('Error generating HTML:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to generate HTML', details: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

function buildHtml(payload, { logoDataUrl = '' } = {}) {
  const meta = payload?.meta ?? {};
  const criteria = Array.isArray(payload?.criteria) ? payload.criteria : [];
  
  const assessmentTitle = escapeHtml(meta.assessmentTitle ?? '');
  const instructions = (meta.instructions ?? '').toString();
  const subjectName = escapeHtml(meta.subjectName ?? 'N/A');
  const teacherName = escapeHtml(meta.teacherName ?? 'N/A');
  const kelasName = escapeHtml(meta.kelasName ?? 'N/A');
  const unitName = escapeHtml(meta.unitName ?? 'N/A');

  // Task Overview Table (labels sesuai format asli PDF)
  const taskOverviewRows = [
    { label: 'Criterion', value: meta.criteriaCodes ?? 'N/A' },
    { label: 'Proficiency Level', value: meta.proficiencyLevel ?? 'N/A' },
    { label: 'Key Concept', value: meta.keyConcept ?? 'N/A' },
    { label: 'Related Concepts', value: meta.relatedConcepts ?? 'N/A' },
    { label: 'Conceptual Understanding', value: meta.conceptualUnderstanding ?? 'N/A' },
    { label: 'Global Context Exploration', value: meta.globalContext ?? 'N/A' },
    { label: 'Statement of Inquiry', value: meta.statementOfInquiry ?? 'N/A' },
    { label: 'Task Specific Description', value: meta.taskSpecificDescription ?? 'N/A' },
  ];

  // Info Rows (Name/Subject, Class/Unit, Day/Date/Teacher)
  const infoRows = [
    { leftLabel: 'Name', leftValue: '', rightLabel: 'Subject', rightValue: subjectName },
    { leftLabel: 'Class', leftValue: kelasName, rightLabel: 'Unit', rightValue: unitName },
    { leftLabel: 'Day/Date', leftValue: '', rightLabel: 'Teacher', rightValue: teacherName },
  ];

  // Render Info Rows HTML (dengan titik dua dan spacing yang sama)
  const infoHtml = infoRows
    .map((r) => `
      <div class="info-row">
        <div class="info-col">
          <span class="info-label">${escapeHtml(r.leftLabel)}</span>
          <span class="info-sep">:</span>
          <span class="info-value">${escapeHtml(r.leftValue)}</span>
        </div>
        <div class="info-col">
          <span class="info-label">${escapeHtml(r.rightLabel)}</span>
          <span class="info-sep">:</span>
          <span class="info-value">${escapeHtml(r.rightValue)}</span>
        </div>
      </div>
    `)
    .join('');

  // Task Overview Table HTML
  const taskOverviewHtml = taskOverviewRows
    .map((r) => `
      <tr>
        <td class="ov-label">${escapeHtml(r.label)}</td>
        <td class="ov-value">${escapeHtml(r.value)}</td>
      </tr>
    `)
    .join('');

  // Render Instructions
  const renderInstructions = (instructionsText) => {
    const raw = String(instructionsText ?? '').replace(/\r\n/g, '\n').trim();
    if (!raw) return '';

    const lines = raw
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    const items = [];
    let current = null;

    for (const line of lines) {
      const match = line.match(/^(\d+)[.)]\s*(.*)$/);
      if (match) {
        if (current) items.push(current);
        current = { num: match[1], parts: [match[2] ?? ''] };
        continue;
      }
      if (!current) {
        current = { num: '', parts: [line] };
        continue;
      }
      current.parts.push(line);
    }
    if (current) items.push(current);

    const rows = items
      .map((it, idx) => {
        const num = it.num ? `${escapeHtml(it.num)}.` : `${idx + 1}.`;
        const text = it.parts
          .filter(Boolean)
          .map((p) => escapeHtml(p))
          .join('<br/>');
        return `
          <div class="instr-row">
            <div class="instr-num">${num}</div>
            <div class="instr-text">${text}</div>
          </div>
        `;
      })
      .join('');

    return `<div class="instructions-list">${rows}</div>`;
  };

  const instructionsSection = instructions
    ? `
      <div class="page-break"></div>
      <div class="section-title">INSTRUCTIONS:</div>
      ${renderInstructions(instructions)}
    `
    : '';

  // Render Criteria Tables (3-column: Band | Subject Criteria | Task-Specific Clarification)
  const criteriaHtml = criteria
    .map((c) => {
      const code = escapeHtml(c?.code ?? '');
      const bands = Array.isArray(c?.bands) ? c.bands : [];

      const bandRows = bands
        .map((b) => {
          const bandLabel = escapeHtml(b?.bandLabel ?? '');
          const subjectItems = Array.isArray(b?.subjectItems) ? b.subjectItems : [];
          const tscItems = Array.isArray(b?.tscItems) ? b.tscItems : [];

          const renderItems = (items) => {
            if (!items || items.length === 0) return '';
            const lis = items
              .map((it) => {
                const label = escapeHtml(it?.label ?? '');
                let text = String(it?.text ?? '');
                // Force lowercase first letter for text content
                if (text.length > 0) {
                  text = text.charAt(0).toLowerCase() + text.slice(1);
                }
                const textEscaped = escapeHtml(text);
                if (!textEscaped) return '';
                return `
                  <div class="li">
                    <div class="li-label">${label}.</div>
                    <div class="li-text">${textEscaped}</div>
                  </div>
                `;
              })
              .join('');
            return `
              <div class="student">The student:</div>
              <div class="list">${lis}</div>
            `;
          };

          return `
            <tr>
              <td class="ct-band">${bandLabel}</td>
              <td class="ct-body">${renderItems(subjectItems)}</td>
              <td class="ct-body">${renderItems(tscItems)}</td>
            </tr>
          `;
        })
        .join('');

      return `
        <div class="criterion">
          <div class="criterion-title">Criteria ${code}</div>
          <table class="criteria-table">
            <colgroup>
              <col style="width:34pt;" />
              <col />
              <col />
            </colgroup>
            <thead>
              <tr>
                <th class="ct-head ct-band-head"></th>
                <th class="ct-head">SUBJECT CRITERIA</th>
                <th class="ct-head">TASK-SPECIFIC CLARIFICATION</th>
              </tr>
            </thead>
            <tbody>
              ${bandRows}
            </tbody>
          </table>
        </div>
      `;
    })
    .join('');

  const criteriaSection = criteriaHtml
    ? `
      <div class="section-title criteria-section-title">SUBJECT CRITERIA AND TASK-SPECIFIC CLARIFICATION</div>
      ${criteriaHtml}
    `
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${assessmentTitle || 'Assessment'}</title>
  <style>
    * { box-sizing: border-box; }
    
    body {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 11pt;
      color: #000;
      margin: 0;
      padding: 20px;
      background: #f5f5f5;
    }

    .container {
      max-width: 8.27in;
      margin: 0 auto;
      background: white;
      padding: 0.79in;
      box-shadow: 0 0 10px rgba(0,0,0,0.1);
    }

    /* Header Section */
    .header-grid {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 20px;
      align-items: start;
      margin: 0 0 10px 0;
    }

    .left-section {
      display: flex;
      flex-direction: column;
      gap: 40px;
    }

    .title {
      font-size: 18pt;
      font-weight: 700;
      margin: 0;
      line-height: 1;
    }

    .logo-wrap {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
    }

    .logo {
      width: 80px;
      height: auto;
      display: block;
    }

    .result-wrapper {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
    }

    .result-box {
      width: 90px;
      height: 75px;
      border: 2px solid #000;
      border-radius: 12px;
    }

    .result-label {
      font-weight: 700;
      font-size: 11pt;
      text-align: center;
      margin-top: -2px;
    }

    .header-divider {
      border-bottom: 1px solid #9a9a9a;
      margin: 8px 0 10px 0;
    }

    /* Info Section */
    .info {
      margin: 0;
      line-height: 1.45;
    }

    .info-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 30px;
      margin: 0 0 6px 0;
    }

    .info-col {
      display: grid;
      grid-template-columns: 70px auto 1fr;
      gap: 4px;
      align-items: baseline;
      line-height: 1.45;
    }

    .info-label { 
      font-weight: 400;
      text-align: left;
    }

    .info-sep {
      font-weight: 400;
    }
    
    .info-value { 
      font-weight: 400;
      padding-left: 4px;
    }

    /* Section Titles */
    .section-title {
      font-size: 11pt;
      font-weight: 700;
      margin: 12px 0 8px 0;
    }

    .criteria-section-title {
      margin-top: 24px;
    }

    .page-break {
      page-break-before: always;
      break-before: page;
    }

    .assessment-title {
      font-size: 20pt;
      font-weight: 700;
      text-align: center;
      margin: 12px 0 12px 0;
      text-transform: uppercase;
    }

    .task-overview-title {
      font-size: 11pt;
      font-weight: 700;
      margin: 0 0 6px 0;
    }

    /* Task Overview Table */
    table.overview {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
      border: 1px solid #000;
      margin: 0 0 12px 0;
    }

    table.overview td {
      border: 1px solid #000;
      padding: 10px 12px;
      vertical-align: top;
      font-size: 11pt;
    }

    .ov-label {
      width: 175px;
      font-weight: 700;
    }

    .ov-value {
      width: auto;
    }

    /* Instructions */
    .instructions-list {
      display: flex;
      flex-direction: column;
      gap: 8pt;
      margin: 0 0 12px 0;
    }

    .instr-row {
      display: grid;
      grid-template-columns: 18pt 1fr;
      column-gap: 8pt;
      align-items: start;
    }

    .instr-num {
      text-align: right;
      white-space: nowrap;
      font-weight: 700;
    }

    .instr-text {
      white-space: normal;
      line-height: 1.35;
    }

    /* Criteria Section */
    .criterion {
      margin: 0 0 12px 0;
    }

    .criterion-title {
      font-size: 11pt;
      font-weight: 700;
      margin: 0 0 6px 0;
    }

    /* Criteria Table (3-column) */
    table.criteria-table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
      border: 1px solid #000;
      margin: 0 0 12px 0;
    }

    table.criteria-table th,
    table.criteria-table td {
      border: 1px solid #000;
      padding: 6px;
      vertical-align: top;
      font-size: 11pt;
    }

    .ct-head {
      font-weight: 700;
      text-align: center;
      background: #f0f0f0;
    }

    .ct-band-head {
      width: 34pt;
    }

    .ct-band {
      text-align: center;
      font-weight: 700;
      padding: 6px 4px;
      width: 34pt;
    }

    .ct-body {
      padding: 8px;
      line-height: 1.4;
    }

    /* Student List Items with Hanging Indent */
    .student {
      font-weight: 700;
      margin: 0 0 4px 0;
    }

    .list {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .li {
      display: grid;
      grid-template-columns: 18pt 1fr;
      column-gap: 6pt;
      align-items: start;
    }

    .li-label {
      text-align: right;
      white-space: nowrap;
      font-weight: 400;
    }

    .li-text {
      white-space: normal;
      line-height: 1.35;
    }

    /* Print Button */
    .print-button {
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 24px;
      background: #0070f3;
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
      font-weight: bold;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      z-index: 1000;
    }

    .print-button:hover {
      background: #0051cc;
    }

    /* Page numbering */
    @page {
      @bottom-right {
        content: counter(page);
        font-family: Arial, Helvetica, sans-serif;
        font-size: 11pt;
      }
    }

    /* Print Styles */
    @media print {
      @page {
        size: A4 portrait;
        margin: 0.79in;
      }

      body {
        padding: 0;
        background: white;
        counter-reset: page;
      }

      .container {
        max-width: 100%;
        padding: 0;
        box-shadow: none;
      }

      .print-button {
        display: none !important;
      }

      .section-title {
        page-break-after: avoid;
      }

      .instr-row {
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <button class="print-button" onclick="window.print()">🖨️ Print to PDF</button>
  
  <div class="container">
    <!-- Page 1: Assessment Header -->
    <div class="page1">
      <div class="header-grid">
        <div class="left-section">
          <div class="title">ASSESSMENT</div>
          <div class="info">
            ${infoHtml}
          </div>
        </div>
        <div class="logo-wrap">
          ${logoDataUrl ? `<img src="${logoDataUrl}" alt="Logo" class="logo" />` : ''}
          <div class="result-wrapper">
            <div class="result-box"></div>
            <div class="result-label">RESULT</div>
          </div>
        </div>
      </div>

      <div class="header-divider"></div>

      <h1 class="assessment-title">${assessmentTitle}</h1>

      <div class="task-overview-title">TASK OVERVIEW</div>
      <table class="overview">
        <tbody>
          ${taskOverviewHtml}
        </tbody>
      </table>

      ${instructionsSection}
    </div>

    ${criteriaSection}
  </div>
</body>
</html>`;
}
