/**
 * instructionDocxHelper.js
 * Helpers for parsing and converting HTML instructions into DOCX elements,
 * plain text, or checking emptiness.
 */

export function isHtmlContent(str) {
  if (!str) return false;
  return /<[a-z][\s\S]*>/i.test(String(str));
}

export function isHtmlEmpty(str) {
  if (!str) return true;
  const clean = String(str)
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
  return clean.length === 0;
}

export function decodeHtmlEntities(str) {
  if (!str) return '';
  return String(str)
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

export function htmlToPlainText(str) {
  if (!str) return '';
  if (!isHtmlContent(str)) return str;

  return str
    .replace(/<\/(p|div|h[1-6]|li|tr)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<th[^>]*>/gi, '  | ')
    .replace(/<td[^>]*>/gi, '  | ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Extract hex color from CSS color string
 */
function parseCssColor(colorStr) {
  if (!colorStr) return undefined;
  const hex = colorStr.match(/#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})/);
  if (hex) {
    if (hex[1].length === 3) {
      return hex[1].split('').map(c => c + c).join('').toUpperCase();
    }
    return hex[1].toUpperCase();
  }
  return undefined;
}

/**
 * Parse an HTML snippet with inline tags into docx TextRun elements.
 */
function parseInlineRuns(html, { TextRun, defaultSize = 22, defaultFont = 'Arial', defaultBold = false }) {
  const tagRegex = /(<\/?(?:strong|b|em|i|u|s|del|mark|span)[^>]*>)/gi;
  const parts = html.split(tagRegex);
  const runs = [];

  let isBold = defaultBold;
  let isItalic = false;
  let isUnderline = false;
  let isStrike = false;
  let isHighlight = false;
  let currentColor = undefined;
  let currentFont = defaultFont;

  for (const part of parts) {
    if (!part) continue;
    const lower = part.toLowerCase();

    if (lower.startsWith('<strong') || lower.startsWith('<b ') || lower === '<b>') {
      isBold = true;
    } else if (lower === '</strong>' || lower === '</b>') {
      isBold = defaultBold;
    } else if (lower.startsWith('<em') || lower.startsWith('<i ') || lower === '<i>') {
      isItalic = true;
    } else if (lower === '</em>' || lower === '</i>') {
      isItalic = false;
    } else if (lower.startsWith('<u ') || lower === '<u>') {
      isUnderline = true;
    } else if (lower === '</u>') {
      isUnderline = false;
    } else if (lower.startsWith('<s ') || lower === '<s>' || lower.startsWith('<del') || lower === '<del>') {
      isStrike = true;
    } else if (lower === '</s>' || lower === '</del>') {
      isStrike = false;
    } else if (lower.startsWith('<mark')) {
      isHighlight = true;
    } else if (lower === '</mark>') {
      isHighlight = false;
    } else if (lower.startsWith('<span')) {
      // Check style for color or font-family
      const styleMatch = part.match(/style\s*=\s*["']([^"']+)["']/i);
      if (styleMatch) {
        const style = styleMatch[1];
        const colorMatch = style.match(/color\s*:\s*([^;]+)/i);
        if (colorMatch) {
          currentColor = parseCssColor(colorMatch[1]);
        }
        const fontMatch = style.match(/font-family\s*:\s*([^;]+)/i);
        if (fontMatch) {
          currentFont = fontMatch[1].replace(/['"]/g, '').trim().split(',')[0] || defaultFont;
        }
      }
    } else if (lower === '</span>') {
      currentColor = undefined;
      currentFont = defaultFont;
    } else if (!lower.startsWith('<')) {
      const clean = decodeHtmlEntities(part.replace(/<[^>]+>/g, ''));
      if (clean) {
        runs.push(
          new TextRun({
            text: clean,
            bold: isBold,
            italics: isItalic,
            underline: isUnderline ? {} : undefined,
            strike: isStrike,
            highlight: isHighlight ? 'yellow' : undefined,
            color: currentColor,
            size: defaultSize,
            font: currentFont,
          })
        );
      }
    }
  }

  return runs;
}

/**
 * Convert HTML or plain-text instructions into an array of docx Paragraphs & Tables.
 */
export function convertInstructionsToDocxElements(instructionsText, { Paragraph, TextRun, Table, TableRow, TableCell, AlignmentType, WidthType, BorderStyle }) {
  if (!instructionsText) return [];

  // 1. Backward compatibility: if plain text, split by newline
  if (!isHtmlContent(instructionsText)) {
    const lines = String(instructionsText).split('\n').filter(l => l.trim());
    return lines.map((line) => {
      return new Paragraph({
        children: [
          new TextRun({ text: line, size: 22, font: 'Arial' }),
        ],
        spacing: { after: 150 },
      });
    });
  }

  // 2. HTML parsing
  const elements = [];
  
  // Normalize self-closing breaks
  const normalized = instructionsText.replace(/<br\s*\/?>/gi, '</p><p>');

  // Match block-level elements: h1-h6, p, ul, ol, div, table
  const blockRegex = /<(h[1-6]|p|ul|ol|div|table)([^>]*)>([\s\S]*?)<\/\1>/gi;
  let match;
  let hasMatches = false;

  while ((match = blockRegex.exec(normalized)) !== null) {
    hasMatches = true;
    const tag = match[1].toLowerCase();
    const attrs = match[2];
    const content = match[3];

    // Determine alignment
    let alignment = undefined;
    if (/text-align\s*:\s*center/i.test(attrs)) alignment = AlignmentType?.CENTER;
    else if (/text-align\s*:\s*right/i.test(attrs)) alignment = AlignmentType?.RIGHT;
    else if (/text-align\s*:\s*justify/i.test(attrs)) alignment = AlignmentType?.JUSTIFIED;

    if (tag === 'table' && Table && TableRow && TableCell) {
      // Build docx Table
      const rowMatches = content.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || [];
      const docxRows = [];

      for (const rowHtml of rowMatches) {
        const cellMatches = rowHtml.match(/<(th|td)[^>]*>([\s\S]*?)<\/\1>/gi) || [];
        const docxCells = [];

        for (const cellHtml of cellMatches) {
          const isHeader = cellHtml.startsWith('<th');
          const cellInner = cellHtml.replace(/^<(th|td)[^>]*>/i, '').replace(/<\/(th|td)>$/i, '');
          const runs = parseInlineRuns(cellInner, { TextRun, defaultBold: isHeader, defaultSize: 20 });
          
          docxCells.push(
            new TableCell({
              children: [
                new Paragraph({
                  children: runs.length > 0 ? runs : [new TextRun({ text: '', size: 20 })],
                  spacing: { top: 60, bottom: 60 },
                }),
              ],
              shading: isHeader ? { fill: 'F3F4F6' } : undefined,
              margins: { top: 80, bottom: 80, left: 100, right: 100 },
            })
          );
        }

        if (docxCells.length > 0) {
          docxRows.push(new TableRow({ children: docxCells }));
        }
      }

      if (docxRows.length > 0) {
        elements.push(
          new Table({
            width: { size: 100, type: WidthType?.PERCENTAGE || 'pct' },
            rows: docxRows,
          })
        );
        elements.push(new Paragraph({ text: '', spacing: { after: 150 } }));
      }
    } else if (tag.startsWith('h')) {
      const runs = parseInlineRuns(content, { TextRun, defaultBold: true, defaultSize: 24 });
      if (runs.length > 0) {
        elements.push(
          new Paragraph({
            children: runs,
            alignment,
            spacing: { before: 200, after: 120 },
          })
        );
      }
    } else if (tag === 'ul') {
      const isTaskList = /task-list|taskList/i.test(attrs);
      const liRegex = /<li([^>]*)>([\s\S]*?)<\/li>/gi;
      let liMatch;
      while ((liMatch = liRegex.exec(content)) !== null) {
        const liAttrs = liMatch[1] || '';
        const liContent = liMatch[2];
        const indentMatch = liAttrs.match(/data-indent\s*=\s*["']?(\d+)["']?/i) || 
                            liAttrs.match(/margin-left\s*:\s*(\d+)px/i);
        let indentLevel = 0;
        if (indentMatch) {
          indentLevel = indentMatch[0].includes('px') 
            ? Math.round(parseInt(indentMatch[1], 10) / 24) 
            : parseInt(indentMatch[1], 10);
        }
        const isChecked = /data-checked="true"|checked/i.test(liMatch[0]);
        const innerTextHtml = liContent.replace(/<\/?p[^>]*>/gi, '');
        const runs = parseInlineRuns(innerTextHtml, { TextRun, defaultSize: 22 });
        if (runs.length > 0) {
          if (isTaskList) {
            elements.push(
              new Paragraph({
                children: [
                  new TextRun({ text: isChecked ? '[✓] ' : '[ ] ', bold: true, size: 22, font: 'Arial' }),
                  ...runs,
                ],
                indent: indentLevel > 0 ? { left: indentLevel * 360 } : undefined,
                spacing: { after: 120 },
              })
            );
          } else {
            elements.push(
              new Paragraph({
                children: runs,
                bullet: { level: indentLevel },
                spacing: { after: 120 },
              })
            );
          }
        }
      }
    } else if (tag === 'ol') {
      const startMatch = attrs.match(/start\s*=\s*["']?(\d+)["']?/i);
      let count = startMatch ? parseInt(startMatch[1], 10) : 1;
      const liRegex = /<li([^>]*)>([\s\S]*?)<\/li>/gi;
      let liMatch;
      while ((liMatch = liRegex.exec(content)) !== null) {
        const liAttrs = liMatch[1] || '';
        const liContent = liMatch[2];
        const indentMatch = liAttrs.match(/data-indent\s*=\s*["']?(\d+)["']?/i) || 
                            liAttrs.match(/margin-left\s*:\s*(\d+)px/i);
        let indentLevel = 0;
        if (indentMatch) {
          indentLevel = indentMatch[0].includes('px') 
            ? Math.round(parseInt(indentMatch[1], 10) / 24) 
            : parseInt(indentMatch[1], 10);
        }
        const innerTextHtml = liContent.replace(/<\/?p[^>]*>/gi, '');
        const runs = parseInlineRuns(innerTextHtml, { TextRun, defaultSize: 22 });
        if (runs.length > 0) {
          elements.push(
            new Paragraph({
              children: [
                new TextRun({ text: `${count}. `, bold: true, size: 22, font: 'Arial' }),
                ...runs,
              ],
              indent: indentLevel > 0 ? { left: indentLevel * 360 } : undefined,
              spacing: { after: 120 },
            })
          );
          count++;
        }
      }
    } else {
      // p or div
      const indentMatch = attrs.match(/data-indent\s*=\s*["']?(\d+)["']?/i) || 
                          attrs.match(/margin-left\s*:\s*(\d+)px/i);
      let indentLevel = 0;
      if (indentMatch) {
        indentLevel = indentMatch[0].includes('px') 
          ? Math.round(parseInt(indentMatch[1], 10) / 24) 
          : parseInt(indentMatch[1], 10);
      }
      const runs = parseInlineRuns(content, { TextRun, defaultSize: 22 });
      if (runs.length > 0) {
        elements.push(
          new Paragraph({
            children: runs,
            alignment,
            indent: indentLevel > 0 ? { left: indentLevel * 360 } : undefined,
            spacing: { after: 150 },
          })
        );
      }
    }
  }

  // Fallback if regex found no structured blocks
  if (!hasMatches || elements.length === 0) {
    const plain = htmlToPlainText(instructionsText);
    const lines = plain.split('\n').filter(l => l.trim());
    return lines.map((line) => {
      return new Paragraph({
        children: [
          new TextRun({ text: line, size: 22, font: 'Arial' }),
        ],
        spacing: { after: 150 },
      });
    });
  }

  return elements;
}
