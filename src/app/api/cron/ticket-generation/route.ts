import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { prisma } from '@/lib/prisma';
import { STALE_PENDING_PAYMENT_MS, cancelUnpaidBatch, processNextPart } from '@/lib/ticket-generation/service';
import { purgeOldRateLimitBuckets } from '@/lib/rate-limit';

// Vercel Cron: resumes abandoned/failed generation jobs, releases stale unpaid reservations.
// Secured with CRON_SECRET (Vercel sends `Authorization: Bearer $CRON_SECRET`).
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

function authorized(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const given = Buffer.from(req.headers.get('authorization') ?? '');
  const want = Buffer.from(`Bearer ${secret}`);
  return given.length === want.length && timingSafeEqual(given, want);
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const started = Date.now();
  const budgetMs = 45_000;

  // 1) Unpaid batches past the reservation window → cancel and give inventory back.
  const stale = await prisma.ticketGenerationBatch.findMany({
    where: { status: 'PENDING_PAYMENT', createdAt: { lt: new Date(Date.now() - STALE_PENDING_PAYMENT_MS) } },
    select: { id: true },
    take: 100,
  });
  let released = 0;
  for (const b of stale) if (await cancelUnpaidBatch(b.id)) released++;

  // 2) Resume work that nobody is driving (browser closed, instance died, transient storage error).
  const candidates = await prisma.ticketGenerationBatch.findMany({
    where: {
      status: { in: ['READY', 'GENERATING', 'FAILED'] },
      OR: [{ lockedUntil: null }, { lockedUntil: { lt: new Date() } }],
    },
    orderBy: { updatedAt: 'asc' },
    select: { id: true },
    take: 20,
  });
  let parts = 0;
  for (const c of candidates) {
    while (Date.now() - started < budgetMs) {
      const r = await processNextPart(c.id);
      if (r.busy || r.error) break;
      parts++;
      if (r.done) break;
    }
    if (Date.now() - started >= budgetMs) break;
  }

  await purgeOldRateLimitBuckets().catch(() => null);
  return NextResponse.json({ releasedReservations: released, partsGenerated: parts, examined: candidates.length });
}
