// src/lib/email-service.ts
// Ticket + event-notification emails routed through the universal provider.

import QRCode from "qrcode";
import { TicketEmailTemplate } from "@/components/email/ticket-template";
import { EventNotificationTemplate } from "@/components/email/event-notification-template";
import { render } from "@react-email/render";
import {
  EventApprovalEmail,
  EventRejectionEmail,
  TicketPurchaseEmail,
  RefundProcessedEmail,
  EventCancellationEmail,
  WaitingListEmail,
  PayoutEmail,
} from "./notification-template";
import { sendEmail } from "./email/email-provider";

// ─── Types ────────────────────────────────────────────────────────────────────

interface EmailService {
  sendTicketEmail: (order: any, tickets: any[]) => Promise<void>;
  sendEventNotification: (
    recipient: string,
    event: any,
    type: "approved" | "rejected" | "cancelled" | "tickets_available",
  ) => Promise<void>;
  sendWaitingListNotification: (recipient: string, event: any) => Promise<void>;
  sendRefundNotification: (recipient: string, order: any) => Promise<void>;
}

// ─── Implementation ───────────────────────────────────────────────────────────

class UniversalEmailService implements EmailService {
  async sendTicketEmail(order: any, tickets: any[]): Promise<void> {
    if (!order || !tickets || tickets.length === 0) {
      throw new Error("Invalid order or tickets data for email");
    }

    const event = order.event || tickets[0]?.ticketType?.event;
    const venue = event?.venue;
    if (!event || !venue)
      throw new Error("Missing event or venue information for ticket email");

    let buyerName: string;
    let buyerEmail: string;

    if (order.buyer) {
      buyerName = order.buyer.name;
      buyerEmail = order.buyer.email;
    } else {
      const notes = JSON.parse(order.purchaseNotes || "{}");
      if (notes.isGuestPurchase && notes.guestEmail && notes.guestName) {
        buyerName = notes.guestName;
        buyerEmail = notes.guestEmail;
      } else {
        throw new Error("Unable to determine recipient for ticket email");
      }
    }

    console.log(`📧 Preparing ticket email for: ${buyerEmail} (${buyerName})`);

    // Generate QR codes for each ticket
    const ticketsWithQR = [];
    for (const ticket of tickets) {
      const qrCodeData = await QRCode.toDataURL(
        JSON.stringify({
          ticketId: ticket.id,
          eventId: event.id,
          ticketCode: ticket.ticketCode,
        }),
      );
      ticketsWithQR.push({ ...ticket, qrCodeData });
    }

    // TicketEmailTemplate expects: order, event, venue, tickets, supportEmail, platformName, appUrl
    const html = await render(
      TicketEmailTemplate({
        order,
        tickets: ticketsWithQR,
        event,
        venue,
        supportEmail: process.env.SUPPORT_EMAIL || "support@myevent.com.ng",
        platformName: "MyEvent.com.ng",
        appUrl: process.env.NEXT_PUBLIC_APP_URL || "https://myevent.com.ng",
      }),
    );

    await sendEmail({
      to: buyerEmail,
      subject: `🎟️ Your tickets for ${event.title}`,
      html: typeof html === "string" ? html : await html,
    });

    console.log(`✅ Ticket email sent to ${buyerEmail}`);
  }

  // EventNotificationTemplate expects: event, type (union), appUrl, platformName
  async sendEventNotification(
    recipient: string,
    event: any,
    type: "approved" | "rejected" | "cancelled" | "tickets_available",
  ): Promise<void> {
    const html = await render(
      EventNotificationTemplate({
        event,
        type,
        appUrl: process.env.NEXT_PUBLIC_APP_URL || "https://myevent.com.ng",
        platformName: "MyEvent.com.ng",
      }),
    );
    await sendEmail({
      to: recipient,
      subject: `Event Update: ${event.title}`,
      html: typeof html === "string" ? html : await html,
    });
  }

  // WaitingListEmail expects: userName, eventTitle, eventDate, eventUrl, expiresIn
  async sendWaitingListNotification(
    recipient: string,
    event: any,
  ): Promise<void> {
    const html = await render(
      WaitingListEmail({
        userName: recipient,
        eventTitle: event.title,
        eventDate: event.startDateTime,
        eventUrl: `${process.env.NEXT_PUBLIC_APP_URL || "https://myevent.com.ng"}/events/${event.slug}`,
        expiresIn: "24 hours",
      }),
    );
    await sendEmail({
      to: recipient,
      subject: `🎫 Tickets available for ${event.title}`,
      html: typeof html === "string" ? html : await html,
    });
  }

  // RefundProcessedEmail expects: buyerName, eventTitle, refundAmount, orderId, accountUrl
  async sendRefundNotification(recipient: string, order: any): Promise<void> {
    const html = await render(
      RefundProcessedEmail({
        buyerName: order.buyer?.name || "Customer",
        eventTitle: order.event?.title || "Event",
        refundAmount: order.totalAmount,
        orderId: order.id,
        accountUrl: `${process.env.NEXT_PUBLIC_APP_URL || "https://myevent.com.ng"}/dashboard/tickets`,
      }),
    );
    await sendEmail({
      to: recipient,
      subject: "💸 Your refund has been processed",
      html: typeof html === "string" ? html : await html,
    });
  }

  // ── Notification helpers ───────────────────────────────────────────────────

  // EventApprovalEmail expects: eventTitle, eventDate, eventUrl, organizerName
  async sendEventApproval(email: string, event: any) {
    const html = await render(
      EventApprovalEmail({
        eventTitle: event.title,
        eventDate: event.startDateTime,
        eventUrl: `${process.env.NEXT_PUBLIC_APP_URL}/events/${event.slug}`,
        organizerName: event.user.name,
      }),
    );
    return sendEmail({
      to: email,
      subject: `🎉 Your event "${event.title}" has been approved!`,
      html: typeof html === "string" ? html : await html,
    });
  }

  // EventRejectionEmail expects: eventTitle, organizerName, rejectionReason, editUrl
  async sendEventRejection(email: string, event: any, rejectionReason: string) {
    const html = await render(
      EventRejectionEmail({
        eventTitle: event.title,
        organizerName: event.user.name,
        rejectionReason,
        editUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/events/${event.id}/edit`,
      }),
    );
    return sendEmail({
      to: email,
      subject: `Event "${event.title}" was not approved`,
      html: typeof html === "string" ? html : await html,
    });
  }

  // TicketPurchaseEmail expects: buyerName, eventTitle, eventDate, eventLocation, quantity, totalAmount, orderId, ticketsUrl
  async sendTicketPurchaseConfirmation(email: string, order: any) {
    const html = await render(
      TicketPurchaseEmail({
        buyerName: order.buyer?.name || "Customer",
        eventTitle: order.event?.title || "Event",
        eventDate: order.event?.startDateTime || "",
        eventLocation: order.event?.venue?.name || "",
        quantity: order.quantity || 1,
        totalAmount: order.totalAmount,
        orderId: order.id,
        ticketsUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/tickets`,
      }),
    );
    return sendEmail({
      to: email,
      subject: "🎟️ Purchase Confirmed!",
      html: typeof html === "string" ? html : await html,
    });
  }

  // PayoutEmail expects: organizerName, payoutAmount, periodStart, periodEnd, dashboardUrl, eventsSold, ticketsSold
  async sendPayoutNotification(email: string, payout: any) {
    const html = await render(
      PayoutEmail({
        organizerName: payout.organizer?.name || "Organizer",
        payoutAmount: payout.netAmount,
        periodStart: payout.periodStart,
        periodEnd: payout.periodEnd,
        dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
        eventsSold: payout.eventsSold || 0,
        ticketsSold: payout.ticketsSold || 0,
      }),
    );
    return sendEmail({
      to: email,
      subject: "💰 Payout Processed",
      html: typeof html === "string" ? html : await html,
    });
  }

  // EventCancellationEmail expects: attendeeName, eventTitle, eventDate, cancellationReason?, refundAmount, supportUrl
  async sendEventCancellation(
    email: string,
    event: any,
    attendeeName?: string,
    refundAmount?: number,
  ) {
    const html = await render(
      EventCancellationEmail({
        attendeeName: attendeeName || "Attendee",
        eventTitle: event.title,
        eventDate: event.startDateTime,
        cancellationReason: event.cancellationReason,
        refundAmount: refundAmount || 0,
        supportUrl: `${process.env.NEXT_PUBLIC_APP_URL}/support`,
      }),
    );
    return sendEmail({
      to: email,
      subject: `Event Cancelled: ${event.title}`,
      html: typeof html === "string" ? html : await html,
    });
  }
}

export const emailService = new UniversalEmailService();
export default emailService;
