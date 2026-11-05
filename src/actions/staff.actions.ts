'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/email/email-service';
import { staffInviteEmail } from '@/lib/email/templates/staff-invite-email';
import { ROLE_LABELS, ALL_STAFF_PERMISSIONS } from '@/lib/staff/permissions';
import * as staff from '@/lib/staff/service';
import { StaffError } from '@/lib/staff/service';

type Result<T = undefined> = { success: true; data: T; message?: string } | { success: false; message: string };

async function actor() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new StaffError('Please sign in', 'FORBIDDEN');
  return { session, actor: { id: session.user.id, role: session.user.role as string } };
}

const fail = (e: unknown): Result<never> => {
  if (e instanceof StaffError) return { success: false, message: e.message };
  console.error('staff action error:', e);
  return { success: false, message: 'Something went wrong. Please try again.' };
};

const baseUrl = () => process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || 'https://myevent.com.ng';

async function emailInvite(organizerId: string, to: string, role: 'MANAGER' | 'SCANNER', token: string) {
  const organizer = await prisma.user.findUnique({ where: { id: organizerId }, select: { name: true, email: true } });
  const mail = staffInviteEmail({
    organizerName: organizer?.name || organizer?.email || 'An organizer',
    roleLabel: ROLE_LABELS[role],
    acceptUrl: `${baseUrl()}/staff/accept?token=${encodeURIComponent(token)}`,
    expiresInDays: 7,
  });
  try {
    await sendEmail({ to, ...mail });
    return true;
  } catch (e) {
    console.error('Failed to send staff invite email:', e);
    return false;
  }
}

const inviteSchema = z.object({
  email: z.string().trim().email().max(254),
  role: z.enum(['MANAGER', 'SCANNER']),
  permissions: z.array(z.enum(ALL_STAFF_PERMISSIONS as [string, ...string[]])).optional(),
  allEvents: z.boolean(),
  eventIds: z.array(z.string().min(1)).max(500).optional(),
});

export async function inviteStaffAction(input: z.input<typeof inviteSchema>): Promise<Result> {
  try {
    const { actor: a } = await actor();
    const v = inviteSchema.safeParse(input);
    if (!v.success) return { success: false, message: v.error.issues[0].message };
    const { staff: row, token } = await staff.inviteStaff(a, { organizerId: a.id, ...(v.data as any) });
    const sent = await emailInvite(a.id, row.email, row.role, token);
    revalidatePath('/dashboard/settings/staff');
    return { success: true, data: undefined, message: sent ? 'Invitation sent' : 'Invitation created, but the email could not be sent. Use “Resend” to try again.' };
  } catch (e) {
    return fail(e);
  }
}

export async function resendInviteAction(staffId: string): Promise<Result> {
  try {
    const { actor: a } = await actor();
    const { staff: row, token } = await staff.resendInvite(a, staffId);
    const sent = await emailInvite(row.organizerId, row.email, row.role, token);
    revalidatePath('/dashboard/settings/staff');
    return sent ? { success: true, data: undefined, message: 'Invitation resent' } : { success: false, message: 'Could not send the email. Please try again.' };
  } catch (e) {
    return fail(e);
  }
}

const updateSchema = z.object({
  role: z.enum(['MANAGER', 'SCANNER']).optional(),
  permissions: z.array(z.enum(ALL_STAFF_PERMISSIONS as [string, ...string[]])).optional(),
  allEvents: z.boolean().optional(),
  eventIds: z.array(z.string().min(1)).max(500).optional(),
});

export async function updateStaffAction(staffId: string, patch: z.input<typeof updateSchema>): Promise<Result> {
  try {
    const { actor: a } = await actor();
    const v = updateSchema.safeParse(patch);
    if (!v.success) return { success: false, message: v.error.issues[0].message };
    await staff.updateStaff(a, staffId, v.data as any);
    revalidatePath('/dashboard/settings/staff');
    return { success: true, data: undefined, message: 'Staff access updated' };
  } catch (e) {
    return fail(e);
  }
}

export async function revokeStaffAction(staffId: string): Promise<Result> {
  try {
    const { actor: a } = await actor();
    await staff.revokeStaff(a, staffId);
    revalidatePath('/dashboard/settings/staff');
    return { success: true, data: undefined, message: 'Access revoked' };
  } catch (e) {
    return fail(e);
  }
}

export async function removeStaffAction(staffId: string): Promise<Result> {
  try {
    const { actor: a } = await actor();
    await staff.removeStaff(a, staffId);
    revalidatePath('/dashboard/settings/staff');
    return { success: true, data: undefined, message: 'Staff member removed' };
  } catch (e) {
    return fail(e);
  }
}

export async function listMyStaffAction() {
  try {
    const { actor: a } = await actor();
    const rows = await staff.listStaff(a, a.id);
    return {
      success: true as const,
      data: rows.map((r) => ({
        id: r.id,
        email: r.email,
        name: r.user?.name ?? null,
        role: r.role,
        permissions: r.permissions,
        allEvents: r.allEvents,
        status: r.status,
        events: r.events.map((e) => ({ id: e.eventId, title: e.event.title })),
        invitedAt: r.invitedAt.toISOString(),
        lastInvitedAt: r.lastInvitedAt.toISOString(),
        expiresAt: r.inviteExpiresAt?.toISOString() ?? null,
        acceptedAt: r.acceptedAt?.toISOString() ?? null,
      })),
    };
  } catch (e) {
    return fail(e);
  }
}

export async function acceptStaffInviteAction(token: string): Promise<Result<{ organizerName: string }>> {
  try {
    const { session } = await actor();
    const r = await staff.acceptInvite({ id: session.user.id, email: session.user.email }, token);
    const org = await prisma.user.findUnique({ where: { id: r.organizerId }, select: { name: true, email: true } });
    revalidatePath('/dashboard');
    return { success: true, data: { organizerName: org?.name || org?.email || 'the organizer' }, message: 'You have joined the team' };
  } catch (e) {
    return fail(e);
  }
}

/** Events the signed-in organizer can assign to staff. */
export async function listMyEventsForStaffAction() {
  try {
    const { actor: a } = await actor();
    const events = await prisma.event.findMany({
      where: { userId: a.id },
      select: { id: true, title: true, startDateTime: true },
      orderBy: { startDateTime: 'desc' },
      take: 300,
    });
    return { success: true as const, data: events.map((e) => ({ id: e.id, title: e.title, startDateTime: e.startDateTime.toISOString() })) };
  } catch (e) {
    return fail(e);
  }
}
