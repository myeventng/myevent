import {
  createLowInventoryNotification,
  checkAndAlertLowInventory,
  createNotification,
} from '@/actions/notification.actions';
import { prisma } from '@/lib/prisma';
import { notificationEmailService as emailService } from '@/lib/email-service';

export class NotificationScheduler {
  // Check inventory every hour
  static async runInventoryCheck() {
    console.log('🔄 Running inventory check...');

    try {
      const result = await checkAndAlertLowInventory();
      console.log(`✅ Inventory check completed: ${result.message}`);
      return result;
    } catch (error) {
      console.error('❌ Inventory check failed:', error);
      return { success: false, message: 'Inventory check failed' };
    }
  }

  // Send event reminders
  static async sendEventReminders() {
    console.log('🔄 Sending event reminders...');

    try {
      // Get events happening in 24 hours
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);

      const dayAfterTomorrow = new Date(tomorrow);
      dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

      const upcomingEvents = await prisma.event.findMany({
        where: {
          startDateTime: {
            gte: tomorrow,
            lt: dayAfterTomorrow,
          },
          publishedStatus: 'PUBLISHED',
          isCancelled: false,
        },
        include: {
          orders: {
            where: {
              paymentStatus: 'COMPLETED',
            },
            include: {
              buyer: true,
            },
          },
          venue: {
            include: {
              city: true,
            },
          },
        },
      });

      let remindersSent = 0;

      for (const event of upcomingEvents) {
        // ✅ Filter out orders without buyers (guest purchases) and get unique buyers
        const uniqueBuyers = event.orders.reduce((acc, order) => {
          // Skip if buyer is null (guest purchase without user account)
          if (!order.buyer) {
            return acc;
          }

          // Check if buyer already exists in accumulator
          if (!acc.find((buyer) => buyer.id === order.buyer!.id)) {
            acc.push(order.buyer);
          }
          return acc;
        }, [] as any[]);

        for (const buyer of uniqueBuyers) {
          try {
            // Create notification
            await createNotification({
              type: 'SYSTEM_UPDATE',
              title: 'Event Reminder 📅',
              message: `Don't forget! "${event.title}" is happening tomorrow at ${new Date(event.startDateTime).toLocaleTimeString()}.`,
              actionUrl: `/events/${event.slug}`,
              userId: buyer.id,
              metadata: {
                eventId: event.id,
                eventTitle: event.title,
                eventDate: event.startDateTime,
                reminderType: '24hour',
              },
              sendEmail: true,
            });

            remindersSent++;
          } catch (error) {
            console.error(
              `❌ Failed to send reminder to ${buyer.email}:`,
              error
            );
          }
        }

        // ✅ Handle guest purchases separately (send email directly without notification)
        const guestOrders = event.orders.filter((order) => !order.buyer);

        for (const guestOrder of guestOrders) {
          try {
            // Parse guest info from purchaseNotes
            const purchaseData = JSON.parse(guestOrder.purchaseNotes || '{}');
            if (purchaseData.isGuestPurchase && purchaseData.guestEmail) {
              // Send email reminder directly to guest
              // Note: You might want to create a separate email service method for this
              console.log(
                `📧 Sending reminder email to guest: ${purchaseData.guestEmail}`
              );

              // If you have an email service method for guest reminders, call it here:
              // await emailService.sendEventReminderToGuest(purchaseData.guestEmail, event);

              remindersSent++;
            }
          } catch (error) {
            console.error(
              `❌ Failed to send reminder to guest order ${guestOrder.id}:`,
              error
            );
          }
        }
      }

      console.log(
        `✅ Event reminders sent: ${remindersSent} notifications for ${upcomingEvents.length} events`
      );
      return { success: true, count: remindersSent };
    } catch (error) {
      console.error('❌ Event reminder sending failed:', error);
      return { success: false, count: 0 };
    }
  }

  // Clean up old notifications (older than 30 days)
  static async cleanupOldNotifications() {
    console.log('🔄 Cleaning up old notifications...');

    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const result = await prisma.notification.deleteMany({
        where: {
          createdAt: {
            lt: thirtyDaysAgo,
          },
          status: 'READ',
        },
      });

      console.log(`✅ Cleaned up ${result.count} old notifications`);
      return { success: true, count: result.count };
    } catch (error) {
      console.error('❌ Notification cleanup failed:', error);
      return { success: false, count: 0 };
    }
  }
}
