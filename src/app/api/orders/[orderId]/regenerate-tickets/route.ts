// src/app/api/orders/[orderId]/regenerate-tickets/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { PaymentStatus, TicketStatus } from '@/generated/prisma';
import crypto from 'crypto';

export const runtime = 'nodejs';

// Generate unique ticket ID
const generateTicketId = (orderId: string, idx: number): string => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const randomBytes = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `TKT-${orderId.slice(-6)}-${timestamp}-${randomBytes}-${idx + 1}`;
};

export async function POST(
  _req: NextRequest,
  context: { params: Promise<{ orderId: string }> }
) {
  try {
    // Await the params Promise
    const { orderId } = await context.params;

    const headersList = await headers();
    const session = await auth.api.getSession({ headers: headersList });

    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        buyer: true,
        event: {
          include: {
            ticketTypes: true,
            venue: { include: { city: true } },
            user: true,
          },
        },
        tickets: {
          include: { ticketType: true },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Check permissions - Admin or event organizer
    const isAdmin =
      session.user.role === 'ADMIN' &&
      ['STAFF', 'SUPER_ADMIN'].includes(session.user.subRole);
    const isOrganizerOwner = order.event?.userId === session.user.id;

    if (!isAdmin && !isOrganizerOwner) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    // Check if order is completed
    if (order.paymentStatus !== PaymentStatus.COMPLETED) {
      return NextResponse.json(
        { error: 'Order must be completed to generate tickets' },
        { status: 400 }
      );
    }

    // Check if tickets already exist
    if (order.tickets && order.tickets.length > 0) {
      return NextResponse.json(
        { error: 'Tickets already exist for this order' },
        { status: 400 }
      );
    }

    // Calculate ticket distribution based on order amount and available ticket types
    const availableTicketTypes = order.event.ticketTypes.filter(
      (tt) => tt.quantity >= 0
    );

    if (availableTicketTypes.length === 0) {
      return NextResponse.json(
        { error: 'No ticket types available for this event' },
        { status: 400 }
      );
    }

    // Smart distribution logic
    let ticketDistribution: { ticketTypeId: string; quantity: number }[] = [];

    if (availableTicketTypes.length === 1) {
      // Single ticket type - assign all quantity
      ticketDistribution = [
        {
          ticketTypeId: availableTicketTypes[0].id,
          quantity: order.quantity,
        },
      ];
    } else {
      // Multiple ticket types - distribute based on price points
      const totalOrderValue = order.totalAmount;
      let remainingQuantity = order.quantity;
      let remainingValue = totalOrderValue;

      // Sort ticket types by price (ascending)
      const sortedTypes = [...availableTicketTypes].sort(
        (a, b) => a.price - b.price
      );

      for (let i = 0; i < sortedTypes.length; i++) {
        const ticketType = sortedTypes[i];

        if (i === sortedTypes.length - 1) {
          // Last ticket type gets remaining quantity
          if (remainingQuantity > 0) {
            ticketDistribution.push({
              ticketTypeId: ticketType.id,
              quantity: remainingQuantity,
            });
          }
        } else {
          // Calculate how many tickets of this type the remaining value can buy
          const maxAffordable = Math.floor(remainingValue / ticketType.price);
          const allocatedQuantity = Math.min(maxAffordable, remainingQuantity);

          if (allocatedQuantity > 0) {
            ticketDistribution.push({
              ticketTypeId: ticketType.id,
              quantity: allocatedQuantity,
            });

            remainingQuantity -= allocatedQuantity;
            remainingValue -= allocatedQuantity * ticketType.price;
          }
        }
      }
    }

    // Validate distribution
    const totalDistributed = ticketDistribution.reduce(
      (sum, dist) => sum + dist.quantity,
      0
    );
    if (totalDistributed !== order.quantity) {
      return NextResponse.json(
        {
          error: `Cannot distribute ${order.quantity} tickets across available types`,
        },
        { status: 400 }
      );
    }

    // Create tickets in database transaction
    const result = await prisma.$transaction(async (tx) => {
      const createdTickets = [];
      let ticketIndex = 0;

      for (const distribution of ticketDistribution) {
        const ticketType = availableTicketTypes.find(
          (tt) => tt.id === distribution.ticketTypeId
        );

        for (let i = 0; i < distribution.quantity; i++) {
          const ticketId = generateTicketId(order.id, ticketIndex);
          const qrCodeData = JSON.stringify({
            type: 'EVENT_TICKET',
            ticketId,
            eventId: order.event.id,
            userId: order.buyerId,
            issuedAt: Date.now(),
          });

          const ticket = await tx.ticket.create({
            data: {
              ticketId,
              userId: order.buyerId,
              ticketTypeId: distribution.ticketTypeId,
              orderId: order.id,
              status: TicketStatus.UNUSED,
              purchasedAt: new Date(),
              qrCodeData,
            },
            include: {
              ticketType: {
                include: {
                  event: { include: { venue: { include: { city: true } } } },
                },
              },
            },
          });

          createdTickets.push(ticket);
          ticketIndex++;
        }
      }

      return createdTickets;
    });

    // Send ticket email
    try {
      const { ticketEmailService } = await import('@/lib/email-service');
      await ticketEmailService.sendTicketEmail(order, result);
    } catch (emailError) {
      console.error('Error sending ticket email:', emailError);
      // Don't fail the entire operation if email fails
    }

    return NextResponse.json({
      success: true,
      message: `Successfully generated ${result.length} tickets`,
      data: {
        ticketsGenerated: result.length,
        ticketTypes: ticketDistribution,
      },
    });
  } catch (error) {
    console.error('Error regenerating tickets:', error);
    return NextResponse.json(
      { error: 'Failed to regenerate tickets' },
      { status: 500 }
    );
  }
}
