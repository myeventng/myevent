// Server-side organizer-scoped authorization.
//
// Every check validates, from the database on every call (so revocation is
// immediate): the authenticated user, the organizer relationship, the assigned
// role/permissions, the event ownership or assignment, and the requested
// permission. Hiding menu items is never relied upon.

import { prisma } from '@/lib/prisma';
import type { Prisma, PrismaClient, StaffPermission } from '@/generated/prisma';
import { ALL_STAFF_PERMISSIONS } from '@/lib/staff/permissions';

type Db = PrismaClient | Prisma.TransactionClient;

export type AccessVia = 'ADMIN' | 'OWNER' | 'STAFF';

export interface EventAccess {
  eventId: string;
  organizerId: string | null;
  via: AccessVia;
  staffId: string | null;
  permissions: ReadonlySet<StaffPermission>;
}

export interface ActorLike {
  id: string;
  role?: string | null;
}

/** Full-access marker for owners and platform admins. */
const FULL = new Set<StaffPermission>(ALL_STAFF_PERMISSIONS);

/**
 * Resolve what `actor` may do on `eventId`. Returns null when the event does
 * not exist or the actor has no relationship to it. Staff are only ever
 * granted access through an ACTIVE membership of the event's own organizer.
 */
export async function resolveEventAccess(
  actor: ActorLike,
  eventId: string,
  db: Db = prisma,
): Promise<EventAccess | null> {
  const event = await db.event.findUnique({
    where: { id: eventId },
    select: { id: true, userId: true },
  });
  if (!event) return null;

  if (actor.role === 'ADMIN') {
    return { eventId, organizerId: event.userId, via: 'ADMIN', staffId: null, permissions: FULL };
  }
  if (event.userId && event.userId === actor.id) {
    return { eventId, organizerId: event.userId, via: 'OWNER', staffId: null, permissions: FULL };
  }
  if (!event.userId) return null;

  const membership = await db.organizerStaff.findFirst({
    where: {
      organizerId: event.userId, // scoped to THIS event's organizer only
      userId: actor.id,
      status: 'ACTIVE',
      OR: [{ allEvents: true }, { events: { some: { eventId } } }],
    },
    select: { id: true, permissions: true },
  });
  if (!membership) return null;

  return {
    eventId,
    organizerId: event.userId,
    via: 'STAFF',
    staffId: membership.id,
    permissions: new Set(membership.permissions ?? []),
  };
}

export function can(access: EventAccess | null, permission: StaffPermission): boolean {
  return !!access && access.permissions.has(permission);
}

/** Owner or platform admin only (financials, payouts, commission, staff, ownership). */
export function isOwnerOrAdmin(access: EventAccess | null): boolean {
  return !!access && (access.via === 'OWNER' || access.via === 'ADMIN');
}

export class AccessDeniedError extends Error {
  constructor(message = 'You do not have permission to perform this action') {
    super(message);
    this.name = 'AccessDeniedError';
  }
}

export async function requireEventPermission(
  actor: ActorLike,
  eventId: string,
  permission: StaffPermission,
  db: Db = prisma,
): Promise<EventAccess> {
  const access = await resolveEventAccess(actor, eventId, db);
  if (!can(access, permission)) throw new AccessDeniedError();
  return access as EventAccess;
}

export async function requireEventOwnerOrAdmin(
  actor: ActorLike,
  eventId: string,
  db: Db = prisma,
): Promise<EventAccess> {
  const access = await resolveEventAccess(actor, eventId, db);
  if (!isOwnerOrAdmin(access)) throw new AccessDeniedError();
  return access as EventAccess;
}

/** Event ids a user can act on through staff memberships (owner events excluded). */
export async function listStaffEventIds(
  userId: string,
  permission: StaffPermission,
  db: Db = prisma,
): Promise<{ organizerId: string; eventIds: string[] }[]> {
  const memberships = await db.organizerStaff.findMany({
    where: { userId, status: 'ACTIVE', permissions: { has: permission } },
    select: { organizerId: true, allEvents: true, events: { select: { eventId: true } } },
  });
  const out: { organizerId: string; eventIds: string[] }[] = [];
  for (const m of memberships) {
    if (m.allEvents) {
      const evs = await db.event.findMany({ where: { userId: m.organizerId }, select: { id: true } });
      out.push({ organizerId: m.organizerId, eventIds: evs.map((e) => e.id) });
    } else {
      out.push({ organizerId: m.organizerId, eventIds: m.events.map((e) => e.eventId) });
    }
  }
  return out;
}
