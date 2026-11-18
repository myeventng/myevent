'use client';

import { useState, useTransition } from 'react';
import { CheckCircle2, Loader2, Send } from 'lucide-react';
import { submitContactMessage } from '@/actions/contact-actions';
import { CONTACT_TOPICS } from '@/lib/contact-topics';

const field =
  'w-full rounded-xl border-2 border-[var(--me-line)] bg-[var(--me-bg)] px-4 py-3 text-base text-white placeholder:text-[var(--me-muted)] focus:border-[var(--me-violet)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--me-violet)]';

export function ContactForm() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    setError(null);

    startTransition(async () => {
      const res = await submitContactMessage({
        name: String(fd.get('name') ?? ''),
        email: String(fd.get('email') ?? ''),
        phone: String(fd.get('phone') ?? ''),
        topic: String(fd.get('topic') ?? '') as (typeof CONTACT_TOPICS)[number],
        subject: String(fd.get('subject') ?? ''),
        message: String(fd.get('message') ?? ''),
        website: String(fd.get('website') ?? ''),
      });
      if (res.success) {
        form.reset();
        setDone(true);
      } else {
        setError(res.message);
      }
    });
  }

  if (done) {
    return (
      <div role="status" className="py-10 text-center">
        <CheckCircle2 className="mx-auto h-14 w-14 text-[var(--me-red)]" aria-hidden="true" />
        <h2 className="font-display mt-4 text-3xl font-extrabold">Message sent</h2>
        <p className="mx-auto mt-2 max-w-sm text-[var(--me-muted)]">
          Thanks for reaching out. We will reply to the email address you gave us.
        </p>
        <button
          type="button"
          onClick={() => setDone(false)}
          className="me-slide-right mt-6 rounded-full border-2 border-[var(--me-violet)] px-6 py-2.5 font-semibold text-white"
        >
          Send another message
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="c-name" className="mb-1.5 block text-sm font-semibold">Your name</label>
          <input id="c-name" name="name" required autoComplete="name" className={field} placeholder="Chioma Okafor" />
        </div>
        <div>
          <label htmlFor="c-email" className="mb-1.5 block text-sm font-semibold">Email</label>
          <input id="c-email" name="email" type="email" required autoComplete="email" className={field} placeholder="you@example.com" />
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="c-phone" className="mb-1.5 block text-sm font-semibold">
            Phone <span className="font-normal text-[var(--me-muted)]">(optional)</span>
          </label>
          <input id="c-phone" name="phone" type="tel" autoComplete="tel" className={field} placeholder="0803 000 0000" />
        </div>
        <div>
          <label htmlFor="c-topic" className="mb-1.5 block text-sm font-semibold">What is this about?</label>
          <select id="c-topic" name="topic" defaultValue={CONTACT_TOPICS[0]} className={field}>
            {CONTACT_TOPICS.map((t) => (
              <option key={t} value={t} className="bg-[#1b0b2e]">{t}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="c-subject" className="mb-1.5 block text-sm font-semibold">Subject</label>
        <input id="c-subject" name="subject" required className={field} placeholder="Short summary" />
      </div>

      <div>
        <label htmlFor="c-message" className="mb-1.5 block text-sm font-semibold">Message</label>
        <textarea id="c-message" name="message" required rows={6} className={`${field} resize-y`} placeholder="Include the event name or order details if this is about a booking." />
      </div>

      {/* Honeypot: hidden from people, bots fill it */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="c-website">Website</label>
        <input id="c-website" name="website" tabIndex={-1} autoComplete="off" />
      </div>

      {error && (
        <p role="alert" className="rounded-xl border-2 border-[var(--me-red)] px-4 py-3 text-sm font-medium">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="me-slide-right inline-flex w-full items-center justify-center gap-2 rounded-full bg-[var(--me-red)] px-7 py-4 text-base font-bold text-white shadow-[4px_4px_0_0_var(--me-violet)] hover:shadow-[4px_4px_0_0_var(--me-red)] disabled:opacity-60 sm:w-auto"
      >
        {pending ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : <Send className="h-5 w-5" aria-hidden="true" />}
        {pending ? 'Sending...' : 'Send message'}
      </button>
    </form>
  );
}
