// Persistent storage for generated PDF parts. Production uses UploadThing
// (already in the project) with PRIVATE files + short-lived signed URLs, so a
// leaked file URL cannot be used to read ticket codes. Nothing touches the
// local filesystem (Vercel functions are ephemeral).

import { UTApi } from 'uploadthing/server';

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

let instance: PartStorage | null = null;
export function getPartStorage(): PartStorage {
  if (!instance) instance = new UploadThingStorage();
  return instance;
}

/** Test seam. */
export function setPartStorageForTests(s: PartStorage | null) {
  instance = s;
}
