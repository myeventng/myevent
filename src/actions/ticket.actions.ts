'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
// import { TicketStatus } from '@/generated/prisma';

interface TicketTypeInput {
  name: string;
  price: number;
  quantity: number;
  eventId: string;
}

interface UpdateTicketTypeInput extends TicketTypeInput {
  id: string;
}

interface ActionResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  alreadyUsed?: boolean;
}

// Validate ticket for event entry
export async function validateTicket(
  ticketId: string,
  eventId: string
): Promise<ActionResponse<any>> {
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

  try {
    // Check if user has permission to validate tickets for this event
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        user: true,
      },
    });

    if (!event) {
      return {
        success: false,
        message: 'Event not found',
      };
    }

    // Only event organizer or admin can validate tickets
    const isOwner = event.userId === session.user.id;
    const isAdmin = session.user.role === 'ADMIN';

    if (!isOwner && !isAdmin) {
      return {
        success: false,
        message:
          'You do not have permission to validate tickets for this event',
      };
    }

    // Find the ticket
    const ticket = await prisma.ticket.findFirst({
      where: {
        ticketId: ticketId,
        ticketType: {
          eventId: eventId,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        ticketType: {
          include: {
            event: {
              select: {
                id: true,
                title: true,
                startDateTime: true,
                endDateTime: true,
              },
            },
          },
        },
      },
    });

    if (!ticket) {
      return {
        success: false,
        message: 'Ticket not found or does not belong to this event',
      };
    }

    // Check if ticket is valid status
    if (ticket.status === 'CANCELLED' || ticket.status === 'REFUNDED') {
      return {
        success: false,
        message: `Ticket is ${ticket.status.toLowerCase()} and cannot be used`,
      };
    }

    // Check if event has started (allow entry from 1 hour before start time)
    const eventStart = new Date(ticket.ticketType.event.startDateTime);
    const oneHourBefore = new Date(eventStart.getTime() - 60 * 60 * 1000);
    const now = new Date();

    if (now < oneHourBefore) {
      return {
        success: false,
        message:
          'Event has not started yet. Entry allowed 1 hour before start time.',
      };
    }

    // Check if event has ended (allow entry until 2 hours after end time)
    const eventEnd = new Date(ticket.ticketType.event.endDateTime);
    const twoHoursAfter = new Date(eventEnd.getTime() + 2 * 60 * 60 * 1000);

    if (now > twoHoursAfter) {
      return {
        success: false,
        message: 'Event has ended and entry is no longer allowed.',
      };
    }

    const wasAlreadyUsed = ticket.status === 'USED';

    // Mark ticket as used if not already used
    if (!wasAlreadyUsed) {
      await prisma.ticket.update({
        where: { id: ticket.id },
        data: { status: 'USED' },
      });

      // Log the validation
      await prisma.ticketValidation.create({
        data: {
          ticketId: ticket.id,
          validatedBy: session.user.id,
          validatedAt: new Date(),
          eventId: eventId,
        },
      });
    }

    revalidatePath('/dashboard/scanner');
    revalidatePath('/admin/dashboard/events');

    return {
      success: true,
      message: wasAlreadyUsed
        ? 'Ticket was already used but entry is allowed'
        : 'Ticket validated successfully',
      alreadyUsed: wasAlreadyUsed,
      data: {
        id: ticket.id,
        ticketId: ticket.ticketId,
        status: wasAlreadyUsed ? 'USED' : 'USED',
        user: ticket.user,
        ticketType: {
          name: ticket.ticketType.name,
          price: ticket.ticketType.price,
        },
        purchasedAt: ticket.purchasedAt.toISOString(),
        validatedAt: new Date().toISOString(),
        validatedBy: session.user.name,
      },
    };
  } catch (error) {
    console.error('Error validating ticket:', error);
    return {
      success: false,
      message: 'Failed to validate ticket',
    };
  }
}

// Get validation history for an event
export async function getTicketValidations(
  eventId: string,
  page: number = 1,
  limit: number = 50
): Promise<ActionResponse<any>> {
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

  try {
    // Check permissions
    const event = await prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      return {
        success: false,
        message: 'Event not found',
      };
    }

    const isOwner = event.userId === session.user.id;
    const isAdmin = session.user.role === 'ADMIN';

    if (!isOwner && !isAdmin) {
      return {
        success: false,
        message:
          'You do not have permission to view validations for this event',
      };
    }

    const skip = (page - 1) * limit;

    const [validations, totalCount] = await Promise.all([
      prisma.ticketValidation.findMany({
        where: { eventId },
        include: {
          ticket: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
              ticketType: {
                select: {
                  name: true,
                  price: true,
                },
              },
            },
          },
          validator: {
            select: {
              id: true,
              name: true,
              role: true,
            },
          },
        },
        orderBy: { validatedAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.ticketValidation.count({
        where: { eventId },
      }),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return {
      success: true,
      data: {
        validations,
        totalCount,
        currentPage: page,
        totalPages,
        hasMore: page < totalPages,
      },
    };
  } catch (error) {
    console.error('Error fetching ticket validations:', error);
    return {
      success: false,
      message: 'Failed to fetch validations',
    };
  }
}

// Get ticket statistics for an event
export async function getEventTicketStats(
  eventId: string
): Promise<ActionResponse<any>> {
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

  try {
    // Check permissions
    const event = await prisma.event.findUnique({
      where: { id: eventId },
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

    const isOwner = event.userId === session.user.id;
    const isAdmin = session.user.role === 'ADMIN';

    if (!isOwner && !isAdmin) {
      return {
        success: false,
        message: 'You do not have permission to view stats for this event',
      };
    }

    // Get ticket statistics
    const ticketStats = await prisma.ticket.groupBy({
      by: ['status'],
      where: {
        ticketType: {
          eventId,
        },
      },
      _count: true,
    });

    // Get orders statistics
    const orderStats = await prisma.order.groupBy({
      by: ['paymentStatus'],
      where: { eventId },
      _count: true,
      _sum: {
        totalAmount: true,
      },
    });

    // Get refund statistics
    const refundStats = await prisma.order.groupBy({
      by: ['refundStatus'],
      where: {
        eventId,
        refundStatus: { not: null },
      },
      _count: true,
      _sum: {
        totalAmount: true,
      },
    });

    // Calculate totals
    const totalTickets = ticketStats.reduce(
      (sum, stat) => sum + stat._count,
      0
    );
    const usedTickets =
      ticketStats.find((s) => s.status === 'USED')?._count || 0;
    const unusedTickets =
      ticketStats.find((s) => s.status === 'UNUSED')?._count || 0;
    const refundedTickets =
      ticketStats.find((s) => s.status === 'REFUNDED')?._count || 0;

    const totalRevenue = orderStats
      .filter((s) => s.paymentStatus === 'COMPLETED')
      .reduce((sum, stat) => sum + (stat._sum.totalAmount || 0), 0);

    const totalRefunded = refundStats
      .filter((s) => s.refundStatus === 'PROCESSED')
      .reduce((sum, stat) => sum + (stat._sum.totalAmount || 0), 0);

    const netRevenue = totalRevenue - totalRefunded;

    // Calculate platform fee (5% default)
    const platformFee = Math.round(netRevenue * 0.05);
    const organizerRevenue = netRevenue - platformFee;

    // Get ticket type breakdown
    const ticketTypeStats = await Promise.all(
      event.ticketTypes.map(async (ticketType) => {
        const sold = await prisma.ticket.count({
          where: {
            ticketTypeId: ticketType.id,
            status: { in: ['UNUSED', 'USED'] },
          },
        });

        const used = await prisma.ticket.count({
          where: {
            ticketTypeId: ticketType.id,
            status: 'USED',
          },
        });

        const revenue =
          (await prisma.ticket.count({
            where: {
              ticketTypeId: ticketType.id,
              status: { in: ['UNUSED', 'USED'] },
            },
          })) * ticketType.price;

        return {
          id: ticketType.id,
          name: ticketType.name,
          price: ticketType.price,
          totalQuantity: ticketType.quantity + sold, // Original quantity + sold
          sold,
          used,
          remaining: ticketType.quantity,
          revenue,
        };
      })
    );

    return {
      success: true,
      data: {
        overview: {
          totalTickets,
          usedTickets,
          unusedTickets,
          refundedTickets,
          attendanceRate:
            totalTickets > 0
              ? Math.round((usedTickets / totalTickets) * 100)
              : 0,
        },
        revenue: {
          totalRevenue,
          totalRefunded,
          netRevenue,
          platformFee,
          organizerRevenue,
        },
        ticketTypes: ticketTypeStats,
        recentValidations: await prisma.ticketValidation.count({
          where: {
            eventId,
            validatedAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
            },
          },
        }),
      },
    };
  } catch (error) {
    console.error('Error fetching event ticket stats:', error);
    return {
      success: false,
      message: 'Failed to fetch ticket statistics',
    };
  }
}

// Get organizer's overall statistics
export async function getOrganizerStats(): Promise<ActionResponse<any>> {
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

  try {
    // Get organizer's events
    const events = await prisma.event.findMany({
      where: { userId: session.user.id },
      include: {
        orders: {
          where: { paymentStatus: 'COMPLETED' },
        },
        ticketTypes: {
          include: {
            tickets: true,
          },
        },
      },
    });

    // Calculate overall statistics
    let totalRevenue = 0;
    let totalTicketsSold = 0;
    let totalRefunded = 0;
    const totalEvents = events.length;
    let activeEvents = 0;

    const eventStats = events.map((event) => {
      const eventRevenue = event.orders.reduce(
        (sum, order) => sum + order.totalAmount,
        0
      );
      const ticketsSold = event.ticketTypes.reduce(
        (sum, tt) => sum + tt.tickets.length,
        0
      );

      totalRevenue += eventRevenue;
      totalTicketsSold += ticketsSold;

      if (new Date(event.endDateTime) > new Date()) {
        activeEvents++;
      }

      return {
        id: event.id,
        title: event.title,
        revenue: eventRevenue,
        ticketsSold,
        startDateTime: event.startDateTime,
        status: event.publishedStatus,
      };
    });

    // Get refunded amounts
    const refunds = await prisma.order.findMany({
      where: {
        event: { userId: session.user.id },
        refundStatus: 'PROCESSED',
      },
      select: { totalAmount: true },
    });

    totalRefunded = refunds.reduce(
      (sum, refund) => sum + refund.totalAmount,
      0
    );

    const netRevenue = totalRevenue - totalRefunded;
    const platformFee = Math.round(netRevenue * 0.05); // 5% platform fee
    const organizerEarnings = netRevenue - platformFee;

    return {
      success: true,
      data: {
        overview: {
          totalEvents,
          activeEvents,
          totalTicketsSold,
          totalRevenue,
          totalRefunded,
          netRevenue,
          platformFee,
          organizerEarnings,
        },
        events: eventStats.sort(
          (a, b) =>
            new Date(b.startDateTime).getTime() -
            new Date(a.startDateTime).getTime()
        ),
        monthlyRevenue: [], // TODO: Calculate monthly breakdown
      },
    };
  } catch (error) {
    console.error('Error fetching organizer stats:', error);
    return {
      success: false,
      message: 'Failed to fetch organizer statistics',
    };
  }
}

// Validate if user has permission to manage ticket types for an event
const validateUserPermission = async (eventId: string) => {
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

  // Admin with STAFF or SUPER_ADMIN subRole can always manage tickets
  if (role === 'ADMIN' && ['STAFF', 'SUPER_ADMIN'].includes(subRole)) {
    return {
      success: true,
      data: {
        userId,
        isAdmin: true,
      },
    };
  }

  // Check if event exists and belongs to the user
  const event = await prisma.event.findUnique({
    where: { id: eventId },
  });

  if (!event) {
    return {
      success: false,
      message: 'Event not found',
    };
  }

  // If user is an organizer and owns the event
  if (subRole === 'ORGANIZER' && event.userId === userId) {
    return {
      success: true,
      data: {
        userId,
        isAdmin: false,
      },
    };
  }

  return {
    success: false,
    message: 'You do not have permission to manage tickets for this event',
  };
};

export async function getTicketTypesByEvent(
  eventId: string
): Promise<ActionResponse<any[]>> {
  try {
    const ticketTypes = await prisma.ticketType.findMany({
      where: { eventId },
      orderBy: { price: 'asc' },
    });

    return {
      success: true,
      data: ticketTypes,
    };
  } catch (error) {
    console.error(`Error fetching ticket types for event ${eventId}:`, error);
    return {
      success: false,
      message: 'Failed to fetch ticket types',
    };
  }
}

export async function getTicketTypeById(
  id: string
): Promise<ActionResponse<any>> {
  try {
    const ticketType = await prisma.ticketType.findUnique({
      where: { id },
      include: {
        event: true,
      },
    });

    if (!ticketType) {
      return {
        success: false,
        message: 'Ticket type not found',
      };
    }

    return {
      success: true,
      data: ticketType,
    };
  } catch (error) {
    console.error(`Error fetching ticket type with ID ${id}:`, error);
    return {
      success: false,
      message: 'Failed to fetch ticket type',
    };
  }
}

export async function createTicketType(
  data: TicketTypeInput
): Promise<ActionResponse<any>> {
  // Validate user permission
  const permissionCheck = await validateUserPermission(data.eventId);
  if (!permissionCheck.success) {
    return {
      success: permissionCheck.success,
      message: permissionCheck.message,
    };
  }

  try {
    // Check if event exists
    const event = await prisma.event.findUnique({
      where: { id: data.eventId },
    });

    if (!event) {
      return {
        success: false,
        message: 'Event not found',
      };
    }

    // Create new ticket type
    const newTicketType = await prisma.ticketType.create({
      data: {
        name: data.name,
        price: data.price,
        quantity: data.quantity,
        event: { connect: { id: data.eventId } },
      },
    });

    revalidatePath(`/admin/events/${data.eventId}`);
    revalidatePath(`/dashboard/events/${data.eventId}`);
    revalidatePath(`/events/${data.eventId}`);

    return {
      success: true,
      message: 'Ticket type created successfully',
      data: newTicketType,
    };
  } catch (error) {
    console.error('Error creating ticket type:', error);
    return {
      success: false,
      message: 'Failed to create ticket type',
    };
  }
}

export async function updateTicketType(
  data: UpdateTicketTypeInput
): Promise<ActionResponse<any>> {
  try {
    // Check if ticket type exists
    const ticketType = await prisma.ticketType.findUnique({
      where: { id: data.id },
      include: {
        event: true,
      },
    });

    if (!ticketType) {
      return {
        success: false,
        message: 'Ticket type not found',
      };
    }

    // Validate user permission
    const permissionCheck = await validateUserPermission(ticketType.eventId);
    if (!permissionCheck.success) {
      return {
        success: permissionCheck.success,
        message: permissionCheck.message,
        data: null,
      };
    }

    // Update ticket type
    const updatedTicketType = await prisma.ticketType.update({
      where: { id: data.id },
      data: {
        name: data.name,
        price: data.price,
        quantity: data.quantity,
      },
    });

    revalidatePath(`/admin/events/${ticketType.eventId}`);
    revalidatePath(`/dashboard/events/${ticketType.eventId}`);
    revalidatePath(`/events/${ticketType.eventId}`);

    return {
      success: true,
      message: 'Ticket type updated successfully',
      data: updatedTicketType,
    };
  } catch (error) {
    console.error('Error updating ticket type:', error);
    return {
      success: false,
      message: 'Failed to update ticket type',
    };
  }
}

export async function deleteTicketType(
  id: string
): Promise<ActionResponse<null>> {
  try {
    // Check if ticket type exists
    const ticketType = await prisma.ticketType.findUnique({
      where: { id },
      include: {
        tickets: true,
        event: true,
      },
    });

    if (!ticketType) {
      return {
        success: false,
        message: 'Ticket type not found',
      };
    }

    // Validate user permission
    const permissionCheck = await validateUserPermission(ticketType.eventId);
    if (!permissionCheck.success) {
      return {
        success: permissionCheck.success,
        message: permissionCheck.message,
        data: null,
      };
    }

    // Check if ticket type has associated tickets
    if (ticketType.tickets.length > 0) {
      return {
        success: false,
        message: 'Cannot delete ticket type with sold tickets',
      };
    }

    // Delete ticket type
    await prisma.ticketType.delete({
      where: { id },
    });

    revalidatePath(`/admin/events/${ticketType.eventId}`);
    revalidatePath(`/dashboard/events/${ticketType.eventId}`);
    revalidatePath(`/events/${ticketType.eventId}`);

    return {
      success: true,
      message: 'Ticket type deleted successfully',
    };
  } catch (error) {
    console.error('Error deleting ticket type:', error);
    return {
      success: false,
      message: 'Failed to delete ticket type',
    };
  }
}

// User ticket actions
export async function getUserTickets(): Promise<ActionResponse<any[]>> {
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

  try {
    const tickets = await prisma.ticket.findMany({
      where: {
        userId: session.user.id,
      },
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
      orderBy: {
        purchasedAt: 'desc',
      },
    });

    return {
      success: true,
      data: tickets,
    };
  } catch (error) {
    console.error('Error fetching user tickets:', error);
    return {
      success: false,
      message: 'Failed to fetch tickets',
    };
  }
}

export async function getTicketById(id: string): Promise<ActionResponse<any>> {
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

  try {
    const ticket = await prisma.ticket.findUnique({
      where: { id },
      include: {
        ticketType: {
          include: {
            event: {
              include: {
                venue: true,
                tags: true,
                category: true,
              },
            },
          },
        },
      },
    });

    if (!ticket) {
      return {
        success: false,
        message: 'Ticket not found',
      };
    }

    // Admin can view any ticket, but regular users can only view their own tickets
    if (session.user.role !== 'ADMIN' && ticket.userId !== session.user.id) {
      return {
        success: false,
        message: 'You do not have permission to view this ticket',
      };
    }

    return {
      success: true,
      data: ticket,
    };
  } catch (error) {
    console.error(`Error fetching ticket with ID ${id}:`, error);
    return {
      success: false,
      message: 'Failed to fetch ticket',
    };
  }
}

// Add this function to your ticket-actions.ts file

export async function getAdminTickets(): Promise<ActionResponse<any[]>> {
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
  const { role, subRole } = session.user;
  if (role !== 'ADMIN' || !['STAFF', 'SUPER_ADMIN'].includes(subRole)) {
    return {
      success: false,
      message: 'You do not have permission to view admin tickets',
    };
  }

  try {
    const tickets = await prisma.ticket.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        ticketType: {
          include: {
            event: {
              select: {
                id: true,
                title: true,
                startDateTime: true,
                endDateTime: true,
                publishedStatus: true,
                venue: {
                  select: {
                    name: true,
                    address: true,
                    city: {
                      select: {
                        name: true,
                        state: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
        order: {
          select: {
            id: true,
            paystackId: true,
            paymentStatus: true,
            refundStatus: true,
            totalAmount: true,
          },
        },
      },
      orderBy: {
        purchasedAt: 'desc',
      },
    });

    return {
      success: true,
      data: tickets,
    };
  } catch (error) {
    console.error('Error fetching admin tickets:', error);
    return {
      success: false,
      message: 'Failed to fetch tickets',
    };
  }
}

// Get filtered admin tickets with pagination and search
export async function getFilteredAdminTickets(
  page: number = 1,
  limit: number = 50,
  filters?: {
    status?: string;
    eventId?: string;
    userId?: string;
    search?: string;
    dateFrom?: string;
    dateTo?: string;
  }
): Promise<ActionResponse<any>> {
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

  // Check permissions
  const { role, subRole } = session.user;
  if (role !== 'ADMIN' || !['STAFF', 'SUPER_ADMIN'].includes(subRole)) {
    return {
      success: false,
      message: 'You do not have permission to view admin tickets',
    };
  }

  try {
    const skip = (page - 1) * limit;

    // Build where clause based on filters
    const whereClause: any = {};

    if (filters?.status && filters.status !== 'all') {
      whereClause.status = filters.status;
    }

    if (filters?.eventId) {
      whereClause.ticketType = {
        eventId: filters.eventId,
      };
    }

    if (filters?.userId) {
      whereClause.userId = filters.userId;
    }

    if (filters?.dateFrom || filters?.dateTo) {
      whereClause.purchasedAt = {};
      if (filters.dateFrom) {
        whereClause.purchasedAt.gte = new Date(filters.dateFrom);
      }
      if (filters.dateTo) {
        whereClause.purchasedAt.lte = new Date(filters.dateTo);
      }
    }

    // Handle search across multiple fields
    if (filters?.search) {
      const searchTerm = filters.search.toLowerCase();
      whereClause.OR = [
        {
          ticketId: {
            contains: searchTerm,
            mode: 'insensitive',
          },
        },
        {
          user: {
            name: {
              contains: searchTerm,
              mode: 'insensitive',
            },
          },
        },
        {
          user: {
            email: {
              contains: searchTerm,
              mode: 'insensitive',
            },
          },
        },
        {
          ticketType: {
            name: {
              contains: searchTerm,
              mode: 'insensitive',
            },
          },
        },
        {
          ticketType: {
            event: {
              title: {
                contains: searchTerm,
                mode: 'insensitive',
              },
            },
          },
        },
      ];
    }

    const [tickets, totalCount] = await Promise.all([
      prisma.ticket.findMany({
        where: whereClause,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
          ticketType: {
            include: {
              event: {
                select: {
                  id: true,
                  title: true,
                  startDateTime: true,
                  endDateTime: true,
                  publishedStatus: true,
                  venue: {
                    select: {
                      name: true,
                      address: true,
                      city: {
                        select: {
                          name: true,
                          state: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          order: {
            select: {
              id: true,
              paystackId: true,
              paymentStatus: true,
              refundStatus: true,
              totalAmount: true,
            },
          },
        },
        orderBy: {
          purchasedAt: 'desc',
        },
        skip,
        take: limit,
      }),
      prisma.ticket.count({
        where: whereClause,
      }),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    // Calculate summary statistics for current filter
    const statusStats = await prisma.ticket.groupBy({
      by: ['status'],
      where: whereClause,
      _count: true,
    });

    const stats = {
      total: totalCount,
      unused: statusStats.find((s) => s.status === 'UNUSED')?._count || 0,
      used: statusStats.find((s) => s.status === 'USED')?._count || 0,
      refunded: statusStats.find((s) => s.status === 'REFUNDED')?._count || 0,
      cancelled: statusStats.find((s) => s.status === 'CANCELLED')?._count || 0,
    };

    return {
      success: true,
      data: {
        tickets,
        pagination: {
          currentPage: page,
          totalPages,
          totalCount,
          limit,
          hasMore: page < totalPages,
        },
        stats,
      },
    };
  } catch (error) {
    console.error('Error fetching filtered admin tickets:', error);
    return {
      success: false,
      message: 'Failed to fetch tickets',
    };
  }
}

// Get admin ticket statistics
export async function getAdminTicketStats(): Promise<ActionResponse<any>> {
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

  // Check permissions
  const { role, subRole } = session.user;
  if (role !== 'ADMIN' || !['STAFF', 'SUPER_ADMIN'].includes(subRole)) {
    return {
      success: false,
      message: 'You do not have permission to view admin statistics',
    };
  }

  try {
    // Get ticket status breakdown
    const ticketStats = await prisma.ticket.groupBy({
      by: ['status'],
      _count: true,
    });

    // Get total revenue from completed orders
    const revenueStats = await prisma.order.aggregate({
      where: {
        paymentStatus: 'COMPLETED',
      },
      _sum: {
        totalAmount: true,
      },
      _count: true,
    });

    // Get refund statistics
    const refundStats = await prisma.order.aggregate({
      where: {
        refundStatus: 'PROCESSED',
      },
      _sum: {
        totalAmount: true,
      },
      _count: true,
    });

    // Calculate platform fees (assuming 5% fee)
    const totalRevenue = revenueStats._sum.totalAmount || 0;
    const totalRefunded = refundStats._sum.totalAmount || 0;
    const netRevenue = totalRevenue - totalRefunded;
    const platformFees = Math.round(netRevenue * 0.05);

    // Get recent activity (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentActivity = await prisma.ticket.count({
      where: {
        purchasedAt: {
          gte: thirtyDaysAgo,
        },
      },
    });

    // Get top events by ticket sales
    const topEvents = await prisma.event.findMany({
      include: {
        ticketTypes: {
          include: {
            tickets: {
              where: {
                status: { in: ['UNUSED', 'USED'] },
              },
            },
          },
        },
        venue: {
          select: {
            name: true,
            city: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      take: 10,
    });

    const eventStats = topEvents
      .map((event) => {
        const ticketsSold = event.ticketTypes.reduce(
          (sum, tt) => sum + tt.tickets.length,
          0
        );
        const revenue = event.ticketTypes.reduce(
          (sum, tt) => sum + tt.tickets.length * tt.price,
          0
        );

        return {
          id: event.id,
          title: event.title,
          startDateTime: event.startDateTime,
          venue: event.venue,
          ticketsSold,
          revenue,
        };
      })
      .sort((a, b) => b.ticketsSold - a.ticketsSold)
      .slice(0, 5);

    const totalTickets = ticketStats.reduce(
      (sum, stat) => sum + stat._count,
      0
    );

    return {
      success: true,
      data: {
        overview: {
          totalTickets,
          totalRevenue,
          totalRefunded,
          netRevenue,
          platformFees,
          recentActivity,
        },
        ticketsByStatus: ticketStats.reduce(
          (acc, stat) => {
            acc[stat.status.toLowerCase()] = stat._count;
            return acc;
          },
          {} as Record<string, number>
        ),
        topEvents: eventStats,
        orders: {
          completed: revenueStats._count,
          refunded: refundStats._count,
        },
      },
    };
  } catch (error) {
    console.error('Error fetching admin ticket statistics:', error);
    return {
      success: false,
      message: 'Failed to fetch statistics',
    };
  }
}
