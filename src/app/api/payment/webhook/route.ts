import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { completeOrder } from '@/actions/order.actions';
import { getSetting } from '@/actions/platform-settings.actions';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-paystack-signature');

    if (!signature) {
      return NextResponse.json({ error: 'No signature' }, { status: 400 });
    }

    // Verify webhook signature
    const paystackSecretKey =
      (await getSetting('financial.paystackSecretKey')) ||
      process.env.PAYSTACK_SECRET_KEY;
    if (!paystackSecretKey) {
      return NextResponse.json(
        { error: 'Configuration error' },
        { status: 500 }
      );
    }

    const hash = crypto
      .createHmac('sha512', paystackSecretKey)
      .update(body)
      .digest('hex');
    if (hash !== signature) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const webhookData = JSON.parse(body);
    const { event, data } = webhookData;

    console.log(`Webhook received: ${event} for reference: ${data?.reference}`);

    // Handle successful payment
    if (event === 'charge.success' && data?.reference) {
      const order = await prisma.order.findUnique({
        where: { paystackId: data.reference },
        select: { id: true, paymentStatus: true, totalAmount: true },
      });

      if (!order) {
        console.error(
          `Webhook: Order not found for reference: ${data.reference}`
        );
        return NextResponse.json({ status: 'order_not_found' });
      }

      if (order.paymentStatus === 'COMPLETED') {
        return NextResponse.json({ status: 'already_completed' });
      }

      // Verify amount
      const expectedKobo = Math.round(order.totalAmount * 100);
      const paidKobo = data.amount;

      if (paidKobo !== expectedKobo) {
        console.error(
          `Webhook: Amount mismatch - expected ${expectedKobo}, got ${paidKobo}`
        );
        return NextResponse.json({ status: 'amount_mismatch' });
      }

      // Complete the order
      const result = await completeOrder(order.id, data.reference);

      if (result.success) {
        console.log(`Webhook: Order ${order.id} completed successfully`);
        return NextResponse.json({ status: 'success' });
      } else {
        console.error(
          `Webhook: Failed to complete order ${order.id}:`,
          result.message
        );
        return NextResponse.json({
          status: 'completion_failed',
          error: result.message,
        });
      }
    }

    // Handle failed payment
    if (event === 'charge.failed' && data?.reference) {
      await prisma.order
        .update({
          where: { paystackId: data.reference },
          data: { paymentStatus: 'FAILED' },
        })
        .catch(() => {}); // Ignore errors for failed orders
    }

    return NextResponse.json({ status: 'success' });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json({ status: 'error' }, { status: 500 });
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
