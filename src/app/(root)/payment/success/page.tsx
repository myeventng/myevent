// app/payment/success/page.tsx
import { prisma } from '@/lib/prisma';
import Link from 'next/link';

export default async function PaymentSuccess({
  searchParams,
}: {
  searchParams: Promise<{ orderId?: string }>;
}) {
  const params = await searchParams;

  const order = params.orderId
    ? await prisma.order.findUnique({
        where: { id: params.orderId },
        include: { event: true },
      })
    : null;

  return (
    <main className="mx-auto max-w-2xl py-16 px-4">
      <h1 className="text-2xl font-bold mb-2">Payment Successful 🎉</h1>
      <p className="text-muted-foreground mb-6">
        {order ? (
          <>
            Order <span className="font-mono">{order.id.slice(-8)}</span> for "
            {order.event.title}" is confirmed.
          </>
        ) : (
          'Your order is confirmed.'
        )}
      </p>
      <Link className="underline" href="/dashboard/tickets">
        Go to My Tickets
      </Link>
    </main>
  );
}
