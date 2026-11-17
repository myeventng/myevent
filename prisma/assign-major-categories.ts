/**
 * Puts every existing category under one of the major categories
 * (Clubbing, Comedy, Culture, Festivals, Live Music, Meet-ups, Online).
 *
 *   npm run categories:assign              assign categories that have no major category yet
 *   npm run categories:assign -- --dry-run show what would change, write nothing
 *   npm run categories:assign -- --force   also re-assign categories that already have one
 *
 * Safe to run more than once. Events are not touched: they keep their category, and the
 * major category is read through it.
 */
import { prisma } from '@/lib/prisma';
import {
  MAJOR_CATEGORIES,
  ONLINE_DEFAULT_CATEGORY,
  suggestMajorSlug,
} from '@/lib/major-categories';

const DRY_RUN = process.argv.includes('--dry-run');
const FORCE = process.argv.includes('--force');

async function main() {
  console.log(`Assigning major categories${DRY_RUN ? ' (dry run, nothing is written)' : ''}...`);

  // 1. The major categories themselves.
  const majorBySlug = new Map<string, { id: string; name: string }>();
  for (const m of MAJOR_CATEGORIES) {
    if (DRY_RUN) {
      const existing = await prisma.majorCategory.findUnique({ where: { slug: m.slug } });
      majorBySlug.set(m.slug, { id: existing?.id ?? `(new) ${m.slug}`, name: m.name });
      continue;
    }
    const row = await prisma.majorCategory.upsert({
      where: { slug: m.slug },
      update: { name: m.name, sortOrder: m.sortOrder },
      create: m,
    });
    majorBySlug.set(m.slug, { id: row.id, name: row.name });
  }

  // 2. A starter category under Online, so that major category is usable straight away.
  const online = majorBySlug.get('online');
  const hasOnlineCategory = await prisma.category.findFirst({
    where: { name: { equals: ONLINE_DEFAULT_CATEGORY, mode: 'insensitive' } },
  });
  if (!hasOnlineCategory && online) {
    console.log(`+ category "${ONLINE_DEFAULT_CATEGORY}" -> Online`);
    if (!DRY_RUN) {
      await prisma.category.create({
        data: { name: ONLINE_DEFAULT_CATEGORY, majorCategoryId: online.id },
      });
    }
  }

  // 3. Existing categories.
  const categories = await prisma.category.findMany({
    orderBy: { name: 'asc' },
    include: { majorCategory: true },
  });

  let assigned = 0;
  let kept = 0;
  const unmatched: string[] = [];

  for (const category of categories) {
    if (category.majorCategoryId && !FORCE) {
      kept++;
      continue;
    }
    const slug = suggestMajorSlug(category.name);
    const major = slug ? majorBySlug.get(slug) : undefined;
    if (!major) {
      unmatched.push(category.name);
      continue;
    }
    console.log(`  ${category.name.padEnd(28)} -> ${major.name}`);
    if (!DRY_RUN) {
      await prisma.category.update({
        where: { id: category.id },
        data: { majorCategoryId: major.id },
      });
    }
    assigned++;
  }

  console.log('');
  console.log(`Assigned: ${assigned}   Already set (left alone): ${kept}   No match: ${unmatched.length}`);
  if (unmatched.length) {
    console.log('No match for:');
    unmatched.forEach((n) => console.log(`  - ${n}`));
    console.log('Set these from Admin > Categories, or add them to CATEGORY_TO_MAJOR in src/lib/major-categories.ts.');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
