// src/lib/email/email-provider.ts
// Universal email provider — supports Gmail (SMTP via Nodemailer) and Amazon SES.
// The active provider is read from PlatformSettings at runtime, so the super admin
// can switch without a deployment.

import nodemailer, { Transporter } from 'nodemailer';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { prisma } from '@/lib/prisma';

// ─── Types ────────────────────────────────────────────────────────────────────

export type EmailProviderType = 'gmail' | 'ses';

export interface SendEmailPayload {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string; // override the default sender
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
    encoding?: string;
  }>;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: unknown;
}

// ─── Settings helpers ─────────────────────────────────────────────────────────

async function getEmailSettings(): Promise<Record<string, string>> {
  const rows = await prisma.platformSettings.findMany({
    where: { key: { startsWith: 'email.' } },
  });
  const map: Record<string, string> = {};
  rows.forEach((r) => {
    // value is Json — coerce to string
    map[r.key] = String(r.value ?? '');
  });
  return map;
}

// ─── Gmail / SMTP provider ────────────────────────────────────────────────────

async function buildGmailTransporter(
  settings: Record<string, string>
): Promise<Transporter> {
  return nodemailer.createTransport({
    host: settings['email.gmail.host'] || process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(settings['email.gmail.port'] || process.env.EMAIL_PORT || '465'),
    secure: (settings['email.gmail.secure'] ?? 'true') === 'true',
    auth: {
      user: settings['email.gmail.user'] || process.env.NODEMAILER_USER || '',
      pass: settings['email.gmail.password'] || process.env.NODEMAILER_APP_PASSWORD || '',
    },
  });
}

async function sendViaGmail(
  payload: SendEmailPayload,
  settings: Record<string, string>
): Promise<EmailResult> {
  const transporter = await buildGmailTransporter(settings);
  const fromName =
    settings['email.fromName'] ||
    process.env.EMAIL_FROM_NAME ||
    'MyEvent.com.ng';
  const fromAddress =
    settings['email.gmail.user'] || process.env.NODEMAILER_USER || '';

  const info = await transporter.sendMail({
    from: payload.from || `"${fromName}" <${fromAddress}>`,
    to: Array.isArray(payload.to) ? payload.to.join(', ') : payload.to,
    subject: payload.subject,
    html: payload.html,
    text: payload.text ?? '',
    attachments: payload.attachments,
  });

  return { success: true, messageId: info.messageId };
}

// ─── Amazon SES provider ──────────────────────────────────────────────────────

function buildSESClient(settings: Record<string, string>): SESClient {
  return new SESClient({
    region: settings['email.ses.region'] || process.env.AWS_SES_REGION || 'us-east-1',
    credentials: {
      accessKeyId:
        settings['email.ses.accessKeyId'] || process.env.AWS_SES_ACCESS_KEY_ID || '',
      secretAccessKey:
        settings['email.ses.secretAccessKey'] ||
        process.env.AWS_SES_SECRET_ACCESS_KEY ||
        '',
    },
  });
}

async function sendViaSES(
  payload: SendEmailPayload,
  settings: Record<string, string>
): Promise<EmailResult> {
  const ses = buildSESClient(settings);

  const fromName =
    settings['email.fromName'] ||
    process.env.EMAIL_FROM_NAME ||
    'MyEvent.com.ng';
  const fromAddress =
    settings['email.ses.fromAddress'] ||
    process.env.AWS_SES_FROM_ADDRESS ||
    '';

  // SES SendEmailCommand does not support attachments.
  // For attachments use sendViaSES_Raw (see email-ticket-service.ts upgrade notes).
  const toAddresses = Array.isArray(payload.to) ? payload.to : [payload.to];

  const command = new SendEmailCommand({
    Source: payload.from || `"${fromName}" <${fromAddress}>`,
    Destination: { ToAddresses: toAddresses },
    Message: {
      Subject: { Data: payload.subject, Charset: 'UTF-8' },
      Body: {
        Html: { Data: payload.html, Charset: 'UTF-8' },
        ...(payload.text
          ? { Text: { Data: payload.text, Charset: 'UTF-8' } }
          : {}),
      },
    },
  });

  const response = await ses.send(command);
  return {
    success: true,
    messageId: response.MessageId,
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Sends an email using whichever provider the super admin has selected.
 * Falls back to Gmail if the setting is missing.
 */
export async function sendEmail(payload: SendEmailPayload): Promise<EmailResult> {
  try {
    const settings = await getEmailSettings();
    const provider = (settings['email.activeProvider'] as EmailProviderType) || 'gmail';

    console.log(`📧 Sending email via provider: ${provider} → ${payload.to}`);

    if (provider === 'ses') {
      return await sendViaSES(payload, settings);
    }
    return await sendGmail(payload, settings);
  } catch (error) {
    console.error('❌ Email send failed:', error);
    return { success: false, error };
  }
}

// named alias kept for internal use
async function sendGmail(
  payload: SendEmailPayload,
  settings: Record<string, string>
): Promise<EmailResult> {
  return sendViaGmail(payload, settings);
}

/**
 * Test connectivity for a given provider using the current saved settings.
 * Used by the admin UI "Test Connection" button.
 */
export async function testEmailProvider(
  provider: EmailProviderType
): Promise<{ success: boolean; message: string }> {
  try {
    const settings = await getEmailSettings();

    if (provider === 'gmail') {
      const transporter = await buildGmailTransporter(settings);
      await transporter.verify();
      return { success: true, message: 'Gmail SMTP connection verified ✅' };
    }

    // SES: send a test email to the configured from-address (simplest smoke test)
    const ses = buildSESClient(settings);
    const fromAddress =
      settings['email.ses.fromAddress'] || process.env.AWS_SES_FROM_ADDRESS || '';
    if (!fromAddress) {
      return {
        success: false,
        message: 'SES From Address is not configured.',
      };
    }
    const command = new SendEmailCommand({
      Source: fromAddress,
      Destination: { ToAddresses: [fromAddress] },
      Message: {
        Subject: { Data: 'MyEvent SES Connection Test', Charset: 'UTF-8' },
        Body: {
          Text: {
            Data: 'This is an automated test from MyEvent.com.ng admin panel.',
            Charset: 'UTF-8',
          },
        },
      },
    });
    const result = await ses.send(command);
    return {
      success: true,
      message: `Amazon SES connection verified ✅ (MessageId: ${result.MessageId})`,
    };
  } catch (error: any) {
    return {
      success: false,
      message: `Connection failed: ${error?.message || String(error)}`,
    };
  }
}
