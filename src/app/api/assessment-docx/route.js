/**
 * Assessment DOCX Generation API
 * Format matches HTML version exactly
 */

import { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun, AlignmentType, WidthType, BorderStyle, VerticalAlign, ImageRun } from 'docx';
import fs from 'fs/promises';
import path from 'path';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const payload = await request.json();
    
    // Load logo
    let logoBuffer = null;
    try {
      const logoPath = path.join(process.cwd(), 'public', 'images', 'login-logo.png');
      logoBuffer = await fs.readFile(logoPath);
    } catch (err) {
      console.warn('Could not load logo:', err);
    }
    
    const doc = buildDocument(payload, { logoBuffer });
    const buffer = await Packer.toBuffer(doc);
    
    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': 'attachment; filename="assessment.docx"',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    console.error('Error generating DOCX:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to generate DOCX', details: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

function buildDocument(payload, { logoBuffer } = {}) {
  const meta = payload?.meta ?? {};
  const criteria = Array.isArray(payload?.criteria) ? payload.criteria : [];
  
  const assessmentTitle = meta.assessmentTitle ?? '';
  const instructions = (meta.instructions ?? '').toString();
  const subjectName = meta.subjectName ?? '';
  const teacherName = meta.teacherName ?? '';
  const kelasName = meta.kelasName ?? '';
  const unitName = meta.unitName ?? '';

  const sections = [];

  // Main header table: 2 columns (Left: ASSESSMENT + Info | Right: Logo + Result)
  const rightColumnChildren = [];
  
  // Add logo if available
  if (logoBuffer) {
    try {
      rightColumnChildren.push(
        new Paragraph({
          children: [
            new ImageRun({
              data: logoBuffer,
              transformation: {
                width: 100,
                height: 60,
              },
              type: 'png',
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 150 },
        })
      );
    } catch (err) {
      console.warn('Could not add logo to document:', err);
    }
  }
  
  // Add result box
  rightColumnChildren.push(
    new Paragraph({
      text: '[                    ]',
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: 'RESULT',
          bold: true,
          size: 22,
          font: 'Arial',
        }),
      ],
      alignment: AlignmentType.CENTER,
    })
  );

  const headerTable = new Table({
    rows: [
      // Row 1: ASSESSMENT title (colspan 4) | Logo + Result (rowspan 4)
      new TableRow({
        children: [
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: 'ASSESSMENT',
                    bold: true,
                    size: 36,
                    font: 'Arial',
                  }),
                ],
              }),
            ],
            columnSpan: 4,
            margins: {
              top: 100,
              bottom: 100,
              left: 100,
              right: 100,
            },
          }),
          new TableCell({
            children: rightColumnChildren,
            rowSpan: 4,
            verticalAlign: VerticalAlign.CENTER,
            margins: {
              top: 100,
              bottom: 100,
              left: 100,
              right: 100,
            },
          }),
        ],
      }),
      // Row 2: Name label | Name value | Subject label | Subject value
      new TableRow({
        children: [
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: 'Name', size: 22, font: 'Arial' }),
                ],
              }),
            ],
            width: { size: 15, type: WidthType.PERCENTAGE },
            margins: {
              top: 100,
              bottom: 100,
              left: 100,
              right: 100,
            },
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: ':', size: 22, font: 'Arial' }),
                ],
              }),
            ],
            width: { size: 35, type: WidthType.PERCENTAGE },
            margins: {
              top: 100,
              bottom: 100,
              left: 100,
              right: 100,
            },
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: 'Subject', size: 22, font: 'Arial' }),
                ],
              }),
            ],
            width: { size: 15, type: WidthType.PERCENTAGE },
            margins: {
              top: 100,
              bottom: 100,
              left: 100,
              right: 100,
            },
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: ': ', size: 22, font: 'Arial' }),
                  new TextRun({ text: subjectName || '', size: 22, font: 'Arial' }),
                ],
              }),
            ],
            width: { size: 35, type: WidthType.PERCENTAGE },
            margins: {
              top: 100,
              bottom: 100,
              left: 100,
              right: 100,
            },
          }),
        ],
      }),
      // Row 3: Class label | Class value | Unit label | Unit value
      new TableRow({
        children: [
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: 'Class', size: 22, font: 'Arial' }),
                ],
              }),
            ],
            width: { size: 15, type: WidthType.PERCENTAGE },
            margins: {
              top: 100,
              bottom: 100,
              left: 100,
              right: 100,
            },
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: ': ', size: 22, font: 'Arial' }),
                  new TextRun({ text: kelasName || '', size: 22, font: 'Arial' }),
                ],
              }),
            ],
            width: { size: 35, type: WidthType.PERCENTAGE },
            margins: {
              top: 100,
              bottom: 100,
              left: 100,
              right: 100,
            },
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: 'Unit', size: 22, font: 'Arial' }),
                ],
              }),
            ],
            width: { size: 15, type: WidthType.PERCENTAGE },
            margins: {
              top: 100,
              bottom: 100,
              left: 100,
              right: 100,
            },
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: ': ', size: 22, font: 'Arial' }),
                  new TextRun({ text: unitName || '', size: 22, font: 'Arial' }),
                ],
              }),
            ],
            width: { size: 35, type: WidthType.PERCENTAGE },
            margins: {
              top: 100,
              bottom: 100,
              left: 100,
              right: 100,
            },
          }),
        ],
      }),
      // Row 4: Day/Date label | Day/Date value | Teacher label | Teacher value
      new TableRow({
        children: [
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: 'Day/Date', size: 22, font: 'Arial' }),
                ],
              }),
            ],
            width: { size: 15, type: WidthType.PERCENTAGE },
            margins: {
              top: 100,
              bottom: 100,
              left: 100,
              right: 100,
            },
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: ':', size: 22, font: 'Arial' }),
                ],
              }),
            ],
            width: { size: 35, type: WidthType.PERCENTAGE },
            margins: {
              top: 100,
              bottom: 100,
              left: 100,
              right: 100,
            },
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: 'Teacher', size: 22, font: 'Arial' }),
                ],
              }),
            ],
            width: { size: 15, type: WidthType.PERCENTAGE },
            margins: {
              top: 100,
              bottom: 100,
              left: 100,
              right: 100,
            },
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: ': ', size: 22, font: 'Arial' }),
                  new TextRun({ text: teacherName || '', size: 22, font: 'Arial' }),
                ],
              }),
            ],
            width: { size: 35, type: WidthType.PERCENTAGE },
            margins: {
              top: 100,
              bottom: 100,
              left: 100,
              right: 100,
            },
          }),
        ],
      }),
    ],
    width: { size: 10000, type: WidthType.DXA },
    borders: {
      top: { style: BorderStyle.NONE, size: 0 },
      bottom: { style: BorderStyle.NONE, size: 0 },
      left: { style: BorderStyle.NONE, size: 0 },
      right: { style: BorderStyle.NONE, size: 0 },
      insideHorizontal: { style: BorderStyle.NONE, size: 0 },
      insideVertical: { style: BorderStyle.NONE, size: 0 },
    },
  });

  sections.push(headerTable);


  // Divider line
  sections.push(
    new Paragraph({
      text: '',
      border: { bottom: { color: '000000', space: 1, style: BorderStyle.SINGLE, size: 6 } },
      spacing: { before: 100, after: 300 },
    })
  );

  // Assessment Title (centered, large)
  sections.push(
    new Paragraph({
      children: [
        new TextRun({
          text: assessmentTitle.toUpperCase(),
          bold: true,
          size: 40, // 20pt
          font: 'Arial',
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 300 },
    })
  );

  // Task Overview Title
  sections.push(
    new Paragraph({
      children: [
        new TextRun({
          text: 'TASK OVERVIEW',
          bold: true,
          size: 22,
          font: 'Arial',
        }),
      ],
      spacing: { after: 100 },
    })
  );

  // Task Overview Table
  const taskOverviewRows = [
    { label: 'Criterion', value: String(meta.criteriaCodes || '') },
    { label: 'Proficiency Level', value: String(meta.proficiencyLevel || '') },
    { label: 'Key Concept', value: String(meta.keyConcept || '') },
    { label: 'Related Concepts', value: String(meta.relatedConcepts || '') },
    { label: 'Conceptual Understanding', value: String(meta.conceptualUnderstanding || '') },
    { label: 'Global Context Exploration', value: String(meta.globalContext || '') },
    { label: 'Statement of Inquiry', value: String(meta.statementOfInquiry || '') },
    { label: 'Task Specific Description', value: String(meta.taskSpecificDescription || '') },
  ];

  const overviewTableRows = taskOverviewRows.map(row =>
    new TableRow({
      children: [
        new TableCell({
          children: [new Paragraph({ 
            children: [new TextRun({ text: row.label, bold: true, size: 22, font: 'Arial' })],
          })],
          width: { size: 30, type: WidthType.PERCENTAGE },
          borders: {
            top: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
            bottom: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
            left: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
            right: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
          },
          margins: { top: 150, bottom: 150, left: 150, right: 150 },
        }),
        new TableCell({
          children: [new Paragraph({ 
            children: [new TextRun({ text: row.value, size: 22, font: 'Arial' })],
          })],
          width: { size: 70, type: WidthType.PERCENTAGE },
          borders: {
            top: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
            bottom: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
            left: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
            right: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
          },
          margins: { top: 150, bottom: 150, left: 150, right: 150 },
        }),
      ],
    })
  );

  sections.push(
    new Table({
      rows: overviewTableRows,
      width: { size: 100, type: WidthType.PERCENTAGE },
    })
  );

  sections.push(new Paragraph({ text: '', spacing: { after: 400 } }));

  // INSTRUCTIONS (new page in HTML, simulate with spacing)
  if (instructions) {
    sections.push(
      new Paragraph({
        text: '',
        pageBreakBefore: true,
      })
    );

    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'INSTRUCTIONS:',
            bold: true,
            size: 22,
            font: 'Arial',
          }),
        ],
        spacing: { after: 200 },
      })
    );

    const instructionLines = instructions.split('\n').filter(line => line.trim());
    instructionLines.forEach((line) => {
      sections.push(
        new Paragraph({
          children: [
            new TextRun({ text: line, size: 22, font: 'Arial' }),
          ],
          spacing: { after: 150 },
        })
      );
    });

    sections.push(new Paragraph({ text: '', spacing: { after: 400 } }));
  }

  // CRITERIA SECTION
  if (criteria.length > 0) {
    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'SUBJECT CRITERIA AND TASK-SPECIFIC CLARIFICATION',
            bold: true,
            size: 22,
            font: 'Arial',
          }),
        ],
        spacing: { before: 400, after: 300 },
      })
    );

    criteria.forEach(crit => {
      const code = crit?.code ?? '';
      const bands = Array.isArray(crit?.bands) ? crit.bands : [];

      // Criteria Title
      sections.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `Criteria ${code}`,
              bold: true,
              size: 22,
              font: 'Arial',
            }),
          ],
          spacing: { before: 200, after: 100 },
        })
      );

      // Header Row
      const headerRow = new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({ text: '', size: 22, alignment: AlignmentType.CENTER })],
            width: { size: 10, type: WidthType.PERCENTAGE },
            shading: { fill: 'f0f0f0' },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
              bottom: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
              left: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
              right: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
            },
          }),
          new TableCell({
            children: [new Paragraph({ 
              children: [new TextRun({ text: 'SUBJECT CRITERIA', bold: true, size: 22, font: 'Arial' })],
              alignment: AlignmentType.CENTER,
            })],
            width: { size: 45, type: WidthType.PERCENTAGE },
            shading: { fill: 'f0f0f0' },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
              bottom: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
              left: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
              right: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
            },
          }),
          new TableCell({
            children: [new Paragraph({ 
              children: [new TextRun({ text: 'TASK-SPECIFIC CLARIFICATION', bold: true, size: 22, font: 'Arial' })],
              alignment: AlignmentType.CENTER,
            })],
            width: { size: 45, type: WidthType.PERCENTAGE },
            shading: { fill: 'f0f0f0' },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
              bottom: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
              left: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
              right: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
            },
          }),
        ],
      });

      const criteriaRows = [headerRow];

      bands.forEach(band => {
        const bandLabel = band?.bandLabel ?? '';
        const subjectItems = Array.isArray(band?.subjectItems) ? band.subjectItems : [];
        const tscItems = Array.isArray(band?.tscItems) ? band.tscItems : [];

        const buildItemsParagraphs = (items) => {
          if (!items || items.length === 0) return [];
          const paras = [
            new Paragraph({
              children: [
                new TextRun({
                  text: 'The student:',
                  bold: true,
                  size: 22,
                  font: 'Arial',
                }),
              ],
              spacing: { after: 80 },
            })
          ];
          items.forEach(it => {
            const label = String(it?.label ?? '');
            let text = String(it?.text ?? '');
            // Force lowercase first letter
            if (text.length > 0) {
              text = text.charAt(0).toLowerCase() + text.slice(1);
            }
            if (text) {
              paras.push(
                new Paragraph({
                  children: [
                    new TextRun({ text: `${label}. ${text}`, size: 22, font: 'Arial' }),
                  ],
                  spacing: { after: 80 },
                })
              );
            }
          });
          return paras;
        };

        const subjectParas = buildItemsParagraphs(subjectItems);
        const tscParas = buildItemsParagraphs(tscItems);

        criteriaRows.push(
          new TableRow({
            children: [
              new TableCell({
                children: [new Paragraph({ 
                  children: [new TextRun({ text: bandLabel, bold: true, size: 22, font: 'Arial' })],
                  alignment: AlignmentType.CENTER,
                })],
                width: { size: 10, type: WidthType.PERCENTAGE },
                verticalAlign: VerticalAlign.TOP,
                borders: {
                  top: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
                  bottom: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
                  left: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
                  right: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
                },
                margins: { top: 100, bottom: 100, left: 100, right: 100 },
              }),
              new TableCell({
                children: subjectParas.length > 0 ? subjectParas : [new Paragraph({ text: '', size: 22 })],
                width: { size: 45, type: WidthType.PERCENTAGE },
                verticalAlign: VerticalAlign.TOP,
                borders: {
                  top: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
                  bottom: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
                  left: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
                  right: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
                },
                margins: { top: 100, bottom: 100, left: 100, right: 100 },
              }),
              new TableCell({
                children: tscParas.length > 0 ? tscParas : [new Paragraph({ text: '', size: 22 })],
                width: { size: 45, type: WidthType.PERCENTAGE },
                verticalAlign: VerticalAlign.TOP,
                borders: {
                  top: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
                  bottom: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
                  left: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
                  right: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
                },
                margins: { top: 100, bottom: 100, left: 100, right: 100 },
              }),
            ],
          })
        );
      });

      sections.push(
        new Table({
          rows: criteriaRows,
          width: { size: 100, type: WidthType.PERCENTAGE },
        })
      );

      sections.push(new Paragraph({ text: '', spacing: { after: 200 } }));
    });
  }

  return new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1134, // 0.79in in twips
              right: 1134,
              bottom: 1134,
              left: 1134,
            },
          },
        },
        children: sections,
      },
    ],
  });
}
