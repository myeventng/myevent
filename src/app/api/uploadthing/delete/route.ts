import { UTApi } from 'uploadthing/server';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { deletePublicObject, isR2PublicUrl, r2KeyFromPublicUrl } from '@/lib/storage/r2';

const utapi = new UTApi();

// Deletes an uploaded image. Handles both providers by looking at the URL, so
// files uploaded before a provider switch can still be removed.
export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) return new NextResponse('Unauthorized', { status: 401 });

    const { url } = await request.json();
    if (typeof url !== 'string' || !url) return new NextResponse('Invalid file URL', { status: 400 });

    if (isR2PublicUrl(url)) {
      const key = r2KeyFromPublicUrl(url);
      if (!key) return new NextResponse('Invalid file URL', { status: 400 });
      await deletePublicObject(key);
      return NextResponse.json({ success: true });
    }

    // UploadThing: .../f/<fileKey>
    const fileKey = url.split('?')[0].split('/').pop();
    if (!fileKey) return new NextResponse('Invalid file URL', { status: 400 });
    await utapi.deleteFiles(fileKey);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting file:', error);
    return new NextResponse('Error deleting file', { status: 500 });
  }
}
