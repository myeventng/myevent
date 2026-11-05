// Paystack calls for the generation fee. The amount ALWAYS comes from the
// server-side payment row (computed from admin-managed pricing tiers); nothing
// the browser sends can influence what is charged.

import { getPaystackConfig } from '@/lib/platform-settings';
import { settlePayment, type SettleResult } from '@/lib/ticket-generation/service';
import { prisma } from '@/lib/prisma';

const BASE = 'https://api.paystack.co';

export class PaystackError extends Error {}

async function secretKey(): Promise<string> {
  const { secretKey } = await getPaystackConfig();
  if (!secretKey) throw new PaystackError('Payment provider is not configured');
  return secretKey;
}

export function appBaseUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || 'https://myevent.com.ng';
}

export async function initializeGenerationPayment(args: { reference: string; email: string; amountKobo: number; metadata: Record<string, unknown> }) {
  const res = await fetch(`${BASE}/transaction/initialize`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${await secretKey()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: args.email,
      amount: args.amountKobo, // kobo, from the DB
      currency: 'NGN',
      reference: args.reference,
      callback_url: `${appBaseUrl()}/api/payment/callback`,
      metadata: { kind: 'ticket_generation', ...args.metadata },
    }),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.status || !json?.data?.authorization_url) {
    throw new PaystackError(json?.message || 'Could not start payment');
  }
  return { authorizationUrl: json.data.authorization_url as string, accessCode: json.data.access_code as string };
}

export async function verifyReference(reference: string): Promise<{ status: string; amountKobo: number; currency: string }> {
  const res = await fetch(`${BASE}/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${await secretKey()}` },
    cache: 'no-store',
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.status || !json?.data) throw new PaystackError(json?.message || 'Could not verify payment');
  return { status: String(json.data.status), amountKobo: Number(json.data.amount), currency: String(json.data.currency) };
}

export async function isGenerationReference(reference: string): Promise<boolean> {
  if (!reference.startsWith('tgp_')) return false;
  return !!(await prisma.ticketGenerationPayment.findUnique({ where: { reference }, select: { id: true } }));
}

/** Verify with Paystack (never trusting the browser) and settle exactly once. */
export async function verifyAndSettleGeneration(reference: string): Promise<SettleResult> {
  const verified = await verifyReference(reference);
  return settlePayment(reference, verified);
}

/** Settle from an already signature-verified webhook payload. */
export async function settleFromWebhook(data: { reference: string; status: string; amount: number; currency: string }): Promise<SettleResult> {
  return settlePayment(data.reference, { status: data.status, amountKobo: Number(data.amount), currency: String(data.currency) });
}
