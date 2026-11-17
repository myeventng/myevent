/**
 * The major categories shown in the site filters (same set as Shoobs), and the rules used to
 * place a category under one of them. Used by prisma/assign-major-categories.ts and by the
 * admin categories screen, so both agree.
 */

export interface MajorCategorySeed {
  name: string;
  slug: string;
  sortOrder: number;
}

export const MAJOR_CATEGORIES: MajorCategorySeed[] = [
  { name: 'Clubbing', slug: 'clubbing', sortOrder: 1 },
  { name: 'Comedy', slug: 'comedy', sortOrder: 2 },
  { name: 'Culture', slug: 'culture', sortOrder: 3 },
  { name: 'Festivals', slug: 'festivals', sortOrder: 4 },
  { name: 'Live Music', slug: 'live-music', sortOrder: 5 },
  { name: 'Meet-ups', slug: 'meet-ups', sortOrder: 6 },
  { name: 'Online', slug: 'online', sortOrder: 7 },
];

/**
 * Where each existing category goes (matched by name, ignoring case). Edit this table to change
 * the placement, or change a category's major category later from Admin > Categories.
 */
export const CATEGORY_TO_MAJOR: Record<string, string> = {
  'comedy': 'comedy',
  'party': 'clubbing',
  'festivals': 'festivals',
  'music & entertainment': 'live-music',
  'concert': 'live-music',
  'album launch': 'live-music',
  'arts & culture': 'culture',
  'awards': 'culture',
  'fashion': 'culture',
  'food & drink': 'culture',
  'movie premiere': 'culture',
  'theatre / stage play': 'culture',
  'religion': 'culture',
  'talent hunt': 'culture',
  'pageantry': 'culture',
  'campus tour': 'meet-ups',
  'technology': 'meet-ups',
  'business & networking': 'meet-ups',
  'sports & fitness': 'meet-ups',
  'conferences': 'meet-ups',
  'beach / picnic': 'meet-ups',
  'career / education': 'meet-ups',
  'government': 'meet-ups',
};

/** Keyword fallback for categories added later that are not in the table above. */
const KEYWORD_RULES: Array<{ slug: string; words: string[] }> = [
  { slug: 'online', words: ['online', 'virtual', 'webinar', 'livestream', 'live stream'] },
  { slug: 'clubbing', words: ['club', 'party', 'afrobeat night', 'rave', 'dj'] },
  { slug: 'comedy', words: ['comedy', 'stand-up', 'standup'] },
  { slug: 'festivals', words: ['festival', 'carnival'] },
  { slug: 'live-music', words: ['concert', 'music', 'live band', 'gig', 'album'] },
  { slug: 'meet-ups', words: ['meet', 'network', 'conference', 'summit', 'workshop', 'seminar', 'tour', 'sport'] },
  { slug: 'culture', words: ['art', 'culture', 'theatre', 'theater', 'film', 'movie', 'fashion', 'food', 'award', 'pageant', 'religio', 'church'] },
];

/** Suggests a major category slug for a category name, or null when nothing fits. */
export function suggestMajorSlug(categoryName: string): string | null {
  const key = categoryName.trim().toLowerCase();
  if (CATEGORY_TO_MAJOR[key]) return CATEGORY_TO_MAJOR[key];
  for (const rule of KEYWORD_RULES) {
    if (rule.words.some((w) => key.includes(w))) return rule.slug;
  }
  return null;
}

/** A category that makes the Online major category usable out of the box. */
export const ONLINE_DEFAULT_CATEGORY = 'Online Events';
