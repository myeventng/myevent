import { PrismaClient } from '@/generated/prisma';
import { PrismaPg } from '@prisma/adapter-pg';

const url = process.env.TEST_DATABASE_URL;
if (!url) throw new Error('TEST_DATABASE_URL is required for integration tests');

const g = globalThis as unknown as { __testPrisma?: PrismaClient };
export const prisma = g.__testPrisma ?? new PrismaClient({ adapter: new PrismaPg({ connectionString: url, max: 10 }) });
g.__testPrisma = prisma;
