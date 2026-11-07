// What counts as "sold" for revenue and sales figures.
//
// Physical tickets (source ADMIN_PHYSICAL / ORGANIZER_PHYSICAL) are generated inventory: creating them
// is NOT a sale and must never add to tickets-sold or revenue. They are tracked separately (issued /
// scanned). Only ONLINE tickets that are still valid (unused or already scanned) count as sold.

export const SOLD_STATUSES = ['UNUSED', 'USED'] as const;

/** Prisma `where` fragment for tickets sold through the platform. */
export const ONLINE_SOLD_WHERE = {
  source: 'ONLINE' as const,
  status: { in: [...SOLD_STATUSES] },
};

/** Prisma `where` fragment for physical (pre-generated) tickets that are still valid. */
export const PHYSICAL_ISSUED_WHERE = {
  source: { in: ['ADMIN_PHYSICAL' as const, 'ORGANIZER_PHYSICAL' as const] },
  status: { in: [...SOLD_STATUSES] },
};
