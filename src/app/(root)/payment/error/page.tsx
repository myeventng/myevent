// app/payment/error/page.tsx
export default function PaymentError({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  return (
    <main className="mx-auto max-w-2xl py-16 px-4">
      <h1 className="text-2xl font-bold mb-2">Payment Error</h1>
      <p className="text-muted-foreground mb-6">
        Something went wrong
        {searchParams.error ? `: ${searchParams.error}` : ''}.
      </p>
      <a className="underline" href="/dashboard/orders">
        Back to Orders
      </a>
    </main>
  );
}
