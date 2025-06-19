'use server';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { APIError } from 'better-auth/api';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { UserRole, UserSubRole } from '@/generated/prisma';

interface ActionResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

// Get user by ID with all related data
export async function getUserById(
  userId: string
): Promise<ActionResponse<any>> {
  const headersList = await headers();
  const session = await auth.api.getSession({
    headers: headersList,
  });

  if (!session) {
    return { success: false, error: 'Unauthorized' };
  }

  // Only admins can view other users' detailed information
  if (session.user.role !== 'ADMIN' && session.user.id !== userId) {
    return { success: false, error: 'Forbidden' };
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        organizerProfile: true,
        eventsHosted: {
          include: {
            venue: true,
            ticketTypes: {
              include: {
                tickets: true,
              },
            },
            _count: {
              select: {
                orders: true,
                ratings: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        tickets: {
          include: {
            ticketType: {
              include: {
                event: {
                  include: {
                    venue: true,
                  },
                },
              },
            },
          },
          orderBy: { purchasedAt: 'desc' },
        },
        Notification: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        _count: {
          select: {
            eventsHosted: true,
            tickets: true,
            Notification: true,
            orders: true,
          },
        },
      },
    });

    if (!user) {
      return { success: false, error: 'User not found' };
    }

    // Calculate user statistics
    const stats = {
      totalEvents: user._count.eventsHosted,
      activeEvents: user.eventsHosted.filter(
        (event) => event.publishedStatus === 'PUBLISHED' && !event.isCancelled
      ).length,
      totalTicketsSold: user.eventsHosted.reduce(
        (total, event) =>
          total +
          event.ticketTypes.reduce(
            (eventTotal, ticketType) => eventTotal + ticketType.tickets.length,
            0
          ),
        0
      ),
      totalRevenue: user.eventsHosted.reduce(
        (total, event) =>
          total +
          event.ticketTypes.reduce(
            (eventTotal, ticketType) =>
              eventTotal + ticketType.tickets.length * ticketType.price,
            0
          ),
        0
      ),
      totalVenues: new Set(user.eventsHosted.map((event) => event.venueId))
        .size,
      averageRating: 0, // We'll calculate this separately
      totalReviews: user.eventsHosted.reduce(
        (total, event) => total + event._count.ratings,
        0
      ),
      totalTicketsPurchased: user._count.tickets,
      totalOrders: user._count.orders,
    };

    // Calculate average rating
    const allRatings = await prisma.rating.findMany({
      where: {
        event: {
          userId: user.id,
        },
      },
      select: { rating: true },
    });

    if (allRatings.length > 0) {
      stats.averageRating =
        allRatings.reduce((sum, rating) => sum + Number(rating.rating), 0) /
        allRatings.length;
    }

    return {
      success: true,
      data: {
        ...user,
        stats,
      },
    };
  } catch (error) {
    console.error('Error fetching user:', error);
    return { success: false, error: 'Failed to fetch user' };
  }
}

// Get all users with pagination and filters
export async function getUsers({
  page = 1,
  limit = 20,
  search = '',
  role = '',
  subRole = '',
  status = '', // active, banned, suspended
}: {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  subRole?: string;
  status?: string;
} = {}): Promise<ActionResponse<any>> {
  const headersList = await headers();
  const session = await auth.api.getSession({
    headers: headersList,
  });

  if (!session || session.user.role !== 'ADMIN') {
    return { success: false, error: 'Unauthorized' };
  }

  try {
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (role) {
      where.role = role;
    }

    if (subRole) {
      where.subRole = subRole;
    }

    if (status === 'banned') {
      where.banned = true;
    } else if (status === 'suspended') {
      // Since schema doesn't have suspended field, check for temporary bans with expiry
      where.banned = true;
      where.banExpires = { not: null };
    } else if (status === 'active') {
      where.banned = false;
    }

    const [users, totalCount] = await Promise.all([
      prisma.user.findMany({
        where,
        include: {
          organizerProfile: true,
          _count: {
            select: {
              eventsHosted: true,
              tickets: true,
              Notification: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return {
      success: true,
      data: {
        users,
        totalCount,
        totalPages,
        currentPage: page,
        hasMore: page < totalPages,
      },
    };
  } catch (error) {
    console.error('Error fetching users:', error);
    return { success: false, error: 'Failed to fetch users' };
  }
}

// Update user role/subRole
export async function updateUserRole({
  userId,
  role,
  subRole,
}: {
  userId: string;
  role: UserRole;
  subRole: UserSubRole;
}): Promise<ActionResponse<any>> {
  const headersList = await headers();
  const session = await auth.api.getSession({
    headers: headersList,
  });

  if (!session || session.user.role !== 'ADMIN') {
    return { success: false, error: 'Unauthorized' };
  }

  // Staff cannot promote to SUPER_ADMIN
  if (
    session.user.subRole === 'STAFF' &&
    (subRole === 'SUPER_ADMIN' || role === 'ADMIN')
  ) {
    return {
      success: false,
      error: 'Staff cannot promote users to admin or super admin',
    };
  }

  // Cannot modify your own role
  if (session.user.id === userId) {
    return { success: false, error: 'Cannot modify your own role' };
  }

  try {
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { role, subRole },
    });

    revalidatePath('/admin/dashboard/users');
    return {
      success: true,
      message: 'User role updated successfully',
      data: updatedUser,
    };
  } catch (error) {
    console.error('Error updating user role:', error);
    return { success: false, error: 'Failed to update user role' };
  }
}

// Suspend/Unsuspend user
export async function toggleUserSuspension({
  userId,
  suspend,
  reason,
}: {
  userId: string;
  suspend: boolean;
  reason?: string;
}): Promise<ActionResponse<any>> {
  const headersList = await headers();
  const session = await auth.api.getSession({
    headers: headersList,
  });

  if (!session || session.user.role !== 'ADMIN') {
    return { success: false, error: 'Unauthorized' };
  }

  if (session.user.id === userId) {
    return { success: false, error: 'Cannot suspend yourself' };
  }

  try {
    // Check target user's role
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, subRole: true },
    });

    if (!targetUser) {
      return { success: false, error: 'User not found' };
    }

    // Staff cannot suspend admins
    if (session.user.subRole === 'STAFF' && targetUser.role === 'ADMIN') {
      return {
        success: false,
        error: 'Staff cannot suspend admin users',
      };
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        suspended: suspend,
        suspensionReason: suspend ? reason : null,
        suspendedAt: suspend ? new Date() : null,
      },
    });

    revalidatePath('/admin/dashboard/users');
    return {
      success: true,
      message: suspend
        ? 'User suspended successfully'
        : 'User unsuspended successfully',
      data: updatedUser,
    };
  } catch (error) {
    console.error('Error toggling user suspension:', error);
    return { success: false, error: 'Failed to update user status' };
  }
}

// Note: Since your schema doesn't have a metadata field, this will create a separate UserNote
// You might want to create a UserNote model in your schema for better organization
export async function addUserNote({
  userId,
  note,
}: {
  userId: string;
  note: string;
}): Promise<ActionResponse<any>> {
  const headersList = await headers();
  const session = await auth.api.getSession({
    headers: headersList,
  });

  if (!session || session.user.role !== 'ADMIN') {
    return { success: false, error: 'Unauthorized' };
  }

  try {
    // Since schema doesn't have metadata field, we'll add a comment or description
    // You might want to create a UserNote model instead
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });

    if (!user) {
      return { success: false, error: 'User not found' };
    }

    // For now, we'll just return success without storing the note
    // You should create a UserNote model or add a notes field to User model
    console.log(
      `Admin note for user ${userId}: ${note} (by ${session.user.id})`
    );

    revalidatePath('/admin/dashboard/users');
    return {
      success: true,
      message:
        'Note logged successfully (consider adding UserNote model to your schema)',
      data: { userId, note, createdBy: session.user.id },
    };
  } catch (error) {
    console.error('Error adding user note:', error);
    return { success: false, error: 'Failed to add note' };
  }
}

// Get user activity log
export async function getUserActivity(
  userId: string,
  limit: number = 20
): Promise<ActionResponse<any[]>> {
  const headersList = await headers();
  const session = await auth.api.getSession({
    headers: headersList,
  });

  if (!session || session.user.role !== 'ADMIN') {
    return { success: false, error: 'Unauthorized' };
  }

  try {
    // This would be more comprehensive with a proper audit log table
    // For now, we'll gather activity from various sources
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        createdAt: true,
        emailVerified: true,
        lastSeen: true,
      },
    });

    if (!user) {
      return { success: false, error: 'User not found' };
    }

    const activities = [
      {
        type: 'account_created',
        description: 'Account created',
        timestamp: user.createdAt,
        metadata: {},
      },
    ];

    if (user.emailVerified) {
      activities.push({
        type: 'email_verified',
        description: 'Email address verified',
        timestamp: user.createdAt, // Approximate
        metadata: {},
      });
    }

    // Get recent events created
    const recentEvents = await prisma.event.findMany({
      where: { userId },
      select: {
        id: true,
        title: true,
        createdAt: true,
        publishedStatus: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    recentEvents.forEach((event) => {
      activities.push({
        type: 'event_created',
        description: `Created event "${event.title}"`,
        timestamp: event.createdAt,
        metadata: { eventId: event.id, status: event.publishedStatus },
      });
    });

    // Sort by timestamp descending
    activities.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return {
      success: true,
      data: activities.slice(0, limit),
    };
  } catch (error) {
    console.error('Error fetching user activity:', error);
    return { success: false, error: 'Failed to fetch user activity' };
  }
}

// Send notification to user
export async function sendUserNotification({
  userId,
  title,
  message,
  actionUrl,
}: {
  userId: string;
  title: string;
  message: string;
  actionUrl?: string;
}): Promise<ActionResponse<any>> {
  const headersList = await headers();
  const session = await auth.api.getSession({
    headers: headersList,
  });

  if (!session || session.user.role !== 'ADMIN') {
    return { success: false, error: 'Unauthorized' };
  }

  try {
    const notification = await prisma.notification.create({
      data: {
        type: 'SYSTEM_UPDATE',
        title,
        message,
        actionUrl,
        userId,
        metadata: {
          sentBy: session.user.id,
          sentAt: new Date().toISOString(),
        },
      },
    });

    return {
      success: true,
      message: 'Notification sent successfully',
      data: notification,
    };
  } catch (error) {
    console.error('Error sending notification:', error);
    return { success: false, error: 'Failed to send notification' };
  }
}

// Get user statistics for admin dashboard
export async function getUserStats(): Promise<ActionResponse<any>> {
  const headersList = await headers();
  const session = await auth.api.getSession({
    headers: headersList,
  });

  if (!session || session.user.role !== 'ADMIN') {
    return { success: false, error: 'Unauthorized' };
  }

  try {
    const [
      totalUsers,
      newUsersThisMonth,
      activeUsers,
      organizers,
      bannedUsers,
      suspendedUsers,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({
        where: {
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
      }),
      prisma.user.count({
        where: {
          lastSeen: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
          },
        },
      }),
      prisma.user.count({
        where: {
          subRole: 'ORGANIZER',
        },
      }),
      prisma.user.count({
        where: {
          banned: true,
        },
      }),
      prisma.user.count({
        where: {
          suspended: true,
        },
      }),
    ]);

    return {
      success: true,
      data: {
        totalUsers,
        newUsersThisMonth,
        activeUsers,
        organizers,
        bannedUsers,
        suspendedUsers,
        regularUsers: totalUsers - organizers,
      },
    };
  } catch (error) {
    console.error('Error fetching user stats:', error);
    return { success: false, error: 'Failed to fetch user statistics' };
  }
}
