// src/lib/email/email-provider.ts
// Universal email provider — Gmail (SMTP via Nodemailer), Amazon SES, Resend and Zoho ZeptoMail.
// The active provider is read from PlatformSettings at runtime, so the super admin
// can switch without a deployment.
//
// SES now supports attachments (PDF tickets) by building a raw MIME message
// with Nodemailer's MailComposer and sending it with SendRawEmailCommand.

import nodemailer, { Transporter } from 'nodemailer';
import MailComposer from 'nodemailer/lib/mail-composer';
import {
  SESClient,
  SendEmailCommand,
  SendRawEmailCommand,
} from '@aws-sdk/client-ses';
import { Resend } from 'resend';
import { prisma } from '@/lib/prisma';

// ─── Types ────────────────────────────────────────────────────────────────────

export type EmailProviderType = 'gmail' | 'ses' | 'resend' | 'zeptomail';

export interface SendEmailPayload {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string; // override the default sender
  replyTo?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
    encoding?: string;
  }>;
  log?: EmailLogMeta;
}

/** When provided, the send attempt is recorded in the EmailLog table. */
export interface EmailLogMeta {
  type: 'ORDER_TICKETS' | 'TICKET_RESEND';
  orderId?: string;
  eventId?: string;
  eventTitle?: string;
  ticketIds?: string[];
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: unknown;
}

// The admin UI shows this placeholder instead of real secrets. It must never
// be used as a credential.
const MASK = '••••••••';

// ─── Settings helpers ─────────────────────────────────────────────────────────

async function getEmailSettings(): Promise<Record<string, string>> {
  const rows = await prisma.platformSettings.findMany({
    where: { key: { startsWith: 'email.' } },
  });
  const map: Record<string, string> = {};
  rows.forEach((r) => {
    const v = String(r.value ?? '').trim();
    // Ignore the masked placeholder so env-var fallbacks still work
    map[r.key] = v === MASK ? '' : v;
  });
  return map;
}

function formatFrom(name: string, address: string): string {
  const safeName = name.replace(/["\r\n]/g, '').trim();
  return safeName ? `"${safeName}" <${address}>` : address;
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
    settings['email.fromName'] || process.env.EMAIL_FROM_NAME || 'MyEvent.com.ng';
  const fromAddress =
    settings['email.gmail.user'] || process.env.NODEMAILER_USER || '';

  const info = await transporter.sendMail({
    from: payload.from || formatFrom(fromName, fromAddress),
    to: Array.isArray(payload.to) ? payload.to.join(', ') : payload.to,
    subject: payload.subject,
    html: payload.html,
    text: payload.text ?? '',
    replyTo: payload.replyTo,
    attachments: payload.attachments,
  });

  return { success: true, messageId: info.messageId };
}

// ─── Amazon SES provider ──────────────────────────────────────────────────────

interface SESConfig {
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  fromAddress: string;
  /** Optional SES configuration set (only needed for event-publishing setups) */
  configurationSet?: string;
}

function readSESConfig(settings: Record<string, string>): SESConfig {
  const cfg: SESConfig = {
    region: (settings['email.ses.region'] || process.env.AWS_SES_REGION || 'us-east-1').trim(),
    accessKeyId: (settings['email.ses.accessKeyId'] || process.env.AWS_SES_ACCESS_KEY_ID || '').trim(),
    secretAccessKey: (settings['email.ses.secretAccessKey'] || process.env.AWS_SES_SECRET_ACCESS_KEY || '').trim(),
    fromAddress: (settings['email.ses.fromAddress'] || process.env.AWS_SES_FROM_ADDRESS || '').trim(),
    configurationSet:
      (settings['email.ses.configurationSet'] || process.env.AWS_SES_CONFIGURATION_SET || '').trim() ||
      undefined,
  };

  if (!cfg.fromAddress) {
    throw new Error('SES From Address is not configured.');
  }
  if (cfg.accessKeyId.startsWith('ASIA')) {
    throw new Error(
      'SES Access Key ID starts with ASIA (a temporary key that needs a session token). Use a permanent IAM user key that starts with AKIA.'
    );
  }
  if (!/^AKIA[A-Z0-9]{16}$/.test(cfg.accessKeyId)) {
    throw new Error(
      'SES IAM Access Key ID is invalid — it should look like AKIAXXXXXXXXXXXXXXXX (not an email address).'
    );
  }
  if (cfg.secretAccessKey.length !== 40) {
    throw new Error(
      'SES IAM Secret Access Key is missing or invalid (expected 40 characters). Re-enter it in Settings.'
    );
  }
  return cfg;
}

function buildSESClient(cfg: SESConfig): SESClient {
  return new SESClient({
    region: cfg.region,
    credentials: {
      accessKeyId: cfg.accessKeyId,
      secretAccessKey: cfg.secretAccessKey,
    },
  });
}

function buildRawMime(mail: Record<string, unknown>): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    new MailComposer(mail as any).compile().build((err, message) => {
      if (err) reject(err);
      else resolve(message);
    });
  });
}

async function sendViaSES(
  payload: SendEmailPayload,
  settings: Record<string, string>
): Promise<EmailResult> {
  const cfg = readSESConfig(settings);
  const ses = buildSESClient(cfg);

  const fromName =
    settings['email.fromName'] || process.env.EMAIL_FROM_NAME || 'MyEvent.com.ng';
  const from = payload.from || formatFrom(fromName, cfg.fromAddress);
  const toAddresses = Array.isArray(payload.to) ? payload.to : [payload.to];

  // Plain email (no attachments) → simple API
  if (!payload.attachments || payload.attachments.length === 0) {
    const response = await ses.send(
      new SendEmailCommand({
        Source: from,
        ConfigurationSetName: cfg.configurationSet,
        Destination: { ToAddresses: toAddresses },
        ReplyToAddresses: payload.replyTo ? [payload.replyTo] : undefined,
        Message: {
          Subject: { Data: payload.subject, Charset: 'UTF-8' },
          Body: {
            Html: { Data: payload.html, Charset: 'UTF-8' },
            ...(payload.text
              ? { Text: { Data: payload.text, Charset: 'UTF-8' } }
              : {}),
          },
        },
      })
    );
    return { success: true, messageId: response.MessageId };
  }

  // With attachments → raw MIME message
  const raw = await buildRawMime({
    from,
    to: toAddresses,
    replyTo: payload.replyTo,
    subject: payload.subject,
    html: payload.html,
    text: payload.text,
    attachments: payload.attachments,
  });

  const response = await ses.send(
    new SendRawEmailCommand({
      Source: cfg.fromAddress,
      Destinations: toAddresses,
      ConfigurationSetName: cfg.configurationSet,
      RawMessage: { Data: raw },
    })
  );
  return { success: true, messageId: response.MessageId };
}

// ─── Resend provider ──────────────────────────────────────────────────────────

interface ResendConfig {
  apiKey: string;
  fromAddress: string;
}

function readResendConfig(settings: Record<string, string>): ResendConfig {
  const cfg: ResendConfig = {
    apiKey: (settings['email.resend.apiKey'] || process.env.RESEND_API_KEY || '').trim(),
    fromAddress: (settings['email.resend.fromAddress'] || process.env.RESEND_FROM_ADDRESS || '').trim(),
  };
  if (!cfg.apiKey) {
    throw new Error('Resend API key is not configured. Add it in Settings → Email.');
  }
  if (!/^re_[A-Za-z0-9_\-]{8,}$/.test(cfg.apiKey)) {
    throw new Error('Resend API key is invalid — it should start with "re_".');
  }
  if (!cfg.fromAddress) {
    throw new Error('Resend From Address is not configured (use an address on a domain verified in Resend).');
  }
  return cfg;
}

/** Resend wants the sender as an address or "Name <address>"; a pre-formatted `from` is passed through. */
function resendFrom(payload: SendEmailPayload, settings: Record<string, string>, cfg: ResendConfig): string {
  const fromName = settings['email.fromName'] || process.env.EMAIL_FROM_NAME || 'MyEvent.com.ng';
  return payload.from || formatFrom(fromName, cfg.fromAddress);
}

async function sendViaResend(
  payload: SendEmailPayload,
  settings: Record<string, string>
): Promise<EmailResult> {
  const cfg = readResendConfig(settings);
  const resend = new Resend(cfg.apiKey);

  // The Resend SDK returns { data, error } instead of throwing for API errors.
  const { data, error } = await resend.emails.send({
    from: resendFrom(payload, settings, cfg),
    to: Array.isArray(payload.to) ? payload.to : [payload.to],
    subject: payload.subject,
    html: payload.html,
    text: payload.text,
    replyTo: payload.replyTo,
    attachments: payload.attachments?.map((a) => ({
      filename: a.filename,
      content: typeof a.content === 'string' && a.encoding !== 'base64' ? Buffer.from(a.content) : a.content,
      contentType: a.contentType,
    })),
  });

  if (error) {
    throw Object.assign(new Error(error.message || 'Resend rejected the email'), { name: error.name });
  }
  return { success: true, messageId: data?.id };
}

// ─── Zoho ZeptoMail provider ──────────────────────────────────────────────────

/** ZeptoMail data centres → API host (the account's region decides which one accepts the token). */
export const ZEPTOMAIL_REGIONS: Record<string, string> = {
  // Newer Zoho CPaaS console ("Agent → SMTP/API" shows Host: cpaas.zoho.com)
  cpaas: 'cpaas.zoho.com',
  // Classic ZeptoMail accounts
  com: 'api.zeptomail.com',
  eu: 'api.zeptomail.eu',
  in: 'api.zeptomail.in',
  'com.au': 'api.zeptomail.com.au',
  jp: 'api.zeptomail.jp',
  ca: 'api.zeptomail.ca',
  sa: 'api.zeptomail.sa',
};

interface ZeptoConfig {
  token: string;
  host: string;
  fromAddress: string;
}

function readZeptoConfig(settings: Record<string, string>): ZeptoConfig {
  // The console shows the token as "Zoho-enczapikey <token>"; accept it with or without the prefix.
  const token = (settings['email.zeptomail.apiToken'] || process.env.ZEPTOMAIL_TOKEN || '')
    .trim()
    .replace(/^zoho-enczapikey\s*/i, '')
    .trim();
  const region = (settings['email.zeptomail.region'] || process.env.ZEPTOMAIL_REGION || 'cpaas').trim().toLowerCase();
  const fromAddress = (settings['email.zeptomail.fromAddress'] || process.env.ZEPTOMAIL_FROM_ADDRESS || '').trim();

  if (!token) throw new Error('ZeptoMail Send Mail Token is not configured. Add it in Settings → Email.');
  if (token.length < 20 || /\s/.test(token)) {
    throw new Error('ZeptoMail Send Mail Token looks invalid — copy the whole token from Mail Agent → SMTP/API → API.');
  }
  const host = ZEPTOMAIL_REGIONS[region];
  if (!host) throw new Error(`Unknown ZeptoMail region "${region}".`);
  if (!fromAddress) {
    throw new Error('ZeptoMail From Address is not configured (use an address on a domain verified in your Mail Agent).');
  }
  return { token, host, fromAddress };
}

/** "Name" <a@b.com> | Name <a@b.com> | a@b.com  →  { address, name } */
function parseAddress(input: string): { address: string; name?: string } {
  const m = input.match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/);
  if (m) return { address: m[2].trim(), name: m[1].trim() || undefined };
  return { address: input.trim() };
}

async function postToZeptoMail(
  cfg: ZeptoConfig,
  body: Record<string, unknown>
): Promise<string | undefined> {
  const res = await fetch(`https://${cfg.host}/v1.1/email`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Zoho-enczapikey ${cfg.token}`,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(25_000),
  });

  const json: any = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = json?.error?.details?.[0]?.message || json?.error?.message || json?.message || res.statusText;
    throw Object.assign(new Error(`ZeptoMail ${res.status}: ${detail}`), {
      name: json?.error?.code || `HTTP_${res.status}`,
    });
  }
  return json?.request_id as string | undefined;
}

async function sendViaZeptoMail(
  payload: SendEmailPayload,
  settings: Record<string, string>
): Promise<EmailResult> {
  const cfg = readZeptoConfig(settings);
  const fromName = settings['email.fromName'] || process.env.EMAIL_FROM_NAME || 'MyEvent.com.ng';
  const from = payload.from ? parseAddress(payload.from) : { address: cfg.fromAddress, name: fromName };

  const recipients = (Array.isArray(payload.to) ? payload.to : [payload.to]).map((t) => ({
    email_address: parseAddress(t),
  }));

  const requestId = await postToZeptoMail(cfg, {
    from,
    to: recipients,
    subject: payload.subject,
    htmlbody: payload.html,
    ...(payload.text ? { textbody: payload.text } : {}),
    ...(payload.replyTo ? { reply_to: [parseAddress(payload.replyTo)] } : {}),
    ...(payload.attachments?.length
      ? {
          attachments: payload.attachments.map((a) => ({
            name: a.filename,
            mime_type: a.contentType || 'application/octet-stream',
            content:
              typeof a.content === 'string' && a.encoding === 'base64'
                ? a.content
                : Buffer.from(a.content as any).toString('base64'),
          })),
        }
      : {}),
  });
  return { success: true, messageId: requestId };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Sends an email using whichever provider the super admin has selected.
 * Falls back to Gmail if the setting is missing.
 * Never throws — check `result.success` (and `result.error`).
 */
export async function sendEmail(payload: SendEmailPayload): Promise<EmailResult> {
  let provider: string = 'gmail';
  let result: EmailResult;

  try {
    const settings = await getEmailSettings();
    provider = (settings['email.activeProvider'] as EmailProviderType) || 'gmail';

    console.log(`📧 Sending email via provider: ${provider} → ${payload.to}`);

    result =
      provider === 'ses'
        ? await sendViaSES(payload, settings)
        : provider === 'resend'
          ? await sendViaResend(payload, settings)
          : provider === 'zeptomail'
            ? await sendViaZeptoMail(payload, settings)
            : await sendViaGmail(payload, settings);

    console.log(`✅ Email sent via ${provider} (MessageId: ${result.messageId})`);
  } catch (error) {
    console.error('❌ Email send failed:', error);
    result = { success: false, error };
  }

  await recordEmailLog(payload, provider, result);
  return result;
}

/** Writes an EmailLog row. Never throws — logging must not break sending. */
async function recordEmailLog(
  payload: SendEmailPayload,
  provider: string,
  result: EmailResult
): Promise<void> {
  if (!payload.log) return;

  try {
    const errMsg = result.success
      ? null
      : String((result.error as any)?.message ?? result.error ?? 'Unknown error').slice(0, 1000);

    await prisma.emailLog.create({
      data: {
        type: payload.log.type,
        status: result.success ? 'SENT' : 'FAILED',
        provider,
        toEmail: Array.isArray(payload.to) ? payload.to.join(', ') : payload.to,
        subject: payload.subject,
        orderId: payload.log.orderId ?? null,
        eventId: payload.log.eventId ?? null,
        eventTitle: payload.log.eventTitle ?? null,
        ticketIds: payload.log.ticketIds ?? [],
        attachmentCount: payload.attachments?.length ?? 0,
        messageId: result.messageId ?? null,
        error: errMsg,
      },
    });
  } catch (logError) {
    console.error('⚠️ Failed to write EmailLog:', logError);
  }
}

/**
 * AWS answers a bad/expired/deleted key (or a temporary ASIA key sent without its session token)
 * with a vague "security token ... is invalid". Say what to actually do about it.
 */
function friendlyProviderError(e: any): string {
  const raw: string = e?.message || (typeof e === 'string' ? e : 'Unknown email error');
  const name: string = e?.name || e?.Code || '';
  if (
    /security token included in the request is invalid/i.test(raw) ||
    /InvalidClientTokenId|SignatureDoesNotMatch|UnrecognizedClientException/i.test(name + raw)
  ) {
    return (
      'Amazon SES rejected the AWS credentials (invalid Access Key ID / Secret). ' +
      'Create a fresh IAM access key with SES send permission and re-enter both values in ' +
      'Admin → Settings → Email. Keys saved there override the AWS_SES_* environment variables. ' +
      `(AWS said: ${raw})`
    );
  }
  if (/restricted_api_key|invalid_api_key|API key is invalid/i.test(name + raw)) {
    return `Resend rejected the API key. Create a new key (with "Sending access") at resend.com/api-keys and re-enter it in Admin → Settings → Email. (Resend said: ${raw})`;
  }
  if (/domain is not verified|not verified|testing emails to your own email|validation_error/i.test(name + raw) && /resend|domain|verified|own email/i.test(raw)) {
    return `Resend refused the sender/recipient: verify your sending domain at resend.com/domains and use a From address on it (onboarding@resend.dev only delivers to your own Resend account email). (Resend said: ${raw})`;
  }
  if (/ZeptoMail (401|403)|SERR_|TM_3501|invalid.*token|token.*invalid/i.test(name + raw) && /zeptomail/i.test(raw)) {
    return `ZeptoMail rejected the Send Mail Token. Copy the token from your Mail Agent (SMTP/API → API), make sure the Region matches where your ZeptoMail account lives, and re-enter it in Admin → Settings → Email. (ZeptoMail said: ${raw})`;
  }
  if (/zeptomail/i.test(raw) && /sender|from|domain|verified|not allowed/i.test(raw)) {
    return `ZeptoMail refused the sender: use a From Address on a domain verified in the same Mail Agent as the token. (ZeptoMail said: ${raw})`;
  }
  if (/Email address is not verified|MessageRejected/i.test(name + raw)) {
    return `Amazon SES refused the message — the From address/domain is not verified (or the account is still in sandbox and the recipient is unverified). (AWS said: ${raw})`;
  }
  return raw;
}

/** Turns an EmailResult error into a readable message. */
export function emailErrorMessage(result: EmailResult): string {
  return friendlyProviderError(result.error);
}

/**
 * Test connectivity for a given provider using the current saved settings.
 * Used by the admin UI "Test Connection" button.
 */
export async function testEmailProvider(
  provider: EmailProviderType,
  /** Where Resend's test message goes (defaults to the From address). */
  testRecipient?: string
): Promise<{ success: boolean; message: string }> {
  try {
    const settings = await getEmailSettings();

    if (provider === 'zeptomail') {
      const cfg = readZeptoConfig(settings);
      const to = (testRecipient || cfg.fromAddress).trim();
      const fromName = settings['email.fromName'] || process.env.EMAIL_FROM_NAME || 'MyEvent.com.ng';
      const requestId = await postToZeptoMail(cfg, {
        from: { address: cfg.fromAddress, name: fromName },
        to: [{ email_address: { address: to } }],
        subject: 'MyEvent ZeptoMail Connection Test',
        textbody: 'This is an automated test from MyEvent.com.ng admin panel.',
      });
      return { success: true, message: `ZeptoMail connection verified ✅ (test sent to ${to}, request: ${requestId ?? 'ok'})` };
    }

    if (provider === 'resend') {
      const cfg = readResendConfig(settings);
      const to = (testRecipient || cfg.fromAddress.replace(/^.*<|>$/g, '')).trim();
      const resend = new Resend(cfg.apiKey);
      const { data, error } = await resend.emails.send({
        from: resendFrom({ to, subject: '', html: '' }, settings, cfg),
        to: [to],
        subject: 'MyEvent Resend Connection Test',
        text: 'This is an automated test from MyEvent.com.ng admin panel.',
      });
      if (error) {
        throw Object.assign(new Error(error.message), { name: error.name });
      }
      return { success: true, message: `Resend connection verified ✅ (test sent to ${to}, id: ${data?.id})` };
    }

    if (provider === 'gmail') {
      const transporter = await buildGmailTransporter(settings);
      await transporter.verify();
      return { success: true, message: 'Gmail SMTP connection verified ✅' };
    }

    const cfg = readSESConfig(settings); // throws a clear error if misconfigured
    const ses = buildSESClient(cfg);
    const result = await ses.send(
      new SendEmailCommand({
        Source: cfg.fromAddress,
        Destination: { ToAddresses: [cfg.fromAddress] },
        Message: {
          Subject: { Data: 'MyEvent SES Connection Test', Charset: 'UTF-8' },
          Body: {
            Text: {
              Data: 'This is an automated test from MyEvent.com.ng admin panel.',
              Charset: 'UTF-8',
            },
          },
        },
      })
    );
    return {
      success: true,
      message: `Amazon SES connection verified ✅ (MessageId: ${result.MessageId})`,
    };
  } catch (error: any) {
    return {
      success: false,
      message: `Connection failed: ${friendlyProviderError(error)}`,
    };
  }
}
