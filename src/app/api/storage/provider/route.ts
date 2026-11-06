import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { getActiveProvider, resolveUsable } from '@/lib/storage/provider';

// Tells the browser uploader which backend to use. Signed-in users only.
export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return new NextResponse('Unauthorized', { status: 401 });
  const provider = resolveUsable(await getActiveProvider());
  return NextResponse.json({ provider }, { headers: { 'Cache-Control': 'no-store' } });
}
