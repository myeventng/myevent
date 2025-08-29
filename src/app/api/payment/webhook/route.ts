// src/app/api/payment/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  completeOrder,
  completeOrderWithSelections,
} from '@/actions/order.actions';
import { getSetting } from '@/actions/platform-settings.actions';
import crypto from 'crypto';

const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY!;

// FIXED webhook handler in app/api/payment/callback/route.ts
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { event, data } = body;

    console.log('Paystack webhook received:', event, data?.reference);

    if (event === 'charge.success' && data?.reference) {
      const reference = data.reference;

      // Find the order
      const order = await prisma.order.findUnique({
        where: { paystackId: reference },
        include: {
          event: true,
          buyer: true,
        },
      });

      if (!order) {
        console.error(`Webhook: Order not found for reference: ${reference}`);
        return NextResponse.json({ status: 'order_not_found' });
      }

      if (order.paymentStatus === 'COMPLETED') {
        console.log(`Webhook: Order ${order.id} already completed`);
        return NextResponse.json({ status: 'already_completed' });
      }

      console.log(`Webhook: Processing order ${order.id}`);

      // FIXED: Get ticket selections with better fallback logic
      let ticketSelections = [];

      // Try webhook metadata first
      if (
        data.metadata?.ticketSelections &&
        Array.isArray(data.metadata.ticketSelections)
      ) {
        ticketSelections = data.metadata.ticketSelections;
        console.log(
          'Webhook: Using ticket selections from metadata:',
          ticketSelections
        );
      } else {
        // Try stored order data
        try {
          if (order.purchaseNotes) {
            const parsed = JSON.parse(order.purchaseNotes);
            if (
              parsed.ticketSelections &&
              Array.isArray(parsed.ticketSelections)
            ) {
              ticketSelections = parsed.ticketSelections;
              console.log(
                'Webhook: Using stored ticket selections:',
                ticketSelections
              );
            }
          }
        } catch (parseError) {
          console.warn(
            'Webhook: Could not parse stored ticket selections:',
            parseError
          );
        }
      }

      // Complete order with proper ticket selections
      let result;
      if (ticketSelections.length > 0) {
        result = await completeOrderWithSelections(
          order.id,
          ticketSelections,
          reference
        );
      } else {
        console.warn(
          'Webhook: No ticket selections found, this may cause issues'
        );
        // This should not happen with the fixes, but keeping as fallback
        result = await completeOrder(order.id, reference);
      }

      if (result.success) {
        console.log(`Webhook: Order ${order.id} completed successfully`);
        return NextResponse.json({ status: 'success', orderId: order.id });
      } else {
        console.error(
          `Webhook: Failed to complete order ${order.id}:`,
          result.message
        );
        return NextResponse.json({
          status: 'completion_failed',
          error: result.message,
          orderId: order.id,
        });
      }
    } else {
      console.log(`Webhook: Unhandled event type: ${event}`);
    }

    return NextResponse.json({ status: 'success' });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json(
      {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

async function handleChargeSuccess(data: any) {
  try {
    const { reference, amount } = data;

    const order = await prisma.order.findUnique({
      where: { paystackId: reference },
      include: { event: true, buyer: true },
    });
    if (!order) {
      console.error(`Order not found for reference: ${reference}`);
      return;
    }

    if (order.paymentStatus === 'COMPLETED') {
      console.log(`Order ${order.id} already completed`);
      return; // idempotent
    }

    // Safer amount check
    const expectedKobo = Math.round(order.totalAmount * 100);
    if (amount !== expectedKobo) {
      console.error(
        `Amount mismatch for order ${order.id}: expected ${expectedKobo}, got ${amount}`
      );
      return;
    }

    // Single call – completeOrder handles tickets, inventory, notifications, email
    await completeOrder(order.id, reference);

    console.log(`Order ${order.id} completed successfully`);
  } catch (error) {
    console.error('Error handling charge success:', error);
  }
}

async function handleChargeFailed(data: any) {
  try {
    const { reference } = data;

    // Find and update the order
    const order = await prisma.order.findUnique({
      where: { paystackId: reference },
    });

    if (order) {
      await prisma.order.update({
        where: { id: order.id },
        data: { paymentStatus: 'FAILED' },
      });

      console.log(`Order ${order.id} marked as failed`);
    }
  } catch (error) {
    console.error('Error handling charge failed:', error);
  }
}

async function handleRefundProcessed(data: any) {
  try {
    const { transaction } = data;

    // Find the order by Paystack transaction
    const order = await prisma.order.findUnique({
      where: { paystackId: transaction.reference },
    });

    if (order) {
      await prisma.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: 'REFUNDED',
          refundStatus: 'PROCESSED',
        },
      });

      // Update associated tickets
      await prisma.ticket.updateMany({
        where: {
          ticketType: {
            eventId: order.eventId,
          },
          userId: order.buyerId,
          purchasedAt: {
            gte: new Date(order.createdAt.getTime() - 1000),
            lte: new Date(order.createdAt.getTime() + 1000),
          },
        },
        data: { status: 'REFUNDED' },
      });

      console.log(`Refund processed for order ${order.id}`);
    }
  } catch (error) {
    console.error('Error handling refund processed:', error);
  }
}

async function handleTransferSuccess(data: any) {
  try {
    // Handle organizer payouts
    console.log('Transfer success:', data);
  } catch (error) {
    console.error('Error handling transfer success:', error);
  }
}

async function sendTicketEmail(order: any) {
  try {
    // Get tickets for this order
    const tickets = await prisma.ticket.findMany({
      where: {
        ticketType: {
          eventId: order.eventId,
        },
        userId: order.buyerId,
        purchasedAt: {
          gte: new Date(order.createdAt.getTime() - 1000),
          lte: new Date(order.createdAt.getTime() + 1000),
        },
      },
      include: {
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
      },
    });

    if (tickets.length === 0) return;

    // Generate QR codes and send email
    // This would integrate with your email service (e.g., SendGrid, Mailgun)

    console.log(`Sending ${tickets.length} tickets to ${order.buyer.email}`);

    // TODO: Implement actual email sending with QR codes
  } catch (error) {
    console.error('Error sending ticket email:', error);
  }
}
