// src/app/api/payment/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { completeOrder } from '@/actions/order.actions';
import crypto from 'crypto';

const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY!;

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-paystack-signature');

    if (!signature) {
      return NextResponse.json(
        { error: 'No signature provided' },
        { status: 400 }
      );
    }

    // Verify webhook signature
    const hash = crypto
      .createHmac('sha512', paystackSecretKey)
      .update(body, 'utf8')
      .digest('hex');

    if (hash !== signature) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    const event = JSON.parse(body);

    // Handle different webhook events
    switch (event.event) {
      case 'charge.success':
        await handleChargeSuccess(event.data);
        break;

      case 'charge.failed':
        await handleChargeFailed(event.data);
        break;

      case 'refund.processed':
        await handleRefundProcessed(event.data);
        break;

      case 'transfer.success':
        await handleTransferSuccess(event.data);
        break;

      default:
        console.log(`Unhandled webhook event: ${event.event}`);
    }

    return NextResponse.json({ status: 'success' });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
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
