import { describe, expect, it } from 'vitest';
import { deriveToken, hashToken, looksLikePhysicalToken, serialFor } from '@/lib/ticket-generation/token';
import { channelAllowed, signScanSession, verifyScanSession } from '@/lib/scanner/session';

describe('physical ticket tokens', () => {
  it('are deterministic per (batch,index), unique across a large range, and well-formed', () => {
    const n = 20_000;
    const seen = new Set<string>();
    for (let i = 0; i < n; i++) {
      const tok = deriveToken('batchA', i);
      expect(looksLikePhysicalToken(tok)).toBe(true);
      seen.add(tok);
    }
    expect(seen.size).toBe(n);
    expect(deriveToken('batchA', 7)).toBe(deriveToken('batchA', 7));
    expect(deriveToken('batchA', 7)).not.toBe(deriveToken('batchB', 7));
  });
  it('do not leak the batch id, index or any event data', () => {
    const tok = deriveToken('clx9abc123batchid', 42);
    expect(tok).not.toContain('clx9abc123');
    expect(tok.toLowerCase()).not.toContain('42');
    expect(tok.length).toBe(4 + 24);
  });
  it('depend on the server secret', () => {
    expect(deriveToken('b', 1, 'secret-one-secret-one')).not.toBe(deriveToken('b', 1, 'secret-two-secret-two'));
  });
  it('hash is case-insensitive and one-way (64 hex chars)', () => {
    const tok = deriveToken('b', 1);
    expect(hashToken(tok)).toBe(hashToken(tok.toLowerCase()));
    expect(hashToken(tok)).toMatch(/^[0-9a-f]{64}$/);
  });
  it('serial numbers are sequential, zero-padded and batch-scoped', () => {
    expect(serialFor('b1', 0)).toMatch(/^PT-[0-9A-F]{8}-000001$/);
    expect(serialFor('b1', 499)).toMatch(/-000500$/);
    expect(serialFor('b1', 0)).not.toBe(serialFor('b2', 0));
  });
});

describe('scan sessions', () => {
  const key = 'k'.repeat(32);
  it('verifies a fresh session and rejects tampering, wrong user/event and expiry', () => {
    const { token } = signScanSession('u1', 'e1', 'CAMERA', 1_000_000, key);
    expect(verifyScanSession(token, { userId: 'u1', eventId: 'e1' }, 1_000_500, key)).toEqual({ ok: true, channel: 'CAMERA' });
    expect(verifyScanSession(token, { userId: 'u2', eventId: 'e1' }, 1_000_500, key).ok).toBe(false);
    expect(verifyScanSession(token, { userId: 'u1', eventId: 'e2' }, 1_000_500, key).ok).toBe(false);
    expect(verifyScanSession(token, { userId: 'u1', eventId: 'e1' }, 1_000_000 + 16 * 60_000, key).ok).toBe(false);
    const [body, sig] = token.split('.');
    const forged = Buffer.from(JSON.stringify({ u: 'u1', e: 'e1', c: 'KEYBOARD', x: 9_999_999_999 })).toString('base64url');
    expect(verifyScanSession(`${forged}.${sig}`, { userId: 'u1', eventId: 'e1' }, 1_000_500, key).ok).toBe(false);
    expect(verifyScanSession(`${body}.AAAA`, { userId: 'u1', eventId: 'e1' }, 1_000_500, key).ok).toBe(false);
    expect(verifyScanSession('garbage', { userId: 'u1', eventId: 'e1' }, 1_000_500, key).ok).toBe(false);
  });
  it('mode decides which channels exist', () => {
    expect(channelAllowed('INBUILT_ONLY', 'CAMERA')).toBe(true);
    expect(channelAllowed('INBUILT_ONLY', 'KEYBOARD')).toBe(false);
    expect(channelAllowed('UNIVERSAL', 'CAMERA')).toBe(true);
    expect(channelAllowed('UNIVERSAL', 'KEYBOARD')).toBe(true);
  });
});
