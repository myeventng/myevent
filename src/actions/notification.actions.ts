'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { NotificationType, NotificationStatus } from '@/generated/prisma';

interface ActionResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}

interface CreateNotificationInput {
  type: NotificationType;
  title: string;
  message: string;
  actionUrl?: string;
  metadata?: any;
  userId?: string;
  isAdminNotification?: boolean;
  eventId?: string;
  blogId?: string;
  orderId?: string;
  venueId?: string;
}

// Create a new notification
export async function createNotification(
  input: CreateNotificationInput
): Promise<ActionResponse<any>> {
  try {
    const notification = await prisma.notification.create({
      data: {
        type: input.type,
        title: input.title,
        message: input.message,
        actionUrl: input.actionUrl,
        metadata: input.metadata,
        userId: input.userId,
        isAdminNotification: input.isAdminNotification || false,
        eventId: input.eventId,
        blogId: input.blogId,
        orderId: input.orderId,
        venueId: input.venueId,
      },
    });

    // Revalidate notification-related paths
    revalidatePath('/admin/dashboard');
    revalidatePath('/dashboard');

    return {
      success: true,
      data: notification,
    };
  } catch (error) {
    console.error('Error creating notification:', error);
    return {
      success: false,
      message: 'Failed to create notification',
    };
  }
}

// Get notifications for current user
export async function getUserNotifications(
  limit: number = 20,
  offset: number = 0
): Promise<ActionResponse<any[]>> {
  try {
    const headersList = await headers();
    const session = await auth.api.getSession({
      headers: headersList,
    });

    if (!session) {
      return {
        success: false,
        message: 'Not authenticated',
      };
    }

    const whereClause: any = {
      OR: [
        { userId: session.user.id },
        ...(session.user.role === 'ADMIN'
          ? [{ isAdminNotification: true }]
          : []),
      ],
    };

    const notifications = await prisma.notification.findMany({
      where: whereClause,
      include: {
        event: {
          select: {
            id: true,
            title: true,
            slug: true,
          },
        },
        venue: {
          select: {
            id: true,
            name: true,
          },
        },
        order: {
          select: {
            id: true,
            totalAmount: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
      skip: offset,
    });

    return {
      success: true,
      data: notifications,
    };
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return {
      success: false,
      message: 'Failed to fetch notifications',
    };
  }
}

// Get unread notification count
export async function getUnreadNotificationCount(): Promise<
  ActionResponse<number>
> {
  try {
    const headersList = await headers();
    const session = await auth.api.getSession({
      headers: headersList,
    });

    if (!session) {
      return {
        success: false,
        message: 'Not authenticated',
      };
    }

    const whereClause: any = {
      status: 'UNREAD',
      OR: [
        { userId: session.user.id },
        ...(session.user.role === 'ADMIN'
          ? [{ isAdminNotification: true }]
          : []),
      ],
    };

    const count = await prisma.notification.count({
      where: whereClause,
    });

    return {
      success: true,
      data: count,
    };
  } catch (error) {
    console.error('Error fetching unread count:', error);
    return {
      success: false,
      message: 'Failed to fetch unread count',
    };
  }
}

// Mark notification as read
export async function markNotificationAsRead(
  notificationId: string
): Promise<ActionResponse<any>> {
  try {
    const headersList = await headers();
    const session = await auth.api.getSession({
      headers: headersList,
    });

    if (!session) {
      return {
        success: false,
        message: 'Not authenticated',
      };
    }

    const notification = await prisma.notification.update({
      where: {
        id: notificationId,
        OR: [
          { userId: session.user.id },
          ...(session.user.role === 'ADMIN'
            ? [{ isAdminNotification: true }]
            : []),
        ],
      },
      data: {
        status: 'READ',
      },
    });

    revalidatePath('/admin/dashboard');
    revalidatePath('/dashboard');

    return {
      success: true,
      data: notification,
    };
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return {
      success: false,
      message: 'Failed to mark notification as read',
    };
  }
}

// Mark all notifications as read
export async function markAllNotificationsAsRead(): Promise<
  ActionResponse<any>
> {
  try {
    const headersList = await headers();
    const session = await auth.api.getSession({
      headers: headersList,
    });

    if (!session) {
      return {
        success: false,
        message: 'Not authenticated',
      };
    }

    const whereClause: any = {
      status: 'UNREAD',
      OR: [
        { userId: session.user.id },
        ...(session.user.role === 'ADMIN'
          ? [{ isAdminNotification: true }]
          : []),
      ],
    };

    await prisma.notification.updateMany({
      where: whereClause,
      data: {
        status: 'READ',
      },
    });

    revalidatePath('/admin/dashboard');
    revalidatePath('/dashboard');

    return {
      success: true,
    };
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    return {
      success: false,
      message: 'Failed to mark all notifications as read',
    };
  }
}

// Delete notification
export async function deleteNotification(
  notificationId: string
): Promise<ActionResponse<any>> {
  try {
    const headersList = await headers();
    const session = await auth.api.getSession({
      headers: headersList,
    });

    if (!session) {
      return {
        success: false,
        message: 'Not authenticated',
      };
    }

    await prisma.notification.delete({
      where: {
        id: notificationId,
        OR: [
          { userId: session.user.id },
          ...(session.user.role === 'ADMIN'
            ? [{ isAdminNotification: true }]
            : []),
        ],
      },
    });

    revalidatePath('/admin/dashboard');
    revalidatePath('/dashboard');

    return {
      success: true,
    };
  } catch (error) {
    console.error('Error deleting notification:', error);
    return {
      success: false,
      message: 'Failed to delete notification',
    };
  }
}

// Helper function to create event-related notifications
export async function createEventNotification(
  eventId: string,
  type: NotificationType,
  userId?: string
): Promise<ActionResponse<any>> {
  try {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        user: {
          select: { name: true, email: true },
        },
      },
    });

    if (!event) {
      return {
        success: false,
        message: 'Event not found',
      };
    }

    let title = '';
    let message = '';
    let actionUrl = '';

    switch (type) {
      case 'EVENT_SUBMITTED':
        title = 'New Event Submitted for Review';
        message = `Event "${event.title}" has been submitted for review by ${event.user?.name}`;
        actionUrl = `/admin/dashboard/events/${event.id}`;
        break;
      case 'EVENT_APPROVED':
        title = 'Event Approved';
        message = `Your event "${event.title}" has been approved and is now published`;
        actionUrl = `/dashboard/events/${event.id}`;
        break;
      case 'EVENT_REJECTED':
        title = 'Event Rejected';
        message = `Your event "${event.title}" has been rejected. Please review and resubmit`;
        actionUrl = `/dashboard/events/${event.id}`;
        break;
      default:
        title = 'Event Update';
        message = `Event "${event.title}" has been updated`;
        actionUrl = `/dashboard/events/${event.id}`;
    }

    return await createNotification({
      type,
      title,
      message,
      actionUrl,
      eventId,
      userId:
        type === 'EVENT_SUBMITTED'
          ? undefined
          : userId ?? event.userId ?? undefined,
      isAdminNotification: type === 'EVENT_SUBMITTED',
      metadata: {
        eventTitle: event.title,
        organizerName: event.user?.name,
        organizerEmail: event.user?.email,
      },
    });
  } catch (error) {
    console.error('Error creating event notification:', error);
    return {
      success: false,
      message: 'Failed to create event notification',
    };
  }
}
