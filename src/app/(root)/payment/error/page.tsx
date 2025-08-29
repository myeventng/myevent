// app/payment/error/page.tsx
export default async function PaymentError({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="mx-auto max-w-2xl py-44 px-4">
      <h1 className="text-2xl font-bold mb-2">Payment Error</h1>
      <p className="text-muted-foreground mb-6">
        Something went wrong
        {params.error ? `: ${params.error}` : ''}.
      </p>
      <a className="underline" href="/dashboard/orders">
        Back to Orders
      </a>
    </main>
  );
}
