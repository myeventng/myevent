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
} from '@/generated/prisma';
import { createEventNotification } from '@/actions/notification.actions';
import { VotingContest, VotingType } from '@/generated/prisma';

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
  // Add voting contest support
  votingContest?: {
    votingType: VotingType;
    votePackagesEnabled?: boolean;
    defaultVotePrice?: number;
    allowGuestVoting?: boolean;
    maxVotesPerUser?: number;
    allowMultipleVotes?: boolean;
    votingStartDate?: Date;
    votingEndDate?: Date;
    showLiveResults?: boolean;
    showVoterNames?: boolean;
    votePackages?: any[];
  };
  contestants?: any[];
}

interface ActionResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}

// Fixed permission validation return type
interface PermissionValidationResult {
  success: boolean;
  message?: string;
  userData?: {
    userId: string;
    isAdmin: boolean;
    canCreateEvents: boolean;
  };
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

// Create event with proper notification workflow
export async function createEvent(
  data: EventInput
): Promise<ActionResponse<any>> {
  // Validate user permission
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

    // Validate tags if provided
    if (data.tagIds && data.tagIds.length > 0) {
      const tagCount = await prisma.tag.count({
        where: {
          id: {
            in: data.tagIds,
          },
        },
      });

      if (tagCount !== data.tagIds.length) {
        return {
          success: false,
          message: 'One or more tags not found',
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

    // Determine publish status based on user role
    let publishedStatus: PublishedStatus;
    if (isAdmin) {
      // Admins can publish directly or set custom status
      publishedStatus = data.publishedStatus || 'PUBLISHED';
    } else {
      // Organizers must submit for review unless saving as draft
      publishedStatus =
        data.publishedStatus === 'DRAFT' ? 'DRAFT' : 'PENDING_REVIEW';
    }

    // Create new event
    const newEvent = await prisma.event.create({
      data: {
        title: data.title,
        slug,
        description: data.description,
        location: data.location,
        coverImageUrl: data.coverImageUrl,
        startDateTime: data.startDateTime,
        endDateTime: data.endDateTime,
        isFree: data.isFree,
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
          connect: data.tagIds.map((id) => ({ id })),
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

    // Create notification for admin if event is submitted for review
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

// Update event

export async function updateEvent(
  data: UpdateEventInput & { votingContest?: any }
): Promise<ActionResponse<any>> {
  // Validate user permission
  const permissionCheck = await validateUserPermission();
  if (!permissionCheck.success) {
    return {
      success: false,
      message: permissionCheck.message,
    };
  }

  const { userId, isAdmin } = permissionCheck.userData!;

  try {
    // Check if event exists - THIS WAS MISSING
    const existingEvent = await prisma.event.findUnique({
      where: { id: data.id },
      include: {
        tags: true,
      },
    });

    if (!existingEvent) {
      return {
        success: false,
        message: 'Event not found',
      };
    }

    // If not an admin, check if the user owns this event
    if (!isAdmin && existingEvent.userId !== userId) {
      return {
        success: false,
        message: 'You can only update events that you created',
      };
    }

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

    // Validate tags if provided
    if (data.tagIds && data.tagIds.length > 0) {
      const tagCount = await prisma.tag.count({
        where: {
          id: {
            in: data.tagIds,
          },
        },
      });

      if (tagCount !== data.tagIds.length) {
        return {
          success: false,
          message: 'One or more tags not found',
        };
      }
    }

    // Generate new slug if needed
    let slug = existingEvent.slug;
    if (data.title !== existingEvent.title || !existingEvent.slug) {
      slug = await generateSlug(data.title, data.id);
    }

    if (!slug) {
      return {
        success: false,
        message: 'Failed to generate or maintain event slug',
      };
    }

    // Handle tag updates - FIXED TYPE ANNOTATIONS
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

    // Start transaction for atomic updates
    const result = await prisma.$transaction(async (tx) => {
      // Update the main event
      const updatedEvent = await tx.event.update({
        where: { id: data.id },
        data: {
          title: data.title,
          slug,
          description: data.description,
          location: data.location,
          coverImageUrl: data.coverImageUrl,
          startDateTime: data.startDateTime,
          endDateTime: data.endDateTime,
          isFree: data.isFree,
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
          votingContest: true, // Include voting contest in response
        },
      });

      // Handle voting contest updates if this is a voting contest event
      if (
        updatedEvent.eventType === EventType.VOTING_CONTEST &&
        data.votingContest
      ) {
        console.log('Updating voting contest with data:', data.votingContest);

        // Check if voting contest exists
        let votingContest = await tx.votingContest.findUnique({
          where: { eventId: data.id },
        });

        if (votingContest) {
          // Update existing voting contest
          await tx.votingContest.update({
            where: { id: votingContest.id },
            data: {
              votingType: data.votingContest.votingType,
              votePackagesEnabled:
                data.votingContest.votePackagesEnabled || false,
              defaultVotePrice: data.votingContest.defaultVotePrice,
              allowGuestVoting: data.votingContest.allowGuestVoting || false,
              maxVotesPerUser: data.votingContest.maxVotesPerUser,
              allowMultipleVotes:
                data.votingContest.allowMultipleVotes !== false,
              votingStartDate: data.votingContest.votingStartDate,
              votingEndDate: data.votingContest.votingEndDate,
              showLiveResults: data.votingContest.showLiveResults !== false,
              showVoterNames: data.votingContest.showVoterNames || false,
            },
          });
        } else {
          // Create new voting contest if it doesn't exist
          votingContest = await tx.votingContest.create({
            data: {
              eventId: data.id,
              votingType: data.votingContest.votingType,
              votePackagesEnabled:
                data.votingContest.votePackagesEnabled || false,
              defaultVotePrice: data.votingContest.defaultVotePrice,
              allowGuestVoting: data.votingContest.allowGuestVoting || false,
              maxVotesPerUser: data.votingContest.maxVotesPerUser,
              allowMultipleVotes:
                data.votingContest.allowMultipleVotes !== false,
              votingStartDate: data.votingContest.votingStartDate,
              votingEndDate: data.votingContest.votingEndDate,
              showLiveResults: data.votingContest.showLiveResults !== false,
              showVoterNames: data.votingContest.showVoterNames || false,
            },
          });
        }
      }

      return updatedEvent;
    });

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
    revalidatePath(`/events/${result.slug}`);
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
      data: result,
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
        // You might want to add a rejectionReason field to your Event model
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
        // console.log(
        //   `Fixed slug for event ${event.id}: "${event.title}" -> "${newSlug}"`
        // );
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

export async function getEvents(
  published: boolean = true
): Promise<ActionResponse<any[]>> {
  try {
    const events = await prisma.event.findMany({
      where: published ? { publishedStatus: 'PUBLISHED' } : {},
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
        // Include voting contest data with error handling
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
            },
            votePackages: true,
            _count: {
              select: {
                votes: true,
              },
            },
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
    console.error('Error fetching events:', error);

    // Try to fetch events without voting contest data as fallback
    try {
      console.log('Attempting fallback query without voting contest data...');
      const fallbackEvents = await prisma.event.findMany({
        where: published ? { publishedStatus: 'PUBLISHED' } : {},
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
        orderBy: { startDateTime: 'asc' },
      });

      console.log('Fallback query successful');
      return {
        success: true,
        data: fallbackEvents,
      };
    } catch (fallbackError) {
      console.error('Fallback query also failed:', fallbackError);
      return {
        success: false,
        message: 'Failed to fetch events',
        data: [], // Return empty array instead of undefined
      };
    }
  }
}

// Enhanced events fetching with pagination, search, and filtering
// Enhanced events fetching with pagination, search, and filtering including voting contests
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

export async function getUserEvents(): Promise<ActionResponse<any[]>> {
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
        tags: true,
        category: true,
        venue: {
          include: {
            city: true,
          },
        },
        ticketTypes: true,
      },
      orderBy: { createdAt: 'desc' },
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

// Add these functions to your existing event.actions.ts file

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
    // First, fetch the basic event data to determine type
    const basicEvent = await prisma.event.findUnique({
      where: { id },
      select: {
        eventType: true,
        id: true,
      },
    });

    if (!basicEvent) {
      return {
        success: false,
        message: 'Event not found',
      };
    }

    // Build comprehensive query based on event type
    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        // Basic relations for all events
        tags: {
          select: {
            id: true,
            name: true,
            bgColor: true,
            slug: true,
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
                population: true,
              },
            },
          },
        },
        City: {
          select: {
            id: true,
            name: true,
            state: true,
            population: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            firstName: true,
            lastName: true,
            organizerProfile: {
              select: {
                id: true,
                organizationName: true,
                bio: true,
                website: true,
                organizationType: true,
                verificationStatus: true,
                businessRegistrationNumber: true,
                taxIdentificationNumber: true,
                customPlatformFee: true,
                bankAccount: true,
                bankCode: true,
                accountName: true,
              },
            },
          },
        },

        // Standard event specific data
        ticketTypes: {
          include: {
            tickets: {
              include: {
                order: {
                  select: {
                    id: true,
                    totalAmount: true,
                    quantity: true,
                    paymentStatus: true,
                    createdAt: true,
                    buyer: {
                      select: {
                        id: true,
                        name: true,
                        email: true,
                      },
                    },
                  },
                },
                validations: {
                  include: {
                    validator: {
                      select: {
                        id: true,
                        name: true,
                      },
                    },
                  },
                },
              },
            },
            _count: {
              select: {
                tickets: true,
              },
            },
          },
          orderBy: {
            price: 'asc',
          },
        },

        // Voting contest specific data
        votingContest: {
          include: {
            contestants: {
              include: {
                votes: {
                  include: {
                    user: {
                      select: {
                        id: true,
                        name: true,
                        image: true,
                      },
                    },
                    voteOrder: {
                      select: {
                        id: true,
                        totalAmount: true,
                        paymentStatus: true,
                        createdAt: true,
                      },
                    },
                  },
                  orderBy: {
                    createdAt: 'desc',
                  },
                },
                _count: {
                  select: {
                    votes: true,
                  },
                },
              },
              orderBy: [
                { status: 'asc' }, // ACTIVE first
                { contestNumber: 'asc' },
              ],
            },
            votePackages: {
              orderBy: {
                sortOrder: 'asc',
              },
              include: {
                voteOrders: {
                  include: {
                    user: {
                      select: {
                        id: true,
                        name: true,
                        email: true,
                      },
                    },
                    votes: {
                      include: {
                        contestant: {
                          select: {
                            id: true,
                            name: true,
                            contestNumber: true,
                          },
                        },
                      },
                    },
                  },
                  orderBy: {
                    createdAt: 'desc',
                  },
                },
                _count: {
                  select: {
                    voteOrders: true,
                  },
                },
              },
            },
            votes: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    image: true,
                  },
                },
                contestant: {
                  select: {
                    id: true,
                    name: true,
                    contestNumber: true,
                    imageUrl: true,
                  },
                },
                voteOrder: {
                  select: {
                    id: true,
                    totalAmount: true,
                    paymentStatus: true,
                    votePackage: {
                      select: {
                        id: true,
                        name: true,
                        voteCount: true,
                        price: true,
                      },
                    },
                  },
                },
              },
              orderBy: {
                createdAt: 'desc',
              },
            },
            VoteOrder: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  },
                },
                votePackage: {
                  select: {
                    id: true,
                    name: true,
                    voteCount: true,
                    price: true,
                  },
                },
                votes: {
                  include: {
                    contestant: {
                      select: {
                        id: true,
                        name: true,
                        contestNumber: true,
                      },
                    },
                  },
                },
                notifications: {
                  select: {
                    id: true,
                    type: true,
                    status: true,
                    createdAt: true,
                  },
                },
              },
              orderBy: {
                createdAt: 'desc',
              },
            },
            _count: {
              select: {
                contestants: true,
                votes: true,
                votePackages: true,
                VoteOrder: true,
              },
            },
          },
        },

        // Common relations for all events
        orders: {
          include: {
            buyer: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
              },
            },
            tickets: {
              include: {
                ticketType: {
                  select: {
                    id: true,
                    name: true,
                    price: true,
                  },
                },
                validations: {
                  include: {
                    validator: {
                      select: {
                        id: true,
                        name: true,
                      },
                    },
                  },
                },
              },
            },
            Notification: {
              select: {
                id: true,
                type: true,
                status: true,
                createdAt: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        waitingList: {
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
          orderBy: {
            createdAt: 'asc',
          },
        },
        ratings: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        Notification: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },

        // Aggregated counts for performance insights
        _count: {
          select: {
            orders: true,
            ratings: true,
            waitingList: true,
            Notification: true,
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

    // Process and enhance the event data
    let enhancedEvent = { ...event } as any;

    // Calculate additional metrics for standard events
    if (event.eventType === EventType.STANDARD && event.ticketTypes) {
      enhancedEvent.ticketTypes = event.ticketTypes.map((ticketType) => {
        const soldTickets = ticketType.tickets.filter(
          (ticket) => ticket.order && ticket.order.paymentStatus === 'COMPLETED'
        );
        const totalRevenue = soldTickets.reduce(
          (sum, ticket) => sum + (ticket.order?.totalAmount || 0),
          0
        );
        const availableQuantity = ticketType.quantity - soldTickets.length;

        return {
          ...ticketType,
          soldCount: soldTickets.length,
          availableCount: Math.max(0, availableQuantity),
          totalRevenue: totalRevenue,
          conversionRate:
            ticketType.quantity > 0
              ? (soldTickets.length / ticketType.quantity) * 100
              : 0,
        };
      });

      // Calculate overall event statistics
      const totalTicketsSold = event.ticketTypes.reduce(
        (sum, tt) =>
          sum +
          tt.tickets.filter(
            (t) => t.order && t.order.paymentStatus === 'COMPLETED'
          ).length,
        0
      );
      const totalRevenue = event.orders
        .filter((order) => order.paymentStatus === 'COMPLETED')
        .reduce((sum, order) => sum + order.totalAmount, 0);
      const totalCapacity = event.ticketTypes.reduce(
        (sum, tt) => sum + tt.quantity,
        0
      );

      enhancedEvent.analytics = {
        totalTicketsSold,
        totalRevenue,
        totalCapacity,
        utilizationRate:
          totalCapacity > 0 ? (totalTicketsSold / totalCapacity) * 100 : 0,
        averageOrderValue:
          event.orders.length > 0 ? totalRevenue / event.orders.length : 0,
      };
    }

    // Calculate voting contest statistics
    if (event.eventType === EventType.VOTING_CONTEST && event.votingContest) {
      const contest = event.votingContest;

      // Calculate contestant vote counts and rankings
      const contestantsWithStats = contest.contestants.map((contestant) => {
        const voteCount = contestant._count.votes;
        const recentVotes = contestant.votes.slice(0, 10); // Last 10 votes

        return {
          ...contestant,
          voteCount,
          recentVotes,
          socialLinks: {
            instagram: contestant.instagramUrl,
            twitter: contestant.twitterUrl,
            facebook: contestant.facebookUrl,
          },
        };
      });

      // Sort by vote count for ranking
      const rankedContestants = contestantsWithStats
        .sort((a, b) => b.voteCount - a.voteCount)
        .map((contestant, index) => ({
          ...contestant,
          rank: index + 1,
        }));

      enhancedEvent.votingContest = {
        ...contest,
        contestants: rankedContestants,
        analytics: {
          totalVotes: contest._count.votes,
          totalContestants: contest._count.contestants,
          totalVoteOrders: contest._count.VoteOrder,
          totalVotePackages: contest._count.votePackages,
          averageVotesPerContestant:
            contest._count.contestants > 0
              ? contest._count.votes / contest._count.contestants
              : 0,
          topContestant: rankedContestants[0] || null,
          votingActivity: contest.votes.slice(0, 20), // Recent 20 votes
          revenue: contest.VoteOrder.filter(
            (order) => order.paymentStatus === 'COMPLETED'
          ).reduce((sum, order) => sum + order.totalAmount, 0),
        },
      };

      // For edit form compatibility, also set contestants at root level
      enhancedEvent.contestants = rankedContestants.map((contestant) => ({
        id: contestant.id,
        name: contestant.name,
        bio: contestant.bio || '',
        imageUrl: contestant.imageUrl || '',
        contestNumber: contestant.contestNumber,
        instagramUrl: contestant.instagramUrl || '',
        twitterUrl: contestant.twitterUrl || '',
        facebookUrl: contestant.facebookUrl || '',
        status: contestant.status,
        voteCount: contestant.voteCount,
        rank: contestant.rank,
      }));
    }

    // Calculate average rating
    if (event.ratings && event.ratings.length > 0) {
      const totalRating = event.ratings.reduce(
        (sum, rating) => sum + Number(rating.rating),
        0
      );
      enhancedEvent.averageRating = totalRating / event.ratings.length;
      enhancedEvent.ratingsCount = event.ratings.length;
    } else {
      enhancedEvent.averageRating = 0;
      enhancedEvent.ratingsCount = 0;
    }

    // Add computed fields for forms
    enhancedEvent.isUpcoming = new Date(event.startDateTime) > new Date();
    enhancedEvent.isOngoing =
      new Date() >= new Date(event.startDateTime) &&
      new Date() <= new Date(event.endDateTime);
    enhancedEvent.isPast = new Date(event.endDateTime) < new Date();

    // Add permissions context (you can expand this based on user role)
    enhancedEvent.permissions = {
      canEdit: true, // Will be determined by calling code based on user context
      canDelete: true,
      canPublish: true,
      canViewAnalytics: true,
    };

    return {
      success: true,
      data: enhancedEvent,
    };
  } catch (error) {
    console.error(
      `Error fetching comprehensive event data for ID ${id}:`,
      error
    );

    // Provide detailed error logging
    if (error instanceof Error) {
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }

    return {
      success: false,
      message: 'Failed to fetch event details',
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
  // Get session directly for delete operation
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
    // Check if event exists with comprehensive relations including voting contest
    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        ticketTypes: {
          include: {
            tickets: true,
          },
        },
        orders: {
          include: {
            tickets: true,
          },
        },
        waitingList: true,
        ratings: true,
        Notification: true,
        // Include voting contest data
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
      return {
        success: false,
        message: 'Event not found',
      };
    }

    // Permission check: Only SUPER_ADMIN can delete events, or event owner if organizer
    const isSuperAdmin = role === 'ADMIN' && subRole === 'SUPER_ADMIN';
    const isEventOwner = event.userId === userId && subRole === 'ORGANIZER';

    if (!isSuperAdmin && !isEventOwner) {
      return {
        success: false,
        message: 'Only Super Admins or event owners can delete events',
      };
    }

    // Check if the event has orders, tickets, or voting activity
    const hasOrders = event.orders.length > 0;
    const hasTickets = event.ticketTypes.some(
      (type) => type.tickets.length > 0
    );

    // Fix: Properly check for voting activity with null/undefined safety
    const hasVotingActivity =
      (event.votingContest?.votes?.length ?? 0) > 0 ||
      (event.votingContest?.VoteOrder?.some(
        (order) => (order.votes?.length ?? 0) > 0
      ) ??
        false);

    if (hasOrders || hasTickets || hasVotingActivity) {
      // Instead of deleting, mark as cancelled
      await prisma.event.update({
        where: { id },
        data: {
          isCancelled: true,
          publishedStatus: 'REJECTED',
        },
      });

      revalidatePath('/admin/events');
      revalidatePath('/admin/dashboard/events');
      revalidatePath('/dashboard/events');
      revalidatePath('/events');

      return {
        success: true,
        message:
          'Event has been cancelled instead of deleted because it has associated orders, tickets, or voting activity',
      };
    }

    // If no orders, tickets, or voting activity, delete in correct order
    await prisma.$transaction(async (tx) => {
      // Delete in reverse dependency order

      // 1. Delete notifications first
      await tx.notification.deleteMany({
        where: { eventId: id },
      });

      // 2. If this is a voting contest, delete voting contest data
      if (event.votingContest) {
        // Delete votes first
        await tx.vote.deleteMany({
          where: { contestId: event.votingContest.id },
        });

        // Delete vote order notifications
        const voteOrderIds =
          event.votingContest.VoteOrder?.map((order) => order.id) || [];
        if (voteOrderIds.length > 0) {
          await tx.notification.deleteMany({
            where: { voteOrderId: { in: voteOrderIds } },
          });
        }

        // Delete vote orders
        await tx.voteOrder.deleteMany({
          where: { contestId: event.votingContest.id },
        });

        // Delete vote packages
        await tx.votePackage.deleteMany({
          where: { contestId: event.votingContest.id },
        });

        // Delete contestants
        await tx.contestant.deleteMany({
          where: { contestId: event.votingContest.id },
        });

        // Delete voting contest
        await tx.votingContest.delete({
          where: { id: event.votingContest.id },
        });
      }

      // 3. Delete ratings
      await tx.rating.deleteMany({
        where: { eventId: id },
      });

      // 4. Delete waiting list entries
      await tx.waitingList.deleteMany({
        where: { eventId: id },
      });

      // 5. Delete tickets and ticket types (if any exist without orders)
      const ticketTypeIds = event.ticketTypes.map((tt) => tt.id);
      if (ticketTypeIds.length > 0) {
        // Delete ticket validations first
        await tx.ticketValidation.deleteMany({
          where: {
            ticket: {
              ticketTypeId: { in: ticketTypeIds },
            },
          },
        });

        // Delete tickets
        await tx.ticket.deleteMany({
          where: {
            ticketTypeId: { in: ticketTypeIds },
          },
        });
      }

      // 6. Delete ticket types
      await tx.ticketType.deleteMany({
        where: { eventId: id },
      });

      // 7. Disconnect tags (many-to-many relationship)
      await tx.event.update({
        where: { id },
        data: {
          tags: {
            set: [], // Disconnect all tags
          },
        },
      });

      // 8. Finally delete the event
      await tx.event.delete({
        where: { id },
      });
    });

    revalidatePath('/admin/events');
    revalidatePath('/admin/dashboard/events');
    revalidatePath('/dashboard/events');
    revalidatePath('/events');

    return {
      success: true,
      message: 'Event deleted successfully',
    };
  } catch (error) {
    console.error('Error deleting event:', error);

    // Provide more specific error information
    if (error instanceof Error) {
      console.error('Error details:', error.message);
      console.error('Error stack:', error.stack);

      // Check for specific database constraint errors
      if (error.message.includes('foreign key constraint')) {
        return {
          success: false,
          message:
            'Cannot delete event due to existing related data. Try cancelling the event instead.',
        };
      }

      if (error.message.includes('Record to delete does not exist')) {
        return {
          success: false,
          message: 'Event not found or already deleted',
        };
      }
    }

    return {
      success: false,
      message: 'Failed to delete event. Please try again or contact support.',
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
