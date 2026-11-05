import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '@/lib/prisma';
import { makeEvent, makeOrganizer, makeUser, resetDb, resetVenueCache } from './helpers/db';
import { validateScan } from '@/lib/scanner/validate';
import { signScanSession } from '@/lib/scanner/session';
import { deriveToken, hashToken, serialFor } from '@/lib/ticket-generation/token';
import { ROLE_DEFAULT_PERMISSIONS } from '@/lib/staff/permissions';

let org: Awaited<ReturnType<typeof makeOrganizer>>;
let other: Awaited<ReturnType<typeof makeOrganizer>>;
let ev: Awaited<ReturnType<typeof makeEvent>>;
let otherEv: Awaited<ReturnType<typeof makeEvent>>;

const actor = (u: { id: string }, role: 'USER' | 'ADMIN' = 'USER') => ({ id: u.id, role });
const sess = (u: { id: string }, eventId: string, ch: 'CAMERA' | 'KEYBOARD' = 'CAMERA') => signScanSession(u.id, eventId, ch).token;
const scan = (u: { id: string }, eventId: string, code: string, ch: 'CAMERA' | 'KEYBOARD' = 'CAMERA') =>
  validateScan({ actor: actor(u), eventId, code, sessionToken: sess(u, eventId, ch) });

async function digital(eventId: string, ticketTypeId: string, id = `T-${Math.random().toString(36).slice(2, 10)}`) {
  return prisma.ticket.create({ data: { ticketId: id, ticketTypeId, status: 'UNUSED', userId: null } });
}
async function physical(batchId: string | null, idx: number, ticketTypeId: string) {
  const bid = batchId ?? 'batch-x';
  return { token: deriveToken(bid, idx), row: await prisma.ticket.create({ data: { ticketId: serialFor(bid, idx), tokenHash: hashToken(deriveToken(bid, idx)), ticketTypeId, source: 'ORGANIZER_PHYSICAL', status: 'UNUSED' } }) };
}

beforeEach(async () => {
  process.env.TICKET_TOKEN_SECRET = 'test-secret-test-secret-123456';
  await resetDb();
  resetVenueCache();
  org = await makeOrganizer('Org');
  other = await makeOrganizer('Other');
  ev = await makeEvent(org, { startsInHours: 0.25 });
  otherEv = await makeEvent(other, { startsInHours: 0.25 });
});

describe('ticket check-in (Postgres)', () => {
  it('valid scan admits once; second scan is ALREADY_USED with first-scan info', async () => {
    const t = await digital(ev.event.id, ev.ticketType.id);
    const a = await scan(org, ev.event.id, t.ticketId);
    expect(a).toMatchObject({ success: true, outcome: 'VALID' });
    const b = await scan(org, ev.event.id, t.ticketId);
    expect(b).toMatchObject({ success: false, outcome: 'ALREADY_USED' });
    expect(b.firstScan?.at).toBeTruthy();
    expect(await prisma.ticketValidation.count({ where: { ticketId: t.id } })).toBe(1);
  });

  it('concurrent scans of the same ticket: exactly one succeeds', async () => {
    const t = await digital(ev.event.id, ev.ticketType.id);
    const results = await Promise.all(Array.from({ length: 10 }, () => scan(org, ev.event.id, t.ticketId)));
    expect(results.filter((r) => r.outcome === 'VALID')).toHaveLength(1);
    expect(results.filter((r) => r.outcome === 'ALREADY_USED')).toHaveLength(9);
    expect(await prisma.ticketValidation.count({ where: { ticketId: t.id } })).toBe(1);
  });

  it('physical tickets are found by opaque token; the serial alone is not the secret', async () => {
    const p = await physical(null, 1, ev.ticketType.id);
    expect(await scan(org, ev.event.id, p.token)).toMatchObject({ outcome: 'VALID' });
    expect(await scan(org, ev.event.id, p.token)).toMatchObject({ outcome: 'ALREADY_USED' });
  });

  it('invalid and wrong-event codes are rejected without marking anything', async () => {
    expect(await scan(org, ev.event.id, 'nope')).toMatchObject({ outcome: 'INVALID' });
    const t = await digital(otherEv.event.id, otherEv.ticketType.id);
    expect(await scan(org, ev.event.id, t.ticketId)).toMatchObject({ outcome: 'WRONG_EVENT' });
    expect((await prisma.ticket.findUniqueOrThrow({ where: { id: t.id } })).status).toBe('UNUSED');
  });

  it('cancelled tickets are refused', async () => {
    const t = await digital(ev.event.id, ev.ticketType.id);
    await prisma.ticket.update({ where: { id: t.id }, data: { status: 'CANCELLED' } });
    expect(await scan(org, ev.event.id, t.ticketId)).toMatchObject({ outcome: 'CANCELLED' });
  });

  it('outside the entry window is refused', async () => {
    const late = await makeEvent(org, { startsInHours: 48 });
    const t = await digital(late.event.id, late.ticketType.id);
    expect(await scan(org, late.event.id, t.ticketId)).toMatchObject({ outcome: 'NOT_STARTED' });
  });

  it('an unrelated user, or another organizer, cannot scan', async () => {
    const t = await digital(ev.event.id, ev.ticketType.id);
    const rando = await makeUser({});
    expect(await scan(rando, ev.event.id, t.ticketId)).toMatchObject({ outcome: 'FORBIDDEN' });
    expect(await scan(other, ev.event.id, t.ticketId)).toMatchObject({ outcome: 'FORBIDDEN' });
  });

  it('a missing, forged, expired or other-user session is rejected', async () => {
    const t = await digital(ev.event.id, ev.ticketType.id);
    const base = { actor: actor(org), eventId: ev.event.id, code: t.ticketId };
    expect(await validateScan({ ...base, sessionToken: 'x.y' })).toMatchObject({ outcome: 'BAD_SESSION' });
    const tokenOfOther = signScanSession(other.id, ev.event.id, 'CAMERA').token;
    expect(await validateScan({ ...base, sessionToken: tokenOfOther })).toMatchObject({ outcome: 'BAD_SESSION' });
    const expired = signScanSession(org.id, ev.event.id, 'CAMERA', Date.now() - 3_600_000).token;
    expect(await validateScan({ ...base, sessionToken: expired })).toMatchObject({ outcome: 'BAD_SESSION' });
  });

  it('INBUILT_ONLY rejects keyboard/hardware channel server-side; UNIVERSAL (and default) accept both', async () => {
    const t1 = await digital(ev.event.id, ev.ticketType.id);
    expect((await scan(org, ev.event.id, t1.ticketId, 'KEYBOARD')).outcome).toBe('VALID'); // default UNIVERSAL
    await prisma.eventScannerSettings.create({ data: { eventId: ev.event.id, mode: 'INBUILT_ONLY' } });
    const t2 = await digital(ev.event.id, ev.ticketType.id);
    expect(await scan(org, ev.event.id, t2.ticketId, 'KEYBOARD')).toMatchObject({ outcome: 'CHANNEL_NOT_ALLOWED' });
    expect((await prisma.ticket.findUniqueOrThrow({ where: { id: t2.id } })).status).toBe('UNUSED');
    expect((await scan(org, ev.event.id, t2.ticketId, 'CAMERA')).outcome).toBe('VALID');
  });

  it('staff: Scanner can scan their assigned event only; revocation is immediate; Manager/other-organizer staff behave', async () => {
    const staffUser = await makeUser({});
    const m = await prisma.organizerStaff.create({
      data: { organizerId: org.id, userId: staffUser.id, email: 's@x.test', role: 'SCANNER', permissions: [...ROLE_DEFAULT_PERMISSIONS.SCANNER], allEvents: false, status: 'ACTIVE', events: { create: [{ eventId: ev.event.id }] } },
    });
    const second = await makeEvent(org, { startsInHours: 0.25 });
    const t = await digital(ev.event.id, ev.ticketType.id);
    const t2 = await digital(second.event.id, second.ticketType.id);
    expect((await scan(staffUser, ev.event.id, t.ticketId)).outcome).toBe('VALID');
    expect((await scan(staffUser, second.event.id, t2.ticketId)).outcome).toBe('FORBIDDEN'); // not assigned
    await prisma.organizerStaff.update({ where: { id: m.id }, data: { status: 'REVOKED', revokedAt: new Date() } });
    const t3 = await digital(ev.event.id, ev.ticketType.id);
    expect((await scan(staffUser, ev.event.id, t3.ticketId)).outcome).toBe('FORBIDDEN'); // takes effect immediately
    // staff of ANOTHER organizer gets nothing here
    const foreign = await makeUser({});
    await prisma.organizerStaff.create({ data: { organizerId: other.id, userId: foreign.id, email: 'f@x.test', role: 'SCANNER', permissions: [...ROLE_DEFAULT_PERMISSIONS.SCANNER], allEvents: true, status: 'ACTIVE' } });
    expect((await scan(foreign, ev.event.id, t3.ticketId)).outcome).toBe('FORBIDDEN');
  });
});
