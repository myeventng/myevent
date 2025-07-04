import { Resend } from 'resend';
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

const resend = new Resend(process.env.RESEND_API_KEY);

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

class EmailService {
  private async sendEmail({ to, subject, html }: EmailOptions) {
    try {
      const result = await resend.emails.send({
        from: 'notifications@yourplatform.com',
        to,
        subject,
        html,
      });

      console.log('✅ Email sent successfully:', result);
      return { success: true, messageId: result.data?.id };
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

export const emailService = new EmailService();
