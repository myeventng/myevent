// app/api/payment/callback/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  completeOrder,
  completeOrderWithSelections,
} from '@/actions/order.actions';
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
          let result;

          // FIXED: Try to get ticket selections from Paystack metadata first
          const ticketSelections = data.data.metadata?.ticketSelections;

          if (ticketSelections && Array.isArray(ticketSelections)) {
            console.log(
              'Using ticket selections from Paystack metadata:',
              ticketSelections
            );
            result = await completeOrderWithSelections(
              order.id,
              ticketSelections,
              reference
            );
          } else {
            // FIXED: Try to get ticket selections from stored order data
            let storedSelections = null;

            try {
              if (order.purchaseNotes) {
                const parsed = JSON.parse(order.purchaseNotes);
                storedSelections = parsed.ticketSelections;
              }
            } catch (parseError) {
              console.warn(
                'Could not parse stored ticket selections:',
                parseError
              );
            }

            if (storedSelections && Array.isArray(storedSelections)) {
              console.log(
                'Using ticket selections from stored data:',
                storedSelections
              );
              result = await completeOrderWithSelections(
                order.id,
                storedSelections,
                reference
              );
            } else {
              // Fallback to old method with improved logic
              console.warn('No ticket selections found, using fallback method');
              result = await completeOrder(order.id, reference);
            }
          }

          if (!result.success) {
            console.error(
              `Failed to complete order ${order.id}:`,
              result.message
            );
            return NextResponse.redirect(
              `${process.env.NEXT_PUBLIC_APP_URL}/payment/error?error=completion_failed&message=${encodeURIComponent(result.message || 'Unknown error')}`
            );
          }

          console.log(`Order ${order.id} completed successfully`);
        } else {
          console.log(`Order ${order.id} was already completed`);
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
      `${process.env.NEXT_PUBLIC_APP_URL}/payment/error?error=system_error&details=${encodeURIComponent(error instanceof Error ? error.message : 'Unknown error')}`
    );
  }
}

// OPTIONAL: Add webhook handler for server-to-server notifications
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
        },
      });

      if (order && order.paymentStatus === 'PENDING') {
        console.log(`Processing webhook for order ${order.id}`);

        // Try to get ticket selections from webhook metadata
        const ticketSelections = data.metadata?.ticketSelections;

        let result;
        if (ticketSelections && Array.isArray(ticketSelections)) {
          result = await completeOrderWithSelections(
            order.id,
            ticketSelections,
            reference
          );
        } else {
          // Try to get from stored order data
          let storedSelections = null;
          try {
            if (order.purchaseNotes) {
              const parsed = JSON.parse(order.purchaseNotes);
              storedSelections = parsed.ticketSelections;
            }
          } catch (parseError) {
            console.warn(
              'Could not parse stored ticket selections in webhook:',
              parseError
            );
          }

          if (storedSelections) {
            result = await completeOrderWithSelections(
              order.id,
              storedSelections,
              reference
            );
          } else {
            result = await completeOrder(order.id, reference);
          }
        }

        if (result.success) {
          console.log(`Webhook: Order ${order.id} completed successfully`);
        } else {
          console.error(
            `Webhook: Failed to complete order ${order.id}:`,
            result.message
          );
        }
      } else if (order) {
        console.log(
          `Webhook: Order ${order.id} already completed or not found`
        );
      }
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
