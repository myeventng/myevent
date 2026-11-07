import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const ENV = {
  R2_ACCOUNT_ID: 'acc123',
  R2_ACCESS_KEY_ID: 'AKIATEST',
  R2_SECRET_ACCESS_KEY: 'secretsecretsecret',
  R2_PUBLIC_BUCKET: 'myevent-public',
  R2_PRIVATE_BUCKET: 'myevent-private',
  R2_PUBLIC_BASE_URL: 'https://files.myevent.com.ng/',
};
const saved: Record<string, string | undefined> = {};

beforeEach(() => {
  for (const k of Object.keys(ENV)) saved[k] = process.env[k];
  Object.assign(process.env, ENV);
  vi.resetModules();
});
afterEach(() => {
  for (const [k, v] of Object.entries(saved)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
});

describe('R2 config + helpers', () => {
  it('reports readiness from env', async () => {
    const r2 = await import('@/lib/storage/r2');
    expect(r2.getR2Status()).toMatchObject({ imagesReady: true, ticketPdfReady: true });
    delete process.env.R2_PRIVATE_BUCKET;
    expect(r2.getR2Status().ticketPdfReady).toBe(false);
    delete process.env.R2_SECRET_ACCESS_KEY;
    expect(r2.getR2Status().imagesReady).toBe(false);
  });

  it('requires https public base url', async () => {
    process.env.R2_PUBLIC_BASE_URL = 'http://files.example.com';
    const r2 = await import('@/lib/storage/r2');
    expect(r2.getR2Status().imagesReady).toBe(false);
  });

  it('maps public URLs back to keys and rejects foreign / traversal URLs', async () => {
    const r2 = await import('@/lib/storage/r2');
    expect(r2.r2KeyFromPublicUrl('https://files.myevent.com.ng/eventCover/2026/11/a.jpg')).toBe('eventCover/2026/11/a.jpg');
    expect(r2.r2KeyFromPublicUrl('https://utfs.io/f/abc')).toBeNull();
    expect(r2.r2KeyFromPublicUrl('https://files.myevent.com.ng/../secret')).toBeNull();
    expect(r2.isR2PublicUrl('https://files.myevent.com.ng.evil.com/x')).toBe(false);
    expect(r2.r2PublicHost()).toBe('files.myevent.com.ng');
  });

  it('presigns a PUT for the public bucket with a fixed content type and length', async () => {
    const r2 = await import('@/lib/storage/r2');
    const { uploadUrl, publicUrl } = await r2.presignImageUpload({
      key: 'eventCover/2026/11/x.png',
      contentType: 'image/png',
      contentLength: 1234,
    });
    const u = new URL(uploadUrl);
    // S3 virtual-hosted style: bucket.account.r2.cloudflarestorage.com
    expect(u.hostname).toBe('myevent-public.acc123.r2.cloudflarestorage.com');
    expect(u.pathname).toBe('/eventCover/2026/11/x.png');
    expect(u.searchParams.get('X-Amz-Expires')).toBe('300');
    expect(u.searchParams.get('X-Amz-SignedHeaders') ?? '').toContain('content-length');
    expect(publicUrl).toBe('https://files.myevent.com.ng/eventCover/2026/11/x.png');
  });

  it('signs private GETs against the private bucket only', async () => {
    const r2 = await import('@/lib/storage/r2');
    const url = await r2.signPrivateGet('tickets/b1/1-part.pdf', 120, 'part.pdf');
    expect(new URL(url).hostname).toBe('myevent-private.acc123.r2.cloudflarestorage.com');
    expect(new URL(url).searchParams.get('X-Amz-Expires')).toBe('120');
  });
});

describe('upload rules', () => {
  it('knows every endpoint and excludes SVG', async () => {
    const rules = await import('@/lib/storage/rules');
    expect(Object.keys(rules.ENDPOINT_RULES).sort()).toEqual(
      ['blogImage', 'contestantImage', 'eventCover', 'eventImage', 'eventShareImage', 'profileImage', 'venueImage'],
    );
    expect(rules.ALLOWED_IMAGE_TYPES['image/svg+xml']).toBeUndefined();
    expect(rules.isUploadEndpoint('hacker')).toBe(false);
    expect(rules.isUploadEndpoint('toString')).toBe(false);
  });
});

describe('ticket PDF storage routing', () => {
  it('sends new parts to R2 when selected, and still serves old UploadThing keys', async () => {
    const putPrivateObject = vi.fn().mockResolvedValue(undefined);
    const signPrivateGet = vi.fn().mockResolvedValue('https://signed-r2');
    const utSign = vi.fn().mockResolvedValue({ ufsUrl: 'https://signed-ut' });
    vi.doMock('@/lib/storage/provider', () => ({ getActiveProvider: async () => 'r2' }));
    vi.doMock('@/lib/storage/r2', async () => ({
      ...(await vi.importActual<object>('@/lib/storage/r2')),
      putPrivateObject,
      signPrivateGet,
    }));
    vi.doMock('uploadthing/server', () => ({
      UTApi: class {
        generateSignedURL = utSign;
        deleteFiles = vi.fn();
        uploadFiles = vi.fn();
      },
    }));
    const { getPartStorage } = await import('@/lib/ticket-generation/storage');
    const s = getPartStorage();

    const { key } = await s.put({ batchId: 'b1', partIndex: 2, filename: 'my part.pdf', data: Buffer.from('x') });
    expect(key.startsWith('r2/tickets/b1/')).toBe(true);
    expect(putPrivateObject).toHaveBeenCalledWith(key, expect.any(Buffer));

    expect(await s.signedUrl(key)).toBe('https://signed-r2');
    // Regression: the object is stored and signed under the SAME key (was NoSuchKey when sign stripped the prefix).
    expect(signPrivateGet).toHaveBeenCalledWith(key, 300, expect.any(String));

    expect(await s.signedUrl('oldUploadThingKey123')).toBe('https://signed-ut');
    expect(utSign).toHaveBeenCalled();
  });

  it('refuses to fall back silently when R2 is selected but the private bucket is missing', async () => {
    delete process.env.R2_PRIVATE_BUCKET;
    vi.doMock('@/lib/storage/provider', () => ({ getActiveProvider: async () => 'r2' }));
    vi.doMock('uploadthing/server', () => ({ UTApi: class {} }));
    const { getPartStorage } = await import('@/lib/ticket-generation/storage');
    await expect(
      getPartStorage().put({ batchId: 'b', partIndex: 1, filename: 'a.pdf', data: Buffer.from('x') }),
    ).rejects.toThrow(/R2_PRIVATE_BUCKET/);
  });
});
