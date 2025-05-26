'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { TicketStatus } from '@/generated/prisma';

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
    return permissionCheck;
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
      return permissionCheck;
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
      return permissionCheck;
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
