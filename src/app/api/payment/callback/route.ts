import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { completeOrder } from '@/actions/order.actions';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const reference = searchParams.get('reference');
  const status = searchParams.get('status');

  if (!reference) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/payment/error`
    );
  }

  try {
    // Verify payment with Paystack
    const response = await fetch(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        },
      }
    );

    const data = await response.json();

    if (data.status && data.data.status === 'success') {
      // Find the order
      const order = await prisma.order.findUnique({
        where: { paystackId: reference },
        include: { event: true },
      });

      if (order) {
        // Complete the order if not already completed
        if (order.paymentStatus !== 'COMPLETED') {
          await completeOrder(order.id, reference);
        }

        return NextResponse.redirect(
          `${process.env.NEXT_PUBLIC_APP_URL}/payment/success?orderId=${order.id}`
        );
      }
    }

    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/payment/error?reference=${reference}`
    );
  } catch (error) {
    console.error('Payment callback error:', error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/payment/error`
    );
  }
}
