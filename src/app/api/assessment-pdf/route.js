import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PAGE_MARGIN_IN = 0.79;
// Keep the same page margins as Google Docs; the header must fit inside this.
const REST_TOP_MARGIN_IN = PAGE_MARGIN_IN;

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildHtml(payload, { logoDataUrl } = {}) {
  const meta = payload?.meta ?? {};
  const criteria = Array.isArray(payload?.criteria) ? payload.criteria : [];

  const assessmentTitle = (meta.assessmentTitle ?? '').toString();
  const unitTitle = (meta.unitTitle ?? '').toString();
  const instructions = (meta.instructions ?? '').toString();
  const docMode = (meta.__pdfMode ?? 'all').toString(); // 'all' | 'page1' | 'instructions' | 'criteria'
  const isPage1Only = docMode === 'page1';
  const isInstructionsOnly = docMode === 'instructions';
  const isCriteriaOnly = docMode === 'criteria';

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

  const infoRows = [
    { leftLabel: 'Name', leftValue: meta.studentName ?? '', rightLabel: 'Subject', rightValue: meta.subjectName ?? 'N/A' },
    { leftLabel: 'Class', leftValue: meta.kelasName ?? 'N/A', rightLabel: 'Unit', rightValue: meta.unitName ?? 'N/A' },
    { leftLabel: 'Day/Date', leftValue: meta.dayDate ?? '', rightLabel: 'Teacher', rightValue: meta.teacherName ?? 'N/A' },
  ];

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
                const text = escapeHtml(it?.text ?? '');
                if (!text) return '';
                return `
                  <div class="li">
                    <div class="li-label">${label}.</div>
                    <div class="li-text">${text}</div>
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

  const infoHtml = infoRows
    .map((r) => {
      return `
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
      `;
    })
    .join('');

  const taskOverviewHtml = taskOverviewRows
    .map((r) => {
      return `
        <tr>
          <td class="ov-label">${escapeHtml(r.label)}</td>
          <td class="ov-value">${escapeHtml(r.value)}</td>
        </tr>
      `;
    })
    .join('');

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
      <div class="section-title">INSTRUCTIONS:</div>
      ${renderInstructions(instructions)}
    `
    : '';

  const criteriaSection = `
    <div class="section-title">SUBJECT CRITERIA AND TASK-SPECIFIC CLARIFICATION</div>
    ${criteriaHtml}
  `;

  const bodyHtml = (() => {
    const hasInstructions = Boolean(instructionsSection);
    const hasCriteria = Boolean(criteriaHtml);

    if (isPage1Only) return '';

    if (isInstructionsOnly) return hasInstructions ? instructionsSection : '';

    if (isCriteriaOnly) {
      if (!hasCriteria) return '';
      // Repeating border guide to mimic Google Docs table lines across page breaks.
      return `
        <div class="criteria-guides" aria-hidden="true"><div class="mid"></div></div>
        <div class="criteria-layer">${criteriaSection}</div>
      `;
    }

    // default (all): page1 first, then instructions, then criteria, each starting on new page
    if (!hasInstructions && !hasCriteria) return '';
    const parts = [];
    if (hasInstructions) parts.push(`<div class="page-break"></div>${instructionsSection}`);
    if (hasCriteria) parts.push(`<div class="page-break"></div>${criteriaSection}`);
    return parts.join('');
  })();

  return `
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 15pt;
      color: #000;
      margin: 0;
      padding: 0;
    }

    /* First page must be Arial 15 */
    .page1 {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 15pt;
      line-height: 1.25;
    }
    .page {
      padding: 0;
    }
    .title {
      font-size: 15pt;
      font-weight: 700;
      margin: 0 0 18px 0;
      line-height: 1;
    }

    .header {
      display: grid;
      grid-template-columns: 1fr 120px;
      gap: 10px;
      align-items: start;
      margin: 0 0 8px 0;
    }

    .logo-wrap {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 6px;
      margin-top: 0;
      padding-top: 0;
    }

    .logo {
      width: 80px;
      height: auto;
      display: block;
      margin-top: -2px;
    }

    .result-box {
      width: 80px;
      height: 60px;
      border: 1px solid #000;
      border-radius: 10px;
    }

    .result-label {
      font-weight: 700;
      font-size: 15pt;
      text-align: center;
      margin-top: 2px;
    }

    .header-divider {
      border-bottom: 1px solid #9a9a9a;
      margin: 8px 0 10px 0;
    }
    .info {
      margin: 0;
      line-height: 1.45;
    }
    .info-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 18px;
      margin: 0 0 8px 0;
    }
    .info-col {
      display: grid;
      grid-template-columns: 90px 10px 1fr;
      gap: 6px;
      align-items: baseline;
      line-height: 1.45;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .info-label { font-weight: 700; }
    .info-sep { font-weight: 700; }
    .info-value { font-weight: 400; white-space: normal; }

    .section-title {
      font-size: 15pt;
      font-weight: 700;
      margin: 10px 0 6px 0;
    }

    .assessment-title {
      font-size: 60px;
      font-weight: 700;
      text-align: center;
      margin: 10px 0 10px 0;
      text-transform: uppercase;
    }

    .task-overview-title {
      font-size: 15pt;
      font-weight: 700;
      margin: 0 0 6px 0;
    }

    table.overview {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
      border: 2px solid #000;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 15pt;
    }
    table.overview td {
      border: 2px solid #000;
      padding: 7px 8px;
      vertical-align: top;
      font-family: inherit;
      font-size: inherit;
    }
    .ov-label { width: 175px; font-weight: 700; }
    .ov-value { width: auto; }

    .paragraph {
      font-size: inherit;
      line-height: 1.35;
      white-space: normal;
    }

    .instructions-list {
      display: flex;
      flex-direction: column;
      gap: 10pt;
    }
    .instr-row {
      display: grid;
      grid-template-columns: 18pt 1fr;
      column-gap: 10pt;
      align-items: start;
    }
    .instr-num {
      text-align: right;
      white-space: nowrap;
    }
    .instr-text {
      white-space: normal;
      line-height: 1.35;
    }

    .page-break {
      break-before: page;
      page-break-before: always;
    }

    .criterion { margin: 0 0 10px 0; }
    .criterion-title {
      font-size: 15pt;
      font-weight: 700;
      margin: 0 0 6px 0;
    }

    /* Criteria table (borders continue cleanly across page breaks) */
    table.criteria-table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
      border: 2px solid #000;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 15pt;
    }
    table.criteria-table th,
    table.criteria-table td {
      border: 2px solid #000;
      padding: 6px;
      vertical-align: top;
      font-family: inherit;
      font-size: inherit;
      break-inside: auto;
      page-break-inside: auto;
    }
    table.criteria-table tr {
      break-inside: auto;
      page-break-inside: auto;
    }
    .ct-head {
      font-weight: 700;
      text-align: center;
    }
    .ct-band {
      text-align: center;
      font-weight: 700;
      padding: 6px 4px;
    }

    /* Border guides to visually continue the criteria-table frame on every page */
    .criteria-layer {
      position: relative;
      z-index: 1;
    }
    .criteria-guides {
      position: fixed;
      z-index: 0;
      left: ${PAGE_MARGIN_IN}in;
      right: ${PAGE_MARGIN_IN}in;
      top: ${REST_TOP_MARGIN_IN}in;
      bottom: ${PAGE_MARGIN_IN}in;
      pointer-events: none;
    }
    .criteria-guides::before {
      content: '';
      position: absolute;
      inset: 0;
      border-left: 2px solid #000;
      border-right: 2px solid #000;
      border-bottom: 2px solid #000;
    }
    .criteria-guides::after {
      content: '';
      position: absolute;
      top: 0;
      bottom: 0;
      left: 34pt;
      border-left: 2px solid #000;
    }
    .criteria-guides .mid {
      position: absolute;
      top: 0;
      bottom: 0;
      left: calc((100% + 34pt) / 2);
      border-left: 2px solid #000;
    }

    .student {
      font-weight: 400;
      margin: 0 0 3px 0;
    }

    .list {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    /* True hanging indent */
    .li {
      display: grid;
      grid-template-columns: 2.3em 1fr;
      column-gap: 6px;
      align-items: start;
    }
    .li-label { white-space: nowrap; }
    .li-text { white-space: normal; }
  </style>
</head>
<body>
  <div class="page">
    ${
      isRestOnly
        ? ''
        : `
      <div class="page1">
        <div class="header">
          <div>
            <div class="title">ASSESSMENT</div>
            <div class="info">${infoHtml}</div>
          </div>
          <div class="logo-wrap">
            ${logoDataUrl ? `<img class="logo" src="${logoDataUrl}" alt="School logo" />` : ''}
            <div>
              <div class="result-box"></div>
              <div class="result-label">RESULT</div>
            </div>
          </div>
        </div>

        <div class="header-divider"></div>

        ${assessmentTitle ? `<div class="assessment-title">${escapeHtml(assessmentTitle)}</div>` : ''}
        ${unitTitle ? `<div class="assessment-title" style="font-size:60px; margin-top:-6px;">${escapeHtml(unitTitle)}</div>` : ''}

        <div class="task-overview-title">TASK OVERVIEW</div>
        <table class="overview">
          <tbody>
            ${taskOverviewHtml}
          </tbody>
        </table>
      </div>
    `
    }

    ${bodyHtml}
  </div>
</body>
</html>
`;
}

function buildRepeatingHeaderTemplate({ subjectName } = {}) {
  const subject = escapeHtml(subjectName ?? '');
  // Approximate the criteria-table divider position:
  // dividerX = bandWidth + (contentWidth - bandWidth) / 2 = (contentWidth + bandWidth) / 2
  // We express it as CSS: left: calc((100% + bandWidth)/2)
  const bandWidth = '34pt';
  return `
    <div style="width:100%; box-sizing:border-box; padding:0 0.79in; font-family:Arial, Helvetica, sans-serif; font-size:15pt; color:#000;">
      <div style="position:relative; width:100%; padding-top:0; padding-bottom:0; line-height:1.2;">
        <div style="white-space:nowrap;">
          <span style="margin-right:6pt; font-weight:700;">Name:</span>
          <span style="display:inline-block; width:150pt; border-bottom:1px solid #000;">&nbsp;</span>
        </div>

        <div style="position:absolute; top:0; left: calc((100% + ${bandWidth})/2); white-space:nowrap;">
          <span style="margin-right:6pt; font-weight:700;">Subject:</span>
          <span>${subject || '&nbsp;'}</span>
        </div>
      </div>
    </div>
  `;
}

export async function POST(req) {
  try {
    const payload = await req.json();

    let logoDataUrl = '';
    try {
      const logoPath = path.join(process.cwd(), 'public', 'images', 'login-logo.png');
      const logoBuf = await fs.readFile(logoPath);
      logoDataUrl = `data:image/png;base64,${logoBuf.toString('base64')}`;
    } catch {
      logoDataUrl = '';
    }

    const html = buildHtml(payload, { logoDataUrl });

    const puppeteer = (await import('puppeteer')).default;
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    try {
      const hasInstructions = Boolean((payload?.meta?.instructions ?? '').toString().trim());
      const hasCriteria = Array.isArray(payload?.criteria) && payload.criteria.length > 0;

      // 1) Page 1 only (no repeating header)
      const page1Payload = {
        ...payload,
        meta: { ...(payload?.meta ?? {}), __pdfMode: 'page1' },
      };
      const htmlPage1 = buildHtml(page1Payload, { logoDataUrl });
      const page1 = await browser.newPage();
      await page1.setContent(htmlPage1, { waitUntil: 'networkidle0' });
      const pdfBuf1 = await page1.pdf({
        format: 'A4',
        printBackground: true,
        preferCSSPageSize: false,
        displayHeaderFooter: false,
        scale: 1,
        margin: { top: `${PAGE_MARGIN_IN}in`, right: `${PAGE_MARGIN_IN}in`, bottom: `${PAGE_MARGIN_IN}in`, left: `${PAGE_MARGIN_IN}in` },
      });
      await page1.close();

      if (!hasInstructions && !hasCriteria) {
        return new NextResponse(pdfBuf1, {
          status: 200,
          headers: { 'Content-Type': 'application/pdf', 'Cache-Control': 'no-cache, no-store, must-revalidate' },
        });
      }

      const headerTemplate = buildRepeatingHeaderTemplate({ subjectName: payload?.meta?.subjectName ?? '' });

      let pdfBufInstructions = null;
      if (hasInstructions) {
        const instructionsPayload = {
          ...payload,
          meta: { ...(payload?.meta ?? {}), __pdfMode: 'instructions' },
        };
        const htmlInstructions = buildHtml(instructionsPayload, { logoDataUrl });
        const pageInstructions = await browser.newPage();
        await pageInstructions.setContent(htmlInstructions, { waitUntil: 'networkidle0' });
        pdfBufInstructions = await pageInstructions.pdf({
          format: 'A4',
          printBackground: true,
          preferCSSPageSize: false,
          displayHeaderFooter: true,
          headerTemplate,
          footerTemplate: '<div></div>',
          scale: 1,
          margin: { top: `${REST_TOP_MARGIN_IN}in`, right: `${PAGE_MARGIN_IN}in`, bottom: `${PAGE_MARGIN_IN}in`, left: `${PAGE_MARGIN_IN}in` },
        });
        await pageInstructions.close();
      }

      let pdfBufCriteria = null;
      if (hasCriteria) {
        const criteriaPayload = {
          ...payload,
          meta: { ...(payload?.meta ?? {}), __pdfMode: 'criteria' },
        };
        const htmlCriteria = buildHtml(criteriaPayload, { logoDataUrl });
        const pageCriteria = await browser.newPage();
        await pageCriteria.setContent(htmlCriteria, { waitUntil: 'networkidle0' });
        pdfBufCriteria = await pageCriteria.pdf({
          format: 'A4',
          printBackground: true,
          preferCSSPageSize: false,
          displayHeaderFooter: true,
          headerTemplate,
          footerTemplate: '<div></div>',
          scale: 1,
          margin: { top: `${REST_TOP_MARGIN_IN}in`, right: `${PAGE_MARGIN_IN}in`, bottom: `${PAGE_MARGIN_IN}in`, left: `${PAGE_MARGIN_IN}in` },
        });
        await pageCriteria.close();
      }

      // 3) Merge + add continuous page numbers
      const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');
      const doc1 = await PDFDocument.load(pdfBuf1);

      const merged = await PDFDocument.create();
      const pages1 = await merged.copyPages(doc1, doc1.getPageIndices());
      for (const p of pages1) merged.addPage(p);

      if (pdfBufInstructions) {
        const docInstr = await PDFDocument.load(pdfBufInstructions);
        const pagesInstr = await merged.copyPages(docInstr, docInstr.getPageIndices());
        for (const p of pagesInstr) merged.addPage(p);
      }

      if (pdfBufCriteria) {
        const docCrit = await PDFDocument.load(pdfBufCriteria);
        const pagesCrit = await merged.copyPages(docCrit, docCrit.getPageIndices());
        for (const p of pagesCrit) merged.addPage(p);
      }

      const font = await merged.embedFont(StandardFonts.Helvetica);
      const fontSize = 9;
      const marginRight = PAGE_MARGIN_IN * 72; // pt
      const y = 18; // pt from bottom

      const pages = merged.getPages();
      for (let i = 0; i < pages.length; i += 1) {
        const page = pages[i];
        const { width } = page.getSize();
        const text = String(i + 1);
        const textWidth = font.widthOfTextAtSize(text, fontSize);
        const x = width - marginRight - textWidth;
        page.drawText(text, { x, y, size: fontSize, font, color: rgb(0.5, 0.5, 0.5) });
      }

      const mergedBytes = await merged.save();
      return new NextResponse(Buffer.from(mergedBytes), {
        status: 200,
        headers: { 'Content-Type': 'application/pdf', 'Cache-Control': 'no-cache, no-store, must-revalidate' },
      });
    } finally {
      await browser.close();
    }
  } catch (err) {
    return NextResponse.json(
      { error: 'Failed to generate PDF', message: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}
