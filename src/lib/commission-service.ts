// ─────────────────────────────────────────────────────────────────────────────
// THE single commission resolution service.
//
// Every financial calculation (order creation, voting, donations, reports,
// payouts, analytics) must obtain commission through this module. Nothing else
// in the codebase may derive a commission percentage on its own.
//
// Settings are read straight from the database (never from an in-memory cache)
// because Vercel functions run as independent instances: a cached value in one
// instance would keep applying a stale percentage after an admin changes it.
// ─────────────────────────────────────────────────────────────────────────────

import { prisma } from '@/lib/prisma';
import type { Prisma, PrismaClient } from '@/generated/prisma';
import { bpsToPercent, isValidBps, nairaToKobo, koboToNaira, percentToBps } from '@/lib/money';
import {
  computeCommission,
  resolveCommissionPure,
  type CommissionBreakdown,
  type ResolvedCommission,
} from '@/lib/commission/resolver';

export {
  computeCommission,
  isRuleEffective,
  pickEffectiveRule,
  resolveCommissionPure,
  windowsOverlap,
} from '@/lib/commission/resolver';
export type { CommissionBreakdown, ResolvedCommission } from '@/lib/commission/resolver';

type Db = PrismaClient | Prisma.TransactionClient;

export const GENERAL_COMMISSION_SETTING_KEY = 'financial.defaultPlatformFeePercentage';

/**
 * Bootstrap-only value, used SOLELY when the setting row does not exist yet
 * (fresh database before the migration seeded it). The migration inserts the
 * row with this value, so in any migrated database the DB value is the one
 * and only source of truth. This is the single place this number lives.
 */
export const BOOTSTRAP_GENERAL_COMMISSION_PERCENT = 10;

export async function getGeneralCommissionBps(db: Db = prisma): Promise<number> {
  const row = await db.platformSettings.findUnique({
    where: { key: GENERAL_COMMISSION_SETTING_KEY },
    select: { value: true },
  });
  const raw = row?.value;
  const percent =
    typeof raw === 'number' ? raw : typeof raw === 'string' ? Number(raw) : NaN;
  if (!Number.isFinite(percent)) return percentToBps(BOOTSTRAP_GENERAL_COMMISSION_PERCENT);
  const bps = percentToBps(percent);
  return isValidBps(bps) ? bps : percentToBps(BOOTSTRAP_GENERAL_COMMISSION_PERCENT);
}

export interface ResolveCommissionParams {
  eventId?: string | null;
  organizerId?: string | null;
  /** Transaction timestamp. Defaults to now. */
  at?: Date;
}

/**
 * Resolve the effective commission for an event/organizer at a point in time.
 * If only eventId is supplied the organizer is looked up from the event.
 */
export async function resolveCommission(
  params: ResolveCommissionParams,
  db: Db = prisma,
): Promise<ResolvedCommission> {
  const at = params.at ?? new Date();
  let organizerId = params.organizerId ?? null;

  if (!organizerId && params.eventId) {
    const ev = await db.event.findUnique({
      where: { id: params.eventId },
      select: { userId: true },
    });
    organizerId = ev?.userId ?? null;
  }

  const [eventRules, organizerRules, profile, generalBps] = await Promise.all([
    params.eventId
      ? db.commissionRule.findMany({
          where: { scope: 'EVENT', isActive: true, events: { some: { eventId: params.eventId } } },
        })
      : Promise.resolve([]),
    organizerId
      ? db.commissionRule.findMany({
          where: { scope: 'ORGANIZER', isActive: true, organizers: { some: { organizerId } } },
        })
      : Promise.resolve([]),
    organizerId
      ? db.organizerProfile.findUnique({
          where: { userId: organizerId },
          select: { customPlatformFee: true },
        })
      : Promise.resolve(null),
    getGeneralCommissionBps(db),
  ]);

  // Legacy per-organizer fee: previous code treated 0 as "unset" (falsy check).
  // A stored 0 has therefore never produced a 0% fee; preserve that behaviour.
  const legacy = profile?.customPlatformFee;
  const legacyOrganizerBps = legacy && legacy > 0 && percentToBps(legacy) <= 10_000 ? percentToBps(legacy) : null;

  return resolveCommissionPure({ at, eventRules, organizerRules, legacyOrganizerBps, generalBps });
}

/** Resolve + compute for an amount expressed in naira (rounded to kobo). */
export async function calculateCommissionForAmount(
  params: ResolveCommissionParams & { amountNaira: number },
  db: Db = prisma,
): Promise<CommissionBreakdown> {
  const resolved = await resolveCommission(params, db);
  return computeCommission(nairaToKobo(params.amountNaira), resolved);
}

/** Fields persisted on Order at creation — the historical financial record. */
export function orderCommissionSnapshot(breakdown: CommissionBreakdown) {
  return {
    platformFee: koboToNaira(breakdown.commissionKobo),
    commissionBps: breakdown.bps,
    commissionSource: breakdown.source,
    commissionRuleId: breakdown.ruleId,
    organizerProceeds: koboToNaira(breakdown.proceedsKobo),
  };
}

/**
 * For analytics over a set of historical orders: use the persisted fee when it
 * exists. Orders created before commission snapshots have `commissionBps ===
 * null`; their stored `platformFee` is still the amount that was actually
 * charged at the time, so it is used as-is — we never re-derive it from
 * today's settings.
 */
export function historicalPlatformFeeNaira(order: {
  platformFee: number | null;
}): number {
  return order.platformFee ?? 0;
}

export { bpsToPercent };

// ─── Aggregation over persisted order snapshots ───────────────────────────────
// Reporting never re-derives a fee from today's rates: it sums what each order
// recorded when it was created. A processed refund reverses that order's own
// recorded fee; the original order row is never altered.

export interface OrderFinancials {
  grossNaira: number;
  refundedNaira: number;
  netRevenueNaira: number;
  feeNaira: number;
  refundedFeeNaira: number;
  netFeeNaira: number;
  organizerEarningsNaira: number;
  /** Blended effective commission over the selection (null when no revenue). */
  effectivePercent: number | null;
}

export async function aggregateOrderFinancials(
  where: Prisma.OrderWhereInput = {},
  db: Db = prisma,
): Promise<OrderFinancials> {
  const [paid, refunded] = await Promise.all([
    db.order.aggregate({ where: { ...where, paymentStatus: 'COMPLETED' }, _sum: { totalAmount: true, platformFee: true } }),
    db.order.aggregate({ where: { ...where, refundStatus: 'PROCESSED' }, _sum: { totalAmount: true, platformFee: true } }),
  ]);
  const grossNaira = paid._sum.totalAmount ?? 0;
  const refundedNaira = refunded._sum.totalAmount ?? 0;
  const feeNaira = paid._sum.platformFee ?? 0;
  const refundedFeeNaira = refunded._sum.platformFee ?? 0;
  const netRevenueNaira = grossNaira - refundedNaira;
  const netFeeNaira = Math.max(0, feeNaira - refundedFeeNaira);
  return {
    grossNaira,
    refundedNaira,
    netRevenueNaira,
    feeNaira,
    refundedFeeNaira,
    netFeeNaira,
    organizerEarningsNaira: netRevenueNaira - netFeeNaira,
    effectivePercent: netRevenueNaira > 0 ? Math.round((netFeeNaira / netRevenueNaira) * 10_000) / 100 : null,
  };
}
