// app/api/payment/callback/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { completeOrder } from '@/actions/order.actions';
import { verifyVotePayment } from '@/actions/voting-contest.actions';

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
      select: { id: true, paymentStatus: true },
    });

    if (!order) {
      console.error(`Order not found for reference: ${reference}`);
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/payment/error?error=order_not_found`
      );
    }

    // Complete the order if not already completed
    if (order.paymentStatus !== 'COMPLETED') {
      console.log(`Completing order ${order.id} via callback`);
      const result = await completeOrder(order.id, reference);

      if (!result.success) {
        console.error(`Failed to complete order ${order.id}:`, result.message);
        return NextResponse.redirect(
          `${process.env.NEXT_PUBLIC_APP_URL}/payment/error?error=completion_failed&message=${encodeURIComponent(result.message || 'Unknown error')}`
        );
      }
    }

    // Redirect to unified success page with regular order parameters
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/payment/success?orderId=${order.id}`
    );
  } catch (error) {
    console.error('Payment callback error:', error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/payment/error?error=system_error`
    );
  }
}
