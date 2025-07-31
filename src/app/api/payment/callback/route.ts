import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { completeOrder } from '@/actions/order.actions';
import { getSetting } from '@/actions/platform-settings.actions';

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
    // Get Paystack secret key from platform settings
    const paystackSecretKey = await getSetting('financial.paystackSecretKey');

    if (!paystackSecretKey) {
      console.error('Paystack secret key not configured');
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/payment/error?error=config`
      );
    }

    // Verify payment with Paystack
    const response = await fetch(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${paystackSecretKey}`,
        },
      }
    );

    const data = await response.json();

    if (data.status && data.data.status === 'success') {
      // Find the order
      const order = await prisma.order.findUnique({
        where: { paystackId: reference },
        include: {
          event: true,
          buyer: true,
        },
      });

      if (order) {
        // Verify amount matches
        const expectedAmount = order.totalAmount * 100; // Convert to kobo
        const paidAmount = data.data.amount;

        if (paidAmount !== expectedAmount) {
          console.error(
            `Amount mismatch for order ${order.id}: expected ${expectedAmount}, got ${paidAmount}`
          );
          return NextResponse.redirect(
            `${process.env.NEXT_PUBLIC_APP_URL}/payment/error?error=amount_mismatch`
          );
        }

        // Complete the order if not already completed
        if (order.paymentStatus !== 'COMPLETED') {
          const result = await completeOrder(order.id, reference);

          if (!result.success) {
            console.error(
              `Failed to complete order ${order.id}:`,
              result.message
            );
            return NextResponse.redirect(
              `${process.env.NEXT_PUBLIC_APP_URL}/payment/error?error=completion_failed`
            );
          }
        }

        return NextResponse.redirect(
          `${process.env.NEXT_PUBLIC_APP_URL}/payment/success?orderId=${order.id}`
        );
      } else {
        console.error(`Order not found for reference: ${reference}`);
        return NextResponse.redirect(
          `${process.env.NEXT_PUBLIC_APP_URL}/payment/error?error=order_not_found&reference=${reference}`
        );
      }
    } else {
      console.error('Payment verification failed:', data);
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/payment/error?error=verification_failed&reference=${reference}`
      );
    }
  } catch (error) {
    console.error('Payment callback error:', error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/payment/error?error=system_error`
    );
  }
}
