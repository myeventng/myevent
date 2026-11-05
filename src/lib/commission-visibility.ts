// Commission *visibility* (display only). Hiding a commission from an
// interface never removes it: calculation, persistence and payouts are
// unaffected, and the amounts a customer is charged / an organizer is paid
// are always accurate. Visibility only controls whether the commission line
// (amount, percentage, rule source) is rendered in a given interface.

import { prisma } from '@/lib/prisma';
import type { Prisma, PrismaClient } from '@/generated/prisma';

type Db = PrismaClient | Prisma.TransactionClient;

export const COMMISSION_VISIBILITY_KEYS = {
  checkout: 'commission.visibility.checkout',
  organizerDashboard: 'commission.visibility.organizerDashboard',
  customerFacing: 'commission.visibility.customerFacing',
} as const;

export interface CommissionVisibility {
  /** Public ticket booking & checkout. */
  checkout: boolean;
  /** Organizer financial dashboard / analytics. */
  organizerDashboard: boolean;
  /** Other customer-facing financial displays (receipts, emails, order pages). */
  customerFacing: boolean;
}

export const DEFAULT_COMMISSION_VISIBILITY: CommissionVisibility = {
  checkout: true,
  organizerDashboard: true,
  customerFacing: true,
};

export async function getCommissionVisibility(db: Db = prisma): Promise<CommissionVisibility> {
  const rows = await db.platformSettings.findMany({
    where: { key: { in: Object.values(COMMISSION_VISIBILITY_KEYS) } },
    select: { key: true, value: true },
  });
  const map = new Map(rows.map((r) => [r.key, r.value]));
  const read = (key: string, fallback: boolean) => {
    const v = map.get(key);
    return typeof v === 'boolean' ? v : fallback;
  };
  return {
    checkout: read(COMMISSION_VISIBILITY_KEYS.checkout, DEFAULT_COMMISSION_VISIBILITY.checkout),
    organizerDashboard: read(
      COMMISSION_VISIBILITY_KEYS.organizerDashboard,
      DEFAULT_COMMISSION_VISIBILITY.organizerDashboard,
    ),
    customerFacing: read(
      COMMISSION_VISIBILITY_KEYS.customerFacing,
      DEFAULT_COMMISSION_VISIBILITY.customerFacing,
    ),
  };
}
