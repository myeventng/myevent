'use server';

import { z } from 'zod';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { clearSettingsCache } from '@/lib/platform-settings';
import {
  WHATSAPP_MAX_MESSAGE,
  WHATSAPP_SETTING_KEY,
  normalizeWhatsappNumber,
  type WhatsappSettings,
  type WhatsappWidgetConfig,
} from '@/lib/whatsapp';

type Result<T = undefined> =
  | { success: true; message?: string; data?: T }
  | { success: false; message: string };

const DEFAULT_MESSAGE = 'Hello MyEvent, I need some help.';

/** Staff and admins (role ADMIN with sub role STAFF or SUPER_ADMIN) may manage the widget. */
async function requireStaffOrAdmin() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  const { role, subRole } = session.user as { role: string; subRole: string };
  if (role !== 'ADMIN' || !['STAFF', 'SUPER_ADMIN'].includes(subRole)) return null;
  return session;
}

function readStored(value: unknown): WhatsappSettings {
  const v = (value ?? {}) as Partial<WhatsappSettings>;
  return {
    enabled: v.enabled === true,
    number: typeof v.number === 'string' ? v.number : '',
    message: typeof v.message === 'string' ? v.message : DEFAULT_MESSAGE,
    updatedAt: v.updatedAt ?? null,
    updatedBy: v.updatedBy ?? null,
  };
}

/** Public: what the site needs to draw the widget. Returns null when it is off or has no number. */
export async function getWhatsappWidget(): Promise<Result<WhatsappWidgetConfig | null>> {
  try {
    const row = await prisma.platformSettings.findUnique({
      where: { key: WHATSAPP_SETTING_KEY },
      select: { value: true },
    });
    const s = readStored(row?.value);
    if (!s.enabled || !normalizeWhatsappNumber(s.number)) {
      return { success: true, data: null };
    }
    return { success: true, data: { enabled: true, number: s.number, message: s.message } };
  } catch (error) {
    console.error('getWhatsappWidget failed:', error);
    return { success: false, message: 'Could not load WhatsApp settings' };
  }
}

/** Admin screen: current settings, including when and by whom they were last changed. */
export async function getWhatsappSettings(): Promise<Result<WhatsappSettings>> {
  if (!(await requireStaffOrAdmin())) {
    return { success: false, message: 'You do not have permission to view this' };
  }
  try {
    const row = await prisma.platformSettings.findUnique({
      where: { key: WHATSAPP_SETTING_KEY },
      select: { value: true },
    });
    return { success: true, data: readStored(row?.value) };
  } catch (error) {
    console.error('getWhatsappSettings failed:', error);
    return { success: false, message: 'Could not load WhatsApp settings' };
  }
}

const saveSchema = z.object({
  enabled: z.boolean(),
  number: z.string().trim().max(30),
  message: z
    .string()
    .trim()
    .max(WHATSAPP_MAX_MESSAGE, `Keep the message under ${WHATSAPP_MAX_MESSAGE} characters`),
});

export async function saveWhatsappSettings(
  input: z.input<typeof saveSchema>
): Promise<Result<WhatsappSettings>> {
  const session = await requireStaffOrAdmin();
  if (!session) {
    return { success: false, message: 'You do not have permission to change this' };
  }

  const parsed = saveSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? 'Check the form and try again' };
  }

  const { enabled, message } = parsed.data;
  const number = normalizeWhatsappNumber(parsed.data.number);
  if (parsed.data.number && !number) {
    return {
      success: false,
      message: 'Enter a valid number with country code, for example 0801 234 5678 or +44 7700 900123',
    };
  }
  if (enabled && !number) {
    return { success: false, message: 'Add a WhatsApp number before turning the widget on' };
  }

  const value: WhatsappSettings = {
    enabled,
    number: number ?? '',
    message: message || DEFAULT_MESSAGE,
    updatedAt: new Date().toISOString(),
    updatedBy: session.user.name || session.user.email || null,
  };

  try {
    await prisma.platformSettings.upsert({
      where: { key: WHATSAPP_SETTING_KEY },
      update: { value: value as any },
      create: { key: WHATSAPP_SETTING_KEY, value: value as any },
    });
    clearSettingsCache(WHATSAPP_SETTING_KEY);
    revalidatePath('/', 'layout');
    return { success: true, message: 'WhatsApp widget saved', data: value };
  } catch (error) {
    console.error('saveWhatsappSettings failed:', error);
    return { success: false, message: 'Could not save. Please try again.' };
  }
}
