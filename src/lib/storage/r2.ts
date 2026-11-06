// Cloudflare R2 (S3-compatible). Credentials come from environment variables
// only; they are never stored in the database or returned to the browser.
//
//   R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY
//   R2_PUBLIC_BUCKET     - bucket for images (public via custom domain / r2.dev)
//   R2_PUBLIC_BASE_URL   - e.g. https://files.myevent.com.ng (no trailing slash)
//   R2_PRIVATE_BUCKET    - bucket for ticket PDFs (NO public access)

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadBucketCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export const R2_KEY_PREFIX = 'r2/'; // marks keys stored for ticket PDFs

export interface R2Status {
  credentials: boolean;
  publicBucket: boolean;
  publicBaseUrl: boolean;
  privateBucket: boolean;
  imagesReady: boolean;
  ticketPdfReady: boolean;
}

const env = (k: string) => (process.env[k] ?? '').trim();

export function getR2Status(): R2Status {
  const credentials = !!(env('R2_ACCOUNT_ID') && env('R2_ACCESS_KEY_ID') && env('R2_SECRET_ACCESS_KEY'));
  const publicBucket = !!env('R2_PUBLIC_BUCKET');
  const publicBaseUrl = /^https:\/\//.test(env('R2_PUBLIC_BASE_URL'));
  const privateBucket = !!env('R2_PRIVATE_BUCKET');
  return {
    credentials,
    publicBucket,
    publicBaseUrl,
    privateBucket,
    imagesReady: credentials && publicBucket && publicBaseUrl,
    ticketPdfReady: credentials && privateBucket,
  };
}

let client: S3Client | null = null;
function getClient(): S3Client {
  if (!getR2Status().credentials) throw new Error('Cloudflare R2 credentials are not configured');
  if (!client) {
    client = new S3Client({
      region: 'auto',
      endpoint: `https://${env('R2_ACCOUNT_ID')}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: env('R2_ACCESS_KEY_ID'),
        secretAccessKey: env('R2_SECRET_ACCESS_KEY'),
      },
      // R2 does not support the newer default checksum trailers on presigned PUTs.
      requestChecksumCalculation: 'WHEN_REQUIRED',
      responseChecksumValidation: 'WHEN_REQUIRED',
    });
  }
  return client;
}

export function r2PublicBaseUrl(): string {
  return env('R2_PUBLIC_BASE_URL').replace(/\/+$/, '');
}

export function r2PublicHost(): string | null {
  try {
    return new URL(env('R2_PUBLIC_BASE_URL')).hostname.toLowerCase();
  } catch {
    return null;
  }
}

/** True if the URL points at our R2 public bucket. */
export function isR2PublicUrl(url: string): boolean {
  const base = r2PublicBaseUrl();
  return !!base && url.startsWith(`${base}/`);
}

export function r2KeyFromPublicUrl(url: string): string | null {
  if (!isR2PublicUrl(url)) return null;
  const key = decodeURIComponent(url.slice(r2PublicBaseUrl().length + 1).split('?')[0]);
  // No traversal / odd keys.
  if (!key || key.includes('..') || key.startsWith('/')) return null;
  return key;
}

export async function presignImageUpload(args: {
  key: string;
  contentType: string;
  contentLength: number;
  expiresInSeconds?: number;
}): Promise<{ uploadUrl: string; publicUrl: string }> {
  const s = getR2Status();
  if (!s.imagesReady) throw new Error('Cloudflare R2 image storage is not fully configured');
  const cmd = new PutObjectCommand({
    Bucket: env('R2_PUBLIC_BUCKET'),
    Key: args.key,
    ContentType: args.contentType,
    ContentLength: args.contentLength,
    CacheControl: 'public, max-age=31536000, immutable',
  });
  const uploadUrl = await getSignedUrl(getClient(), cmd, { expiresIn: args.expiresInSeconds ?? 300 });
  const publicUrl = `${r2PublicBaseUrl()}/${args.key.split('/').map(encodeURIComponent).join('/')}`;
  return { uploadUrl, publicUrl };
}

export async function deletePublicObject(key: string): Promise<void> {
  await getClient().send(new DeleteObjectCommand({ Bucket: env('R2_PUBLIC_BUCKET'), Key: key }));
}

// ── Private bucket (ticket PDFs) ────────────────────────────────────────────

export async function putPrivateObject(key: string, data: Buffer, contentType = 'application/pdf'): Promise<void> {
  if (!getR2Status().ticketPdfReady) throw new Error('Cloudflare R2 private bucket (R2_PRIVATE_BUCKET) is not configured');
  await getClient().send(
    new PutObjectCommand({
      Bucket: env('R2_PRIVATE_BUCKET'),
      Key: key,
      Body: data,
      ContentType: contentType,
      CacheControl: 'private, no-store',
    }),
  );
}

export async function signPrivateGet(key: string, expiresInSeconds = 300, downloadName?: string): Promise<string> {
  if (!getR2Status().ticketPdfReady) throw new Error('Cloudflare R2 private bucket (R2_PRIVATE_BUCKET) is not configured');
  const cmd = new GetObjectCommand({
    Bucket: env('R2_PRIVATE_BUCKET'),
    Key: key,
    ResponseContentDisposition: downloadName ? `attachment; filename="${downloadName.replace(/[^\w.\-]/g, '_')}"` : undefined,
  });
  return getSignedUrl(getClient(), cmd, { expiresIn: expiresInSeconds });
}

export async function deletePrivateObject(key: string): Promise<void> {
  await getClient().send(new DeleteObjectCommand({ Bucket: env('R2_PRIVATE_BUCKET'), Key: key }));
}

/** Cheap connectivity check used by the admin "Test connection" button. */
export async function testR2Connection(): Promise<{ bucket: string; ok: boolean; error?: string }[]> {
  const out: { bucket: string; ok: boolean; error?: string }[] = [];
  for (const b of [env('R2_PUBLIC_BUCKET'), env('R2_PRIVATE_BUCKET')].filter(Boolean)) {
    try {
      await getClient().send(new HeadBucketCommand({ Bucket: b }));
      out.push({ bucket: b, ok: true });
    } catch (e) {
      out.push({ bucket: b, ok: false, error: e instanceof Error ? e.message : 'failed' });
    }
  }
  return out;
}
