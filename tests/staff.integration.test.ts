import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '@/lib/prisma';
import { makeEvent, makeOrganizer, makeUser, resetDb, resetVenueCache } from './helpers/db';
import { acceptInvite, inviteStaff, removeStaff, resendInvite, revokeStaff, updateStaff, StaffError, INVITE_TTL_MS } from '@/lib/staff/service';
import { can, requireEventOwnerOrAdmin, requireEventPermission, resolveEventAccess } from '@/lib/staff/access';

let org: Awaited<ReturnType<typeof makeOrganizer>>;
let other: Awaited<ReturnType<typeof makeOrganizer>>;
let ev1: Awaited<ReturnType<typeof makeEvent>>;
let ev2: Awaited<ReturnType<typeof makeEvent>>;
let otherEv: Awaited<ReturnType<typeof makeEvent>>;
const A = (u: { id: string }) => ({ id: u.id, role: 'USER' });

beforeEach(async () => {
  await resetDb();
  resetVenueCache();
  org = await makeOrganizer('Org');
  other = await makeOrganizer('Other');
  ev1 = await makeEvent(org);
  ev2 = await makeEvent(org);
  otherEv = await makeEvent(other);
});

async function joinedStaff(role: 'MANAGER' | 'SCANNER', opts: { allEvents?: boolean; eventIds?: string[] } = {}) {
  const person = await makeUser({ email: `p${Math.random().toString(36).slice(2, 8)}@x.test` });
  const { token } = await inviteStaff(A(org), { organizerId: org.id, email: person.email, role, allEvents: opts.allEvents ?? true, eventIds: opts.eventIds });
  const { staffId } = await acceptInvite(person, token);
  return { person, staffId };
}

describe('organizer staff (Postgres)', () => {
  it('invite → accept activates membership and NEVER changes the user\'s platform role', async () => {
    const person = await makeUser({ email: 'Scanner@Example.com' });
    const before = await prisma.user.findUniqueOrThrow({ where: { id: person.id } });
    const { token, staff } = await inviteStaff(A(org), { organizerId: org.id, email: ' scanner@example.COM ', role: 'SCANNER', allEvents: true });
    expect(staff.email).toBe('scanner@example.com');
    expect(staff.status).toBe('PENDING');
    expect(staff.inviteTokenHash).not.toBe(token); // only a hash is stored
    await acceptInvite(person, token);
    const after = await prisma.user.findUniqueOrThrow({ where: { id: person.id } });
    expect(after.role).toBe(before.role);
    expect(after.subRole).toBe(before.subRole);
    expect((await prisma.organizerStaff.findUniqueOrThrow({ where: { id: staff.id } })).status).toBe('ACTIVE');
  });

  it('token is single-use, tied to the invited email, and expires', async () => {
    const person = await makeUser({ email: 'a@x.test' });
    const stranger = await makeUser({ email: 'b@x.test' });
    const { token } = await inviteStaff(A(org), { organizerId: org.id, email: 'a@x.test', role: 'SCANNER', allEvents: true });
    await expect(acceptInvite(stranger, token)).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await acceptInvite(person, token);
    await expect(acceptInvite(person, token)).rejects.toBeInstanceOf(StaffError);
    const { token: t2 } = await inviteStaff(A(org), { organizerId: org.id, email: 'c@x.test', role: 'SCANNER', allEvents: true }, prisma, new Date(Date.now() - INVITE_TTL_MS - 1000));
    const c = await makeUser({ email: 'c@x.test' });
    await expect(acceptInvite(c, t2)).rejects.toMatchObject({ code: 'EXPIRED' });
  });

  it('concurrent redemption of one token activates exactly once', async () => {
    const person = await makeUser({ email: 'z@x.test' });
    const { token } = await inviteStaff(A(org), { organizerId: org.id, email: 'z@x.test', role: 'SCANNER', allEvents: true });
    const res = await Promise.allSettled(Array.from({ length: 6 }, () => acceptInvite(person, token)));
    expect(res.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
  });

  it('resend rotates the token (old link dies); duplicates and self-invites are rejected', async () => {
    const person = await makeUser({ email: 'r@x.test' });
    const { token: t1, staff } = await inviteStaff(A(org), { organizerId: org.id, email: 'r@x.test', role: 'SCANNER', allEvents: true });
    await expect(inviteStaff(A(org), { organizerId: org.id, email: 'r@x.test', role: 'SCANNER', allEvents: true })).rejects.toMatchObject({ code: 'CONFLICT' });
    const { token: t2 } = await resendInvite(A(org), staff.id);
    expect(t2).not.toBe(t1);
    await expect(acceptInvite(person, t1)).rejects.toBeInstanceOf(StaffError);
    await acceptInvite(person, t2);
    await expect(inviteStaff(A(org), { organizerId: org.id, email: org.email, role: 'SCANNER', allEvents: true })).rejects.toBeInstanceOf(StaffError);
  });

  it('only the organizer (or an admin) can manage the team; no cross-organizer assignment', async () => {
    await expect(inviteStaff(A(other), { organizerId: org.id, email: 'x@x.test', role: 'SCANNER', allEvents: true })).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await expect(inviteStaff(A(org), { organizerId: org.id, email: 'x@x.test', role: 'SCANNER', allEvents: false, eventIds: [otherEv.event.id] })).rejects.toMatchObject({ code: 'INVALID' });
    await expect(inviteStaff(A(org), { organizerId: org.id, email: 'x@x.test', role: 'SCANNER', allEvents: false, eventIds: [] })).rejects.toBeInstanceOf(StaffError);
    const { staff } = await inviteStaff(A(org), { organizerId: org.id, email: 'y@x.test', role: 'SCANNER', allEvents: true });
    await expect(revokeStaff(A(other), staff.id)).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await expect(inviteStaff({ id: 'admin', role: 'ADMIN' }, { organizerId: org.id, email: 'w@x.test', role: 'SCANNER', allEvents: true })).resolves.toBeTruthy();
  });

  it('per-event assignment limits access; all-events covers new events; other organizer unaffected', async () => {
    const { person } = await joinedStaff('SCANNER', { allEvents: false, eventIds: [ev1.event.id] });
    expect(can(await resolveEventAccess(A(person), ev1.event.id), 'SCAN_TICKETS')).toBe(true);
    expect(await resolveEventAccess(A(person), ev2.event.id)).toBeNull();
    expect(await resolveEventAccess(A(person), otherEv.event.id)).toBeNull();
    const { person: all } = await joinedStaff('SCANNER');
    const later = await makeEvent(org);
    expect(can(await resolveEventAccess(A(all), later.event.id), 'SCAN_TICKETS')).toBe(true);
    expect(await resolveEventAccess(A(all), otherEv.event.id)).toBeNull();
  });

  it('role limits: scanners cannot get manage/analytics/generate; staff are never owner/admin', async () => {
    const { person, staffId } = await joinedStaff('SCANNER');
    const row = await updateStaff(A(org), staffId, { permissions: ['SCAN_TICKETS', 'MANAGE_EVENTS', 'GENERATE_TICKETS', 'VIEW_ANALYTICS'] });
    expect([...row.permissions].sort()).toEqual(['SCAN_TICKETS', 'VIEW_EVENTS']);
    await expect(requireEventOwnerOrAdmin(A(person), ev1.event.id)).rejects.toThrow();
    await expect(requireEventPermission(A(person), ev1.event.id, 'GENERATE_TICKETS')).rejects.toThrow();
    const m = await joinedStaff('MANAGER');
    await expect(requireEventPermission(A(m.person), ev1.event.id, 'MANAGE_EVENTS')).resolves.toBeTruthy();
    await expect(requireEventOwnerOrAdmin(A(m.person), ev1.event.id)).rejects.toThrow(); // financial/staff/commission stay owner-only
  });

  it('revoke is immediate and keeps history; remove deletes; re-invite after revoke works', async () => {
    const { person, staffId } = await joinedStaff('MANAGER');
    expect(await resolveEventAccess(A(person), ev1.event.id)).not.toBeNull();
    await revokeStaff(A(org), staffId);
    expect(await resolveEventAccess(A(person), ev1.event.id)).toBeNull();
    expect((await prisma.organizerStaff.findUniqueOrThrow({ where: { id: staffId } })).status).toBe('REVOKED');
    const { token } = await inviteStaff(A(org), { organizerId: org.id, email: person.email, role: 'SCANNER', allEvents: true });
    await acceptInvite(person, token);
    expect(await resolveEventAccess(A(person), ev1.event.id)).not.toBeNull();
    await removeStaff(A(org), staffId);
    expect(await resolveEventAccess(A(person), ev1.event.id)).toBeNull();
  });
});
