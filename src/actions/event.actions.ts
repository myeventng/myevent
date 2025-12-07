'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import {
  AgeRestriction,
  DressCode,
  PublishedStatus,
  EventType,
  VotingType,
} from '@/generated/prisma';
import { createEventNotification } from '@/actions/notification.actions';
import crypto from 'crypto';

interface PermissionValidationResult {
  success: boolean;
  message?: string;
  userData?: {
    userId: string;
    isAdmin: boolean;
    canCreateEvents: boolean;
  };
}

interface EventInput {
  title: string;
  description?: string;
  location?: string;
  coverImageUrl?: string;
  startDateTime: Date;
  endDateTime: Date;
  isFree: boolean;
  url?: string;
  lateEntry?: Date;
  idRequired?: boolean;
  eventType: EventType;
  attendeeLimit?: number;
  embeddedVideoUrl?: string;
  dressCode?: DressCode;
  age?: AgeRestriction;
  imageUrls: string[];
  tagIds: string[];
  categoryId?: string;
  venueId: string;
  cityId?: string;
  publishedStatus?: PublishedStatus;
}

interface UpdateEventInput extends EventInput {
  id: string;
}

interface ActionResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}

// Generate a unique slug from title
const generateSlug = async (
  title: string,
  eventId?: string
): Promise<string> => {
  // Create base slug from title
  const baseSlug = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters except spaces and hyphens
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens

  // Ensure we have a valid slug
  if (!baseSlug) {
    return `event-${Date.now()}`;
  }

  let slug = baseSlug;
  let counter = 0;

  while (true) {
    // Check if slug exists, excluding current event if updating
    const whereCondition: any = { slug };
    if (eventId) {
      whereCondition.NOT = { id: eventId };
    }

    const existingEvent = await prisma.event.findFirst({
      where: whereCondition,
    });

    if (!existingEvent) {
      break;
    }

    counter++;
    slug = `${baseSlug}-${counter}`;
  }

  return slug;
};

// Updated permission validation - removed approval status check
const validateUserPermission =
  async (): Promise<PermissionValidationResult> => {
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

    const { role, subRole } = session.user;

    // Admin with STAFF or SUPER_ADMIN subRole can always manage events
    if (role === 'ADMIN' && ['STAFF', 'SUPER_ADMIN'].includes(subRole)) {
      return {
        success: true,
        userData: {
          userId: session.user.id,
          isAdmin: true,
          canCreateEvents: true,
        },
      };
    }

    // Check if user is an organizer
    if (subRole === 'ORGANIZER') {
      // Check if organizer profile exists
      const organizerProfile = await prisma.organizerProfile.findUnique({
        where: { userId: session.user.id },
      });

      if (!organizerProfile) {
        return {
          success: false,
          message:
            'You must complete your organizer profile before creating events',
        };
      }

      return {
        success: true,
        userData: {
          userId: session.user.id,
          isAdmin: false,
          canCreateEvents: true,
        },
      };
    }

    return {
      success: false,
      message: 'You do not have permission to perform this action',
    };
  };

// CORRECTED: Create event - only handles base event creation
// Type-specific setup (voting contests, invite-only) is handled by specialized actions
export async function createEvent(data: any): Promise<ActionResponse<any>> {
  const permissionCheck = await validateUserPermission();
  if (!permissionCheck.success) {
    return {
      success: false,
      message: permissionCheck.message,
    };
  }

  const { userId, isAdmin } = permissionCheck.userData!;

  try {
    // Validate venue exists
    const venue = await prisma.venue.findUnique({
      where: { id: data.venueId },
    });

    if (!venue) {
      return {
        success: false,
        message: 'Venue not found',
      };
    }

    // Validate category if provided
    if (data.categoryId) {
      const category = await prisma.category.findUnique({
        where: { id: data.categoryId },
      });

      if (!category) {
        return {
          success: false,
          message: 'Category not found',
        };
      }
    }

    // Generate unique slug
    const slug = await generateSlug(data.title);

    if (!slug) {
      return {
        success: false,
        message: 'Failed to generate unique slug for event',
      };
    }

    // Determine publish status
    let publishedStatus: PublishedStatus;
    if (isAdmin) {
      publishedStatus = data.publishedStatus || 'PUBLISHED';
    } else {
      publishedStatus =
        data.publishedStatus === 'DRAFT' ? 'DRAFT' : 'PENDING_REVIEW';
    }

    // Create base event only - no type-specific nested data
    const newEvent = await prisma.event.create({
      data: {
        title: data.title,
        slug,
        description: data.description,
        location: data.location,
        coverImageUrl: data.coverImageUrl,
        startDateTime: data.startDateTime,
        endDateTime: data.endDateTime,
        isFree:
          data.eventType === EventType.VOTING_CONTEST ||
          data.eventType === EventType.INVITE
            ? true
            : data.isFree,
        url: data.url,
        lateEntry: data.lateEntry,
        eventType: data.eventType || EventType.STANDARD,
        idRequired: data.idRequired,
        attendeeLimit: data.attendeeLimit,
        embeddedVideoUrl: data.embeddedVideoUrl,
        dressCode: data.dressCode,
        age: data.age,
        imageUrls: data.imageUrls,
        tags: {
          connect: data.tagIds.map((id: string) => ({ id })),
        },
        category: data.categoryId
          ? { connect: { id: data.categoryId } }
          : undefined,
        venue: { connect: { id: data.venueId } },
        City: data.cityId ? { connect: { id: data.cityId } } : undefined,
        user: { connect: { id: userId } },
        publishedStatus,
      },
      include: {
        tags: true,
        category: true,
        venue: {
          include: {
            city: true,
          },
        },
      },
    });

    // NOTE: Type-specific setup is now handled by specialized actions:
    // - createVotingContest() for voting contests
    // - createInviteOnlyEvent() for invite-only events
    // These are called from the form AFTER this function returns

    // Create notification if pending review
    if (publishedStatus === 'PENDING_REVIEW') {
      await createEventNotification(newEvent.id, 'EVENT_SUBMITTED');
    }

    revalidatePath('/admin/events');
    revalidatePath('/dashboard/events');
    revalidatePath('/events');

    const message =
      publishedStatus === 'PUBLISHED'
        ? 'Event created and published successfully'
        : publishedStatus === 'PENDING_REVIEW'
          ? 'Event created and submitted for review'
          : 'Event saved as draft';

    return {
      success: true,
      message,
      data: newEvent,
    };
  } catch (error) {
    console.error('Error creating event:', error);
    return {
      success: false,
      message: 'Failed to create event',
    };
  }
}

// CORRECTED: Update event - only handles base event updates
// Type-specific updates (voting contests, invite-only) are handled by specialized actions
export async function updateEvent(data: any): Promise<ActionResponse<any>> {
  const permissionCheck = await validateUserPermission();
  if (!permissionCheck.success) {
    return {
      success: false,
      message: permissionCheck.message,
    };
  }

  const { userId, isAdmin } = permissionCheck.userData!;

  try {
    const existingEvent = await prisma.event.findUnique({
      where: { id: data.id },
      include: {
        tags: true,
        votingContest: true,
        inviteOnlyEvent: true,
      },
    });

    if (!existingEvent) {
      return {
        success: false,
        message: 'Event not found',
      };
    }

    if (!isAdmin && existingEvent.userId !== userId) {
      return {
        success: false,
        message: 'You can only update events that you created',
      };
    }

    // Generate new slug if needed
    let slug = existingEvent.slug;
    if (data.title !== existingEvent.title || !existingEvent.slug) {
      slug = await generateSlug(data.title, data.id);
    }

    // Handle tag updates
    const existingTagIds = existingEvent.tags.map((tag: any) => tag.id);
    const disconnectTags = existingTagIds.filter(
      (id: any) => !data.tagIds.includes(id)
    );
    const connectTags = data.tagIds.filter(
      (id: any) => !existingTagIds.includes(id)
    );

    // Determine publish status
    let publishedStatus: PublishedStatus;
    if (isAdmin) {
      publishedStatus = data.publishedStatus || 'PUBLISHED';
    } else {
      publishedStatus =
        data.publishedStatus === 'DRAFT' ? 'DRAFT' : 'PENDING_REVIEW';
    }

    // Update base event only - no type-specific nested data
    const updatedEvent = await prisma.event.update({
      where: { id: data.id },
      data: {
        title: data.title,
        slug,
        description: data.description,
        location: data.location,
        coverImageUrl: data.coverImageUrl,
        startDateTime: data.startDateTime,
        endDateTime: data.endDateTime,
        isFree:
          data.eventType === EventType.VOTING_CONTEST ||
          data.eventType === EventType.INVITE
            ? true
            : data.isFree,
        url: data.url,
        lateEntry: data.lateEntry,
        idRequired: data.idRequired,
        attendeeLimit: data.attendeeLimit,
        embeddedVideoUrl: data.embeddedVideoUrl,
        dressCode: data.dressCode,
        age: data.age,
        imageUrls: data.imageUrls,
        tags: {
          disconnect: disconnectTags.map((id: any) => ({ id })),
          connect: connectTags.map((id: any) => ({ id })),
        },
        category: data.categoryId
          ? { connect: { id: data.categoryId } }
          : { disconnect: true },
        venue: { connect: { id: data.venueId } },
        City: data.cityId
          ? { connect: { id: data.cityId } }
          : { disconnect: true },
        publishedStatus,
      },
      include: {
        tags: true,
        category: true,
        venue: {
          include: {
            city: true,
          },
        },
      },
    });

    // NOTE: Type-specific updates are now handled by specialized actions:
    // - updateVotingContest() for voting contests
    // - updateInviteOnlyEvent() for invite-only events
    // These are called from the form AFTER this function returns

    // Create notifications based on status change
    if (
      isAdmin &&
      publishedStatus === 'PUBLISHED' &&
      existingEvent.publishedStatus !== 'PUBLISHED'
    ) {
      await createEventNotification(
        data.id,
        'EVENT_APPROVED',
        existingEvent.userId ?? undefined
      );
    } else if (
      !isAdmin &&
      publishedStatus === 'PENDING_REVIEW' &&
      existingEvent.publishedStatus !== 'PENDING_REVIEW'
    ) {
      await createEventNotification(data.id, 'EVENT_SUBMITTED');
    }

    revalidatePath('/admin/events');
    revalidatePath('/dashboard/events');
    revalidatePath(`/events/${updatedEvent.slug}`);
    revalidatePath(`/events/${data.id}`);
    revalidatePath('/events');

    const message =
      publishedStatus === 'PUBLISHED'
        ? 'Event updated and published successfully'
        : publishedStatus === 'PENDING_REVIEW'
          ? 'Event updated and submitted for review'
          : 'Event updated and saved as draft';

    return {
      success: true,
      message,
      data: updatedEvent,
    };
  } catch (error) {
    console.error('Error updating event:', error);
    return {
      success: false,
      message: 'Failed to update event',
    };
  }
}

// Admin function to update event status (approve/reject)
export async function updateEventStatus(
  id: string,
  status: 'PUBLISHED' | 'REJECTED',
  rejectionReason?: string
): Promise<ActionResponse<any>> {
  // Validate user permission - only admins can do this
  const headersList = await headers();
  const session = await auth.api.getSession({
    headers: headersList,
  });

  if (!session || session.user.role !== 'ADMIN') {
    return {
      success: false,
      message: 'Only administrators can approve or reject events',
    };
  }

  try {
    const event = await prisma.event.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!event) {
      return {
        success: false,
        message: 'Event not found',
      };
    }

    const updatedEvent = await prisma.event.update({
      where: { id },
      data: {
        publishedStatus: status,
      },
    });

    // Create notification for the event organizer
    const notificationType =
      status === 'PUBLISHED' ? 'EVENT_APPROVED' : 'EVENT_REJECTED';
    await createEventNotification(
      id,
      notificationType,
      event.userId ?? undefined
    );

    revalidatePath('/admin/dashboard/events');
    revalidatePath('/dashboard/events');
    revalidatePath(`/events/${event.slug}`);
    revalidatePath('/events');

    const message =
      status === 'PUBLISHED'
        ? 'Event approved and published successfully'
        : 'Event rejected successfully';

    return {
      success: true,
      message,
      data: updatedEvent,
    };
  } catch (error) {
    console.error('Error updating event status:', error);
    return {
      success: false,
      message: 'Failed to update event status',
    };
  }
}

export async function getFeaturedEvents(): Promise<ActionResponse<any[]>> {
  try {
    const events = await prisma.event.findMany({
      where: {
        featured: true,
        publishedStatus: 'PUBLISHED',
        isCancelled: false,
        endDateTime: {
          gte: new Date(),
        },
      },
      include: {
        tags: true,
        category: true,
        venue: {
          include: {
            city: true,
          },
        },
        ticketTypes: {
          where: {
            quantity: {
              gt: 0,
            },
          },
        },
      },
      orderBy: { startDateTime: 'asc' },
      take: 6,
    });

    return {
      success: true,
      data: events,
    };
  } catch (error) {
    console.error('Error fetching featured events:', error);
    return {
      success: false,
      message: 'Failed to fetch featured events',
    };
  }
}

// Utility function to fix events with null slugs
export async function fixEventsWithNullSlugs(): Promise<
  ActionResponse<number>
> {
  try {
    // Find events with null or empty slugs
    const eventsWithoutSlugs = await prisma.event.findMany({
      where: {
        OR: [{ slug: null }, { slug: '' }],
      },
      select: {
        id: true,
        title: true,
        slug: true,
      },
    });

    let fixedCount = 0;

    // Fix each event
    for (const event of eventsWithoutSlugs) {
      try {
        const newSlug = await generateSlug(event.title, event.id);

        await prisma.event.update({
          where: { id: event.id },
          data: { slug: newSlug },
        });

        fixedCount++;
      } catch (error) {
        console.error(`Failed to fix slug for event ${event.id}:`, error);
      }
    }

    // Revalidate paths
    revalidatePath('/admin/events');
    revalidatePath('/dashboard/events');
    revalidatePath('/events');

    return {
      success: true,
      message: `Fixed ${fixedCount} events with missing slugs`,
      data: fixedCount,
    };
  } catch (error) {
    console.error('Error fixing events with null slugs:', error);
    return {
      success: false,
      message: 'Failed to fix events with null slugs',
    };
  }
}

export async function toggleEventFeatured(
  id: string
): Promise<ActionResponse<any>> {
  // Only admins can feature events
  const headersList = await headers();
  const session = await auth.api.getSession({
    headers: headersList,
  });

  if (!session || session.user.role !== 'ADMIN') {
    return {
      success: false,
      message: 'Only administrators can feature events',
    };
  }

  try {
    const event = await prisma.event.findUnique({
      where: { id },
    });

    if (!event) {
      return {
        success: false,
        message: 'Event not found',
      };
    }

    const updatedEvent = await prisma.event.update({
      where: { id },
      data: {
        featured: !event.featured,
      },
    });

    revalidatePath('/admin/events');
    revalidatePath('/events');

    return {
      success: true,
      message: updatedEvent.featured
        ? 'Event featured successfully'
        : 'Event unfeatured successfully',
      data: updatedEvent,
    };
  } catch (error) {
    console.error('Error toggling event featured status:', error);
    return {
      success: false,
      message: 'Failed to update event featured status',
    };
  }
}

export async function getEvents(publishedOnly: boolean = true) {
  try {
    // ✅ FIXED: Add 'as const' to make it a literal type
    const whereClause = publishedOnly
      ? { publishedStatus: 'PUBLISHED' as const }
      : {};

    const events = await prisma.event.findMany({
      where: whereClause,
      include: {
        category: true,
        venue: {
          include: {
            city: true,
          },
        },
        tags: true,
        user: {
          include: {
            organizerProfile: true,
          },
        },
        ticketTypes: {
          include: {
            tickets: true,
          },
        },
        votingContest: {
          include: {
            contestants: {
              include: {
                votes: true,
              },
            },
            _count: {
              select: {
                votes: true,
              },
            },
          },
        },
        inviteOnlyEvent: {
          include: {
            invitations: {
              select: {
                id: true,
                status: true,
                rsvpResponse: true,
                plusOnesConfirmed: true,
                plusOnesAllowed: true,
                createdAt: true,
              },
            },
            _count: {
              select: {
                invitations: true,
              },
            },
          },
        },
      },
      orderBy: {
        startDateTime: 'asc',
      },
    });

    return {
      success: true,
      data: events,
    };
  } catch (error) {
    console.error('Error fetching events:', error);
    return {
      success: false,
      message: 'Failed to fetch events',
    };
  }
}

// Enhanced events fetching with pagination, search, and filtering
export async function getEventsWithFilters({
  page = 1,
  limit = 12,
  search = '',
  categoryId = '',
  cityId = '',
  tagIds = [],
  dateRange = '',
  priceRange = '',
  sortBy = 'startDateTime',
  sortOrder = 'asc',
  featured = false,
  // New voting contest filters
  eventTypes = [],
  votingStatus = '',
  votingType = '',
}: {
  page?: number;
  limit?: number;
  search?: string;
  categoryId?: string;
  cityId?: string;
  tagIds?: string[];
  dateRange?: string;
  priceRange?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  featured?: boolean;
  eventTypes?: string[];
  votingStatus?: string;
  votingType?: string;
}): Promise<
  ActionResponse<{
    events: any[];
    totalCount: number;
    hasMore: boolean;
    currentPage: number;
    totalPages: number;
  }>
> {
  try {
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {
      publishedStatus: 'PUBLISHED',
      isCancelled: false,
      endDateTime: {
        gte: new Date(), // Only future or ongoing events
      },
    };

    // Add featured filter
    if (featured) {
      where.featured = true;
    }

    // Add event type filter
    if (eventTypes.length > 0) {
      where.eventType = {
        in: eventTypes,
      };
    }

    // Add search filter
    if (search) {
      where.OR = [
        {
          title: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          description: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          location: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          venue: {
            name: {
              contains: search,
              mode: 'insensitive',
            },
          },
        },
        {
          venue: {
            address: {
              contains: search,
              mode: 'insensitive',
            },
          },
        },
        // Search in contestant names for voting contests
        {
          votingContest: {
            contestants: {
              some: {
                name: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
            },
          },
        },
      ];
    }

    // Add category filter
    if (categoryId) {
      where.categoryId = categoryId;
    }

    // Add city filter
    if (cityId) {
      where.cityId = cityId;
    }

    // Add tags filter
    if (tagIds.length > 0) {
      where.tags = {
        some: {
          id: {
            in: tagIds,
          },
        },
      };
    }

    // Add voting contest specific filters
    if (eventTypes.includes('VOTING_CONTEST') || votingStatus || votingType) {
      // If filtering by voting status
      if (votingStatus) {
        const now = new Date();
        switch (votingStatus) {
          case 'upcoming':
            where.votingContest = {
              ...where.votingContest,
              votingStartDate: {
                gt: now,
              },
            };
            break;
          case 'active':
            where.votingContest = {
              ...where.votingContest,
              OR: [
                {
                  AND: [
                    { votingStartDate: { lte: now } },
                    { votingEndDate: { gte: now } },
                  ],
                },
                {
                  AND: [
                    { votingStartDate: null },
                    { votingEndDate: { gte: now } },
                  ],
                },
                {
                  AND: [
                    { votingStartDate: { lte: now } },
                    { votingEndDate: null },
                  ],
                },
                {
                  AND: [{ votingStartDate: null }, { votingEndDate: null }],
                },
              ],
            };
            break;
          case 'ended':
            where.votingContest = {
              ...where.votingContest,
              votingEndDate: {
                lt: now,
              },
            };
            break;
        }
      }

      // If filtering by voting type
      if (votingType) {
        where.votingContest = {
          ...where.votingContest,
          votingType: votingType,
        };
      }

      // Ensure we only get events that have a voting contest when filtering by voting-specific criteria
      if (votingStatus || votingType) {
        where.votingContest = {
          ...where.votingContest,
          NOT: null,
        };
      }
    }

    // Add date range filter
    if (dateRange) {
      const now = new Date();
      switch (dateRange) {
        case 'today':
          const startOfToday = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate()
          );
          const endOfToday = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate() + 1
          );
          where.startDateTime = {
            gte: startOfToday,
            lt: endOfToday,
          };
          break;
        case 'tomorrow':
          const startOfTomorrow = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate() + 1
          );
          const endOfTomorrow = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate() + 2
          );
          where.startDateTime = {
            gte: startOfTomorrow,
            lt: endOfTomorrow,
          };
          break;
        case 'this_week':
          const startOfWeek = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate() - now.getDay()
          );
          const endOfWeek = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate() - now.getDay() + 7
          );
          where.startDateTime = {
            gte: startOfWeek,
            lt: endOfWeek,
          };
          break;
        case 'this_month':
          const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
          const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
          where.startDateTime = {
            gte: startOfMonth,
            lt: endOfMonth,
          };
          break;
        case 'next_month':
          const startOfNextMonth = new Date(
            now.getFullYear(),
            now.getMonth() + 1,
            1
          );
          const endOfNextMonth = new Date(
            now.getFullYear(),
            now.getMonth() + 2,
            1
          );
          where.startDateTime = {
            gte: startOfNextMonth,
            lt: endOfNextMonth,
          };
          break;
      }
    }

    // Add price range filter (only for non-voting contest events or when multiple event types are selected)
    if (
      priceRange &&
      (!eventTypes.includes('VOTING_CONTEST') || eventTypes.length > 1)
    ) {
      switch (priceRange) {
        case 'free':
          where.isFree = true;
          break;
        case 'under_5000':
          where.AND = [
            { isFree: false },
            {
              ticketTypes: {
                some: {
                  price: {
                    lt: 5000,
                  },
                },
              },
            },
          ];
          break;
        case '5000_20000':
          where.AND = [
            { isFree: false },
            {
              ticketTypes: {
                some: {
                  price: {
                    gte: 5000,
                    lte: 20000,
                  },
                },
              },
            },
          ];
          break;
        case 'over_20000':
          where.AND = [
            { isFree: false },
            {
              ticketTypes: {
                some: {
                  price: {
                    gt: 20000,
                  },
                },
              },
            },
          ];
          break;
      }
    }

    // Build order by clause
    let orderBy: any = {};
    switch (sortBy) {
      case 'startDateTime':
        orderBy = { startDateTime: sortOrder };
        break;
      case 'title':
        orderBy = { title: sortOrder };
        break;
      case 'createdAt':
        orderBy = { createdAt: sortOrder };
        break;
      case 'featured':
        orderBy = [{ featured: 'desc' }, { startDateTime: 'asc' }];
        break;
      case 'votes':
        // Sort by vote count for voting contests
        orderBy = [
          {
            votingContest: {
              _count: {
                votes: sortOrder,
              },
            },
          },
          { startDateTime: 'asc' },
        ];
        break;
      default:
        orderBy = { startDateTime: sortOrder };
    }

    // Get total count for pagination
    const totalCount = await prisma.event.count({ where });

    // Fetch events with enhanced includes for voting contests
    const events = await prisma.event.findMany({
      where,
      include: {
        tags: true,
        category: true,
        venue: {
          include: {
            city: true,
          },
        },
        ticketTypes: {
          where: {
            quantity: {
              gt: 0,
            },
          },
          orderBy: {
            price: 'asc',
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            organizerProfile: {
              select: {
                organizationName: true,
              },
            },
          },
        },
        // Include voting contest data
        votingContest: {
          include: {
            contestants: {
              include: {
                _count: {
                  select: {
                    votes: true,
                  },
                },
              },
              where: {
                status: 'ACTIVE',
              },
              orderBy: [
                {
                  votes: {
                    _count: 'desc',
                  },
                },
                { contestNumber: 'asc' },
              ],
              take: 3, // Only get top 3 contestants for card display
            },
            _count: {
              select: {
                votes: true,
                contestants: true,
              },
            },
          },
        },
        _count: {
          select: {
            orders: true,
            ratings: true,
          },
        },
      },
      orderBy,
      skip,
      take: limit,
    });

    const totalPages = Math.ceil(totalCount / limit);
    const hasMore = page < totalPages;

    // Calculate average rating for each event
    const eventsWithRating = await Promise.all(
      events.map(async (event) => {
        const ratings = await prisma.rating.findMany({
          where: { eventId: event.id },
          select: { rating: true },
        });

        const averageRating =
          ratings.length > 0
            ? ratings.reduce((sum, r) => sum + Number(r.rating), 0) /
              ratings.length
            : 0;

        return {
          ...event,
          averageRating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
          ratingsCount: ratings.length,
        };
      })
    );

    return {
      success: true,
      data: {
        events: eventsWithRating,
        totalCount,
        hasMore,
        currentPage: page,
        totalPages,
      },
    };
  } catch (error) {
    console.error('Error fetching events with filters:', error);
    return {
      success: false,
      message: 'Failed to fetch events',
    };
  }
}

// Get filter options for the events page
export async function getEventFilterOptions(): Promise<
  ActionResponse<{
    categories: any[];
    cities: any[];
    tags: any[];
  }>
> {
  try {
    const [categories, cities, tags] = await Promise.all([
      prisma.category.findMany({
        orderBy: { name: 'asc' },
      }),
      prisma.city.findMany({
        where: {
          events: {
            some: {
              publishedStatus: 'PUBLISHED',
              isCancelled: false,
              endDateTime: {
                gte: new Date(),
              },
            },
          },
        },
        orderBy: { name: 'asc' },
      }),
      prisma.tag.findMany({
        where: {
          events: {
            some: {
              publishedStatus: 'PUBLISHED',
              isCancelled: false,
              endDateTime: {
                gte: new Date(),
              },
            },
          },
        },
        orderBy: { name: 'asc' },
      }),
    ]);

    return {
      success: true,
      data: {
        categories,
        cities,
        tags,
      },
    };
  } catch (error) {
    console.error('Error fetching filter options:', error);
    return {
      success: false,
      message: 'Failed to fetch filter options',
    };
  }
}

export async function getUserEvents() {
  try {
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

    const events = await prisma.event.findMany({
      where: {
        userId: session.user.id,
      },
      include: {
        category: true,
        venue: {
          include: {
            city: true,
          },
        },
        tags: true,
        user: {
          include: {
            organizerProfile: true,
          },
        },
        ticketTypes: {
          include: {
            tickets: true,
          },
        },
        votingContest: {
          include: {
            contestants: {
              include: {
                votes: true,
              },
            },
            _count: {
              select: {
                votes: true,
              },
            },
          },
        },
        inviteOnlyEvent: {
          include: {
            invitations: {
              select: {
                id: true,
                status: true,
                rsvpResponse: true,
                plusOnesConfirmed: true,
                plusOnesAllowed: true,
                createdAt: true,
              },
            },
            _count: {
              select: {
                invitations: true,
              },
            },
          },
        },
      },
      orderBy: {
        startDateTime: 'desc',
      },
    });

    return {
      success: true,
      data: events,
    };
  } catch (error) {
    console.error('Error fetching user events:', error);
    return {
      success: false,
      message: 'Failed to fetch events',
    };
  }
}

// Get pending events specifically
export async function getPendingEvents(): Promise<ActionResponse<any[]>> {
  try {
    const events = await prisma.event.findMany({
      where: {
        publishedStatus: 'PENDING_REVIEW',
        isCancelled: false,
      },
      include: {
        tags: true,
        category: true,
        venue: {
          include: {
            city: true,
          },
        },
        ticketTypes: {
          where: {
            quantity: {
              gt: 0,
            },
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            organizerProfile: {
              select: {
                organizationName: true,
              },
            },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return {
      success: true,
      data: events,
    };
  } catch (error) {
    console.error('Error fetching pending events:', error);
    return {
      success: false,
      message: 'Failed to fetch pending events',
    };
  }
}

// Get featured events specifically
export async function getFeaturedEventsAdmin(): Promise<ActionResponse<any[]>> {
  try {
    const events = await prisma.event.findMany({
      where: {
        featured: true,
        isCancelled: false,
      },
      include: {
        tags: true,
        category: true,
        venue: {
          include: {
            city: true,
          },
        },
        ticketTypes: {
          where: {
            quantity: {
              gt: 0,
            },
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            organizerProfile: {
              select: {
                organizationName: true,
              },
            },
          },
        },
        _count: {
          select: {
            orders: true,
            ratings: true,
          },
        },
      },
      orderBy: { startDateTime: 'asc' },
    });

    return {
      success: true,
      data: events,
    };
  } catch (error) {
    console.error('Error fetching featured events:', error);
    return {
      success: false,
      message: 'Failed to fetch featured events',
    };
  }
}

// Bulk approve events
export async function bulkApproveEvents(
  eventIds: string[]
): Promise<ActionResponse<{ successful: number; failed: number }>> {
  // Validate user permission - only admins can do this
  const headersList = await headers();
  const session = await auth.api.getSession({
    headers: headersList,
  });

  if (!session || session.user.role !== 'ADMIN') {
    return {
      success: false,
      message: 'Only administrators can bulk approve events',
    };
  }

  try {
    let successful = 0;
    let failed = 0;

    for (const eventId of eventIds) {
      try {
        const event = await prisma.event.findUnique({
          where: { id: eventId },
          include: { user: true },
        });

        if (!event) {
          failed++;
          continue;
        }

        await prisma.event.update({
          where: { id: eventId },
          data: {
            publishedStatus: 'PUBLISHED',
          },
        });

        // Create notification for the event organizer
        await createEventNotification(
          eventId,
          'EVENT_APPROVED',
          event.userId ?? undefined
        );

        successful++;
      } catch (error) {
        console.error(`Failed to approve event ${eventId}:`, error);
        failed++;
      }
    }

    // Revalidate paths
    revalidatePath('/admin/dashboard/events');
    revalidatePath('/admin/dashboard/events/pending');
    revalidatePath('/dashboard/events');
    revalidatePath('/events');

    return {
      success: true,
      message: `Successfully approved ${successful} events${failed > 0 ? `, ${failed} failed` : ''}`,
      data: { successful, failed },
    };
  } catch (error) {
    console.error('Error in bulk approval:', error);
    return {
      success: false,
      message: 'Failed to bulk approve events',
    };
  }
}

// Bulk unfeature events
export async function bulkUnfeatureEvents(
  eventIds: string[]
): Promise<ActionResponse<{ successful: number; failed: number }>> {
  // Validate user permission - only admins can do this
  const headersList = await headers();
  const session = await auth.api.getSession({
    headers: headersList,
  });

  if (!session || session.user.role !== 'ADMIN') {
    return {
      success: false,
      message: 'Only administrators can bulk unfeature events',
    };
  }

  try {
    let successful = 0;
    let failed = 0;

    for (const eventId of eventIds) {
      try {
        await prisma.event.update({
          where: { id: eventId },
          data: {
            featured: false,
          },
        });

        successful++;
      } catch (error) {
        console.error(`Failed to unfeature event ${eventId}:`, error);
        failed++;
      }
    }

    // Revalidate paths
    revalidatePath('/admin/dashboard/events');
    revalidatePath('/admin/dashboard/events/featured');
    revalidatePath('/events');

    return {
      success: true,
      message: `Successfully unfeatured ${successful} events${failed > 0 ? `, ${failed} failed` : ''}`,
      data: { successful, failed },
    };
  } catch (error) {
    console.error('Error in bulk unfeature:', error);
    return {
      success: false,
      message: 'Failed to bulk unfeature events',
    };
  }
}

// Enhanced getEventById function with comprehensive nested data
export async function getEventById(id: string): Promise<ActionResponse<any>> {
  try {
    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        tags: true,
        category: true,
        venue: {
          include: {
            city: true,
          },
        },
        City: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            organizerProfile: true,
          },
        },
        ticketTypes: {
          include: {
            tickets: {
              include: {
                order: true,
                validations: true,
              },
            },
          },
        },
        orders: {
          include: {
            buyer: true,
            tickets: true,
          },
        },
        ratings: {
          include: {
            user: true,
          },
        },
        waitingList: {
          include: {
            user: true,
          },
        },
        // Voting contest
        votingContest: {
          include: {
            contestants: {
              include: {
                votes: {
                  include: {
                    user: true,
                  },
                },
              },
            },
            votePackages: {
              include: {
                voteOrders: true,
              },
            },
            votes: true,
            VoteOrder: {
              include: {
                user: true,
                votes: true,
              },
            },
          },
        },
        // Invite-only
        inviteOnlyEvent: {
          include: {
            invitations: {
              orderBy: {
                createdAt: 'desc',
              },
            },
          },
        },
        donationOrders: {
          where: {
            paymentStatus: 'COMPLETED',
          },
        },
        Notification: true,
      },
    });

    if (!event) {
      return {
        success: false,
        message: 'Event not found',
      };
    }

    // Calculate statistics based on event type
    const enhancedEvent = { ...event } as any;

    if (event.eventType === EventType.VOTING_CONTEST && event.votingContest) {
      const contestantsWithStats = event.votingContest.contestants.map(
        (contestant) => ({
          ...contestant,
          voteCount: contestant.votes.length,
        })
      );

      enhancedEvent.votingContest.contestants = contestantsWithStats.sort(
        (a, b) => b.voteCount - a.voteCount
      );

      // For edit form compatibility
      enhancedEvent.contestants = contestantsWithStats.map((c: any) => ({
        id: c.id,
        name: c.name,
        bio: c.bio,
        imageUrl: c.imageUrl,
        contestNumber: c.contestNumber,
        instagramUrl: c.instagramUrl,
        twitterUrl: c.twitterUrl,
        facebookUrl: c.facebookUrl,
        status: c.status,
      }));
    }

    if (event.eventType === EventType.INVITE && event.inviteOnlyEvent) {
      const invitations = event.inviteOnlyEvent.invitations;

      enhancedEvent.inviteOnlyEvent.stats = {
        totalInvited: invitations.length,
        accepted: invitations.filter((i) => i.status === 'ACCEPTED').length,
        declined: invitations.filter((i) => i.status === 'DECLINED').length,
        pending: invitations.filter((i) => i.status === 'PENDING').length,
        attended: invitations.filter((i) => i.status === 'ATTENDED').length,
        totalPlusOnes: invitations.reduce(
          (sum, i) => sum + i.plusOnesConfirmed,
          0
        ),
      };

      // For edit form compatibility
      enhancedEvent.guests = invitations.map((inv: any) => ({
        id: inv.id,
        guestName: inv.guestName,
        guestEmail: inv.guestEmail,
        guestPhone: inv.guestPhone,
        plusOnesAllowed: inv.plusOnesAllowed,
        specialRequirements: inv.specialRequirements,
        organizerNotes: inv.organizerNotes,
      }));

      // Donation stats
      if (event.donationOrders && event.donationOrders.length > 0) {
        const totalDonations = event.donationOrders.reduce(
          (sum, d) => sum + d.amount,
          0
        );
        const totalFees = event.donationOrders.reduce(
          (sum, d) => sum + d.platformFee,
          0
        );

        enhancedEvent.inviteOnlyEvent.donationStats = {
          totalDonations,
          totalFees,
          netTotal: totalDonations - totalFees,
          donorCount: event.donationOrders.length,
        };
      }
    }

    return {
      success: true,
      data: enhancedEvent,
    };
  } catch (error) {
    console.error('Error fetching event:', error);
    return {
      success: false,
      message: 'Failed to fetch event',
    };
  }
}

// Lightweight version for lists and basic operations
export async function getEventByIdBasic(
  id: string
): Promise<ActionResponse<any>> {
  try {
    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        tags: {
          select: {
            id: true,
            name: true,
            bgColor: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
          },
        },
        venue: {
          include: {
            city: {
              select: {
                id: true,
                name: true,
                state: true,
              },
            },
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            organizerProfile: {
              select: {
                organizationName: true,
              },
            },
          },
        },
        _count: {
          select: {
            orders: true,
            ratings: true,
          },
        },
      },
    });

    if (!event) {
      return {
        success: false,
        message: 'Event not found',
      };
    }

    return {
      success: true,
      data: event,
    };
  } catch (error) {
    console.error(`Error fetching basic event data for ID ${id}:`, error);
    return {
      success: false,
      message: 'Failed to fetch event',
    };
  }
}

// Utility function to get event with user permission context
export async function getEventByIdWithPermissions(
  id: string,
  userId?: string,
  userRole?: string,
  userSubRole?: string
): Promise<ActionResponse<any>> {
  const result = await getEventById(id);

  if (!result.success || !result.data) {
    return result;
  }

  // Add permission context
  const event = result.data;
  const isOwner = event.userId === userId;
  const isAdmin = userRole === 'ADMIN';
  const isSuperAdmin = isAdmin && userSubRole === 'SUPER_ADMIN';
  const isStaff = isAdmin && userSubRole === 'STAFF';

  event.permissions = {
    canEdit: isOwner || isAdmin,
    canDelete: isOwner || isSuperAdmin,
    canPublish: isAdmin,
    canViewAnalytics: isOwner || isAdmin,
    canManageContestants: isOwner || isAdmin,
    canManageTickets: isOwner || isAdmin,
    canHardDelete: isSuperAdmin,
    canFeature: isAdmin,
    canApproveReject: isAdmin,
  };

  return {
    success: true,
    data: event,
  };
}

// Fixed: Updated to use findFirst instead of findUnique for slug queries
export async function getEventBySlug(
  slug: string
): Promise<ActionResponse<any>> {
  try {
    const event = await prisma.event.findFirst({
      where: { slug },
      include: {
        tags: true,
        category: true,
        venue: {
          include: {
            city: true,
          },
        },
        ticketTypes: {
          orderBy: {
            price: 'asc',
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            organizerProfile: true,
          },
        },
        ratings: {
          include: {
            user: {
              select: {
                name: true,
                image: true,
              },
            },
          },
          orderBy: {
            id: 'desc',
          },
        },
      },
    });

    if (!event) {
      return {
        success: false,
        message: 'Event not found',
      };
    }

    return {
      success: true,
      data: event,
    };
  } catch (error) {
    console.error(`Error fetching event with slug ${slug}:`, error);
    return {
      success: false,
      message: 'Failed to fetch event',
    };
  }
}

export async function deleteEvent(id: string): Promise<ActionResponse<null>> {
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

  const { role, subRole, id: userId } = session.user;

  try {
    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        ticketTypes: {
          include: {
            tickets: true,
          },
        },
        orders: true,
        votingContest: {
          include: {
            contestants: {
              include: {
                votes: true,
              },
            },
            VoteOrder: true,
          },
        },
        inviteOnlyEvent: {
          include: {
            invitations: true,
          },
        },
        donationOrders: true,
      },
    });

    if (!event) {
      return {
        success: false,
        message: 'Event not found',
      };
    }

    const isSuperAdmin = role === 'ADMIN' && subRole === 'SUPER_ADMIN';
    const isEventOwner = event.userId === userId && subRole === 'ORGANIZER';

    if (!isSuperAdmin && !isEventOwner) {
      return {
        success: false,
        message: 'Only Super Admins or event owners can delete events',
      };
    }

    // Check if event has activity
    const hasOrders = event.orders.length > 0;
    const hasTickets = event.ticketTypes.some(
      (type) => type.tickets.length > 0
    );
    const hasVotingActivity =
      (event.votingContest?.VoteOrder?.length ?? 0) > 0 ||
      (event.votingContest?.contestants?.some((c) => c.votes.length > 0) ??
        false);
    const hasInvitations =
      (event.inviteOnlyEvent?.invitations?.length ?? 0) > 0;
    const hasDonations = event.donationOrders?.length > 0;

    if (
      hasOrders ||
      hasTickets ||
      hasVotingActivity ||
      hasInvitations ||
      hasDonations
    ) {
      // Mark as cancelled
      await prisma.event.update({
        where: { id },
        data: {
          isCancelled: true,
          publishedStatus: 'REJECTED',
        },
      });

      revalidatePath('/admin/events');
      revalidatePath('/dashboard/events');
      revalidatePath('/events');

      return {
        success: true,
        message:
          'Event has been cancelled instead of deleted because it has associated activity',
      };
    }

    // Delete in transaction
    await prisma.$transaction(async (tx) => {
      // Delete voting contest data
      if (event.votingContest) {
        await tx.vote.deleteMany({
          where: { contestId: event.votingContest.id },
        });
        await tx.voteOrder.deleteMany({
          where: { contestId: event.votingContest.id },
        });
        await tx.votePackage.deleteMany({
          where: { contestId: event.votingContest.id },
        });
        await tx.contestant.deleteMany({
          where: { contestId: event.votingContest.id },
        });
        await tx.votingContest.delete({
          where: { id: event.votingContest.id },
        });
      }

      // Delete invite-only data
      if (event.inviteOnlyEvent) {
        await tx.invitation.deleteMany({
          where: { inviteOnlyEventId: event.inviteOnlyEvent.id },
        });
        await tx.inviteOnlyEvent.delete({
          where: { id: event.inviteOnlyEvent.id },
        });
      }

      // Delete donations
      await tx.donationOrder.deleteMany({
        where: { eventId: id },
      });

      // Delete notifications
      await tx.notification.deleteMany({
        where: { eventId: id },
      });

      // Delete ratings
      await tx.rating.deleteMany({
        where: { eventId: id },
      });

      // Delete waiting list
      await tx.waitingList.deleteMany({
        where: { eventId: id },
      });

      // Delete ticket validations and tickets
      const ticketTypeIds = event.ticketTypes.map((tt) => tt.id);
      if (ticketTypeIds.length > 0) {
        await tx.ticketValidation.deleteMany({
          where: {
            ticket: {
              ticketTypeId: { in: ticketTypeIds },
            },
          },
        });

        await tx.ticket.deleteMany({
          where: {
            ticketTypeId: { in: ticketTypeIds },
          },
        });
      }

      // Delete ticket types
      await tx.ticketType.deleteMany({
        where: { eventId: id },
      });

      // Disconnect tags
      await tx.event.update({
        where: { id },
        data: {
          tags: {
            set: [],
          },
        },
      });

      // Delete event
      await tx.event.delete({
        where: { id },
      });
    });

    revalidatePath('/admin/events');
    revalidatePath('/dashboard/events');
    revalidatePath('/events');

    return {
      success: true,
      message: 'Event deleted successfully',
    };
  } catch (error) {
    console.error('Error deleting event:', error);
    return {
      success: false,
      message: 'Failed to delete event',
    };
  }
}

export async function hardDeleteEvent(
  id: string
): Promise<ActionResponse<null>> {
  // Get session for authentication
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

  const { role, subRole, id: adminUserId } = session.user;

  // STRICT PERMISSION CHECK - Only SUPER_ADMIN can perform hard delete
  if (role !== 'ADMIN' || subRole !== 'SUPER_ADMIN') {
    return {
      success: false,
      message: 'Only Super Administrators can perform hard delete operations',
    };
  }

  try {
    console.log(`Starting hard delete for event ID: ${id}`);

    // Check if event exists and get full data for audit log including voting contest
    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        ticketTypes: {
          include: {
            tickets: {
              include: {
                order: true,
                validations: true,
              },
            },
          },
        },
        orders: {
          include: {
            tickets: true,
            Notification: true,
          },
        },
        waitingList: true,
        ratings: true,
        Notification: true,
        tags: true,
        category: true,
        venue: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        // Include comprehensive voting contest data
        votingContest: {
          include: {
            contestants: {
              include: {
                votes: true,
              },
            },
            votePackages: {
              include: {
                voteOrders: {
                  include: {
                    votes: true,
                    notifications: true,
                  },
                },
              },
            },
            votes: true,
            VoteOrder: {
              include: {
                votes: true,
                notifications: true,
              },
            },
          },
        },
      },
    });

    if (!event) {
      console.log(`Event not found: ${id}`);
      return {
        success: false,
        message: 'Event not found',
      };
    }

    console.log(`Event found: ${event.title}`);
    console.log(`Event type: ${event.eventType}`);
    console.log(`Ticket types: ${event.ticketTypes.length}`);
    console.log(`Orders: ${event.orders.length}`);
    console.log(`Ratings: ${event.ratings.length}`);
    console.log(`Notifications: ${event.Notification.length}`);
    console.log(`Waiting list: ${event.waitingList.length}`);

    if (event.votingContest) {
      console.log(`Voting contest found with:`);
      console.log(`- Contestants: ${event.votingContest.contestants.length}`);
      console.log(
        `- Vote packages: ${event.votingContest.votePackages.length}`
      );
      console.log(`- Total votes: ${event.votingContest.votes.length}`);
      console.log(`- Vote orders: ${event.votingContest.VoteOrder.length}`);
    }

    // Get client IP and user agent for audit trail
    const headerList = await headers();
    const ipAddress =
      headerList.get('x-forwarded-for') ||
      headerList.get('x-real-ip') ||
      'unknown';
    const userAgent = headerList.get('user-agent') || 'unknown';

    // Perform hard delete in transaction with audit logging
    await prisma.$transaction(async (tx) => {
      console.log('Starting transaction...');

      try {
        // Create comprehensive audit log BEFORE deletion
        console.log('Creating initial audit log...');
        await tx.auditLog.create({
          data: {
            userId: adminUserId,
            action: 'HARD_DELETE',
            entity: 'EVENT',
            entityId: id,
            oldValues: {
              event: {
                id: event.id,
                title: event.title,
                slug: event.slug,
                description: event.description,
                eventType: event.eventType,
                startDateTime: event.startDateTime?.toISOString(),
                endDateTime: event.endDateTime?.toISOString(),
                publishedStatus: event.publishedStatus,
                isCancelled: event.isCancelled,
                featured: event.featured,
                userId: event.userId,
                venueId: event.venueId,
                categoryId: event.categoryId,
                createdAt: event.createdAt?.toISOString(),
                updatedAt: event.updatedAt?.toISOString(),
              },
              organizer: event.user,
              venue: event.venue?.name,
              category: event.category?.name,
              tags: event.tags.map((tag) => tag.name),
              ticketTypesCount: event.ticketTypes.length,
              ticketsCount: event.ticketTypes.reduce(
                (sum, tt) => sum + tt.tickets.length,
                0
              ),
              ordersCount: event.orders.length,
              ratingsCount: event.ratings.length,
              waitingListCount: event.waitingList.length,
              notificationsCount: event.Notification.length,
              totalRevenue: event.orders.reduce(
                (sum, order) => sum + order.totalAmount,
                0
              ),
              // Add voting contest data to audit log
              votingContest: event.votingContest
                ? {
                    id: event.votingContest.id,
                    votingType: event.votingContest.votingType,
                    contestantsCount: event.votingContest.contestants.length,
                    votePackagesCount: event.votingContest.votePackages.length,
                    totalVotes: event.votingContest.votes.length,
                    voteOrdersCount: event.votingContest.VoteOrder.length,
                    contestants: event.votingContest.contestants.map((c) => ({
                      name: c.name,
                      contestNumber: c.contestNumber,
                      votesCount: c.votes.length,
                    })),
                  }
                : null,
            },
            newValues: { deleted: true },
            ipAddress,
            userAgent,
          },
        });

        // 1. Delete all ticket validations
        console.log('Deleting ticket validations...');
        const ticketTypeIds = event.ticketTypes.map((tt) => tt.id);
        if (ticketTypeIds.length > 0) {
          const deletedValidations = await tx.ticketValidation.deleteMany({
            where: {
              ticket: {
                ticketTypeId: { in: ticketTypeIds },
              },
            },
          });
          console.log(`Deleted ${deletedValidations.count} ticket validations`);
        }

        // 2. Delete all tickets
        console.log('Deleting tickets...');
        if (ticketTypeIds.length > 0) {
          const deletedTickets = await tx.ticket.deleteMany({
            where: {
              ticketTypeId: { in: ticketTypeIds },
            },
          });
          console.log(`Deleted ${deletedTickets.count} tickets`);
        }

        // 3. Delete voting contest data if it exists
        if (event.votingContest) {
          console.log('Deleting voting contest data...');

          // Delete votes first (they reference contestants and vote orders)
          const deletedVotes = await tx.vote.deleteMany({
            where: { contestId: event.votingContest.id },
          });
          console.log(`Deleted ${deletedVotes.count} votes`);

          // Delete vote order notifications
          const voteOrderIds =
            event.votingContest.VoteOrder?.map((order) => order.id) || [];
          if (voteOrderIds.length > 0) {
            const deletedVoteOrderNotifications =
              await tx.notification.deleteMany({
                where: { voteOrderId: { in: voteOrderIds } },
              });
            console.log(
              `Deleted ${deletedVoteOrderNotifications.count} vote order notifications`
            );
          }

          // Delete vote orders
          const deletedVoteOrders = await tx.voteOrder.deleteMany({
            where: { contestId: event.votingContest.id },
          });
          console.log(`Deleted ${deletedVoteOrders.count} vote orders`);

          // Delete vote packages
          const deletedVotePackages = await tx.votePackage.deleteMany({
            where: { contestId: event.votingContest.id },
          });
          console.log(`Deleted ${deletedVotePackages.count} vote packages`);

          // Delete contestants
          const deletedContestants = await tx.contestant.deleteMany({
            where: { contestId: event.votingContest.id },
          });
          console.log(`Deleted ${deletedContestants.count} contestants`);

          // Delete voting contest itself
          await tx.votingContest.delete({
            where: { id: event.votingContest.id },
          });
          console.log('Deleted voting contest');
        }

        // 4. Delete all order notifications
        console.log('Deleting order notifications...');
        const orderIds = event.orders.map((order) => order.id);
        if (orderIds.length > 0) {
          const deletedOrderNotifications = await tx.notification.deleteMany({
            where: {
              orderId: { in: orderIds },
            },
          });
          console.log(
            `Deleted ${deletedOrderNotifications.count} order notifications`
          );
        }

        // 5. Delete all orders
        console.log('Deleting orders...');
        if (orderIds.length > 0) {
          const deletedOrders = await tx.order.deleteMany({
            where: { eventId: id },
          });
          console.log(`Deleted ${deletedOrders.count} orders`);
        }

        // 6. Delete all ticket types
        console.log('Deleting ticket types...');
        const deletedTicketTypes = await tx.ticketType.deleteMany({
          where: { eventId: id },
        });
        console.log(`Deleted ${deletedTicketTypes.count} ticket types`);

        // 7. Delete all event notifications
        console.log('Deleting event notifications...');
        const deletedEventNotifications = await tx.notification.deleteMany({
          where: { eventId: id },
        });
        console.log(
          `Deleted ${deletedEventNotifications.count} event notifications`
        );

        // 8. Delete all ratings
        console.log('Deleting ratings...');
        const deletedRatings = await tx.rating.deleteMany({
          where: { eventId: id },
        });
        console.log(`Deleted ${deletedRatings.count} ratings`);

        // 9. Delete all waiting list entries
        console.log('Deleting waiting list entries...');
        const deletedWaitingList = await tx.waitingList.deleteMany({
          where: { eventId: id },
        });
        console.log(`Deleted ${deletedWaitingList.count} waiting list entries`);

        // 10. Delete any audit logs that reference this event (optional - be careful!)
        console.log('Deleting event-related audit logs...');
        const deletedAuditLogs = await tx.auditLog.deleteMany({
          where: {
            entity: 'EVENT',
            entityId: id,
          },
        });
        console.log(`Deleted ${deletedAuditLogs.count} audit logs`);

        // 11. Disconnect tags (many-to-many relationship)
        console.log('Disconnecting tags...');
        await tx.event.update({
          where: { id },
          data: {
            tags: {
              set: [], // Disconnect all tags
            },
          },
        });
        console.log('Tags disconnected');

        // 12. Finally delete the event itself
        console.log('Deleting event...');
        await tx.event.delete({
          where: { id },
        });
        console.log('Event deleted successfully');

        // Log additional audit entry for successful completion
        console.log('Creating completion audit log...');
        await tx.auditLog.create({
          data: {
            userId: adminUserId,
            action: 'HARD_DELETE_COMPLETED',
            entity: 'EVENT',
            entityId: id,
            oldValues: undefined,
            newValues: {
              deletedAt: new Date().toISOString(),
              deletedBy: adminUserId,
              eventTitle: event.title,
              eventType: event.eventType,
              totalRecordsDeleted: {
                tickets: event.ticketTypes.reduce(
                  (sum, tt) => sum + tt.tickets.length,
                  0
                ),
                orders: event.orders.length,
                ratings: event.ratings.length,
                notifications: event.Notification.length,
                waitingList: event.waitingList.length,
                ticketTypes: event.ticketTypes.length,
                // Add voting contest deletion counts
                votingContestData: event.votingContest
                  ? {
                      contestants: event.votingContest.contestants.length,
                      votes: event.votingContest.votes.length,
                      voteOrders: event.votingContest.VoteOrder.length,
                      votePackages: event.votingContest.votePackages.length,
                    }
                  : null,
              },
            },
            ipAddress,
            userAgent,
          },
        });
        console.log('Transaction completed successfully');
      } catch (transactionError) {
        console.error('Error in transaction:', transactionError);
        throw transactionError; // Re-throw to trigger transaction rollback
      }
    });

    // Revalidate all relevant paths
    revalidatePath('/admin/events');
    revalidatePath('/admin/dashboard/events');
    revalidatePath('/dashboard/events');
    revalidatePath('/events');
    revalidatePath(`/events/${event.slug}`);

    console.log('Hard delete completed successfully');
    return {
      success: true,
      message: `Event "${event.title}" and all related data (including voting contest data) have been permanently deleted. This action has been logged for audit purposes.`,
    };
  } catch (error) {
    console.error('Error performing hard delete:', error);

    // Log the full error details
    if (error instanceof Error) {
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);

      // Check for specific Prisma errors
      if (error.message.includes('P2003')) {
        console.error('Foreign key constraint failure');
      }
      if (error.message.includes('P2025')) {
        console.error('Record not found');
      }
      if (error.message.includes('P2002')) {
        console.error('Unique constraint failure');
      }
    }

    // Log failed deletion attempt with more details
    try {
      await prisma.auditLog.create({
        data: {
          userId: adminUserId,
          action: 'HARD_DELETE_FAILED',
          entity: 'EVENT',
          entityId: id,
          oldValues: {
            error: error instanceof Error ? error.message : 'Unknown error',
            errorName: error instanceof Error ? error.name : 'Unknown',
            stack: error instanceof Error ? error.stack : undefined,
            timestamp: new Date().toISOString(),
          },
          newValues: { failed: true },
          ipAddress: (await headers()).get('x-forwarded-for') || 'unknown',
          userAgent: (await headers()).get('user-agent') || 'unknown',
        },
      });
    } catch (auditError) {
      console.error('Failed to log audit entry:', auditError);
    }

    // Return more specific error message
    if (error instanceof Error) {
      if (
        error.message.includes('foreign key constraint') ||
        error.message.includes('P2003')
      ) {
        return {
          success: false,
          message:
            'Database constraint error: Some related data still exists that prevents deletion.',
        };
      }

      if (
        error.message.includes('Record to delete does not exist') ||
        error.message.includes('P2025')
      ) {
        return {
          success: false,
          message: 'Event not found or already deleted.',
        };
      }

      // Return the actual error message for debugging
      return {
        success: false,
        message: `Hard delete failed: ${error.message}`,
      };
    }

    return {
      success: false,
      message: 'Failed to perform hard delete. Check server logs for details.',
    };
  }
}

export async function publishEvent(id: string): Promise<ActionResponse<any>> {
  // Validate user permission
  const permissionCheck = await validateUserPermission();
  if (!permissionCheck.success) {
    return {
      success: false,
      message: permissionCheck.message,
    };
  }

  const userId = permissionCheck.userData!.userId;
  const isAdmin = permissionCheck.userData!.isAdmin;

  try {
    // Check if event exists
    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        ticketTypes: true,
      },
    });

    if (!event) {
      return {
        success: false,
        message: 'Event not found',
      };
    }

    // If not an admin, check if the user owns this event
    if (!isAdmin && event.userId !== userId) {
      return {
        success: false,
        message: 'You can only publish events that you created',
      };
    }

    // Check if the event has at least one ticket type
    if (event.ticketTypes.length === 0) {
      return {
        success: false,
        message: 'Cannot publish event without at least one ticket type',
      };
    }

    // Additional validation checks before publishing
    if (!event.title || !event.description || !event.coverImageUrl) {
      return {
        success: false,
        message:
          'Event must have a title, description, and cover image before publishing',
      };
    }

    // Update the event status
    const updatedEvent = await prisma.event.update({
      where: { id },
      data: {
        publishedStatus: isAdmin ? 'PUBLISHED' : 'PENDING_REVIEW',
      },
    });

    revalidatePath('/admin/events');
    revalidatePath('/dashboard/events');
    revalidatePath(`/events/${event.slug}`);
    revalidatePath(`/events/${id}`);
    revalidatePath('/events');

    const message = isAdmin
      ? 'Event published successfully'
      : 'Event submitted for review';

    return {
      success: true,
      message,
      data: updatedEvent,
    };
  } catch (error) {
    console.error('Error publishing event:', error);
    return {
      success: false,
      message: 'Failed to publish event',
    };
  }
}
