// Printable physical-ticket PDFs (PDFKit, fully vector codes).
//
//  • BRANDED    – MyEvent-branded ticket cards (event, date, venue, category,
//                 ticket number, code, instructions, optional organizer line).
//  • CODES_ONLY – nothing but the code (and an optional tiny serial) so a
//                 graphic designer can place each code into their own artwork.
//
// Rendering is deterministic for a given (batch, index range) because tokens
// are derived, so any part can be regenerated at any time.

import PDFDocument from 'pdfkit';
import fs from 'node:fs';
import path from 'node:path';
import type { TicketCodeFormat, TicketPrintDesign } from '@/generated/prisma';
import { codeGeometry, type CodeGeometry } from '@/lib/ticket-generation/codes';

export const A4 = { w: 595.28, h: 841.89 };

export const BRANDED_LAYOUTS = [1, 2, 4, 8] as const;
export const CODES_ONLY_LAYOUTS = [1, 2, 4, 8, 12, 24] as const;
export const ALL_LAYOUTS = [1, 2, 4, 8, 12, 24] as const;

const GRID: Record<number, { cols: number; rows: number }> = {
  1: { cols: 1, rows: 1 },
  2: { cols: 1, rows: 2 },
  4: { cols: 2, rows: 2 },
  8: { cols: 2, rows: 4 },
  12: { cols: 3, rows: 4 },
  24: { cols: 4, rows: 6 },
};

export function isValidLayout(design: TicketPrintDesign, perPage: number): boolean {
  const list: readonly number[] = design === 'BRANDED' ? BRANDED_LAYOUTS : CODES_ONLY_LAYOUTS;
  return list.includes(perPage);
}

export interface PrintTicket {
  serial: string;
  token: string;
}

export interface PrintEventInfo {
  title: string;
  dateText: string;
  venueText: string;
  ticketTypeName: string;
  organizerLabel?: string | null;
  /** e.g. "QR code · Any scanner". Printed on branded tickets only (codes-only stays clean for designers). */
  scanText?: string | null;
}

/** Human text for the options chosen at generation time. Shared by the PDF, the batch list and the SVG manifest. */
export function describeScan(codeFormat: TicketCodeFormat, scannerMode: 'INBUILT_ONLY' | 'UNIVERSAL'): string {
  const code = codeFormat === 'QR' ? 'QR code' : 'Barcode';
  const scanner = scannerMode === 'INBUILT_ONLY' ? 'MyEvent app scanner only' : 'Any scanner';
  return `${code} · ${scanner}`;
}

export interface PrintOptions {
  design: TicketPrintDesign;
  codeFormat: TicketCodeFormat;
  ticketsPerPage: number;
  showSerial: boolean;
  event: PrintEventInfo;
  tickets: PrintTicket[];
}

let cachedLogo: Buffer | null | undefined;
function loadLogo(): Buffer | null {
  if (cachedLogo !== undefined) return cachedLogo;
  try {
    cachedLogo = fs.readFileSync(path.join(process.cwd(), 'public', 'logo-black.png'));
  } catch {
    cachedLogo = null; // falls back to a text wordmark
  }
  return cachedLogo;
}

function drawCode(doc: PDFKit.PDFDocument, g: CodeGeometry, x: number, y: number, boxW: number, boxH: number) {
  // Fit (preserving aspect) into the box, centred. Quiet zone is part of the geometry.
  const scale = Math.min(boxW / g.width, boxH / g.height);
  const w = g.width * scale;
  const h = g.height * scale;
  const ox = x + (boxW - w) / 2;
  const oy = y + (boxH - h) / 2;
  doc.save();
  doc.rect(ox, oy, w, h).fill('#ffffff'); // light quiet zone
  doc.fillColor('#000000');
  for (const r of g.rects) {
    // 0.02pt overlap avoids hairline seams between adjacent modules in some viewers
    doc.rect(ox + r.x * scale, oy + r.y * scale, r.w * scale + 0.02, r.h * scale + 0.02);
  }
  doc.fill('#000000');
  doc.restore();
  return { x: ox, y: oy, w, h };
}

function fitText(doc: PDFKit.PDFDocument, text: string, width: number, maxSize: number, minSize: number, font: string) {
  let size = maxSize;
  doc.font(font);
  while (size > minSize && doc.fontSize(size).widthOfString(text) > width) size -= 0.5;
  return size;
}

function drawBrandedCard(
  doc: PDFKit.PDFDocument,
  box: { x: number; y: number; w: number; h: number },
  t: PrintTicket,
  opts: PrintOptions,
  geometry: CodeGeometry,
  logo: unknown | null,
) {
  const { x, y, w, h } = box;
  const pad = Math.max(8, Math.min(w, h) * 0.04);
  const accent = '#c8102e';
  const ink = '#111827';
  const muted = '#6b7280';

  // Card + cut guide
  doc.save();
  doc.roundedRect(x + 2, y + 2, w - 4, h - 4, 8).dash(3, { space: 3 }).lineWidth(0.6).stroke('#9ca3af');
  doc.undash();
  doc.restore();

  const horizontal = w > h * 1.15;
  const innerX = x + pad + 4;
  const innerY = y + pad + 4;
  const innerW = w - (pad + 4) * 2;
  const innerH = h - (pad + 4) * 2;

  // Brand header
  const headerH = Math.min(30, innerH * 0.14);
  if (logo) {
    try {
      doc.image(logo as Parameters<PDFKit.PDFDocument['image']>[0], innerX, innerY, { height: headerH * 0.8 });
    } catch {
      doc.font('Helvetica-Bold').fontSize(headerH * 0.6).fillColor(ink).text('MyEvent', innerX, innerY, { lineBreak: false });
    }
  } else {
    doc.font('Helvetica-Bold').fontSize(headerH * 0.6).fillColor(ink).text('MyEvent', innerX, innerY, { lineBreak: false });
  }
  doc.font('Helvetica').fontSize(Math.max(6, headerH * 0.3)).fillColor(muted);
  const brandRight = 'myevent.com.ng';
  doc.text(brandRight, innerX, innerY + headerH * 0.25, { width: innerW, align: 'right', lineBreak: false });
  doc.moveTo(innerX, innerY + headerH).lineTo(innerX + innerW, innerY + headerH).lineWidth(1).stroke(accent);

  const bodyY = innerY + headerH + 8;
  const bodyH = innerH - headerH - 8;

  let codeBox: { x: number; y: number; w: number; h: number };
  let textBox: { x: number; y: number; w: number; h: number };
  const footerH = opts.event.organizerLabel ? 12 : 0;

  if (horizontal) {
    const codeSide = Math.min(bodyH - 18 - footerH, innerW * 0.38);
    codeBox = { x: innerX + innerW - codeSide, y: bodyY, w: codeSide, h: codeSide };
    textBox = { x: innerX, y: bodyY, w: innerW - codeSide - 12, h: bodyH - footerH };
  } else {
    const codeSide = Math.min(innerW, bodyH * 0.46);
    codeBox = { x: innerX + (innerW - codeSide) / 2, y: bodyY + bodyH - codeSide - 34 - footerH, w: codeSide, h: codeSide };
    textBox = { x: innerX, y: bodyY, w: innerW, h: codeBox.y - bodyY - 6 };
  }

  // Event text
  const titleSize = Math.max(10, Math.min(24, textBox.w / 11));
  doc.font('Helvetica-Bold').fontSize(titleSize).fillColor(ink);
  const titleOpts = { width: textBox.w, height: textBox.h * 0.45, ellipsis: true, lineGap: 1 };
  doc.text(opts.event.title, textBox.x, textBox.y, titleOpts);
  let cursorY = doc.y + 4;

  const small = Math.max(7, Math.min(11, textBox.w / 22));
  const line = (label: string, value: string) => {
    if (cursorY > textBox.y + textBox.h) return;
    doc.font('Helvetica-Bold').fontSize(small * 0.8).fillColor(accent).text(label.toUpperCase(), textBox.x, cursorY, { width: textBox.w, lineBreak: false });
    doc.font('Helvetica').fontSize(small).fillColor(ink).text(value, textBox.x, doc.y, { width: textBox.w, height: small * 2.4, ellipsis: true });
    cursorY = doc.y + 3;
  };
  line('Date & time', opts.event.dateText);
  line('Venue', opts.event.venueText);
  line('Ticket', opts.event.ticketTypeName);
  if (opts.event.scanText) line('Entry', opts.event.scanText);

  // Code
  const drawn = drawCode(doc, geometry, codeBox.x, codeBox.y, codeBox.w, codeBox.h);

  // Ticket number
  const serialSize = fitText(doc, t.serial, drawn.w + 20, 9, 5.5, 'Courier-Bold');
  doc.font('Courier-Bold').fontSize(serialSize).fillColor(ink);
  doc.text(t.serial, drawn.x - 10, drawn.y + drawn.h + 3, { width: drawn.w + 20, align: 'center', lineBreak: false });

  // Instructions
  const instrSize = Math.max(5.5, small * 0.75);
  doc.font('Helvetica').fontSize(instrSize).fillColor(muted);
  const instr = 'Present this ticket at the entrance. One entry per ticket. A scanned ticket cannot be reused; do not photograph or share the code.';
  if (horizontal) {
    doc.text(instr, textBox.x, Math.max(cursorY + 2, textBox.y + textBox.h - instrSize * 4.2), { width: textBox.w, height: instrSize * 4.4, ellipsis: true });
  } else {
    doc.text(instr, innerX, drawn.y + drawn.h + 3 + serialSize + 3, { width: innerW, align: 'center', height: instrSize * 3.4, ellipsis: true });
  }

  if (opts.event.organizerLabel) {
    doc.font('Helvetica-Oblique').fontSize(Math.max(6, small * 0.8)).fillColor(muted);
    doc.text(`Organised by ${opts.event.organizerLabel}`, innerX, innerY + innerH - 9, { width: innerW, align: 'center', lineBreak: false, ellipsis: true });
  }
}

function drawCodesOnlyCell(
  doc: PDFKit.PDFDocument,
  box: { x: number; y: number; w: number; h: number },
  t: PrintTicket,
  opts: PrintOptions,
  geometry: CodeGeometry,
) {
  const margin = Math.min(box.w, box.h) * 0.08;
  const labelH = opts.showSerial ? 10 : 0;
  const drawn = drawCode(doc, geometry, box.x + margin, box.y + margin, box.w - margin * 2, box.h - margin * 2 - labelH);
  if (opts.showSerial) {
    const size = fitText(doc, t.serial, drawn.w + 10, 7, 4.5, 'Courier');
    doc.font('Courier').fontSize(size).fillColor('#374151');
    doc.text(t.serial, drawn.x - 5, drawn.y + drawn.h + 2, { width: drawn.w + 10, align: 'center', lineBreak: false });
  }
}

export async function renderTicketsPdf(opts: PrintOptions): Promise<Buffer> {
  if (!isValidLayout(opts.design, opts.ticketsPerPage)) {
    throw new Error(`Unsupported layout ${opts.ticketsPerPage}/page for ${opts.design}`);
  }
  const grid = GRID[opts.ticketsPerPage];
  const margin = opts.design === 'BRANDED' ? 18 : 24;
  const cellW = (A4.w - margin * 2) / grid.cols;
  const cellH = (A4.h - margin * 2) / grid.rows;

  const doc = new PDFDocument({
    size: 'A4',
    margin: 0,
    autoFirstPage: false,
    info: { Title: `${opts.event.title} – tickets`, Producer: 'MyEvent', Creator: 'MyEvent' },
  });
  const chunks: Buffer[] = [];
  doc.on('data', (c: Buffer) => chunks.push(c));
  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });

  // Embed the logo ONCE per document and reuse the same image object on every card.
  let logoImage: unknown | null = null;
  const logoBuf = opts.design === 'BRANDED' ? loadLogo() : null;
  if (logoBuf) {
    try {
      logoImage = (doc as unknown as { openImage(b: Buffer): unknown }).openImage(logoBuf);
    } catch {
      logoImage = null;
    }
  }

  opts.tickets.forEach((t, i) => {
    const slot = i % opts.ticketsPerPage;
    if (slot === 0) doc.addPage({ size: 'A4', margin: 0 });
    const col = slot % grid.cols;
    const row = Math.floor(slot / grid.cols);
    const box = { x: margin + col * cellW, y: margin + row * cellH, w: cellW, h: cellH };
    const geometry = codeGeometry(t.token, opts.codeFormat);
    if (opts.design === 'BRANDED') drawBrandedCard(doc, box, t, opts, geometry, logoImage);
    else drawCodesOnlyCell(doc, box, t, opts, geometry);
  });

  if (opts.tickets.length === 0) doc.addPage({ size: 'A4', margin: 0 });
  doc.end();
  return done;
}

/** Layout preview with sample (non-redeemable) codes — used by the organizer UI preview. */
export async function renderPreviewPdf(opts: Omit<PrintOptions, 'tickets'>): Promise<Buffer> {
  const sample: PrintTicket[] = Array.from({ length: opts.ticketsPerPage }, (_, i) => ({
    serial: `SAMPLE-${String(i + 1).padStart(6, '0')}`,
    token: `MYT-SAMPLE${String(i + 1).padStart(2, '0')}PREVIEWONLY0000`,
  }));
  return renderTicketsPdf({ ...opts, tickets: sample });
}
