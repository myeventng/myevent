// src/actions/order.actions.ts - FIXED VERSION
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
  isGuestPurchase?: boolean;
  guestEmail?: string;
  guestName?: string;
  guestPhone?: string;
}

interface PaystackConfig {
  secretKey: string;
  publicKey: string;
  baseUrl: string;
}

interface TicketToCreate {
  ticketId: string;
  userId: string | null;
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

// Get Paystack configuration
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

// Validate guest purchase data
const validateGuestData = (
  guestEmail?: string,
  guestName?: string
): { valid: boolean; message?: string } => {
  if (!guestEmail || !guestName) {
    return {
      valid: false,
      message: 'Guest name and email are required for guest purchases',
    };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(guestEmail)) {
    return {
      valid: false,
      message: 'Please provide a valid email address',
    };
  }

  if (guestName.trim().length < 2) {
    return {
      valid: false,
      message: 'Please provide a valid name (at least 2 characters)',
    };
  }

  return { valid: true };
};

// Initiate order and payment
export async function initiateOrder(
  data: InitiateOrderInput
): Promise<ActionResponse<any>> {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  // Handle guest vs authenticated purchase
  let userId: string | null = null;
  let buyerEmail: string;
  let buyerName: string;

  if (data.isGuestPurchase) {
    const validation = validateGuestData(data.guestEmail, data.guestName);
    if (!validation.valid) {
      return { success: false, message: validation.message };
    }

    userId = null;
    buyerEmail = data.guestEmail!;
    buyerName = data.guestName!;
  } else {
    if (!session) {
      return { success: false, message: 'Not authenticated' };
    }

    userId = session.user.id;
    buyerEmail = session.user.email;
    buyerName = session.user.name;
  }

  try {
    const allowRegistrations = await getSetting('general.allowRegistrations');
    if (allowRegistrations === false) {
      return {
        success: false,
        message: 'New ticket purchases are currently disabled',
      };
    }

    // Validate event
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

    // Validate ticket selections
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

    // Create order with guest information
    const orderData: any = {
      paystackId: paystackReference,
      totalAmount,
      quantity: totalQuantity,
      platformFee,
      paymentStatus: 'PENDING',
      eventId: data.eventId,
      purchaseNotes: JSON.stringify({
        note: data.purchaseNotes || '',
        selections: validatedSelections,
        isGuestPurchase: data.isGuestPurchase || false,
        guestEmail: data.guestEmail,
        guestName: data.guestName,
        guestPhone: data.guestPhone,
      }),
    };

    // Add buyer ID only if authenticated
    if (userId) {
      orderData.buyerId = userId;
    }

    const order = await prisma.order.create({
      data: orderData,
    });

    // Handle free events immediately
    if (event.isFree || totalAmount === 0) {
      return await completeOrder(order.id, undefined, {
        guestEmail: data.guestEmail,
        guestName: data.guestName,
      });
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
          email: buyerEmail,
          amount: totalAmount * 100,
          reference: paystackReference,
          callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/payment/callback`,
          metadata: {
            orderId: order.id,
            eventId: data.eventId,
            userId: userId || 'guest',
            eventTitle: event.title,
            isGuestPurchase: data.isGuestPurchase || false,
            guestEmail: data.guestEmail,
            guestName: data.guestName,
            guestPhone: data.guestPhone,
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
// Complete order after payment verification - FIXED VERSION
export async function completeOrder(
  orderId: string,
  paystackReference?: string,
  guestInfo?: { guestEmail?: string; guestName?: string }
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
        tickets: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        }, // IMPORTANT: Include existing tickets to check
      },
    });

    if (!order) {
      return { success: false, message: 'Order not found' };
    }

    // CRITICAL FIX: Check if order already has tickets generated
    if (
      order.paymentStatus === 'COMPLETED' &&
      order.tickets &&
      order.tickets.length > 0
    ) {
      console.log(
        `⚠️ Order ${orderId} already completed with ${order.tickets.length} tickets. Skipping duplicate generation.`
      );

      // Still send email if requested (in case previous email failed)
      try {
        const purchaseData = JSON.parse(order.purchaseNotes || '{}');
        const isGuestPurchase = purchaseData.isGuestPurchase || false;
        const guestEmail = guestInfo?.guestEmail || purchaseData.guestEmail;
        const guestName = guestInfo?.guestName || purchaseData.guestName;

        const recipientEmail = isGuestPurchase
          ? guestEmail
          : order.buyer?.email;
        const recipientName = isGuestPurchase ? guestName : order.buyer?.name;

        if (recipientEmail && recipientName) {
          const ticketsWithGuestInfo = order.tickets.map((ticket) => ({
            ...ticket,
            user: isGuestPurchase
              ? {
                  id: null,
                  name: recipientName,
                  email: recipientEmail,
                }
              : ticket.user,
          }));

          await ticketEmailService.sendTicketEmail(
            {
              ...order,
              buyer: isGuestPurchase
                ? {
                    id: null,
                    name: recipientName,
                    email: recipientEmail,
                  }
                : order.buyer,
            },
            ticketsWithGuestInfo
          );

          console.log(`✅ Ticket email re-sent to ${recipientEmail}`);
        }
      } catch (emailError) {
        console.error('Failed to resend email:', emailError);
      }

      return {
        success: true,
        message: 'Order already completed',
        data: order,
      };
    }

    // Parse purchase notes
    let purchaseData: any = {};
    try {
      purchaseData = JSON.parse(order.purchaseNotes || '{}');
    } catch (error) {
      console.error('Failed to parse purchase notes:', error);
    }

    const isGuestPurchase = purchaseData.isGuestPurchase || false;
    const guestEmail = guestInfo?.guestEmail || purchaseData.guestEmail;
    const guestName = guestInfo?.guestName || purchaseData.guestName;

    // Verify payment for paid events
    if (!order.event.isFree && order.totalAmount > 0 && paystackReference) {
      const paystackConfig = await getPaystackConfig();
      if (!paystackConfig.secretKey) {
        return { success: false, message: 'Payment system not configured' };
      }

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

      const paidKobo = Number(verifyData.data.amount);
      const orderKobo = Math.round(Number(order.totalAmount) * 100);
      if (paidKobo !== orderKobo) {
        return { success: false, message: 'Payment amount mismatch' };
      }
    }

    let ticketSelections = [];
    try {
      ticketSelections = purchaseData.selections || [];
    } catch (error) {
      console.error('Failed to parse ticket selections:', error);
      return { success: false, message: 'Invalid order data' };
    }

    if (!ticketSelections.length) {
      return { success: false, message: 'No ticket selections found' };
    }

    console.log(
      `📊 Processing ${ticketSelections.length} ticket type(s) for order ${orderId}`
    );
    console.log('Selections:', JSON.stringify(ticketSelections, null, 2));

    // Validate ticket availability
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

    // Execute order completion in transaction (SINGLE TRANSACTION TO PREVENT DUPLICATES)
    const result = await prisma.$transaction(
      async (tx) => {
        // 1. FIRST: Check again if tickets already exist within transaction (race condition protection)
        const existingTicketsCount = await tx.ticket.count({
          where: { orderId: order.id },
        });

        if (existingTicketsCount > 0) {
          console.log(
            `⚠️ Found ${existingTicketsCount} existing tickets in transaction. Aborting to prevent duplicates.`
          );
          throw new Error(
            'DUPLICATE_PREVENTION: Tickets already exist for this order'
          );
        }

        // 2. Update order status FIRST to prevent race conditions
        const updatedOrder = await tx.order.update({
          where: { id: order.id },
          data: { paymentStatus: 'COMPLETED' },
          include: {
            buyer: true,
            event: { include: { venue: { include: { city: true } } } },
          },
        });

        // 3. Create tickets - FIXED: Ensure we respect the exact quantities
        const ticketsToCreate = [];
        for (const selection of ticketSelections) {
          console.log(
            `Creating ${selection.quantity} ticket(s) for type ${selection.ticketTypeId}`
          );

          for (let i = 0; i < selection.quantity; i++) {
            const ticketId = generateTicketId();
            const qrCodeData = JSON.stringify({
              type: 'EVENT_TICKET',
              ticketId,
              eventId: order.event.id,
              userId: order.buyerId || null,
              orderId: order.id,
              isGuestPurchase,
              guestEmail,
              guestName,
              issuedAt: Date.now(),
            });

            ticketsToCreate.push({
              ticketId,
              userId: order.buyerId || null,
              ticketTypeId: selection.ticketTypeId,
              orderId: order.id,
              status: TicketStatus.UNUSED,
              purchasedAt: new Date(),
              qrCodeData,
            });
          }
        }

        console.log(`🎫 Creating exactly ${ticketsToCreate.length} tickets`);

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
                user: {
                  select: { id: true, name: true, email: true },
                },
              },
            })
          )
        );

        console.log(`✅ Successfully created ${createdTickets.length} tickets`);

        // 4. Update ticket type quantities
        for (const selection of ticketSelections) {
          await tx.ticketType.update({
            where: { id: selection.ticketTypeId },
            data: { quantity: { decrement: selection.quantity } },
          });
          console.log(
            `📉 Decremented ${selection.quantity} from ticket type ${selection.ticketTypeId}`
          );
        }

        return { tickets: createdTickets, order: updatedOrder };
      },
      {
        maxWait: 5000, // Maximum time to wait for transaction to start
        timeout: 10000, // Maximum time for transaction to complete
      }
    );

    console.log(
      `✅ Order ${orderId} completed with ${result.tickets.length} tickets`
    );

    // Post-transaction operations
    try {
      // Create notification only for authenticated users
      if (order.buyerId) {
        await createTicketNotification(result.order.id, 'TICKET_PURCHASED');
      }

      // Determine recipient
      const recipientEmail = isGuestPurchase ? guestEmail : order.buyer?.email;
      const recipientName = isGuestPurchase ? guestName : order.buyer?.name;

      console.log(
        `Sending tickets to: ${recipientEmail} (Guest: ${isGuestPurchase})`
      );

      if (recipientEmail && recipientName) {
        // Enhance tickets with guest info
        const ticketsWithGuestInfo = result.tickets.map((ticket) => ({
          ...ticket,
          user: isGuestPurchase
            ? {
                id: null,
                name: recipientName,
                email: recipientEmail,
              }
            : ticket.user,
        }));

        // Send email
        await ticketEmailService.sendTicketEmail(
          {
            ...result.order,
            buyer: isGuestPurchase
              ? {
                  id: null,
                  name: recipientName,
                  email: recipientEmail,
                }
              : result.order.buyer,
          },
          ticketsWithGuestInfo
        );

        console.log(`✅ Ticket email sent to ${recipientEmail}`);
      }
    } catch (error) {
      console.error('Post-completion operations failed:', error);
    }

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

    // Check if error is our duplicate prevention error
    if (
      error instanceof Error &&
      error.message.includes('DUPLICATE_PREVENTION')
    ) {
      // Fetch the completed order to return
      const completedOrder = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          buyer: true,
          event: { include: { venue: { include: { city: true } } } },
          tickets: true,
        },
      });

      return {
        success: true,
        message: 'Order already completed (duplicate prevention)',
        data: completedOrder,
      };
    }

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

// Process waiting list
export async function processWaitingList(eventId: string): Promise<void> {
  try {
    const availableTickets = await prisma.ticketType.findMany({
      where: { eventId, quantity: { gt: 0 } },
    });

    if (availableTickets.length === 0) return;

    const waitingEntries = await prisma.waitingList.findMany({
      where: { eventId, status: 'WAITING' },
      include: { user: true },
      orderBy: { id: 'asc' },
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
        data: { status: 'OFFERED', offerExpiresAt },
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

// Get user orders (including guest orders by email)
export async function getUserOrders(): Promise<ActionResponse<any[]>> {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session) {
    return { success: false, message: 'Not authenticated' };
  }

  try {
    const orders = await prisma.order.findMany({
      where: { buyerId: session.user.id },
      include: {
        event: {
          include: {
            venue: { include: { city: true } },
          },
        },
        tickets: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return { success: true, data: orders };
  } catch (error) {
    console.error('Error fetching user orders:', error);
    return { success: false, message: 'Failed to fetch orders' };
  }
}

// Get organizer's event orders
export async function getOrganizerOrders(
  eventId?: string
): Promise<ActionResponse<any[]>> {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session) {
    return { success: false, message: 'Not authenticated' };
  }

  try {
    const whereClause: any = {
      event: { userId: session.user.id },
    };

    if (eventId) {
      whereClause.eventId = eventId;
    }

    const orders = await prisma.order.findMany({
      where: whereClause,
      include: {
        event: {
          include: {
            venue: { include: { city: true } },
          },
        },
        buyer: {
          select: { id: true, name: true, email: true },
        },
        tickets: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Parse guest info from orders without buyers
    const ordersWithGuestInfo = orders.map((order) => {
      if (!order.buyer && order.purchaseNotes) {
        try {
          const notes = JSON.parse(order.purchaseNotes);
          if (notes.isGuestPurchase) {
            return {
              ...order,
              guestInfo: {
                name: notes.guestName,
                email: notes.guestEmail,
                phone: notes.guestPhone,
              },
            };
          }
        } catch (e) {
          console.error('Failed to parse purchase notes:', e);
        }
      }
      return order;
    });

    return { success: true, data: ordersWithGuestInfo };
  } catch (error) {
    console.error('Error fetching organizer orders:', error);
    return { success: false, message: 'Failed to fetch orders' };
  }
}

// Get all orders (admin only)
export async function getAllOrders(): Promise<ActionResponse<any[]>> {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session || session.user.role !== 'ADMIN') {
    return { success: false, message: 'Admin access required' };
  }

  try {
    const orders = await prisma.order.findMany({
      include: {
        event: {
          include: {
            venue: { include: { city: true } },
            user: { select: { id: true, name: true, email: true } },
          },
        },
        buyer: { select: { id: true, name: true, email: true } },
        tickets: {
          include: {
            ticketType: { select: { name: true, price: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Parse guest info
    const ordersWithGuestInfo = orders.map((order) => {
      if (!order.buyer && order.purchaseNotes) {
        try {
          const notes = JSON.parse(order.purchaseNotes);
          if (notes.isGuestPurchase) {
            return {
              ...order,
              guestInfo: {
                name: notes.guestName,
                email: notes.guestEmail,
                phone: notes.guestPhone,
              },
            };
          }
        } catch (e) {
          console.error('Failed to parse purchase notes:', e);
        }
      }
      return order;
    });

    return { success: true, data: ordersWithGuestInfo };
  } catch (error) {
    console.error('Error fetching all orders:', error);
    return { success: false, message: 'Failed to fetch orders' };
  }
}

// Resend tickets email (admin only)
export async function resendOrderTickets(orderId: string) {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session) {
    return { success: false, message: 'Not authenticated' };
  }

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
            user: {
              select: { id: true, name: true, email: true },
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
        message: 'No tickets found for this order',
      };
    }

    // Parse guest info
    let guestInfo = null;
    if (!order.buyer && order.purchaseNotes) {
      try {
        const notes = JSON.parse(order.purchaseNotes);
        if (notes.isGuestPurchase) {
          guestInfo = {
            name: notes.guestName,
            email: notes.guestEmail,
          };
        }
      } catch (e) {
        console.error('Failed to parse guest info:', e);
      }
    }

    // Send email
    const ticketsWithGuestInfo = order.tickets.map((ticket) => ({
      ...ticket,
      user: guestInfo
        ? { id: null, name: guestInfo.name, email: guestInfo.email }
        : { id: null, name: '', email: '' },
    }));

    await ticketEmailService.sendTicketEmail(
      {
        ...order,
        buyer: guestInfo
          ? { id: null, name: guestInfo.name, email: guestInfo.email }
          : order.buyer,
      },
      ticketsWithGuestInfo
    );

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
    await createTicketNotification(
      orderId,
      'REFUND_PROCESSED',
      order.buyerId ?? undefined
    );

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
