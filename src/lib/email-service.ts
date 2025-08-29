// lib/email-service.ts
import nodemailer from 'nodemailer';
import QRCode from 'qrcode';
import { TicketEmailTemplate } from '@/components/email/ticket-template';
import { EventNotificationTemplate } from '@/components/email/event-notification-template';
import { render } from '@react-email/render';
import {
  EventApprovalEmail,
  EventRejectionEmail,
  TicketPurchaseEmail,
  RefundProcessedEmail,
  EventCancellationEmail,
  WaitingListEmail,
  PayoutEmail,
} from './notification-template';

// Create nodemailer transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: 465,
  secure: true,
  auth: {
    user: process.env.NODEMAILER_USER,
    pass: process.env.NODEMAILER_APP_PASSWORD,
  },
});

interface EmailOptions {
  to: string;
  subject: string;
  html: string | Promise<string>;
}

interface EmailService {
  sendTicketEmail: (order: any, tickets: any[]) => Promise<void>;
  sendEventNotification: (
    recipient: string,
    event: any,
    type: string
  ) => Promise<void>;
  sendWaitingListNotification: (recipient: string, event: any) => Promise<void>;
  sendRefundNotification: (recipient: string, order: any) => Promise<void>;
}

class NodemailerEmailService implements EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = transporter;
  }

  async sendTicketEmail(order: any, tickets: any[]): Promise<void> {
    try {
      // Validate inputs
      if (!order || !tickets || tickets.length === 0) {
        throw new Error('Invalid order or tickets data for email');
      }

      const event = order.event || tickets[0]?.ticketType?.event;
      const venue = event?.venue;

      if (!event || !venue) {
        throw new Error('Missing event or venue information for ticket email');
      }

      // Generate QR codes for each ticket
      const ticketsWithQR = await Promise.all(
        tickets.map(async (ticket) => {
          let qrCodeData;

          // Use stored QR data if available, otherwise generate
          if (ticket.qrCodeData) {
            qrCodeData = ticket.qrCodeData;
          } else {
            qrCodeData = JSON.stringify({
              type: 'EVENT_TICKET',
              ticketId: ticket.ticketId,
              eventId: event.id,
              userId: ticket.userId,
              timestamp: Date.now(),
            });
          }

          const qrCodeDataURL = await QRCode.toDataURL(qrCodeData, {
            width: 200,
            margin: 2,
            color: {
              dark: '#000000',
              light: '#FFFFFF',
            },
          });

          return {
            ...ticket,
            qrCodeDataURL,
          };
        })
      );

      // Render the email template
      const emailHtml = await render(
        TicketEmailTemplate({
          order,
          event,
          venue,
          tickets: ticketsWithQR,
          supportEmail: process.env.SUPPORT_EMAIL || 'support@myevent.com.ng',
          platformName: process.env.PLATFORM_NAME || 'MyEvent.com.ng',
          appUrl: process.env.NEXT_PUBLIC_APP_URL || 'https://myevent.com.ng',
        })
      );

      await this.transporter.sendMail({
        from: `"${process.env.PLATFORM_NAME}" <${process.env.NODEMAILER_USER}>`,
        to: order.buyer.email,
        subject: `Your tickets for ${event.title}`,
        html: emailHtml,
        headers: {
          'X-Entity-Ref-ID': order.id,
        },
      });

      console.log(
        `Ticket email sent to ${order.buyer.email} for order ${order.id}`
      );
    } catch (error) {
      console.error('Error sending ticket email:', error);
      throw new Error(
        `Failed to send ticket email: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async sendEventNotification(
    recipient: string,
    event: any,
    type: string
  ): Promise<void> {
    try {
      let subject = '';
      let notificationType:
        | 'approved'
        | 'rejected'
        | 'cancelled'
        | 'tickets_available';

      switch (type) {
        case 'EVENT_APPROVED':
          subject = `🎉 Event Approved: ${event.title}`;
          notificationType = 'approved';
          break;
        case 'EVENT_REJECTED':
          subject = `❌ Event Rejected: ${event.title}`;
          notificationType = 'rejected';
          break;
        case 'EVENT_CANCELLED':
          subject = `⚠️ Event Cancelled: ${event.title}`;
          notificationType = 'cancelled';
          break;
        default:
          return;
      }

      const emailHtml = await render(
        EventNotificationTemplate({
          event,
          type: notificationType,
          appUrl: process.env.NEXT_PUBLIC_APP_URL || 'https://myevent.com.ng',
          platformName: process.env.PLATFORM_NAME || 'MyEvent.com.ng',
        })
      );

      await this.transporter.sendMail({
        from: `"${process.env.PLATFORM_NAME}" <${process.env.NODEMAILER_USER}>`,
        to: recipient,
        subject,
        html: emailHtml,
        headers: {
          'X-Entity-Ref-ID': event.id,
        },
      });

      console.log(
        `Event notification sent to ${recipient} for event ${event.id}`
      );
    } catch (error) {
      console.error('Error sending event notification:', error);
      throw error;
    }
  }

  async sendWaitingListNotification(
    recipient: string,
    event: any
  ): Promise<void> {
    try {
      const subject = `Tickets Available: ${event.title}`;

      const emailHtml = await render(
        EventNotificationTemplate({
          event,
          type: 'tickets_available',
          appUrl: process.env.NEXT_PUBLIC_APP_URL || 'https://myevent.com.ng',
          platformName: process.env.PLATFORM_NAME || 'MyEvent.com.ng',
        })
      );

      await this.transporter.sendMail({
        from: `"${process.env.PLATFORM_NAME}" <${process.env.NODEMAILER_USER}>`,
        to: recipient,
        subject,
        html: emailHtml,
        headers: {
          'X-Entity-Ref-ID': event.id,
        },
      });

      console.log(
        `Waiting list notification sent to ${recipient} for event ${event.id}`
      );
    } catch (error) {
      console.error('Error sending waiting list notification:', error);
      throw error;
    }
  }

  async sendRefundNotification(recipient: string, order: any): Promise<void> {
    try {
      const subject = `💰 Refund Processed for ${order.event.title}`;

      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #10b981; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1>Refund Processed</h1>
          </div>
          
          <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
            <p>Your refund has been successfully processed for the following order:</p>
            
            <div style="background: white; padding: 15px; margin: 15px 0; border-radius: 5px; border: 1px solid #e5e7eb;">
              <h3>${order.event.title}</h3>
              <p><strong>Order ID:</strong> ${order.id}</p>
              <p><strong>Refund Amount:</strong> ₦${order.totalAmount.toLocaleString()}</p>
              <p><strong>Original Purchase Date:</strong> ${new Date(
                order.createdAt
              ).toLocaleDateString()}</p>
            </div>
            
            <p>The refund amount will be credited back to your original payment method within 5-10 business days.</p>
            
            <p>If you have any questions, please contact our support team at ${
              process.env.SUPPORT_EMAIL
            }.</p>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280;">
              <p>Best regards,<br>The ${process.env.PLATFORM_NAME} Team</p>
            </div>
          </div>
        </div>
      `;

      await this.transporter.sendMail({
        from: `"${process.env.PLATFORM_NAME}" <${process.env.NODEMAILER_USER}>`,
        to: recipient,
        subject,
        html: emailHtml,
        headers: {
          'X-Entity-Ref-ID': order.id,
        },
      });

      console.log(
        `Refund notification sent to ${recipient} for order ${order.id}`
      );
    } catch (error) {
      console.error('Error sending refund notification:', error);
      throw error;
    }
  }
}

class NotificationEmailService {
  private async sendEmail({ to, subject, html }: EmailOptions) {
    try {
      const resolvedHtml = await html;
      const result = await transporter.sendMail({
        from: `"${process.env.PLATFORM_NAME}" <${process.env.NODEMAILER_USER}>`,
        to,
        subject,
        html: resolvedHtml,
      });

      console.log('✅ Email sent successfully:', result);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('❌ Failed to send email:', error);
      return { success: false, error };
    }
  }

  async sendEventApproval(email: string, event: any) {
    const html = render(
      EventApprovalEmail({
        eventTitle: event.title,
        eventDate: event.startDateTime,
        eventUrl: `${process.env.NEXT_PUBLIC_APP_URL}/events/${event.slug}`,
        organizerName: event.user.name,
      })
    );

    return this.sendEmail({
      to: email,
      subject: `🎉 Your event "${event.title}" has been approved!`,
      html,
    });
  }

  async sendEventRejection(email: string, event: any, rejectionReason: string) {
    const html = render(
      EventRejectionEmail({
        eventTitle: event.title,
        organizerName: event.user.name,
        rejectionReason,
        editUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/events/${event.id}/edit`,
      })
    );

    return this.sendEmail({
      to: email,
      subject: `📝 Action required: Your event "${event.title}" needs updates`,
      html,
    });
  }

  async sendTicketPurchase(email: string, order: any) {
    const html = render(
      TicketPurchaseEmail({
        buyerName: order.buyer.name,
        eventTitle: order.event.title,
        eventDate: order.event.startDateTime,
        eventLocation: `${order.event.venue.name}, ${order.event.venue.city.name}`,
        quantity: order.quantity,
        totalAmount: order.totalAmount,
        orderId: order.id,
        ticketsUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/tickets`,
      })
    );

    return this.sendEmail({
      to: email,
      subject: `🎟️ Your tickets for "${order.event.title}" are confirmed!`,
      html,
    });
  }

  async sendRefundProcessed(email: string, order: any) {
    const html = render(
      RefundProcessedEmail({
        buyerName: order.buyer.name,
        eventTitle: order.event.title,
        refundAmount: order.totalAmount,
        orderId: order.id,
        accountUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/tickets`,
      })
    );

    return this.sendEmail({
      to: email,
      subject: `💰 Your refund of ₦${order.totalAmount.toLocaleString()} has been processed`,
      html,
    });
  }

  async sendEventCancellation(
    email: string,
    event: any,
    order: any,
    reason?: string
  ) {
    const html = render(
      EventCancellationEmail({
        attendeeName: order.buyer.name,
        eventTitle: event.title,
        eventDate: event.startDateTime,
        cancellationReason: reason,
        refundAmount: order.totalAmount,
        supportUrl: `${process.env.NEXT_PUBLIC_APP_URL}/support`,
      })
    );

    return this.sendEmail({
      to: email,
      subject: `⚠️ Important: "${event.title}" has been cancelled`,
      html,
    });
  }

  async sendWaitingListNotification(email: string, event: any) {
    const html = render(
      WaitingListEmail({
        userName: 'Valued Customer', // You might want to pass the actual name
        eventTitle: event.title,
        eventDate: event.startDateTime,
        eventUrl: `${process.env.NEXT_PUBLIC_APP_URL}/events/${event.slug}`,
        expiresIn: '24 hours',
      })
    );

    return this.sendEmail({
      to: email,
      subject: `🎫 Tickets now available for "${event.title}"!`,
      html,
    });
  }

  async sendPayoutNotification(email: string, organizer: any, payoutData: any) {
    const html = render(
      PayoutEmail({
        organizerName: organizer.name,
        payoutAmount: payoutData.amount,
        periodStart: payoutData.periodStart,
        periodEnd: payoutData.periodEnd,
        dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/analytics`,
        eventsSold: payoutData.eventsSold,
        ticketsSold: payoutData.ticketsSold,
      })
    );

    return this.sendEmail({
      to: email,
      subject: `💰 Your payout of ₦${payoutData.amount.toLocaleString()} has been processed`,
      html,
    });
  }
}

// Export both services with different names
export const ticketEmailService = new NodemailerEmailService();
export const notificationEmailService = new NotificationEmailService();

// Optional: Export transporter for direct use elsewhere
export { transporter };
