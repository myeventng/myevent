'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { AccessDeniedError, requireEventOwnerOrAdmin, resolveEventAccess, can } from '@/lib/staff/access';

type Result<T = undefined> = { success: true; data: T; message?: string } | { success: false; message: string };

async function actorOrThrow() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new AccessDeniedError('Please sign in');
  return { id: session.user.id, role: session.user.role as string };
}

export async function getScannerSettings(eventId: string): Promise<Result<{ mode: 'INBUILT_ONLY' | 'UNIVERSAL'; canEdit: boolean; eventTitle: string }>> {
  try {
    const actor = await actorOrThrow();
    const access = await resolveEventAccess(actor, eventId);
    if (!can(access, 'SCAN_TICKETS') && !can(access, 'MANAGE_EVENTS')) throw new AccessDeniedError();
    const [s, ev] = await Promise.all([
      prisma.eventScannerSettings.findUnique({ where: { eventId }, select: { mode: true } }),
      prisma.event.findUnique({ where: { id: eventId }, select: { title: true } }),
    ]);
    return { success: true, data: { mode: s?.mode ?? 'UNIVERSAL', canEdit: access!.via === 'OWNER' || access!.via === 'ADMIN', eventTitle: ev?.title ?? '' } };
  } catch (e) {
    return { success: false, message: e instanceof AccessDeniedError ? e.message : 'Could not load scanner settings' };
  }
}

/** Owner/admin only. Enforced again at scan time by validateScan (channel check). */
export async function saveScannerSettings(input: { eventId: string; mode: 'INBUILT_ONLY' | 'UNIVERSAL' }): Promise<Result> {
  try {
    const actor = await actorOrThrow();
    const v = z.object({ eventId: z.string().min(1), mode: z.enum(['INBUILT_ONLY', 'UNIVERSAL']) }).parse(input);
    await requireEventOwnerOrAdmin(actor, v.eventId);
    const before = await prisma.eventScannerSettings.findUnique({ where: { eventId: v.eventId }, select: { mode: true } });
    await prisma.$transaction([
      prisma.eventScannerSettings.upsert({
        where: { eventId: v.eventId },
        update: { mode: v.mode, updatedById: actor.id },
        create: { eventId: v.eventId, mode: v.mode, updatedById: actor.id },
      }),
      prisma.auditLog.create({ data: { userId: actor.id, action: 'UPDATE', entity: 'EVENT_SCANNER_SETTINGS', entityId: v.eventId, oldValues: { mode: before?.mode ?? 'UNIVERSAL' }, newValues: { mode: v.mode } } }),
    ]);
    revalidatePath(`/dashboard/events/${v.eventId}/scanner-settings`);
    return { success: true, data: undefined, message: 'Scanner mode saved' };
  } catch (e) {
    if (e instanceof AccessDeniedError) return { success: false, message: e.message };
    if (e instanceof z.ZodError) return { success: false, message: e.issues[0]?.message ?? 'Invalid input' };
    console.error('saveScannerSettings', e);
    return { success: false, message: 'Something went wrong. Please try again.' };
  }
}
