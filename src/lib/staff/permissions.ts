// Pure, client-safe staff role/permission definitions.
//
// Staff permissions are intentionally a CLOSED set. Financial, payout,
// commission, ownership, staff-management and platform-admin capabilities do
// not exist in this enum, so they cannot be granted to staff by any role,
// custom permission set or API payload. Those paths are owner/admin-only.

import type { StaffPermission, StaffRole } from '@/generated/prisma';

export const ALL_STAFF_PERMISSIONS: StaffPermission[] = [
  'VIEW_EVENTS',
  'MANAGE_EVENTS',
  'VIEW_ANALYTICS',
  'MANAGE_TICKETS',
  'SCAN_TICKETS',
  'VIEW_CHECKIN_STATS',
  'GENERATE_TICKETS',
];

export const ROLE_DEFAULT_PERMISSIONS: Record<StaffRole, StaffPermission[]> = {
  MANAGER: [
    'VIEW_EVENTS',
    'MANAGE_EVENTS',
    'VIEW_ANALYTICS',
    'MANAGE_TICKETS',
    'SCAN_TICKETS',
    'VIEW_CHECKIN_STATS',
  ],
  SCANNER: ['VIEW_EVENTS', 'SCAN_TICKETS', 'VIEW_CHECKIN_STATS'],
};

/** Permissions an organizer may toggle on top of / within a role. */
export const ROLE_ALLOWED_PERMISSIONS: Record<StaffRole, StaffPermission[]> = {
  MANAGER: ALL_STAFF_PERMISSIONS,
  // A scanner can never manage events or see analytics, even if a client asks.
  SCANNER: ['VIEW_EVENTS', 'SCAN_TICKETS', 'VIEW_CHECKIN_STATS'],
};

export const PERMISSION_LABELS: Record<StaffPermission, string> = {
  VIEW_EVENTS: 'View assigned events',
  MANAGE_EVENTS: 'Edit event details',
  VIEW_ANALYTICS: 'View event analytics',
  MANAGE_TICKETS: 'Manage ticket information',
  SCAN_TICKETS: 'Scan / check in tickets',
  VIEW_CHECKIN_STATS: 'View check-in statistics',
  GENERATE_TICKETS: 'Generate physical tickets (paid service)',
};

export const ROLE_LABELS: Record<StaffRole, string> = {
  MANAGER: 'Organizer Manager',
  SCANNER: 'Ticket Scanner',
};

/** Clamp requested permissions to what the role allows; falls back to role defaults. */
export function normalizePermissions(
  role: StaffRole,
  requested?: StaffPermission[] | null,
): StaffPermission[] {
  const allowed = new Set(ROLE_ALLOWED_PERMISSIONS[role]);
  const base = requested && requested.length > 0 ? requested : ROLE_DEFAULT_PERMISSIONS[role];
  const cleaned = Array.from(new Set(base.filter((p) => allowed.has(p))));
  // Every staff member can at least see the events they are assigned to.
  if (!cleaned.includes('VIEW_EVENTS')) cleaned.unshift('VIEW_EVENTS');
  return cleaned;
}
