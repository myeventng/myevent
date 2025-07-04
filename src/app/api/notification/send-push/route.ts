import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import webpush from 'web-push';

// Configure web-push
webpush.setVapidDetails(
  'mailto:your-email@yourplatform.com',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    // Only allow admin users to send push notifications
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userIds, title, body, url, notificationId } = await request.json();

    // Get push subscriptions for specified users
    const subscriptions = await prisma.pushSubscription.findMany({
      where: {
        userId: { in: userIds },
      },
    });

    const pushPromises = subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          sub.subscription as any,
          JSON.stringify({
            title,
            body,
            url,
            notificationId,
          })
        );
        return { success: true, userId: sub.userId };
      } catch (error) {
        console.error(
          `Failed to send push notification to user ${sub.userId}:`,
          error
        );
        return { success: false, userId: sub.userId, error };
      }
    });

    const results = await Promise.all(pushPromises);
    const successful = results.filter((r) => r.success).length;

    return NextResponse.json({
      success: true,
      sent: successful,
      total: subscriptions.length,
      results,
    });
  } catch (error) {
    console.error('Error sending push notifications:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
