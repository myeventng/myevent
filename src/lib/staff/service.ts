// Organizer-scoped staff management. Membership never touches User.role / User.subRole:
// authority comes only from OrganizerStaff rows, checked in the DB on every request.

import { createHash, randomBytes } from 'node:crypto';
import { prisma } from '@/lib/prisma';
import type { Prisma, PrismaClient, StaffPermission, StaffRole } from '@/generated/prisma';
import { normalizePermissions } from '@/lib/staff/permissions';

type Db = PrismaClient | Prisma.TransactionClient;

export const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export class StaffError extends Error {
  constructor(message: string, public code: 'FORBIDDEN' | 'NOT_FOUND' | 'CONFLICT' | 'INVALID' | 'EXPIRED' = 'INVALID') {
    super(message);
    this.name = 'StaffError';
  }
}

export interface Actor {
  id: string;
  role: 'ADMIN' | 'USER' | string;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const normalizeEmail = (e: string) => e.trim().toLowerCase();
export const hashInviteToken = (t: string) => createHash('sha256').update(t).digest('hex');
const newToken = () => randomBytes(32).toString('base64url');

function assertManagesOrganizer(actor: Actor, organizerId: string) {
  if (actor.role !== 'ADMIN' && actor.id !== organizerId) throw new StaffError('Only the organizer can manage their staff', 'FORBIDDEN');
}

async function validateEventAssignment(db: Db, organizerId: string, eventIds: string[]) {
  const unique = [...new Set(eventIds)];
  if (unique.length === 0) return unique;
  const owned = await db.event.count({ where: { id: { in: unique }, userId: organizerId } });
  if (owned !== unique.length) throw new StaffError('You can only assign your own events', 'INVALID');
  return unique;
}

export interface InviteInput {
  organizerId: string;
  email: string;
  role: StaffRole;
  permissions?: StaffPermission[];
  allEvents: boolean;
  eventIds?: string[];
}

export async function inviteStaff(actor: Actor, input: InviteInput, db: PrismaClient = prisma, now = new Date()) {
  assertManagesOrganizer(actor, input.organizerId);
  const email = normalizeEmail(input.email);
  if (!EMAIL.test(email)) throw new StaffError('Enter a valid email address');
  if (!input.allEvents && (input.eventIds ?? []).length === 0) throw new StaffError('Assign at least one event, or choose all events');

  const organizer = await db.user.findUnique({ where: { id: input.organizerId }, select: { email: true } });
  if (!organizer) throw new StaffError('Organizer not found', 'NOT_FOUND');
  if (normalizeEmail(organizer.email) === email) throw new StaffError('You cannot invite yourself');

  return db.$transaction(async (tx) => {
    const eventIds = input.allEvents ? [] : await validateEventAssignment(tx, input.organizerId, input.eventIds ?? []);
    const existing = await tx.organizerStaff.findUnique({ where: { organizerId_email: { organizerId: input.organizerId, email } } });
    if (existing && existing.status !== 'REVOKED') {
      throw new StaffError(existing.status === 'ACTIVE' ? 'This person is already on your team' : 'An invitation is already pending — resend it instead', 'CONFLICT');
    }
    const token = newToken();
    const data = {
      role: input.role,
      permissions: normalizePermissions(input.role, input.permissions),
      allEvents: input.allEvents,
      status: 'PENDING' as const,
      inviteTokenHash: hashInviteToken(token),
      inviteExpiresAt: new Date(now.getTime() + INVITE_TTL_MS),
      invitedById: actor.id,
      invitedAt: now,
      lastInvitedAt: now,
      userId: null,
      acceptedAt: null,
      revokedAt: null,
    };
    const row = existing
      ? await tx.organizerStaff.update({ where: { id: existing.id }, data })
      : await tx.organizerStaff.create({ data: { organizerId: input.organizerId, email, ...data } });
    await tx.organizerStaffEvent.deleteMany({ where: { staffId: row.id } });
    if (eventIds.length) await tx.organizerStaffEvent.createMany({ data: eventIds.map((eventId) => ({ staffId: row.id, eventId })) });
    return { staff: row, token };
  });
}

export async function resendInvite(actor: Actor, staffId: string, db: PrismaClient = prisma, now = new Date()) {
  const row = await db.organizerStaff.findUnique({ where: { id: staffId } });
  if (!row) throw new StaffError('Invitation not found', 'NOT_FOUND');
  assertManagesOrganizer(actor, row.organizerId);
  if (row.status !== 'PENDING') throw new StaffError('Only pending invitations can be resent', 'CONFLICT');
  const token = newToken();
  const staff = await db.organizerStaff.update({
    where: { id: staffId },
    data: { inviteTokenHash: hashInviteToken(token), inviteExpiresAt: new Date(now.getTime() + INVITE_TTL_MS), lastInvitedAt: now },
  });
  return { staff, token };
}

export async function acceptInvite(user: { id: string; email: string }, token: string, db: PrismaClient = prisma, now = new Date()) {
  if (!token || token.length > 200) throw new StaffError('Invalid invitation', 'NOT_FOUND');
  const row = await db.organizerStaff.findUnique({ where: { inviteTokenHash: hashInviteToken(token) } });
  if (!row || row.status !== 'PENDING') throw new StaffError('This invitation is no longer valid', 'NOT_FOUND');
  if (!row.inviteExpiresAt || row.inviteExpiresAt <= now) throw new StaffError('This invitation has expired — ask the organizer to resend it', 'EXPIRED');
  if (normalizeEmail(user.email) !== row.email) {
    throw new StaffError(`This invitation was sent to a different email address. Sign in as ${row.email}.`, 'FORBIDDEN');
  }
  if (row.organizerId === user.id) throw new StaffError('You cannot join your own team');
  // Conditional update → a token can be redeemed exactly once, even under concurrency.
  const r = await db.organizerStaff.updateMany({
    where: { id: row.id, status: 'PENDING', inviteTokenHash: row.inviteTokenHash },
    data: { status: 'ACTIVE', userId: user.id, acceptedAt: now, inviteTokenHash: null, inviteExpiresAt: null },
  });
  if (r.count !== 1) throw new StaffError('This invitation is no longer valid', 'NOT_FOUND');
  return { organizerId: row.organizerId, staffId: row.id };
}

export async function updateStaff(
  actor: Actor,
  staffId: string,
  patch: { role?: StaffRole; permissions?: StaffPermission[]; allEvents?: boolean; eventIds?: string[] },
  db: PrismaClient = prisma,
) {
  const row = await db.organizerStaff.findUnique({ where: { id: staffId } });
  if (!row) throw new StaffError('Staff member not found', 'NOT_FOUND');
  assertManagesOrganizer(actor, row.organizerId);
  if (row.status === 'REVOKED') throw new StaffError('This access was revoked; invite them again', 'CONFLICT');
  const role = patch.role ?? row.role;
  const allEvents = patch.allEvents ?? row.allEvents;
  return db.$transaction(async (tx) => {
    const permissions = normalizePermissions(role, patch.permissions ?? (patch.role ? undefined : row.permissions));
    let eventIds: string[] | null = null;
    if (!allEvents) {
      const ids = patch.eventIds ?? (await tx.organizerStaffEvent.findMany({ where: { staffId }, select: { eventId: true } })).map((e) => e.eventId);
      if (ids.length === 0) throw new StaffError('Assign at least one event, or choose all events');
      eventIds = await validateEventAssignment(tx, row.organizerId, ids);
    }
    const updated = await tx.organizerStaff.update({ where: { id: staffId }, data: { role, permissions, allEvents } });
    await tx.organizerStaffEvent.deleteMany({ where: { staffId } });
    if (eventIds?.length) await tx.organizerStaffEvent.createMany({ data: eventIds.map((eventId) => ({ staffId, eventId })) });
    return updated;
  });
}

/** Revoke keeps the row (audit/history) but access stops immediately. */
export async function revokeStaff(actor: Actor, staffId: string, db: PrismaClient = prisma, now = new Date()) {
  const row = await db.organizerStaff.findUnique({ where: { id: staffId } });
  if (!row) throw new StaffError('Staff member not found', 'NOT_FOUND');
  assertManagesOrganizer(actor, row.organizerId);
  return db.organizerStaff.update({ where: { id: staffId }, data: { status: 'REVOKED', revokedAt: now, inviteTokenHash: null, inviteExpiresAt: null } });
}

export async function removeStaff(actor: Actor, staffId: string, db: PrismaClient = prisma) {
  const row = await db.organizerStaff.findUnique({ where: { id: staffId } });
  if (!row) throw new StaffError('Staff member not found', 'NOT_FOUND');
  assertManagesOrganizer(actor, row.organizerId);
  await db.organizerStaff.delete({ where: { id: staffId } });
}

export async function listStaff(actor: Actor, organizerId: string, db: PrismaClient = prisma) {
  assertManagesOrganizer(actor, organizerId);
  return db.organizerStaff.findMany({
    where: { organizerId },
    orderBy: { createdAt: 'desc' },
    include: { user: { select: { name: true, image: true } }, events: { select: { eventId: true, event: { select: { title: true } } } } },
  });
}
