import { NextRequest, NextResponse } from 'next/server';
import { markNotificationAsRead } from '@/actions/notification.actions';

export async function POST(request: NextRequest) {
  try {
    const { notificationId } = await request.json();

    if (!notificationId) {
      return NextResponse.json(
        { error: 'Notification ID is required' },
        { status: 400 }
      );
    }

    const result = await markNotificationAsRead(notificationId);

    if (result.success) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
