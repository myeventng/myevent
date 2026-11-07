import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '@/lib/prisma';
import { makeEvent, makeOrganizer, resetDb, resetVenueCache } from './helpers/db';
import { prepareBatch, processNextPart, type CreateBatchInput } from '@/lib/ticket-generation/service';
import type { PartStorage } from '@/lib/ticket-generation/storage';
import { getBatchInventory, getEventPhysicalInventory, getPhysicalInventoryForEvents, recordOfflineSale } from '@/lib/ticket-generation/offline-sales';
import { ONLINE_SOLD_WHERE } from '@/lib/ticket-stats';

class MemoryStorage implements PartStorage {
  async put({ batchId, partIndex }: { batchId: string; partIndex: number; filename: string; data: Buffer }) { return { key: `${batchId}/${partIndex}` }; }
  async signedUrl(key: string) { return `memory://${key}`; }
}
const input = (eventId: string, ticketTypeId: string, quantity: number): CreateBatchInput => ({
  eventId, ticketTypeId, quantity, codeFormat: 'QR', design: 'BRANDED', ticketsPerPage: 4, showSerial: true, organizerLabel: null,
});

describe('offline (physical) sales inventory', () => {
  let org: Awaited<ReturnType<typeof makeOrganizer>>;
  let other: Awaited<ReturnType<typeof makeOrganizer>>;
  let ev: Awaited<ReturnType<typeof makeEvent>>;
  let batchId: string;
  const actor = () => ({ id: org.id, role: 'USER' as const });

  beforeEach(async () => {
    await resetDb();
    resetVenueCache();
    org = await makeOrganizer('A');
    other = await makeOrganizer('B');
    ev = await makeEvent(org, { onlineQty: 100, physicalQty: 100, price: 2000 });
    const p = await prepareBatch(actor(), input(ev.event.id, ev.ticketType.id, 40));
    batchId = p.batchId;
    for (let i = 0; i < 20; i++) { const r = await processNextPart(batchId, { storage: new MemoryStorage() }); if (r.done) break; }
  });

  it('records sales, tracks unsold, and values them at the ticket price by default', async () => {
    const r = await recordOfflineSale(actor(), { batchId, quantity: 15 });
    expect(r).toEqual({ offlineSold: 15, batchQuantity: 40 });
    const inv = (await getBatchInventory([batchId])).get(batchId)!;
    expect(inv).toMatchObject({ issued: 40, soldOffline: 15, unsold: 25, scanned: 0, revenueKobo: 15 * 2000 * 100 });
    await recordOfflineSale(actor(), { batchId, quantity: 5, unitPriceNaira: 3000, note: 'gate' });
    expect((await getBatchInventory([batchId])).get(batchId)!.revenueKobo).toBe(15 * 200_000 + 5 * 300_000);
  });

  it('cannot exceed the batch or go below zero; corrections work and are ledgered', async () => {
    await recordOfflineSale(actor(), { batchId, quantity: 40 });
    await expect(recordOfflineSale(actor(), { batchId, quantity: 1 })).rejects.toMatchObject({ code: 'OUT_OF_RANGE' });
    await recordOfflineSale(actor(), { batchId, quantity: -10 });
    expect((await prisma.ticketGenerationBatch.findUniqueOrThrow({ where: { id: batchId } })).offlineSold).toBe(30);
    await expect(recordOfflineSale(actor(), { batchId, quantity: -31 })).rejects.toMatchObject({ code: 'OUT_OF_RANGE' });
    await expect(recordOfflineSale(actor(), { batchId, quantity: 0 })).rejects.toMatchObject({ code: 'BAD_QUANTITY' });
    const rows = await prisma.offlineSale.findMany({ where: { batchId } });
    expect(rows.reduce((s, r) => s + r.quantity, 0)).toBe(30);
    expect(rows.reduce((s, r) => s + r.amountKobo, 0)).toBe(30 * 200_000);
  });

  it('concurrent recordings can never over-sell the batch', async () => {
    const results = await Promise.allSettled(Array.from({ length: 12 }, () => recordOfflineSale(actor(), { batchId, quantity: 5 })));
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(8); // 8 × 5 = 40
    expect((await prisma.ticketGenerationBatch.findUniqueOrThrow({ where: { id: batchId } })).offlineSold).toBe(40);
    expect(await prisma.offlineSale.count({ where: { batchId } })).toBe(8);
  });

  it('only people with generate permission on THIS event can record', async () => {
    await expect(recordOfflineSale({ id: other.id, role: 'USER' }, { batchId, quantity: 1 })).rejects.toThrow();
    expect((await prisma.ticketGenerationBatch.findUniqueOrThrow({ where: { id: batchId } })).offlineSold).toBe(0);
  });

  it('a scanned physical ticket counts as sold even if never recorded', async () => {
    await recordOfflineSale(actor(), { batchId, quantity: 1 });
    const some = await prisma.ticket.findMany({ where: { batchId }, take: 3 });
    await prisma.ticket.updateMany({ where: { id: { in: some.map((t) => t.id) } }, data: { status: 'USED', usedAt: new Date() } });
    const inv = (await getBatchInventory([batchId])).get(batchId)!;
    expect(inv).toMatchObject({ scanned: 3, soldOffline: 3, unsold: 37 });
  });

  it('rolls up per ticket type and per event, and never touches online sales', async () => {
    await recordOfflineSale(actor(), { batchId, quantity: 12 });
    const { byType, total } = await getEventPhysicalInventory(ev.event.id);
    expect(byType.get(ev.ticketType.id)).toMatchObject({ issued: 40, soldOffline: 12, unsold: 28 });
    expect(total.soldOffline).toBe(12);
    const multi = await getPhysicalInventoryForEvents([ev.event.id]);
    expect(multi.byEvent.get(ev.event.id)?.soldOffline).toBe(12);
    expect(await prisma.ticket.count({ where: { ticketTypeId: ev.ticketType.id, ...ONLINE_SOLD_WHERE } })).toBe(0);
  });

  it('refuses to record against a batch that has not finished generating', async () => {
    const p2 = await prepareBatch(actor(), input(ev.event.id, ev.ticketType.id, 10)); // READY, not generated
    await expect(recordOfflineSale(actor(), { batchId: p2.batchId, quantity: 1 })).rejects.toMatchObject({ code: 'BATCH_NOT_READY' });
  });
});
