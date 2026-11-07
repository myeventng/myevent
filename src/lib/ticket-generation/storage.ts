// Persistent storage for generated PDF parts. Production uses UploadThing
// (already in the project) with PRIVATE files + short-lived signed URLs, so a
// leaked file URL cannot be used to read ticket codes. Nothing touches the
// local filesystem (Vercel functions are ephemeral).

import { UTApi } from 'uploadthing/server';
import { getActiveProvider } from '@/lib/storage/provider';
import { R2_KEY_PREFIX, deletePrivateObject, getR2Status, putPrivateObject, signPrivateGet } from '@/lib/storage/r2';

export interface PartStorage {
  put(args: { batchId: string; partIndex: number; filename: string; data: Buffer }): Promise<{ key: string }>;
  signedUrl(key: string, expiresInSeconds?: number): Promise<string>;
  remove?(key: string): Promise<void>;
}

class UploadThingStorage implements PartStorage {
  private api = new UTApi();

  async put({ filename, data }: { batchId: string; partIndex: number; filename: string; data: Buffer }) {
    const file = new File([new Uint8Array(data)], filename, { type: 'application/pdf' });
    const res = await this.api.uploadFiles(file, { acl: 'private' } as never);
    const single = Array.isArray(res) ? res[0] : res;
    if (!single || single.error || !single.data?.key) {
      throw new Error(`Storage upload failed: ${single?.error?.message ?? 'unknown error'}`);
    }
    return { key: single.data.key };
  }

  async signedUrl(key: string, expiresInSeconds = 300) {
    const res = await this.api.generateSignedURL(key, { expiresIn: expiresInSeconds } as never);
    return (res as { ufsUrl: string }).ufsUrl;
  }

  async remove(key: string) {
    await this.api.deleteFiles(key);
  }
}

class R2PrivateStorage implements PartStorage {
  async put({ batchId, partIndex, filename, data }: { batchId: string; partIndex: number; filename: string; data: Buffer }) {
    const safe = filename.replace(/[^\w.\-]/g, '_');
    const key = `${R2_KEY_PREFIX}tickets/${batchId}/${partIndex}-${safe}`;
    await putPrivateObject(key, data);
    return { key };
  }

  // The stored key IS the object key in the bucket (including the "r2/" marker). Put, sign and
  // delete must all use the same string, otherwise downloads 404 with NoSuchKey.
  async signedUrl(key: string, expiresInSeconds = 300) {
    return signPrivateGet(key, expiresInSeconds, key.split('/').pop());
  }

  async remove(key: string) {
    await deletePrivateObject(key);
  }
}

/**
 * Routes by provider. New parts go to whichever provider the super admin has
 * selected (R2 only if its private bucket is configured). Existing parts keep
 * working after a switch: R2 keys carry the "r2/" prefix, everything else is an
 * UploadThing key.
 */
class SwitchingStorage implements PartStorage {
  private ut = new UploadThingStorage();
  private r2 = new R2PrivateStorage();
  private static isR2Key = (k: string) => k.startsWith(R2_KEY_PREFIX);

  async put(args: { batchId: string; partIndex: number; filename: string; data: Buffer }) {
    const wantR2 = (await getActiveProvider()) === 'r2';
    if (wantR2 && !getR2Status().ticketPdfReady) {
      throw new Error('Cloudflare R2 is selected but R2_PRIVATE_BUCKET / credentials are missing');
    }
    return wantR2 ? this.r2.put(args) : this.ut.put(args);
  }

  signedUrl(key: string, expiresInSeconds?: number) {
    return SwitchingStorage.isR2Key(key) ? this.r2.signedUrl(key, expiresInSeconds) : this.ut.signedUrl(key, expiresInSeconds);
  }

  remove(key: string) {
    return SwitchingStorage.isR2Key(key) ? this.r2.remove(key) : this.ut.remove(key);
  }
}

let instance: PartStorage | null = null;
export function getPartStorage(): PartStorage {
  if (!instance) instance = new SwitchingStorage();
  return instance;
}

/** Test seam. */
export function setPartStorageForTests(s: PartStorage | null) {
  instance = s;
}
