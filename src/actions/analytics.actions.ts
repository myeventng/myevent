'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { cache } from 'react';

interface ActionResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}

interface DashboardStats {
  overview: {
    totalUsers: number;
    totalEvents: number;
    totalVenues: number;
    totalTicketsSold: number;
    totalNotifications: number;
    unreadNotifications: number;
  };
  pending: {
    events: number;
    venues: number;
  };
  recentActivity: any[];
}

interface UserGrowthData {
  month: string;
  users: number;
  organizers: number;
}

interface EventAnalytics {
  totalEvents: number;
  publishedEvents: number;
  pendingEvents: number;
  rejectedEvents: number;
  cancelledEvents: number;
  monthlyEvents: { month: string; count: number; revenue: number }[];
  topCategories: { name: string; count: number }[];
  topCities: { name: string; count: number }[];
}

interface RevenueAnalytics {
  totalRevenue: number;
  platformFees: number;
  organizerEarnings: number;
  refundedAmount: number;
  monthlyRevenue: { month: string; revenue: number; fees: number }[];
  topEvents: { title: string; revenue: number; tickets: number }[];
}

interface UserAnalytics {
  totalUsers: number;
  activeUsers: number;
  organizers: number;
  userGrowth: UserGrowthData[];
  topOrganizers: { name: string; events: number; revenue: number }[];
  usersByRole: { role: string; count: number }[];
}

// Validate admin permission
const validateAdminPermission = async () => {
  const headersList = await headers();
  const session = await auth.api.getSession({
    headers: headersList,
  });

  if (!session || session.user.role !== 'ADMIN') {
    throw new Error('Unauthorized: Admin access required');
  }

  return session;
};

// Main dashboard stats (cached for 5 minutes)
export const getAdminDashboardStats = cache(
  async (): Promise<ActionResponse<DashboardStats>> => {
    try {
      await validateAdminPermission();

      // Parallel queries for better performance
      const [
        totalUsers,
        totalEvents,
        totalVenues,
        ticketsSoldData,
        totalNotifications,
        unreadNotifications,
        pendingEvents,
        pendingVenues,
        recentActivity,
      ] = await Promise.all([
        // Total users
        prisma.user.count(),

        // Total events
        prisma.event.count({
          where: { publishedStatus: 'PUBLISHED' },
        }),

        // Total venues
        prisma.venue.count(),

        // Total tickets sold
        prisma.ticket.count({
          where: { status: { in: ['UNUSED', 'USED'] } },
        }),

        // Total notifications
        prisma.notification.count(),

        // Unread notifications (admin notifications)
        prisma.notification.count({
          where: {
            isAdminNotification: true,
            status: 'UNREAD',
          },
        }),

        // Pending events
        prisma.event.count({
          where: { publishedStatus: 'PENDING_REVIEW' },
        }),

        // Pending venues (assuming there's a status field)
        prisma.venue.count(),

        // Recent activity
        getRecentPlatformActivity(),
      ]);

      const dashboardData: DashboardStats = {
        overview: {
          totalUsers,
          totalEvents,
          totalVenues,
          totalTicketsSold: ticketsSoldData,
          totalNotifications,
          unreadNotifications,
        },
        pending: {
          events: pendingEvents,
          venues: 0, // Placeholder - adjust based on your venue approval system
        },
        recentActivity: recentActivity.data || [],
      };

      return {
        success: true,
        data: dashboardData,
      };
    } catch (error) {
      console.error('Error fetching admin dashboard stats:', error);
      return {
        success: false,
        message: 'Failed to fetch dashboard statistics',
      };
    }
  }
);

// Recent platform activity
async function getRecentPlatformActivity(): Promise<ActionResponse<any[]>> {
  try {
    // Get recent notifications that represent platform activity
    const activities = await prisma.notification.findMany({
      where: {
        type: {
          in: [
            'EVENT_SUBMITTED',
            'VENUE_SUBMITTED',
            'USER_UPGRADED_TO_ORGANIZER',
            'TICKET_PURCHASED',
            'REFUND_REQUESTED',
          ],
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    const formattedActivities = activities.map((activity) => ({
      id: activity.id,
      type: activity.type,
      title: activity.title,
      userName: activity.user?.name || 'System',
      createdAt: activity.createdAt,
      metadata: activity.metadata,
    }));

    return {
      success: true,
      data: formattedActivities,
    };
  } catch (error) {
    console.error('Error fetching recent activity:', error);
    return {
      success: false,
      message: 'Failed to fetch recent activity',
    };
  }
}

// User analytics
export async function getUserAnalytics(): Promise<
  ActionResponse<UserAnalytics>
> {
  try {
    await validateAdminPermission();

    const [
      totalUsers,
      activeUsers,
      organizers,
      usersByRole,
      userGrowth,
      topOrganizers,
    ] = await Promise.all([
      // Total users
      prisma.user.count(),

      // Active users (logged in within last 30 days)
      prisma.user.count({
        where: {
          lastSeen: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          },
        },
      }),

      // Organizers
      prisma.user.count({
        where: { subRole: 'ORGANIZER' },
      }),

      // Users by role
      prisma.user.groupBy({
        by: ['role', 'subRole'],
        _count: true,
      }),

      // User growth (last 12 months)
      getUserGrowthData(),

      // Top organizers by events
      getTopOrganizers(),
    ]);

    const userRoleStats = usersByRole.map((group) => ({
      role: `${group.role}_${group.subRole}`,
      count: group._count,
    }));

    return {
      success: true,
      data: {
        totalUsers,
        activeUsers,
        organizers,
        userGrowth: userGrowth.data || [],
        topOrganizers: topOrganizers.data || [],
        usersByRole: userRoleStats,
      },
    };
  } catch (error) {
    console.error('Error fetching user analytics:', error);
    return {
      success: false,
      message: 'Failed to fetch user analytics',
    };
  }
}

// User growth data for the last 12 months
async function getUserGrowthData(): Promise<ActionResponse<UserGrowthData[]>> {
  try {
    const monthsBack = 12;
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - monthsBack);

    const userGrowth = await prisma.$queryRaw<any[]>`
      SELECT 
        DATE_TRUNC('month', "createdAt") as month,
        COUNT(*) as users,
        COUNT(CASE WHEN "subRole" = 'ORGANIZER' THEN 1 END) as organizers
      FROM "users"
      WHERE "createdAt" >= ${startDate}
      GROUP BY DATE_TRUNC('month', "createdAt")
      ORDER BY month ASC
    `;

    const formattedData = userGrowth.map((item) => ({
      month: new Date(item.month).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
      }),
      users: Number(item.users),
      organizers: Number(item.organizers),
    }));

    return {
      success: true,
      data: formattedData,
    };
  } catch (error) {
    console.error('Error fetching user growth data:', error);
    return {
      success: false,
      data: [],
    };
  }
}

// Top organizers by events and revenue
async function getTopOrganizers(): Promise<ActionResponse<any[]>> {
  try {
    const topOrganizers = await prisma.user.findMany({
      where: {
        subRole: 'ORGANIZER',
        eventsHosted: {
          some: {
            publishedStatus: 'PUBLISHED',
          },
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        _count: {
          select: {
            eventsHosted: true,
          },
        },
      },
      orderBy: {
        eventsHosted: {
          _count: 'desc',
        },
      },
      take: 10,
    });

    // Calculate revenue for each organizer
    const organizersWithRevenue = await Promise.all(
      topOrganizers.map(async (organizer) => {
        const revenue = await prisma.order.aggregate({
          where: {
            event: {
              userId: organizer.id,
            },
            paymentStatus: 'COMPLETED',
          },
          _sum: {
            totalAmount: true,
          },
        });

        return {
          name: organizer.name,
          events: organizer._count.eventsHosted,
          revenue: revenue._sum.totalAmount || 0,
        };
      })
    );

    return {
      success: true,
      data: organizersWithRevenue,
    };
  } catch (error) {
    console.error('Error fetching top organizers:', error);
    return {
      success: false,
      data: [],
    };
  }
}

// Event analytics
export async function getEventAnalytics(): Promise<
  ActionResponse<EventAnalytics>
> {
  try {
    await validateAdminPermission();

    const [
      totalEvents,
      publishedEvents,
      pendingEvents,
      rejectedEvents,
      cancelledEvents,
      monthlyEvents,
      topCategories,
      topCities,
    ] = await Promise.all([
      prisma.event.count(),
      prisma.event.count({ where: { publishedStatus: 'PUBLISHED' } }),
      prisma.event.count({ where: { publishedStatus: 'PENDING_REVIEW' } }),
      prisma.event.count({ where: { publishedStatus: 'REJECTED' } }),
      prisma.event.count({ where: { isCancelled: true } }),
      getMonthlyEventData(),
      getTopEventCategories(),
      getTopEventCities(),
    ]);

    return {
      success: true,
      data: {
        totalEvents,
        publishedEvents,
        pendingEvents,
        rejectedEvents,
        cancelledEvents,
        monthlyEvents: monthlyEvents.data || [],
        topCategories: topCategories.data || [],
        topCities: topCities.data || [],
      },
    };
  } catch (error) {
    console.error('Error fetching event analytics:', error);
    return {
      success: false,
      message: 'Failed to fetch event analytics',
    };
  }
}

// Monthly event data with revenue
async function getMonthlyEventData(): Promise<ActionResponse<any[]>> {
  try {
    const monthsBack = 12;
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - monthsBack);

    const monthlyData = await prisma.$queryRaw<any[]>`
      SELECT 
        DATE_TRUNC('month', e."createdAt") as month,
        COUNT(e.id) as count,
        COALESCE(SUM(o."totalAmount"), 0) as revenue
      FROM "Event" e
      LEFT JOIN "Order" o ON e.id = o."eventId" AND o."paymentStatus" = 'COMPLETED'
      WHERE e."createdAt" >= ${startDate}
      GROUP BY DATE_TRUNC('month', e."createdAt")
      ORDER BY month ASC
    `;

    const formattedData = monthlyData.map((item) => ({
      month: new Date(item.month).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
      }),
      count: Number(item.count),
      revenue: Number(item.revenue) || 0,
    }));

    return {
      success: true,
      data: formattedData,
    };
  } catch (error) {
    console.error('Error fetching monthly event data:', error);
    return {
      success: false,
      data: [],
    };
  }
}

// Top event categories
async function getTopEventCategories(): Promise<ActionResponse<any[]>> {
  try {
    const categories = await prisma.category.findMany({
      select: {
        name: true,
        _count: {
          select: {
            events: {
              where: {
                publishedStatus: 'PUBLISHED',
              },
            },
          },
        },
      },
      orderBy: {
        events: {
          _count: 'desc',
        },
      },
      take: 10,
    });

    const formattedData = categories.map((category) => ({
      name: category.name,
      count: category._count.events,
    }));

    return {
      success: true,
      data: formattedData,
    };
  } catch (error) {
    console.error('Error fetching top categories:', error);
    return {
      success: false,
      data: [],
    };
  }
}

// Top event cities
async function getTopEventCities(): Promise<ActionResponse<any[]>> {
  try {
    const cities = await prisma.city.findMany({
      select: {
        name: true,
        _count: {
          select: {
            events: {
              where: {
                publishedStatus: 'PUBLISHED',
              },
            },
          },
        },
      },
      orderBy: {
        events: {
          _count: 'desc',
        },
      },
      take: 10,
    });

    const formattedData = cities.map((city) => ({
      name: city.name,
      count: city._count.events,
    }));

    return {
      success: true,
      data: formattedData,
    };
  } catch (error) {
    console.error('Error fetching top cities:', error);
    return {
      success: false,
      data: [],
    };
  }
}

// Revenue analytics
export async function getRevenueAnalytics(): Promise<
  ActionResponse<RevenueAnalytics>
> {
  try {
    await validateAdminPermission();

    const [revenueData, refundedData, monthlyRevenue, topEvents] =
      await Promise.all([
        // Total revenue and platform fees
        prisma.order.aggregate({
          where: {
            paymentStatus: 'COMPLETED',
          },
          _sum: {
            totalAmount: true,
            platformFee: true,
          },
        }),

        // Refunded amount
        prisma.order.aggregate({
          where: {
            paymentStatus: 'REFUNDED',
          },
          _sum: {
            totalAmount: true,
          },
        }),

        // Monthly revenue
        getMonthlyRevenueData(),

        // Top events by revenue
        getTopEventsByRevenue(),
      ]);

    const totalRevenue = revenueData._sum.totalAmount || 0;
    const platformFees = revenueData._sum.platformFee || totalRevenue * 0.05; // Default 5%
    const organizerEarnings = totalRevenue - platformFees;
    const refundedAmount = refundedData._sum.totalAmount || 0;

    return {
      success: true,
      data: {
        totalRevenue,
        platformFees,
        organizerEarnings,
        refundedAmount,
        monthlyRevenue: monthlyRevenue.data || [],
        topEvents: topEvents.data || [],
      },
    };
  } catch (error) {
    console.error('Error fetching revenue analytics:', error);
    return {
      success: false,
      message: 'Failed to fetch revenue analytics',
    };
  }
}

// Monthly revenue data
async function getMonthlyRevenueData(): Promise<ActionResponse<any[]>> {
  try {
    const monthsBack = 12;
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - monthsBack);

    const monthlyData = await prisma.$queryRaw<any[]>`
      SELECT 
        DATE_TRUNC('month', "createdAt") as month,
        SUM("totalAmount") as revenue,
        SUM(COALESCE("platformFee", "totalAmount" * 0.05)) as fees
      FROM "Order"
      WHERE "createdAt" >= ${startDate} AND "paymentStatus" = 'COMPLETED'
      GROUP BY DATE_TRUNC('month', "createdAt")
      ORDER BY month ASC
    `;

    const formattedData = monthlyData.map((item) => ({
      month: new Date(item.month).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
      }),
      revenue: Number(item.revenue) || 0,
      fees: Number(item.fees) || 0,
    }));

    return {
      success: true,
      data: formattedData,
    };
  } catch (error) {
    console.error('Error fetching monthly revenue data:', error);
    return {
      success: false,
      data: [],
    };
  }
}

// Top events by revenue
async function getTopEventsByRevenue(): Promise<ActionResponse<any[]>> {
  try {
    const topEvents = await prisma.event.findMany({
      select: {
        id: true,
        title: true,
        orders: {
          where: {
            paymentStatus: 'COMPLETED',
          },
          select: {
            totalAmount: true,
            quantity: true,
          },
        },
      },
      take: 20,
    });

    const eventsWithRevenue = topEvents
      .map((event) => {
        const revenue = event.orders.reduce(
          (sum, order) => sum + order.totalAmount,
          0
        );
        const tickets = event.orders.reduce(
          (sum, order) => sum + order.quantity,
          0
        );

        return {
          title: event.title,
          revenue,
          tickets,
        };
      })
      .filter((event) => event.revenue > 0)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    return {
      success: true,
      data: eventsWithRevenue,
    };
  } catch (error) {
    console.error('Error fetching top events by revenue:', error);
    return {
      success: false,
      data: [],
    };
  }
}

// System health and performance metrics
export async function getSystemHealthMetrics(): Promise<ActionResponse<any>> {
  try {
    await validateAdminPermission();

    const [orderStats, eventStats, notificationStats, recentErrors] =
      await Promise.all([
        // Order processing health
        prisma.order.groupBy({
          by: ['paymentStatus'],
          _count: true,
          where: {
            createdAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
            },
          },
        }),

        // Event approval pipeline
        prisma.event.groupBy({
          by: ['publishedStatus'],
          _count: true,
        }),

        // Notification delivery rates
        prisma.notification.groupBy({
          by: ['status'],
          _count: true,
          where: {
            createdAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
            },
          },
        }),

        // Get any recent failed orders or issues
        prisma.order.count({
          where: {
            paymentStatus: 'FAILED',
            createdAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
            },
          },
        }),
      ]);

    const completedOrders =
      orderStats.find((s) => s.paymentStatus === 'COMPLETED')?._count || 0;
    const failedOrders =
      orderStats.find((s) => s.paymentStatus === 'FAILED')?._count || 0;
    const orderSuccessRate =
      completedOrders + failedOrders > 0
        ? Math.round((completedOrders / (completedOrders + failedOrders)) * 100)
        : 100;

    const readNotifications =
      notificationStats.find((s) => s.status === 'READ')?._count || 0;
    const totalNotifications = notificationStats.reduce(
      (sum, s) => sum + s._count,
      0
    );
    const notificationDeliveryRate =
      totalNotifications > 0
        ? Math.round((readNotifications / totalNotifications) * 100)
        : 100;

    return {
      success: true,
      data: {
        orderProcessing: {
          successRate: orderSuccessRate,
          completed: completedOrders,
          failed: failedOrders,
          status:
            orderSuccessRate >= 95
              ? 'healthy'
              : orderSuccessRate >= 85
                ? 'warning'
                : 'critical',
        },
        eventApproval: {
          pending:
            eventStats.find((s) => s.publishedStatus === 'PENDING_REVIEW')
              ?._count || 0,
          published:
            eventStats.find((s) => s.publishedStatus === 'PUBLISHED')?._count ||
            0,
          rejected:
            eventStats.find((s) => s.publishedStatus === 'REJECTED')?._count ||
            0,
        },
        notifications: {
          deliveryRate: notificationDeliveryRate,
          total: totalNotifications,
          status:
            notificationDeliveryRate >= 90
              ? 'healthy'
              : notificationDeliveryRate >= 75
                ? 'warning'
                : 'critical',
        },
        errors: {
          recent: recentErrors,
          status:
            recentErrors === 0
              ? 'healthy'
              : recentErrors < 5
                ? 'warning'
                : 'critical',
        },
      },
    };
  } catch (error) {
    console.error('Error fetching system health metrics:', error);
    return {
      success: false,
      message: 'Failed to fetch system health metrics',
    };
  }
}

// Platform growth overview
export async function getPlatformGrowthOverview(): Promise<
  ActionResponse<any>
> {
  try {
    await validateAdminPermission();

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);

    const [currentPeriod, previousPeriod] = await Promise.all([
      // Current 30 days
      Promise.all([
        prisma.user.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
        prisma.event.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
        prisma.order.aggregate({
          where: {
            createdAt: { gte: thirtyDaysAgo },
            paymentStatus: 'COMPLETED',
          },
          _sum: { totalAmount: true },
          _count: true,
        }),
      ]),

      // Previous 30 days
      Promise.all([
        prisma.user.count({
          where: {
            createdAt: {
              gte: sixtyDaysAgo,
              lt: thirtyDaysAgo,
            },
          },
        }),
        prisma.event.count({
          where: {
            createdAt: {
              gte: sixtyDaysAgo,
              lt: thirtyDaysAgo,
            },
          },
        }),
        prisma.order.aggregate({
          where: {
            createdAt: {
              gte: sixtyDaysAgo,
              lt: thirtyDaysAgo,
            },
            paymentStatus: 'COMPLETED',
          },
          _sum: { totalAmount: true },
          _count: true,
        }),
      ]),
    ]);

    const calculateGrowth = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 100);
    };

    return {
      success: true,
      data: {
        users: {
          current: currentPeriod[0],
          growth: calculateGrowth(currentPeriod[0], previousPeriod[0]),
        },
        events: {
          current: currentPeriod[1],
          growth: calculateGrowth(currentPeriod[1], previousPeriod[1]),
        },
        revenue: {
          current: currentPeriod[2]._sum.totalAmount || 0,
          growth: calculateGrowth(
            currentPeriod[2]._sum.totalAmount || 0,
            previousPeriod[2]._sum.totalAmount || 0
          ),
        },
        orders: {
          current: currentPeriod[2]._count,
          growth: calculateGrowth(
            currentPeriod[2]._count,
            previousPeriod[2]._count
          ),
        },
      },
    };
  } catch (error) {
    console.error('Error fetching platform growth overview:', error);
    return {
      success: false,
      message: 'Failed to fetch platform growth overview',
    };
  }
}
