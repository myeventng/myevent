// actions/email-ticket-actions.ts - Updated with guest support
'use server';

import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { emailTicketService } from '@/lib/email-ticket-service';
import { Prisma } from '@/generated/prisma';

interface ActionResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}

// Helper to extract guest info
function extractGuestInfo(order: any) {
  if (!order?.purchaseNotes) return null;

  try {
    const notes = JSON.parse(order.purchaseNotes);
    if (notes.isGuestPurchase) {
      return {
        name: notes.guestName,
        email: notes.guestEmail,
        phone: notes.guestPhone,
      };
    }
  } catch (error) {
    console.error('Failed to parse guest info:', error);
  }

  return null;
}

// Define the ticket type with includes
type TicketWithIncludes = Prisma.TicketGetPayload<{
  include: {
    user: {
      select: {
        id: true;
        name: true;
        email: true;
      };
    };
    ticketType: {
      include: {
        event: {
          include: {
            venue: {
              include: {
                city: true;
              };
            };
          };
        };
      };
    };
    order: {
      select: {
        id: true;
        totalAmount: true;
        quantity: true;
        paymentStatus: true;
        purchaseNotes: true;
      };
    };
    validations: {
      include: {
        validator: {
          select: {
            name: true;
          };
        };
      };
    };
  };
}>;

type BulkTicketWithIncludes = Prisma.TicketGetPayload<{
  include: {
    user: {
      select: {
        id: true;
        name: true;
        email: true;
      };
    };
    ticketType: {
      include: {
        event: {
          include: {
            venue: {
              include: {
                city: true;
              };
            };
          };
        };
      };
    };
    order: {
      select: {
        id: true;
        totalAmount: true;
        quantity: true;
        paymentStatus: true;
        purchaseNotes: true;
      };
    };
  };
}>;

// Resend individual ticket email with guest support
export async function resendTicketEmail(
  ticketId: string
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
    // Fetch ticket with all related data
    const ticket: TicketWithIncludes | null = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        ticketType: {
          include: {
            event: {
              include: {
                venue: {
                  include: {
                    city: true,
                  },
                },
              },
            },
          },
        },
        order: {
          select: {
            id: true,
            totalAmount: true,
            quantity: true,
            paymentStatus: true,
            purchaseNotes: true,
          },
        },
        validations: {
          include: {
            validator: {
              select: {
                name: true,
              },
            },
          },
          orderBy: {
            validatedAt: 'desc',
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

    // Extract guest info or use authenticated user info
    const guestInfo = extractGuestInfo(ticket.order);
    const isGuest = !ticket.userId || !!guestInfo;

    const customerEmail = ticket.user?.email || guestInfo?.email;
    const customerName = ticket.user?.name || guestInfo?.name || 'Guest User';

    if (!customerEmail) {
      return {
        success: false,
        message: 'No email address found for this ticket',
      };
    }

    // Check permissions
    const isAdmin =
      session.user.role === 'ADMIN' &&
      ['STAFF', 'SUPER_ADMIN'].includes(session.user.subRole);
    const isEventOwner = ticket.ticketType.event.userId === session.user.id;
    const isTicketOwner = ticket.userId === session.user.id;

    if (!isAdmin && !isEventOwner && !isTicketOwner) {
      return {
        success: false,
        message: 'You do not have permission to resend this ticket',
      };
    }

    // Send the email with guest information
    const emailResult = await emailTicketService.sendTicketEmail({
      ticket,
      customerEmail,
      customerName,
    });

    if (emailResult.success) {
      // Log the email activity
      await prisma.auditLog.create({
        data: {
          userId: session.user.id,
          action: 'RESEND_TICKET_EMAIL',
          entity: 'TICKET',
          entityId: ticket.id,
          newValues: {
            recipientEmail: customerEmail,
            recipientName: customerName,
            isGuest,
            sentAt: new Date().toISOString(),
          },
        },
      });
    }

    return {
      success: emailResult.success,
      message: emailResult.message,
      data: {
        ticketId: ticket.ticketId,
        customerEmail,
        customerName,
        isGuest,
        eventTitle: ticket.ticketType.event.title,
      },
    };
  } catch (error) {
    console.error('Error resending ticket email:', error);
    return {
      success: false,
      message: 'Failed to resend ticket email due to an unexpected error',
    };
  }
}

// Resend multiple ticket emails with guest tracking
export async function resendBulkTicketEmails(
  ticketIds: string[]
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

  // Only admins can do bulk operations
  const isAdmin =
    session.user.role === 'ADMIN' &&
    ['STAFF', 'SUPER_ADMIN'].includes(session.user.subRole);
  if (!isAdmin) {
    return {
      success: false,
      message: 'You do not have permission to perform bulk email operations',
    };
  }

  try {
    // Fetch all tickets including guest purchases
    const tickets: BulkTicketWithIncludes[] = await prisma.ticket.findMany({
      where: {
        id: { in: ticketIds },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        ticketType: {
          include: {
            event: {
              include: {
                venue: {
                  include: {
                    city: true,
                  },
                },
              },
            },
          },
        },
        order: {
          select: {
            id: true,
            totalAmount: true,
            quantity: true,
            paymentStatus: true,
            purchaseNotes: true,
          },
        },
      },
    });

    // Prepare tickets for bulk email, including guest tickets
    const ticketEmailData = tickets
      .map((ticket) => {
        const guestInfo = extractGuestInfo(ticket.order);
        const email = ticket.user?.email || guestInfo?.email;
        const name = ticket.user?.name || guestInfo?.name || 'Guest User';

        if (!email) return null;

        return {
          ticket,
          customerEmail: email,
          customerName: name,
        };
      })
      .filter((data): data is NonNullable<typeof data> => data !== null);

    if (ticketEmailData.length === 0) {
      return {
        success: false,
        message: 'No valid tickets found with customer emails',
      };
    }

    // Send bulk emails
    const bulkResult =
      await emailTicketService.sendBulkTicketEmails(ticketEmailData);

    // Count guest vs authenticated tickets
    const guestCount = ticketEmailData.filter(
      (data) => !data.ticket.userId || !!extractGuestInfo(data.ticket.order)
    ).length;
    const authenticatedCount = bulkResult.results.length - guestCount;

    // Log the bulk operation
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'BULK_RESEND_TICKET_EMAILS',
        entity: 'TICKET',
        newValues: {
          ticketCount: tickets.length,
          successCount: bulkResult.results.filter((r) => r.success).length,
          failureCount: bulkResult.results.filter((r) => !r.success).length,
          guestCount,
          authenticatedCount,
          sentAt: new Date().toISOString(),
        },
      },
    });

    return {
      success: bulkResult.success,
      message: bulkResult.message,
      data: {
        totalTickets: tickets.length,
        successCount: bulkResult.results.filter((r) => r.success).length,
        guestCount,
        authenticatedCount,
        results: bulkResult.results,
      },
    };
  } catch (error) {
    console.error('Error in bulk email operation:', error);
    return {
      success: false,
      message: 'Failed to send bulk ticket emails due to an unexpected error',
    };
  }
}

// Get email history for a ticket
export async function getTicketEmailHistory(
  ticketId: string
): Promise<ActionResponse<any[]>> {
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
    const emailHistory = await prisma.auditLog.findMany({
      where: {
        entityId: ticketId,
        entity: 'TICKET',
        action: { in: ['RESEND_TICKET_EMAIL', 'SEND_TICKET_EMAIL'] },
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      success: true,
      data: emailHistory,
    };
  } catch (error) {
    console.error('Error fetching email history:', error);
    return {
      success: false,
      message: 'Failed to fetch email history',
    };
  }
}
