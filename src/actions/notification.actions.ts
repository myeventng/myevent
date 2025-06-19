'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';

interface ActionResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}

import type { NotificationType } from '@/generated/prisma';

interface CreateNotificationData {
  type: NotificationType;
  title: string;
  message: string;
  actionUrl?: string;
  userId?: string; // Specific user to notify
  isAdminNotification?: boolean; // Send to all admins
  metadata?: Record<string, any>;
}

// Define which notification types are for admins vs users
const ADMIN_NOTIFICATION_TYPES = [
  'EVENT_SUBMITTED',
  'BLOG_SUBMITTED',
  'VENUE_SUBMITTED',
  'USER_REGISTERED',
  'USER_UPGRADED_TO_ORGANIZER',
  'PAYMENT_RECEIVED',
];

const ORGANIZER_NOTIFICATION_TYPES = [
  'EVENT_APPROVED',
  'EVENT_REJECTED',
  'VENUE_APPROVED',
  'VENUE_REJECTED',
  'TICKET_PURCHASED',
  'PAYMENT_RECEIVED',
];

const USER_NOTIFICATION_TYPES = [
  'TICKET_PURCHASED',
  'EVENT_CANCELLED',
  'REFUND_PROCESSED',
  'SYSTEM_UPDATE',
];

// Core function to create notifications
export async function createNotification(
  data: CreateNotificationData
): Promise<ActionResponse<any>> {
  try {
    if (data.isAdminNotification) {
      // Send to all admin users
      const adminUsers = await prisma.user.findMany({
        where: {
          role: 'ADMIN',
        },
        select: { id: true },
      });

      const notifications = await Promise.all(
        adminUsers.map((admin) =>
          prisma.notification.create({
            data: {
              type: data.type,
              title: data.title,
              message: data.message,
              actionUrl: data.actionUrl,
              metadata: data.metadata,
              user: { connect: { id: admin.id } },
            },
          })
        )
      );

      return {
        success: true,
        message: `Notification sent to ${adminUsers.length} admins`,
        data: notifications,
      };
    } else if (data.userId) {
      // Send to specific user
      const notification = await prisma.notification.create({
        data: {
          type: data.type,
          title: data.title,
          message: data.message,
          actionUrl: data.actionUrl,
          metadata: data.metadata,
          user: { connect: { id: data.userId } },
        },
      });

      return {
        success: true,
        message: 'Notification sent successfully',
        data: notification,
      };
    }

    return {
      success: false,
      message: 'Must specify either userId or isAdminNotification',
    };
  } catch (error) {
    console.error('Error creating notification:', error);
    return {
      success: false,
      message: 'Failed to create notification',
    };
  }
}

// Get user notifications with proper filtering based on role
export async function getUserNotifications(
  limit = 20,
  offset = 0
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

    // Filter notifications based on user role
    const notifications = await prisma.notification.findMany({
      where: {
        userId: session.user.id,
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

    const count = await prisma.notification.count({
      where: {
        userId: session.user.id,
        status: 'UNREAD',
      },
    });

    return {
      success: true,
      data: count,
    };
  } catch (error) {
    console.error('Error counting notifications:', error);
    return {
      success: false,
      message: 'Failed to count notifications',
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
        userId: session.user.id, // Ensure user owns the notification
      },
      data: {
        status: 'READ',
      },
    });

    return {
      success: true,
      message: 'Notification marked as read',
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

    const result = await prisma.notification.updateMany({
      where: {
        userId: session.user.id,
        status: 'UNREAD',
      },
      data: {
        status: 'READ',
      },
    });

    return {
      success: true,
      message: `Marked ${result.count} notifications as read`,
      data: result,
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
        userId: session.user.id, // Ensure user owns the notification
      },
    });

    return {
      success: true,
      message: 'Notification deleted',
    };
  } catch (error) {
    console.error('Error deleting notification:', error);
    return {
      success: false,
      message: 'Failed to delete notification',
    };
  }
}

// Helper function to create organizer upgrade notification
export async function createOrganizerUpgradeNotification(
  userId: string
): Promise<ActionResponse<any>> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        organizerProfile: true,
      },
    });

    if (!user) {
      return {
        success: false,
        message: 'User not found',
      };
    }

    const title = 'New Organizer Registration';
    const message = `${user.name} has upgraded to an organizer account and can now create events`;
    const actionUrl = `/admin/dashboard/users/${user.id}`;

    return await createNotification({
      type: 'USER_UPGRADED_TO_ORGANIZER',
      title,
      message,
      actionUrl,
      isAdminNotification: true,
      metadata: {
        organizerName: user.name,
        organizerEmail: user.email,
        organizationName: user.organizerProfile?.organizationName,
        upgradedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Error creating organizer upgrade notification:', error);
    return {
      success: false,
      message: 'Failed to create organizer upgrade notification',
    };
  }
}

// Helper function to create event submission notification
export async function createEventSubmissionNotification(
  eventId: string
): Promise<ActionResponse<any>> {
  try {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        user: true,
      },
    });

    if (!event) {
      return {
        success: false,
        message: 'Event not found',
      };
    }

    const title = 'New Event Submitted for Review';
    const message = `${event.user?.name || 'Unknown user'} has submitted "${
      event.title
    }" for approval`;
    const actionUrl = `/admin/dashboard/events/${eventId}`;

    return await createNotification({
      type: 'EVENT_SUBMITTED',
      title,
      message,
      actionUrl,
      isAdminNotification: true,
      metadata: {
        eventId: event.id,
        eventTitle: event.title,
        organizerName: event.user?.name,
        submittedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Error creating event submission notification:', error);
    return {
      success: false,
      message: 'Failed to create event submission notification',
    };
  }
}

// Helper function to create event approval/rejection notification
export async function createEventStatusNotification(
  eventId: string,
  status: 'approved' | 'rejected',
  rejectionReason?: string
): Promise<ActionResponse<any>> {
  try {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        user: true,
      },
    });

    if (!event) {
      return {
        success: false,
        message: 'Event not found',
      };
    }

    const title =
      status === 'approved' ? 'Event Approved!' : 'Event Requires Changes';

    const message =
      status === 'approved'
        ? `Your event "${event.title}" has been approved and is now live!`
        : `Your event "${
            event.title
          }" needs some changes before it can be published${
            rejectionReason ? `: ${rejectionReason}` : '.'
          }`;

    const actionUrl = `/dashboard/events/${eventId}`;

    return await createNotification({
      type: status === 'approved' ? 'EVENT_APPROVED' : 'EVENT_REJECTED',
      title,
      message,
      actionUrl,
      userId: event.userId!,
      metadata: {
        eventId: event.id,
        eventTitle: event.title,
        status,
        rejectionReason,
        processedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Error creating event status notification:', error);
    return {
      success: false,
      message: 'Failed to create event status notification',
    };
  }
}

// Helper function to create ticket purchase notification
export async function createTicketPurchaseNotification(
  ticketId: string,
  userId: string,
  organizerId: string
): Promise<ActionResponse<any>> {
  try {
    // First get the ticket with proper relations
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        ticketType: {
          include: {
            event: true,
          },
        },
        user: true,
      },
    });

    if (!ticket) {
      return {
        success: false,
        message: 'Ticket not found',
      };
    }

    const event = ticket.ticketType.event;
    const user = ticket.user;

    // Notify the user who purchased the ticket
    const userNotification = await createNotification({
      type: 'TICKET_PURCHASED',
      title: 'Ticket Purchase Confirmed',
      message: `Your ticket for "${event.title}" has been confirmed!`,
      actionUrl: `/dashboard/tickets/${ticketId}`,
      userId: userId,
      metadata: {
        ticketId: ticket.id,
        eventTitle: event.title,
        eventDate: event.startDateTime,
        purchasedAt: new Date().toISOString(),
      },
    });

    // Notify the organizer about the purchase
    const organizerNotification = await createNotification({
      type: 'TICKET_PURCHASED',
      title: 'New Ticket Sale',
      message: `${user?.name || 'Someone'} purchased a ticket for "${
        event.title
      }"`,
      actionUrl: `/dashboard/events/${event.id}/attendees`,
      userId: organizerId,
      metadata: {
        ticketId: ticket.id,
        eventTitle: event.title,
        buyerName: user?.name,
        purchasedAt: new Date().toISOString(),
      },
    });

    return {
      success: true,
      message: 'Ticket purchase notifications sent',
      data: { userNotification, organizerNotification },
    };
  } catch (error) {
    console.error('Error creating ticket purchase notification:', error);
    return {
      success: false,
      message: 'Failed to create ticket purchase notification',
    };
  }
}

// Main notification function used by event actions - THIS IS THE MISSING FUNCTION
export async function createEventNotification(
  eventId: string,
  type: 'EVENT_SUBMITTED' | 'EVENT_APPROVED' | 'EVENT_REJECTED',
  specificUserId?: string
): Promise<ActionResponse<any>> {
  try {
    switch (type) {
      case 'EVENT_SUBMITTED':
        return await createEventSubmissionNotification(eventId);

      case 'EVENT_APPROVED':
        return await createEventStatusNotification(eventId, 'approved');

      case 'EVENT_REJECTED':
        return await createEventStatusNotification(eventId, 'rejected');

      default:
        return {
          success: false,
          message: 'Invalid notification type',
        };
    }
  } catch (error) {
    console.error('Error creating event notification:', error);
    return {
      success: false,
      message: 'Failed to create event notification',
    };
  }
}

// Additional helper functions for different notification types

// Helper function to create venue submission notification
export async function createVenueSubmissionNotification(
  venueId: string
): Promise<ActionResponse<any>> {
  try {
    const venue = await prisma.venue.findUnique({
      where: { id: venueId },
      include: {
        user: true,
      },
    });

    if (!venue) {
      return {
        success: false,
        message: 'Venue not found',
      };
    }

    const title = 'New Venue Submitted for Review';
    const message = `${venue.user?.name || 'Unknown user'} has submitted "${
      venue.name
    }" for approval`;
    const actionUrl = `/admin/dashboard/venues/${venueId}`;

    return await createNotification({
      type: 'VENUE_SUBMITTED',
      title,
      message,
      actionUrl,
      isAdminNotification: true,
      metadata: {
        venueId: venue.id,
        venueName: venue.name,
        organizerName: venue.user?.name,
        submittedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Error creating venue submission notification:', error);
    return {
      success: false,
      message: 'Failed to create venue submission notification',
    };
  }
}

// Helper function to create venue status notification
export async function createVenueStatusNotification(
  venueId: string,
  status: 'approved' | 'rejected',
  rejectionReason?: string
): Promise<ActionResponse<any>> {
  try {
    const venue = await prisma.venue.findUnique({
      where: { id: venueId },
      include: {
        user: true,
      },
    });

    if (!venue) {
      return {
        success: false,
        message: 'Venue not found',
      };
    }

    const title =
      status === 'approved' ? 'Venue Approved!' : 'Venue Requires Changes';

    const message =
      status === 'approved'
        ? `Your venue "${venue.name}" has been approved and is now available for events!`
        : `Your venue "${
            venue.name
          }" needs some changes before it can be published${
            rejectionReason ? `: ${rejectionReason}` : '.'
          }`;

    const actionUrl = `/dashboard/venues/${venueId}`;

    return await createNotification({
      type: status === 'approved' ? 'VENUE_APPROVED' : 'VENUE_REJECTED',
      title,
      message,
      actionUrl,
      userId: venue.userId!,
      metadata: {
        venueId: venue.id,
        venueName: venue.name,
        status,
        rejectionReason,
        processedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Error creating venue status notification:', error);
    return {
      success: false,
      message: 'Failed to create venue status notification',
    };
  }
}

// Helper function to create system update notification
export async function createSystemUpdateNotification(
  title: string,
  message: string,
  actionUrl?: string
): Promise<ActionResponse<any>> {
  try {
    // Get all users to send system update to everyone
    const users = await prisma.user.findMany({
      select: { id: true },
    });

    const notifications = await Promise.all(
      users.map((user) =>
        prisma.notification.create({
          data: {
            type: 'SYSTEM_UPDATE',
            title,
            message,
            actionUrl,
            user: { connect: { id: user.id } },
            metadata: {
              systemUpdate: true,
              sentAt: new Date().toISOString(),
            },
          },
        })
      )
    );

    return {
      success: true,
      message: `System notification sent to ${users.length} users`,
      data: notifications,
    };
  } catch (error) {
    console.error('Error creating system update notification:', error);
    return {
      success: false,
      message: 'Failed to create system update notification',
    };
  }
}
