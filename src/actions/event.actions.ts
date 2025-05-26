'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { AgeRestriction, DressCode, PublishedStatus } from '@/generated/prisma';

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
  const baseSlug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  let slug = baseSlug;
  let counter = 0;

  while (true) {
    const existingEvent = await prisma.event.findUnique({
      where: { slug },
    });

    if (!existingEvent || (eventId && existingEvent.id === eventId)) {
      break;
    }

    counter++;
    slug = `${baseSlug}-${counter}`;
  }

  return slug;
};

// Validate if user has permission to create/modify events
const validateUserPermission = async () => {
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
      data: {
        userId: session.user.id,
        isAdmin: true,
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
      data: {
        userId: session.user.id,
        isAdmin: false,
      },
    };
  }

  return {
    success: false,
    message: 'You do not have permission to perform this action',
  };
};

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
      },
      orderBy: { startDateTime: 'asc' },
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

    // Add price range filter
    if (priceRange) {
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
      default:
        orderBy = { startDateTime: sortOrder };
    }

    // Get total count for pagination
    const totalCount = await prisma.event.count({ where });

    // Fetch events
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
        ticketTypes: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            organizerProfile: true,
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
    console.error(`Error fetching event with ID ${id}:`, error);
    return {
      success: false,
      message: 'Failed to fetch event',
    };
  }
}

export async function getEventBySlug(
  slug: string
): Promise<ActionResponse<any>> {
  try {
    const event = await prisma.event.findUnique({
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

export async function createEvent(
  data: EventInput
): Promise<ActionResponse<any>> {
  // Validate user permission
  const permissionCheck = await validateUserPermission();
  if (!permissionCheck.success) {
    return permissionCheck;
  }

  const userId = permissionCheck.data!.userId;

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
        publishedStatus: data.publishedStatus || 'DRAFT',
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

    revalidatePath('/admin/events');
    revalidatePath('/dashboard/events');
    revalidatePath('/events');

    return {
      success: true,
      message: 'Event created successfully',
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

export async function updateEvent(
  data: UpdateEventInput
): Promise<ActionResponse<any>> {
  // Validate user permission
  const permissionCheck = await validateUserPermission();
  if (!permissionCheck.success) {
    return permissionCheck;
  }

  const userId = permissionCheck.data!.userId;
  const isAdmin = permissionCheck.data!.isAdmin;

  try {
    // Check if event exists
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

    // Generate new slug if title changed
    let slug = existingEvent.slug;
    if (data.title !== existingEvent.title) {
      slug = await generateSlug(data.title, data.id);
    }

    // Get the existing tag IDs
    const existingTagIds = existingEvent.tags.map((tag) => tag.id);

    // Create arrays for disconnecting and connecting tags
    const disconnectTags = existingTagIds.filter(
      (id) => !data.tagIds.includes(id)
    );
    const connectTags = data.tagIds.filter(
      (id) => !existingTagIds.includes(id)
    );

    // Update event
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
          disconnect: disconnectTags.map((id) => ({ id })),
          connect: connectTags.map((id) => ({ id })),
        },
        category: data.categoryId
          ? { connect: { id: data.categoryId } }
          : { disconnect: true },
        venue: { connect: { id: data.venueId } },
        City: data.cityId
          ? { connect: { id: data.cityId } }
          : { disconnect: true },
        publishedStatus: data.publishedStatus || existingEvent.publishedStatus,
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

    revalidatePath('/admin/events');
    revalidatePath('/dashboard/events');
    revalidatePath(`/events/${updatedEvent.slug}`);
    revalidatePath(`/events/${data.id}`);
    revalidatePath('/events');

    return {
      success: true,
      message: 'Event updated successfully',
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

export async function deleteEvent(id: string): Promise<ActionResponse<null>> {
  // Validate user permission
  const permissionCheck = await validateUserPermission();
  if (!permissionCheck.success) {
    return permissionCheck;
  }

  const userId = permissionCheck.data!.userId;
  const isAdmin = permissionCheck.data!.isAdmin;

  try {
    // Check if event exists
    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        ticketTypes: {
          include: {
            tickets: true,
          },
        },
        orders: true,
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
        message: 'You can only delete events that you created',
      };
    }

    // Check if the event has orders or tickets
    const hasOrders = event.orders.length > 0;
    const hasTickets = event.ticketTypes.some(
      (type) => type.tickets.length > 0
    );

    if (hasOrders || hasTickets) {
      // Instead of deleting, mark as cancelled
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
          'Event has been cancelled instead of deleted because it has associated orders or tickets',
      };
    }

    // If no orders or tickets, we can safely delete
    await prisma.event.delete({
      where: { id },
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

export async function publishEvent(id: string): Promise<ActionResponse<any>> {
  // Validate user permission
  const permissionCheck = await validateUserPermission();
  if (!permissionCheck.success) {
    return permissionCheck;
  }

  const userId = permissionCheck.data!.userId;
  const isAdmin = permissionCheck.data!.isAdmin;

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
