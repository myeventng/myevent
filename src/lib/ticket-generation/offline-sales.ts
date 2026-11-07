import type { Prisma, PrismaClient } from '@/generated/prisma';
import { prisma } from '@/lib/prisma';
import { requireEventPermission, type ActorLike } from '@/lib/staff/access';
import { GenerationError } from '@/lib/ticket-generation/service';

type Db = PrismaClient | Prisma.TransactionClient;

export const MAX_OFFLINE_DELTA = 100_000;

export interface RecordOfflineSaleInput {
  batchId: string;
  /** Signed: positive = sold offline, negative = correction / returned. */
  quantity: number;
  /** Naira per ticket. Defaults to the ticket type's price. */
  unitPriceNaira?: number | null;
  note?: string | null;
}

/**
 * Record physical tickets sold outside the platform. Atomic: the batch counter only moves when the new
 * total stays between 0 and the number of tickets in the batch, so concurrent clicks can never over-sell
 * the batch. Informational only: this never touches platform revenue, commission or payouts.
 */
export async function recordOfflineSale(actor: ActorLike, input: RecordOfflineSaleInput, db: PrismaClient = prisma) {
  const delta = input.quantity;
  if (!Number.isInteger(delta) || delta === 0 || Math.abs(delta) > MAX_OFFLINE_DELTA) {
    throw new GenerationError(`Enter a whole number between 1 and ${MAX_OFFLINE_DELTA.toLocaleString('en-NG')} (negative to correct)`, 'BAD_QUANTITY');
  }
  if (input.unitPriceNaira != null && (!Number.isFinite(input.unitPriceNaira) || input.unitPriceNaira < 0)) {
    throw new GenerationError('Price must be 0 or more', 'BAD_PRICE');
  }

  const batch = await db.ticketGenerationBatch.findUnique({
    where: { id: input.batchId },
    select: { id: true, eventId: true, ticketTypeId: true, quantity: true, status: true, ticketType: { select: { price: true } } },
  });
  if (!batch) throw new GenerationError('Batch not found', 'NOT_FOUND');
  // Same permission as generating: owner, admin, or staff with GENERATE_TICKETS on THIS event.
  await requireEventPermission(actor, batch.eventId, 'GENERATE_TICKETS', db);
  if (batch.status !== 'COMPLETED') {
    throw new GenerationError('Tickets can be recorded as sold once the batch has finished generating', 'BATCH_NOT_READY');
  }

  const unitPriceKobo = Math.round((input.unitPriceNaira ?? batch.ticketType.price) * 100);
  const note = input.note?.trim().slice(0, 200) || null;

  return db.$transaction(async (tx) => {
    const moved = await tx.ticketGenerationBatch.updateMany({
      where: {
        id: batch.id,
        status: 'COMPLETED',
        offlineSold: delta > 0 ? { lte: batch.quantity - delta } : { gte: -delta },
      },
      data: { offlineSold: { increment: delta } },
    });
    if (moved.count === 0) {
      throw new GenerationError(
        delta > 0
          ? `That would be more than the ${batch.quantity.toLocaleString('en-NG')} tickets in this batch`
          : 'You cannot reduce offline sales below zero',
        'OUT_OF_RANGE',
      );
    }
    await tx.offlineSale.create({
      data: {
        batchId: batch.id,
        eventId: batch.eventId,
        ticketTypeId: batch.ticketTypeId,
        quantity: delta,
        unitPriceKobo,
        amountKobo: delta * unitPriceKobo,
        note,
        recordedById: actor.id,
      },
    });
    const fresh = await tx.ticketGenerationBatch.findUniqueOrThrow({ where: { id: batch.id }, select: { offlineSold: true } });
    return { offlineSold: fresh.offlineSold, batchQuantity: batch.quantity };
  });
}

export interface PhysicalInventory {
  issued: number; // valid physical tickets generated (not cancelled)
  scanned: number; // physical tickets already scanned at the door
  soldOffline: number; // recorded as sold offline (never less than scanned: a scanned ticket was clearly sold)
  unsold: number; // issued - soldOffline
  revenueKobo: number; // organizer-recorded offline revenue (informational)
}

const EMPTY: PhysicalInventory = { issued: 0, scanned: 0, soldOffline: 0, unsold: 0, revenueKobo: 0 };
export const emptyPhysicalInventory = (): PhysicalInventory => ({ ...EMPTY });

/** Per-batch inventory, computed once here so every screen shows the same numbers. */
export async function getBatchInventory(batchIds: string[], db: Db = prisma): Promise<Map<string, PhysicalInventory & { ticketTypeId: string; eventId: string }>> {
  const out = new Map<string, PhysicalInventory & { ticketTypeId: string; eventId: string }>();
  if (batchIds.length === 0) return out;
  const [batches, issued, scanned, money] = await Promise.all([
    db.ticketGenerationBatch.findMany({ where: { id: { in: batchIds }, status: { in: ['COMPLETED', 'GENERATING'] } }, select: { id: true, eventId: true, ticketTypeId: true, offlineSold: true } }),
    db.ticket.groupBy({ by: ['batchId'], where: { batchId: { in: batchIds }, status: { in: ['UNUSED', 'USED'] } }, _count: { _all: true } }),
    db.ticket.groupBy({ by: ['batchId'], where: { batchId: { in: batchIds }, status: 'USED' }, _count: { _all: true } }),
    db.offlineSale.groupBy({ by: ['batchId'], where: { batchId: { in: batchIds } }, _sum: { amountKobo: true } }),
  ]);
  const iMap = new Map(issued.map((g) => [g.batchId, g._count._all]));
  const sMap = new Map(scanned.map((g) => [g.batchId, g._count._all]));
  const mMap = new Map(money.map((g) => [g.batchId, g._sum.amountKobo ?? 0]));
  for (const b of batches) {
    const iss = iMap.get(b.id) ?? 0;
    const sc = sMap.get(b.id) ?? 0;
    const sold = Math.min(iss, Math.max(b.offlineSold, sc));
    out.set(b.id, { ticketTypeId: b.ticketTypeId, eventId: b.eventId, issued: iss, scanned: sc, soldOffline: sold, unsold: Math.max(0, iss - sold), revenueKobo: mMap.get(b.id) ?? 0 });
  }
  return out;
}

/** Inventory rolled up per ticket type for one event, plus an event total. */
export async function getEventPhysicalInventory(eventId: string, db: Db = prisma) {
  const batches = await db.ticketGenerationBatch.findMany({ where: { eventId, status: { in: ['COMPLETED', 'GENERATING'] } }, select: { id: true } });
  const per = await getBatchInventory(batches.map((b) => b.id), db);
  const byType = new Map<string, PhysicalInventory>();
  const total = emptyPhysicalInventory();
  for (const v of per.values()) {
    const t = byType.get(v.ticketTypeId) ?? emptyPhysicalInventory();
    for (const k of ['issued', 'scanned', 'soldOffline', 'unsold', 'revenueKobo'] as const) { t[k] += v[k]; total[k] += v[k]; }
    byType.set(v.ticketTypeId, t);
  }
  return { byType, total };
}

/** Totals across many events (organizer dashboard / admin). */
export async function getPhysicalInventoryForEvents(eventIds: string[] | 'ALL', db: Db = prisma) {
  const batches = await db.ticketGenerationBatch.findMany({
    where: { ...(eventIds === 'ALL' ? {} : { eventId: { in: eventIds } }), status: { in: ['COMPLETED', 'GENERATING'] } },
    select: { id: true },
  });
  const per = await getBatchInventory(batches.map((b) => b.id), db);
  const byEvent = new Map<string, PhysicalInventory>();
  const total = emptyPhysicalInventory();
  for (const v of per.values()) {
    const e = byEvent.get(v.eventId) ?? emptyPhysicalInventory();
    for (const k of ['issued', 'scanned', 'soldOffline', 'unsold', 'revenueKobo'] as const) { e[k] += v[k]; total[k] += v[k]; }
    byEvent.set(v.eventId, e);
  }
  return { byEvent, total };
}
