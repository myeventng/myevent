'use server';

import { hasEventEnded } from '@/lib/event-status';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { AccessDeniedError, listStaffEventIds, requireEventPermission, resolveEventAccess, can } from '@/lib/staff/access';
import {
  GenerationError,
  cancelUnpaidBatch,
  createBatchSchema,
  getActiveTiers,
  getBatchStats,
  prepareBatch,
  processNextPart,
  quoteQuantity,
  getMaxBatchQuantity,
  type CreateBatchInput,
} from '@/lib/ticket-generation/service';
import { BRANDED_LAYOUTS, CODES_ONLY_LAYOUTS } from '@/lib/ticket-generation/pdf';
import { PaystackError, initializeGenerationPayment, verifyAndSettleGeneration } from '@/lib/ticket-generation/paystack';
import { getPartStorage } from '@/lib/ticket-generation/storage';
import { checkRateLimit } from '@/lib/rate-limit';
import { formatNaira } from '@/lib/money';

type Result<T = undefined> = { success: true; data: T; message?: string } | { success: false; message: string };

async function currentActor() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new AccessDeniedError('Please sign in');
  return { session, actor: { id: session.user.id, role: session.user.role as string, email: session.user.email } };
}

const fail = (e: unknown): Result<never> => {
  if (e instanceof AccessDeniedError || e instanceof GenerationError || e instanceof PaystackError) return { success: false, message: e.message };
  if (e instanceof z.ZodError) return { success: false, message: e.issues[0]?.message ?? 'Invalid input' };
  console.error('ticket generation action error:', e);
  return { success: false, message: 'Something went wrong. Please try again.' };
};

async function limit(key: string, max: number, windowSec: number) {
  const r = await checkRateLimit(key, max, windowSec);
  if (!r.ok) throw new GenerationError('Too many requests. Please wait a moment and try again.', 'RATE_LIMIT');
}

/** Price + options for the generate form. Prices are advisory here; the server recomputes at creation. */
export async function getGenerationQuote(eventId: string, quantity: number): Promise<Result<{ feeKobo: number; feeLabel: string; isFree: boolean; tierLabel: string | null; max: number }>> {
  try {
    const { actor } = await currentActor();
    await requireEventPermission(actor, eventId, 'GENERATE_TICKETS');
    const q = await quoteQuantity(quantity);
    return { success: true, data: { feeKobo: q.feeKobo, feeLabel: q.isFree ? 'Free' : formatNaira(q.feeKobo), isFree: q.isFree, tierLabel: q.tierLabel, max: await getMaxBatchQuantity() } };
  } catch (e) {
    return fail(e);
  }
}

export async function getPublicPricingTiers() {
  const tiers = await getActiveTiers();
  return tiers.map((t) => ({ id: t.id, label: t.label, minQuantity: t.minQuantity, maxQuantity: t.maxQuantity, feeKobo: t.feeKobo }));
}

export async function getGenerateFormOptions(eventId: string): Promise<Result<{
  event: { id: string; title: string };
  eventEnded: boolean;
  ticketTypes: { id: string; name: string; available: number }[];
  defaults: { codeFormat: 'QR' | 'BARCODE'; design: 'BRANDED' | 'CODES_ONLY'; ticketsPerPage: number; showSerial: boolean; organizerLabel: string | null };
  layouts: { BRANDED: number[]; CODES_ONLY: number[] };
  tiers: Awaited<ReturnType<typeof getPublicPricingTiers>>;
  max: number;
}>> {
  try {
    const { actor } = await currentActor();
    const access = await requireEventPermission(actor, eventId, 'GENERATE_TICKETS');
    const [event, types, perEvent, general, tiers, max] = await Promise.all([
      prisma.event.findUnique({ where: { id: eventId }, select: { id: true, title: true, startDateTime: true, endDateTime: true } }),
      prisma.ticketType.findMany({ where: { eventId }, select: { id: true, name: true, quantity: true }, orderBy: { name: 'asc' } }),
      prisma.organizerTicketGenerationSettings.findFirst({ where: { organizerId: access.organizerId!, scopeKey: eventId } }),
      prisma.organizerTicketGenerationSettings.findFirst({ where: { organizerId: access.organizerId!, scopeKey: 'DEFAULT' } }),
      getPublicPricingTiers(),
      getMaxBatchQuantity(),
    ]);
    if (!event) return { success: false, message: 'Event not found' };
    const s = perEvent ?? general;
    return {
      success: true,
      data: {
        event: { id: event.id, title: event.title },
        eventEnded: hasEventEnded(event),
        ticketTypes: types.map((t) => ({ id: t.id, name: t.name, available: t.quantity })),
        defaults: { codeFormat: s?.codeFormat ?? 'QR', design: s?.design ?? 'BRANDED', ticketsPerPage: s?.ticketsPerPage ?? 4, showSerial: s?.showSerial ?? true, organizerLabel: s?.organizerLabel ?? null },
        layouts: { BRANDED: [...BRANDED_LAYOUTS], CODES_ONLY: [...CODES_ONLY_LAYOUTS] },
        tiers,
        max,
      },
    };
  } catch (e) {
    return fail(e);
  }
}

/**
 * Create a batch. Free tier → status READY immediately. Paid tier → PENDING_PAYMENT with a Paystack
 * checkout URL for the server-calculated amount. Generation only starts once payment is verified.
 */
export async function createGenerationBatch(input: CreateBatchInput): Promise<Result<{ batchId: string; requiresPayment: boolean; authorizationUrl?: string }>> {
  try {
    const { actor } = await currentActor();
    await limit(`gen:create:${actor.id}`, 10, 60);
    const parsed = createBatchSchema.parse(input);
    const prepared = await prepareBatch(actor, parsed);
    if (!prepared.requiresPayment) {
      revalidatePath(`/dashboard/events/${parsed.eventId}/tickets/generate`);
      return { success: true, data: { batchId: prepared.batchId, requiresPayment: false }, message: 'Batch created' };
    }
    try {
      const init = await initializeGenerationPayment({
        reference: prepared.paymentReference!,
        email: actor.email,
        amountKobo: prepared.feeKobo,
        metadata: { batchId: prepared.batchId, eventId: parsed.eventId, organizerId: prepared.organizerId, quantity: prepared.quantity },
      });
      return { success: true, data: { batchId: prepared.batchId, requiresPayment: true, authorizationUrl: init.authorizationUrl }, message: 'Redirecting to payment' };
    } catch (e) {
      await cancelUnpaidBatch(prepared.batchId); // release the reservation if checkout could not start
      throw e;
    }
  } catch (e) {
    return fail(e);
  }
}

async function batchForActor(batchId: string, actor: { id: string; role: string }) {
  const batch = await prisma.ticketGenerationBatch.findUnique({ where: { id: batchId }, include: { files: { orderBy: { partIndex: 'asc' } }, payment: true, event: { select: { title: true } }, ticketType: { select: { name: true } } } });
  if (!batch) throw new GenerationError('Batch not found', 'NOT_FOUND');
  // Visibility follows event access: owner, admin, or staff with GENERATE_TICKETS on this event.
  const access = await resolveEventAccess(actor, batch.eventId);
  if (!can(access, 'GENERATE_TICKETS')) throw new AccessDeniedError();
  return { batch, access };
}

/** Re-start checkout for a batch still awaiting payment (e.g. the user closed the Paystack tab). */
export async function resumeBatchPayment(batchId: string): Promise<Result<{ authorizationUrl: string }>> {
  try {
    const { actor } = await currentActor();
    await limit(`gen:pay:${actor.id}`, 10, 60);
    const { batch } = await batchForActor(batchId, actor);
    if (batch.status !== 'PENDING_PAYMENT' || !batch.payment) throw new GenerationError('This batch is not awaiting payment');
    // Paystack rejects a reused reference after an abandoned attempt, so check whether it was paid before anything else.
    const settled = await verifyAndSettleGeneration(batch.payment.reference).catch(() => null);
    if (settled?.ok) throw new GenerationError('Payment already received — generation will start now');
    const fresh = `${batch.payment.reference.split('_').slice(0, 2).join('_')}_${Date.now().toString(36)}`;
    await prisma.ticketGenerationPayment.update({ where: { id: batch.payment.id }, data: { reference: fresh } });
    const init = await initializeGenerationPayment({ reference: fresh, email: actor.email, amountKobo: batch.payment.amountKobo, metadata: { batchId, eventId: batch.eventId, organizerId: batch.organizerId, quantity: batch.quantity } });
    return { success: true, data: { authorizationUrl: init.authorizationUrl } };
  } catch (e) {
    return fail(e);
  }
}

/** Called after redirect from Paystack: verifies server-side, so it works even if the webhook is late. */
export async function confirmBatchPayment(batchId: string): Promise<Result<{ status: string }>> {
  try {
    const { actor } = await currentActor();
    const { batch } = await batchForActor(batchId, actor);
    if (batch.status === 'PENDING_PAYMENT' && batch.payment) await verifyAndSettleGeneration(batch.payment.reference).catch(() => null);
    const fresh = await prisma.ticketGenerationBatch.findUnique({ where: { id: batchId }, select: { status: true } });
    return { success: true, data: { status: fresh?.status ?? batch.status } };
  } catch (e) {
    return fail(e);
  }
}

/**
 * Drive generation forward by one part. The browser polls this (and a cron resumes anything abandoned),
 * so no single serverless invocation has to hold a large job.
 */
export async function advanceGeneration(batchId: string): Promise<Result<{ status: string; partsDone: number; partsTotal: number; done: boolean; busy: boolean; error?: string }>> {
  try {
    const { actor } = await currentActor();
    await limit(`gen:advance:${actor.id}`, 120, 60);
    await batchForActor(batchId, actor);
    const r = await processNextPart(batchId);
    return { success: true, data: { status: r.status, partsDone: r.partsDone, partsTotal: r.partsTotal, done: r.done, busy: r.busy, error: r.error } };
  } catch (e) {
    return fail(e);
  }
}

export async function cancelGenerationBatch(batchId: string): Promise<Result> {
  try {
    const { actor } = await currentActor();
    const { batch } = await batchForActor(batchId, actor);
    if (batch.status !== 'PENDING_PAYMENT') throw new GenerationError('Only unpaid batches can be cancelled');
    await cancelUnpaidBatch(batchId);
    revalidatePath(`/dashboard/events/${batch.eventId}/tickets/generate`);
    return { success: true, data: undefined, message: 'Batch cancelled' };
  } catch (e) {
    return fail(e);
  }
}

export async function listGenerationBatches(input: { eventId?: string; page?: number; pageSize?: number }) {
  try {
    const { actor } = await currentActor();
    const page = Math.max(1, input.page ?? 1);
    const pageSize = Math.min(50, Math.max(5, input.pageSize ?? 20));
    let where: Record<string, unknown>;
    if (input.eventId) {
      await requireEventPermission(actor, input.eventId, 'GENERATE_TICKETS');
      where = { eventId: input.eventId };
    } else if (actor.role === 'ADMIN') {
      where = {};
    } else {
      const staff = await listStaffEventIds(actor.id, 'GENERATE_TICKETS');
      where = { OR: [{ organizerId: actor.id }, { eventId: { in: staff.flatMap((s) => s.eventIds) } }] };
    }
    const [total, rows] = await Promise.all([
      prisma.ticketGenerationBatch.count({ where }),
      prisma.ticketGenerationBatch.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { event: { select: { id: true, title: true } }, ticketType: { select: { name: true } }, payment: { select: { status: true, amountKobo: true } } },
      }),
    ]);
    const stats = await Promise.all(rows.map((b) => getBatchStats(b.id)));
    return {
      success: true as const,
      data: {
        total,
        page,
        pageSize,
        batches: rows.map((b, i) => ({
          id: b.id,
          createdAt: b.createdAt.toISOString(),
          eventId: b.event.id,
          eventTitle: b.event.title,
          ticketType: b.ticketType.name,
          quantity: b.quantity,
          design: b.design,
          codeFormat: b.codeFormat,
          ticketsPerPage: b.ticketsPerPage,
          status: b.status,
          partsDone: b.partsDone,
          partsTotal: b.partsTotal,
          lastError: b.lastError,
          feeKobo: b.feeKobo,
          paymentStatus: b.payment?.status ?? null,
          stats: stats[i],
        })),
      },
    };
  } catch (e) {
    return fail(e);
  }
}

/** Short-lived signed link to one PDF part. Access is re-checked on every call. */
export async function getBatchDownloadLinks(batchId: string): Promise<Result<{ parts: { partIndex: number; url: string; fromIndex: number; toIndex: number; bytes: number }[] }>> {
  try {
    const { actor } = await currentActor();
    await limit(`gen:dl:${actor.id}`, 30, 60);
    const { batch } = await batchForActor(batchId, actor);
    if (batch.files.length === 0) throw new GenerationError('Nothing to download yet');
    const storage = getPartStorage();
    const parts = await Promise.all(batch.files.filter((f) => !!f.fileKey).map(async (f) => ({ partIndex: f.partIndex, fromIndex: f.fromIndex, toIndex: f.toIndex, bytes: f.bytes, url: await storage.signedUrl(f.fileKey as string, 300) })));
    return { success: true, data: { parts } };
  } catch (e) {
    return fail(e);
  }
}

/** Per-event organizer defaults for physical-ticket generation (organizer/admin only). */
const defaultsSchema = z.object({
  eventId: z.string().min(1).nullable(),
  codeFormat: z.enum(['QR', 'BARCODE']),
  design: z.enum(['BRANDED', 'CODES_ONLY']),
  ticketsPerPage: z.number().int(),
  showSerial: z.boolean(),
  organizerLabel: z.string().trim().max(80).nullable().optional(),
});

export async function saveGenerationDefaults(input: z.input<typeof defaultsSchema>): Promise<Result> {
  try {
    const { actor } = await currentActor();
    const v = defaultsSchema.parse(input);
    const { isValidLayout } = await import('@/lib/ticket-generation/pdf');
    if (!isValidLayout(v.design, v.ticketsPerPage)) throw new GenerationError(`${v.ticketsPerPage} per page is not available for this design`);
    let organizerId = actor.id;
    if (v.eventId) {
      const access = await resolveEventAccess(actor, v.eventId);
      if (!access || !(access.via === 'OWNER' || access.via === 'ADMIN')) throw new AccessDeniedError();
      organizerId = access.organizerId!;
    }
    const scopeKey = v.eventId ?? 'DEFAULT';
    const data = { codeFormat: v.codeFormat, design: v.design, ticketsPerPage: v.ticketsPerPage, showSerial: v.showSerial, organizerLabel: v.organizerLabel || null };
    await prisma.organizerTicketGenerationSettings.upsert({
      where: { organizerId_scopeKey: { organizerId, scopeKey } },
      update: data,
      create: { organizerId, eventId: v.eventId, scopeKey, ...data },
    });
    revalidatePath('/dashboard/settings/ticket-generation');
    return { success: true, data: undefined, message: 'Defaults saved' };
  } catch (e) {
    return fail(e);
  }
}
