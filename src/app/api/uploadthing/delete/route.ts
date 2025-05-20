import { UTApi } from 'uploadthing/server';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

const utapi = new UTApi();

export async function POST(request: Request) {
  try {
    const headersList = await headers();
    const session = await auth.api.getSession({
      headers: headersList,
    });
    const user = session?.user;
    if (!user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { url } = await request.json();

    // Extract the file key from the URL
    // UploadThing URLs look like: https://uploadthing.com/f/[fileKey]
    const fileKey = url.split('/').pop();

    if (!fileKey) {
      return new NextResponse('Invalid file URL', { status: 400 });
    }

    // Delete the file from UploadThing
    await utapi.deleteFiles(fileKey);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting file:', error);
    return new NextResponse('Error deleting file', { status: 500 });
  }
}
