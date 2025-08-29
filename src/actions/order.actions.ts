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
const generateTicketId = (orderId?: string, idx?: number): string => {
  const rand6 = (() => {
    if (
      typeof globalThis !== 'undefined' &&
      globalThis.crypto?.getRandomValues
    ) {
      const bytes = new Uint8Array(3);
      globalThis.crypto.getRandomValues(bytes);
      return Array.from(bytes, (b) => b.toString(16).padStart(2, '0'))
        .join('')
        .toUpperCase();
    }
    return Math.random().toString(16).slice(2, 8).padEnd(6, '0').toUpperCase();
  })();

  const ts = Date.now().toString(36).toUpperCase();
  const prefix = orderId ? orderId.slice(-6).toUpperCase() : ts;
  const suffix = typeof idx === 'number' ? `-${idx + 1}` : '';
  return `TKT-${prefix}-${rand6}${suffix}`;
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

// Store ticket selections in database for reliable retrieval
const storeTicketSelections = async (orderId: string, selections: any[]) => {
  try {
    await prisma.order.update({
      where: { id: orderId },
      data: {
        // Store selections as JSON in purchaseNotes or create a separate field
        // For now, we'll use a metadata approach
        purchaseNotes: JSON.stringify({
          originalNotes: '',
          ticketSelections: selections,
        }),
      },
    });
  } catch (error) {
    console.error('Failed to store ticket selections:', error);
  }
};

// Retrieve ticket selections from database
const getStoredTicketSelections = async (orderId: string) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { purchaseNotes: true },
    });

    if (order?.purchaseNotes) {
      try {
        const parsed = JSON.parse(order.purchaseNotes);
        if (parsed.ticketSelections) {
          return parsed.ticketSelections;
        }
      } catch {
        // If parsing fails, fall back to null
      }
    }
    return null;
  } catch (error) {
    console.error('Failed to retrieve ticket selections:', error);
    return null;
  }
};

// FIXED: Initiate order with proper ticket selection storage
export async function initiateOrder(
  data: InitiateOrderInput
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
    // Check if registrations are allowed
    const allowRegistrations = await getSetting('general.allowRegistrations');
    if (allowRegistrations === false) {
      return {
        success: false,
        message: 'New ticket purchases are currently disabled',
      };
    }

    // Validate event exists and is published
    const event = await prisma.event.findUnique({
      where: { id: data.eventId },
      include: {
        ticketTypes: true,
        venue: true,
      },
    });

    if (!event || event.publishedStatus !== 'PUBLISHED' || event.isCancelled) {
      return {
        success: false,
        message: 'Event not available for booking',
      };
    }

    // Check if event is in the future
    if (new Date(event.startDateTime) < new Date()) {
      return {
        success: false,
        message: 'Cannot book tickets for past events',
      };
    }

    // Validate ticket selections and availability
    let totalAmount = 0;
    let totalQuantity = 0;
    const validatedSelections = [];

    for (const selection of data.ticketSelections) {
      const ticketType = event.ticketTypes.find(
        (tt) => tt.id === selection.ticketTypeId
      );

      if (!ticketType) {
        return {
          success: false,
          message: `Ticket type not found`,
        };
      }

      if (selection.quantity <= 0) {
        return {
          success: false,
          message: `Invalid quantity for ${ticketType.name}`,
        };
      }

      if (selection.quantity > ticketType.quantity) {
        return {
          success: false,
          message: `Not enough ${ticketType.name} tickets available`,
        };
      }

      totalAmount += ticketType.price * selection.quantity;
      totalQuantity += selection.quantity;
      validatedSelections.push({
        ticketType,
        quantity: selection.quantity,
        subtotal: ticketType.price * selection.quantity,
      });
    }

    // Check attendee limit
    if (event.attendeeLimit) {
      const existingTickets = await prisma.ticket.count({
        where: {
          ticketType: {
            eventId: event.id,
          },
          status: {
            in: ['UNUSED', 'USED'],
          },
        },
      });

      if (existingTickets + totalQuantity > event.attendeeLimit) {
        return {
          success: false,
          message: 'Event capacity exceeded',
        };
      }
    }

    // Calculate platform fee
    const platformFee = await calculatePlatformFee(totalAmount);

    // Generate unique Paystack reference
    const paystackReference = `order_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    // Create order with ticket selections stored
    const order = await prisma.order.create({
      data: {
        paystackId: paystackReference,
        totalAmount,
        quantity: totalQuantity,
        platformFee,
        paymentStatus: 'PENDING',
        eventId: data.eventId,
        buyerId: session.user.id,
        // FIXED: Store ticket selections reliably
        purchaseNotes: JSON.stringify({
          originalNotes: data.purchaseNotes || '',
          ticketSelections: data.ticketSelections,
        }),
      },
    });

    // If it's a free event, complete the order immediately
    if (event.isFree || totalAmount === 0) {
      return await completeOrderWithSelections(
        order.id,
        data.ticketSelections,
        null
      );
    }

    // Get Paystack configuration
    const paystackConfig = await getPaystackConfig();

    if (!paystackConfig.secretKey) {
      await prisma.order.delete({ where: { id: order.id } });
      return {
        success: false,
        message: 'Payment system not configured',
      };
    }

    // Initialize Paystack payment with ticket selections in metadata
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
          amount: totalAmount * 100,
          reference: paystackReference,
          callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/payment/callback`,
          metadata: {
            orderId: order.id,
            eventId: data.eventId,
            userId: session.user.id,
            eventTitle: event.title,
            platformFee,
            // FIXED: Ensure ticket selections are in metadata
            ticketSelections: data.ticketSelections,
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

    revalidatePath('/dashboard/tickets');
    revalidatePath('/dashboard/orders');

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
    return {
      success: false,
      message: 'Failed to create order',
    };
  }
}

// FIXED: Complete order with specific ticket selections
export async function completeOrderWithSelections(
  orderId: string,
  ticketSelections: { ticketTypeId: string; quantity: number }[],
  paystackReference?: string | null
): Promise<ActionResponse<any>> {
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
      return {
        success: false,
        message: 'Order already completed',
        data: order,
      };
    }

    // Verify payment if not free event
    if (!order.event.isFree && order.totalAmount > 0 && paystackReference) {
      const paystackConfig = await getPaystackConfig();

      if (!paystackConfig.secretKey) {
        return { success: false, message: 'Payment system not configured' };
      }

      const verifyResponse = await fetch(
        `${paystackConfig.baseUrl}/transaction/verify/${paystackReference}`,
        {
          headers: {
            Authorization: `Bearer ${paystackConfig.secretKey}`,
          },
          cache: 'no-store',
        }
      );

      const verifyData = await verifyResponse.json();

      if (!verifyData?.status || verifyData?.data?.status !== 'success') {
        return { success: false, message: 'Payment verification failed' };
      }

      const paidKobo = Number(verifyData.data.amount);
      const orderKobo = Math.round(Number(order.totalAmount) * 100);
      if (paidKobo !== orderKobo) {
        return { success: false, message: 'Payment amount mismatch' };
      }
    }

    // FIXED: Use the provided ticket selections
    const ticketsToCreate: (TicketToCreate & { qrCodeData: string })[] = [];
    let createdCount = 0;

    // Validate all selections first
    for (const selection of ticketSelections) {
      const ticketType = order.event.ticketTypes.find(
        (tt) => tt.id === selection.ticketTypeId
      );

      if (!ticketType) {
        return {
          success: false,
          message: `Ticket type ${selection.ticketTypeId} not found`,
        };
      }

      if (selection.quantity > ticketType.quantity) {
        return {
          success: false,
          message: `Not enough ${ticketType.name} tickets available. Requested: ${selection.quantity}, Available: ${ticketType.quantity}`,
        };
      }
    }

    // Create tickets for each selection
    for (const selection of ticketSelections) {
      for (let i = 0; i < selection.quantity; i++) {
        const ticketId = generateTicketId(order.id, createdCount);
        const qrCodeData = JSON.stringify({
          type: 'EVENT_TICKET',
          ticketId,
          eventId: order.event.id,
          userId: order.buyerId,
          issuedAt: Date.now(),
        });

        ticketsToCreate.push({
          ticketId,
          userId: order.buyerId,
          ticketTypeId: selection.ticketTypeId,
          status: TicketStatus.UNUSED,
          purchasedAt: new Date(),
          qrCodeData,
        });

        createdCount++;
      }
    }

    // Validate total quantity
    if (ticketsToCreate.length !== order.quantity) {
      return {
        success: false,
        message: `Ticket quantity mismatch: expected ${order.quantity}, creating ${ticketsToCreate.length}`,
      };
    }

    // Create tickets and update order in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create all tickets
      const createdTickets = await Promise.all(
        ticketsToCreate.map((ticketData) =>
          tx.ticket.create({
            data: { ...ticketData, orderId: order.id },
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

      // FIXED: Update ticket type quantities properly
      for (const selection of ticketSelections) {
        await tx.ticketType.update({
          where: { id: selection.ticketTypeId },
          data: { quantity: { decrement: selection.quantity } },
        });
      }

      // FIXED: Update order status to COMPLETED
      const updatedOrder = await tx.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: PaymentStatus.COMPLETED,
          refundStatus: null,
        },
        include: {
          buyer: true,
          event: { include: { venue: { include: { city: true } } } },
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

      return { tickets: createdTickets, order: updatedOrder };
    });

    // Create notification and send email
    await createTicketNotification(result.order.id, 'TICKET_PURCHASED');

    try {
      await ticketEmailService.sendTicketEmail(result.order, result.tickets);
      console.log('Ticket email sent successfully');
    } catch (emailError) {
      console.error('Error sending ticket email:', emailError);
    }

    // Process waiting list
    await processWaitingList(order.event.id);

    revalidatePath('/dashboard/tickets');
    revalidatePath('/dashboard/orders');
    revalidatePath(`/events/${order.event.slug}`);
    revalidatePath(`/dashboard/events/${result.order.eventId}/analytics`);

    return {
      success: true,
      message: 'Order completed successfully',
      data: result.order,
    };
  } catch (error) {
    console.error('Error completing order with selections:', error);
    return {
      success: false,
      message: 'Failed to complete order',
    };
  }
}

// FIXED: Complete order with better ticket selection retrieval
export async function completeOrder(
  orderId: string,
  paystackReference?: string | null
): Promise<ActionResponse<any>> {
  try {
    // Try to get ticket selections from stored data or Paystack metadata
    let ticketSelections: { ticketTypeId: string; quantity: number }[] = [];

    // First, try to get from stored order data
    const storedSelections = await getStoredTicketSelections(orderId);
    if (storedSelections) {
      ticketSelections = storedSelections;
    }

    // If no stored selections and we have a Paystack reference, try to get from Paystack
    if (ticketSelections.length === 0 && paystackReference) {
      try {
        const paystackConfig = await getPaystackConfig();
        if (paystackConfig.secretKey) {
          const transactionResponse = await fetch(
            `${paystackConfig.baseUrl}/transaction/verify/${paystackReference}`,
            {
              headers: {
                Authorization: `Bearer ${paystackConfig.secretKey}`,
              },
            }
          );
          const transactionData = await transactionResponse.json();

          if (transactionData?.data?.metadata?.ticketSelections) {
            ticketSelections = transactionData.data.metadata.ticketSelections;
          }
        }
      } catch (error) {
        console.warn(
          'Could not retrieve ticket selections from Paystack:',
          error
        );
      }
    }

    // If we have specific selections, use the new function
    if (ticketSelections.length > 0) {
      return await completeOrderWithSelections(
        orderId,
        ticketSelections,
        paystackReference
      );
    }

    // Fallback: Use the old logic but improved
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
      return {
        success: false,
        message: 'Order already completed',
        data: order,
      };
    }

    // Payment verification for paid events
    if (!order.event.isFree && order.totalAmount > 0 && paystackReference) {
      const paystackConfig = await getPaystackConfig();

      if (!paystackConfig.secretKey) {
        return { success: false, message: 'Payment system not configured' };
      }

      const verifyResponse = await fetch(
        `${paystackConfig.baseUrl}/transaction/verify/${paystackReference}`,
        {
          headers: {
            Authorization: `Bearer ${paystackConfig.secretKey}`,
          },
          cache: 'no-store',
        }
      );

      const verifyData = await verifyResponse.json();

      if (!verifyData?.status || verifyData?.data?.status !== 'success') {
        return { success: false, message: 'Payment verification failed' };
      }

      const paidKobo = Number(verifyData.data.amount);
      const orderKobo = Math.round(Number(order.totalAmount) * 100);
      if (paidKobo !== orderKobo) {
        return { success: false, message: 'Payment amount mismatch' };
      }
    }

    // FALLBACK: Distribute tickets to available types
    const availableTypes = order.event.ticketTypes.filter(
      (tt) => tt.quantity > 0
    );
    if (availableTypes.length === 0) {
      return { success: false, message: 'No ticket types available for event' };
    }

    // Simple distribution: assign to first available type if only one, otherwise distribute evenly
    const fallbackSelections: { ticketTypeId: string; quantity: number }[] = [];

    if (availableTypes.length === 1) {
      fallbackSelections.push({
        ticketTypeId: availableTypes[0].id,
        quantity: order.quantity,
      });
    } else {
      // Distribute evenly across available types
      let remaining = order.quantity;
      for (let i = 0; i < availableTypes.length; i++) {
        const isLast = i === availableTypes.length - 1;
        const quantity = isLast
          ? remaining
          : Math.ceil(remaining / (availableTypes.length - i));
        const actualQuantity = Math.min(
          quantity,
          availableTypes[i].quantity,
          remaining
        );

        if (actualQuantity > 0) {
          fallbackSelections.push({
            ticketTypeId: availableTypes[i].id,
            quantity: actualQuantity,
          });
          remaining -= actualQuantity;
        }
      }
    }

    return await completeOrderWithSelections(
      orderId,
      fallbackSelections,
      paystackReference
    );
  } catch (error) {
    console.error('Error completing order:', error);
    return {
      success: false,
      message: 'Failed to complete order',
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
