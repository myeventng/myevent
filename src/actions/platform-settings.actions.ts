// src/actions/platform-settings.actions.ts
'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { getGeneralCommissionBps, bpsToPercent, BOOTSTRAP_GENERAL_COMMISSION_PERCENT } from '@/lib/commission-service';
import { testEmailProvider, type EmailProviderType } from '@/lib/email/email-provider';

interface ActionResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

interface PlatformSettings {
  general: {
    platformName: string;
    platformDescription: string;
    supportEmail: string;
    maintenanceMode: boolean;
    allowRegistrations: boolean;
  };
  financial: {
    defaultPlatformFeePercentage: number;
    minimumWithdrawal: number;
    maximumRefundDays: number;
    autoApproveRefunds: boolean;
    paystackPublicKey: string;
    paystackSecretKey: string;
  };
  // ── NEW ──────────────────────────────────────────────────────────────
  email: {
    activeProvider: EmailProviderType; // 'gmail' | 'ses' | 'resend'
    fromName: string;
    // Gmail / SMTP
    gmail: {
      host: string;
      port: number;
      secure: boolean;
      user: string;
      password: string; // stored encrypted in DB (never returned to client)
    };
    // Amazon SES
    ses: {
      region: string;
      accessKeyId: string;
      secretAccessKey: string; // stored encrypted (never returned to client)
      fromAddress: string;
    };
    // Resend
    resend: {
      apiKey: string; // secret (never returned to client)
      fromAddress: string;
    };
    // Zoho ZeptoMail
    zeptomail: {
      apiToken: string; // Send Mail Token — secret (never returned to client)
      region: string; // cpaas | com | eu | in | com.au | jp | ca | sa
      fromAddress: string;
    };
  };
}

// ─── Auth helper ──────────────────────────────────────────────────────────────

const validateAdminPermission = async () => {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });
  if (!session || session.user.role !== 'ADMIN') {
    throw new Error('Unauthorized: Admin access required');
  }
  return session;
};

// ─── Default structures ───────────────────────────────────────────────────────

const defaultSettings: PlatformSettings = {
  general: {
    platformName: 'MyEvent.com.ng',
    platformDescription: "Nigeria's premier event management platform",
    supportEmail: 'support@myevent.com.ng',
    maintenanceMode: false,
    allowRegistrations: true,
  },
  financial: {
    // Read-only mirror; the authoritative value is edited via commission-settings.actions.ts
    defaultPlatformFeePercentage: BOOTSTRAP_GENERAL_COMMISSION_PERCENT,
    minimumWithdrawal: 1000,
    maximumRefundDays: 30,
    autoApproveRefunds: false,
    paystackPublicKey: '',
    paystackSecretKey: '',
  },
  email: {
    activeProvider: 'gmail',
    fromName: 'MyEvent.com.ng',
    gmail: {
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      user: '',
      password: '',
    },
    ses: {
      region: 'us-east-1',
      accessKeyId: '',
      secretAccessKey: '',
      fromAddress: '',
    },
    resend: {
      apiKey: '',
      fromAddress: '',
    },
    zeptomail: {
      apiToken: '',
      region: 'cpaas',
      fromAddress: '',
    },
  },
};

// ─── Flat key helpers ─────────────────────────────────────────────────────────

// Secrets are masked before being sent to the client. If the client sends the
// mask (or nothing) back, keep the stored secret instead of overwriting it.
const MASK = '••••••••';
const isRealSecret = (v?: string) => !!v && v.trim() !== '' && v !== MASK;

function buildFlatSettings(settings: PlatformSettings) {
  return [
    // General
    { key: 'general.platformName', value: settings.general.platformName },
    { key: 'general.platformDescription', value: settings.general.platformDescription },
    { key: 'general.supportEmail', value: settings.general.supportEmail },
    { key: 'general.maintenanceMode', value: settings.general.maintenanceMode },
    { key: 'general.allowRegistrations', value: settings.general.allowRegistrations },
    // Financial
    { key: 'financial.minimumWithdrawal', value: settings.financial.minimumWithdrawal },
    { key: 'financial.maximumRefundDays', value: settings.financial.maximumRefundDays },
    { key: 'financial.autoApproveRefunds', value: settings.financial.autoApproveRefunds },
    { key: 'financial.paystackPublicKey', value: settings.financial.paystackPublicKey },
    ...(isRealSecret(settings.financial.paystackSecretKey)
      ? [{ key: 'financial.paystackSecretKey', value: settings.financial.paystackSecretKey.trim() }]
      : []),
    // Email — provider selection & shared
    { key: 'email.activeProvider', value: settings.email.activeProvider },
    { key: 'email.fromName', value: settings.email.fromName },
    // Gmail
    { key: 'email.gmail.host', value: settings.email.gmail.host },
    { key: 'email.gmail.port', value: settings.email.gmail.port },
    { key: 'email.gmail.secure', value: settings.email.gmail.secure },
    { key: 'email.gmail.user', value: settings.email.gmail.user },
    ...(isRealSecret(settings.email.gmail.password)
      ? [{ key: 'email.gmail.password', value: settings.email.gmail.password.trim() }]
      : []),
    // SES
    { key: 'email.ses.region', value: settings.email.ses.region },
    { key: 'email.ses.fromAddress', value: settings.email.ses.fromAddress.trim() },
    { key: 'email.ses.accessKeyId', value: settings.email.ses.accessKeyId.trim() },
    ...(isRealSecret(settings.email.ses.secretAccessKey)
      ? [{ key: 'email.ses.secretAccessKey', value: settings.email.ses.secretAccessKey.trim() }]
      : []),
    // Resend
    { key: 'email.resend.fromAddress', value: (settings.email.resend?.fromAddress ?? '').trim() },
    ...(isRealSecret(settings.email.resend?.apiKey)
      ? [{ key: 'email.resend.apiKey', value: settings.email.resend.apiKey.trim() }]
      : []),
    // ZeptoMail
    { key: 'email.zeptomail.region', value: (settings.email.zeptomail?.region || 'cpaas').trim() },
    { key: 'email.zeptomail.fromAddress', value: (settings.email.zeptomail?.fromAddress ?? '').trim() },
    ...(isRealSecret(settings.email.zeptomail?.apiToken)
      ? [{ key: 'email.zeptomail.apiToken', value: settings.email.zeptomail.apiToken.trim() }]
      : []),
  ];
}

function populateFromDb(
  rows: Array<{ key: string; value: unknown }>,
  structured: PlatformSettings
): PlatformSettings {
  const s = JSON.parse(JSON.stringify(structured)) as PlatformSettings; // deep clone

  rows.forEach(({ key, value }) => {
    const parts = key.split('.');
    // Handle up to 3-level nesting: section.subsection.field
    if (parts.length === 2) {
      const [section, field] = parts;
      if (section in s) {
        (s as any)[section][field] = value;
      }
    } else if (parts.length === 3) {
      const [section, subsection, field] = parts;
      if (section in s && subsection in (s as any)[section]) {
        (s as any)[section][subsection][field] = value;
      }
    }
  });

  return s;
}

// Scrub secrets before sending to the client
function scrubSecrets(settings: PlatformSettings): PlatformSettings {
  const s = JSON.parse(JSON.stringify(settings)) as PlatformSettings;
  if (s.email.gmail.password) s.email.gmail.password = '••••••••';
  if (s.email.ses.secretAccessKey) s.email.ses.secretAccessKey = '••••••••';
  if (s.email.resend?.apiKey) s.email.resend.apiKey = '••••••••';
  if (s.email.zeptomail?.apiToken) s.email.zeptomail.apiToken = '••••••••';
  if (s.financial.paystackSecretKey) s.financial.paystackSecretKey = '••••••••';
  return s;
}

// ─── Actions ──────────────────────────────────────────────────────────────────

export async function getPlatformSettings(): Promise<ActionResponse<PlatformSettings>> {
  try {
    await validateAdminPermission();

    const rows = await prisma.platformSettings.findMany();
    const structured = populateFromDb(rows, defaultSettings);
    // One authoritative general commission, resolved by the commission service.
    structured.financial.defaultPlatformFeePercentage = bpsToPercent(await getGeneralCommissionBps());

    return { success: true, data: scrubSecrets(structured) };
  } catch (error) {
    console.error('Error fetching platform settings:', error);
    return { success: false, message: 'Failed to fetch platform settings' };
  }
}

export async function updatePlatformSettings(
  settings: PlatformSettings
): Promise<ActionResponse<PlatformSettings>> {
  try {
    const session = await validateAdminPermission();
    const flatSettings = buildFlatSettings(settings);

    await prisma.$transaction(
      flatSettings.map(({ key, value }) =>
        prisma.platformSettings.upsert({
          where: { key },
          update: { value: value as any },
          create: { key, value: value as any },
        })
      )
    );

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'UPDATE',
        entity: 'PLATFORM_SETTINGS',
        newValues: {
          updatedSections: Object.keys(settings),
          emailProvider: settings.email.activeProvider,
        },
      },
    });

    revalidatePath('/admin/dashboard/settings');

    return { success: true, message: 'Settings updated successfully' };
  } catch (error) {
    console.error('Error updating platform settings:', error);
    return { success: false, message: 'Failed to update platform settings' };
  }
}

/**
 * Called by the admin "Test Connection" button.
 * Does NOT require saving settings first — tests whatever is currently in DB.
 */
export async function testEmailProviderAction(
  provider: EmailProviderType
): Promise<ActionResponse<{ message: string }>> {
  try {
    const session = await validateAdminPermission();
    const result = await testEmailProvider(provider, (session as any)?.user?.email);
    return {
      success: result.success,
      message: result.message,
      data: { message: result.message },
    };
  } catch (error: any) {
    return { success: false, message: error?.message || 'Test failed' };
  }
}
