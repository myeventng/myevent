'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@/generated/prisma';
import {
  BOOTSTRAP_GENERAL_COMMISSION_PERCENT,
  GENERAL_COMMISSION_SETTING_KEY,
  bpsToPercent,
  computeCommission,
  getGeneralCommissionBps,
  windowsOverlap,
} from '@/lib/commission-service';
import { clearSettingsCache } from '@/lib/platform-settings';
import { COMMISSION_VISIBILITY_KEYS, getCommissionVisibility, type CommissionVisibility } from '@/lib/commission-visibility';
import { isValidBps, nairaToKobo, percentToBps, koboToNaira } from '@/lib/money';

type Result<T = undefined> = { success: true; data: T; message?: string } | { success: false; message: string; fieldErrors?: Record<string, string> };

async function requireAdmin() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || session.user.role !== 'ADMIN') throw new Error('Unauthorized: Admin access required');
  return session;
}

const fail = (e: unknown, fallback: string): Result<never> => ({
  success: false,
  message: e instanceof Error && /^(Unauthorized|Rule|Conflict|Not found)/.test(e.message) ? e.message : fallback,
});

// ─── General commission ───────────────────────────────────────────────────────

const percentSchema = z
  .number({ invalid_type_error: 'Enter a percentage' })
  .finite()
  .min(0, 'Commission cannot be negative')
  .max(100, 'Commission cannot exceed 100%')
  .refine((n) => Math.abs(n * 100 - Math.round(n * 100)) < 1e-9, 'Use at most 2 decimal places');

export async function getGeneralCommissionSettings(): Promise<Result<{ percentage: number; bps: number; isConfigured: boolean; visibility: CommissionVisibility; updatedAt: string | null }>> {
  try {
    await requireAdmin();
    const [bps, row, visibility] = await Promise.all([
      getGeneralCommissionBps(),
      prisma.platformSettings.findUnique({ where: { key: GENERAL_COMMISSION_SETTING_KEY }, select: { updatedAt: true } }),
      getCommissionVisibility(),
    ]);
    return { success: true, data: { percentage: bpsToPercent(bps), bps, isConfigured: !!row, visibility, updatedAt: row?.updatedAt?.toISOString() ?? null } };
  } catch (e) {
    return fail(e, 'Failed to load commission settings');
  }
}

export async function updateGeneralCommission(input: { percentage: number }): Promise<Result<{ percentage: number }>> {
  try {
    const session = await requireAdmin();
    const parsed = percentSchema.safeParse(input?.percentage);
    if (!parsed.success) return { success: false, message: parsed.error.issues[0].message, fieldErrors: { percentage: parsed.error.issues[0].message } };
    const bps = percentToBps(parsed.data);
    if (!isValidBps(bps)) return { success: false, message: 'Invalid commission' };

    const before = bpsToPercent(await getGeneralCommissionBps());
    await prisma.$transaction([
      prisma.platformSettings.upsert({
        where: { key: GENERAL_COMMISSION_SETTING_KEY },
        update: { value: parsed.data },
        create: { key: GENERAL_COMMISSION_SETTING_KEY, value: parsed.data },
      }),
      prisma.auditLog.create({
        data: { userId: session.user.id, action: 'UPDATE', entity: 'GENERAL_COMMISSION', oldValues: { percentage: before }, newValues: { percentage: parsed.data } },
      }),
    ]);
    clearSettingsCache(GENERAL_COMMISSION_SETTING_KEY);
    revalidatePath('/admin/dashboard/settings');
    return { success: true, data: { percentage: parsed.data }, message: 'Default commission updated. It applies to new orders only; existing orders keep the rate they were created with.' };
  } catch (e) {
    return fail(e, 'Failed to update commission');
  }
}

/** Pure arithmetic preview for the settings page (nothing is saved). */
export async function previewCommission(input: { percentage: number; amountNaira: number }): Promise<Result<{ commission: number; proceeds: number; percentage: number }>> {
  try {
    await requireAdmin();
    const pct = percentSchema.safeParse(input?.percentage);
    const amt = z.number().finite().min(0).max(1_000_000_000).safeParse(input?.amountNaira);
    if (!pct.success || !amt.success) return { success: false, message: 'Enter a valid percentage (0–100) and amount' };
    const b = computeCommission(nairaToKobo(amt.data), { bps: percentToBps(pct.data), source: 'GENERAL', ruleId: null });
    return { success: true, data: { commission: koboToNaira(b.commissionKobo), proceeds: koboToNaira(b.proceedsKobo), percentage: pct.data } };
  } catch (e) {
    return fail(e, 'Failed to compute preview');
  }
}

export async function updateCommissionVisibility(input: CommissionVisibility): Promise<Result<CommissionVisibility>> {
  try {
    const session = await requireAdmin();
    const v = z.object({ checkout: z.boolean(), organizerDashboard: z.boolean(), customerFacing: z.boolean() }).safeParse(input);
    if (!v.success) return { success: false, message: 'Invalid visibility settings' };
    const before = await getCommissionVisibility();
    await prisma.$transaction([
      ...(Object.keys(COMMISSION_VISIBILITY_KEYS) as (keyof CommissionVisibility)[]).map((k) =>
        prisma.platformSettings.upsert({
          where: { key: COMMISSION_VISIBILITY_KEYS[k] },
          update: { value: v.data[k] },
          create: { key: COMMISSION_VISIBILITY_KEYS[k], value: v.data[k] },
        }),
      ),
      prisma.auditLog.create({ data: { userId: session.user.id, action: 'UPDATE', entity: 'COMMISSION_VISIBILITY', oldValues: before as object, newValues: v.data } }),
    ]);
    revalidatePath('/admin/dashboard/settings');
    return { success: true, data: v.data, message: 'Visibility updated. Commission is still calculated and recorded everywhere.' };
  } catch (e) {
    return fail(e, 'Failed to update visibility');
  }
}

// ─── Commission rules ─────────────────────────────────────────────────────────

const ruleSchema = z
  .object({
    scope: z.enum(['ORGANIZER', 'EVENT']),
    name: z.string().trim().max(120).optional().nullable(),
    percentage: percentSchema,
    startsAt: z.coerce.date().optional().nullable(),
    endsAt: z.coerce.date().optional().nullable(),
    isActive: z.boolean().default(true),
    note: z.string().trim().max(500).optional().nullable(),
    targetIds: z.array(z.string().min(1)).min(1, 'Select at least one target').max(500),
  })
  .refine((r) => !r.startsAt || !r.endsAt || r.endsAt > r.startsAt, { message: 'End date must be after the start date', path: ['endsAt'] });

export type RuleInput = Omit<z.input<typeof ruleSchema>, 'startsAt' | 'endsAt'> & {
  startsAt?: string | Date | null;
  endsAt?: string | Date | null;
};

async function findConflicts(
  tx: Prisma.TransactionClient,
  r: { scope: 'ORGANIZER' | 'EVENT'; startsAt: Date | null; endsAt: Date | null; targetIds: string[] },
  excludeRuleId?: string,
) {
  const rules = await tx.commissionRule.findMany({
    where: {
      scope: r.scope,
      isActive: true,
      ...(excludeRuleId ? { id: { not: excludeRuleId } } : {}),
      ...(r.scope === 'ORGANIZER' ? { organizers: { some: { organizerId: { in: r.targetIds } } } } : { events: { some: { eventId: { in: r.targetIds } } } }),
    },
    include: { organizers: { select: { organizerId: true } }, events: { select: { eventId: true } } },
  });
  return rules
    .filter((x) => windowsOverlap({ startsAt: x.startsAt, endsAt: x.endsAt }, { startsAt: r.startsAt, endsAt: r.endsAt }))
    .map((x) => ({
      id: x.id,
      name: x.name,
      percentage: bpsToPercent(x.percentageBps),
      targets: (r.scope === 'ORGANIZER' ? x.organizers.map((o) => o.organizerId) : x.events.map((e) => e.eventId)).filter((id) => r.targetIds.includes(id)),
    }));
}

const conflictMessage = (c: { name: string | null; percentage: number }[]) =>
  `Conflict: ${c.length} active rule(s) already cover these targets in an overlapping period (${c.map((x) => x.name || `${x.percentage}%`).join(', ')}). Change the dates or deactivate the existing rule first.`;

async function validateTargets(tx: Prisma.TransactionClient, scope: 'ORGANIZER' | 'EVENT', ids: string[]) {
  const unique = [...new Set(ids)];
  const found =
    scope === 'ORGANIZER'
      ? await tx.user.count({ where: { id: { in: unique }, OR: [{ subRole: 'ORGANIZER' }, { organizerProfile: { isNot: null } }] } })
      : await tx.event.count({ where: { id: { in: unique } } });
  if (found !== unique.length) throw new Error('Rule targets include unknown organizers or events');
  return unique;
}

export async function createCommissionRule(input: RuleInput): Promise<Result<{ id: string }>> {
  try {
    const session = await requireAdmin();
    const parsed = ruleSchema.safeParse(input);
    if (!parsed.success) {
      const i = parsed.error.issues[0];
      return { success: false, message: i.message, fieldErrors: { [String(i.path[0] ?? 'form')]: i.message } };
    }
    const d = parsed.data;
    const bps = percentToBps(d.percentage);

    const id = await prisma.$transaction(
      async (tx) => {
        const targets = await validateTargets(tx, d.scope, d.targetIds);
        if (d.isActive) {
          const conflicts = await findConflicts(tx, { scope: d.scope, startsAt: d.startsAt ?? null, endsAt: d.endsAt ?? null, targetIds: targets });
          if (conflicts.length) throw new Error(conflictMessage(conflicts));
        }
        const rule = await tx.commissionRule.create({
          data: {
            name: d.name || null,
            scope: d.scope,
            percentageBps: bps,
            startsAt: d.startsAt ?? null,
            endsAt: d.endsAt ?? null,
            isActive: d.isActive,
            note: d.note || null,
            createdById: session.user.id,
            updatedById: session.user.id,
            ...(d.scope === 'ORGANIZER'
              ? { organizers: { create: targets.map((organizerId) => ({ organizerId })) } }
              : { events: { create: targets.map((eventId) => ({ eventId })) } }),
          },
        });
        await tx.auditLog.create({
          data: { userId: session.user.id, action: 'CREATE', entity: 'COMMISSION_RULE', entityId: rule.id, newValues: { ...d, percentageBps: bps, targetIds: targets } as object },
        });
        return rule.id;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    revalidatePath('/admin/dashboard/commissions');
    return { success: true, data: { id }, message: 'Commission rule created' };
  } catch (e) {
    return fail(e, 'Failed to create rule');
  }
}

export async function updateCommissionRule(ruleId: string, input: RuleInput): Promise<Result<{ id: string }>> {
  try {
    const session = await requireAdmin();
    const parsed = ruleSchema.safeParse(input);
    if (!parsed.success) {
      const i = parsed.error.issues[0];
      return { success: false, message: i.message, fieldErrors: { [String(i.path[0] ?? 'form')]: i.message } };
    }
    const d = parsed.data;
    const bps = percentToBps(d.percentage);

    await prisma.$transaction(
      async (tx) => {
        const existing = await tx.commissionRule.findUnique({
          where: { id: ruleId },
          include: { organizers: { select: { organizerId: true } }, events: { select: { eventId: true } } },
        });
        if (!existing) throw new Error('Not found: rule does not exist');
        if (existing.scope !== d.scope) throw new Error('Rule scope cannot be changed; create a new rule instead');
        const targets = await validateTargets(tx, d.scope, d.targetIds);
        if (d.isActive) {
          const conflicts = await findConflicts(tx, { scope: d.scope, startsAt: d.startsAt ?? null, endsAt: d.endsAt ?? null, targetIds: targets }, ruleId);
          if (conflicts.length) throw new Error(conflictMessage(conflicts));
        }
        await tx.commissionRule.update({
          where: { id: ruleId },
          data: { name: d.name || null, percentageBps: bps, startsAt: d.startsAt ?? null, endsAt: d.endsAt ?? null, isActive: d.isActive, note: d.note || null, updatedById: session.user.id },
        });
        if (d.scope === 'ORGANIZER') {
          await tx.commissionRuleOrganizer.deleteMany({ where: { ruleId } });
          await tx.commissionRuleOrganizer.createMany({ data: targets.map((organizerId) => ({ ruleId, organizerId })) });
        } else {
          await tx.commissionRuleEvent.deleteMany({ where: { ruleId } });
          await tx.commissionRuleEvent.createMany({ data: targets.map((eventId) => ({ ruleId, eventId })) });
        }
        await tx.auditLog.create({
          data: {
            userId: session.user.id,
            action: 'UPDATE',
            entity: 'COMMISSION_RULE',
            entityId: ruleId,
            oldValues: { name: existing.name, percentageBps: existing.percentageBps, startsAt: existing.startsAt, endsAt: existing.endsAt, isActive: existing.isActive, targetIds: existing.scope === 'ORGANIZER' ? existing.organizers.map((o) => o.organizerId) : existing.events.map((x) => x.eventId) } as object,
            newValues: { ...d, percentageBps: bps, targetIds: targets } as object,
          },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    revalidatePath('/admin/dashboard/commissions');
    return { success: true, data: { id: ruleId }, message: 'Commission rule updated. Existing orders are unchanged.' };
  } catch (e) {
    return fail(e, 'Failed to update rule');
  }
}

export async function setCommissionRuleActive(ruleId: string, isActive: boolean): Promise<Result> {
  try {
    const session = await requireAdmin();
    await prisma.$transaction(
      async (tx) => {
        const rule = await tx.commissionRule.findUnique({
          where: { id: ruleId },
          include: { organizers: { select: { organizerId: true } }, events: { select: { eventId: true } } },
        });
        if (!rule) throw new Error('Not found: rule does not exist');
        if (isActive && !rule.isActive) {
          const targetIds = rule.scope === 'ORGANIZER' ? rule.organizers.map((o) => o.organizerId) : rule.events.map((e) => e.eventId);
          const conflicts = await findConflicts(tx, { scope: rule.scope, startsAt: rule.startsAt, endsAt: rule.endsAt, targetIds }, ruleId);
          if (conflicts.length) throw new Error(conflictMessage(conflicts));
        }
        await tx.commissionRule.update({ where: { id: ruleId }, data: { isActive, updatedById: session.user.id } });
        await tx.auditLog.create({
          data: { userId: session.user.id, action: isActive ? 'ACTIVATE' : 'DEACTIVATE', entity: 'COMMISSION_RULE', entityId: ruleId, oldValues: { isActive: rule.isActive }, newValues: { isActive } },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    revalidatePath('/admin/dashboard/commissions');
    return { success: true, data: undefined, message: isActive ? 'Rule activated' : 'Rule deactivated' };
  } catch (e) {
    return fail(e, 'Failed to change rule status');
  }
}

export async function deleteCommissionRule(ruleId: string): Promise<Result> {
  try {
    const session = await requireAdmin();
    const rule = await prisma.commissionRule.findUnique({ where: { id: ruleId } });
    if (!rule) return { success: false, message: 'Rule not found' };
    // Orders keep their own snapshot (commissionBps/commissionRuleId is a plain string, not an FK), so deleting is safe.
    await prisma.$transaction([
      prisma.commissionRule.delete({ where: { id: ruleId } }),
      prisma.auditLog.create({ data: { userId: session.user.id, action: 'DELETE', entity: 'COMMISSION_RULE', entityId: ruleId, oldValues: { name: rule.name, scope: rule.scope, percentageBps: rule.percentageBps, isActive: rule.isActive } } }),
    ]);
    revalidatePath('/admin/dashboard/commissions');
    return { success: true, data: undefined, message: 'Rule deleted. Past orders keep the commission they were charged.' };
  } catch (e) {
    return fail(e, 'Failed to delete rule');
  }
}

const listSchema = z.object({
  scope: z.enum(['ORGANIZER', 'EVENT']),
  search: z.string().trim().max(100).optional(),
  status: z.enum(['all', 'active', 'inactive', 'scheduled', 'expired']).default('all'),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(5).max(100).default(20),
});

export async function listCommissionRules(input: z.input<typeof listSchema>) {
  try {
    await requireAdmin();
    const q = listSchema.parse(input);
    const now = new Date();
    const and: Prisma.CommissionRuleWhereInput[] = [];
    if (q.status === 'active') and.push({ isActive: true, OR: [{ startsAt: null }, { startsAt: { lte: now } }], AND: [{ OR: [{ endsAt: null }, { endsAt: { gt: now } }] }] });
    if (q.status === 'inactive') and.push({ isActive: false });
    if (q.status === 'scheduled') and.push({ isActive: true, startsAt: { gt: now } });
    if (q.status === 'expired') and.push({ endsAt: { lte: now } });
    if (q.search) {
      const s = { contains: q.search, mode: 'insensitive' as const };
      and.push({
        OR: [
          { name: s },
          ...(q.scope === 'ORGANIZER'
            ? [{ organizers: { some: { organizer: { OR: [{ name: s }, { email: s }] } } } }]
            : [{ events: { some: { event: { OR: [{ title: s }, { slug: s }] } } } }]),
        ],
      });
    }
    const where: Prisma.CommissionRuleWhereInput = { scope: q.scope, AND: and };
    const [total, rows] = await Promise.all([
      prisma.commissionRule.count({ where }),
      prisma.commissionRule.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
        include: {
          organizers: { select: { organizer: { select: { id: true, name: true, email: true } } } },
          events: { select: { event: { select: { id: true, title: true, slug: true } } } },
          createdBy: { select: { name: true } },
          updatedBy: { select: { name: true } },
        },
      }),
    ]);
    return {
      success: true as const,
      data: {
        total,
        page: q.page,
        pageSize: q.pageSize,
        rules: rows.map((r) => ({
          id: r.id,
          name: r.name,
          scope: r.scope,
          percentage: bpsToPercent(r.percentageBps),
          startsAt: r.startsAt?.toISOString() ?? null,
          endsAt: r.endsAt?.toISOString() ?? null,
          isActive: r.isActive,
          note: r.note,
          organizers: r.organizers.map((o) => o.organizer),
          events: r.events.map((e) => e.event),
          createdBy: r.createdBy?.name ?? null,
          updatedBy: r.updatedBy?.name ?? null,
          createdAt: r.createdAt.toISOString(),
          updatedAt: r.updatedAt.toISOString(),
        })),
      },
    };
  } catch (e) {
    return fail(e, 'Failed to load rules');
  }
}

export async function getCommissionRuleAudit(ruleId: string) {
  try {
    await requireAdmin();
    const logs = await prisma.auditLog.findMany({
      where: { entity: 'COMMISSION_RULE', entityId: ruleId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { user: { select: { name: true, email: true } } },
    });
    return { success: true as const, data: logs.map((l) => ({ id: l.id, at: l.createdAt.toISOString(), action: l.action, by: l.user?.name ?? l.user?.email ?? 'System', oldValues: l.oldValues, newValues: l.newValues })) };
  } catch (e) {
    return fail(e, 'Failed to load audit trail');
  }
}

// Pickers for the rule form
export async function searchCommissionTargets(input: { scope: 'ORGANIZER' | 'EVENT'; query: string }) {
  try {
    await requireAdmin();
    const query = z.string().trim().min(1).max(100).safeParse(input.query);
    if (!query.success) return { success: true as const, data: [] as { id: string; label: string; sub: string }[] };
    const s = { contains: query.data, mode: 'insensitive' as const };
    if (input.scope === 'ORGANIZER') {
      const u = await prisma.user.findMany({
        where: { AND: [{ OR: [{ subRole: 'ORGANIZER' }, { organizerProfile: { isNot: null } }] }, { OR: [{ name: s }, { email: s }] }] },
        select: { id: true, name: true, email: true },
        take: 15,
      });
      return { success: true as const, data: u.map((x) => ({ id: x.id, label: x.name ?? x.email, sub: x.email })) };
    }
    const ev = await prisma.event.findMany({ where: { OR: [{ title: s }, { slug: s }] }, select: { id: true, title: true, user: { select: { name: true } } }, take: 15 });
    return { success: true as const, data: ev.map((x) => ({ id: x.id, label: x.title, sub: x.user?.name ?? '' })) };
  } catch (e) {
    return fail(e, 'Search failed');
  }
}

/** Visibility flags for any signed-in user (read-only; used by organizer-facing UI to hide fee lines). */
export async function getMyCommissionVisibility(): Promise<CommissionVisibility> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { checkout: false, organizerDashboard: false, customerFacing: false };
  const v = await getCommissionVisibility();
  return v;
}

/**
 * The commission % that applies RIGHT NOW to the signed-in organizer (event rule > organizer rule >
 * legacy organizer fee > general). With `eventId` it resolves for that event, but only for its owner
 * or an admin; otherwise it falls back to the caller's own organizer-level rate. Used by forms and
 * previews so they show the real rate instead of the general platform rate.
 */
export async function getMyEffectiveCommissionPercent(eventId?: string | null): Promise<number> {
  const { resolveCommission } = await import('@/lib/commission-service');
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return bpsToPercent(await getGeneralCommissionBps());

  let scopedEventId: string | null = null;
  if (eventId) {
    const ev = await prisma.event.findUnique({ where: { id: eventId }, select: { userId: true } });
    if (ev && (ev.userId === session.user.id || session.user.role === 'ADMIN')) scopedEventId = eventId;
  }
  const resolved = await resolveCommission({
    eventId: scopedEventId,
    organizerId: scopedEventId ? undefined : session.user.id,
  });
  return bpsToPercent(resolved.bps);
}
