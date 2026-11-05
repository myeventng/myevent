// Channel-bound scan sessions.
//
// A scan session is a short-lived, HMAC-signed token binding
// (user, event, channel). validateTicket() refuses any scan that does not
// present a valid session whose channel is permitted by the event's CURRENT
// scanner mode, so the organizer's choice is enforced on the server — the UI
// merely reflects it. Permission (SCAN_TICKETS) is re-checked in the database
// on every scan, so revoking staff takes effect immediately.

import { createHmac, timingSafeEqual } from 'node:crypto';
import type { ScannerMode } from '@/generated/prisma';

export type ScanChannel = 'CAMERA' | 'KEYBOARD';
// CAMERA   = built-in camera scanner (smartphone / tablet / laptop webcam inside the inbuilt scanner page)
// KEYBOARD = web check-in desk: HID barcode scanners, handheld lasers, search & manual ticket entry

export const SCAN_SESSION_TTL_SECONDS = 15 * 60;

const ALLOWED_CHANNELS: Record<ScannerMode, ScanChannel[]> = {
  INBUILT_ONLY: ['CAMERA'],
  UNIVERSAL: ['CAMERA', 'KEYBOARD'],
};

export function channelAllowed(mode: ScannerMode, channel: ScanChannel): boolean {
  return ALLOWED_CHANNELS[mode].includes(channel);
}

interface Payload {
  u: string; // user id
  e: string; // event id
  c: ScanChannel;
  x: number; // expiry (unix seconds)
}

function secret(): string {
  const s = process.env.TICKET_TOKEN_SECRET || process.env.BETTER_AUTH_SECRET;
  if (!s || s.length < 16) throw new Error('TICKET_TOKEN_SECRET or BETTER_AUTH_SECRET must be configured');
  return s;
}

const b64u = (buf: Buffer) => buf.toString('base64url');

export function signScanSession(
  userId: string,
  eventId: string,
  channel: ScanChannel,
  nowMs: number = Date.now(),
  key: string = secret(),
): { token: string; expiresAt: number } {
  const payload: Payload = { u: userId, e: eventId, c: channel, x: Math.floor(nowMs / 1000) + SCAN_SESSION_TTL_SECONDS };
  const body = b64u(Buffer.from(JSON.stringify(payload)));
  const sig = b64u(createHmac('sha256', key).update(body).digest());
  return { token: `${body}.${sig}`, expiresAt: payload.x * 1000 };
}

export function verifyScanSession(
  token: string,
  expected: { userId: string; eventId: string },
  nowMs: number = Date.now(),
  key: string = secret(),
): { ok: true; channel: ScanChannel } | { ok: false; reason: string } {
  if (typeof token !== 'string' || !token.includes('.')) return { ok: false, reason: 'Invalid scanner session' };
  const [body, sig] = token.split('.');
  const good = createHmac('sha256', key).update(body).digest();
  let given: Buffer;
  try {
    given = Buffer.from(sig, 'base64url');
  } catch {
    return { ok: false, reason: 'Invalid scanner session' };
  }
  if (given.length !== good.length || !timingSafeEqual(given, good)) return { ok: false, reason: 'Invalid scanner session' };
  let payload: Payload;
  try {
    payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  } catch {
    return { ok: false, reason: 'Invalid scanner session' };
  }
  if (payload.u !== expected.userId || payload.e !== expected.eventId) {
    return { ok: false, reason: 'Scanner session does not belong to this user/event' };
  }
  if (payload.x * 1000 <= nowMs) return { ok: false, reason: 'Scanner session expired — reload the scanner' };
  return { ok: true, channel: payload.c };
}
