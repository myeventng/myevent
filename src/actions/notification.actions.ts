'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { ticketEmailService as emailService } from '@/lib/email-service';

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
  userId?: string;
  isAdminNotification?: boolean;
  metadata?: Record<string, any>;
  sendEmail?: boolean;
}

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
        select: { id: true, email: true, name: true },
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
        include: {
          user: true,
        },
      });

      // Send email notification if requested
      if (data.sendEmail && notification.user?.email) {
        await sendEmailForNotification(notification);
      }

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

// Enhanced email notification function
async function sendEmailForNotification(notification: any) {
  try {
    const { type, user } = notification;

    switch (type) {
      case 'EVENT_APPROVED':
      case 'EVENT_REJECTED':
      case 'EVENT_CANCELLED':
        if (notification.metadata?.eventId) {
          const event = await prisma.event.findUnique({
            where: { id: notification.metadata.eventId },
            include: {
              venue: {
                include: {
                  city: true,
                },
              },
            },
          });

          if (event) {
            await emailService.sendEventNotification(user.email, event, type);
          }
        }
        break;

      case 'TICKET_AVAILABLE':
        if (notification.metadata?.eventId) {
          const event = await prisma.event.findUnique({
            where: { id: notification.metadata.eventId },
            include: {
              venue: {
                include: {
                  city: true,
                },
              },
            },
          });

          if (event) {
            await emailService.sendWaitingListNotification(user.email, event);
          }
        }
        break;

      case 'REFUND_PROCESSED':
        if (notification.metadata?.orderId) {
          const order = await prisma.order.findUnique({
            where: { id: notification.metadata.orderId },
            include: {
              event: true,
              buyer: true,
            },
          });

          if (order) {
            await emailService.sendRefundNotification(user.email, order);
          }
        }
        break;

      // Add more cases as needed
      default:
        break;
    }
  } catch (error) {
    console.error('Error sending email for notification:', error);
  }
}

// MISSING FUNCTION: Create ticket notification
export async function createTicketNotification(
  orderId: string,
  type: 'TICKET_PURCHASED' | 'REFUND_REQUESTED' | 'REFUND_PROCESSED',
  specificUserId?: string
): Promise<ActionResponse<any>> {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        event: {
          include: {
            user: true,
            venue: {
              include: {
                city: true,
              },
            },
          },
        },
        buyer: true,
      },
    });

    if (!order) {
      return {
        success: false,
        message: 'Order not found',
      };
    }

    const notifications = [];

    switch (type) {
      case 'TICKET_PURCHASED':
        // Notify the buyer
        const buyerNotification = await createNotification({
          type: 'TICKET_PURCHASED',
          title: 'Tickets Purchased Successfully! 🎟️',
          message: `Your ${order.quantity} ticket(s) for "${order.event.title}" have been confirmed. Check your email for your tickets.`,
          actionUrl: `/dashboard/tickets`,
          userId: order.buyerId,
          metadata: {
            orderId: order.id,
            eventId: order.eventId,
            eventTitle: order.event.title,
            quantity: order.quantity,
            totalAmount: order.totalAmount,
            purchasedAt: new Date().toISOString(),
          },
          sendEmail: false, // Email will be sent separately with tickets
        });
        notifications.push(buyerNotification);

        // Notify the organizer
        if (order.event.userId) {
          const organizerNotification = await createNotification({
            type: 'TICKET_PURCHASED',
            title: 'New Ticket Sale! 💰',
            message: `${order.buyer.name || 'Someone'} purchased ${order.quantity} ticket(s) for "${order.event.title}" (₦${order.totalAmount.toLocaleString()})`,
            actionUrl: `/dashboard/events/${order.eventId}/analytics`,
            userId: order.event.userId,
            metadata: {
              orderId: order.id,
              eventId: order.eventId,
              eventTitle: order.event.title,
              buyerName: order.buyer.name,
              buyerEmail: order.buyer.email,
              quantity: order.quantity,
              totalAmount: order.totalAmount,
              purchasedAt: new Date().toISOString(),
            },
            sendEmail: true,
          });
          notifications.push(organizerNotification);
        }
        break;

      case 'REFUND_REQUESTED':
        // Notify admins about refund request
        const refundRequestNotification = await createNotification({
          type: 'REFUND_REQUESTED',
          title: 'Refund Request Submitted ⚠️',
          message: `A refund has been requested for order #${order.id} (${order.event.title}) - ₦${order.totalAmount.toLocaleString()}`,
          actionUrl: `/admin/dashboard/orders/${order.id}`,
          isAdminNotification: true,
          metadata: {
            orderId: order.id,
            eventId: order.eventId,
            eventTitle: order.event.title,
            buyerName: order.buyer.name,
            buyerEmail: order.buyer.email,
            refundAmount: order.totalAmount,
            requestedAt: new Date().toISOString(),
          },
          sendEmail: true,
        });
        notifications.push(refundRequestNotification);

        // Notify the buyer that request was submitted
        const buyerRefundNotification = await createNotification({
          type: 'REFUND_REQUESTED',
          title: 'Refund Request Received 📝',
          message: `Your refund request for "${order.event.title}" has been submitted and is under review.`,
          actionUrl: `/dashboard/tickets`,
          userId: order.buyerId,
          metadata: {
            orderId: order.id,
            eventId: order.eventId,
            eventTitle: order.event.title,
            refundAmount: order.totalAmount,
            requestedAt: new Date().toISOString(),
          },
          sendEmail: true,
        });
        notifications.push(buyerRefundNotification);
        break;

      case 'REFUND_PROCESSED':
        // Notify the buyer that refund was processed
        const processedNotification = await createNotification({
          type: 'REFUND_PROCESSED',
          title: 'Refund Processed Successfully ✅',
          message: `Your refund of ₦${order.totalAmount.toLocaleString()} for "${order.event.title}" has been processed and will reflect in your account within 5-10 business days.`,
          actionUrl: `/dashboard/tickets`,
          userId: specificUserId || order.buyerId,
          metadata: {
            orderId: order.id,
            eventId: order.eventId,
            eventTitle: order.event.title,
            refundAmount: order.totalAmount,
            processedAt: new Date().toISOString(),
          },
          sendEmail: true,
        });
        notifications.push(processedNotification);

        // Notify the organizer
        if (order.event.userId) {
          const organizerRefundNotification = await createNotification({
            type: 'REFUND_PROCESSED',
            title: 'Refund Processed 💸',
            message: `A refund of ₦${order.totalAmount.toLocaleString()} has been processed for "${order.event.title}"`,
            actionUrl: `/dashboard/events/${order.eventId}/analytics`,
            userId: order.event.userId,
            metadata: {
              orderId: order.id,
              eventId: order.eventId,
              eventTitle: order.event.title,
              buyerName: order.buyer.name,
              refundAmount: order.totalAmount,
              processedAt: new Date().toISOString(),
            },
            sendEmail: true,
          });
          notifications.push(organizerRefundNotification);
        }
        break;
    }

    return {
      success: true,
      message: `Ticket notifications sent successfully`,
      data: notifications,
    };
  } catch (error) {
    console.error('Error creating ticket notification:', error);
    return {
      success: false,
      message: 'Failed to create ticket notification',
    };
  }
}

// Create organizer upgrade notification for admins
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

    return await createNotification({
      type: 'SYSTEM_UPDATE',
      title: 'New Organizer Registration 🎉',
      message: `${user.name || 'A user'} has created an organizer profile for "${user.organizerProfile?.organizationName}" and been upgraded to organizer status.`,
      actionUrl: `/admin/dashboard/organizers`,
      isAdminNotification: true,
      metadata: {
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        organizationName: user.organizerProfile?.organizationName,
        upgradedAt: new Date().toISOString(),
      },
      sendEmail: true,
    });
  } catch (error) {
    console.error('Error creating organizer upgrade notification:', error);
    return {
      success: false,
      message: 'Failed to create organizer upgrade notification',
    };
  }
}

// Create waiting list notification
export async function createWaitingListNotification(
  eventId: string,
  userId: string
): Promise<ActionResponse<any>> {
  try {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        venue: {
          include: {
            city: true,
          },
        },
      },
    });

    if (!event) {
      return {
        success: false,
        message: 'Event not found',
      };
    }

    return await createNotification({
      type: 'TICKET_AVAILABLE',
      title: 'Tickets Available! 🎫',
      message: `Great news! Tickets are now available for "${event.title}". This offer expires in 24 hours.`,
      actionUrl: `/events/${event.slug}`,
      userId,
      metadata: {
        eventId: event.id,
        eventTitle: event.title,
        eventDate: event.startDateTime,
        offerExpiresAt: new Date(
          Date.now() + 24 * 60 * 60 * 1000
        ).toISOString(),
      },
      sendEmail: true,
    });
  } catch (error) {
    console.error('Error creating waiting list notification:', error);
    return {
      success: false,
      message: 'Failed to create waiting list notification',
    };
  }
}

// Create event cancellation notification
export async function createEventCancellationNotification(
  eventId: string
): Promise<ActionResponse<any>> {
  try {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        orders: {
          where: {
            paymentStatus: 'COMPLETED',
          },
          include: {
            buyer: true,
          },
        },
      },
    });

    if (!event) {
      return {
        success: false,
        message: 'Event not found',
      };
    }

    // Get unique buyers
    const uniqueBuyers = event.orders.reduce((acc, order) => {
      if (!acc.find((buyer) => buyer.id === order.buyer.id)) {
        acc.push(order.buyer);
      }
      return acc;
    }, [] as any[]);

    // Notify all ticket holders
    const notifications = await Promise.all(
      uniqueBuyers.map((buyer) =>
        createNotification({
          type: 'EVENT_CANCELLED',
          title: 'Event Cancelled - Refund Initiated ⚠️',
          message: `Unfortunately, "${event.title}" has been cancelled. Your tickets will be automatically refunded within 5-10 business days.`,
          actionUrl: `/dashboard/tickets`,
          userId: buyer.id,
          metadata: {
            eventId: event.id,
            eventTitle: event.title,
            cancelledAt: new Date().toISOString(),
          },
          sendEmail: true,
        })
      )
    );

    return {
      success: true,
      message: `Event cancellation notifications sent to ${uniqueBuyers.length} ticket holders`,
      data: notifications,
    };
  } catch (error) {
    console.error('Error creating event cancellation notification:', error);
    return {
      success: false,
      message: 'Failed to create event cancellation notification',
    };
  }
}

// Create payout notification for organizers
export async function createPayoutNotification(
  organizerId: string,
  amount: number,
  period: { start: Date; end: Date }
): Promise<ActionResponse<any>> {
  try {
    return await createNotification({
      type: 'PAYMENT_RECEIVED',
      title: 'Payout Processed! 💰',
      message: `Your payout of ₦${amount.toLocaleString()} for the period ${period.start.toLocaleDateString()} - ${period.end.toLocaleDateString()} has been processed.`,
      actionUrl: `/dashboard/analytics`,
      userId: organizerId,
      metadata: {
        payoutAmount: amount,
        periodStart: period.start.toISOString(),
        periodEnd: period.end.toISOString(),
        processedAt: new Date().toISOString(),
      },
      sendEmail: true,
    });
  } catch (error) {
    console.error('Error creating payout notification:', error);
    return {
      success: false,
      message: 'Failed to create payout notification',
    };
  }
}

// Create low inventory alert for organizers
export async function createLowInventoryNotification(
  eventId: string
): Promise<ActionResponse<any>> {
  try {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        user: true,
        ticketTypes: true,
      },
    });

    if (!event || !event.userId) {
      return {
        success: false,
        message: 'Event or organizer not found',
      };
    }

    const lowStockTickets = event.ticketTypes.filter(
      (tt) => tt.quantity <= 5 && tt.quantity > 0
    );

    if (lowStockTickets.length === 0) {
      return {
        success: true,
        message: 'No low inventory to report',
      };
    }

    const ticketNames = lowStockTickets
      .map((tt) => `${tt.name} (${tt.quantity} left)`)
      .join(', ');

    return await createNotification({
      type: 'SYSTEM_UPDATE',
      title: 'Low Ticket Inventory ⚠️',
      message: `Your event "${event.title}" is running low on tickets: ${ticketNames}`,
      actionUrl: `/dashboard/events/${event.id}/edit`,
      userId: event.userId,
      metadata: {
        eventId: event.id,
        eventTitle: event.title,
        lowStockTickets: lowStockTickets.map((tt) => ({
          id: tt.id,
          name: tt.name,
          remaining: tt.quantity,
        })),
        checkedAt: new Date().toISOString(),
      },
      sendEmail: false, // Don't spam with emails for this
    });
  } catch (error) {
    console.error('Error creating low inventory notification:', error);
    return {
      success: false,
      message: 'Failed to create low inventory notification',
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
        userId: session.user.id,
      },
      data: {
        status: 'READ',
        readAt: new Date(),
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
        readAt: new Date(),
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
        userId: session.user.id,
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

// Existing helper functions (updated)

export async function createEventNotification(
  eventId: string,
  type: 'EVENT_SUBMITTED' | 'EVENT_APPROVED' | 'EVENT_REJECTED',
  specificUserId?: string
): Promise<ActionResponse<any>> {
  try {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        user: true,
        venue: {
          include: {
            city: true,
          },
        },
      },
    });

    if (!event) {
      return {
        success: false,
        message: 'Event not found',
      };
    }

    switch (type) {
      case 'EVENT_SUBMITTED':
        return await createNotification({
          type: 'EVENT_SUBMITTED',
          title: 'New Event Submitted for Review 📅',
          message: `${event.user?.name || 'Unknown user'} has submitted "${event.title}" for approval`,
          actionUrl: `/admin/dashboard/events/${eventId}`,
          isAdminNotification: true,
          metadata: {
            eventId: event.id,
            eventTitle: event.title,
            organizerName: event.user?.name,
            submittedAt: new Date().toISOString(),
          },
          sendEmail: true,
        });

      case 'EVENT_APPROVED':
        return await createNotification({
          type: 'EVENT_APPROVED',
          title: 'Event Approved! 🎉',
          message: `Your event "${event.title}" has been approved and is now live!`,
          actionUrl: `/dashboard/events/${eventId}`,
          userId: specificUserId || event.userId!,
          metadata: {
            eventId: event.id,
            eventTitle: event.title,
            approvedAt: new Date().toISOString(),
          },
          sendEmail: true,
        });

      case 'EVENT_REJECTED':
        return await createNotification({
          type: 'EVENT_REJECTED',
          title: 'Event Requires Changes ⚠️',
          message: `Your event "${event.title}" needs some changes before it can be published`,
          actionUrl: `/dashboard/events/${eventId}/edit`,
          userId: specificUserId || event.userId!,
          metadata: {
            eventId: event.id,
            eventTitle: event.title,
            rejectedAt: new Date().toISOString(),
          },
          sendEmail: true,
        });

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

// Utility function to check for low inventory and send alerts
export async function checkAndAlertLowInventory(): Promise<
  ActionResponse<any>
> {
  try {
    // Find events with low ticket inventory (5 or fewer tickets remaining)
    const eventsWithLowInventory = await prisma.event.findMany({
      where: {
        publishedStatus: 'PUBLISHED',
        isCancelled: false,
        startDateTime: {
          gte: new Date(), // Only future events
        },
        ticketTypes: {
          some: {
            quantity: {
              lte: 5,
              gt: 0,
            },
          },
        },
      },
      include: {
        user: true,
        ticketTypes: {
          where: {
            quantity: {
              lte: 5,
              gt: 0,
            },
          },
        },
      },
    });

    const alertsCreated = [];

    for (const event of eventsWithLowInventory) {
      if (event.userId) {
        const alert = await createLowInventoryNotification(event.id);
        if (alert.success) {
          alertsCreated.push(alert.data);
        }
      }
    }

    return {
      success: true,
      message: `Created ${alertsCreated.length} low inventory alerts`,
      data: alertsCreated,
    };
  } catch (error) {
    console.error('Error checking low inventory:', error);
    return {
      success: false,
      message: 'Failed to check low inventory',
    };
  }
}
