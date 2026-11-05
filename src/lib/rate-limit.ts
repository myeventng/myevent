// Fixed-window rate limiter backed by Postgres so the limit holds across all
// serverless instances (an in-memory Map would reset per cold start). One atomic
// upsert per check; expired windows reset in the same statement.

import { prisma } from '@/lib/prisma';

export async function checkRateLimit(
  key: string,
  max: number,
  windowSeconds: number,
): Promise<{ ok: boolean; remaining: number }> {
  try {
    const rows = await prisma.$queryRaw<{ count: number }[]>`
      INSERT INTO "RateLimitBucket" ("key", "windowStart", "count")
      VALUES (${key}, NOW(), 1)
      ON CONFLICT ("key") DO UPDATE SET
        "count" = CASE WHEN "RateLimitBucket"."windowStart" < NOW() - (${windowSeconds} * INTERVAL '1 second')
                       THEN 1 ELSE "RateLimitBucket"."count" + 1 END,
        "windowStart" = CASE WHEN "RateLimitBucket"."windowStart" < NOW() - (${windowSeconds} * INTERVAL '1 second')
                             THEN NOW() ELSE "RateLimitBucket"."windowStart" END
      RETURNING "count"
    `;
    const count = Number(rows[0]?.count ?? 1);
    return { ok: count <= max, remaining: Math.max(0, max - count) };
  } catch (e) {
    // Never take the product down because the limiter failed; log and allow.
    console.error('rate limiter error:', e);
    return { ok: true, remaining: max };
  }
}

/** Housekeeping, called from the cron route. */
export async function purgeOldRateLimitBuckets(olderThanSeconds = 24 * 3600) {
  return prisma.$executeRaw`DELETE FROM "RateLimitBucket" WHERE "windowStart" < NOW() - (${olderThanSeconds} * INTERVAL '1 second')`;
}
