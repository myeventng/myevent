'use server';

import { z } from 'zod';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { sendEmail } from '@/lib/email/email-provider';
import { escapeHtml } from '@/lib/email/templates/auth-email';
import { siteEmailLayout, textToHtml } from '@/lib/email/templates/site-email';
import { getCachedSetting } from '@/lib/platform-settings';
import { CONTACT_TOPICS } from '@/lib/contact-topics';

type Result<T = undefined> =
  | { success: true; message?: string; data?: T }
  | { success: false; message: string };

// ─── Public: contact form ────────────────────────────────────────────────────

const contactSchema = z.object({
  name: z.string().trim().min(2, 'Enter your name').max(100),
  email: z.string().trim().toLowerCase().email('Enter a valid email address').max(200),
  phone: z
    .string()
    .trim()
    .max(30)
    .regex(/^[0-9+()\-\s]*$/, 'Phone can only contain numbers, spaces, + and -')
    .optional()
    .or(z.literal('')),
  topic: z.enum(CONTACT_TOPICS),
  subject: z.string().trim().min(3, 'Add a short subject').max(150),
  message: z
    .string()
    .trim()
    .min(10, 'Tell us a little more (at least 10 characters)')
    .max(5000, 'Please keep the message under 5,000 characters'),
  // Honeypot: real people never see or fill this field.
  website: z.string().max(0).optional(),
});

export type ContactInput = z.input<typeof contactSchema>;

async function clientKey(): Promise<string> {
  const h = await headers();
  const fwd = h.get('x-forwarded-for')?.split(',')[0]?.trim();
  return fwd || h.get('x-real-ip') || 'unknown';
}

export async function submitContactMessage(
  input: ContactInput
): Promise<Result<{ fieldErrors?: Record<string, string> }>> {
  // Bots fill the hidden field. Pretend it worked so they do not retry.
  if (input?.website) return { success: true, message: 'Message sent' };

  const parsed = contactSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? 'Check the form and try again',
    };
  }

  const ip = await clientKey();
  const limit = await checkRateLimit(`contact:${ip}`, 5, 60 * 60);
  if (!limit.ok) {
    return {
      success: false,
      message: 'You have sent several messages already. Please try again in an hour.',
    };
  }

  const d = parsed.data;
  try {
    const saved = await prisma.contactMessage.create({
      data: {
        name: d.name,
        email: d.email,
        phone: d.phone || null,
        topic: d.topic,
        subject: d.subject,
        message: d.message,
      },
    });

    // Tell the team. A mail failure must not lose the message (it is saved).
    try {
      const to =
        (await getCachedSetting('general.supportEmail')) ||
        process.env.CONTACT_NOTIFY_EMAIL ||
        'info@myevent.com.ng';
      const base = (process.env.NEXT_PUBLIC_APP_URL || 'https://myevent.com.ng').replace(/\/$/, '');
      await sendEmail({
        to,
        replyTo: d.email,
        subject: `New contact message: ${d.subject}`,
        html: siteEmailLayout({
          title: 'New contact message',
          bodyHtml: `
            <p style="margin:0 0 4px;font-size:15px;color:#374151;"><strong>${escapeHtml(d.name)}</strong> (${escapeHtml(d.email)}${d.phone ? `, ${escapeHtml(d.phone)}` : ''})</p>
            <p style="margin:0 0 16px;font-size:14px;color:#6b7280;">Topic: ${escapeHtml(d.topic)}<br>Subject: ${escapeHtml(d.subject)}</p>
            ${textToHtml(d.message)}`,
          button: { label: 'Open in dashboard', url: `${base}/admin/dashboard/messages?id=${saved.id}` },
          footerHtml: 'Reply to this email to answer the sender directly.',
        }),
        text: `${d.name} <${d.email}>\nTopic: ${d.topic}\nSubject: ${d.subject}\n\n${d.message}`,
      });
    } catch (e) {
      console.error('[contact] notification email failed:', e);
    }

    return { success: true, message: 'Message sent' };
  } catch (e) {
    console.error('[contact] save failed:', e);
    return { success: false, message: 'We could not send your message. Please try again.' };
  }
}

// ─── Admin: inbox ────────────────────────────────────────────────────────────

async function requireAdmin() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { ok: false as const, message: 'Not authenticated' };
  const { role, subRole } = session.user as any;
  if (role !== 'ADMIN' || !['STAFF', 'SUPER_ADMIN'].includes(subRole)) {
    return { ok: false as const, message: 'Not authorized' };
  }
  return { ok: true as const, userId: session.user.id };
}

export interface ContactFilters {
  page?: number;
  status?: 'ALL' | 'NEW' | 'READ' | 'REPLIED' | 'ARCHIVED';
  search?: string;
}

export async function getContactMessages(filters: ContactFilters = {}) {
  const guard = await requireAdmin();
  if (!guard.ok) return { success: false as const, message: guard.message };

  const page = Math.max(1, Number(filters.page) || 1);
  const pageSize = 20;
  const search = filters.search?.trim();
  const where: any = {};
  if (filters.status && filters.status !== 'ALL') where.status = filters.status;
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { subject: { contains: search, mode: 'insensitive' } },
      { message: { contains: search, mode: 'insensitive' } },
    ];
  }

  try {
    const [rows, total, grouped] = await Promise.all([
      prisma.contactMessage.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.contactMessage.count({ where }),
      prisma.contactMessage.groupBy({ by: ['status'], _count: { _all: true } }),
    ]);

    const counts = { NEW: 0, READ: 0, REPLIED: 0, ARCHIVED: 0 };
    grouped.forEach((g) => {
      counts[g.status as keyof typeof counts] = g._count._all;
    });

    return {
      success: true as const,
      data: {
        messages: rows.map((m) => ({
          ...m,
          createdAt: m.createdAt.toISOString(),
          updatedAt: m.updatedAt.toISOString(),
          repliedAt: m.repliedAt?.toISOString() ?? null,
        })),
        total,
        counts,
        page,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    };
  } catch (e) {
    console.error('[contact] list failed:', e);
    return { success: false as const, message: 'Failed to load messages' };
  }
}

export async function updateContactMessage(
  id: string,
  data: { status?: 'NEW' | 'READ' | 'REPLIED' | 'ARCHIVED'; adminNote?: string }
): Promise<Result> {
  const guard = await requireAdmin();
  if (!guard.ok) return { success: false, message: guard.message };
  try {
    await prisma.contactMessage.update({
      where: { id },
      data: {
        ...(data.status ? { status: data.status } : {}),
        ...(data.adminNote !== undefined ? { adminNote: data.adminNote.slice(0, 5000) || null } : {}),
      },
    });
    revalidatePath('/admin/dashboard/messages');
    return { success: true };
  } catch (e) {
    console.error('[contact] update failed:', e);
    return { success: false, message: 'Failed to update message' };
  }
}

export async function replyToContactMessage(id: string, reply: string): Promise<Result> {
  const guard = await requireAdmin();
  if (!guard.ok) return { success: false, message: guard.message };

  const text = reply.trim();
  if (text.length < 2) return { success: false, message: 'Write a reply first' };
  if (text.length > 5000) return { success: false, message: 'Reply is too long' };

  const msg = await prisma.contactMessage.findUnique({ where: { id } });
  if (!msg) return { success: false, message: 'Message not found' };

  const result = await sendEmail({
    to: msg.email,
    subject: `Re: ${msg.subject}`,
    html: siteEmailLayout({
      title: `Re: ${msg.subject}`,
      bodyHtml: `${textToHtml(text)}
        <div style="margin-top:24px;padding-left:12px;border-left:3px solid #e5e7eb;color:#6b7280;font-size:14px;line-height:22px;">
          <strong>Your message:</strong><br>${escapeHtml(msg.message).replace(/\n/g, '<br>')}
        </div>`,
      footerHtml: 'You are receiving this because you contacted MyEvent.com.ng.',
    }),
    text: `${text}\n\n---\nYour message:\n${msg.message}`,
  });

  if (!result.success) {
    console.error('[contact] reply failed:', result.error);
    return { success: false, message: 'The email could not be sent. Check the email settings and try again.' };
  }

  await prisma.contactMessage.update({
    where: { id },
    data: { status: 'REPLIED', repliedAt: new Date(), repliedBy: guard.userId },
  });
  revalidatePath('/admin/dashboard/messages');
  return { success: true, message: 'Reply sent' };
}

export async function deleteContactMessage(id: string): Promise<Result> {
  const guard = await requireAdmin();
  if (!guard.ok) return { success: false, message: guard.message };
  try {
    await prisma.contactMessage.delete({ where: { id } });
    revalidatePath('/admin/dashboard/messages');
    return { success: true };
  } catch (e) {
    console.error('[contact] delete failed:', e);
    return { success: false, message: 'Failed to delete message' };
  }
}
