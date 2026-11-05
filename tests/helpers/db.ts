import fs from 'node:fs';
import path from 'node:path';
import { prisma } from '@/lib/prisma';
import { randomUUID } from 'node:crypto';

const MIGRATION = path.resolve(__dirname, '../../prisma/migrations/20261105000000_commission_staff_physical_tickets/migration.sql');

/** The seed section of the migration, so tests exercise the real default data too. */
function seedSql(): string {
  const sql = fs.readFileSync(MIGRATION, 'utf8');
  return sql.slice(sql.indexOf('-- ─── Idempotent defaults'));
}

export async function resetDb() {
  const tables = await prisma.$queryRawUnsafe<{ tablename: string }[]>(
    `SELECT tablename::text AS tablename FROM pg_tables WHERE schemaname='public' AND tablename NOT LIKE '\\_prisma%'`,
  );
  const list = tables.map((t) => `"${t.tablename}"`).join(', ');
  await prisma.$executeRawUnsafe(`TRUNCATE ${list} RESTART IDENTITY CASCADE`);
  // seed statements are separated by ';' at line ends
  for (const stmt of seedSql().split(/;\s*\n/).map((s) => s.trim()).filter((s) => /^(INSERT)/im.test(s.replace(/--.*\n/g, '')))) {
    await prisma.$executeRawUnsafe(stmt.replace(/^--.*$/gm, ''));
  }
}

let counter = 0;
const uid = () => `${Date.now().toString(36)}${(counter++).toString(36)}${randomUUID().slice(0, 4)}`;

export async function makeUser(opts: { role?: 'ADMIN' | 'USER'; subRole?: 'ORDINARY' | 'ORGANIZER' | 'STAFF' | 'SUPER_ADMIN'; email?: string; name?: string } = {}) {
  const id = randomUUID();
  const now = new Date();
  return prisma.user.create({
    data: {
      id,
      name: opts.name ?? `User ${uid()}`,
      email: opts.email ?? `${uid()}@test.dev`,
      emailVerified: true,
      createdAt: now,
      updatedAt: now,
      role: opts.role ?? 'USER',
      subRole: opts.subRole ?? 'ORDINARY',
    },
  });
}

export async function makeOrganizer(name = 'Org') {
  const user = await makeUser({ subRole: 'ORGANIZER', name });
  await prisma.organizerProfile.create({ data: { organizationName: `${name} Events`, userId: user.id } });
  return user;
}

let venueId: string | null = null;
export async function makeEvent(
  owner: { id: string },
  opts: { title?: string; ticketQty?: number; price?: number; attendeeLimit?: number; startsInHours?: number } = {},
) {
  if (!venueId) {
    const city = await prisma.city.create({ data: { name: `City ${uid()}`, state: 'FCT' } });
    const v = await prisma.venue.create({ data: { name: 'Hall', address: '1 Main St', cityId: city.id, userId: owner.id } });
    venueId = v.id;
  }
  const start = new Date(Date.now() + (opts.startsInHours ?? 0.5) * 3600_000);
  const event = await prisma.event.create({
    data: {
      title: opts.title ?? `Event ${uid()}`,
      slug: `ev-${uid()}`,
      userId: owner.id,
      venueId,
      startDateTime: start,
      endDateTime: new Date(start.getTime() + 4 * 3600_000),
      publishedStatus: 'PUBLISHED',
      attendeeLimit: opts.attendeeLimit,
      isFree: false,
      imageUrls: [],
    },
  });
  const ticketType = await prisma.ticketType.create({
    data: { name: 'Regular', price: opts.price ?? 5000, quantity: opts.ticketQty ?? 1000, eventId: event.id },
  });
  return { event, ticketType };
}

export function resetVenueCache() {
  venueId = null;
}
