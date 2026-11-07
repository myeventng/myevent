import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '@/lib/prisma';
import { makeEvent, makeOrganizer, makeUser, resetDb, resetVenueCache } from './helpers/db';
import {
  cancelUnpaidBatch, getBatchStats, prepareBatch, processNextPart, settlePayment, PART_SIZE, type CreateBatchInput,
} from '@/lib/ticket-generation/service';
import type { PartStorage } from '@/lib/ticket-generation/storage';
import { deriveToken, hashToken } from '@/lib/ticket-generation/token';
import { describeScan } from '@/lib/ticket-generation/pdf';
import { ONLINE_SOLD_WHERE, PHYSICAL_ISSUED_WHERE } from '@/lib/ticket-stats';

class MemoryStorage implements PartStorage {
  files = new Map<string, Buffer>();
  failNext = 0;
  async put({ batchId, partIndex, data }: { batchId: string; partIndex: number; filename: string; data: Buffer }) {
    if (this.failNext > 0) { this.failNext--; throw new Error('simulated storage outage'); }
    const key = `${batchId}/${partIndex}`;
    this.files.set(key, data);
    return { key };
  }
  async signedUrl(key: string) { return `memory://${key}`; }
}

const input = (eventId: string, ticketTypeId: string, quantity: number, over: Partial<CreateBatchInput> = {}): CreateBatchInput => ({
  eventId, ticketTypeId, quantity, codeFormat: 'QR', design: 'BRANDED', ticketsPerPage: 4, showSerial: true, organizerLabel: null, ...over,
});

// Prepare a batch and, when the tier requires payment, settle it with a verified success.
async function prepareReady(user: { id: string }, inp: CreateBatchInput) {
  const p = await prepareBatch({ id: user.id, role: 'USER' }, inp);
  if (p.requiresPayment) {
    const r = await settlePayment(p.paymentReference!, { status: 'success', amountKobo: p.feeKobo, currency: 'NGN' });
    if (!r.ok) throw new Error('settle failed: ' + JSON.stringify(r));
  }
  return p;
}

async function drain(batchId: string, storage: PartStorage, max = 200) {
  for (let i = 0; i < max; i++) {
    const r = await processNextPart(batchId, { storage });
    if (r.done || r.error) return r;
  }
  throw new Error('did not finish');
}

describe('physical ticket generation (Postgres)', () => {
  let org: Awaited<ReturnType<typeof makeOrganizer>>;
  let other: Awaited<ReturnType<typeof makeOrganizer>>;
  let ev: Awaited<ReturnType<typeof makeEvent>>;
  let storage: MemoryStorage;

  beforeEach(async () => {
    await resetDb();
    resetVenueCache();
    org = await makeOrganizer('A');
    other = await makeOrganizer('B');
    ev = await makeEvent(org, { ticketQty: 100_000 });
    storage = new MemoryStorage();
  });

  it('seeded the default tiers through the migration, idempotently', async () => {
    const tiers = await prisma.ticketGenerationPricingTier.findMany({ orderBy: { minQuantity: 'asc' } });
    expect(tiers.map((t) => [t.minQuantity, t.maxQuantity, t.feeKobo])).toEqual([
      [1, 999, 0], [1000, 1999, 500_000], [2000, 4999, 1_000_000], [5000, 9999, 2_000_000], [10000, 19999, 3_500_000], [20000, null, 5_000_000],
    ]);
  });

  it('free tier: generates exactly N unique tickets, correct source/links, and a PDF per part', async () => {
    const qty = PART_SIZE + 120; // 2 parts
    const p = await prepareBatch({ id: org.id, role: 'USER' }, input(ev.event.id, ev.ticketType.id, qty));
    expect(p.requiresPayment).toBe(false);
    expect(p.status).toBe('READY');
    const r = await drain(p.batchId, storage);
    expect(r.done).toBe(true);
    expect(r.partsDone).toBe(2);

    const tickets = await prisma.ticket.findMany({ where: { batchId: p.batchId }, orderBy: { batchIndex: 'asc' } });
    expect(tickets).toHaveLength(qty);
    expect(new Set(tickets.map((t) => t.ticketId)).size).toBe(qty);
    expect(new Set(tickets.map((t) => t.tokenHash)).size).toBe(qty);
    expect(tickets.every((t) => t.source === 'ORGANIZER_PHYSICAL' && t.status === 'UNUSED' && t.userId === null && t.ticketTypeId === ev.ticketType.id)).toBe(true);
    // DB stores only hashes, and the hashes match derived tokens
    expect(tickets[0].tokenHash).toBe(hashToken(deriveToken(p.batchId, 0)));
    expect(JSON.stringify(tickets)).not.toContain(deriveToken(p.batchId, 0));
    expect(storage.files.size).toBe(2);
    const stats = await getBatchStats(p.batchId);
    expect(stats).toEqual({ generated: qty, unused: qty, validated: 0, cancelled: 0 });
    // PHYSICAL inventory was reserved; ONLINE stock is untouched.
    const tt = await prisma.ticketType.findUniqueOrThrow({ where: { id: ev.ticketType.id } });
    expect(tt.physicalQuantity).toBe(100_000 - qty);
    expect(tt.quantity).toBe(1000);
  });

  it('is resumable: a failed part leaves earlier parts intact and a retry finishes without duplicates', async () => {
    const qty = PART_SIZE * 3;
    const p = await prepareReady(org, input(ev.event.id, ev.ticketType.id, qty));
    expect((await processNextPart(p.batchId, { storage })).partsDone).toBe(1);
    storage.failNext = 1;
    const failed = await processNextPart(p.batchId, { storage });
    expect(failed.status).toBe('FAILED');
    expect(failed.error).toMatch(/outage/);
    // tickets for the failed part may already exist (inserted before the upload) — retry must not duplicate
    const r = await drain(p.batchId, storage);
    expect(r.done).toBe(true);
    expect(await prisma.ticket.count({ where: { batchId: p.batchId } })).toBe(qty);
    expect(await prisma.ticketGenerationFile.count({ where: { batchId: p.batchId } })).toBe(3);
  });

  it('concurrent workers cannot process the same batch/part twice', async () => {
    const qty = PART_SIZE * 2;
    const p = await prepareReady(org, input(ev.event.id, ev.ticketType.id, qty));
    const results = await Promise.all(Array.from({ length: 6 }, () => processNextPart(p.batchId, { storage })));
    expect(results.filter((r) => !r.busy).length).toBeGreaterThanOrEqual(1);
    await drain(p.batchId, storage);
    expect(await prisma.ticket.count({ where: { batchId: p.batchId } })).toBe(qty);
    expect(await prisma.ticketGenerationFile.count({ where: { batchId: p.batchId } })).toBe(2);
    expect(storage.files.size).toBe(2);
  });

  it('cannot generate for another organizer’s event; staff need GENERATE_TICKETS on that event', async () => {
    await expect(prepareBatch({ id: other.id, role: 'USER' }, input(ev.event.id, ev.ticketType.id, 10))).rejects.toThrow(/permission/i);
    const staffUser = await makeUser();
    await prisma.organizerStaff.create({ data: { organizerId: org.id, userId: staffUser.id, email: staffUser.email, role: 'MANAGER', permissions: ['VIEW_EVENTS', 'SCAN_TICKETS'], allEvents: true, status: 'ACTIVE' } });
    await expect(prepareBatch({ id: staffUser.id, role: 'USER' }, input(ev.event.id, ev.ticketType.id, 10))).rejects.toThrow(/permission/i);
    await prisma.organizerStaff.updateMany({ where: { userId: staffUser.id }, data: { permissions: ['VIEW_EVENTS', 'GENERATE_TICKETS'] } });
    const ok = await prepareBatch({ id: staffUser.id, role: 'USER' }, input(ev.event.id, ev.ticketType.id, 10));
    expect(ok.organizerId).toBe(org.id); // billed to the owner, never the staff user
  });

  it('rejects a ticket type from another event, bad layouts and oversize quantities', async () => {
    const ev2 = await makeEvent(org);
    await expect(prepareBatch({ id: org.id, role: 'USER' }, input(ev.event.id, ev2.ticketType.id, 10))).rejects.toThrow(/does not belong/);
    await expect(prepareBatch({ id: org.id, role: 'USER' }, input(ev.event.id, ev.ticketType.id, 10, { ticketsPerPage: 12 }))).rejects.toThrow(/per page/);
    await expect(prepareBatch({ id: org.id, role: 'USER' }, input(ev.event.id, ev.ticketType.id, 60_000))).rejects.toThrow(/at most/);
  });

  it('refuses to create a batch once the event has ended (owner and admin alike), reserving nothing; in-progress events still work', async () => {
    const ended = await makeEvent(org, { ticketQty: 100, startsInHours: -10 }); // started 10h ago, ended 6h ago
    const admin = await makeUser({ role: 'ADMIN', subRole: 'SUPER_ADMIN' });
    for (const actor of [{ id: org.id, role: 'USER' as const }, { id: admin.id, role: 'ADMIN' as const }]) {
      await expect(prepareBatch(actor, input(ended.event.id, ended.ticketType.id, 10))).rejects.toMatchObject({ code: 'EVENT_ENDED' });
    }
    expect((await prisma.ticketType.findUniqueOrThrow({ where: { id: ended.ticketType.id } })).physicalQuantity).toBe(100);
    expect(await prisma.ticketGenerationBatch.count({ where: { eventId: ended.event.id } })).toBe(0);

    // Started 1h ago, ends in 3h: door sales / on-the-day printing must still be possible.
    const live = await makeEvent(org, { ticketQty: 100, startsInHours: -1 });
    await expect(prepareBatch({ id: org.id, role: 'USER' }, input(live.event.id, live.ticketType.id, 10))).resolves.toBeTruthy();
  });

  it('physical stock is independent of online stock: online-only types cannot be printed, and printing never touches online stock', async () => {
    const onlineOnly = await makeEvent(org, { onlineQty: 500, physicalQty: 0 });
    await expect(prepareBatch({ id: org.id, role: 'USER' }, input(onlineOnly.event.id, onlineOnly.ticketType.id, 1))).rejects.toMatchObject({ code: 'INSUFFICIENT_INVENTORY' });

    const both = await makeEvent(org, { onlineQty: 300, physicalQty: 40 });
    await expect(prepareBatch({ id: org.id, role: 'USER' }, input(both.event.id, both.ticketType.id, 41))).rejects.toThrow(/physical/i);
    const p = await prepareBatch({ id: org.id, role: 'USER' }, input(both.event.id, both.ticketType.id, 40));
    const t = await prisma.ticketType.findUniqueOrThrow({ where: { id: both.ticketType.id } });
    expect(t).toMatchObject({ quantity: 300, physicalQuantity: 0 });
    expect(p.status).toBe('READY');
  });

  it('generated physical tickets are NOT sales: they never count toward sold tickets or revenue', async () => {
    const e = await makeEvent(org, { onlineQty: 100, physicalQty: 50, price: 5000 });
    // One real online sale
    const buyer = await makeUser();
    const order = await prisma.order.create({ data: { paystackId: `ps-${Date.now()}`, totalAmount: 5000, quantity: 1, paymentStatus: 'COMPLETED', buyerId: buyer.id, eventId: e.event.id } });
    await prisma.ticket.create({ data: { ticketId: `ON-${Date.now()}`, ticketTypeId: e.ticketType.id, userId: buyer.id, orderId: order.id, status: 'UNUSED' } });

    const p = await prepareBatch({ id: org.id, role: 'USER' }, input(e.event.id, e.ticketType.id, 50));
    await drain(p.batchId, storage);

    const physical = await prisma.ticket.count({ where: { ticketTypeId: e.ticketType.id, ...PHYSICAL_ISSUED_WHERE } });
    const sold = await prisma.ticket.count({ where: { ticketTypeId: e.ticketType.id, ...ONLINE_SOLD_WHERE } });
    expect(physical).toBe(50);
    expect(sold).toBe(1);
    expect(sold * 5000).toBe(5000); // revenue basis: 1 online ticket, not 51

    // Scanning a physical ticket marks it used, and it is still not a sale.
    const first = await prisma.ticket.findFirstOrThrow({ where: { batchId: p.batchId }, orderBy: { batchIndex: 'asc' } });
    await prisma.ticket.update({ where: { id: first.id }, data: { status: 'USED', usedAt: new Date() } });
    expect(await prisma.ticket.count({ where: { ticketTypeId: e.ticketType.id, ...ONLINE_SOLD_WHERE } })).toBe(1);
    expect(await prisma.ticket.count({ where: { ticketTypeId: e.ticketType.id, source: 'ORGANIZER_PHYSICAL', status: 'USED' } })).toBe(1);
  });

  it('snapshots the scanner mode and code type on the batch, and cancelling releases PHYSICAL stock only', async () => {
    const e = await makeEvent(org, { onlineQty: 200, physicalQty: 60, price: 5000 });
    await prisma.eventScannerSettings.create({ data: { eventId: e.event.id, mode: 'INBUILT_ONLY' } });
    const p = await prepareBatch({ id: org.id, role: 'USER' }, input(e.event.id, e.ticketType.id, 10, { codeFormat: 'BARCODE' }));
    const batch = await prisma.ticketGenerationBatch.findUniqueOrThrow({ where: { id: p.batchId } });
    expect(batch).toMatchObject({ scannerMode: 'INBUILT_ONLY', codeFormat: 'BARCODE' });
    // Changing the event setting later does not rewrite what this batch was generated with.
    await prisma.eventScannerSettings.update({ where: { eventId: e.event.id }, data: { mode: 'UNIVERSAL' } });
    expect((await prisma.ticketGenerationBatch.findUniqueOrThrow({ where: { id: p.batchId } })).scannerMode).toBe('INBUILT_ONLY');
    expect(describeScan(batch.codeFormat, batch.scannerMode)).toBe('Barcode · MyEvent app scanner only');
    expect(describeScan('QR', 'UNIVERSAL')).toBe('QR code · Any scanner');
  });

  it('refuses when inventory is insufficient and never reserves partially', async () => {
    const small = await makeEvent(org, { ticketQty: 50 });
    await expect(prepareBatch({ id: org.id, role: 'USER' }, input(small.event.id, small.ticketType.id, 51))).rejects.toThrow(/Not enough/);
    expect((await prisma.ticketType.findUniqueOrThrow({ where: { id: small.ticketType.id } })).physicalQuantity).toBe(50);
  });

  describe('paid tier + Paystack settlement', () => {
    const paidQty = 1000; // ₦5,000 tier
    it('charges the server-calculated fee and creates NO tickets before payment', async () => {
      const p = await prepareBatch({ id: org.id, role: 'USER' }, input(ev.event.id, ev.ticketType.id, paidQty));
      expect(p.requiresPayment).toBe(true);
      expect(p.feeKobo).toBe(500_000);
      expect(p.status).toBe('PENDING_PAYMENT');
      const r = await processNextPart(p.batchId, { storage });
      expect(r.status).toBe('PENDING_PAYMENT'); // pending payments cannot generate
      expect(r.partsDone).toBe(0);
      expect(await prisma.ticket.count({ where: { batchId: p.batchId } })).toBe(0);
      const pay = await prisma.ticketGenerationPayment.findUniqueOrThrow({ where: { batchId: p.batchId } });
      expect(pay.amountKobo).toBe(500_000);
      expect(pay.organizerId).toBe(org.id);
      expect(pay.status).toBe('PENDING');
    });

    it('failed payment: no tickets, batch cancelled, inventory released', async () => {
      const p = await prepareBatch({ id: org.id, role: 'USER' }, input(ev.event.id, ev.ticketType.id, paidQty));
      const res = await settlePayment(p.paymentReference!, { status: 'failed', amountKobo: 0, currency: 'NGN' });
      expect(res.ok).toBe(false);
      expect((await prisma.ticketGenerationBatch.findUniqueOrThrow({ where: { id: p.batchId } })).status).toBe('CANCELLED');
      expect((await prisma.ticketType.findUniqueOrThrow({ where: { id: ev.ticketType.id } })).physicalQuantity).toBe(100_000);
      expect((await processNextPart(p.batchId, { storage })).partsDone).toBe(0);
      expect(await prisma.ticket.count({ where: { batchId: p.batchId } })).toBe(0);
      // releasing twice must not double-credit
      await settlePayment(p.paymentReference!, { status: 'failed', amountKobo: 0, currency: 'NGN' });
      await cancelUnpaidBatch(p.batchId);
      expect((await prisma.ticketType.findUniqueOrThrow({ where: { id: ev.ticketType.id } })).physicalQuantity).toBe(100_000);
    });

    it('wrong amount or currency is rejected and does not unlock generation', async () => {
      const p = await prepareBatch({ id: org.id, role: 'USER' }, input(ev.event.id, ev.ticketType.id, paidQty));
      expect(await settlePayment(p.paymentReference!, { status: 'success', amountKobo: 100, currency: 'NGN' })).toMatchObject({ ok: false, reason: 'AMOUNT_MISMATCH' });
      expect(await settlePayment(p.paymentReference!, { status: 'success', amountKobo: 500_000, currency: 'USD' })).toMatchObject({ ok: false, reason: 'CURRENCY_MISMATCH' });
      expect((await prisma.ticketGenerationBatch.findUniqueOrThrow({ where: { id: p.batchId } })).status).toBe('PENDING_PAYMENT');
      expect(await settlePayment('nope', { status: 'success', amountKobo: 1, currency: 'NGN' })).toMatchObject({ ok: false, reason: 'UNKNOWN_REFERENCE' });
    });

    it('verified success unlocks generation exactly once even when the webhook is delivered many times concurrently', async () => {
      const p = await prepareBatch({ id: org.id, role: 'USER' }, input(ev.event.id, ev.ticketType.id, paidQty));
      const ok = { status: 'success', amountKobo: 500_000, currency: 'NGN' };
      const results = await Promise.all(Array.from({ length: 8 }, () => settlePayment(p.paymentReference!, ok)));
      expect(results.every((r) => r.ok)).toBe(true);
      expect(results.filter((r) => r.ok && !r.alreadyProcessed)).toHaveLength(1); // exactly one winner
      expect((await prisma.ticketGenerationBatch.findUniqueOrThrow({ where: { id: p.batchId } })).status).toBe('READY');
      await drain(p.batchId, storage);
      await settlePayment(p.paymentReference!, ok); // late duplicate webhook after generation
      expect(await prisma.ticket.count({ where: { batchId: p.batchId } })).toBe(paidQty);
      expect(await prisma.ticketGenerationBatch.count({ where: { eventId: ev.event.id } })).toBe(1);
      const pay = await prisma.ticketGenerationPayment.findUniqueOrThrow({ where: { batchId: p.batchId } });
      expect(pay.status).toBe('COMPLETED');
      expect(pay.verifiedAmountKobo).toBe(500_000);
      expect(pay.paidAt).not.toBeNull();
    });

    it('admin-generated inventory is not billed and is marked ADMIN_PHYSICAL', async () => {
      const admin = await makeUser({ role: 'ADMIN', subRole: 'SUPER_ADMIN' });
      const p = await prepareBatch({ id: admin.id, role: 'ADMIN' }, input(ev.event.id, ev.ticketType.id, paidQty));
      expect(p.requiresPayment).toBe(false);
      await drain(p.batchId, storage);
      expect((await prisma.ticket.findFirstOrThrow({ where: { batchId: p.batchId } })).source).toBe('ADMIN_PHYSICAL');
    });
  });
});
