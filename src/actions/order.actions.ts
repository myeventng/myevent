// src/actions/order.actions.ts - Fixed version
'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import {
  PaymentStatus,
  RefundStatus,
  TicketStatus,
  WaitingStatus,
} from '@/generated/prisma';
import { createTicketNotification } from '@/actions/notification.actions';
import { ticketEmailService } from '@/lib/email-service';
import {
  getSetting,
  getPlatformFeePercentage,
} from '@/actions/platform-settings.actions';
import crypto from 'crypto';

interface ActionResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

interface InitiateOrderInput {
  eventId: string;
  ticketSelections: {
    ticketTypeId: string;
    quantity: number;
  }[];
  purchaseNotes?: string;
}

interface PaystackConfig {
  secretKey: string;
  publicKey: string;
  baseUrl: string;
}

interface TicketToCreate {
  ticketId: string;
  userId: string;
  ticketTypeId: string;
  status: TicketStatus;
  purchasedAt: Date;
  qrCodeData?: string;
}

// Generate unique ticket ID
const generateTicketId = (): string => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substr(2, 6).toUpperCase();
  return `TKT-${timestamp}-${random}`;
};

// Get Paystack configuration from platform settings
const getPaystackConfig = async () => {
  const [secretKey, publicKey] = await Promise.all([
    getSetting('financial.paystackSecretKey'),
    getSetting('financial.paystackPublicKey'),
  ]);

  return {
    secretKey: secretKey || process.env.PAYSTACK_SECRET_KEY,
    publicKey: publicKey || process.env.PAYSTACK_PUBLIC_KEY,
    baseUrl: 'https://api.paystack.co',
  };
};

// Calculate platform fee
const calculatePlatformFee = async (amount: number): Promise<number> => {
  const feePercentage = await getPlatformFeePercentage();
  return Math.round((amount * feePercentage) / 100);
};

// Initiate order and payment
export async function initiateOrder(
  data: InitiateOrderInput
): Promise<ActionResponse<any>> {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session) {
    return { success: false, message: 'Not authenticated' };
  }

  try {
    // Check if registrations are allowed
    const allowRegistrations = await getSetting('general.allowRegistrations');
    if (allowRegistrations === false) {
      return {
        success: false,
        message: 'New ticket purchases are currently disabled',
      };
    }

    // Validate event and get ticket types
    const event = await prisma.event.findUnique({
      where: { id: data.eventId },
      include: { ticketTypes: true, venue: true },
    });

    if (!event || event.publishedStatus !== 'PUBLISHED' || event.isCancelled) {
      return { success: false, message: 'Event not available for booking' };
    }

    if (new Date(event.startDateTime) < new Date()) {
      return { success: false, message: 'Cannot book tickets for past events' };
    }

    // Validate ticket selections and calculate totals
    let totalAmount = 0;
    let totalQuantity = 0;
    const validatedSelections = [];

    for (const selection of data.ticketSelections) {
      const ticketType = event.ticketTypes.find(
        (tt) => tt.id === selection.ticketTypeId
      );

      if (!ticketType) {
        return { success: false, message: 'Invalid ticket type' };
      }

      if (selection.quantity <= 0 || selection.quantity > ticketType.quantity) {
        return {
          success: false,
          message: `Invalid quantity for ${ticketType.name}`,
        };
      }

      totalAmount += ticketType.price * selection.quantity;
      totalQuantity += selection.quantity;
      validatedSelections.push({
        ticketTypeId: selection.ticketTypeId,
        quantity: selection.quantity,
        price: ticketType.price,
        name: ticketType.name,
      });
    }

    // Check attendee limit
    if (event.attendeeLimit) {
      const existingTickets = await prisma.ticket.count({
        where: {
          ticketType: { eventId: event.id },
          status: { in: ['UNUSED', 'USED'] },
        },
      });

      if (existingTickets + totalQuantity > event.attendeeLimit) {
        return { success: false, message: 'Event capacity exceeded' };
      }
    }

    const platformFee = await calculatePlatformFee(totalAmount);
    const paystackReference = `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create order with simplified data storage
    const order = await prisma.order.create({
      data: {
        paystackId: paystackReference,
        totalAmount,
        quantity: totalQuantity,
        platformFee,
        paymentStatus: 'PENDING',
        eventId: data.eventId,
        buyerId: session.user.id,
        purchaseNotes: JSON.stringify({
          note: data.purchaseNotes || '',
          selections: validatedSelections, // Store complete selection data
        }),
      },
    });

    // Handle free events immediately
    if (event.isFree || totalAmount === 0) {
      return await completeOrder(order.id);
    }

    // Initialize Paystack payment
    const paystackConfig = await getPaystackConfig();
    if (!paystackConfig.secretKey) {
      await prisma.order.delete({ where: { id: order.id } });
      return { success: false, message: 'Payment system not configured' };
    }

    const paystackResponse = await fetch(
      `${paystackConfig.baseUrl}/transaction/initialize`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${paystackConfig.secretKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: session.user.email,
          amount: totalAmount * 100, // Convert to kobo
          reference: paystackReference,
          callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/payment/callback`,
          metadata: {
            orderId: order.id,
            eventId: data.eventId,
            userId: session.user.id,
            eventTitle: event.title,
          },
        }),
      }
    );

    const paystackData = await paystackResponse.json();

    if (!paystackData.status) {
      await prisma.order.delete({ where: { id: order.id } });
      return {
        success: false,
        message: paystackData.message || 'Failed to initialize payment',
      };
    }

    return {
      success: true,
      message: 'Order created successfully',
      data: {
        orderId: order.id,
        paymentUrl: paystackData.data.authorization_url,
        reference: paystackReference,
        amount: totalAmount,
        platformFee,
      },
    };
  } catch (error) {
    console.error('Error initiating order:', error);
    return { success: false, message: 'Failed to create order' };
  }
}

// Complete order after payment verification
export async function completeOrder(
  orderId: string,
  paystackReference?: string
): Promise<ActionResponse<any>> {
  console.log(`Starting order completion for: ${orderId}`);

  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        buyer: true,
        event: {
          include: {
            ticketTypes: true,
            venue: { include: { city: true } },
          },
        },
      },
    });

    if (!order) {
      return { success: false, message: 'Order not found' };
    }

    if (order.paymentStatus === 'COMPLETED') {
      return { success: true, message: 'Order already completed', data: order };
    }

    // Verify payment for paid events
    if (!order.event.isFree && order.totalAmount > 0 && paystackReference) {
      const paystackConfig = await getPaystackConfig();
      if (!paystackConfig.secretKey) {
        return { success: false, message: 'Payment system not configured' };
      }

      console.log(`Verifying payment for reference: ${paystackReference}`);
      const verifyResponse = await fetch(
        `${paystackConfig.baseUrl}/transaction/verify/${paystackReference}`,
        {
          headers: { Authorization: `Bearer ${paystackConfig.secretKey}` },
          cache: 'no-store',
        }
      );

      const verifyData = await verifyResponse.json();
      if (!verifyData?.status || verifyData?.data?.status !== 'success') {
        return { success: false, message: 'Payment verification failed' };
      }

      // Verify amount
      const paidKobo = Number(verifyData.data.amount);
      const orderKobo = Math.round(Number(order.totalAmount) * 100);
      if (paidKobo !== orderKobo) {
        return { success: false, message: 'Payment amount mismatch' };
      }
    }

    // Parse ticket selections from order
    let ticketSelections = [];
    try {
      const purchaseData = JSON.parse(order.purchaseNotes || '{}');
      ticketSelections = purchaseData.selections || [];
    } catch (error) {
      console.error('Failed to parse ticket selections:', error);
      return { success: false, message: 'Invalid order data' };
    }

    if (!ticketSelections.length) {
      return { success: false, message: 'No ticket selections found' };
    }

    // Validate ticket availability before creating tickets
    for (const selection of ticketSelections) {
      const ticketType = order.event.ticketTypes.find(
        (tt) => tt.id === selection.ticketTypeId
      );
      if (!ticketType || ticketType.quantity < selection.quantity) {
        return {
          success: false,
          message: `Insufficient tickets available for ${selection.name || 'selected type'}`,
        };
      }
    }

    // Execute order completion in transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create tickets
      const ticketsToCreate = [];
      for (const selection of ticketSelections) {
        for (let i = 0; i < selection.quantity; i++) {
          const ticketId = generateTicketId();
          const qrCodeData = JSON.stringify({
            type: 'EVENT_TICKET',
            ticketId,
            eventId: order.event.id,
            userId: order.buyerId,
            orderId: order.id,
            issuedAt: Date.now(),
          });

          ticketsToCreate.push({
            ticketId,
            userId: order.buyerId,
            ticketTypeId: selection.ticketTypeId,
            orderId: order.id,
            status: TicketStatus.UNUSED,
            purchasedAt: new Date(),
            qrCodeData,
          });
        }
      }

      const createdTickets = await Promise.all(
        ticketsToCreate.map((ticket) =>
          tx.ticket.create({
            data: ticket,
            include: {
              ticketType: {
                include: {
                  event: { include: { venue: { include: { city: true } } } },
                },
              },
            },
          })
        )
      );

      // 2. Update ticket type quantities
      for (const selection of ticketSelections) {
        await tx.ticketType.update({
          where: { id: selection.ticketTypeId },
          data: { quantity: { decrement: selection.quantity } },
        });
      }

      // 3. Update order status
      const updatedOrder = await tx.order.update({
        where: { id: order.id },
        data: { paymentStatus: 'COMPLETED' },
        include: {
          buyer: true,
          event: { include: { venue: { include: { city: true } } } },
        },
      });

      return { tickets: createdTickets, order: updatedOrder };
    });

    console.log(
      `Order ${orderId} completed successfully with ${result.tickets.length} tickets`
    );

    // Post-transaction operations (don't fail the order if these fail)
    try {
      await createTicketNotification(result.order.id, 'TICKET_PURCHASED');
      await ticketEmailService.sendTicketEmail(result.order, result.tickets);
    } catch (error) {
      console.error('Post-completion operations failed:', error);
    }

    // Revalidate paths
    revalidatePath('/dashboard/tickets');
    revalidatePath('/dashboard/orders');
    revalidatePath(`/events/${order.event.slug}`);

    return {
      success: true,
      message: 'Order completed successfully',
      data: result.order,
    };
  } catch (error) {
    console.error('Error completing order:', error);

    // Mark order as failed
    try {
      await prisma.order.update({
        where: { id: orderId },
        data: { paymentStatus: 'FAILED' },
      });
    } catch (updateError) {
      console.error('Failed to mark order as failed:', updateError);
    }

    return {
      success: false,
      message:
        error instanceof Error ? error.message : 'Failed to complete order',
    };
  }
}

// Process waiting list when tickets become available
export async function processWaitingList(eventId: string): Promise<void> {
  try {
    const availableTickets = await prisma.ticketType.findMany({
      where: {
        eventId,
        quantity: { gt: 0 },
      },
    });

    if (availableTickets.length === 0) return;

    const waitingEntries = await prisma.waitingList.findMany({
      where: {
        eventId,
        status: 'WAITING',
      },
      include: {
        user: true,
      },
      orderBy: {
        id: 'asc',
      },
    });

    const totalAvailable = availableTickets.reduce(
      (sum, tt) => sum + tt.quantity,
      0
    );
    const toOffer = Math.min(waitingEntries.length, totalAvailable);

    for (let i = 0; i < toOffer; i++) {
      const entry = waitingEntries[i];
      const offerExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

      await prisma.waitingList.update({
        where: { id: entry.id },
        data: {
          status: 'OFFERED',
          offerExpiresAt,
        },
      });

      await prisma.notification.create({
        data: {
          type: 'TICKET_AVAILABLE',
          title: 'Tickets Available!',
          message:
            'Tickets are now available for the event you were waiting for.',
          userId: entry.userId,
          eventId,
          actionUrl: `/events/${eventId}`,
        },
      });
    }
  } catch (error) {
    console.error('Error processing waiting list:', error);
  }
}

// Resend tickets email (admin only)
export async function resendOrderTickets(orderId: string) {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session) {
    return { success: false, message: 'Not authenticated' };
  }

  // only ADMIN with STAFF or SUPER_ADMIN can manually email tickets
  const isAdmin =
    session.user.role === 'ADMIN' &&
    ['STAFF', 'SUPER_ADMIN'].includes(session.user.subRole);

  if (!isAdmin) {
    return { success: false, message: 'Not authorized' };
  }
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        buyer: true,
        event: {
          include: {
            venue: { include: { city: true } },
            ticketTypes: true,
          },
        },
        tickets: {
          include: {
            ticketType: {
              include: {
                event: { include: { venue: { include: { city: true } } } },
              },
            },
          },
        },
      },
    });

    if (!order) return { success: false, message: 'Order not found' };
    if (order.paymentStatus !== PaymentStatus.COMPLETED) {
      return { success: false, message: 'Order is not completed' };
    }
    if (!order.tickets || order.tickets.length === 0) {
      return {
        success: false,
        message:
          'No tickets found for this order. Please generate tickets first.',
      };
    }

    const { ticketEmailService } = await import('@/lib/email-service');
    await ticketEmailService.sendTicketEmail(order, order.tickets);

    return { success: true, message: 'Tickets email sent successfully' };
  } catch (error) {
    console.error('resendOrderTickets error:', error);
    return {
      success: false,
      message:
        error instanceof Error ? error.message : 'Failed to send tickets email',
    };
  }
}

// Add user to waiting list
export async function joinWaitingList(
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
    // Check if event exists
    const event = await prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event || event.publishedStatus !== 'PUBLISHED' || event.isCancelled) {
      return {
        success: false,
        message: 'Event not available',
      };
    }

    // Check if user is already on waiting list
    const existingEntry = await prisma.waitingList.findFirst({
      where: {
        eventId,
        userId: session.user.id,
        status: { in: ['WAITING', 'OFFERED'] },
      },
    });

    if (existingEntry) {
      return {
        success: false,
        message: 'You are already on the waiting list for this event',
      };
    }

    // Add to waiting list
    const waitingListEntry = await prisma.waitingList.create({
      data: {
        eventId,
        userId: session.user.id,
        status: 'WAITING',
      },
    });

    return {
      success: true,
      message: 'Added to waiting list successfully',
      data: waitingListEntry,
    };
  } catch (error) {
    console.error('Error joining waiting list:', error);
    return {
      success: false,
      message: 'Failed to join waiting list',
    };
  }
}

// Initiate refund (organizer request, admin approval required)
export async function initiateRefund(
  orderId: string,
  reason: string
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
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        event: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!order) {
      return {
        success: false,
        message: 'Order not found',
      };
    }

    // Check permissions
    const isOwner = order.event.userId === session.user.id;
    const isAdmin = session.user.role === 'ADMIN';

    if (!isOwner && !isAdmin) {
      return {
        success: false,
        message:
          'You do not have permission to initiate refunds for this order',
      };
    }

    if (order.paymentStatus !== 'COMPLETED') {
      return {
        success: false,
        message: 'Can only refund completed orders',
        data: order,
      };
    }

    if (order.refundStatus) {
      return {
        success: false,
        message: 'Refund already initiated for this order',
      };
    }

    // Update order status
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        refundStatus: 'INITIATED',
      },
    });

    // Create notification for admin
    await createTicketNotification(orderId, 'REFUND_REQUESTED');

    return {
      success: true,
      message: 'Refund initiated successfully. Awaiting admin approval.',
      data: updatedOrder,
    };
  } catch (error) {
    console.error('Error initiating refund:', error);
    return {
      success: false,
      message: 'Failed to initiate refund',
    };
  }
}

// Process refund (admin only)
export async function processRefund(
  orderId: string,
  approve: boolean,
  adminNotes?: string
): Promise<ActionResponse<any>> {
  const headersList = await headers();
  const session = await auth.api.getSession({
    headers: headersList,
  });

  if (!session || session.user.role !== 'ADMIN') {
    return {
      success: false,
      message: 'Only administrators can process refunds',
    };
  }

  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        event: true,
        buyer: true,
      },
    });

    if (!order) {
      return {
        success: false,
        message: 'Order not found',
      };
    }

    if (order.refundStatus !== 'INITIATED') {
      return {
        success: false,
        message: 'No refund request found for this order',
      };
    }

    if (!approve) {
      // Reject refund
      const updatedOrder = await prisma.order.update({
        where: { id: orderId },
        data: {
          refundStatus: null, // Reset refund status
        },
      });

      return {
        success: true,
        message: 'Refund request rejected',
        data: updatedOrder,
      };
    }

    // Process refund with Paystack
    let paystackRefundSuccess = true;

    if (!order.event.isFree && order.totalAmount > 0) {
      const paystackConfig = await getPaystackConfig();

      if (!paystackConfig.secretKey) {
        return {
          success: false,
          message: 'Payment system not configured',
        };
      }

      const refundResponse = await fetch(`${paystackConfig.baseUrl}/refund`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${paystackConfig.secretKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transaction: order.paystackId,
          amount: order.totalAmount * 100, // Convert to kobo
        }),
      });

      const refundData = await refundResponse.json();
      paystackRefundSuccess = refundData.status;
    }

    if (!paystackRefundSuccess) {
      return {
        success: false,
        message: 'Failed to process refund with payment provider',
      };
    }

    // Update order and tickets in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update order status
      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: {
          paymentStatus: 'REFUNDED',
          refundStatus: 'PROCESSED',
        },
      });

      // Mark all tickets as refunded
      await tx.ticket.updateMany({
        where: {
          ticketType: {
            eventId: order.event.id,
          },
          userId: order.buyerId,
          purchasedAt: {
            gte: new Date(order.createdAt.getTime() - 1000), // Within 1 second of order
            lte: new Date(order.createdAt.getTime() + 1000),
          },
        },
        data: {
          status: 'REFUNDED',
        },
      });

      // Return ticket quantities to ticket types
      const ticketCounts = await tx.ticket.groupBy({
        by: ['ticketTypeId'],
        where: {
          ticketType: {
            eventId: order.event.id,
          },
          userId: order.buyerId,
          status: 'REFUNDED',
          purchasedAt: {
            gte: new Date(order.createdAt.getTime() - 1000),
            lte: new Date(order.createdAt.getTime() + 1000),
          },
        },
        _count: true,
      });

      for (const ticketCount of ticketCounts) {
        await tx.ticketType.update({
          where: { id: ticketCount.ticketTypeId },
          data: { quantity: { increment: ticketCount._count } },
        });
      }

      return updatedOrder;
    });

    // Create notification for user
    await createTicketNotification(orderId, 'REFUND_PROCESSED', order.buyerId);

    // Process waiting list
    await processWaitingList(order.event.id);

    revalidatePath('/admin/dashboard/orders');
    revalidatePath('/dashboard/tickets');

    return {
      success: true,
      message: 'Refund processed successfully',
      data: result,
    };
  } catch (error) {
    console.error('Error processing refund:', error);
    return {
      success: false,
      message: 'Failed to process refund',
    };
  }
}

// Get user orders
export async function getUserOrders(): Promise<ActionResponse<any[]>> {
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
    const orders = await prisma.order.findMany({
      where: { buyerId: session.user.id },
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
        tickets: true, // Include tickets for better order details
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      success: true,
      data: orders,
    };
  } catch (error) {
    console.error('Error fetching user orders:', error);
    return {
      success: false,
      message: 'Failed to fetch orders',
    };
  }
}

// Get organizer's event orders
export async function getOrganizerOrders(
  eventId?: string
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
    const whereClause: any = {
      event: {
        userId: session.user.id,
      },
    };

    if (eventId) {
      whereClause.eventId = eventId;
    }

    const orders = await prisma.order.findMany({
      where: whereClause,
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
        buyer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      success: true,
      data: orders,
    };
  } catch (error) {
    console.error('Error fetching organizer orders:', error);
    return {
      success: false,
      message: 'Failed to fetch orders',
    };
  }
}

// Get all orders (admin only)
export async function getAllOrders(): Promise<ActionResponse<any[]>> {
  const headersList = await headers();
  const session = await auth.api.getSession({
    headers: headersList,
  });

  if (!session || session.user.role !== 'ADMIN') {
    return {
      success: false,
      message: 'Admin access required',
    };
  }

  try {
    const orders = await prisma.order.findMany({
      include: {
        event: {
          include: {
            venue: {
              include: {
                city: true,
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
        },
        buyer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        tickets: {
          include: {
            ticketType: {
              select: {
                name: true,
                price: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      success: true,
      data: orders,
    };
  } catch (error) {
    console.error('Error fetching all orders:', error);
    return {
      success: false,
      message: 'Failed to fetch orders',
    };
  }
}
