import { NotificationTemplate, NotificationMetadata } from '../types';

export const NOTIFICATION_TEMPLATES: Record<string, NotificationTemplate> = {
  // Event notifications
  EVENT_SUBMITTED: {
    type: 'EVENT_SUBMITTED',
    title: 'New Event Submitted for Review',
    message: 'An event has been submitted and requires admin approval',
    priority: 'medium',
    category: 'events',
    requiresAction: true,
    emailEnabled: true,
  },
  EVENT_APPROVED: {
    type: 'EVENT_APPROVED',
    title: 'Event Approved!',
    message: 'Your event has been approved and is now live',
    priority: 'low',
    category: 'events',
    requiresAction: false,
    emailEnabled: true,
  },
  EVENT_REJECTED: {
    type: 'EVENT_REJECTED',
    title: 'Event Requires Changes',
    message: 'Your event needs modifications before approval',
    priority: 'medium',
    category: 'events',
    requiresAction: true,
    emailEnabled: true,
  },
  EVENT_CANCELLED: {
    type: 'EVENT_CANCELLED',
    title: 'Event Cancelled',
    message: 'An event has been cancelled and refunds are being processed',
    priority: 'high',
    category: 'events',
    requiresAction: false,
    emailEnabled: true,
  },

  // Ticket notifications
  TICKET_PURCHASED: {
    type: 'TICKET_PURCHASED',
    title: 'Ticket Purchase Confirmed',
    message: 'Tickets have been successfully purchased',
    priority: 'low',
    category: 'tickets',
    requiresAction: false,
    emailEnabled: true,
  },
  TICKET_AVAILABLE: {
    type: 'TICKET_AVAILABLE',
    title: 'Tickets Available',
    message: "Tickets are now available for an event you're interested in",
    priority: 'medium',
    category: 'tickets',
    requiresAction: true,
    emailEnabled: true,
  },
  REFUND_REQUESTED: {
    type: 'REFUND_REQUESTED',
    title: 'Refund Request Submitted',
    message: 'A refund request has been submitted',
    priority: 'medium',
    category: 'tickets',
    requiresAction: true,
    emailEnabled: true,
  },
  REFUND_PROCESSED: {
    type: 'REFUND_PROCESSED',
    title: 'Refund Processed',
    message: 'Your refund has been processed successfully',
    priority: 'low',
    category: 'tickets',
    requiresAction: false,
    emailEnabled: true,
  },

  // Venue notifications
  VENUE_SUBMITTED: {
    type: 'VENUE_SUBMITTED',
    title: 'New Venue Submitted',
    message: 'A venue has been submitted for review',
    priority: 'medium',
    category: 'venues',
    requiresAction: true,
    emailEnabled: true,
  },
  VENUE_APPROVED: {
    type: 'VENUE_APPROVED',
    title: 'Venue Approved',
    message: 'Your venue has been approved',
    priority: 'low',
    category: 'venues',
    requiresAction: false,
    emailEnabled: true,
  },
  VENUE_REJECTED: {
    type: 'VENUE_REJECTED',
    title: 'Venue Requires Changes',
    message: 'Your venue submission needs modifications',
    priority: 'medium',
    category: 'venues',
    requiresAction: true,
    emailEnabled: true,
  },

  // User notifications
  USER_REGISTERED: {
    type: 'USER_REGISTERED',
    title: 'New User Registration',
    message: 'A new user has registered on the platform',
    priority: 'low',
    category: 'users',
    requiresAction: false,
    emailEnabled: false,
  },
  USER_UPGRADED_TO_ORGANIZER: {
    type: 'USER_UPGRADED_TO_ORGANIZER',
    title: 'New Organizer Registration',
    message: 'A user has upgraded to an organizer account',
    priority: 'medium',
    category: 'users',
    requiresAction: false,
    emailEnabled: true,
  },

  // Payment notifications
  PAYMENT_RECEIVED: {
    type: 'PAYMENT_RECEIVED',
    title: 'Payment Received',
    message: 'A payment has been processed',
    priority: 'low',
    category: 'payments',
    requiresAction: false,
    emailEnabled: true,
  },

  // System notifications
  SYSTEM_UPDATE: {
    type: 'SYSTEM_UPDATE',
    title: 'System Update',
    message: 'Important system update or announcement',
    priority: 'medium',
    category: 'system',
    requiresAction: false,
    emailEnabled: false,
  },
};

// utils/notification-helpers.ts
export function getNotificationTemplate(
  type: string
): NotificationTemplate | null {
  return NOTIFICATION_TEMPLATES[type] || null;
}

export function generateNotificationTitle(
  type: string,
  metadata: NotificationMetadata = {}
): string {
  const template = getNotificationTemplate(type);
  if (!template) return 'Notification';

  switch (type) {
    case 'EVENT_SUBMITTED':
      return metadata.eventTitle
        ? `Event "${metadata.eventTitle}" Submitted for Review`
        : template.title;

    case 'EVENT_APPROVED':
      return metadata.eventTitle
        ? `"${metadata.eventTitle}" Approved!`
        : template.title;

    case 'EVENT_REJECTED':
      return metadata.eventTitle
        ? `"${metadata.eventTitle}" Requires Changes`
        : template.title;

    case 'EVENT_CANCELLED':
      return metadata.eventTitle
        ? `"${metadata.eventTitle}" Cancelled`
        : template.title;

    case 'TICKET_PURCHASED':
      return metadata.eventTitle
        ? `Tickets for "${metadata.eventTitle}" Confirmed`
        : template.title;

    case 'TICKET_AVAILABLE':
      return metadata.eventTitle
        ? `Tickets Available for "${metadata.eventTitle}"`
        : template.title;

    case 'REFUND_REQUESTED':
      return metadata.totalAmount
        ? `Refund Request: ₦${metadata.totalAmount.toLocaleString()}`
        : template.title;

    case 'REFUND_PROCESSED':
      return metadata.totalAmount
        ? `Refund Processed: ₦${metadata.totalAmount.toLocaleString()}`
        : template.title;

    case 'VENUE_SUBMITTED':
      return metadata.venueName
        ? `Venue "${metadata.venueName}" Submitted`
        : template.title;

    case 'VENUE_APPROVED':
      return metadata.venueName
        ? `"${metadata.venueName}" Approved`
        : template.title;

    case 'VENUE_REJECTED':
      return metadata.venueName
        ? `"${metadata.venueName}" Requires Changes`
        : template.title;

    case 'USER_UPGRADED_TO_ORGANIZER':
      return metadata.userName
        ? `${metadata.userName} Became an Organizer`
        : template.title;

    case 'PAYMENT_RECEIVED':
      return metadata.payoutAmount
        ? `Payout: ₦${metadata.payoutAmount.toLocaleString()}`
        : template.title;

    default:
      return template.title;
  }
}

export function generateNotificationMessage(
  type: string,
  metadata: NotificationMetadata = {}
): string {
  switch (type) {
    case 'EVENT_SUBMITTED':
      return `${metadata.organizerName || 'An organizer'} has submitted "${
        metadata.eventTitle || 'an event'
      }" for approval. Please review and take action.`;

    case 'EVENT_APPROVED':
      return `Your event "${
        metadata.eventTitle || 'event'
      }" has been approved and is now live on the platform! 🎉`;

    case 'EVENT_REJECTED':
      return `Your event "${
        metadata.eventTitle || 'event'
      }" needs some changes before it can be published. ${
        metadata.rejectionReason ? `Reason: ${metadata.rejectionReason}` : ''
      }`;

    case 'EVENT_CANCELLED':
      return `Unfortunately, "${
        metadata.eventTitle || 'the event'
      }" has been cancelled. ${
        metadata.cancellationReason
          ? `Reason: ${metadata.cancellationReason}`
          : ''
      } All attendees will be automatically refunded.`;

    case 'TICKET_PURCHASED':
      if (metadata.buyerName) {
        // For organizers
        return `${metadata.buyerName} purchased ${
          metadata.quantity || 1
        } ticket(s) for "${metadata.eventTitle}" (₦${
          metadata.totalAmount?.toLocaleString() || '0'
        })`;
      } else {
        // For buyers
        return `Your ${metadata.quantity || 1} ticket(s) for "${
          metadata.eventTitle || 'the event'
        }" have been confirmed! Check your email for your tickets.`;
      }

    case 'TICKET_AVAILABLE':
      return `Great news! Tickets are now available for "${
        metadata.eventTitle || 'the event'
      }" you were waiting for. ${
        metadata.offerExpiresAt
          ? 'This offer expires in 24 hours.'
          : 'Book now to secure your spot!'
      }`;

    case 'REFUND_REQUESTED':
      if (metadata.buyerName) {
        // For admins
        return `${metadata.buyerName} has requested a refund for "${
          metadata.eventTitle || 'an event'
        }" (₦${metadata.totalAmount?.toLocaleString() || '0'}). Please review.`;
      } else {
        // For buyers
        return `Your refund request for "${
          metadata.eventTitle || 'the event'
        }" has been submitted and is under review.`;
      }

    case 'REFUND_PROCESSED':
      return `Your refund of ₦${
        metadata.refundAmount?.toLocaleString() || '0'
      } for "${
        metadata.eventTitle || 'the event'
      }" has been processed and will reflect in your account within 5-10 business days.`;

    case 'VENUE_SUBMITTED':
      return `${metadata.organizerName || 'An organizer'} has submitted "${
        metadata.venueName || 'a venue'
      }" for approval. Please review and verify.`;

    case 'VENUE_APPROVED':
      return `Your venue "${
        metadata.venueName || 'venue'
      }" has been approved and is now available for event bookings!`;

    case 'VENUE_REJECTED':
      return `Your venue "${
        metadata.venueName || 'venue'
      }" needs some changes before approval. ${
        metadata.rejectionReason ? `Reason: ${metadata.rejectionReason}` : ''
      }`;

    case 'USER_REGISTERED':
      return `${metadata.userName || 'A new user'} (${
        metadata.userEmail || ''
      }) has registered on the platform.`;

    case 'USER_UPGRADED_TO_ORGANIZER':
      return `${metadata.userName || 'A user'} has upgraded to an organizer account${
        metadata.organizerName ? ` as "${metadata.organizerName}"` : ''
      } and can now create events.`;

    case 'PAYMENT_RECEIVED':
      if (metadata.periodStart && metadata.periodEnd) {
        return `Your payout of ₦${
          metadata.payoutAmount?.toLocaleString() || '0'
        } for the period ${new Date(metadata.periodStart).toLocaleDateString()} - ${new Date(
          metadata.periodEnd
        ).toLocaleDateString()} has been processed.`;
      }
      return `You have received a payment of ₦${
        metadata.payoutAmount?.toLocaleString() || '0'
      }.`;

    case 'SYSTEM_UPDATE':
      return metadata.message || 'Important system update or announcement.';

    default:
      return 'You have a new notification.';
  }
}

export function getActionUrl(
  type: string,
  metadata: NotificationMetadata = {},
  isAdmin: boolean = false
): string | undefined {
  switch (type) {
    case 'EVENT_SUBMITTED':
      return isAdmin && metadata.eventId
        ? `/admin/dashboard/events/${metadata.eventId}`
        : undefined;

    case 'EVENT_APPROVED':
    case 'EVENT_REJECTED':
      return metadata.eventId
        ? `/dashboard/events/${metadata.eventId}`
        : '/dashboard/events';

    case 'EVENT_CANCELLED':
      return '/dashboard/tickets';

    case 'TICKET_PURCHASED':
      if (metadata.buyerName && isAdmin) {
        // For admins viewing ticket purchases
        return metadata.eventId
          ? `/admin/dashboard/events/${metadata.eventId}`
          : '/admin/dashboard/orders';
      } else if (metadata.buyerName) {
        // For organizers
        return metadata.eventId
          ? `/dashboard/events/${metadata.eventId}/analytics`
          : '/dashboard/analytics';
      } else {
        // For buyers
        return '/dashboard/tickets';
      }

    case 'TICKET_AVAILABLE':
      return metadata.eventId ? `/events/${metadata.eventId}` : '/events';

    case 'REFUND_REQUESTED':
      if (isAdmin) {
        return metadata.orderId
          ? `/admin/dashboard/orders/${metadata.orderId}`
          : '/admin/dashboard/orders';
      }
      return '/dashboard/tickets';

    case 'REFUND_PROCESSED':
      return '/dashboard/tickets';

    case 'VENUE_SUBMITTED':
      return isAdmin && metadata.venueId
        ? `/admin/dashboard/venues/${metadata.venueId}`
        : undefined;

    case 'VENUE_APPROVED':
    case 'VENUE_REJECTED':
      return metadata.venueId
        ? `/dashboard/venues/${metadata.venueId}`
        : '/dashboard/venues';

    case 'USER_REGISTERED':
    case 'USER_UPGRADED_TO_ORGANIZER':
      return isAdmin && metadata.userId
        ? `/admin/dashboard/users/${metadata.userId}`
        : undefined;

    case 'PAYMENT_RECEIVED':
      return '/dashboard/analytics';

    case 'SYSTEM_UPDATE':
      return '/dashboard';

    default:
      return undefined;
  }
}

export function shouldSendEmail(type: string): boolean {
  const template = getNotificationTemplate(type);
  return template?.emailEnabled || false;
}

export function getNotificationPriority(
  type: string
): 'low' | 'medium' | 'high' {
  const template = getNotificationTemplate(type);
  return template?.priority || 'low';
}

export function getNotificationCategory(type: string): string {
  const template = getNotificationTemplate(type);
  return template?.category || 'system';
}

export function requiresAction(type: string): boolean {
  const template = getNotificationTemplate(type);
  return template?.requiresAction || false;
}

// Notification formatting utilities
export function formatNotificationTime(createdAt: string): string {
  const now = new Date();
  const notificationTime = new Date(createdAt);
  const diffInMinutes = Math.floor(
    (now.getTime() - notificationTime.getTime()) / (1000 * 60)
  );

  if (diffInMinutes < 1) return 'Just now';
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays}d ago`;

  return notificationTime.toLocaleDateString();
}

export function getNotificationIcon(type: string): string {
  switch (type) {
    case 'EVENT_SUBMITTED':
    case 'EVENT_APPROVED':
    case 'EVENT_REJECTED':
    case 'EVENT_CANCELLED':
      return '📅';
    case 'TICKET_PURCHASED':
    case 'TICKET_AVAILABLE':
      return '🎟️';
    case 'REFUND_REQUESTED':
    case 'REFUND_PROCESSED':
    case 'PAYMENT_RECEIVED':
      return '💰';
    case 'VENUE_SUBMITTED':
    case 'VENUE_APPROVED':
    case 'VENUE_REJECTED':
      return '📍';
    case 'USER_REGISTERED':
      return '👤';
    case 'USER_UPGRADED_TO_ORGANIZER':
      return '👥';
    case 'SYSTEM_UPDATE':
      return '🔔';
    default:
      return '📢';
  }
}

// Bulk notification operations
export function groupNotificationsByDate(
  notifications: any[]
): Record<string, any[]> {
  const groups: Record<string, any[]> = {};

  notifications.forEach((notification) => {
    const date = new Date(notification.createdAt).toDateString();
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(notification);
  });

  return groups;
}

export function groupNotificationsByType(
  notifications: any[]
): Record<string, any[]> {
  const groups: Record<string, any[]> = {};

  notifications.forEach((notification) => {
    const category = getNotificationCategory(notification.type);
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(notification);
  });

  return groups;
}

export function filterNotificationsByPriority(
  notifications: any[],
  priority: 'low' | 'medium' | 'high'
): any[] {
  return notifications.filter(
    (notification) => getNotificationPriority(notification.type) === priority
  );
}

export function getUnreadNotificationsCount(notifications: any[]): number {
  return notifications.filter((n) => n.status === 'UNREAD').length;
}

export function getNotificationsByCategory(
  notifications: any[],
  category: string
): any[] {
  return notifications.filter(
    (notification) => getNotificationCategory(notification.type) === category
  );
}

// Auto-refresh utilities
export function shouldAutoRefresh(lastFetch: Date): boolean {
  const now = new Date();
  const diffInMinutes = (now.getTime() - lastFetch.getTime()) / (1000 * 60);
  return diffInMinutes >= 5; // Refresh every 5 minutes
}

export function getRefreshInterval(isActive: boolean): number {
  return isActive ? 30000 : 60000; // 30s when active, 60s when inactive
}
