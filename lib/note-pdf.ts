import { STROKE_COLOR, STROKE_WIDTH } from './theme';
import { formatAuthorName } from './schemas/note-author';
import type { NotePage, StoredNote } from './schemas/note';

// Notes are turned into PDFs here, in plain JS, rather than through a print or
// PDF native module: the ink is already vector paths, which map one-to-one onto
// PDF drawing operators, so the file stays small and sharp and no rebuild of
// the app is needed.

// A4 in PDF points, with a margin all round and room at the top of each page
// for whose note it is.
const PAGE_WIDTH = 595;
const MIN_PAGE_HEIGHT = 842;
const MARGIN = 36;
const HEADER_HEIGHT = 56;

// The width the ink is scaled from. Pages do not record the screen they were
// written on, so this is the widest ink in the note, but never less than a
// typical phone, so a short scribble is not blown up to fill the page.
const MIN_INK_WIDTH = 360;

/** The note as PDF file bytes: one PDF page per note page, with a heading on each. */
export function renderNotePdf(note: StoredNote): Uint8Array {
  const inkWidth = Math.max(MIN_INK_WIDTH, ...note.pages.map((page) => inkExtent(page).right));
  const scale = (PAGE_WIDTH - MARGIN * 2) / inkWidth;
  const heading = [
    formatAuthorName(note.author),
    `Hospital ID: ${note.author.hospitalId}`,
  ];

  const objects: string[] = [];
  const add = (body: string) => objects.push(body);

  add('<< /Type /Catalog /Pages 2 0 R >>');
  add(''); // The page tree, filled in once the pages' object numbers are known.
  add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');

  const pageRefs: string[] = [];

  note.pages.forEach((page, index) => {
    const inkHeight = inkExtent(page).bottom * scale;
    const height = Math.max(MIN_PAGE_HEIGHT, HEADER_HEIGHT + inkHeight + MARGIN * 2);
    const label = `Page ${index + 1} of ${note.pages.length}`;

    const content = [
      headingText(heading, label, height),
      inkDrawing(page, scale, height - MARGIN - HEADER_HEIGHT),
    ].join('\n');

    add(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
    const contentRef = `${objects.length} 0 R`;

    add(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${num(height)}] ` +
        `/Resources << /Font << /F1 3 0 R >> >> /Contents ${contentRef} >>`
    );
    pageRefs.push(`${objects.length} 0 R`);
  });

  objects[1] = `<< /Type /Pages /Kids [${pageRefs.join(' ')}] /Count ${pageRefs.length} >>`;

  // Everything written is ASCII (see pdfText), so string offsets are byte offsets.
  let file = '%PDF-1.4\n';
  const offsets = objects.map((body, index) => {
    const offset = file.length;
    file += `${index + 1} 0 obj\n${body}\nendobj\n`;
    return offset;
  });

  const xref = file.length;
  file +=
    `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n` +
    offsets.map((offset) => `${String(offset).padStart(10, '0')} 00000 n \n`).join('') +
    `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;

  const bytes = new Uint8Array(file.length);
  for (let index = 0; index < file.length; index++) bytes[index] = file.charCodeAt(index);
  return bytes;
}

function headingText(lines: string[], pageLabel: string, pageHeight: number) {
  const top = pageHeight - MARGIN - 12;
  return [
    'BT',
    `/F1 13 Tf 0 g ${MARGIN} ${num(top)} Td (${pdfText(lines[0])}) Tj`,
    `/F1 10 Tf 0.4 g 0 -16 Td (${pdfText(lines[1])}) Tj`,
    'ET',
    'BT',
    `/F1 10 Tf 0.4 g ${PAGE_WIDTH - MARGIN - 70} ${num(top)} Td (${pdfText(pageLabel)}) Tj`,
    'ET',
  ].join('\n');
}

/**
 * The page's strokes, drawn the way the canvas draws them: round caps and
 * joins, so a lone tap still shows as a dot. Page coordinates run down from
 * the top, so the y axis is flipped to PDF's bottom-up one.
 */
function inkDrawing(page: NotePage, scale: number, top: number) {
  const [r, g, b] = rgb(STROKE_COLOR);
  const strokes = page.paths.map(svgPathToPdf).filter(Boolean);

  return [
    'q',
    `${num(scale)} 0 0 ${num(-scale)} ${MARGIN} ${num(top)} cm`,
    `${STROKE_WIDTH} w 1 J 1 j ${num(r)} ${num(g)} ${num(b)} RG`,
    ...strokes,
    'Q',
  ].join('\n');
}

/**
 * Converts one stroke's SVG path data (as Skia writes it: absolute M, L, Q, C
 * and Z) into PDF path operators. PDF has no quadratic curve, so each Q is
 * raised to the cubic that traces the same curve. Relative commands are read
 * too, in case a path ever arrives from somewhere else.
 */
function svgPathToPdf(data: string): string {
  const tokens = data.match(/[a-zA-Z]|-?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g) ?? [];
  const ops: string[] = [];
  let x = 0;
  let y = 0;
  let startX = 0;
  let startY = 0;
  let command = '';
  let index = 0;

  const next = () => Number(tokens[index++]);
  const point = (relative: boolean): [number, number] => {
    const px = next();
    const py = next();
    return relative ? [x + px, y + py] : [px, py];
  };

  while (index < tokens.length) {
    // Numbers after a command's last arguments repeat that command.
    if (/[a-zA-Z]/.test(tokens[index])) command = tokens[index++];
    const relative = command === command.toLowerCase();

    switch (command.toUpperCase()) {
      case 'M': {
        [x, y] = point(relative);
        [startX, startY] = [x, y];
        ops.push(`${num(x)} ${num(y)} m`);
        // Further pairs after a moveto are linetos.
        command = relative ? 'l' : 'L';
        break;
      }
      case 'L': {
        [x, y] = point(relative);
        ops.push(`${num(x)} ${num(y)} l`);
        break;
      }
      case 'H': {
        x = relative ? x + next() : next();
        ops.push(`${num(x)} ${num(y)} l`);
        break;
      }
      case 'V': {
        y = relative ? y + next() : next();
        ops.push(`${num(x)} ${num(y)} l`);
        break;
      }
      case 'Q': {
        const [qx, qy] = point(relative);
        const [ex, ey] = point(relative);
        const c1x = x + ((qx - x) * 2) / 3;
        const c1y = y + ((qy - y) * 2) / 3;
        const c2x = ex + ((qx - ex) * 2) / 3;
        const c2y = ey + ((qy - ey) * 2) / 3;
        ops.push(`${num(c1x)} ${num(c1y)} ${num(c2x)} ${num(c2y)} ${num(ex)} ${num(ey)} c`);
        [x, y] = [ex, ey];
        break;
      }
      case 'C': {
        const [c1x, c1y] = point(relative);
        const [c2x, c2y] = point(relative);
        [x, y] = point(relative);
        ops.push(`${num(c1x)} ${num(c1y)} ${num(c2x)} ${num(c2y)} ${num(x)} ${num(y)} c`);
        break;
      }
      case 'Z': {
        ops.push('h');
        [x, y] = [startX, startY];
        break;
      }
      default:
        // Anything else (arcs, smooth curves) is never written by the canvas;
        // stop rather than misread the rest of the path.
        index = tokens.length;
    }
  }

  return ops.length > 0 ? `${ops.join(' ')} S` : '';
}

/** How far right and down the page's ink reaches, in page coordinates. */
function inkExtent(page: NotePage) {
  let right = 0;
  let bottom = 0;
  for (const stroke of page.strokes) {
    for (const point of stroke.points) {
      right = Math.max(right, point.x);
      bottom = Math.max(bottom, point.y);
    }
  }
  return { right: right + STROKE_WIDTH, bottom: bottom + STROKE_WIDTH };
}

/** A string for a PDF literal: escaped, and limited to ASCII so offsets stay byte-exact. */
function pdfText(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\x20-\x7e]/g, '?')
    .replace(/[\\()]/g, (char) => `\\${char}`);
}

function rgb(hex: string): [number, number, number] {
  const value = parseInt(hex.replace('#', ''), 16);
  return [((value >> 16) & 255) / 255, ((value >> 8) & 255) / 255, (value & 255) / 255];
}

function num(value: number) {
  return Number.isFinite(value) ? String(Math.round(value * 100) / 100) : '0';
}
