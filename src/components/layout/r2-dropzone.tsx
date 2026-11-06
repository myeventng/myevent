'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Loader2, UploadCloud } from 'lucide-react';
import { ALLOWED_IMAGE_TYPES, ENDPOINT_RULES, type UploadEndpoint } from '@/lib/storage/rules';

interface Props {
  endpoint: UploadEndpoint;
  maxFiles: number;
  disabled?: boolean;
  onUploadBegin: () => void;
  onComplete: (res: { url: string }[]) => void;
  onError: (message: string) => void;
}

// Browser -> R2 direct upload using presigned PUT URLs from /api/storage/presign.
export function R2Dropzone({ endpoint, maxFiles, disabled, onUploadBegin, onComplete, onError }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rule = ENDPOINT_RULES[endpoint];
  const limit = Math.min(maxFiles, rule.maxFileCount);

  const onDrop = useCallback(
    async (files: File[]) => {
      if (!files.length) return;
      setError(null);
      const fail = (m: string) => {
        setError(m);
        onError(m);
        setBusy(false);
      };
      try {
        setBusy(true);
        onUploadBegin();
        const presign = await fetch('/api/storage/presign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            endpoint,
            files: files.map((f) => ({ type: f.type, size: f.size })),
          }),
        });
        const data = await presign.json().catch(() => ({}));
        if (!presign.ok) return fail(data?.error ?? 'Could not start upload');

        const slots = data.files as { uploadUrl: string; publicUrl: string; contentType: string }[];
        const results: { url: string }[] = [];
        for (let i = 0; i < files.length; i++) {
          const put = await fetch(slots[i].uploadUrl, {
            method: 'PUT',
            headers: { 'Content-Type': slots[i].contentType },
            body: files[i],
          });
          if (!put.ok) return fail(`Upload failed (${put.status}). Check the R2 bucket CORS rule.`);
          results.push({ url: slots[i].publicUrl });
        }
        setBusy(false);
        onComplete(results);
      } catch {
        fail('Upload failed. Check your connection and the R2 bucket CORS rule.');
      }
    },
    [endpoint, onComplete, onError, onUploadBegin],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: Object.fromEntries(Object.keys(ALLOWED_IMAGE_TYPES).map((t) => [t, []])),
    maxFiles: limit,
    maxSize: rule.maxFileSize,
    multiple: limit > 1,
    disabled: busy || disabled,
    onDropRejected: () =>
      setError(`Use JPG, PNG, WebP, GIF or AVIF, up to ${Math.round(rule.maxFileSize / 1048576)}MB each (max ${limit} files).`),
  });

  return (
    <div className="w-full">
      <div
        {...getRootProps()}
        className="flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-lg p-6 text-center"
      >
        <input {...getInputProps()} />
        {busy ? (
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        ) : (
          <UploadCloud className="h-8 w-8 text-primary" />
        )}
        <p className="text-sm text-primary">
          {isDragActive ? 'Drop files here' : `Drag & drop or click to upload (max ${limit} file${limit > 1 ? 's' : ''})`}
        </p>
        <p className="text-xs text-muted-foreground">
          Images up to {Math.round(rule.maxFileSize / 1048576)}MB
        </p>
      </div>
      {error && <p className="mt-2 text-center text-sm text-destructive">{error}</p>}
    </div>
  );
}
