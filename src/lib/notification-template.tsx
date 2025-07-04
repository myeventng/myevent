// lib/email-templates/notification-templates.tsx
import React from 'react';
import {
  Html,
  Head,
  Preview,
  Body,
  Container,
  Section,
  Row,
  Column,
  Heading,
  Text,
  Button,
  Hr,
  Img,
} from '@react-email/components';

// Base Email Template
interface BaseEmailProps {
  previewText: string;
  title: string;
  children: React.ReactNode;
  actionUrl?: string;
  actionText?: string;
}

function BaseEmailTemplate({
  previewText,
  title,
  children,
  actionUrl,
  actionText,
}: BaseEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Row>
              <Column>
                <Img
                  src="https://yourplatform.com/logo.png"
                  width="120"
                  height="40"
                  alt="Platform Logo"
                  style={logo}
                />
              </Column>
            </Row>
          </Section>

          {/* Content */}
          <Section style={content}>
            <Heading style={h1}>{title}</Heading>
            {children}

            {actionUrl && actionText && (
              <Section style={buttonContainer}>
                <Button style={button} href={actionUrl}>
                  {actionText}
                </Button>
              </Section>
            )}
          </Section>

          {/* Footer */}
          <Hr style={hr} />
          <Section style={footer}>
            <Text style={footerText}>
              © 2024 YourPlatform. All rights reserved.
            </Text>
            <Text style={footerText}>
              You're receiving this email because you have an account with us.
              <br />
              If you don't want to receive these emails, you can{' '}
              <a href="https://yourplatform.com/unsubscribe" style={link}>
                unsubscribe
              </a>
              .
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

// Event Approval Email
interface EventApprovalEmailProps {
  eventTitle: string;
  eventDate: string;
  eventUrl: string;
  organizerName: string;
}

export function EventApprovalEmail({
  eventTitle,
  eventDate,
  eventUrl,
  organizerName,
}: EventApprovalEmailProps) {
  return (
    <BaseEmailTemplate
      previewText={`Great news! Your event "${eventTitle}" has been approved`}
      title="🎉 Your Event Has Been Approved!"
      actionUrl={eventUrl}
      actionText="View Your Event"
    >
      <Text style={text}>Hi {organizerName},</Text>
      <Text style={text}>
        Great news! Your event <strong>"{eventTitle}"</strong> has been reviewed
        and approved by our team.
      </Text>
      <Text style={text}>
        Your event is now live and attendees can start purchasing tickets. Here
        are the details:
      </Text>

      <Section style={eventDetails}>
        <Text style={detailText}>
          <strong>Event:</strong> {eventTitle}
        </Text>
        <Text style={detailText}>
          <strong>Date:</strong> {new Date(eventDate).toLocaleDateString()}
        </Text>
        <Text style={detailText}>
          <strong>Status:</strong> ✅ Live
        </Text>
      </Section>

      <Text style={text}>
        You can now share your event link with potential attendees and start
        promoting your event!
      </Text>
    </BaseEmailTemplate>
  );
}

// Event Rejection Email
interface EventRejectionEmailProps {
  eventTitle: string;
  organizerName: string;
  rejectionReason: string;
  editUrl: string;
}

export function EventRejectionEmail({
  eventTitle,
  organizerName,
  rejectionReason,
  editUrl,
}: EventRejectionEmailProps) {
  return (
    <BaseEmailTemplate
      previewText={`Action required: Your event "${eventTitle}" needs updates`}
      title="📝 Your Event Needs Some Updates"
      actionUrl={editUrl}
      actionText="Edit Your Event"
    >
      <Text style={text}>Hi {organizerName},</Text>
      <Text style={text}>
        Thank you for submitting your event <strong>"{eventTitle}"</strong>.
        After reviewing your submission, we need you to make some adjustments
        before we can approve it.
      </Text>

      <Section style={alertBox}>
        <Text style={alertText}>
          <strong>What needs to be updated:</strong>
        </Text>
        <Text style={alertText}>{rejectionReason}</Text>
      </Section>

      <Text style={text}>
        Please make the necessary changes and resubmit your event. Our team will
        review it again as soon as possible.
      </Text>
    </BaseEmailTemplate>
  );
}

// Ticket Purchase Confirmation Email
interface TicketPurchaseEmailProps {
  buyerName: string;
  eventTitle: string;
  eventDate: string;
  eventLocation: string;
  quantity: number;
  totalAmount: number;
  orderId: string;
  ticketsUrl: string;
}

export function TicketPurchaseEmail({
  buyerName,
  eventTitle,
  eventDate,
  eventLocation,
  quantity,
  totalAmount,
  orderId,
  ticketsUrl,
}: TicketPurchaseEmailProps) {
  return (
    <BaseEmailTemplate
      previewText={`Your tickets for "${eventTitle}" are confirmed!`}
      title="🎟️ Ticket Purchase Confirmed!"
      actionUrl={ticketsUrl}
      actionText="View Your Tickets"
    >
      <Text style={text}>Hi {buyerName},</Text>
      <Text style={text}>
        Thank you for your purchase! Your tickets for{' '}
        <strong>"{eventTitle}"</strong> have been confirmed.
      </Text>

      <Section style={ticketDetails}>
        <Text style={detailText}>
          <strong>Event:</strong> {eventTitle}
        </Text>
        <Text style={detailText}>
          <strong>Date:</strong> {new Date(eventDate).toLocaleDateString()}
        </Text>
        <Text style={detailText}>
          <strong>Location:</strong> {eventLocation}
        </Text>
        <Text style={detailText}>
          <strong>Tickets:</strong> {quantity}
        </Text>
        <Text style={detailText}>
          <strong>Total Paid:</strong> ₦{totalAmount.toLocaleString()}
        </Text>
        <Text style={detailText}>
          <strong>Order ID:</strong> {orderId}
        </Text>
      </Section>

      <Text style={text}>
        Your tickets are attached to this email and also available in your
        account. Please bring your tickets (digital or printed) to the event.
      </Text>

      <Text style={text}>Looking forward to seeing you at the event!</Text>
    </BaseEmailTemplate>
  );
}

// Refund Processed Email
interface RefundProcessedEmailProps {
  buyerName: string;
  eventTitle: string;
  refundAmount: number;
  orderId: string;
  accountUrl: string;
}

export function RefundProcessedEmail({
  buyerName,
  eventTitle,
  refundAmount,
  orderId,
  accountUrl,
}: RefundProcessedEmailProps) {
  return (
    <BaseEmailTemplate
      previewText={`Your refund of ₦${refundAmount.toLocaleString()} has been processed`}
      title="💰 Refund Processed Successfully"
      actionUrl={accountUrl}
      actionText="View Account"
    >
      <Text style={text}>Hi {buyerName},</Text>
      <Text style={text}>
        Your refund for <strong>"{eventTitle}"</strong> has been processed
        successfully.
      </Text>

      <Section style={refundDetails}>
        <Text style={detailText}>
          <strong>Event:</strong> {eventTitle}
        </Text>
        <Text style={detailText}>
          <strong>Refund Amount:</strong> ₦{refundAmount.toLocaleString()}
        </Text>
        <Text style={detailText}>
          <strong>Order ID:</strong> {orderId}
        </Text>
        <Text style={detailText}>
          <strong>Processing Time:</strong> 5-10 business days
        </Text>
      </Section>

      <Text style={text}>
        The refund will be credited to your original payment method within 5-10
        business days.
      </Text>

      <Text style={text}>
        If you have any questions about this refund, please don't hesitate to
        contact our support team.
      </Text>
    </BaseEmailTemplate>
  );
}

// Event Cancellation Email
interface EventCancellationEmailProps {
  attendeeName: string;
  eventTitle: string;
  eventDate: string;
  cancellationReason?: string;
  refundAmount: number;
  supportUrl: string;
}

export function EventCancellationEmail({
  attendeeName,
  eventTitle,
  eventDate,
  cancellationReason,
  refundAmount,
  supportUrl,
}: EventCancellationEmailProps) {
  return (
    <BaseEmailTemplate
      previewText={`Important: "${eventTitle}" has been cancelled`}
      title="⚠️ Event Cancellation Notice"
      actionUrl={supportUrl}
      actionText="Contact Support"
    >
      <Text style={text}>Hi {attendeeName},</Text>
      <Text style={text}>
        We regret to inform you that <strong>"{eventTitle}"</strong> scheduled
        for {new Date(eventDate).toLocaleDateString()} has been cancelled.
      </Text>

      {cancellationReason && (
        <Section style={alertBox}>
          <Text style={alertText}>
            <strong>Reason for cancellation:</strong>
          </Text>
          <Text style={alertText}>{cancellationReason}</Text>
        </Section>
      )}

      <Text style={text}>
        We sincerely apologize for any inconvenience this may cause. A full
        refund of ₦{refundAmount.toLocaleString()}
        will be processed automatically and credited to your original payment
        method within 5-10 business days.
      </Text>

      <Text style={text}>
        If you have any questions or concerns, please don't hesitate to reach
        out to our support team.
      </Text>
    </BaseEmailTemplate>
  );
}

// Waiting List Notification Email
interface WaitingListEmailProps {
  userName: string;
  eventTitle: string;
  eventDate: string;
  eventUrl: string;
  expiresIn: string;
}

export function WaitingListEmail({
  userName,
  eventTitle,
  eventDate,
  eventUrl,
  expiresIn,
}: WaitingListEmailProps) {
  return (
    <BaseEmailTemplate
      previewText={`Tickets are now available for "${eventTitle}"!`}
      title="🎫 Tickets Available - Limited Time!"
      actionUrl={eventUrl}
      actionText="Get Your Tickets Now"
    >
      <Text style={text}>Hi {userName},</Text>
      <Text style={text}>
        Great news! Tickets are now available for{' '}
        <strong>"{eventTitle}"</strong> that you were waiting for.
      </Text>

      <Section style={urgentBox}>
        <Text style={urgentText}>
          ⏰ <strong>Act Fast!</strong> This offer expires in {expiresIn}.
        </Text>
      </Section>

      <Section style={eventDetails}>
        <Text style={detailText}>
          <strong>Event:</strong> {eventTitle}
        </Text>
        <Text style={detailText}>
          <strong>Date:</strong> {new Date(eventDate).toLocaleDateString()}
        </Text>
        <Text style={detailText}>
          <strong>Status:</strong> 🎟️ Tickets Available
        </Text>
      </Section>

      <Text style={text}>
        Don't miss out! Click the button below to secure your tickets before
        they're gone.
      </Text>
    </BaseEmailTemplate>
  );
}

// Organizer Payout Email
interface PayoutEmailProps {
  organizerName: string;
  payoutAmount: number;
  periodStart: string;
  periodEnd: string;
  dashboardUrl: string;
  eventsSold: number;
  ticketsSold: number;
}

export function PayoutEmail({
  organizerName,
  payoutAmount,
  periodStart,
  periodEnd,
  dashboardUrl,
  eventsSold,
  ticketsSold,
}: PayoutEmailProps) {
  return (
    <BaseEmailTemplate
      previewText={`Your payout of ₦${payoutAmount.toLocaleString()} has been processed`}
      title="💰 Payout Processed!"
      actionUrl={dashboardUrl}
      actionText="View Dashboard"
    >
      <Text style={text}>Hi {organizerName},</Text>
      <Text style={text}>
        Your payout for the period {new Date(periodStart).toLocaleDateString()}{' '}
        - {new Date(periodEnd).toLocaleDateString()}
        has been processed successfully.
      </Text>

      <Section style={payoutDetails}>
        <Text style={detailText}>
          <strong>Payout Amount:</strong> ₦{payoutAmount.toLocaleString()}
        </Text>
        <Text style={detailText}>
          <strong>Period:</strong> {new Date(periodStart).toLocaleDateString()}{' '}
          - {new Date(periodEnd).toLocaleDateString()}
        </Text>
        <Text style={detailText}>
          <strong>Events Sold:</strong> {eventsSold}
        </Text>
        <Text style={detailText}>
          <strong>Tickets Sold:</strong> {ticketsSold}
        </Text>
      </Section>

      <Text style={text}>
        The funds will be transferred to your registered bank account within 1-3
        business days.
      </Text>

      <Text style={text}>
        Keep up the great work! Check your dashboard for detailed analytics and
        insights.
      </Text>
    </BaseEmailTemplate>
  );
}

// CSS Styles for emails
const main = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
};

const header = {
  padding: '20px 30px',
  backgroundColor: '#ffffff',
};

const logo = {
  margin: '0 auto',
};

const content = {
  padding: '0 30px',
};

const h1 = {
  color: '#1f2937',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '30px 0',
  padding: '0',
  lineHeight: '32px',
};

const text = {
  color: '#374151',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '16px 0',
};

const detailText = {
  color: '#374151',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '8px 0',
};

const alertText = {
  color: '#dc2626',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '8px 0',
};

const urgentText = {
  color: '#ea580c',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '12px 0',
  textAlign: 'center' as const,
};

const button = {
  backgroundColor: '#3b82f6',
  borderRadius: '8px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'block',
  padding: '12px 24px',
  margin: '24px 0',
};

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '32px 0',
};

const eventDetails = {
  backgroundColor: '#f9fafb',
  borderRadius: '8px',
  padding: '20px',
  margin: '24px 0',
};

const ticketDetails = {
  backgroundColor: '#ecfdf5',
  borderRadius: '8px',
  padding: '20px',
  margin: '24px 0',
  border: '1px solid #d1fae5',
};

const refundDetails = {
  backgroundColor: '#fef3c7',
  borderRadius: '8px',
  padding: '20px',
  margin: '24px 0',
  border: '1px solid #fed7aa',
};

const payoutDetails = {
  backgroundColor: '#ecfdf5',
  borderRadius: '8px',
  padding: '20px',
  margin: '24px 0',
  border: '1px solid #86efac',
};

const alertBox = {
  backgroundColor: '#fef2f2',
  borderRadius: '8px',
  padding: '16px',
  margin: '24px 0',
  border: '1px solid #fecaca',
};

const urgentBox = {
  backgroundColor: '#fff7ed',
  borderRadius: '8px',
  padding: '16px',
  margin: '24px 0',
  border: '2px solid #fed7aa',
};

const hr = {
  borderColor: '#e5e7eb',
  margin: '42px 0 26px',
};

const footer = {
  color: '#6b7280',
  fontSize: '12px',
  lineHeight: '16px',
  padding: '0 30px',
};

const footerText = {
  margin: '12px 0',
  textAlign: 'center' as const,
};

const link = {
  color: '#3b82f6',
  textDecoration: 'underline',
};

// Email Service Implementation
// lib/email-service.ts

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
} from './email-templates/notification-templates';

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

// Service Worker for Push Notifications
// public/sw.js

self.addEventListener('push', function (event) {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: '/icon-192x192.png',
      badge: '/icon-72x72.png',
      actions: [
        {
          action: 'view',
          title: 'View',
          icon: '/icons/view.png',
        },
        {
          action: 'dismiss',
          title: 'Dismiss',
          icon: '/icons/dismiss.png',
        },
      ],
      data: {
        url: data.url || '/',
        notificationId: data.notificationId,
      },
      requireInteraction: data.requireInteraction || false,
      silent: data.silent || false,
      vibrate: data.vibrate || [200, 100, 200],
    };

    event.waitUntil(self.registration.showNotification(data.title, options));
  }
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();

  if (event.action === 'view' || !event.action) {
    event.waitUntil(clients.openWindow(event.notification.data.url));
  }

  // Mark notification as read
  if (event.notification.data.notificationId) {
    fetch('/api/notifications/mark-read', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        notificationId: event.notification.data.notificationId,
      }),
    });
  }
});

// Push Notification Utils
// lib/push-notifications.ts

interface PushNotificationData {
  title: string;
  body: string;
  url?: string;
  notificationId?: string;
  requireInteraction?: boolean;
  silent?: boolean;
  vibrate?: number[];
}

export class PushNotificationService {
  private static instance: PushNotificationService;
  private publicKey: string;

  private constructor() {
    this.publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
  }

  static getInstance(): PushNotificationService {
    if (!PushNotificationService.instance) {
      PushNotificationService.instance = new PushNotificationService();
    }
    return PushNotificationService.instance;
  }

  async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      throw new Error('This browser does not support notifications');
    }

    if (Notification.permission === 'granted') {
      return 'granted';
    }

    const permission = await Notification.requestPermission();
    return permission;
  }

  async subscribe(): Promise<PushSubscription | null> {
    try {
      const registration = await navigator.serviceWorker.ready;

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(this.publicKey),
      });

      // Send subscription to server
      await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(subscription),
      });

      return subscription;
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error);
      return null;
    }
  }

  async unsubscribe(): Promise<boolean> {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();

        // Remove subscription from server
        await fetch('/api/notifications/unsubscribe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(subscription),
        });
      }

      return true;
    } catch (error) {
      console.error('Failed to unsubscribe from push notifications:', error);
      return false;
    }
  }

  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }
}

export const pushNotificationService = PushNotificationService.getInstance();
