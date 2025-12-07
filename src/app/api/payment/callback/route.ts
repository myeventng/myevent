// app/api/payment/callback/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { completeOrder } from '@/actions/order.actions';
import { verifyVotePayment } from '@/actions/voting-contest.actions';
import crypto from 'crypto';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const reference = searchParams.get('reference');

  console.log(`Payment callback received for reference: ${reference}`);

  if (!reference) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/payment/error?error=no_reference`
    );
  }

  try {
    // First, check if it's a vote order
    const voteOrder = await prisma.voteOrder.findUnique({
      where: { paystackId: reference },
      select: {
        id: true,
        paymentStatus: true,
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
      // Handle vote order callback
      if (voteOrder.paymentStatus !== 'COMPLETED') {
        console.log(`Completing vote order ${voteOrder.id} via callback`);
        const result = await verifyVotePayment({
          voteOrderId: voteOrder.id,
          paystackReference: reference,
          paystackData: { reference },
        });

        if (!result.success) {
          console.error(
            `Failed to complete vote order ${voteOrder.id}:`,
            result.message
          );
          return NextResponse.redirect(
            `${process.env.NEXT_PUBLIC_APP_URL}/payment/error?error=completion_failed&message=${encodeURIComponent(result.message || 'Unknown error')}&type=vote&eventId=${voteOrder.contest.event.id}`
          );
        }
      }

      // Redirect to unified success page with vote order parameters
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/payment/success?voteOrderId=${voteOrder.id}&type=vote`
      );
    }

    // Handle regular ticket order callback
    const order = await prisma.order.findUnique({
      where: { paystackId: reference },
      select: {
        id: true,
        paymentStatus: true,
        buyerId: true,
        purchaseNotes: true,
      },
    });

    if (!order) {
      console.error(`Order not found for reference: ${reference}`);
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/payment/error?error=order_not_found`
      );
    }

    // Check if this is a guest purchase
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

    // Complete the order if not already completed
    if (order.paymentStatus !== 'COMPLETED') {
      console.log(`Completing order ${order.id} via callback`);

      const result = await completeOrder(
        order.id,
        reference,
        isGuestPurchase ? { guestEmail, guestName } : undefined
      );

      if (!result.success) {
        console.error(`Failed to complete order ${order.id}:`, result.message);
        return NextResponse.redirect(
          `${process.env.NEXT_PUBLIC_APP_URL}/payment/error?error=completion_failed&message=${encodeURIComponent(result.message || 'Unknown error')}`
        );
      }
    }

    // Redirect to unified success page with appropriate parameters
    const successUrl = new URL(
      `${process.env.NEXT_PUBLIC_APP_URL}/payment/success`
    );
    successUrl.searchParams.set('orderId', order.id);

    if (isGuestPurchase && guestEmail) {
      successUrl.searchParams.set('guest', 'true');
      successUrl.searchParams.set('email', guestEmail);
    }

    return NextResponse.redirect(successUrl.toString());
  } catch (error) {
    console.error('Payment callback error:', error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/payment/error?error=system_error`
    );
  }
}

// Handle POST requests (Paystack webhook)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Verify Paystack signature
    const signature = request.headers.get('x-paystack-signature');
    const secretKey = process.env.PAYSTACK_SECRET_KEY;

    if (!signature || !secretKey) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // Remove the require() and use the imported crypto
    const hash = crypto
      .createHmac('sha512', secretKey)
      .update(JSON.stringify(body))
      .digest('hex');

    if (hash !== signature) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // Process webhook event
    if (body.event === 'charge.success') {
      const reference = body.data.reference;

      // Check for vote order
      const voteOrder = await prisma.voteOrder.findUnique({
        where: { paystackId: reference },
        select: { id: true },
      });

      if (voteOrder) {
        await verifyVotePayment({
          voteOrderId: voteOrder.id,
          paystackReference: reference,
          paystackData: body.data,
        });
        return NextResponse.json({ received: true });
      }

      // Check for regular order
      const order = await prisma.order.findUnique({
        where: { paystackId: reference },
        select: { id: true, purchaseNotes: true },
      });

      if (order) {
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
          console.error('Error parsing purchase notes:', error);
        }

        await completeOrder(order.id, reference, guestInfo);
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
