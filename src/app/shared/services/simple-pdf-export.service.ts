import { Injectable } from '@angular/core';

export interface PdfCardSection {
  title: string;
  subtitle?: string;
  lines: string[];
}

interface PdfPageContent {
  cardTitle: string;
  cardSubtitle: string;
  continuation: boolean;
  lines: string[];
}

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const PAGE_MARGIN = 40;
const CARD_TOP = 765;
const CARD_BOTTOM = 54;
const LINE_HEIGHT = 14;
const MAX_TEXT_WIDTH = 86;
const MAX_LINES_PER_PAGE = 43;

@Injectable({ providedIn: 'root' })
export class SimplePdfExportService {
  exportCards(
    fileName: string,
    documentTitle: string,
    documentSubtitle: string,
    cards: PdfCardSection[]
  ): void {
    const pages = createPages(cards);
    const pdfBytes = buildPdf(documentTitle, documentSubtitle, pages);
    const blob = new Blob([pdfBytes.buffer as ArrayBuffer], {
      type: 'application/pdf'
    });
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');

    anchor.href = objectUrl;
    anchor.download = fileName.toLowerCase().endsWith('.pdf')
      ? fileName
      : `${fileName}.pdf`;
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();

    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  }
}

function createPages(cards: PdfCardSection[]): PdfPageContent[] {
  return cards.flatMap((card) => {
    const wrappedLines = card.lines.flatMap((line) => wrapText(line));
    const safeLines = wrappedLines.length
      ? wrappedLines
      : ['Sin información disponible.'];
    const chunks = chunk(safeLines, MAX_LINES_PER_PAGE);

    return chunks.map((lines, index) => ({
      cardTitle: card.title,
      cardSubtitle: card.subtitle?.trim() || '',
      continuation: index > 0,
      lines
    }));
  });
}

function buildPdf(
  documentTitle: string,
  documentSubtitle: string,
  pages: PdfPageContent[]
): Uint8Array {
  const safePages = pages.length
    ? pages
    : [
        {
          cardTitle: 'PERFIL PRECONSOLIDADO',
          cardSubtitle: '',
          continuation: false,
          lines: ['Sin información disponible.']
        }
      ];
  const objects: string[] = [];
  const pageObjectIds: number[] = [];
  const regularFontId = 3;
  const boldFontId = 4;

  objects[1] = '<< /Type /Catalog /Pages 2 0 R >>';
  objects[regularFontId] =
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>';
  objects[boldFontId] =
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>';

  safePages.forEach((page, index) => {
    const contentObjectId = 5 + index * 2;
    const pageObjectId = contentObjectId + 1;
    const content = createPageStream(
      documentTitle,
      documentSubtitle,
      page,
      index + 1,
      safePages.length
    );

    objects[contentObjectId] =
      `<< /Length ${content.length} >>\n` +
      `stream\n${content}\nendstream`;
    objects[pageObjectId] =
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH.toFixed(2)} ${PAGE_HEIGHT.toFixed(2)}] ` +
      `/Resources << /Font << /F1 ${regularFontId} 0 R /F2 ${boldFontId} 0 R >> >> ` +
      `/Contents ${contentObjectId} 0 R >>`;
    pageObjectIds.push(pageObjectId);
  });

  objects[2] = `<< /Type /Pages /Kids [${pageObjectIds
    .map((id) => `${id} 0 R`)
    .join(' ')}] /Count ${pageObjectIds.length} >>`;

  return serializePdf(objects);
}

function createPageStream(
  documentTitle: string,
  documentSubtitle: string,
  page: PdfPageContent,
  pageNumber: number,
  totalPages: number
): string {
  const commands: string[] = [];
  const cardX = PAGE_MARGIN;
  const cardY = CARD_BOTTOM;
  const cardWidth = PAGE_WIDTH - PAGE_MARGIN * 2;
  const cardHeight = CARD_TOP - CARD_BOTTOM;

  commands.push('0.12 0.19 0.24 rg');
  commands.push(textCommand(documentTitle, 42, 807, 16, true));
  commands.push('0.36 0.43 0.48 rg');
  commands.push(textCommand(documentSubtitle, 42, 789, 9, false));
  commands.push('0.92 0.94 0.96 rg');
  commands.push(
    `${cardX.toFixed(2)} ${cardY.toFixed(2)} ${cardWidth.toFixed(2)} ${cardHeight.toFixed(2)} re f`
  );
  commands.push('0.72 0.77 0.81 RG 1 w');
  commands.push(
    `${cardX.toFixed(2)} ${cardY.toFixed(2)} ${cardWidth.toFixed(2)} ${cardHeight.toFixed(2)} re S`
  );
  commands.push('0.12 0.19 0.24 rg');
  commands.push(
    textCommand(
      page.continuation ? `${page.cardTitle} (CONTINUACIÓN)` : page.cardTitle,
      58,
      736,
      13,
      true
    )
  );

  if (page.cardSubtitle) {
    commands.push('0.36 0.43 0.48 rg');
    commands.push(textCommand(page.cardSubtitle, 58, 718, 9, false));
  }

  let y = page.cardSubtitle ? 690 : 706;
  commands.push('0.12 0.19 0.24 rg');

  for (const line of page.lines) {
    commands.push(textCommand(line, 58, y, 9, false));
    y -= LINE_HEIGHT;
  }

  commands.push('0.42 0.48 0.53 rg');
  commands.push(
    textCommand(
      `Página ${pageNumber} de ${totalPages}`,
      PAGE_WIDTH - 112,
      30,
      8,
      false
    )
  );

  return commands.join('\n');
}

function textCommand(
  text: string,
  x: number,
  y: number,
  size: number,
  bold: boolean
): string {
  return `BT /${bold ? 'F2' : 'F1'} ${size} Tf 1 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)} Tm (${pdfLiteral(text)}) Tj ET`;
}

function wrapText(value: string): string[] {
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (!normalized) {
    return [''];
  }

  const words = normalized.split(' ');
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    if (word.length > MAX_TEXT_WIDTH) {
      if (current) {
        lines.push(current);
        current = '';
      }
      for (let index = 0; index < word.length; index += MAX_TEXT_WIDTH) {
        lines.push(word.slice(index, index + MAX_TEXT_WIDTH));
      }
      continue;
    }

    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= MAX_TEXT_WIDTH) {
      current = candidate;
    } else {
      lines.push(current);
      current = word;
    }
  }

  if (current) {
    lines.push(current);
  }

  return lines;
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

function serializePdf(objects: string[]): Uint8Array {
  let output = '%PDF-1.4\n%SUIC\n';
  const offsets: number[] = [0];

  for (let id = 1; id < objects.length; id += 1) {
    const object = objects[id];
    if (!object) {
      throw new Error(`No se pudo construir el objeto PDF ${id}.`);
    }

    offsets[id] = output.length;
    output += `${id} 0 obj\n${object}\nendobj\n`;
  }

  const xrefOffset = output.length;
  output += `xref\n0 ${objects.length}\n`;
  output += '0000000000 65535 f \n';

  for (let id = 1; id < objects.length; id += 1) {
    output += `${offsets[id].toString().padStart(10, '0')} 00000 n \n`;
  }

  output +=
    `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\n` +
    `startxref\n${xrefOffset}\n%%EOF`;

  return new TextEncoder().encode(output);
}

function pdfLiteral(value: string): string {
  return Array.from(value.replace(/[\r\n]+/g, ' '))
    .map((character) => {
      const byte = toWinAnsiByte(character);

      if (byte === 40 || byte === 41 || byte === 92) {
        return `\\${String.fromCharCode(byte)}`;
      }

      if (byte < 32 || byte > 126) {
        return `\\${byte.toString(8).padStart(3, '0')}`;
      }

      return String.fromCharCode(byte);
    })
    .join('');
}

function toWinAnsiByte(character: string): number {
  const codePoint = character.codePointAt(0) ?? 63;
  if (codePoint <= 255) {
    return codePoint;
  }

  const extraCharacters: Readonly<Record<number, number>> = {
    0x20ac: 128,
    0x201a: 130,
    0x0192: 131,
    0x201e: 132,
    0x2026: 133,
    0x2020: 134,
    0x2021: 135,
    0x02c6: 136,
    0x2030: 137,
    0x0160: 138,
    0x2039: 139,
    0x0152: 140,
    0x017d: 142,
    0x2018: 145,
    0x2019: 146,
    0x201c: 147,
    0x201d: 148,
    0x2022: 149,
    0x2013: 150,
    0x2014: 151,
    0x02dc: 152,
    0x2122: 153,
    0x0161: 154,
    0x203a: 155,
    0x0153: 156,
    0x017e: 158,
    0x0178: 159
  };

  return extraCharacters[codePoint] ?? 63;
}
