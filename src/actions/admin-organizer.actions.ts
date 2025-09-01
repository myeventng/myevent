'use server';

import { revalidatePath } from 'next/cache';
import type { Prisma } from '@/generated/prisma';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { createNotification } from '@/actions/notification.actions';
import { VerificationStatus } from '@/generated/prisma';
import { getPlatformFeePercentage } from '@/actions/platform-settings.actions';

type UserWithOrganizer = Prisma.UserGetPayload<{
  include: { organizerProfile: true };
}>;

interface ActionResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}

function mapOrganizerProfile(
  p: UserWithOrganizer['organizerProfile']
): OrganizerWithAnalytics['organizerProfile'] {
  if (!p) return undefined;
  return {
    id: p.id,
    organizationName: p.organizationName,
    bio: p.bio ?? undefined,
    website: p.website ?? undefined,
    businessRegistrationNumber: p.businessRegistrationNumber ?? undefined,
    taxIdentificationNumber: p.taxIdentificationNumber ?? undefined,
    organizationType: p.organizationType ?? undefined,
    verificationStatus: p.verificationStatus as VerificationStatus,
    bankAccount: p.bankAccount ?? undefined,
    bankCode: p.bankCode ?? undefined,
    accountName: p.accountName ?? undefined,
  };
}

interface OrganizerWithAnalytics {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
  organizerProfile?: {
    id: string;
    organizationName: string;
    bio?: string;
    website?: string;
    businessRegistrationNumber?: string;
    taxIdentificationNumber?: string;
    organizationType?: string;
    verificationStatus: VerificationStatus;
    bankAccount?: string;
    bankCode?: string;
    accountName?: string;
  };
  analytics: {
    totalEvents: number;
    publishedEvents: number;
    pendingEvents: number;
    draftEvents: number;
    rejectedEvents: number;
    totalTicketsSold: number;
    totalRevenue: number;
    averageRating: number;
    totalRatings: number;
    eventsThisMonth: number;
    ticketsLast30Days: number;
    revenueLast30Days: number;
    lastEventDate?: Date;
  };
  revenue: {
    grossRevenue: number;
    platformFees: number;
    refunds: number;
    netEarnings: number;
    totalPayouts: number;
    pendingPayout: number;
    lastPayoutDate?: Date;
  };
  recentEvents: Array<{
    id: string;
    title: string;
    startDateTime: Date;
    publishedStatus: string;
    ticketsSold: number;
  }>;
}

// Update the getOrganizersWithAnalytics function
export async function getOrganizersWithAnalytics(): Promise<
  ActionResponse<OrganizerWithAnalytics[]>
> {
  const headersList = await headers();
  const session = await auth.api.getSession({
    headers: headersList,
  });

  if (!session || session.user.role !== 'ADMIN') {
    return {
      success: false,
      message: 'Admin access required',
    };
  }

  try {
    // Get platform fee percentage from settings
    const platformFeePercentage = await getPlatformFeePercentage();
    const platformFeeDecimal = platformFeePercentage / 100;

    // Get all organizers with their profiles
    const organizers = await prisma.user.findMany({
      where: {
        subRole: 'ORGANIZER',
      },
      include: {
        organizerProfile: true,
        eventsHosted: {
          include: {
            ticketTypes: {
              include: {
                tickets: true,
              },
            },
            orders: {
              where: {
                paymentStatus: 'COMPLETED',
              },
            },
            ratings: true,
          },
        },
        payouts: {
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Calculate analytics for each organizer
    const organizersWithAnalytics: OrganizerWithAnalytics[] = await Promise.all(
      organizers.map(async (organizer) => {
        const events = organizer.eventsHosted;
        const now = new Date();
        const thirtyDaysAgo = new Date(
          now.getTime() - 30 * 24 * 60 * 60 * 1000
        );
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        // Event statistics
        const totalEvents = events.length;
        const publishedEvents = events.filter(
          (e) => e.publishedStatus === 'PUBLISHED'
        ).length;
        const pendingEvents = events.filter(
          (e) => e.publishedStatus === 'PENDING_REVIEW'
        ).length;
        const draftEvents = events.filter(
          (e) => e.publishedStatus === 'DRAFT'
        ).length;
        const rejectedEvents = events.filter(
          (e) => e.publishedStatus === 'REJECTED'
        ).length;
        const eventsThisMonth = events.filter(
          (e) => e.createdAt >= startOfMonth
        ).length;

        // Ticket and revenue statistics
        let totalTicketsSold = 0;
        let totalRevenue = 0;
        let ticketsLast30Days = 0;
        let revenueLast30Days = 0;

        events.forEach((event) => {
          const eventTickets = event.ticketTypes.flatMap((tt) => tt.tickets);
          const eventOrders = event.orders;

          totalTicketsSold += eventTickets.length;

          eventOrders.forEach((order) => {
            totalRevenue += order.totalAmount;
            if (order.createdAt >= thirtyDaysAgo) {
              ticketsLast30Days += order.quantity;
              revenueLast30Days += order.totalAmount;
            }
          });
        });

        // Rating statistics
        const allRatings = events.flatMap((e) => e.ratings);
        const totalRatings = allRatings.length;
        const averageRating =
          totalRatings > 0
            ? allRatings.reduce((sum, r) => sum + Number(r.rating), 0) /
              totalRatings
            : 0;

        // Last event date
        const lastEventDate =
          events.length > 0
            ? new Date(
                Math.max(...events.map((e) => e.startDateTime.getTime()))
              )
            : undefined;

        // Revenue breakdown - use dynamic platform fee
        const platformFees = totalRevenue * platformFeeDecimal;
        const refunds = 0; // Would need to calculate from refunded orders
        const netEarnings = totalRevenue - platformFees - refunds;

        // Payout statistics
        const completedPayouts = organizer.payouts.filter(
          (p) => p.status === 'COMPLETED'
        );
        const totalPayouts = completedPayouts.reduce(
          (sum, p) => sum + p.netAmount,
          0
        );
        const pendingPayout = netEarnings - totalPayouts;
        const lastPayoutDate =
          completedPayouts.length > 0
            ? completedPayouts[0].createdAt
            : undefined;

        // Recent events (last 5)
        const recentEvents = events
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
          .slice(0, 5)
          .map((event) => ({
            id: event.id,
            title: event.title,
            startDateTime: event.startDateTime,
            publishedStatus: event.publishedStatus as string,
            ticketsSold: event.ticketTypes.flatMap((tt) => tt.tickets).length,
          }));

        return {
          id: organizer.id,
          name: organizer.name,
          email: organizer.email,
          createdAt: organizer.createdAt,
          organizerProfile: mapOrganizerProfile(organizer.organizerProfile),
          analytics: {
            totalEvents,
            publishedEvents,
            pendingEvents,
            draftEvents,
            rejectedEvents,
            totalTicketsSold,
            totalRevenue,
            averageRating,
            totalRatings,
            eventsThisMonth,
            ticketsLast30Days,
            revenueLast30Days,
            lastEventDate,
          },
          revenue: {
            grossRevenue: totalRevenue,
            platformFees,
            refunds,
            netEarnings,
            totalPayouts,
            pendingPayout,
            lastPayoutDate,
          },
          recentEvents,
        };
      })
    );

    return {
      success: true,
      data: organizersWithAnalytics,
    };
  } catch (error) {
    console.error('Error fetching organizers with analytics:', error);
    return {
      success: false,
      message: 'Failed to fetch organizers',
    };
  }
}

// Also update the getOrganizerById function
export async function getOrganizerById(
  organizerId: string
): Promise<ActionResponse<OrganizerWithAnalytics>> {
  const headersList = await headers();
  const session = await auth.api.getSession({
    headers: headersList,
  });

  if (!session || session.user.role !== 'ADMIN') {
    return {
      success: false,
      message: 'Admin access required',
    };
  }

  try {
    // Get platform fee percentage from settings
    const platformFeePercentage = await getPlatformFeePercentage();
    const platformFeeDecimal = platformFeePercentage / 100;

    const organizer = await prisma.user.findUnique({
      where: {
        id: organizerId,
        subRole: 'ORGANIZER',
      },
      include: {
        organizerProfile: true,
        eventsHosted: {
          include: {
            ticketTypes: {
              include: {
                tickets: true,
              },
            },
            orders: {
              where: {
                paymentStatus: 'COMPLETED',
              },
            },
            ratings: true,
          },
        },
        payouts: {
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!organizer) {
      return {
        success: false,
        message: 'Organizer not found',
      };
    }

    // Calculate analytics (same logic as above but for single organizer)
    const events = organizer.eventsHosted;
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const analytics = {
      totalEvents: events.length,
      publishedEvents: events.filter((e) => e.publishedStatus === 'PUBLISHED')
        .length,
      pendingEvents: events.filter(
        (e) => e.publishedStatus === 'PENDING_REVIEW'
      ).length,
      draftEvents: events.filter((e) => e.publishedStatus === 'DRAFT').length,
      rejectedEvents: events.filter((e) => e.publishedStatus === 'REJECTED')
        .length,
      eventsThisMonth: events.filter((e) => e.createdAt >= startOfMonth).length,
      totalTicketsSold: 0,
      totalRevenue: 0,
      ticketsLast30Days: 0,
      revenueLast30Days: 0,
      averageRating: 0,
      totalRatings: 0,
      lastEventDate: undefined as Date | undefined,
    };

    let totalRevenue = 0;
    events.forEach((event) => {
      const eventTickets = event.ticketTypes.flatMap((tt) => tt.tickets);
      const eventOrders = event.orders;

      analytics.totalTicketsSold += eventTickets.length;

      eventOrders.forEach((order) => {
        totalRevenue += order.totalAmount;
        analytics.totalRevenue += order.totalAmount;
        if (order.createdAt >= thirtyDaysAgo) {
          analytics.ticketsLast30Days += order.quantity;
          analytics.revenueLast30Days += order.totalAmount;
        }
      });
    });

    const allRatings = events.flatMap((e) => e.ratings);
    analytics.totalRatings = allRatings.length;
    analytics.averageRating =
      analytics.totalRatings > 0
        ? allRatings.reduce((sum, r) => sum + Number(r.rating), 0) /
          analytics.totalRatings
        : 0;

    analytics.lastEventDate =
      events.length > 0
        ? new Date(Math.max(...events.map((e) => e.startDateTime.getTime())))
        : undefined;

    // Use dynamic platform fee
    const platformFees = totalRevenue * platformFeeDecimal;
    const completedPayouts = organizer.payouts.filter(
      (p) => p.status === 'COMPLETED'
    );
    const totalPayouts = completedPayouts.reduce(
      (sum, p) => sum + p.netAmount,
      0
    );

    const revenue = {
      grossRevenue: totalRevenue,
      platformFees,
      refunds: 0,
      netEarnings: totalRevenue - platformFees,
      totalPayouts,
      pendingPayout: totalRevenue - platformFees - totalPayouts,
      lastPayoutDate:
        completedPayouts.length > 0 ? completedPayouts[0].createdAt : undefined,
    };

    const recentEvents = events
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 10)
      .map((event) => ({
        id: event.id,
        title: event.title,
        startDateTime: event.startDateTime,
        publishedStatus: event.publishedStatus,
        ticketsSold: event.ticketTypes.flatMap((tt) => tt.tickets).length,
      }));

    const organizerWithAnalytics: OrganizerWithAnalytics = {
      id: organizer.id,
      name: organizer.name,
      email: organizer.email,
      createdAt: organizer.createdAt,
      organizerProfile: mapOrganizerProfile(organizer.organizerProfile),
      analytics,
      revenue,
      recentEvents,
    };

    return {
      success: true,
      data: organizerWithAnalytics,
    };
  } catch (error) {
    console.error('Error fetching organizer:', error);
    return {
      success: false,
      message: 'Failed to fetch organizer',
    };
  }
}

// Verify organizer
export async function verifyOrganizer(
  organizerId: string
): Promise<ActionResponse<any>> {
  const headersList = await headers();
  const session = await auth.api.getSession({
    headers: headersList,
  });

  if (!session || session.user.role !== 'ADMIN') {
    return {
      success: false,
      message: 'Admin access required',
    };
  }

  try {
    const organizer = await prisma.user.findUnique({
      where: { id: organizerId },
      include: { organizerProfile: true },
    });

    if (!organizer || !organizer.organizerProfile) {
      return {
        success: false,
        message: 'Organizer or profile not found',
      };
    }

    if (organizer.organizerProfile.verificationStatus === 'VERIFIED') {
      return {
        success: false,
        message: 'Organizer is already verified',
      };
    }

    // Update verification status
    await prisma.organizerProfile.update({
      where: { userId: organizerId },
      data: {
        verificationStatus: 'VERIFIED',
      },
    });

    // Create notification for organizer
    await createNotification({
      type: 'SYSTEM_UPDATE',
      title: 'Account Verified',
      message:
        'Congratulations! Your organizer account has been verified. You now have full access to all platform features.',
      actionUrl: '/dashboard/profile',
      userId: organizerId,
      metadata: {
        verifiedBy: session.user.id,
        verifiedAt: new Date().toISOString(),
      },
      sendEmail: true,
    });

    revalidatePath('/admin/dashboard/organizers');
    revalidatePath(`/admin/dashboard/organizers/${organizerId}`);

    return {
      success: true,
      message: 'Organizer verified successfully',
    };
  } catch (error) {
    console.error('Error verifying organizer:', error);
    return {
      success: false,
      message: 'Failed to verify organizer',
    };
  }
}

// Reject organizer verification
export async function rejectOrganizer(
  organizerId: string,
  reason?: string
): Promise<ActionResponse<any>> {
  const headersList = await headers();
  const session = await auth.api.getSession({
    headers: headersList,
  });

  if (!session || session.user.role !== 'ADMIN') {
    return {
      success: false,
      message: 'Admin access required',
    };
  }

  try {
    const organizer = await prisma.user.findUnique({
      where: { id: organizerId },
      include: { organizerProfile: true },
    });

    if (!organizer || !organizer.organizerProfile) {
      return {
        success: false,
        message: 'Organizer or profile not found',
      };
    }

    // Update verification status
    await prisma.organizerProfile.update({
      where: { userId: organizerId },
      data: {
        verificationStatus: 'REJECTED',
      },
    });

    // Create notification for organizer
    await createNotification({
      type: 'SYSTEM_UPDATE',
      title: 'Verification Rejected',
      message: `Your organizer account verification has been rejected. ${reason ? `Reason: ${reason}` : 'Please contact support for more information.'}`,
      actionUrl: '/dashboard/profile',
      userId: organizerId,
      metadata: {
        rejectedBy: session.user.id,
        rejectedAt: new Date().toISOString(),
        rejectionReason: reason,
      },
      sendEmail: true,
    });

    revalidatePath('/admin/dashboard/organizers');
    revalidatePath(`/admin/dashboard/organizers/${organizerId}`);

    return {
      success: true,
      message: 'Organizer verification rejected',
    };
  } catch (error) {
    console.error('Error rejecting organizer:', error);
    return {
      success: false,
      message: 'Failed to reject organizer',
    };
  }
}

// Suspend organizer account
export async function suspendOrganizer(
  organizerId: string,
  reason?: string
): Promise<ActionResponse<any>> {
  const headersList = await headers();
  const session = await auth.api.getSession({
    headers: headersList,
  });

  if (!session || session.user.role !== 'ADMIN') {
    return {
      success: false,
      message: 'Admin access required',
    };
  }

  // Staff cannot suspend other admins
  if (session.user.subRole === 'STAFF') {
    const targetUser = await prisma.user.findUnique({
      where: { id: organizerId },
      select: { role: true, subRole: true },
    });

    if (targetUser?.role === 'ADMIN') {
      return {
        success: false,
        message: 'Staff cannot suspend admin users',
      };
    }
  }

  try {
    const organizer = await prisma.user.findUnique({
      where: { id: organizerId },
      include: { organizerProfile: true },
    });

    if (!organizer) {
      return {
        success: false,
        message: 'Organizer not found',
      };
    }

    // Suspend user account
    await prisma.user.update({
      where: { id: organizerId },
      data: {
        suspended: true,
        suspensionReason: reason,
        suspendedAt: new Date(),
      },
    });

    // Cancel all upcoming events
    await prisma.event.updateMany({
      where: {
        userId: organizerId,
        startDateTime: {
          gte: new Date(),
        },
        isCancelled: false,
      },
      data: {
        isCancelled: true,
      },
    });

    // Create notification for organizer
    await createNotification({
      type: 'SYSTEM_UPDATE',
      title: 'Account Suspended',
      message: `Your organizer account has been suspended. ${reason ? `Reason: ${reason}` : ''} Please contact support for assistance.`,
      actionUrl: '/dashboard',
      userId: organizerId,
      metadata: {
        suspendedBy: session.user.id,
        suspendedAt: new Date().toISOString(),
        suspensionReason: reason,
      },
      sendEmail: true,
    });

    revalidatePath('/admin/dashboard/organizers');
    revalidatePath(`/admin/dashboard/organizers/${organizerId}`);

    return {
      success: true,
      message: 'Organizer account suspended successfully',
    };
  } catch (error) {
    console.error('Error suspending organizer:', error);
    return {
      success: false,
      message: 'Failed to suspend organizer',
    };
  }
}

// Unsuspend organizer account
export async function unsuspendOrganizer(
  organizerId: string
): Promise<ActionResponse<any>> {
  const headersList = await headers();
  const session = await auth.api.getSession({
    headers: headersList,
  });

  if (!session || session.user.role !== 'ADMIN') {
    return {
      success: false,
      message: 'Admin access required',
    };
  }

  try {
    const organizer = await prisma.user.findUnique({
      where: { id: organizerId },
    });

    if (!organizer) {
      return {
        success: false,
        message: 'Organizer not found',
      };
    }

    // Unsuspend user account
    await prisma.user.update({
      where: { id: organizerId },
      data: {
        suspended: false,
        suspensionReason: null,
        suspendedAt: null,
      },
    });

    // Create notification for organizer
    await createNotification({
      type: 'SYSTEM_UPDATE',
      title: 'Account Restored',
      message:
        'Your organizer account has been restored. You can now create and manage events again.',
      actionUrl: '/dashboard',
      userId: organizerId,
      metadata: {
        restoredBy: session.user.id,
        restoredAt: new Date().toISOString(),
      },
      sendEmail: true,
    });

    revalidatePath('/admin/dashboard/organizers');
    revalidatePath(`/admin/dashboard/organizers/${organizerId}`);

    return {
      success: true,
      message: 'Organizer account restored successfully',
    };
  } catch (error) {
    console.error('Error unsuspending organizer:', error);
    return {
      success: false,
      message: 'Failed to restore organizer account',
    };
  }
}

// Send message to organizer
export async function sendMessageToOrganizer(
  organizerId: string,
  title: string,
  message: string,
  actionUrl?: string
): Promise<ActionResponse<any>> {
  const headersList = await headers();
  const session = await auth.api.getSession({
    headers: headersList,
  });

  if (!session || session.user.role !== 'ADMIN') {
    return {
      success: false,
      message: 'Admin access required',
    };
  }

  try {
    const organizer = await prisma.user.findUnique({
      where: { id: organizerId },
      select: { id: true, name: true, email: true },
    });

    if (!organizer) {
      return {
        success: false,
        message: 'Organizer not found',
      };
    }

    // Create notification
    await createNotification({
      type: 'SYSTEM_UPDATE',
      title,
      message,
      actionUrl,
      userId: organizerId,
      metadata: {
        sentBy: session.user.id,
        senderName: session.user.name,
        sentAt: new Date().toISOString(),
        isAdminMessage: true,
      },
      sendEmail: true,
    });

    return {
      success: true,
      message: 'Message sent successfully',
    };
  } catch (error) {
    console.error('Error sending message:', error);
    return {
      success: false,
      message: 'Failed to send message',
    };
  }
}

// Get organizer summary statistics
export async function getOrganizerSummaryStats(): Promise<ActionResponse<any>> {
  const headersList = await headers();
  const session = await auth.api.getSession({
    headers: headersList,
  });

  if (!session || session.user.role !== 'ADMIN') {
    return {
      success: false,
      message: 'Admin access required',
    };
  }

  try {
    const [
      totalOrganizers,
      verifiedOrganizers,
      pendingOrganizers,
      totalRevenue,
    ] = await Promise.all([
      prisma.user.count({
        where: { subRole: 'ORGANIZER' },
      }),
      prisma.organizerProfile.count({
        where: { verificationStatus: 'VERIFIED' },
      }),
      prisma.organizerProfile.count({
        where: { verificationStatus: 'PENDING' },
      }),
      prisma.order.aggregate({
        where: { paymentStatus: 'COMPLETED' },
        _sum: { totalAmount: true },
      }),
    ]);

    const rejectedOrganizers = await prisma.organizerProfile.count({
      where: { verificationStatus: 'REJECTED' },
    });

    return {
      success: true,
      data: {
        totalOrganizers,
        verifiedOrganizers,
        pendingOrganizers,
        rejectedOrganizers,
        totalRevenue: totalRevenue._sum.totalAmount || 0,
      },
    };
  } catch (error) {
    console.error('Error fetching organizer summary stats:', error);
    return {
      success: false,
      message: 'Failed to fetch summary statistics',
    };
  }
}
