'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { Decimal } from '@prisma/client/runtime/library';

interface ActionResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}

interface CreateRatingInput {
  eventId: string;
  rating: number;
  comment?: string;
}

interface UpdateRatingInput extends CreateRatingInput {
  id: string;
}

// Validate if user is authenticated
const validateAuthentication = async () => {
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

  return {
    success: true,
    userId: session.user.id,
  };
};

// Check if user has attended the event (has purchased tickets)
const checkEventAttendance = async (userId: string, eventId: string) => {
  const attendanceCheck = await prisma.order.findFirst({
    where: {
      buyerId: userId,
      eventId: eventId,
      paymentStatus: 'COMPLETED',
    },
  });

  return !!attendanceCheck;
};

// Check if event has ended
const checkEventEnded = async (eventId: string) => {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { endDateTime: true },
  });

  if (!event) {
    return false;
  }

  return new Date(event.endDateTime) < new Date();
};

// Create a new rating/review
export async function createRating(
  data: CreateRatingInput
): Promise<ActionResponse<any>> {
  // Validate authentication
  const authCheck = await validateAuthentication();
  if (!authCheck.success) {
    return {
      success: false,
      message: authCheck.message,
    };
  }

  const userId = authCheck.userId!;

  try {
    // Validate rating value
    if (data.rating < 1 || data.rating > 5) {
      return {
        success: false,
        message: 'Rating must be between 1 and 5',
      };
    }

    // Check if event exists
    const event = await prisma.event.findUnique({
      where: { id: data.eventId },
      select: {
        id: true,
        title: true,
        endDateTime: true,
        publishedStatus: true,
        isCancelled: true,
      },
    });

    if (!event) {
      return {
        success: false,
        message: 'Event not found',
      };
    }

    // Check if event is published and not cancelled
    if (event.publishedStatus !== 'PUBLISHED' || event.isCancelled) {
      return {
        success: false,
        message: 'Cannot review this event',
      };
    }

    // Check if event has ended
    const eventEnded = await checkEventEnded(data.eventId);
    if (!eventEnded) {
      return {
        success: false,
        message: 'You can only review events that have ended',
      };
    }

    // Check if user attended the event
    const hasAttended = await checkEventAttendance(userId, data.eventId);
    if (!hasAttended) {
      return {
        success: false,
        message: 'You can only review events you have attended',
      };
    }

    // Check if user has already rated this event
    const existingRating = await prisma.rating.findFirst({
      where: {
        userId: userId,
        eventId: data.eventId,
      },
    });

    if (existingRating) {
      return {
        success: false,
        message: 'You have already reviewed this event',
      };
    }

    // Create the rating
    const newRating = await prisma.rating.create({
      data: {
        userId: userId,
        eventId: data.eventId,
        rating: new Decimal(data.rating),
        comment: data.comment?.trim() || null,
      },
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

    // Revalidate relevant pages
    revalidatePath(`/events/${event.id}`);
    if (event.title) {
      revalidatePath(
        `/events/${event.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
      );
    }
    revalidatePath('/events');

    return {
      success: true,
      message: 'Review submitted successfully',
      data: newRating,
    };
  } catch (error) {
    console.error('Error creating rating:', error);
    return {
      success: false,
      message: 'Failed to submit review',
    };
  }
}

// Update an existing rating/review
export async function updateRating(
  data: UpdateRatingInput
): Promise<ActionResponse<any>> {
  // Validate authentication
  const authCheck = await validateAuthentication();
  if (!authCheck.success) {
    return {
      success: false,
      message: authCheck.message,
    };
  }

  const userId = authCheck.userId!;

  try {
    // Validate rating value
    if (data.rating < 1 || data.rating > 5) {
      return {
        success: false,
        message: 'Rating must be between 1 and 5',
      };
    }

    // Check if rating exists and belongs to user
    const existingRating = await prisma.rating.findUnique({
      where: { id: data.id },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            slug: true,
            endDateTime: true,
          },
        },
      },
    });

    if (!existingRating) {
      return {
        success: false,
        message: 'Review not found',
      };
    }

    if (existingRating.userId !== userId) {
      return {
        success: false,
        message: 'You can only update your own reviews',
      };
    }

    // Check if it's still within reasonable time to update (e.g., 30 days after event ended)
    const thirtyDaysAfterEvent = new Date(existingRating.event.endDateTime);
    thirtyDaysAfterEvent.setDate(thirtyDaysAfterEvent.getDate() + 30);

    if (new Date() > thirtyDaysAfterEvent) {
      return {
        success: false,
        message: 'Reviews can only be updated within 30 days after the event',
      };
    }

    // Update the rating
    const updatedRating = await prisma.rating.update({
      where: { id: data.id },
      data: {
        rating: new Decimal(data.rating),
        comment: data.comment?.trim() || null,
      },
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

    // Revalidate relevant pages
    revalidatePath(`/events/${existingRating.event.id}`);
    if (existingRating.event.slug) {
      revalidatePath(`/events/${existingRating.event.slug}`);
    }
    revalidatePath('/events');

    return {
      success: true,
      message: 'Review updated successfully',
      data: updatedRating,
    };
  } catch (error) {
    console.error('Error updating rating:', error);
    return {
      success: false,
      message: 'Failed to update review',
    };
  }
}

// Delete a rating/review
export async function deleteRating(id: string): Promise<ActionResponse<null>> {
  // Validate authentication
  const authCheck = await validateAuthentication();
  if (!authCheck.success) {
    return {
      success: false,
      message: authCheck.message,
    };
  }

  const userId = authCheck.userId!;

  try {
    // Check if rating exists and belongs to user
    const existingRating = await prisma.rating.findUnique({
      where: { id },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            slug: true,
          },
        },
      },
    });

    if (!existingRating) {
      return {
        success: false,
        message: 'Review not found',
      };
    }

    if (existingRating.userId !== userId) {
      return {
        success: false,
        message: 'You can only delete your own reviews',
      };
    }

    // Delete the rating
    await prisma.rating.delete({
      where: { id },
    });

    // Revalidate relevant pages
    revalidatePath(`/events/${existingRating.event.id}`);
    if (existingRating.event.slug) {
      revalidatePath(`/events/${existingRating.event.slug}`);
    }
    revalidatePath('/events');

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

// Get ratings for an event with pagination
export async function getEventRatings(
  eventId: string,
  page: number = 1,
  limit: number = 10
): Promise<
  ActionResponse<{
    ratings: any[];
    totalCount: number;
    averageRating: number;
    ratingDistribution: { rating: number; count: number }[];
    hasMore: boolean;
    currentPage: number;
  }>
> {
  try {
    const skip = (page - 1) * limit;

    // Get ratings with pagination
    const [ratings, totalCount] = await Promise.all([
      prisma.rating.findMany({
        where: { eventId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.rating.count({
        where: { eventId },
      }),
    ]);

    // Get all ratings for average calculation
    const allRatings = await prisma.rating.findMany({
      where: { eventId },
      select: { rating: true },
    });

    // Calculate average rating
    const averageRating =
      totalCount > 0
        ? allRatings.reduce((sum, r) => sum + Number(r.rating), 0) / totalCount
        : 0;

    // Calculate rating distribution
    const ratingDistribution = await Promise.all(
      [5, 4, 3, 2, 1].map(async (rating) => {
        const count = await prisma.rating.count({
          where: {
            eventId,
            rating: {
              gte: rating,
              lt: rating + 1,
            },
          },
        });
        return { rating, count };
      })
    );

    const hasMore = page * limit < totalCount;

    return {
      success: true,
      data: {
        ratings: ratings.map((r) => ({
          ...r,
          rating: Number(r.rating),
          createdAt: r.createdAt.toISOString(),
        })),
        totalCount,
        averageRating: Math.round(averageRating * 10) / 10,
        ratingDistribution,
        hasMore,
        currentPage: page,
      },
    };
  } catch (error) {
    console.error('Error fetching event ratings:', error);
    return {
      success: false,
      message: 'Failed to fetch reviews',
    };
  }
}

// Get user's rating for a specific event
export async function getUserEventRating(
  eventId: string
): Promise<ActionResponse<any>> {
  // Validate authentication
  const authCheck = await validateAuthentication();
  if (!authCheck.success) {
    return {
      success: false,
      message: authCheck.message,
    };
  }

  const userId = authCheck.userId!;

  try {
    const rating = await prisma.rating.findFirst({
      where: {
        userId,
        eventId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
    });

    return {
      success: true,
      data: rating
        ? {
            ...rating,
            rating: Number(rating.rating),
          }
        : null,
    };
  } catch (error) {
    console.error('Error fetching user rating:', error);
    return {
      success: false,
      message: 'Failed to fetch your review',
    };
  }
}

// Check if user can review an event
export async function canUserReviewEvent(eventId: string): Promise<
  ActionResponse<{
    canReview: boolean;
    reason?: string;
    hasExistingReview: boolean;
  }>
> {
  // Validate authentication
  const authCheck = await validateAuthentication();
  if (!authCheck.success) {
    return {
      success: false,
      message: authCheck.message,
    };
  }

  const userId = authCheck.userId!;

  try {
    // Check if event exists and has ended
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        endDateTime: true,
        publishedStatus: true,
        isCancelled: true,
      },
    });

    if (!event) {
      return {
        success: true,
        data: {
          canReview: false,
          reason: 'Event not found',
          hasExistingReview: false,
        },
      };
    }

    // Check if event is published and not cancelled
    if (event.publishedStatus !== 'PUBLISHED' || event.isCancelled) {
      return {
        success: true,
        data: {
          canReview: false,
          reason: 'Event is not available for review',
          hasExistingReview: false,
        },
      };
    }

    // Check if event has ended
    const eventEnded = new Date(event.endDateTime) < new Date();
    if (!eventEnded) {
      return {
        success: true,
        data: {
          canReview: false,
          reason: 'Event has not ended yet',
          hasExistingReview: false,
        },
      };
    }

    // Check if user attended the event
    const hasAttended = await checkEventAttendance(userId, eventId);
    if (!hasAttended) {
      return {
        success: true,
        data: {
          canReview: false,
          reason: 'You must attend the event to review it',
          hasExistingReview: false,
        },
      };
    }

    // Check if user has already reviewed
    const existingReview = await prisma.rating.findFirst({
      where: {
        userId,
        eventId,
      },
    });

    return {
      success: true,
      data: {
        canReview: !existingReview,
        reason: existingReview
          ? 'You have already reviewed this event'
          : undefined,
        hasExistingReview: !!existingReview,
      },
    };
  } catch (error) {
    console.error('Error checking review permission:', error);
    return {
      success: false,
      message: 'Failed to check review permission',
    };
  }
}
