import { describe, expect, it } from 'vitest';
import { codeToSvg } from '@/lib/ticket-generation/codes';

describe('codes-only SVG export (for graphic designers)', () => {
  const token = 'TKT-ABCDEF1234567890';
  for (const fmt of ['QR', 'BARCODE'] as const) {
    it(`${fmt}: standalone vector with no text, branding or raster images`, () => {
      const svg = codeToSvg(token, fmt);
      expect(svg.startsWith('<?xml') || svg.startsWith('<svg')).toBe(true);
      expect(svg).toContain('</svg>');
      expect(svg).not.toMatch(/<text|<image|myevent|logo/i);
    });
  }
  it('is deterministic for the same token and differs per token', () => {
    expect(codeToSvg(token, 'QR')).toBe(codeToSvg(token, 'QR'));
    expect(codeToSvg(token, 'QR')).not.toBe(codeToSvg(token + 'X', 'QR'));
  });
});
