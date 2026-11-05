import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '@/lib/prisma';
import { makeEvent, makeOrganizer, resetDb, resetVenueCache } from './helpers/db';
import {
  GENERAL_COMMISSION_SETTING_KEY, aggregateOrderFinancials, calculateCommissionForAmount, orderCommissionSnapshot, resolveCommission,
} from '@/lib/commission-service';

async function setGeneral(percent: number) {
  await prisma.platformSettings.upsert({ where: { key: GENERAL_COMMISSION_SETTING_KEY }, update: { value: percent }, create: { key: GENERAL_COMMISSION_SETTING_KEY, value: percent } });
}
async function rule(scope: 'EVENT' | 'ORGANIZER', targetId: string, bps: number, o: { startsAt?: Date; endsAt?: Date; isActive?: boolean } = {}) {
  return prisma.commissionRule.create({
    data: {
      scope, percentageBps: bps, startsAt: o.startsAt ?? null, endsAt: o.endsAt ?? null, isActive: o.isActive ?? true,
      ...(scope === 'EVENT' ? { events: { create: { eventId: targetId } } } : { organizers: { create: { organizerId: targetId } } }),
    },
  });
}

describe('commission resolution against the database', () => {
  beforeEach(async () => { await resetDb(); resetVenueCache(); });

  it('uses the admin-set general rate (no hardcoded value) and falls back to the seeded default only when unset', async () => {
    const org = await makeOrganizer(); const { event } = await makeEvent(org);
    expect((await resolveCommission({ eventId: event.id })).bps).toBe(1000); // migration-seeded default
    await setGeneral(7.5);
    const r = await resolveCommission({ eventId: event.id });
    expect(r.bps).toBe(750); expect(r.source).toBe('GENERAL');
  });

  it('event rule > organizer rule > general, and inactive / future / expired rules are ignored', async () => {
    const org = await makeOrganizer(); const { event } = await makeEvent(org);
    await setGeneral(10);
    await rule('ORGANIZER', org.id, 800);
    expect((await resolveCommission({ eventId: event.id })).source).toBe('ORGANIZER_RULE');
    await rule('EVENT', event.id, 300, { isActive: false });
    await rule('EVENT', event.id, 200, { startsAt: new Date(Date.now() + 86_400_000) });
    await rule('EVENT', event.id, 100, { endsAt: new Date(Date.now() - 86_400_000) });
    expect((await resolveCommission({ eventId: event.id })).bps).toBe(800);
    await rule('EVENT', event.id, 450);
    const r = await resolveCommission({ eventId: event.id });
    expect(r.bps).toBe(450); expect(r.source).toBe('EVENT_RULE');
  });

  it('a rule applies from its start date and stops at its end date (evaluated at the transaction time)', async () => {
    const org = await makeOrganizer(); const { event } = await makeEvent(org);
    await setGeneral(10);
    const start = new Date('2030-01-01T00:00:00Z'); const end = new Date('2030-02-01T00:00:00Z');
    await rule('ORGANIZER', org.id, 500, { startsAt: start, endsAt: end });
    expect((await resolveCommission({ eventId: event.id, at: new Date('2029-12-31T23:59:59Z') })).bps).toBe(1000);
    expect((await resolveCommission({ eventId: event.id, at: new Date('2030-01-15T00:00:00Z') })).bps).toBe(500);
    expect((await resolveCommission({ eventId: event.id, at: new Date('2030-02-02T00:00:00Z') })).bps).toBe(1000);
  });

  it('historical orders keep their stored commission when rates change later', async () => {
    const org = await makeOrganizer(); const { event } = await makeEvent(org);
    await setGeneral(10);
    const b = await calculateCommissionForAmount({ eventId: event.id, amountNaira: 10_000 });
    await prisma.order.create({ data: { paystackId: 'p1', totalAmount: 10_000, quantity: 1, paymentStatus: 'COMPLETED', eventId: event.id, ...orderCommissionSnapshot(b) } });
    await setGeneral(25);
    await rule('EVENT', event.id, 5000);
    const b2 = await calculateCommissionForAmount({ eventId: event.id, amountNaira: 10_000 });
    await prisma.order.create({ data: { paystackId: 'p2', totalAmount: 10_000, quantity: 1, paymentStatus: 'COMPLETED', eventId: event.id, ...orderCommissionSnapshot(b2) } });
    const o1 = await prisma.order.findUnique({ where: { paystackId: 'p1' } });
    expect(o1).toMatchObject({ platformFee: 1000, commissionBps: 1000, commissionSource: 'GENERAL', organizerProceeds: 9000 });
    const agg = await aggregateOrderFinancials({ eventId: event.id });
    expect(agg.feeNaira).toBe(1000 + 5000); // 10% (old) + 50% (new rule), not recomputed
    expect(agg.organizerEarningsNaira).toBe(20_000 - 6000);
  });

  it('refunding an order reverses that order’s own fee, not today’s rate', async () => {
    const org = await makeOrganizer(); const { event } = await makeEvent(org);
    await setGeneral(10);
    const b = await calculateCommissionForAmount({ eventId: event.id, amountNaira: 10_000 });
    await prisma.order.create({ data: { paystackId: 'r1', totalAmount: 10_000, quantity: 1, paymentStatus: 'COMPLETED', refundStatus: 'PROCESSED', eventId: event.id, ...orderCommissionSnapshot(b) } });
    await setGeneral(40);
    const agg = await aggregateOrderFinancials({ eventId: event.id });
    expect(agg.netRevenueNaira).toBe(0); expect(agg.netFeeNaira).toBe(0);
  });
});
