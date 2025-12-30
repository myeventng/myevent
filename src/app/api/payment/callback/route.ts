// app/api/payment/callback/route.ts - COMPLETELY FIXED
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { completeOrder } from '@/actions/order.actions';
import { verifyVotePayment } from '@/actions/voting-contest.actions';
import crypto from 'crypto';

// CRITICAL: Process references to prevent duplicate processing
const processingReferences = new Map<string, Promise<any>>();

async function processOrderWithLock(
  reference: string,
  processor: () => Promise<any>
): Promise<any> {
  // Check if already processing
  const existing = processingReferences.get(reference);
  if (existing) {
    console.log(`⚠️ Reference ${reference} already being processed, waiting...`);
    return existing;
  }

  // Create processing promise
  const processingPromise = (async () => {
    try {
      return await processor();
    } finally {
      // Clean up after 30 seconds
      setTimeout(() => {
        processingReferences.delete(reference);
      }, 30000);
    }
  })();

  processingReferences.set(reference, processingPromise);
  return processingPromise;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const reference = searchParams.get('reference');

  console.log(`💳 Payment callback (GET) received for reference: ${reference}`);

  if (!reference) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/payment/error?error=no_reference`
    );
  }

  try {
    // Use lock to prevent duplicate processing
    const result = await processOrderWithLock(reference, async () => {
      // First, check if it's a vote order
      const voteOrder = await prisma.voteOrder.findUnique({
        where: { paystackId: reference },
        include: {
          contest: {
            select: {
              event: {
                select: {
                  id: true,
                  slug: true,
                },
              },
            },
          },
        },
      });

      if (voteOrder) {
        // CRITICAL CHECK: Only process if not already completed
        if (voteOrder.paymentStatus === 'COMPLETED') {
          console.log(`✅ Vote order ${voteOrder.id} already completed, skipping`);
          return {
            type: 'vote',
            orderId: voteOrder.id,
            alreadyCompleted: true,
          };
        }

        console.log(`🗳️ Processing vote order ${voteOrder.id}`);
        const result = await verifyVotePayment({
          voteOrderId: voteOrder.id,
          paystackReference: reference,
          paystackData: { reference },
        });

        if (!result.success) {
          console.error(`❌ Failed to complete vote order:`, result.message);
          throw new Error(result.message || 'Vote completion failed');
        }

        return {
          type: 'vote',
          orderId: voteOrder.id,
          eventId: voteOrder.contest.event.id,
        };
      }

      // Handle regular ticket order
      const order = await prisma.order.findUnique({
        where: { paystackId: reference },
        include: {
          tickets: { select: { id: true } },
        },
      });

      if (!order) {
        console.error(`❌ Order not found for reference: ${reference}`);
        throw new Error('Order not found');
      }

      // CRITICAL CHECK: If order is completed AND has tickets, skip processing
      if (order.paymentStatus === 'COMPLETED' && order.tickets.length > 0) {
        console.log(
          `✅ Order ${order.id} already completed with ${order.tickets.length} tickets, skipping duplicate processing`
        );
        return {
          type: 'order',
          orderId: order.id,
          alreadyCompleted: true,
        };
      }

      // Parse guest info
      let isGuestPurchase = false;
      let guestEmail: string | undefined;
      let guestName: string | undefined;

      try {
        const purchaseData = JSON.parse(order.purchaseNotes || '{}');
        isGuestPurchase = purchaseData.isGuestPurchase || false;
        guestEmail = purchaseData.guestEmail;
        guestName = purchaseData.guestName;
      } catch (error) {
        console.error('Failed to parse purchase notes:', error);
      }

      console.log(`🎫 Processing order ${order.id} (Guest: ${isGuestPurchase})`);

      const result = await completeOrder(
        order.id,
        reference,
        isGuestPurchase ? { guestEmail, guestName } : undefined
      );

      if (!result.success) {
        console.error(`❌ Failed to complete order:`, result.message);
        throw new Error(result.message || 'Order completion failed');
      }

      return {
        type: 'order',
        orderId: order.id,
        isGuest: isGuestPurchase,
        guestEmail,
      };
    });

    // Build success redirect URL
    const successUrl = new URL(
      `${process.env.NEXT_PUBLIC_APP_URL}/payment/success`
    );

    if (result.type === 'vote') {
      successUrl.searchParams.set('voteOrderId', result.orderId);
      successUrl.searchParams.set('type', 'vote');
    } else {
      successUrl.searchParams.set('orderId', result.orderId);
      if (result.isGuest && result.guestEmail) {
        successUrl.searchParams.set('guest', 'true');
        successUrl.searchParams.set('email', result.guestEmail);
      }
    }

    console.log(`✅ Redirecting to success page`);
    return NextResponse.redirect(successUrl.toString());
  } catch (error) {
    console.error('❌ Payment callback error:', error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/payment/error?error=system_error&message=${encodeURIComponent(
        error instanceof Error ? error.message : 'Unknown error'
      )}`
    );
  }
}

// Handle POST requests (Paystack webhook) - IDEMPOTENT VERSION
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Verify Paystack signature
    const signature = request.headers.get('x-paystack-signature');
    const secretKey = process.env.PAYSTACK_SECRET_KEY;

    if (!signature || !secretKey) {
      console.error('❌ Missing Paystack signature or secret key');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const hash = crypto
      .createHmac('sha512', secretKey)
      .update(JSON.stringify(body))
      .digest('hex');

    if (hash !== signature) {
      console.error('❌ Invalid Paystack signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    console.log(`🔔 Webhook received: ${body.event}`);

    // Process webhook event with idempotency
    if (body.event === 'charge.success') {
      const reference = body.data.reference;

      // Use lock to prevent duplicate processing from webhook
      await processOrderWithLock(reference, async () => {
        // Check for vote order
        const voteOrder = await prisma.voteOrder.findUnique({
          where: { paystackId: reference },
          select: { id: true, paymentStatus: true },
        });

        if (voteOrder) {
          // Skip if already completed
          if (voteOrder.paymentStatus === 'COMPLETED') {
            console.log(
              `✅ Webhook: Vote order ${voteOrder.id} already completed, skipping`
            );
            return;
          }

          console.log(`🔔 Webhook: Processing vote order ${voteOrder.id}`);
          await verifyVotePayment({
            voteOrderId: voteOrder.id,
            paystackReference: reference,
            paystackData: body.data,
          });
          return;
        }

        // Check for regular order
        const order = await prisma.order.findUnique({
          where: { paystackId: reference },
          include: {
            tickets: { select: { id: true } },
          },
        });

        if (order) {
          // Skip if already completed with tickets
          if (order.paymentStatus === 'COMPLETED' && order.tickets.length > 0) {
            console.log(
              `✅ Webhook: Order ${order.id} already completed with ${order.tickets.length} tickets, skipping`
            );
            return;
          }

          // Parse guest info
          let guestInfo: { guestEmail?: string; guestName?: string } | undefined;
          try {
            const purchaseData = JSON.parse(order.purchaseNotes || '{}');
            if (purchaseData.isGuestPurchase) {
              guestInfo = {
                guestEmail: purchaseData.guestEmail,
                guestName: purchaseData.guestName,
              };
            }
          } catch (error) {
            console.error('Webhook: Error parsing purchase notes:', error);
          }

          console.log(`🔔 Webhook: Processing order ${order.id}`);
          await completeOrder(order.id, reference, guestInfo);
        }
      });
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('❌ Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}