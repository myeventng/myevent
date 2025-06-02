'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

interface ActionResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}

interface GetAdminReviewsParams {
  page?: number;
  limit?: number;
  search?: string;
  rating?: number;
  eventId?: string;
  sortBy?: string;
}

// Validate if user is admin
const validateAdminAccess = async () => {
  const headersList = await headers();
  const session = await auth.api.getSession({
    headers: headersList,
  });

  if (!session) {
    return {
      success: false,
      message: 'Not authenticated',
    };
  }

  // Check if user is admin with proper permissions
  if (
    session.user.role !== 'ADMIN' ||
    !['STAFF', 'SUPER_ADMIN'].includes(session.user.subRole)
  ) {
    return {
      success: false,
      message: 'Insufficient permissions. Admin access required.',
    };
  }

  return {
    success: true,
    userId: session.user.id,
    isAdmin: true,
  };
};

// Get all reviews for admin dashboard with filters and pagination
export async function getAdminReviews({
  page = 1,
  limit = 10,
  search = '',
  rating,
  eventId,
  sortBy = 'newest',
}: GetAdminReviewsParams): Promise<
  ActionResponse<{
    reviews: any[];
    totalCount: number;
    totalPages: number;
    currentPage: number;
  }>
> {
  // Validate admin access
  const adminCheck = await validateAdminAccess();
  if (!adminCheck.success) {
    return adminCheck;
  }

  try {
    const skip = (page - 1) * limit;

    // Build where clause for filtering
    const where: any = {};

    // Search filter - search in user name, email, event title, or comment
    if (search) {
      where.OR = [
        {
          user: {
            name: {
              contains: search,
              mode: 'insensitive',
            },
          },
        },
        {
          user: {
            email: {
              contains: search,
              mode: 'insensitive',
            },
          },
        },
        {
          event: {
            title: {
              contains: search,
              mode: 'insensitive',
            },
          },
        },
        {
          comment: {
            contains: search,
            mode: 'insensitive',
          },
        },
      ];
    }

    // Rating filter
    if (rating) {
      where.rating = {
        gte: rating,
        lt: rating + 1,
      };
    }

    // Event filter
    if (eventId) {
      where.eventId = eventId;
    }

    // Build order by clause
    let orderBy: any = {};
    switch (sortBy) {
      case 'newest':
        orderBy = { createdAt: 'desc' };
        break;
      case 'oldest':
        orderBy = { createdAt: 'asc' };
        break;
      case 'highest':
        orderBy = { rating: 'desc' };
        break;
      case 'lowest':
        orderBy = { rating: 'asc' };
        break;
      default:
        orderBy = { createdAt: 'desc' };
    }

    // Get reviews with pagination
    const [reviews, totalCount] = await Promise.all([
      prisma.rating.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
          event: {
            select: {
              id: true,
              title: true,
              slug: true,
            },
          },
        },
        orderBy,
        skip,
        take: limit,
      }),
      prisma.rating.count({ where }),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return {
      success: true,
      data: {
        reviews: reviews.map((r) => ({
          ...r,
          rating: Number(r.rating),
          createdAt: r.createdAt.toISOString(),
        })),
        totalCount,
        totalPages,
        currentPage: page,
      },
    };
  } catch (error) {
    console.error('Error fetching admin reviews:', error);
    return {
      success: false,
      message: 'Failed to fetch reviews',
    };
  }
}

// Get reviews statistics for admin dashboard
export async function getReviewsStats(): Promise<
  ActionResponse<{
    totalReviews: number;
    averageRating: number;
    reviewsThisMonth: number;
    ratingDistribution: { rating: number; count: number }[];
  }>
> {
  // Validate admin access
  const adminCheck = await validateAdminAccess();
  if (!adminCheck.success) {
    return adminCheck;
  }

  try {
    // Get total reviews count
    const totalReviews = await prisma.rating.count();

    // Get all ratings for average calculation
    const allRatings = await prisma.rating.findMany({
      select: { rating: true },
    });

    const averageRating =
      totalReviews > 0
        ? allRatings.reduce((sum, r) => sum + Number(r.rating), 0) /
          totalReviews
        : 0;

    // Get reviews from this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const reviewsThisMonth = await prisma.rating.count({
      where: {
        createdAt: {
          gte: startOfMonth,
        },
      },
    });

    // Get rating distribution
    const ratingDistribution = await Promise.all(
      [5, 4, 3, 2, 1].map(async (rating) => {
        const count = await prisma.rating.count({
          where: {
            rating: {
              gte: rating,
              lt: rating + 1,
            },
          },
        });
        return { rating, count };
      })
    );

    return {
      success: true,
      data: {
        totalReviews,
        averageRating: Math.round(averageRating * 10) / 10,
        reviewsThisMonth,
        ratingDistribution,
      },
    };
  } catch (error) {
    console.error('Error fetching reviews stats:', error);
    return {
      success: false,
      message: 'Failed to fetch reviews statistics',
    };
  }
}

// Bulk delete multiple reviews
export async function bulkDeleteRatings(
  reviewIds: string[]
): Promise<ActionResponse<null>> {
  // Validate admin access
  const adminCheck = await validateAdminAccess();
  if (!adminCheck.success) {
    return adminCheck;
  }

  try {
    if (!reviewIds || reviewIds.length === 0) {
      return {
        success: false,
        message: 'No reviews selected for deletion',
      };
    }

    // Delete reviews in bulk
    const result = await prisma.rating.deleteMany({
      where: {
        id: {
          in: reviewIds,
        },
      },
    });

    // Revalidate relevant pages
    revalidatePath('/admin/reviews');
    revalidatePath('/events');

    return {
      success: true,
      message: `Successfully deleted ${result.count} reviews`,
    };
  } catch (error) {
    console.error('Error bulk deleting reviews:', error);
    return {
      success: false,
      message: 'Failed to delete reviews',
    };
  }
}

// Get reviews for a specific event (admin view)
export async function getEventReviewsAdmin(
  eventId: string,
  page: number = 1,
  limit: number = 20
): Promise<
  ActionResponse<{
    reviews: any[];
    totalCount: number;
    averageRating: number;
    eventInfo: any;
  }>
> {
  // Validate admin access
  const adminCheck = await validateAdminAccess();
  if (!adminCheck.success) {
    return adminCheck;
  }

  try {
    const skip = (page - 1) * limit;

    // Get event info
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        title: true,
        slug: true,
        startDateTime: true,
        endDateTime: true,
      },
    });

    if (!event) {
      return {
        success: false,
        message: 'Event not found',
      };
    }

    // Get reviews for this event
    const [reviews, totalCount] = await Promise.all([
      prisma.rating.findMany({
        where: { eventId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.rating.count({ where: { eventId } }),
    ]);

    // Calculate average rating
    const allRatings = await prisma.rating.findMany({
      where: { eventId },
      select: { rating: true },
    });

    const averageRating =
      totalCount > 0
        ? allRatings.reduce((sum, r) => sum + Number(r.rating), 0) / totalCount
        : 0;

    return {
      success: true,
      data: {
        reviews: reviews.map((r) => ({
          ...r,
          rating: Number(r.rating),
          createdAt: r.createdAt.toISOString(),
        })),
        totalCount,
        averageRating: Math.round(averageRating * 10) / 10,
        eventInfo: event,
      },
    };
  } catch (error) {
    console.error('Error fetching event reviews for admin:', error);
    return {
      success: false,
      message: 'Failed to fetch event reviews',
    };
  }
}

// Get review analytics data
export async function getReviewAnalytics(): Promise<
  ActionResponse<{
    monthlyReviews: { month: string; count: number; averageRating: number }[];
    topRatedEvents: any[];
    recentActivity: any[];
  }>
> {
  // Validate admin access
  const adminCheck = await validateAdminAccess();
  if (!adminCheck.success) {
    return adminCheck;
  }

  try {
    // Get monthly reviews for the last 12 months
    const monthlyReviews = [];
    const now = new Date();

    for (let i = 11; i >= 0; i--) {
      const startDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const endDate = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

      const reviews = await prisma.rating.findMany({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        select: { rating: true },
      });

      const count = reviews.length;
      const averageRating =
        count > 0
          ? reviews.reduce((sum, r) => sum + Number(r.rating), 0) / count
          : 0;

      monthlyReviews.push({
        month: startDate.toLocaleDateString('en-US', {
          month: 'short',
          year: 'numeric',
        }),
        count,
        averageRating: Math.round(averageRating * 10) / 10,
      });
    }

    // Get top rated events (minimum 5 reviews)
    const topRatedEvents = await prisma.event.findMany({
      where: {
        ratings: {
          some: {},
        },
      },
      include: {
        ratings: {
          select: { rating: true },
        },
        _count: {
          select: { ratings: true },
        },
      },
      take: 10,
    });

    const topRatedEventsWithAvg = topRatedEvents
      .map((event) => ({
        id: event.id,
        title: event.title,
        slug: event.slug,
        startDateTime: event.startDateTime,
        ratingsCount: event._count.ratings,
        averageRating:
          event.ratings.length > 0
            ? event.ratings.reduce((sum, r) => sum + Number(r.rating), 0) /
              event.ratings.length
            : 0,
      }))
      .filter((event) => event.ratingsCount >= 5)
      .sort((a, b) => b.averageRating - a.averageRating)
      .slice(0, 5);

    // Get recent review activity (last 10 reviews)
    const recentActivity = await prisma.rating.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        event: {
          select: {
            id: true,
            title: true,
            slug: true,
          },
        },
      },
    });

    return {
      success: true,
      data: {
        monthlyReviews,
        topRatedEvents: topRatedEventsWithAvg,
        recentActivity: recentActivity.map((r) => ({
          ...r,
          rating: Number(r.rating),
          createdAt: r.createdAt.toISOString(),
        })),
      },
    };
  } catch (error) {
    console.error('Error fetching review analytics:', error);
    return {
      success: false,
      message: 'Failed to fetch review analytics',
    };
  }
}

// Flag/moderate a review (soft delete or mark as inappropriate)
export async function moderateReview(
  reviewId: string,
  action: 'flag' | 'unflag' | 'hide' | 'show'
): Promise<ActionResponse<any>> {
  // Validate admin access
  const adminCheck = await validateAdminAccess();
  if (!adminCheck.success) {
    return adminCheck;
  }

  try {
    // Check if review exists
    const review = await prisma.rating.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      return {
        success: false,
        message: 'Review not found',
      };
    }

    // For now, we'll implement basic moderation
    // You can extend this to add more sophisticated moderation features
    let updateData: any = {};

    switch (action) {
      case 'flag':
        // You could add a 'flagged' field to your schema
        updateData = { comment: `[FLAGGED] ${review.comment}` };
        break;
      case 'unflag':
        // Remove flag prefix if exists
        updateData = {
          comment: review.comment?.replace('[FLAGGED] ', '') || review.comment,
        };
        break;
      case 'hide':
        // You could add a 'hidden' field to your schema
        updateData = { comment: `[HIDDEN] ${review.comment}` };
        break;
      case 'show':
        // Remove hidden prefix if exists
        updateData = {
          comment: review.comment?.replace('[HIDDEN] ', '') || review.comment,
        };
        break;
    }

    const updatedReview = await prisma.rating.update({
      where: { id: reviewId },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        event: {
          select: {
            id: true,
            title: true,
            slug: true,
          },
        },
      },
    });

    revalidatePath('/admin/reviews');
    revalidatePath('/events');

    return {
      success: true,
      message: `Review ${action}ed successfully`,
      data: {
        ...updatedReview,
        rating: Number(updatedReview.rating),
      },
    };
  } catch (error) {
    console.error('Error moderating review:', error);
    return {
      success: false,
      message: 'Failed to moderate review',
    };
  }
}

// Export reviews data (CSV format)
export async function exportReviews(
  format: 'csv' | 'json' = 'csv',
  filters?: GetAdminReviewsParams
): Promise<ActionResponse<string>> {
  // Validate admin access
  const adminCheck = await validateAdminAccess();
  if (!adminCheck.success) {
    return adminCheck;
  }

  try {
    // Get all reviews based on filters (no pagination for export)
    const where: any = {};

    if (filters?.search) {
      where.OR = [
        { user: { name: { contains: filters.search, mode: 'insensitive' } } },
        { user: { email: { contains: filters.search, mode: 'insensitive' } } },
        { event: { title: { contains: filters.search, mode: 'insensitive' } } },
        { comment: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    if (filters?.rating) {
      where.rating = { gte: filters.rating, lt: filters.rating + 1 };
    }

    if (filters?.eventId) {
      where.eventId = filters.eventId;
    }

    const reviews = await prisma.rating.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        event: {
          select: {
            id: true,
            title: true,
            startDateTime: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (format === 'json') {
      return {
        success: true,
        data: JSON.stringify(
          reviews.map((r) => ({
            ...r,
            rating: Number(r.rating),
          })),
          null,
          2
        ),
      };
    }

    // Generate CSV
    const csvHeaders = [
      'Review ID',
      'User Name',
      'User Email',
      'Event Title',
      'Event Date',
      'Rating',
      'Comment',
      'Review Date',
    ];

    const csvRows = reviews.map((review) => [
      review.id,
      review.user.name,
      review.user.email,
      review.event.title,
      new Date(review.event.startDateTime).toLocaleDateString(),
      Number(review.rating),
      review.comment || '',
      new Date(review.createdAt).toLocaleDateString(),
    ]);

    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map((row) =>
        row
          .map((cell) =>
            typeof cell === 'string' && cell.includes(',')
              ? `"${cell.replace(/"/g, '""')}"`
              : cell
          )
          .join(',')
      ),
    ].join('\n');

    return {
      success: true,
      data: csvContent,
    };
  } catch (error) {
    console.error('Error exporting reviews:', error);
    return {
      success: false,
      message: 'Failed to export reviews',
    };
  }
}

// Get reviews by user ID (for admin to see user's review history)
export async function getUserReviews(
  userId: string,
  page: number = 1,
  limit: number = 10
): Promise<
  ActionResponse<{
    reviews: any[];
    totalCount: number;
    totalPages: number;
    userInfo: any;
  }>
> {
  // Validate admin access
  const adminCheck = await validateAdminAccess();
  if (!adminCheck.success) {
    return adminCheck;
  }

  try {
    const skip = (page - 1) * limit;

    // Get user info
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        createdAt: true,
        role: true,
        subRole: true,
      },
    });

    if (!user) {
      return {
        success: false,
        message: 'User not found',
      };
    }

    // Get user's reviews
    const [reviews, totalCount] = await Promise.all([
      prisma.rating.findMany({
        where: { userId },
        include: {
          event: {
            select: {
              id: true,
              title: true,
              slug: true,
              startDateTime: true,
              venue: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.rating.count({ where: { userId } }),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    // Calculate user's average rating
    const userAverageRating =
      totalCount > 0
        ? reviews.reduce((sum, r) => sum + Number(r.rating), 0) / reviews.length
        : 0;

    return {
      success: true,
      data: {
        reviews: reviews.map((r) => ({
          ...r,
          rating: Number(r.rating),
          createdAt: r.createdAt.toISOString(),
        })),
        totalCount,
        totalPages,
        userInfo: {
          ...user,
          createdAt: user.createdAt.toISOString(),
          averageRating: Math.round(userAverageRating * 10) / 10,
        },
      },
    };
  } catch (error) {
    console.error('Error fetching user reviews:', error);
    return {
      success: false,
      message: 'Failed to fetch user reviews',
    };
  }
}

// Delete a single rating (used by both admin and users)
export async function deleteRating(id: string): Promise<ActionResponse<null>> {
  // Validate admin access
  const adminCheck = await validateAdminAccess();
  if (!adminCheck.success) {
    return adminCheck;
  }

  try {
    // Check if rating exists
    const rating = await prisma.rating.findUnique({
      where: { id },
      include: {
        event: {
          select: {
            id: true,
            slug: true,
            title: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!rating) {
      return {
        success: false,
        message: 'Review not found',
      };
    }

    // Delete the rating
    await prisma.rating.delete({
      where: { id },
    });

    // Revalidate relevant pages
    revalidatePath('/admin/dashboard/reviews');
    revalidatePath(`/events/${rating.event.slug}`);
    revalidatePath(`/events/${rating.event.id}`);
    revalidatePath('/events');
    revalidatePath('/dashboard/profile'); // In case user is viewing their own reviews

    console.log(
      `Admin deleted review: ${id} by ${rating.user.name} for event ${rating.event.title}`
    );

    return {
      success: true,
      message: 'Review deleted successfully',
    };
  } catch (error) {
    console.error('Error deleting rating:', error);
    return {
      success: false,
      message: 'Failed to delete review',
    };
  }
}
