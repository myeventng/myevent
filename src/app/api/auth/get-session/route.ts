// app/api/auth/get-session/route.ts
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const headersList = await headers();

    const session = await auth.api.getSession({
      headers: headersList,
    });

    if (!session) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    return NextResponse.json({
      user: {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        role: session.user.role,
        subRole: session.user.subRole,
      },
    });
  } catch (error) {
    console.error('Session validation error:', error);
    return NextResponse.json({ user: null }, { status: 401 });
  }
}

export async function POST() {
  // Handle POST requests the same way
  return GET();
}
