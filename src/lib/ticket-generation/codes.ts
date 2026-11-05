// Vector code geometry shared by the PDF and SVG renderers.
// QR: module matrix from `qrcode`. Barcode: Code 128 bar widths from `bwip-js`.

import QRCode from 'qrcode';
import bwipjs from 'bwip-js';
import type { TicketCodeFormat } from '@/generated/prisma';

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface CodeGeometry {
  /** Total width/height in abstract units INCLUDING the quiet zone. */
  width: number;
  height: number;
  /** Dark rectangles in those units. */
  rects: Rect[];
}

const QR_QUIET = 4; // modules
const BARCODE_QUIET = 10; // modules (Code 128 requirement)
const BARCODE_HEIGHT_RATIO = 0.32; // bar height relative to total width

export function qrGeometry(text: string): CodeGeometry {
  const qr = QRCode.create(text, { errorCorrectionLevel: 'M' });
  const n = qr.modules.size;
  const data = qr.modules.data;
  const rects: Rect[] = [];
  for (let y = 0; y < n; y++) {
    let runStart = -1;
    for (let x = 0; x <= n; x++) {
      const dark = x < n && data[y * n + x] === 1;
      if (dark && runStart < 0) runStart = x;
      if (!dark && runStart >= 0) {
        rects.push({ x: runStart + QR_QUIET, y: y + QR_QUIET, w: x - runStart, h: 1 });
        runStart = -1;
      }
    }
  }
  const size = n + QR_QUIET * 2;
  return { width: size, height: size, rects };
}

export function barcodeGeometry(text: string): CodeGeometry {
  const raw = bwipjs.raw('code128', text, { includetext: false });
  const sbs: number[] = (raw as unknown as Array<{ sbs: number[] }>)[0].sbs;
  let x = BARCODE_QUIET;
  const rects: Rect[] = [];
  const total = sbs.reduce((a, b) => a + b, 0);
  const height = Math.round((total + BARCODE_QUIET * 2) * BARCODE_HEIGHT_RATIO);
  sbs.forEach((w, i) => {
    if (i % 2 === 0) rects.push({ x, y: 0, w, h: height });
    x += w;
  });
  return { width: total + BARCODE_QUIET * 2, height, rects };
}

export function codeGeometry(text: string, format: TicketCodeFormat): CodeGeometry {
  return format === 'QR' ? qrGeometry(text) : barcodeGeometry(text);
}

/** Standalone SVG (white background so it scans anywhere it is placed). */
export function codeToSvg(text: string, format: TicketCodeFormat, scale = 8): string {
  const g = codeGeometry(text, format);
  const body = g.rects
    .map((r) => `<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}"/>`)
    .join('');
  return (
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<svg xmlns="http://www.w3.org/2000/svg" width="${g.width * scale}" height="${g.height * scale}" viewBox="0 0 ${g.width} ${g.height}" shape-rendering="crispEdges">` +
    `<rect width="${g.width}" height="${g.height}" fill="#ffffff"/>` +
    `<g fill="#000000">${body}</g></svg>`
  );
}
