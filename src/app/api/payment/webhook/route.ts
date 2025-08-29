// src/app/api/payment/webhook/route.ts - FIXED VERSION
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { completeOrderWithSelections } from '@/actions/order.actions';
import { getSetting } from '@/actions/platform-settings.actions';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text(); // Get raw body for signature verification
    const signature = request.headers.get('x-paystack-signature');

    if (!signature) {
      console.error('Webhook: No signature provided');
      return NextResponse.json({ error: 'No signature' }, { status: 400 });
    }

    // Get Paystack secret key
    const paystackSecretKey =
      (await getSetting('financial.paystackSecretKey')) ||
      process.env.PAYSTACK_SECRET_KEY;

    if (!paystackSecretKey) {
      console.error('Webhook: Paystack secret key not configured');
      return NextResponse.json(
        { error: 'Configuration error' },
        { status: 500 }
      );
    }

    // Verify webhook signature
    const hash = crypto
      .createHmac('sha512', paystackSecretKey)
      .update(body)
      .digest('hex');

    if (hash !== signature) {
      console.error('Webhook: Invalid signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // Parse the verified body
    const webhookData = JSON.parse(body);
    const { event, data } = webhookData;

    console.log(
      'Paystack webhook verified and received:',
      event,
      data?.reference
    );

    // Handle charge.success event
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

      // Verify amount matches
      const expectedKobo = Math.round(order.totalAmount * 100);
      const paidKobo = data.amount;

      if (paidKobo !== expectedKobo) {
        console.error(
          `Webhook: Amount mismatch for order ${order.id}: expected ${expectedKobo}, got ${paidKobo}`
        );
        return NextResponse.json({ status: 'amount_mismatch' });
      }

      console.log(`Webhook: Processing order ${order.id}`);

      // Get ticket selections with proper fallback
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

      // Ensure we have valid ticket selections
      if (!ticketSelections || ticketSelections.length === 0) {
        console.error(
          `Webhook: No valid ticket selections found for order: ${order.id}`
        );
        return NextResponse.json({
          status: 'no_ticket_selections',
          orderId: order.id,
        });
      }

      // Complete order with specific ticket selections
      const result = await completeOrderWithSelections(
        order.id,
        ticketSelections,
        reference
      );

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
    }

    // Handle other webhook events
    if (event === 'charge.failed') {
      await handleChargeFailed(data);
    } else if (event === 'refund.processed') {
      await handleRefundProcessed(data);
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

async function handleChargeFailed(data: any) {
  try {
    const { reference } = data;

    const order = await prisma.order.findUnique({
      where: { paystackId: reference },
    });

    if (order && order.paymentStatus === 'PENDING') {
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

    const order = await prisma.order.findUnique({
      where: { paystackId: transaction.reference },
      include: { tickets: true },
    });

    if (order) {
      await prisma.$transaction(async (tx) => {
        // Update order status
        await tx.order.update({
          where: { id: order.id },
          data: {
            paymentStatus: 'REFUNDED',
            refundStatus: 'PROCESSED',
          },
        });

        // Update tickets status
        await tx.ticket.updateMany({
          where: { orderId: order.id },
          data: { status: 'REFUNDED' },
        });

        // Return ticket quantities to inventory
        const ticketCounts = await tx.ticket.groupBy({
          by: ['ticketTypeId'],
          where: { orderId: order.id },
          _count: true,
        });

        for (const count of ticketCounts) {
          await tx.ticketType.update({
            where: { id: count.ticketTypeId },
            data: { quantity: { increment: count._count } },
          });
        }
      });

      console.log(`Refund processed for order ${order.id}`);
    }
  } catch (error) {
    console.error('Error handling refund processed:', error);
  }
}
