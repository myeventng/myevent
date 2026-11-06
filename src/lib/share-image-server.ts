import { imageSize } from 'image-size';
import { SHARE_IMAGE_RULES } from '@/lib/share-image';
import { r2PublicHost } from '@/lib/storage/r2';

// Only accept images uploaded through our own storage: UploadThing or our R2 public bucket (stops SSRF and hotlinked junk).
const ALLOWED_HOSTS = [/^utfs\.io$/i, /\.ufs\.sh$/i, /^ufs\.sh$/i];

function isAllowedHost(host: string): boolean {
  if (ALLOWED_HOSTS.some((r) => r.test(host))) return true;
  const r2 = r2PublicHost();
  return !!r2 && host.toLowerCase() === r2;
}

export class ShareImageError extends Error {}

export async function validateAndMeasureShareImage(url: string): Promise<{ url: string; width: number; height: number }> {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    throw new ShareImageError('The share image URL is not valid');
  }
  if (u.protocol !== 'https:' || !isAllowedHost(u.hostname)) {
    throw new ShareImageError('Please upload the share image using the uploader');
  }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(u.toString(), { signal: ctrl.signal, redirect: 'error', cache: 'no-store' });
    if (!res.ok) throw new ShareImageError('The share image could not be read. Try uploading it again.');
    const declared = Number(res.headers.get('content-length') ?? 0);
    if (declared > SHARE_IMAGE_RULES.maxBytes) throw new ShareImageError('Share image must be under 4 MB');
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > SHARE_IMAGE_RULES.maxBytes) throw new ShareImageError('Share image must be under 4 MB');
    let dims: { width?: number; height?: number; type?: string };
    try {
      dims = imageSize(buf);
    } catch {
      throw new ShareImageError('That file is not a supported image (use JPG, PNG or WebP)');
    }
    const mime = dims.type === 'png' ? 'image/png' : dims.type === 'webp' ? 'image/webp' : dims.type === 'jpg' ? 'image/jpeg' : '';
    if (!SHARE_IMAGE_RULES.allowedTypes.includes(mime)) throw new ShareImageError('Share image must be a JPG, PNG or WebP');
    if (!dims.width || !dims.height) throw new ShareImageError('Could not read the image size');
    if (dims.width < SHARE_IMAGE_RULES.minWidth || dims.height < SHARE_IMAGE_RULES.minHeight) {
      throw new ShareImageError(`Image is too small (${dims.width}×${dims.height}). Use at least ${SHARE_IMAGE_RULES.minWidth}×${SHARE_IMAGE_RULES.minHeight}; recommended ${SHARE_IMAGE_RULES.recommended}.`);
    }
    return { url: u.toString(), width: dims.width, height: dims.height };
  } catch (e) {
    if (e instanceof ShareImageError) throw e;
    throw new ShareImageError('The share image could not be checked. Please try again.');
  } finally {
    clearTimeout(timer);
  }
}
