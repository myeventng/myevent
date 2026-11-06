import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { randomUUID } from 'crypto';
import { auth } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { getActiveProvider, resolveUsable } from '@/lib/storage/provider';
import { presignImageUpload } from '@/lib/storage/r2';
import { ALLOWED_IMAGE_TYPES, ENDPOINT_RULES, isUploadEndpoint } from '@/lib/storage/rules';

// Issues short-lived presigned PUT URLs so the browser uploads straight to R2.
// The server decides the key, content type and exact size; the client cannot
// choose a path or exceed the endpoint's limits.
export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return new NextResponse('Unauthorized', { status: 401 });

  if (resolveUsable(await getActiveProvider()) !== 'r2') {
    return NextResponse.json({ error: 'R2 uploads are not enabled' }, { status: 409 });
  }

  const rl = await checkRateLimit(`presign:${session.user.id}`, 60, 60);
  if (!rl.ok) return NextResponse.json({ error: 'Too many uploads, slow down' }, { status: 429 });

  let body: { endpoint?: unknown; files?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  if (!isUploadEndpoint(body.endpoint)) return NextResponse.json({ error: 'Unknown endpoint' }, { status: 400 });
  const rule = ENDPOINT_RULES[body.endpoint];

  const files = Array.isArray(body.files) ? body.files : [];
  if (files.length === 0 || files.length > rule.maxFileCount) {
    return NextResponse.json({ error: `Between 1 and ${rule.maxFileCount} files allowed` }, { status: 400 });
  }

  const date = new Date();
  const folder = `${body.endpoint}/${date.getUTCFullYear()}/${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
  const out: { uploadUrl: string; publicUrl: string; contentType: string }[] = [];

  for (const f of files as { type?: unknown; size?: unknown }[]) {
    const type = typeof f?.type === 'string' ? f.type.toLowerCase() : '';
    const size = typeof f?.size === 'number' ? f.size : NaN;
    const ext = ALLOWED_IMAGE_TYPES[type];
    if (!ext) return NextResponse.json({ error: 'Only JPG, PNG, WebP, GIF or AVIF images are allowed' }, { status: 400 });
    if (!Number.isFinite(size) || size <= 0 || size > rule.maxFileSize) {
      return NextResponse.json({ error: `File too large (max ${Math.round(rule.maxFileSize / 1048576)}MB)` }, { status: 400 });
    }
    const key = `${folder}/${randomUUID()}.${ext}`;
    const { uploadUrl, publicUrl } = await presignImageUpload({ key, contentType: type, contentLength: size });
    out.push({ uploadUrl, publicUrl, contentType: type });
  }

  return NextResponse.json({ files: out });
}
