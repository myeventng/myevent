// Opaque, unpredictable ticket tokens for physical tickets.
//
// token = "MYT-" + base32(HMAC-SHA256(secret, batchId ":" index))[0..24)
//
// • 120 bits of entropy per token, unguessable without the server secret.
// • Nothing about the event, ticket or sequence is encoded in the QR/barcode.
// • Deterministic per (batch, index): a batch can be re-rendered (retry,
//   resume, re-download) without ever persisting the raw token. Only the
//   SHA-256 hash of the token is stored in the database (Ticket.tokenHash).
// • A DB unique constraint on tokenHash is the final duplicate guard.

import { createHash, createHmac } from 'node:crypto';

const CROCKFORD = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
export const TOKEN_PREFIX = 'MYT-';
const TOKEN_CHARS = 24;

function getSecret(): string {
  const secret = process.env.TICKET_TOKEN_SECRET || process.env.BETTER_AUTH_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      'TICKET_TOKEN_SECRET (or BETTER_AUTH_SECRET) must be set to a long random value to generate physical tickets',
    );
  }
  return secret;
}

function base32(bytes: Uint8Array, chars: number): string {
  let bits = 0;
  let value = 0;
  let out = '';
  for (const b of bytes) {
    value = (value << 8) | b;
    bits += 8;
    while (bits >= 5 && out.length < chars) {
      out += CROCKFORD[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
    if (out.length >= chars) break;
  }
  return out;
}

export function deriveToken(batchId: string, index: number, secret: string = getSecret()): string {
  const mac = createHmac('sha256', secret).update(`${batchId}:${index}`).digest();
  return TOKEN_PREFIX + base32(mac, TOKEN_CHARS);
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token.trim().toUpperCase()).digest('hex');
}

export function looksLikePhysicalToken(value: string): boolean {
  return new RegExp(`^${TOKEN_PREFIX}[0-9A-HJKMNP-TV-Z]{${TOKEN_CHARS}}$`, 'i').test(value.trim());
}

/** Human-readable ticket number printed on the ticket and stored as Ticket.ticketId. */
export function serialFor(batchId: string, index: number): string {
  const batchPart = createHash('sha256').update(batchId).digest('hex').slice(0, 8).toUpperCase();
  return `PT-${batchPart}-${String(index + 1).padStart(6, '0')}`;
}
