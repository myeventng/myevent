// src/app/api/webhook/ses/route.ts
// Receives Amazon SES delivery / bounce / complaint events via Amazon SNS and
// updates the matching EmailLog row.
//
// Path starts with /api/webhook/ so the middleware lets it through untouched
// (no auth redirect, no maintenance-mode block).

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ─── SNS signature verification ───────────────────────────────────────────────

const certCache = new Map<string, string>();

function isValidCertUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return (
      u.protocol === 'https:' &&
      /^sns\.[a-z0-9-]+\.amazonaws\.com(\.cn)?$/.test(u.hostname) &&
      u.pathname.endsWith('.pem')
    );
  } catch {
    return false;
  }
}

function buildStringToSign(msg: Record<string, string>): string | null {
  const type = msg.Type;
  let keys: string[];

  if (type === 'Notification') {
    keys = ['Message', 'MessageId', 'Subject', 'Timestamp', 'TopicArn', 'Type'];
  } else if (type === 'SubscriptionConfirmation' || type === 'UnsubscribeConfirmation') {
    keys = ['Message', 'MessageId', 'SubscribeURL', 'Timestamp', 'Token', 'TopicArn', 'Type'];
  } else {
    return null;
  }

  return keys
    .filter((k) => msg[k] !== undefined) // Subject is optional
    .map((k) => `${k}\n${msg[k]}\n`)
    .join('');
}

async function verifySnsSignature(msg: Record<string, string>): Promise<boolean> {
  try {
    if (!msg.Signature || !msg.SigningCertURL) return false;
    if (!isValidCertUrl(msg.SigningCertURL)) return false;

    const stringToSign = buildStringToSign(msg);
    if (!stringToSign) return false;

    let cert = certCache.get(msg.SigningCertURL);
    if (!cert) {
      const res = await fetch(msg.SigningCertURL);
      if (!res.ok) return false;
      cert = await res.text();
      certCache.set(msg.SigningCertURL, cert);
    }

    const algo = msg.SignatureVersion === '2' ? 'RSA-SHA256' : 'RSA-SHA1';
    const verifier = crypto.createVerify(algo);
    verifier.update(stringToSign, 'utf8');
    return verifier.verify(cert, msg.Signature, 'base64');
  } catch (error) {
    console.error('SNS signature verification error:', error);
    return false;
  }
}

// ─── Event handling ───────────────────────────────────────────────────────────

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** The webhook can arrive a moment before the EmailLog row is written. */
async function findLogByMessageId(messageId: string) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const log = await prisma.emailLog.findFirst({ where: { messageId } });
    if (log) return log;
    await sleep(1000);
  }
  return null;
}

async function handleSesEvent(event: any) {
  const kind = String(event.eventType || event.notificationType || '').toLowerCase();
  const messageId: string | undefined = event.mail?.messageId;

  if (!messageId || !kind) return;

  // Ignore events we don't track (send, open, click, rendering failure ...)
  if (!['delivery', 'bounce', 'complaint', 'reject'].includes(kind)) return;

  const log = await findLogByMessageId(messageId);
  if (!log) {
    // Not one of our ticket emails (e.g. a password reset) — nothing to update.
    return;
  }

  if (kind === 'delivery') {
    // Only move forward from SENT; never overwrite a bounce/complaint.
    if (log.status !== 'SENT') return;
    await prisma.emailLog.update({
      where: { id: log.id },
      data: {
        status: 'DELIVERED',
        deliveredAt: event.delivery?.timestamp
          ? new Date(event.delivery.timestamp)
          : new Date(),
      },
    });
    return;
  }

  if (kind === 'bounce') {
    const bounce = event.bounce ?? {};
    const recipient = bounce.bouncedRecipients?.[0] ?? {};
    await prisma.emailLog.update({
      where: { id: log.id },
      data: {
        status: 'BOUNCED',
        bouncedAt: bounce.timestamp ? new Date(bounce.timestamp) : new Date(),
        bounceType: [bounce.bounceType, bounce.bounceSubType].filter(Boolean).join('/') || null,
        bounceReason: (
          recipient.diagnosticCode ||
          recipient.status ||
          'Recipient mail server rejected the message'
        )
          .toString()
          .slice(0, 1000),
      },
    });
    return;
  }

  if (kind === 'complaint') {
    const complaint = event.complaint ?? {};
    await prisma.emailLog.update({
      where: { id: log.id },
      data: {
        status: 'COMPLAINED',
        complainedAt: complaint.timestamp ? new Date(complaint.timestamp) : new Date(),
        bounceReason: `Recipient reported this email${
          complaint.complaintFeedbackType ? ` (${complaint.complaintFeedbackType})` : ''
        } as spam`,
      },
    });
    return;
  }

  if (kind === 'reject') {
    await prisma.emailLog.update({
      where: { id: log.id },
      data: {
        status: 'FAILED',
        error: `SES rejected the message: ${event.reject?.reason ?? 'unknown reason'}`,
      },
    });
  }
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  let msg: Record<string, string>;
  try {
    // SNS sends JSON with a text/plain content type, so read it as text
    msg = JSON.parse(await request.text());
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  if (!(await verifySnsSignature(msg))) {
    console.warn('⚠️ SES webhook: invalid SNS signature, ignoring');
    return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
  }

  // Optional extra guard: only accept our own topic(s)
  const allowed = (process.env.SES_SNS_TOPIC_ARN || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (allowed.length > 0 && !allowed.includes(msg.TopicArn)) {
    console.warn(`⚠️ SES webhook: unexpected topic ${msg.TopicArn}`);
    return NextResponse.json({ error: 'Unexpected topic' }, { status: 403 });
  }

  try {
    if (msg.Type === 'SubscriptionConfirmation') {
      // Auto-confirm the subscription (URL host re-validated)
      const u = new URL(msg.SubscribeURL);
      if (u.protocol === 'https:' && /^sns\.[a-z0-9-]+\.amazonaws\.com(\.cn)?$/.test(u.hostname)) {
        await fetch(msg.SubscribeURL);
        console.log('✅ SNS subscription confirmed for', msg.TopicArn);
      }
      return NextResponse.json({ ok: true });
    }

    if (msg.Type === 'Notification') {
      const event = JSON.parse(msg.Message);
      await handleSesEvent(event);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('❌ SES webhook processing failed:', error);
    // 500 → SNS will retry delivery
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
  }
}
