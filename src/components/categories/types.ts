import type { Category } from '@/generated/prisma';

export type MajorOption = { id: string; name: string; slug?: string };

/** A category with the major category it sits under (null when not assigned yet). */
export type CategoryRow = Category & {
  majorCategoryId?: string | null;
  majorCategory?: MajorOption | null;
};
