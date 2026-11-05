'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@/generated/prisma';
import { findCoverageGaps, findTierOverlap, validateTierShape } from '@/lib/ticket-generation/pricing';
import { nairaToKobo, koboToNaira } from '@/lib/money';

type Result<T = undefined> = { success: true; data: T; message?: string } | { success: false; message: string };

async function requireAdmin() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || session.user.role !== 'ADMIN') throw new Error('Unauthorized: Admin access required');
  return session;
}

const fail = (e: unknown, fallback = 'Something went wrong'): Result<never> => ({
  success: false,
  message: e instanceof Error && /^(Unauthorized|Tier|Overlap|Fee|Min|Max|Not found)/.test(e.message) ? e.message : fallback,
});

// ─── Pricing tiers ────────────────────────────────────────────────────────────

export async function listPricingTiers() {
  try {
    await requireAdmin();
    const tiers = await prisma.ticketGenerationPricingTier.findMany({ orderBy: { minQuantity: 'asc' } });
    const gaps = findCoverageGaps(tiers.filter((t) => t.isActive));
    return {
      success: true as const,
      data: {
        tiers: tiers.map((t) => ({ id: t.id, label: t.label, minQuantity: t.minQuantity, maxQuantity: t.maxQuantity, feeNaira: koboToNaira(t.feeKobo), isActive: t.isActive, updatedAt: t.updatedAt.toISOString() })),
        gaps,
      },
    };
  } catch (e) {
    return fail(e);
  }
}

const tierSchema = z.object({
  label: z.string().trim().max(80).optional().nullable(),
  minQuantity: z.number().int().min(1),
  maxQuantity: z.number().int().min(1).nullable(),
  feeNaira: z.number().finite().min(0).max(1_000_000_000),
  isActive: z.boolean().default(true),
});

async function saveTier(id: string | null, input: z.input<typeof tierSchema>): Promise<Result<{ id: string }>> {
  try {
    const session = await requireAdmin();
    const v = tierSchema.safeParse(input);
    if (!v.success) return { success: false, message: v.error.issues[0].message };
    const feeKobo = nairaToKobo(v.data.feeNaira);
    const shapeErr = validateTierShape({ minQuantity: v.data.minQuantity, maxQuantity: v.data.maxQuantity, feeKobo, isActive: v.data.isActive });
    if (shapeErr) return { success: false, message: shapeErr };

    const saved = await prisma.$transaction(
      async (tx) => {
        const others = await tx.ticketGenerationPricingTier.findMany({ select: { id: true, minQuantity: true, maxQuantity: true, isActive: true, label: true } });
        const overlap = findTierOverlap({ id: id ?? undefined, minQuantity: v.data.minQuantity, maxQuantity: v.data.maxQuantity, feeKobo, isActive: v.data.isActive }, others);
        if (overlap) throw new Error(`Overlap: ${overlap}`);
        const data = { label: v.data.label || null, minQuantity: v.data.minQuantity, maxQuantity: v.data.maxQuantity, feeKobo, isActive: v.data.isActive, updatedById: session.user.id };
        const row = id ? await tx.ticketGenerationPricingTier.update({ where: { id }, data }) : await tx.ticketGenerationPricingTier.create({ data });
        await tx.auditLog.create({ data: { userId: session.user.id, action: id ? 'UPDATE' : 'CREATE', entity: 'TICKET_GENERATION_TIER', entityId: row.id, newValues: data as object } });
        return row;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    revalidatePath('/admin/dashboard/settings');
    return { success: true, data: { id: saved.id }, message: id ? 'Tier updated. Batches already created keep the price they were quoted.' : 'Tier created' };
  } catch (e) {
    return fail(e, 'Failed to save tier');
  }
}

export const createPricingTier = async (input: z.input<typeof tierSchema>) => saveTier(null, input);
export const updatePricingTier = async (id: string, input: z.input<typeof tierSchema>) => saveTier(id, input);

export async function deletePricingTier(id: string): Promise<Result> {
  try {
    const session = await requireAdmin();
    // Payments/batches reference tiers with ON DELETE SET NULL and snapshot the label/amount, so history is safe.
    await prisma.$transaction([
      prisma.ticketGenerationPricingTier.delete({ where: { id } }),
      prisma.auditLog.create({ data: { userId: session.user.id, action: 'DELETE', entity: 'TICKET_GENERATION_TIER', entityId: id } }),
    ]);
    revalidatePath('/admin/dashboard/settings');
    return { success: true, data: undefined, message: 'Tier deleted' };
  } catch (e) {
    return fail(e, 'Failed to delete tier');
  }
}

// ─── Generation payments report ───────────────────────────────────────────────

const filterSchema = z.object({
  status: z.enum(['ALL', 'PENDING', 'COMPLETED', 'FAILED', 'REFUNDED']).default('ALL'),
  search: z.string().trim().max(100).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(5).max(100).default(20),
});
export type PaymentFilters = z.input<typeof filterSchema>;

function buildWhere(f: z.infer<typeof filterSchema>): Prisma.TicketGenerationPaymentWhereInput {
  const and: Prisma.TicketGenerationPaymentWhereInput[] = [];
  if (f.status !== 'ALL') and.push({ status: f.status as never });
  if (f.from) and.push({ createdAt: { gte: f.from } });
  if (f.to) and.push({ createdAt: { lte: f.to } });
  if (f.search) {
    const s = { contains: f.search, mode: 'insensitive' as const };
    and.push({ OR: [{ reference: s }, { organizer: { OR: [{ name: s }, { email: s }] } }, { batch: { event: { title: s } } }] });
  }
  return { AND: and };
}

const paymentInclude = {
  organizer: { select: { id: true, name: true, email: true } },
  batch: { select: { id: true, status: true, quantity: true, event: { select: { id: true, title: true } } } },
} as const;

export async function listGenerationPayments(input: PaymentFilters) {
  try {
    await requireAdmin();
    const f = filterSchema.parse(input);
    const where = buildWhere(f);
    const [total, rows, revenue] = await Promise.all([
      prisma.ticketGenerationPayment.count({ where }),
      prisma.ticketGenerationPayment.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (f.page - 1) * f.pageSize, take: f.pageSize, include: paymentInclude }),
      prisma.ticketGenerationPayment.aggregate({ where: { AND: [where, { status: 'COMPLETED' }] }, _sum: { verifiedAmountKobo: true }, _count: true }),
    ]);
    return {
      success: true as const,
      data: {
        total,
        page: f.page,
        pageSize: f.pageSize,
        // Revenue is over the FILTERED set, completed payments only, using the Paystack-verified amount.
        revenueNaira: koboToNaira(revenue._sum.verifiedAmountKobo ?? 0),
        completedCount: revenue._count,
        payments: rows.map((p) => ({
          id: p.id,
          reference: p.reference,
          createdAt: p.createdAt.toISOString(),
          paidAt: p.paidAt?.toISOString() ?? null,
          organizer: p.organizer,
          eventId: p.batch.event.id,
          eventTitle: p.batch.event.title,
          batchId: p.batchId,
          batchStatus: p.batch.status,
          quantity: p.quantity,
          tier: p.pricingTierLabel,
          amountNaira: koboToNaira(p.amountKobo),
          verifiedNaira: p.verifiedAmountKobo === null ? null : koboToNaira(p.verifiedAmountKobo),
          status: p.status,
          note: p.failureReason,
        })),
      },
    };
  } catch (e) {
    return fail(e, 'Failed to load payments');
  }
}

const csvCell = (v: unknown) => {
  let s = v === null || v === undefined ? '' : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`; // neutralise spreadsheet formula injection
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** CSV for the current filters (all pages, capped at 50k rows). */
export async function exportGenerationPaymentsCsv(input: Omit<PaymentFilters, 'page' | 'pageSize'>): Promise<Result<{ filename: string; csv: string }>> {
  try {
    await requireAdmin();
    const f = filterSchema.parse({ ...input, page: 1, pageSize: 100 });
    const rows = await prisma.ticketGenerationPayment.findMany({ where: buildWhere(f), orderBy: { createdAt: 'desc' }, take: 50_000, include: paymentInclude });
    const header = ['Reference', 'Created', 'Paid at', 'Organizer', 'Organizer email', 'Event', 'Batch', 'Quantity', 'Pricing tier', 'Amount (NGN)', 'Verified amount (NGN)', 'Status', 'Note'];
    const lines = rows.map((p) =>
      [p.reference, p.createdAt.toISOString(), p.paidAt?.toISOString() ?? '', p.organizer.name, p.organizer.email, p.batch.event.title, p.batchId, p.quantity, p.pricingTierLabel, koboToNaira(p.amountKobo), p.verifiedAmountKobo === null ? '' : koboToNaira(p.verifiedAmountKobo), p.status, p.failureReason].map(csvCell).join(','),
    );
    return { success: true, data: { filename: `ticket-generation-payments-${new Date().toISOString().slice(0, 10)}.csv`, csv: [header.join(','), ...lines].join('\n') } };
  } catch (e) {
    return fail(e, 'Failed to export');
  }
}
