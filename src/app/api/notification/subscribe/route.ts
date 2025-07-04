import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const subscription = await request.json();

    // Store or update push subscription in database
    await prisma.pushSubscription.upsert({
      where: {
        userId: session.user.id,
      },
      update: {
        subscription: subscription,
        updatedAt: new Date(),
      },
      create: {
        userId: session.user.id,
        subscription: subscription,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving push subscription:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
