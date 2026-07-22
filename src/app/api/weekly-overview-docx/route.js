import {
  Document, Packer, Paragraph, Table, TableRow, TableCell,
  TextRun, AlignmentType, WidthType, BorderStyle, VerticalAlign, PageOrientation, VerticalMergeType
} from 'docx';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const payload = await request.json();
    const {
      kelasNama = 'Class',
      weekLabel = '',
      timeSlots = [],
      days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      cells = {}
    } = payload || {};

    const doc = buildWeeklyOverviewDocx({ kelasNama, weekLabel, timeSlots, days, cells });
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

function buildWeeklyOverviewDocx({ kelasNama, weekLabel, timeSlots, days, cells }) {
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
          text: "WEEKLY OVERVIEW",
          bold: true,
          size: 32, // 16pt
          font: "Arial",
          color: "000000",
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
      children: [
        new TextRun({
          text: kelasNama || "Grade",
          bold: true,
          size: 26, // 13pt
          font: "Arial",
          color: "111827",
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 300 },
      children: [
        new TextRun({
          text: weekLabel || "",
          bold: true,
          size: 22, // 11pt
          font: "Arial",
          color: "374151",
        }),
      ],
    }),
  ];

  // Build Table Header Row
  const headerRowCells = [
    new TableCell({
      width: { size: 15, type: WidthType.PERCENTAGE },
      shading: { fill: "F3F4F6" },
      verticalAlign: VerticalAlign.CENTER,
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: "Time", bold: true, size: 20, font: "Arial" })],
        }),
      ],
    }),
    ...days.map(day =>
      new TableCell({
        width: { size: 17, type: WidthType.PERCENTAGE },
        shading: { fill: "F3F4F6" },
        verticalAlign: VerticalAlign.CENTER,
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: day, bold: true, size: 20, font: "Arial" })],
          }),
        ],
      })
    ),
  ];

  const tableRows = [
    new TableRow({
      tableHeader: true,
      cantSplit: true,
      children: headerRowCells,
    }),
  ];

  // Helper to split text by line breaks
  const makeTextParagraphs = (text, options = {}) => {
    if (!text) return [];
    const lines = String(text).split('\n');
    return lines.map(line =>
      new Paragraph({
        spacing: { after: options.after ?? 40 },
        children: [
          new TextRun({
            text: line,
            size: options.size ?? 18,
            font: "Arial",
            bold: options.bold ?? false,
            color: options.color ?? "374151",
          }),
        ],
      })
    );
  };

  // Build Table Body Rows
  timeSlots.forEach((slotKey, slotIdx) => {
    const [slotStart, slotEnd] = slotKey.split('|');
    const timeFormatted = slotStart && slotEnd ? `${slotStart}- ${slotEnd}` : slotKey;

    const rowCells = [
      // Time Column Cell
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

    // Day Cells
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
            cellChildren.push(
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { after: 80 },
                children: [
                  new TextRun({
                    text: holidayCell.note,
                    size: 18,
                    font: "Arial",
                    color: "991B1B",
                    italic: true,
                  }),
                ],
              })
            );
          }
        } else {
          cellVerticalMerge = VerticalMergeType.CONTINUE;
          cellChildren.push(new Paragraph({}));
        }
      } else if (cellData && cellData.type === 'covered') {
        cellVerticalMerge = VerticalMergeType.CONTINUE;
        cellChildren.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: "", size: 18, font: "Arial", color: "9CA3AF" })],
          })
        );
      } else if (cellData && cellData.rowSpan && cellData.rowSpan > 1) {
        cellVerticalMerge = VerticalMergeType.RESTART;
      }

      if (!holidayCell) {
        if (!cellData || cellData.type === 'empty') {
          cellChildren.push(
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: "-", size: 18, font: "Arial", color: "9CA3AF" })],
            })
          );
        } else if (cellData.type === 'event') {
          cellShading = { fill: "FEF3C7" };
          cellChildren.push(
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { after: 40 },
              children: [
                new TextRun({
                  text: cellData.label || 'EVENT',
                  bold: true,
                  size: 20,
                  font: "Arial",
                  color: "B45309",
                }),
              ],
            })
          );
        } else if (cellData.type !== 'covered') {
          // Normal Cell (supports multiple subjects in the same slot)
          const items = Array.isArray(cellData.items) && cellData.items.length > 0
            ? cellData.items
            : [cellData];

          const customColor = cellData.customColor || items.find(i => i.customColor)?.customColor;
          if (customColor) {
            cellShading = { fill: customColor.replace('#', '') };
          }

          items.forEach((item, itemIdx) => {
            if (itemIdx > 0) {
              // Divider between multiple subjects in the same slot
              cellChildren.push(
                new Paragraph({
                  spacing: { before: 80, after: 80 },
                  children: [
                    new TextRun({
                      text: "──────────────────",
                      size: 14,
                      color: "D1D5DB",
                    }),
                  ],
                })
              );
            }

            // 1. Subject Name (Bold)
            if (item.subject) {
              cellChildren.push(
                new Paragraph({
                  spacing: { after: 60 },
                  children: [
                    new TextRun({
                      text: item.subject,
                      bold: true,
                      size: 20, // 10pt
                      font: "Arial",
                      color: "000000",
                    }),
                  ],
                })
              );
            }

            // 2. Learning Goals
            if (item.objectives) {
              cellChildren.push(
                new Paragraph({
                  spacing: { after: 20 },
                  children: [
                    new TextRun({
                      text: "Learning Goals:",
                      size: 17, // 8.5pt
                      font: "Arial",
                      color: "4B5563",
                    }),
                  ],
                })
              );
              cellChildren.push(...makeTextParagraphs(item.objectives, { size: 18, after: 60 }));
            }

            // 3. Activity
            if (item.activities) {
              cellChildren.push(
                new Paragraph({
                  spacing: { after: 20 },
                  children: [
                    new TextRun({
                      text: "Activity:",
                      size: 17,
                      font: "Arial",
                      color: "4B5563",
                    }),
                  ],
                })
              );
              cellChildren.push(...makeTextParagraphs(item.activities, { size: 18, after: 60 }));
            }

            // 4. Resource
            if (item.resources !== undefined && item.resources !== '') {
              cellChildren.push(
                new Paragraph({
                  spacing: { after: 20 },
                  children: [
                    new TextRun({
                      text: "Resource:",
                      size: 17,
                      font: "Arial",
                      color: "4B5563",
                    }),
                  ],
                })
              );
              cellChildren.push(...makeTextParagraphs(item.resources || "-", { size: 18, after: 60 }));
            }
          });
        }
      }

      rowCells.push(
        new TableCell({
          width: { size: 17, type: WidthType.PERCENTAGE },
          shading: cellShading,
          verticalMerge: cellVerticalMerge,
          children: cellChildren.length > 0 ? cellChildren : [new Paragraph({})],
        })
      );
    });

    tableRows.push(
      new TableRow({
        cantSplit: true,
        children: rowCells,
      })
    );
  });

  const mainTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: tableBorders,
    rows: tableRows,
  });

  return new Document({
    sections: [
      {
        properties: {
          page: {
            orientation: PageOrientation.LANDSCAPE,
            size: {
              width: 15840,  // 11 inches (Landscape)
              height: 12240, // 8.5 inches
            },
            margin: {
              top: 720,    // 0.5 inch
              bottom: 720,
              left: 720,
              right: 720,
            },
          },
        },
        children: [...headerParagraphs, mainTable],
      },
    ],
  });
}
