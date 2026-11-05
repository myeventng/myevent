/**
 * Idempotent seed for physical-ticket generation pricing tiers.
 *
 *   npm run seed:ticket-pricing
 *
 * Safe to run any number of times: it only inserts the defaults when the table is empty,
 * so tiers an admin has edited, added or removed are NEVER overwritten.
 */
import { prisma } from '@/lib/prisma';
import { DEFAULT_PRICING_TIERS } from '@/lib/ticket-generation/default-tiers';

async function main() {
  const existing = await prisma.ticketGenerationPricingTier.count();
  if (existing > 0) {
    console.log(`Pricing tiers already present (${existing}); nothing to do.`);
    return;
  }
  await prisma.ticketGenerationPricingTier.createMany({
    data: DEFAULT_PRICING_TIERS.map((t) => ({ ...t, isActive: true })),
  });
  console.log(`Seeded ${DEFAULT_PRICING_TIERS.length} default pricing tiers.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
