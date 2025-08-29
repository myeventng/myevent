// src/app/api/orders/[orderId]/tickets/route.ts -
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import {
  PDFTicketGenerator,
  formatPrice,
  formatDateTime,
} from '@/utils/pdf-ticket-generator';
import { PaymentStatus } from '@/generated/prisma';

export const runtime = 'nodejs';

export async function GET(
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
            user: true,
            venue: { include: { city: true } },
            ticketTypes: true,
          },
        },
        tickets: {
          include: {
            ticketType: {
              include: {
                event: {
                  include: {
                    venue: { include: { city: true } },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (order.paymentStatus !== PaymentStatus.COMPLETED) {
      return NextResponse.json(
        { error: 'Order not completed' },
        { status: 400 }
      );
    }

    // Permission check
    const isAdmin =
      session.user.role === 'ADMIN' &&
      ['STAFF', 'SUPER_ADMIN'].includes(session.user.subRole);
    const isOrganizerOwner = order.event?.userId === session.user.id;

    if (!isAdmin && !isOrganizerOwner) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    // Check if tickets exist
    if (!order.tickets || order.tickets.length === 0) {
      return NextResponse.json(
        {
          error: 'No tickets found for this order',
          message:
            'Tickets may not have been generated yet. Please regenerate tickets first.',
          action: 'regenerate_tickets',
        },
        { status: 404 }
      );
    }

    // Use your PDF generator for multiple tickets
    if (order.tickets.length === 1) {
      // Single ticket - use your existing generator
      const ticket = order.tickets[0];
      const generator = new PDFTicketGenerator();

      const ticketData = {
        ticketId: ticket.ticketId,
        eventTitle: ticket.ticketType.event.title,
        eventDate: formatDateTime(ticket.ticketType.event.startDateTime),
        venue: `${ticket.ticketType.event.venue.name}${
          ticket.ticketType.event.venue.city?.name
            ? `, ${ticket.ticketType.event.venue.city.name}`
            : ''
        }`,
        ticketType: ticket.ticketType.name,
        price: formatPrice(ticket.ticketType.price),
        customerName: order.buyer?.name || 'Unknown',
        customerEmail: order.buyer?.email || 'Unknown',
        purchaseDate: formatDateTime(ticket.purchasedAt),
        status: ticket.status,
        qrCode: ticket.qrCodeData || 'available',
        orderId: order.id,
        quantity: order.quantity,
        eventId: order.eventId,
      };

      await generator.generateTicket(ticketData);
      const blob = generator.getBlob();

      // Convert blob to buffer
      const arrayBuffer = await blob.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="ticket-${ticket.ticketId}.pdf"`,
          'Cache-Control': 'no-store',
        },
      });
    } else {
      // Multiple tickets - generate a combined PDF using your template style
      const generator = new PDFTicketGenerator();

      // We'll create multiple pages, one per ticket
      let isFirstTicket = true;

      for (const ticket of order.tickets) {
        if (!isFirstTicket) {
          // Add new page for subsequent tickets
          generator['doc'].addPage();
        }

        const ticketData = {
          ticketId: ticket.ticketId,
          eventTitle: ticket.ticketType.event.title,
          eventDate: formatDateTime(ticket.ticketType.event.startDateTime),
          venue: `${ticket.ticketType.event.venue.name}${
            ticket.ticketType.event.venue.city?.name
              ? `, ${ticket.ticketType.event.venue.city.name}`
              : ''
          }`,
          ticketType: ticket.ticketType.name,
          price: formatPrice(ticket.ticketType.price),
          customerName: order.buyer?.name || 'Unknown',
          customerEmail: order.buyer?.email || 'Unknown',
          purchaseDate: formatDateTime(ticket.purchasedAt),
          status: ticket.status,
          qrCode: ticket.qrCodeData || 'available',
          orderId: order.id,
          quantity: 1, // Individual ticket quantity
          eventId: order.eventId,
        };

        await generator.generateTicket(ticketData);
        isFirstTicket = false;
      }

      const blob = generator.getBlob();

      // Convert blob to buffer
      const arrayBuffer = await blob.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="order-${order.id.slice(-8)}-tickets.pdf"`,
          'Cache-Control': 'no-store',
        },
      });
    }
  } catch (error) {
    console.error('Error generating PDF tickets:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate tickets PDF',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
