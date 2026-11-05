// Social-sharing image resolution. Order: dedicated share image → cover image → platform default.
// Always returns an ABSOLUTE https URL (WhatsApp, Facebook, X and LinkedIn crawlers ignore relative URLs).

export const SITE_URL = (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || 'https://myevent.com.ng').replace(/\/+$/, '');

export const DEFAULT_SHARE_IMAGE = { path: '/og-default.jpg', width: 1200, height: 630, type: 'image/jpeg' } as const;

export const SHARE_IMAGE_RULES = {
  maxBytes: 4 * 1024 * 1024,
  minWidth: 600,
  minHeight: 315,
  recommended: '1200 × 630 px (1.91:1), JPG or PNG, under 4 MB',
  allowedTypes: ['image/jpeg', 'image/png', 'image/webp'] as string[],
} as const;

export function absoluteUrl(u: string): string {
  if (/^https?:\/\//i.test(u)) return u.replace(/^http:\/\//i, 'https://');
  if (u.startsWith('//')) return `https:${u}`;
  return `${SITE_URL}${u.startsWith('/') ? '' : '/'}${u}`;
}

function mimeFromUrl(url: string): string | undefined {
  const m = url.split('?')[0].toLowerCase().match(/\.(jpe?g|png|webp)$/);
  if (!m) return undefined;
  return m[1] === 'png' ? 'image/png' : m[1] === 'webp' ? 'image/webp' : 'image/jpeg';
}

export interface ResolvedShareImage {
  url: string;
  width?: number;
  height?: number;
  type?: string;
  source: 'share' | 'cover' | 'default';
}

export function resolveShareImage(event: {
  shareImageUrl?: string | null;
  shareImageWidth?: number | null;
  shareImageHeight?: number | null;
  coverImageUrl?: string | null;
}): ResolvedShareImage {
  if (event.shareImageUrl) {
    return {
      url: absoluteUrl(event.shareImageUrl),
      width: event.shareImageWidth ?? undefined,
      height: event.shareImageHeight ?? undefined,
      type: mimeFromUrl(event.shareImageUrl),
      source: 'share',
    };
  }
  if (event.coverImageUrl) {
    // Cover dimensions are unknown, so none are claimed (a wrong og:image:width hurts previews).
    return { url: absoluteUrl(event.coverImageUrl), type: mimeFromUrl(event.coverImageUrl), source: 'cover' };
  }
  return { url: absoluteUrl(DEFAULT_SHARE_IMAGE.path), width: DEFAULT_SHARE_IMAGE.width, height: DEFAULT_SHARE_IMAGE.height, type: DEFAULT_SHARE_IMAGE.type, source: 'default' };
}

export function truncateForShare(text: string | null | undefined, max = 200): string {
  const clean = (text ?? '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  return clean.length > max ? `${clean.slice(0, max - 1).trimEnd()}…` : clean;
}
