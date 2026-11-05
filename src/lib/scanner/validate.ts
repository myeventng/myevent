// Server-side ticket check-in. Everything that decides entry lives here so it is
// enforced identically for the camera scanner, the web check-in desk, hardware
// scanners and manual entry — and so it can be tested against a real database.

import { prisma } from '@/lib/prisma';
import type { Prisma, PrismaClient, ScannerMode } from '@/generated/prisma';
import { can, resolveEventAccess, type ActorLike } from '@/lib/staff/access';
import { channelAllowed, verifyScanSession } from '@/lib/scanner/session';
import { hashToken, looksLikePhysicalToken } from '@/lib/ticket-generation/token';

type Db = PrismaClient | Prisma.TransactionClient;

export type ScanOutcome =
  | 'VALID'
  | 'ALREADY_USED'
  | 'INVALID'
  | 'WRONG_EVENT'
  | 'CANCELLED'
  | 'NOT_STARTED'
  | 'ENDED'
  | 'FORBIDDEN'
  | 'BAD_SESSION'
  | 'CHANNEL_NOT_ALLOWED';

export interface ScanResult {
  success: boolean;
  outcome: ScanOutcome;
  message: string;
  ticket?: {
    serial: string;
    typeName: string;
    source: 'ONLINE' | 'PHYSICAL' | string;
    holderName: string | null;
    usedAt: string | null;
  };
  /** Present for ALREADY_USED: when and by whom it was first checked in. */
  firstScan?: { at: string; by: string | null };
}

export interface ScanParams {
  actor: ActorLike;
  eventId: string;
  /** Scanned QR / barcode payload, or typed ticket number. */
  code: string;
  sessionToken: string;
  now?: Date;
  windows?: { earlyEntryHours: number; lateEntryHours: number };
  deviceInfo?: string | null;
  db?: PrismaClient;
}

export async function getScannerMode(eventId: string, db: Db = prisma): Promise<ScannerMode> {
  const s = await db.eventScannerSettings.findUnique({ where: { eventId }, select: { mode: true } });
  return s?.mode ?? 'UNIVERSAL';
}

const deny = (outcome: ScanOutcome, message: string): ScanResult => ({ success: false, outcome, message });

export async function validateScan(p: ScanParams): Promise<ScanResult> {
  const db = p.db ?? prisma;
  const now = p.now ?? new Date();
  const windows = p.windows ?? { earlyEntryHours: 1, lateEntryHours: 2 };

  // 1) Who is scanning? Re-checked in the database on every scan so revocation is immediate.
  const access = await resolveEventAccess(p.actor, p.eventId, db);
  if (!access || !can(access, 'SCAN_TICKETS')) return deny('FORBIDDEN', 'You do not have permission to scan tickets for this event');

  // 2) Signed scan session bound to (user, event, channel).
  const sess = verifyScanSession(p.sessionToken, { userId: p.actor.id, eventId: p.eventId }, now.getTime());
  if (!sess.ok) return deny('BAD_SESSION', sess.reason);

  // 3) The organizer's CURRENT scanner mode decides which channels are accepted.
  const mode = await getScannerMode(p.eventId, db);
  if (!channelAllowed(mode, sess.channel)) {
    return deny('CHANNEL_NOT_ALLOWED', 'This event only accepts scans from the in-built camera scanner.');
  }

  const code = (p.code ?? '').trim();
  if (!code || code.length > 200) return deny('INVALID', 'Unrecognised ticket code');

  // 4) Locate the ticket: opaque physical token (hash lookup) or digital ticket number.
  const include = {
    ticketType: { select: { name: true, eventId: true, event: { select: { startDateTime: true, endDateTime: true } } } },
    user: { select: { name: true } },
  } as const;
  const ticket = looksLikePhysicalToken(code)
    ? await db.ticket.findUnique({ where: { tokenHash: hashToken(code) }, include })
    : await db.ticket.findUnique({ where: { ticketId: code }, include });

  if (!ticket) return deny('INVALID', 'Ticket not found');
  if (ticket.ticketType.eventId !== p.eventId) return deny('WRONG_EVENT', 'This ticket is for a different event');
  if (ticket.status === 'CANCELLED' || ticket.status === 'REFUNDED') {
    return deny('CANCELLED', `Ticket is ${ticket.status.toLowerCase()} and cannot be used`);
  }

  const view = {
    serial: ticket.ticketId,
    typeName: ticket.ticketType.name,
    source: ticket.source,
    holderName: ticket.user?.name ?? null,
    usedAt: ticket.usedAt?.toISOString() ?? null,
  };

  const { startDateTime, endDateTime } = ticket.ticketType.event;
  if (now.getTime() < startDateTime.getTime() - windows.earlyEntryHours * 3_600_000) {
    return { ...deny('NOT_STARTED', `Entry opens ${windows.earlyEntryHours} hour(s) before the event starts`), ticket: view };
  }
  if (now.getTime() > endDateTime.getTime() + windows.lateEntryHours * 3_600_000) {
    return { ...deny('ENDED', 'Entry is closed for this event'), ticket: view };
  }

  // 5) Atomic check-in: only one concurrent scan can flip UNUSED → USED.
  const won = await db.$transaction(async (tx) => {
    const r = await tx.ticket.updateMany({ where: { id: ticket.id, status: 'UNUSED' }, data: { status: 'USED', usedAt: now } });
    if (r.count !== 1) return false;
    await tx.ticketValidation.create({
      data: { ticketId: ticket.id, validatedBy: p.actor.id, validatedAt: now, eventId: p.eventId, deviceInfo: [sess.channel, p.deviceInfo].filter(Boolean).join(' | ').slice(0, 300) },
    });
    return true;
  });

  if (won) return { success: true, outcome: 'VALID', message: 'Valid ticket — entry granted', ticket: { ...view, usedAt: now.toISOString() } };

  // Lost the race or already used earlier: report the original check-in.
  const first = await db.ticketValidation.findFirst({
    where: { ticketId: ticket.id },
    orderBy: { validatedAt: 'asc' },
    include: { validator: { select: { name: true } } },
  });
  const fresh = await db.ticket.findUnique({ where: { id: ticket.id }, select: { status: true, usedAt: true } });
  if (fresh && fresh.status !== 'USED') return deny('CANCELLED', `Ticket is ${fresh.status.toLowerCase()} and cannot be used`);
  return {
    success: false,
    outcome: 'ALREADY_USED',
    message: 'ALREADY USED — do not admit',
    ticket: { ...view, usedAt: (fresh?.usedAt ?? ticket.usedAt)?.toISOString() ?? null },
    firstScan: first ? { at: first.validatedAt.toISOString(), by: first.validator?.name ?? null } : undefined,
  };
}
