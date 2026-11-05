import { describe, expect, it } from 'vitest';
import { absoluteUrl, resolveShareImage, truncateForShare, SITE_URL } from '@/lib/share-image';

describe('share image resolution', () => {
  it('prefers the dedicated share image, with its measured dimensions', () => {
    const r = resolveShareImage({ shareImageUrl: 'https://utfs.io/f/a.png', shareImageWidth: 1200, shareImageHeight: 630, coverImageUrl: 'https://utfs.io/f/c.jpg' });
    expect(r).toMatchObject({ source: 'share', url: 'https://utfs.io/f/a.png', width: 1200, height: 630, type: 'image/png' });
  });
  it('falls back to the cover image and claims no dimensions', () => {
    const r = resolveShareImage({ coverImageUrl: 'https://utfs.io/f/c.jpg' });
    expect(r.source).toBe('cover'); expect(r.width).toBeUndefined(); expect(r.type).toBe('image/jpeg');
  });
  it('falls back to the platform default as an absolute URL', () => {
    const r = resolveShareImage({});
    expect(r).toMatchObject({ source: 'default', width: 1200, height: 630 });
    expect(r.url).toBe(`${SITE_URL}/og-default.jpg`);
  });
  it('always yields absolute https URLs', () => {
    expect(absoluteUrl('/x.jpg')).toBe(`${SITE_URL}/x.jpg`);
    expect(absoluteUrl('http://a.com/x.jpg')).toBe('https://a.com/x.jpg');
    expect(absoluteUrl('//a.com/x.jpg')).toBe('https://a.com/x.jpg');
  });
  it('strips markup and truncates descriptions', () => {
    expect(truncateForShare('<p>Hello   <b>world</b></p>')).toBe('Hello world');
    expect(truncateForShare('a'.repeat(300), 50)).toHaveLength(50);
  });
});
