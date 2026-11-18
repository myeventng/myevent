'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { unsubscribeByToken } from '@/actions/newsletter-actions';

// Unsubscribing needs a click: email scanners that open links in the
// background must not be able to unsubscribe people by accident.
export function UnsubscribeForm({ token }: { token: string }) {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  if (result) {
    return (
      <div role="status">
        <h1 className="font-display text-3xl font-extrabold">
          {result.ok ? 'You are unsubscribed' : 'Something went wrong'}
        </h1>
        <p className="mt-3 text-[var(--me-muted)]">{result.message}</p>
        <Link href="/" className="me-slide-right mt-6 inline-flex rounded-full bg-[var(--me-red)] px-6 py-3 font-bold text-white">
          Back to MyEvent
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-display text-3xl font-extrabold">Unsubscribe</h1>
      <p className="mt-3 text-[var(--me-muted)]">
        Stop receiving MyEvent newsletters at this email address?
      </p>
      <button
        type="button"
        disabled={pending || !token}
        onClick={() =>
          start(async () => {
            const r = await unsubscribeByToken(token);
            setResult({ ok: r.success, message: r.message ?? '' });
          })
        }
        className="me-slide-right mt-6 rounded-full bg-[var(--me-red)] px-7 py-3.5 font-bold text-white shadow-[4px_4px_0_0_var(--me-violet)] disabled:opacity-60"
      >
        {pending ? 'Unsubscribing...' : 'Yes, unsubscribe me'}
      </button>
      {!token && <p className="mt-4 text-sm text-[var(--me-muted)]">This link is missing its token.</p>}
    </div>
  );
}
