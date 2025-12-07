// lib/email/scheduled-reminders.ts
import { prisma } from '@/lib/prisma';
import { addDays } from 'date-fns';
import { sendReminderEmail } from './send-reminder-email';

export async function sendScheduledReminders() {
  try {
    // Find all invite-only events with auto reminders enabled
    const inviteOnlyEvents = await prisma.inviteOnlyEvent.findMany({
      where: {
        sendAutoReminders: true,
        reminderDaysBefore: { not: null },
        event: {
          startDateTime: {
            gte: new Date(),
          },
        },
      },
      include: {
        event: {
          include: {
            venue: true,
          },
        },
        invitations: {
          where: {
            status: {
              in: ['PENDING', 'ACCEPTED'],
            },
            reminderSentAt: null, // Haven't sent reminder yet
          },
        },
      },
    });

    let totalSent = 0;
    let totalFailed = 0;

    for (const inviteEvent of inviteOnlyEvents) {
      const event = inviteEvent.event;
      const reminderDate = addDays(
        new Date(event.startDateTime),
        -(inviteEvent.reminderDaysBefore || 7)
      );

      // Check if today is the reminder day
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      reminderDate.setHours(0, 0, 0, 0);

      if (today.getTime() === reminderDate.getTime()) {
        // Send reminders to all pending invitations
        for (const invitation of inviteEvent.invitations) {
          try {
            const result = await sendReminderEmail({
              invitation: invitation as any,
            });

            if (result.success) {
              // Update invitation to mark reminder as sent
              await prisma.invitation.update({
                where: { id: invitation.id },
                data: { reminderSentAt: new Date() },
              });
              totalSent++;
            } else {
              totalFailed++;
            }
          } catch (error) {
            console.error(
              `Failed to send reminder to ${invitation.guestEmail}:`,
              error
            );
            totalFailed++;
          }

          // Small delay to avoid rate limiting
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      }
    }

    console.log(
      `Scheduled reminders: ${totalSent} sent, ${totalFailed} failed`
    );
    return { sent: totalSent, failed: totalFailed };
  } catch (error) {
    console.error('Error sending scheduled reminders:', error);
    throw error;
  }
}
