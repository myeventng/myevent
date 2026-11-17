import type { Metadata } from 'next';
import { UnsubscribeForm } from '@/components/contact/unsubscribe-form';

export const metadata: Metadata = {
  title: 'Unsubscribe | MyEvent.com.ng',
  robots: { index: false },
};

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return (
    <div className="flex min-h-[60vh] items-center justify-center bg-[var(--me-bg)] px-4 py-16">
      <div className="w-full max-w-md rounded-3xl border-2 border-[var(--me-line)] bg-[var(--me-surface)] p-8 text-center shadow-[8px_8px_0_0_var(--me-red)]">
        <UnsubscribeForm token={token ?? ''} />
      </div>
    </div>
  );
}
