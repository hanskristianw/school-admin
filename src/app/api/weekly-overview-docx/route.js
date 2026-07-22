import {
  Document, Packer, Paragraph, Table, TableRow, TableCell,
  TextRun, ImageRun, AlignmentType, WidthType, BorderStyle, VerticalAlign, PageOrientation, VerticalMergeType
} from 'docx';
import { PNG } from 'pngjs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function getImageDimensions(buf) {
  if (!buf || buf.length < 24) return null;
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47) {
    const width = buf.readUInt32BE(16);
    const height = buf.readUInt32BE(20);
    if (width > 0 && height > 0 && width < 10000 && height < 10000) {
      return { width, height, type: 'png' };
    }
  }
  if (buf[0] === 0xFF && buf[1] === 0xD8) {
    try {
      let offset = 2;
      while (offset < buf.length - 8) {
        const marker = buf.readUInt16BE(offset);
        offset += 2;
        if (marker === 0xFFC0 || marker === 0xFFC2) {
          const height = buf.readUInt16BE(offset + 1);
          const width = buf.readUInt16BE(offset + 3);
          if (width > 0 && height > 0) return { width, height, type: 'jpg' };
        }
        const len = buf.readUInt16BE(offset);
        offset += len;
      }
    } catch (e) {}
  }
  return { width: 100, height: 100, type: 'png' };
}

function fitAspect(buf, maxW, maxH) {
  const dim = getImageDimensions(buf);
  if (!dim || !dim.width || !dim.height) {
    return { transformation: { width: maxW, height: maxH }, type: 'png' };
  }
  const ratio = Math.min(maxW / dim.width, maxH / dim.height);
  return {
    transformation: {
      width: Math.round(dim.width * ratio),
      height: Math.round(dim.height * ratio),
    },
    type: dim.type || 'png',
  };
}

function compositeStampAndSignature(stampBuf, sigBuf) {
  if (!stampBuf || !sigBuf) return null;
  try {
    const stampPng = PNG.sync.read(stampBuf);
    const sigPng = PNG.sync.read(sigBuf);

    if (!stampPng?.width || !sigPng?.width) return null;

    // High DPI Canvas (1600 x 700) so no pixel resolution or fine signature lines are lost
    const stampW = Math.round(stampPng.width * 1.85);
    const stampH = Math.round(stampPng.height * 1.85);
    const sigW = Math.round(sigPng.width);
    const sigH = Math.round(sigPng.height);

    const canvasWidth = Math.max(1600, sigW + Math.round(stampW * 0.6));
    const canvasHeight = Math.max(700, Math.max(sigH, stampH) + 40);

    const canvas = new PNG({ width: canvasWidth, height: canvasHeight });
    canvas.data.fill(0); // Transparent background

    // Position signature on right
    const sigX = canvasWidth - sigW - 30;
    const sigY = Math.round((canvasHeight - sigH) / 2);

    // Position 2x enlarged stamp on left overlapping signature (~45% overlap)
    const stampX = Math.max(15, sigX - Math.round(stampW * 0.45));
    const stampY = Math.round((canvasHeight - stampH) / 2);

    // High quality bilinear resampling
    const drawImageBilinear = (srcPng, destX, destY, destW, destH) => {
      for (let y = 0; y < destH; y++) {
        for (let x = 0; x < destW; x++) {
          const cX = destX + x;
          const cY = destY + y;
          if (cX < 0 || cX >= canvasWidth || cY < 0 || cY >= canvasHeight) continue;

          const srcX = (x / destW) * (srcPng.width - 1);
          const srcY = (y / destH) * (srcPng.height - 1);

          const x1 = Math.floor(srcX);
          const y1 = Math.floor(srcY);
          const x2 = Math.min(x1 + 1, srcPng.width - 1);
          const y2 = Math.min(y1 + 1, srcPng.height - 1);

          const fx = srcX - x1;
          const fy = srcY - y1;

          const idx11 = (y1 * srcPng.width + x1) * 4;
          const idx21 = (y1 * srcPng.width + x2) * 4;
          const idx12 = (y2 * srcPng.width + x1) * 4;
          const idx22 = (y2 * srcPng.width + x2) * 4;

          const sampleChannel = (ch) =>
            (1 - fx) * (1 - fy) * srcPng.data[idx11 + ch] +
            fx * (1 - fy) * srcPng.data[idx21 + ch] +
            (1 - fx) * fy * srcPng.data[idx12 + ch] +
            fx * fy * srcPng.data[idx22 + ch];

          const sR = sampleChannel(0);
          const sG = sampleChannel(1);
          const sB = sampleChannel(2);
          const sA = sampleChannel(3) / 255;

          if (sA <= 0) continue;

          const destIdx = (cY * canvasWidth + cX) * 4;
          const dR = canvas.data[destIdx];
          const dG = canvas.data[destIdx + 1];
          const dB = canvas.data[destIdx + 2];
          const dA = canvas.data[destIdx + 3] / 255;

          const outA = sA + dA * (1 - sA);
          if (outA > 0) {
            canvas.data[destIdx]     = Math.round((sR * sA + dR * dA * (1 - sA)) / outA);
            canvas.data[destIdx + 1] = Math.round((sG * sA + dG * dA * (1 - sA)) / outA);
            canvas.data[destIdx + 2] = Math.round((sB * sA + dB * dA * (1 - sA)) / outA);
            canvas.data[destIdx + 3] = Math.round(outA * 255);
          }
        }
      }
    };

    // 1. Draw Signature first (bottom layer)
    drawImageBilinear(sigPng, sigX, sigY, sigW, sigH);

    // 2. Draw Stamp second (top layer - overlays signature!)
    drawImageBilinear(stampPng, stampX, stampY, stampW, stampH);

    const compositeBuf = PNG.sync.write(canvas);
    const aspectConfig = fitAspect(compositeBuf, 230, 105);

    return {
      data: compositeBuf,
      transformation: aspectConfig.transformation,
      type: 'png'
    };
  } catch (e) {
    console.error('[WO DOCX] Compositing error:', e);
    return null;
  }
}

export async function POST(request) {
  try {
    const payload = await request.json();
    const {
      kelasNama = 'Class',
      weekLabel = '',
      timeSlots = [],
      days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      cells = {},
      reportSettings = null
    } = payload || {};

    let signatureBuffer = null;
    let stampBuffer = null;

    if (reportSettings?.signatureUrl) {
      try {
        const res = await fetch(reportSettings.signatureUrl);
        if (res.ok) {
          signatureBuffer = Buffer.from(await res.arrayBuffer());
        }
      } catch (e) {
        console.error('[WO DOCX] Failed to fetch signature image:', e);
      }
    }

    if (reportSettings?.stampUrl) {
      try {
        const res = await fetch(reportSettings.stampUrl);
        if (res.ok) {
          stampBuffer = Buffer.from(await res.arrayBuffer());
        }
      } catch (e) {
        console.error('[WO DOCX] Failed to fetch stamp image:', e);
      }
    }

    const doc = buildWeeklyOverviewDocx({
      kelasNama,
      weekLabel,
      timeSlots,
      days,
      cells,
      reportSettings,
      signatureBuffer,
      stampBuffer
    });
    const buffer = await Packer.toBuffer(doc);

    const safeFileName = `Weekly_Overview_${kelasNama.replace(/[^a-zA-Z0-9]/g, '_')}_${weekLabel.replace(/[^a-zA-Z0-9]/g, '_')}.docx`;

    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${safeFileName}"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    console.error('[WO DOCX] Error generating DOCX:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to generate Weekly Overview DOCX', details: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

function buildWeeklyOverviewDocx({ kelasNama, weekLabel, timeSlots, days, cells, reportSettings, signatureBuffer, stampBuffer }) {
  const tableBorders = {
    top: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
    bottom: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
    left: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
    right: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
    insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
    insideVertical: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
  };

  // Header Section
  const headerParagraphs = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
      children: [
        new TextRun({
          text: `WEEKLY OVERVIEW ${kelasNama.toUpperCase()}`,
          bold: true,
          size: 28, // 14pt
          font: "Arial",
          color: "1F2937",
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 240 },
      children: [
        new TextRun({
          text: weekLabel,
          bold: true,
          size: 22, // 11pt
          font: "Arial",
          color: "374151",
        }),
      ],
    }),
  ];

  // Build Table Header Row
  const headerCells = [
    new TableCell({
      width: { size: 15, type: WidthType.PERCENTAGE },
      shading: { fill: "F3F4F6" },
      verticalAlign: VerticalAlign.CENTER,
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({
              text: "Time",
              bold: true,
              size: 20,
              font: "Arial",
              color: "111827",
            }),
          ],
        }),
      ],
    }),
  ];

  days.forEach((day) => {
    headerCells.push(
      new TableCell({
        width: { size: 17, type: WidthType.PERCENTAGE },
        shading: { fill: "F3F4F6" },
        verticalAlign: VerticalAlign.CENTER,
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: day,
                bold: true,
                size: 20,
                font: "Arial",
                color: "111827",
              }),
            ],
          }),
        ],
      })
    );
  });

  const tableRows = [
    new TableRow({
      cantSplit: true,
      children: headerCells,
    }),
  ];

  // Helper for multi-line text paragraphs
  const makeTextParagraphs = (textStr, options = {}) => {
    if (!textStr) return [];
    const lines = textStr.split('\n');
    return lines.map((line, lIdx) => {
      return new Paragraph({
        spacing: { after: lIdx === lines.length - 1 ? (options.after || 40) : 20 },
        children: [
          new TextRun({
            text: line,
            size: options.size || 18,
            font: "Arial",
            color: options.color || "374151",
            italic: options.italic || false,
          }),
        ],
      });
    });
  };

  // Build Table Body Rows
  timeSlots.forEach((slotKey, slotIdx) => {
    const [slotStart, slotEnd] = slotKey.split('|');
    const timeFormatted = slotStart && slotEnd ? `${slotStart}- ${slotEnd}` : slotKey;

    const rowCells = [
      new TableCell({
        width: { size: 15, type: WidthType.PERCENTAGE },
        verticalAlign: VerticalAlign.CENTER,
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: timeFormatted,
                bold: false,
                size: 19,
                font: "Arial",
                color: "111827",
              }),
            ],
          }),
        ],
      }),
    ];

    days.forEach((day) => {
      const cellKey = `${day}|${slotKey}`;
      const holidayCell = cells[`${day}|HOLIDAY`];
      const cellData = holidayCell || cells[cellKey];

      const cellChildren = [];
      let cellShading = undefined;
      let cellVerticalMerge = undefined;

      if (holidayCell) {
        cellShading = { fill: "FEE2E2" };
        if (slotIdx === 0) {
          cellVerticalMerge = VerticalMergeType.RESTART;
          cellChildren.push(
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { before: 80, after: 80 },
              children: [
                new TextRun({
                  text: `[ ${holidayCell.label || 'HOLIDAY'} ]`,
                  bold: true,
                  size: 22,
                  font: "Arial",
                  color: "DC2626",
                }),
              ],
            })
          );
          if (holidayCell.note) {
            cellChildren.push(...makeTextParagraphs(holidayCell.note, { size: 18, after: 80, italic: true, color: "991B1B" }));
          }
        } else {
          cellVerticalMerge = VerticalMergeType.CONTINUE;
        }
      } else if (cellData && cellData.type === 'covered') {
        cellVerticalMerge = VerticalMergeType.CONTINUE;
      } else if (cellData && cellData.rowSpan && cellData.rowSpan > 1) {
        cellVerticalMerge = VerticalMergeType.RESTART;
      }

      if (!holidayCell) {
        if (!cellData || cellData.type === 'empty') {
          cellChildren.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "-", size: 18, color: "9CA3AF" })] }));
        } else if (cellData.type === 'event') {
          cellShading = { fill: "FEF3C7" };
          cellChildren.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: cellData.label || 'EVENT', bold: true, size: 20, color: "B45309" })] }));
        } else if (cellData.type !== 'covered') {
          const items = Array.isArray(cellData.items) && cellData.items.length > 0 ? cellData.items : [cellData];
          const customColor = cellData.customColor || items.find(i => i.customColor)?.customColor;
          if (customColor) cellShading = { fill: customColor.replace('#', '') };

          items.forEach((item, itemIdx) => {
            if (itemIdx > 0) cellChildren.push(new Paragraph({ children: [new TextRun({ text: "──────────────────", size: 14, color: "D1D5DB" })] }));
            if (item.subject) cellChildren.push(new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: item.subject, bold: true, size: 20, color: "000000" })] }));
            if (item.objectives) {
              cellChildren.push(new Paragraph({ spacing: { after: 20 }, children: [new TextRun({ text: "Learning Goals:", size: 17, color: "4B5563" })] }));
              cellChildren.push(...makeTextParagraphs(item.objectives, { size: 18, after: 60 }));
            }
            if (item.activities) {
              cellChildren.push(new Paragraph({ spacing: { after: 20 }, children: [new TextRun({ text: "Activity:", size: 17, color: "4B5563" })] }));
              cellChildren.push(...makeTextParagraphs(item.activities, { size: 18, after: 60 }));
            }
            if (item.resources) {
              cellChildren.push(new Paragraph({ spacing: { after: 20 }, children: [new TextRun({ text: "Resource:", size: 17, color: "4B5563" })] }));
              cellChildren.push(...makeTextParagraphs(item.resources, { size: 18, after: 60 }));
            }
          });
        }
      }

      rowCells.push(new TableCell({ width: { size: 17, type: WidthType.PERCENTAGE }, shading: cellShading, verticalMerge: cellVerticalMerge, children: cellChildren.length > 0 ? cellChildren : [new Paragraph({})] }));
    });
    tableRows.push(new TableRow({ cantSplit: true, children: rowCells }));
  });

  const mainTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: tableBorders,
    rows: tableRows,
  });

  const signatureParagraphs = [];
  if (reportSettings && (reportSettings.principalName || reportSettings.principalTitle || signatureBuffer || stampBuffer)) {
    const noBorder = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
    const noBorders = {
      top: noBorder, bottom: noBorder, left: noBorder, right: noBorder,
      insideHorizontal: noBorder, insideVertical: noBorder
    };

    const sigCellChildren = [
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        spacing: { before: 180, after: 40 },
        children: [
          new TextRun({ text: "Acknowledged by,", size: 20, font: "Arial", color: "111827" }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        spacing: { after: 60 },
        children: [
          new TextRun({ text: reportSettings.principalTitle || "Principal", size: 20, font: "Arial", color: "111827" }),
        ],
      }),
    ];

    const imgRuns = [];
    const compositeRes = compositeStampAndSignature(stampBuffer, signatureBuffer);

    if (compositeRes) {
      imgRuns.push(
        new ImageRun({
          data: compositeRes.data,
          transformation: compositeRes.transformation,
          type: compositeRes.type,
        })
      );
    } else {
      if (stampBuffer) {
        const stampConfig = fitAspect(stampBuffer, 100, 100);
        imgRuns.push(
          new ImageRun({
            data: stampBuffer,
            transformation: stampConfig.transformation,
            type: stampConfig.type,
          })
        );
      }
      if (signatureBuffer) {
        const sigConfig = fitAspect(signatureBuffer, 130, 80);
        imgRuns.push(
          new ImageRun({
            data: signatureBuffer,
            transformation: sigConfig.transformation,
            type: sigConfig.type,
          })
        );
      }
    }

    if (imgRuns.length > 0) {
      sigCellChildren.push(new Paragraph({ alignment: AlignmentType.RIGHT, spacing: { before: 40, after: 40 }, children: imgRuns }));
    } else {
      sigCellChildren.push(new Paragraph({ alignment: AlignmentType.RIGHT, spacing: { before: 360, after: 360 }, children: [] }));
    }

    if (reportSettings.principalName) {
      sigCellChildren.push(
        new Paragraph({
          alignment: AlignmentType.RIGHT,
          spacing: { top: 40 },
          children: [
            new TextRun({ text: `(${reportSettings.principalName})`, bold: true, size: 20, font: "Arial", color: "111827" }),
          ],
        })
      );
    }

    const sigTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: noBorders,
      rows: [
        new TableRow({
          children: [
            new TableCell({ width: { size: 55, type: WidthType.PERCENTAGE }, borders: noBorders, children: [new Paragraph({})] }),
            new TableCell({ width: { size: 40, type: WidthType.PERCENTAGE }, borders: noBorders, children: sigCellChildren }),
            new TableCell({ width: { size: 5, type: WidthType.PERCENTAGE }, borders: noBorders, children: [new Paragraph({})] }),
          ],
        }),
      ],
    });

    signatureParagraphs.push(new Paragraph({ spacing: { before: 120 } }), sigTable);
  }

  return new Document({
    sections: [
      {
        properties: {
          page: {
            orientation: PageOrientation.LANDSCAPE,
            size: { width: 15840, height: 12240 },
            margin: { top: 720, bottom: 720, left: 720, right: 720 },
          },
        },
        children: [...headerParagraphs, mainTable, ...signatureParagraphs],
      },
    ],
  });
}
