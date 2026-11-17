'use server';

import { z } from 'zod';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { sendEmail } from '@/lib/email/email-provider';
import { escapeHtml } from '@/lib/email/templates/auth-email';
import {
  getBaseUrl,
  siteEmailLayout,
  textToHtml,
} from '@/lib/email/templates/site-email';

type Result<T = undefined> =
  | { success: true; message?: string; data?: T }
  | { success: false; message: string };

const emailSchema = z.string().trim().toLowerCase().email().max(200);

function unsubscribeUrl(token: string) {
  return `${getBaseUrl()}/newsletter/unsubscribe?token=${encodeURIComponent(token)}`;
}

function unsubscribeFooter(token: string) {
  return `You are receiving this because you subscribed on MyEvent.com.ng.<br><a href="${escapeHtml(unsubscribeUrl(token))}" style="color:#6b7280;">Unsubscribe</a>`;
}

// ─── Public ──────────────────────────────────────────────────────────────────

export async function subscribeToNewsletter(
  email: string,
  source = 'home'
): Promise<Result> {
  const parsed = emailSchema.safeParse(email);
  if (!parsed.success) {
    return { success: false, message: 'Enter a valid email address' };
  }

  const h = await headers();
  const ip =
    h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || 'unknown';
  const limit = await checkRateLimit(`newsletter:${ip}`, 5, 60 * 60);
  if (!limit.ok) {
    return { success: false, message: 'Too many attempts. Please try again later.' };
  }

  const address = parsed.data;
  try {
    const existing = await prisma.newsletterSubscriber.findUnique({
      where: { email: address },
    });

    if (existing?.status === 'ACTIVE') {
      return { success: true, message: 'You are already subscribed.' };
    }

    const subscriber = existing
      ? await prisma.newsletterSubscriber.update({
          where: { id: existing.id },
          data: { status: 'ACTIVE', unsubscribedAt: null, subscribedAt: new Date() },
        })
      : await prisma.newsletterSubscriber.create({
          data: { email: address, source: source.slice(0, 40) },
        });

    // Welcome email. If it fails the subscription still stands.
    try {
      await sendEmail({
        to: address,
        subject: 'You are subscribed to MyEvent updates',
        html: siteEmailLayout({
          title: 'You are on the list',
          bodyHtml: textToHtml(
            'Thanks for subscribing. We will email you about new events, early ticket offers and planning tips.\n\nIn the meantime, see what is coming up.'
          ),
          button: { label: 'Browse events', url: `${getBaseUrl()}/events` },
          footerHtml: unsubscribeFooter(subscriber.token),
        }),
        text: `Thanks for subscribing to MyEvent updates.\n\nBrowse events: ${getBaseUrl()}/events\n\nUnsubscribe: ${unsubscribeUrl(subscriber.token)}`,
      });
    } catch (e) {
      console.error('[newsletter] welcome email failed:', e);
    }

    return { success: true, message: 'Subscribed. Check your inbox for a welcome email.' };
  } catch (e) {
    console.error('[newsletter] subscribe failed:', e);
    return { success: false, message: 'We could not subscribe you. Please try again.' };
  }
}

export async function unsubscribeByToken(token: string): Promise<Result> {
  if (!token || token.length > 100) return { success: false, message: 'This link is not valid.' };
  try {
    const sub = await prisma.newsletterSubscriber.findUnique({ where: { token } });
    if (!sub) return { success: false, message: 'This link is not valid.' };
    if (sub.status === 'UNSUBSCRIBED') return { success: true, message: 'You are already unsubscribed.' };
    await prisma.newsletterSubscriber.update({
      where: { id: sub.id },
      data: { status: 'UNSUBSCRIBED', unsubscribedAt: new Date() },
    });
    return { success: true, message: 'You have been unsubscribed.' };
  } catch (e) {
    console.error('[newsletter] unsubscribe failed:', e);
    return { success: false, message: 'Something went wrong. Please try again.' };
  }
}

// ─── Admin ───────────────────────────────────────────────────────────────────

async function requireAdmin() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { ok: false as const, message: 'Not authenticated' };
  const { role, subRole } = session.user as any;
  if (role !== 'ADMIN' || !['STAFF', 'SUPER_ADMIN'].includes(subRole)) {
    return { ok: false as const, message: 'Not authorized' };
  }
  return { ok: true as const, userId: session.user.id };
}

export interface SubscriberFilters {
  page?: number;
  status?: 'ALL' | 'ACTIVE' | 'UNSUBSCRIBED';
  search?: string;
}

export async function getSubscribers(filters: SubscriberFilters = {}) {
  const guard = await requireAdmin();
  if (!guard.ok) return { success: false as const, message: guard.message };

  const page = Math.max(1, Number(filters.page) || 1);
  const pageSize = 25;
  const search = filters.search?.trim();
  const where: any = {};
  if (filters.status && filters.status !== 'ALL') where.status = filters.status;
  if (search) where.email = { contains: search, mode: 'insensitive' };

  try {
    const [rows, total, active, unsubscribed, campaigns] = await Promise.all([
      prisma.newsletterSubscriber.findMany({
        where,
        orderBy: { subscribedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true, email: true, status: true, source: true,
          subscribedAt: true, unsubscribedAt: true,
        },
      }),
      prisma.newsletterSubscriber.count({ where }),
      prisma.newsletterSubscriber.count({ where: { status: 'ACTIVE' } }),
      prisma.newsletterSubscriber.count({ where: { status: 'UNSUBSCRIBED' } }),
      prisma.newsletterCampaign.findMany({ orderBy: { createdAt: 'desc' }, take: 10 }),
    ]);

    return {
      success: true as const,
      data: {
        subscribers: rows.map((s) => ({
          ...s,
          subscribedAt: s.subscribedAt.toISOString(),
          unsubscribedAt: s.unsubscribedAt?.toISOString() ?? null,
        })),
        campaigns: campaigns.map((c) => ({ ...c, createdAt: c.createdAt.toISOString() })),
        total, active, unsubscribed, page,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    };
  } catch (e) {
    console.error('[newsletter] list failed:', e);
    return { success: false as const, message: 'Failed to load subscribers' };
  }
}

export async function setSubscriberStatus(
  id: string,
  status: 'ACTIVE' | 'UNSUBSCRIBED'
): Promise<Result> {
  const guard = await requireAdmin();
  if (!guard.ok) return { success: false, message: guard.message };
  try {
    await prisma.newsletterSubscriber.update({
      where: { id },
      data: {
        status,
        unsubscribedAt: status === 'UNSUBSCRIBED' ? new Date() : null,
      },
    });
    revalidatePath('/admin/dashboard/subscribers');
    return { success: true };
  } catch (e) {
    console.error('[newsletter] status failed:', e);
    return { success: false, message: 'Failed to update subscriber' };
  }
}

export async function deleteSubscriber(id: string): Promise<Result> {
  const guard = await requireAdmin();
  if (!guard.ok) return { success: false, message: guard.message };
  try {
    await prisma.newsletterSubscriber.delete({ where: { id } });
    revalidatePath('/admin/dashboard/subscribers');
    return { success: true };
  } catch (e) {
    console.error('[newsletter] delete failed:', e);
    return { success: false, message: 'Failed to delete subscriber' };
  }
}

/** Manually add one or many addresses (comma / space / newline separated). */
export async function addSubscribers(raw: string): Promise<Result<{ added: number; skipped: number }>> {
  const guard = await requireAdmin();
  if (!guard.ok) return { success: false, message: guard.message };

  const emails = Array.from(
    new Set(
      raw
        .split(/[\s,;]+/)
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean)
    )
  );
  if (emails.length === 0) return { success: false, message: 'Enter at least one email address' };
  if (emails.length > 1000) return { success: false, message: 'Add up to 1,000 addresses at a time' };

  const valid = emails.filter((e) => emailSchema.safeParse(e).success);
  try {
    const res = await prisma.newsletterSubscriber.createMany({
      data: valid.map((email) => ({ email, source: 'admin' })),
      skipDuplicates: true,
    });
    revalidatePath('/admin/dashboard/subscribers');
    return {
      success: true,
      message: `${res.count} added, ${emails.length - res.count} skipped (already on the list or invalid)`,
      data: { added: res.count, skipped: emails.length - res.count },
    };
  } catch (e) {
    console.error('[newsletter] add failed:', e);
    return { success: false, message: 'Failed to add subscribers' };
  }
}

/** CSV of active subscribers for use in other tools. */
export async function exportSubscribersCsv(): Promise<Result<{ csv: string }>> {
  const guard = await requireAdmin();
  if (!guard.ok) return { success: false, message: guard.message };
  const rows = await prisma.newsletterSubscriber.findMany({
    orderBy: { subscribedAt: 'desc' },
    select: { email: true, status: true, source: true, subscribedAt: true, unsubscribedAt: true },
  });
  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const csv = [
    'email,status,source,subscribed_at,unsubscribed_at',
    ...rows.map((r) =>
      [
        esc(r.email), r.status, esc(r.source ?? ''),
        r.subscribedAt.toISOString(), r.unsubscribedAt?.toISOString() ?? '',
      ].join(',')
    ),
  ].join('\n');
  return { success: true, data: { csv } };
}

/**
 * Send a newsletter to every ACTIVE subscriber. Each person gets their own
 * email with their own unsubscribe link. Sent in small parallel batches.
 */
export async function sendNewsletter(input: {
  subject: string;
  body: string;
  buttonLabel?: string;
  buttonUrl?: string;
  testOnly?: boolean;
  testEmail?: string;
}): Promise<Result<{ sent: number; failed: number }>> {
  const guard = await requireAdmin();
  if (!guard.ok) return { success: false, message: guard.message };

  const subject = input.subject.trim();
  const body = input.body.trim();
  if (subject.length < 3) return { success: false, message: 'Add a subject' };
  if (body.length < 10) return { success: false, message: 'Write the newsletter message' };
  if (subject.length > 150 || body.length > 20000) return { success: false, message: 'Subject or message is too long' };

  let button: { label: string; url: string } | undefined;
  if (input.buttonUrl?.trim()) {
    try {
      const u = new URL(input.buttonUrl.trim());
      if (!['http:', 'https:'].includes(u.protocol)) throw new Error('protocol');
      button = { label: input.buttonLabel?.trim() || 'Read more', url: u.toString() };
    } catch {
      return { success: false, message: 'The button link must start with https://' };
    }
  }

  const build = (token: string) => ({
    subject,
    html: siteEmailLayout({
      title: subject,
      bodyHtml: textToHtml(body),
      button,
      footerHtml: unsubscribeFooter(token),
    }),
    text: `${body}\n\n${button ? `${button.label}: ${button.url}\n\n` : ''}Unsubscribe: ${unsubscribeUrl(token)}`,
  });

  // Send a single test copy to the admin's chosen address
  if (input.testOnly) {
    const to = emailSchema.safeParse(input.testEmail);
    if (!to.success) return { success: false, message: 'Enter a valid test email address' };
    const r = await sendEmail({ to: to.data, ...build('test') });
    return r.success
      ? { success: true, message: `Test sent to ${to.data}`, data: { sent: 1, failed: 0 } }
      : { success: false, message: 'The test email could not be sent. Check the email settings.' };
  }

  const subs = await prisma.newsletterSubscriber.findMany({
    where: { status: 'ACTIVE' },
    select: { email: true, token: true },
  });
  if (subs.length === 0) return { success: false, message: 'There are no active subscribers yet' };

  let sent = 0;
  let failed = 0;
  const BATCH = 10;
  for (let i = 0; i < subs.length; i += BATCH) {
    const results = await Promise.all(
      subs.slice(i, i + BATCH).map((s) => sendEmail({ to: s.email, ...build(s.token) }).catch(() => ({ success: false }) as const))
    );
    results.forEach((r) => (r.success ? sent++ : failed++));
  }

  await prisma.newsletterCampaign.create({
    data: { subject, body, sentCount: sent, failedCount: failed, sentBy: guard.userId },
  });
  revalidatePath('/admin/dashboard/subscribers');

  return {
    success: true,
    message: `Sent to ${sent} subscriber${sent === 1 ? '' : 's'}${failed ? `, ${failed} failed` : ''}`,
    data: { sent, failed },
  };
}
