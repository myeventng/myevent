// Physical ticket batch lifecycle.
//
//   prepareBatch()   validate → price (server-side) → reserve inventory →
//                    create batch (+ pending payment when a fee applies)
//   settlePayment()  verified Paystack result → exactly-once transition to READY
//   processNextPart() controlled chunk: insert tickets, render + store one PDF
//                    part, persist progress. Resumable and idempotent.
//
// Everything here is safe on serverless: no in-memory locks, no local files.
// Concurrency control is done with conditional UPDATEs and DB unique constraints.

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import type {
  GenerationBatchStatus,
  Prisma,
  PrismaClient,
  TicketCodeFormat,
  TicketPrintDesign,
  TicketSource,
} from '@/generated/prisma';
import { requireEventPermission, type ActorLike } from '@/lib/staff/access';
import { selectTier } from '@/lib/ticket-generation/pricing';
import { deriveToken, hashToken, serialFor } from '@/lib/ticket-generation/token';
import { isValidLayout, renderTicketsPdf, type PrintTicket } from '@/lib/ticket-generation/pdf';
import { getPartStorage, type PartStorage } from '@/lib/ticket-generation/storage';
import { formatLagosTime } from '@/lib/utils';

type Db = PrismaClient | Prisma.TransactionClient;

export const PART_SIZE = 500;
export const BATCH_LOCK_MS = 90_000;
export const STALE_PENDING_PAYMENT_MS = 60 * 60 * 1000;
export const DEFAULT_MAX_BATCH_QUANTITY = 50_000;
export const MAX_BATCH_QUANTITY_KEY = 'ticketGeneration.maxBatchQuantity';

export class GenerationError extends Error {
  constructor(message: string, public code: string = 'GENERATION_ERROR') {
    super(message);
    this.name = 'GenerationError';
  }
}

export const createBatchSchema = z.object({
  eventId: z.string().min(1),
  ticketTypeId: z.string().min(1),
  quantity: z.number().int().min(1),
  codeFormat: z.enum(['QR', 'BARCODE']),
  design: z.enum(['BRANDED', 'CODES_ONLY']),
  ticketsPerPage: z.number().int(),
  showSerial: z.boolean().default(true),
  organizerLabel: z.string().trim().max(80).optional().nullable(),
});
export type CreateBatchInput = z.infer<typeof createBatchSchema>;

export async function getMaxBatchQuantity(db: Db = prisma): Promise<number> {
  const row = await db.platformSettings.findUnique({ where: { key: MAX_BATCH_QUANTITY_KEY }, select: { value: true } });
  const v = typeof row?.value === 'number' ? row.value : Number(row?.value);
  return Number.isInteger(v) && v > 0 ? v : DEFAULT_MAX_BATCH_QUANTITY;
}

export async function getActiveTiers(db: Db = prisma) {
  return db.ticketGenerationPricingTier.findMany({ where: { isActive: true }, orderBy: { minQuantity: 'asc' } });
}

export interface Quote {
  quantity: number;
  tierId: string;
  tierLabel: string | null;
  feeKobo: number;
  isFree: boolean;
}

/** Server-side price for a quantity. Never accepts a client-supplied amount. */
export async function quoteQuantity(quantity: number, db: Db = prisma): Promise<Quote> {
  const max = await getMaxBatchQuantity(db);
  if (!Number.isInteger(quantity) || quantity < 1) throw new GenerationError('Quantity must be at least 1', 'BAD_QUANTITY');
  if (quantity > max) throw new GenerationError(`You can generate at most ${max.toLocaleString('en-NG')} codes in one batch`, 'QUANTITY_TOO_LARGE');
  const tier = selectTier(await getActiveTiers(db), quantity);
  if (!tier) throw new GenerationError('Ticket generation pricing is not configured for this quantity. Please contact support.', 'NO_TIER');
  return { quantity, tierId: tier.id, tierLabel: tier.label ?? null, feeKobo: tier.feeKobo, isFree: tier.feeKobo === 0 };
}

export interface PreparedBatch {
  batchId: string;
  status: GenerationBatchStatus;
  requiresPayment: boolean;
  feeKobo: number;
  paymentReference: string | null;
  quantity: number;
  organizerId: string;
}

export function newPaymentReference(batchId: string): string {
  return `tgp_${batchId}_${Date.now().toString(36)}`;
}

export async function prepareBatch(
  actor: ActorLike & { email?: string },
  rawInput: CreateBatchInput,
  db: PrismaClient = prisma,
): Promise<PreparedBatch> {
  const input = createBatchSchema.parse(rawInput);
  if (!isValidLayout(input.design, input.ticketsPerPage)) {
    throw new GenerationError(`${input.ticketsPerPage} per page is not available for this design`, 'BAD_LAYOUT');
  }

  // Authorization: owner, admin, or staff with GENERATE_TICKETS on THIS event.
  const access = await requireEventPermission(actor, input.eventId, 'GENERATE_TICKETS', db);

  const event = await db.event.findUnique({
    where: { id: input.eventId },
    select: { id: true, userId: true, isCancelled: true, attendeeLimit: true, title: true },
  });
  if (!event || !event.userId) throw new GenerationError('Event not found', 'NOT_FOUND');
  if (event.isCancelled) throw new GenerationError('Cannot generate tickets for a cancelled event', 'CANCELLED');

  const ticketType = await db.ticketType.findFirst({
    where: { id: input.ticketTypeId, eventId: input.eventId }, // type must belong to this event
    select: { id: true, quantity: true, name: true },
  });
  if (!ticketType) throw new GenerationError('Ticket category does not belong to this event', 'BAD_TICKET_TYPE');

  const quote = await quoteQuantity(input.quantity, db);
  const isAdmin = access.via === 'ADMIN';
  const feeKobo = isAdmin ? 0 : quote.feeKobo; // admin-generated inventory is not billed
  const source: TicketSource = isAdmin ? 'ADMIN_PHYSICAL' : 'ORGANIZER_PHYSICAL';

  return db.$transaction(async (tx) => {
    if (event.attendeeLimit) {
      const active = await tx.ticket.count({
        where: { ticketType: { eventId: event.id }, status: { in: ['UNUSED', 'USED'] } },
      });
      // Pending reservations also count so two batches cannot jointly exceed the limit.
      if (active + input.quantity > event.attendeeLimit) {
        throw new GenerationError(
          `This would exceed the event's attendee limit (${event.attendeeLimit.toLocaleString('en-NG')}).`,
          'ATTENDEE_LIMIT',
        );
      }
    }

    // Reserve inventory atomically: the conditional update fails if another
    // sale/batch already consumed it. Released again if the batch is cancelled.
    const reserved = await tx.ticketType.updateMany({
      where: { id: ticketType.id, quantity: { gte: input.quantity } },
      data: { quantity: { decrement: input.quantity } },
    });
    if (reserved.count === 0) {
      throw new GenerationError(
        `Not enough remaining "${ticketType.name}" tickets (${ticketType.quantity.toLocaleString('en-NG')} available). Increase the ticket quantity first.`,
        'INSUFFICIENT_INVENTORY',
      );
    }

    const needsPayment = feeKobo > 0;
    const batch = await tx.ticketGenerationBatch.create({
      data: {
        eventId: event.id,
        organizerId: event.userId!,
        createdById: actor.id,
        ticketTypeId: ticketType.id,
        source,
        quantity: input.quantity,
        codeFormat: input.codeFormat,
        design: input.design,
        ticketsPerPage: input.ticketsPerPage,
        showSerial: input.showSerial,
        organizerLabel: input.organizerLabel || null,
        status: needsPayment ? 'PENDING_PAYMENT' : 'READY',
        pricingTierId: quote.tierId,
        feeKobo,
        inventoryReserved: true,
        partSize: PART_SIZE,
        partsTotal: Math.ceil(input.quantity / PART_SIZE),
      },
    });

    let reference: string | null = null;
    if (needsPayment) {
      reference = newPaymentReference(batch.id);
      await tx.ticketGenerationPayment.create({
        data: {
          batchId: batch.id,
          organizerId: event.userId!,
          eventId: event.id,
          reference,
          quantity: input.quantity,
          pricingTierId: quote.tierId,
          pricingTierLabel: quote.tierLabel,
          amountKobo: feeKobo,
          status: 'PENDING',
        },
      });
    }
    return {
      batchId: batch.id,
      status: batch.status,
      requiresPayment: needsPayment,
      feeKobo,
      paymentReference: reference,
      quantity: input.quantity,
      organizerId: event.userId!,
    };
  });
}

// ─── Payment settlement ─────────────────────────────────────────────────────

export interface VerifiedPayment {
  status: 'success' | 'failed' | 'abandoned' | string;
  amountKobo: number;
  currency: string;
}

export type SettleResult =
  | { ok: true; alreadyProcessed: boolean; batchId: string }
  | { ok: false; reason: 'UNKNOWN_REFERENCE' | 'AMOUNT_MISMATCH' | 'CURRENCY_MISMATCH' | 'NOT_SUCCESSFUL'; batchId?: string };

async function releaseReservation(tx: Prisma.TransactionClient, batchId: string) {
  // Only release once: the conditional update on inventoryReserved makes this idempotent.
  const claimed = await tx.ticketGenerationBatch.updateMany({
    where: { id: batchId, inventoryReserved: true },
    data: { inventoryReserved: false },
  });
  if (claimed.count === 1) {
    const b = await tx.ticketGenerationBatch.findUnique({ where: { id: batchId }, select: { ticketTypeId: true, quantity: true } });
    if (b) await tx.ticketType.update({ where: { id: b.ticketTypeId }, data: { quantity: { increment: b.quantity } } });
  }
}

/**
 * Apply an already-verified Paystack result (webhook or server-side verify).
 * Exactly-once: the PENDING→COMPLETED transition is a conditional UPDATE, so a
 * duplicate webhook or a webhook racing the callback cannot create a second
 * batch or trigger generation twice.
 */
export async function settlePayment(
  reference: string,
  verified: VerifiedPayment,
  db: PrismaClient = prisma,
): Promise<SettleResult> {
  const payment = await db.ticketGenerationPayment.findUnique({ where: { reference }, include: { batch: true } });
  if (!payment) return { ok: false, reason: 'UNKNOWN_REFERENCE' };

  if (verified.status !== 'success') {
    if (verified.status === 'failed' || verified.status === 'abandoned') {
      await db.$transaction(async (tx) => {
        const upd = await tx.ticketGenerationPayment.updateMany({
          where: { id: payment.id, status: 'PENDING' },
          data: { status: 'FAILED', failureReason: `Paystack status: ${verified.status}` },
        });
        if (upd.count === 1) {
          await tx.ticketGenerationBatch.updateMany({ where: { id: payment.batchId, status: 'PENDING_PAYMENT' }, data: { status: 'CANCELLED' } });
          await releaseReservation(tx, payment.batchId);
        }
      });
    }
    return { ok: false, reason: 'NOT_SUCCESSFUL', batchId: payment.batchId };
  }

  if (verified.currency !== payment.currency) {
    await db.ticketGenerationPayment.updateMany({ where: { id: payment.id, status: 'PENDING' }, data: { failureReason: `Currency mismatch: ${verified.currency}` } });
    return { ok: false, reason: 'CURRENCY_MISMATCH', batchId: payment.batchId };
  }
  if (verified.amountKobo !== payment.amountKobo) {
    await db.ticketGenerationPayment.updateMany({
      where: { id: payment.id, status: 'PENDING' },
      data: { failureReason: `Amount mismatch: expected ${payment.amountKobo}, received ${verified.amountKobo}`, verifiedAmountKobo: verified.amountKobo },
    });
    return { ok: false, reason: 'AMOUNT_MISMATCH', batchId: payment.batchId };
  }

  return db.$transaction(async (tx) => {
    const claimed = await tx.ticketGenerationPayment.updateMany({
      where: { id: payment.id, status: { in: ['PENDING', 'FAILED'] } },
      data: { status: 'COMPLETED', paidAt: new Date(), verifiedAmountKobo: verified.amountKobo, failureReason: null },
    });
    if (claimed.count === 0) return { ok: true as const, alreadyProcessed: true, batchId: payment.batchId };

    const moved = await tx.ticketGenerationBatch.updateMany({
      where: { id: payment.batchId, status: 'PENDING_PAYMENT' },
      data: { status: 'READY' },
    });
    if (moved.count === 0) {
      // The batch was cancelled (e.g. stale-reservation sweep) before the money arrived.
      // Try to take the inventory back; otherwise flag for manual refund.
      const b = await tx.ticketGenerationBatch.findUnique({ where: { id: payment.batchId } });
      if (b && b.status === 'CANCELLED') {
        const re = await tx.ticketType.updateMany({ where: { id: b.ticketTypeId, quantity: { gte: b.quantity } }, data: { quantity: { decrement: b.quantity } } });
        if (re.count === 1) {
          await tx.ticketGenerationBatch.update({ where: { id: b.id }, data: { status: 'READY', inventoryReserved: true } });
        } else {
          await tx.ticketGenerationPayment.update({ where: { id: payment.id }, data: { failureReason: 'PAID_BUT_INVENTORY_UNAVAILABLE: refund required' } });
        }
      }
    }
    return { ok: true as const, alreadyProcessed: false, batchId: payment.batchId };
  });
}

/** Cancel a batch that has not been paid for / generated and release its inventory. */
export async function cancelUnpaidBatch(batchId: string, db: PrismaClient = prisma): Promise<boolean> {
  return db.$transaction(async (tx) => {
    const moved = await tx.ticketGenerationBatch.updateMany({
      where: { id: batchId, status: 'PENDING_PAYMENT' },
      data: { status: 'CANCELLED' },
    });
    if (moved.count === 0) return false;
    await tx.ticketGenerationPayment.updateMany({ where: { batchId, status: 'PENDING' }, data: { status: 'FAILED', failureReason: 'Cancelled before payment' } });
    await releaseReservation(tx, batchId);
    return true;
  });
}

// ─── Chunked generation ─────────────────────────────────────────────────────

export interface ProgressResult {
  busy: boolean;
  done: boolean;
  status: GenerationBatchStatus;
  partsDone: number;
  partsTotal: number;
  error?: string;
}

export async function loadPrintContext(batchId: string, db: Db = prisma) {
  const batch = await db.ticketGenerationBatch.findUnique({
    where: { id: batchId },
    include: {
      ticketType: { select: { name: true } },
      event: { select: { title: true, startDateTime: true, venue: { select: { name: true, address: true, city: { select: { name: true } } } } } },
    },
  });
  if (!batch) throw new GenerationError('Batch not found', 'NOT_FOUND');
  const v = batch.event.venue;
  const venueText = [v?.name, v?.address, v?.city?.name].filter(Boolean).join(', ');
  return {
    batch,
    event: {
      title: batch.event.title,
      dateText: `${formatLagosTime(batch.event.startDateTime, 'EEE, d MMM yyyy')} · ${formatLagosTime(batch.event.startDateTime, 'p')}`,
      venueText,
      ticketTypeName: batch.ticketType.name,
      organizerLabel: batch.organizerLabel,
    },
  };
}

export function partRange(batch: { quantity: number; partSize: number }, partIndex: number) {
  const from = partIndex * batch.partSize;
  return { from, to: Math.min(batch.quantity, from + batch.partSize) };
}

export function printTicketsForRange(batchId: string, from: number, to: number): PrintTicket[] {
  const out: PrintTicket[] = [];
  for (let i = from; i < to; i++) out.push({ serial: serialFor(batchId, i), token: deriveToken(batchId, i) });
  return out;
}

export async function renderPart(batchId: string, partIndex: number, db: Db = prisma): Promise<{ pdf: Buffer; from: number; to: number }> {
  const { batch, event } = await loadPrintContext(batchId, db);
  if (partIndex < 0 || partIndex >= batch.partsTotal) throw new GenerationError('Part not found', 'NOT_FOUND');
  const { from, to } = partRange(batch, partIndex);
  const pdf = await renderTicketsPdf({
    design: batch.design as TicketPrintDesign,
    codeFormat: batch.codeFormat as TicketCodeFormat,
    ticketsPerPage: batch.ticketsPerPage,
    showSerial: batch.showSerial,
    event,
    tickets: printTicketsForRange(batchId, from, to),
  });
  return { pdf, from, to };
}

export async function processNextPart(
  batchId: string,
  opts: { db?: PrismaClient; storage?: PartStorage; now?: () => Date } = {},
): Promise<ProgressResult> {
  const db = opts.db ?? prisma;
  const storage = opts.storage ?? getPartStorage();
  const now = (opts.now ?? (() => new Date()))();

  // Lease the batch. Conditional update = distributed lock that survives serverless instances.
  const leased = await db.ticketGenerationBatch.updateMany({
    where: {
      id: batchId,
      status: { in: ['READY', 'GENERATING', 'FAILED'] },
      OR: [{ lockedUntil: null }, { lockedUntil: { lt: now } }],
    },
    data: { status: 'GENERATING', lockedUntil: new Date(now.getTime() + BATCH_LOCK_MS), lastError: null },
  });

  const current = await db.ticketGenerationBatch.findUnique({ where: { id: batchId }, include: { files: { select: { partIndex: true } } } });
  if (!current) throw new GenerationError('Batch not found', 'NOT_FOUND');
  if (leased.count === 0) {
    return {
      busy: current.status === 'GENERATING',
      done: current.status === 'COMPLETED',
      status: current.status,
      partsDone: current.partsDone,
      partsTotal: current.partsTotal,
    };
  }

  try {
    const have = new Set(current.files.map((f) => f.partIndex));
    let partIndex = -1;
    for (let i = 0; i < current.partsTotal; i++) {
      if (!have.has(i)) {
        partIndex = i;
        break;
      }
    }

    if (partIndex === -1) {
      const finished = await db.ticketGenerationBatch.update({
        where: { id: batchId },
        data: { status: 'COMPLETED', completedAt: now, lockedUntil: null, partsDone: current.partsTotal },
      });
      return { busy: false, done: true, status: finished.status, partsDone: finished.partsDone, partsTotal: finished.partsTotal };
    }

    const { from, to } = partRange(current, partIndex);

    // 1) Tickets for this range. skipDuplicates + unique (batchId,batchIndex)/tokenHash/ticketId
    //    make a retried chunk a no-op; the count check detects any silently skipped collision.
    const rows = [];
    for (let i = from; i < to; i++) {
      rows.push({
        ticketId: serialFor(batchId, i),
        tokenHash: hashToken(deriveToken(batchId, i)),
        batchId,
        batchIndex: i,
        ticketTypeId: current.ticketTypeId,
        source: current.source,
        status: 'UNUSED' as const,
        userId: null,
      });
    }
    await db.ticket.createMany({ data: rows, skipDuplicates: true });
    const present = await db.ticket.count({ where: { batchId, batchIndex: { gte: from, lt: to } } });
    if (present !== to - from) {
      throw new GenerationError(`Integrity check failed for part ${partIndex + 1}: expected ${to - from} tickets, found ${present}`, 'INTEGRITY');
    }

    // 2) PDF part → persistent private storage.
    const { pdf } = await renderPart(batchId, partIndex, db);
    const filename = `tickets-${batchId}-part-${String(partIndex + 1).padStart(3, '0')}.pdf`;
    const stored = await storage.put({ batchId, partIndex, filename, data: pdf });

    // 3) Record progress (unique(batchId,partIndex) guards double-recording).
    await db.ticketGenerationFile.upsert({
      where: { batchId_partIndex: { batchId, partIndex } },
      create: { batchId, partIndex, fromIndex: from, toIndex: to, fileKey: stored.key, bytes: pdf.length },
      update: { fileKey: stored.key, bytes: pdf.length },
    });
    const partsDone = await db.ticketGenerationFile.count({ where: { batchId } });
    const complete = partsDone >= current.partsTotal;
    const updated = await db.ticketGenerationBatch.update({
      where: { id: batchId },
      data: {
        partsDone,
        lockedUntil: null,
        status: complete ? 'COMPLETED' : 'GENERATING',
        completedAt: complete ? new Date() : null,
      },
    });
    return { busy: false, done: complete, status: updated.status, partsDone: updated.partsDone, partsTotal: updated.partsTotal };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown generation error';
    await db.ticketGenerationBatch.update({
      where: { id: batchId },
      data: { status: 'FAILED', lockedUntil: null, lastError: message.slice(0, 500) },
    });
    return { busy: false, done: false, status: 'FAILED', partsDone: current.partsDone, partsTotal: current.partsTotal, error: message };
  }
}

export async function getBatchStats(batchId: string, db: Db = prisma) {
  const groups = await db.ticket.groupBy({ by: ['status'], where: { batchId }, _count: { _all: true } });
  const by = Object.fromEntries(groups.map((g) => [g.status, g._count._all]));
  const generated = groups.reduce((s, g) => s + g._count._all, 0);
  return { generated, unused: by.UNUSED ?? 0, validated: by.USED ?? 0, cancelled: (by.CANCELLED ?? 0) + (by.REFUNDED ?? 0) };
}
