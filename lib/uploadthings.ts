'use client';

import { generateReactHelpers } from '@uploadthing/react';
import type { OurFileRouter } from '@/app/api/uploadthing/core';

// Generate type-safe helpers for working with UploadThing
export const { useUploadThing, uploadFiles } =
  generateReactHelpers<OurFileRouter>();

export { UploadButton, UploadDropzone, Uploader } from '@uploadthing/react';
