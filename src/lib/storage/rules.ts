// Upload rules shared by the client uploader and the server presign route.
// Pure data, no server imports, so it is safe to import from client components.
// Keep in step with the UploadThing routes in src/app/api/uploadthing/core.ts.

export type UploadEndpoint =
  | 'eventImage'
  | 'eventCover'
  | 'eventShareImage'
  | 'profileImage'
  | 'blogImage'
  | 'venueImage'
  | 'contestantImage';

export interface EndpointRule {
  maxFileSize: number; // bytes
  maxFileCount: number;
}

const MB = 1024 * 1024;

export const ENDPOINT_RULES: Record<UploadEndpoint, EndpointRule> = {
  eventImage: { maxFileSize: 2 * MB, maxFileCount: 10 },
  eventCover: { maxFileSize: 4 * MB, maxFileCount: 1 },
  eventShareImage: { maxFileSize: 4 * MB, maxFileCount: 1 },
  profileImage: { maxFileSize: 2 * MB, maxFileCount: 1 },
  contestantImage: { maxFileSize: 2 * MB, maxFileCount: 1 },
  venueImage: { maxFileSize: 4 * MB, maxFileCount: 5 },
  blogImage: { maxFileSize: 2 * MB, maxFileCount: 1 },
};

// SVG is deliberately excluded (script-capable); images only.
export const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/avif': 'avif',
};

export function isUploadEndpoint(v: unknown): v is UploadEndpoint {
  return typeof v === 'string' && Object.prototype.hasOwnProperty.call(ENDPOINT_RULES, v);
}

export type StorageProviderName = 'uploadthing' | 'r2';
export const STORAGE_PROVIDER_SETTING_KEY = 'storage.provider';
