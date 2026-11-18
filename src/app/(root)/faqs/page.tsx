import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
import { EventBackdrop } from '@/components/brand/event-backdrop';
import { FAQ_GROUPS } from '@/lib/faqs';

export const metadata: Metadata = {
  title: 'FAQs | MyEvent.com.ng',
  description:
    'Answers about buying tickets, payments, hosting events and voting contests on MyEvent.com.ng.',
};

export default function FaqsPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ_GROUPS.flatMap((g) => g.items).map((i) => ({
      '@type': 'Question',
      name: i.q,
      acceptedAnswer: { '@type': 'Answer', text: i.a },
    })),
  };

  return (
    <div className="bg-[var(--me-bg)]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <section className="relative overflow-hidden py-14 sm:py-20">
        <EventBackdrop variant="hero" />
        <div className="relative mx-auto max-w-3xl px-4 text-center">
          <h1 className="font-display text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
            Frequently asked questions
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-[var(--me-muted)]">
            Quick answers about tickets, payments, hosting and contests.
          </p>
          <nav aria-label="FAQ sections" className="mt-8 flex flex-wrap justify-center gap-2">
            {FAQ_GROUPS.map((g) => (
              <a
                key={g.id}
                href={`#${g.id}`}
                className="me-slide-right rounded-full border-2 border-[var(--me-line)] px-4 py-2 text-sm font-semibold hover:border-[var(--me-violet)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                {g.title}
              </a>
            ))}
          </nav>
        </div>
      </section>

      <section className="relative overflow-hidden pb-20">
        <EventBackdrop variant="section" />
        <div className="relative mx-auto max-w-3xl space-y-12 px-4">
          {FAQ_GROUPS.map((group) => (
            <div key={group.id} id={group.id} className="scroll-mt-24">
              <h2 className="font-display mb-4 text-2xl font-extrabold sm:text-3xl">{group.title}</h2>
              <div className="space-y-3">
                {group.items.map((item) => (
                  <details
                    key={item.q}
                    className="group rounded-2xl border-2 border-[var(--me-line)] bg-[var(--me-surface)] open:border-[var(--me-red)] open:shadow-[5px_5px_0_0_var(--me-red)]"
                  >
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-2xl p-5 text-lg font-bold focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white [&::-webkit-details-marker]:hidden">
                      {item.q}
                      <ChevronDown className="h-5 w-5 shrink-0 text-[var(--me-violet)] transition-transform group-open:rotate-180" aria-hidden="true" />
                    </summary>
                    <p className="px-5 pb-5 text-base leading-relaxed text-[var(--me-muted)]">{item.a}</p>
                  </details>
                ))}
              </div>
            </div>
          ))}

          <div className="rounded-3xl border-2 border-[var(--me-line)] bg-[var(--me-surface)] p-6 text-center shadow-[8px_8px_0_0_var(--me-violet)] sm:p-8">
            <h2 className="font-display text-2xl font-extrabold">Did not find your answer?</h2>
            <p className="mt-2 text-[var(--me-muted)]">Send us a message and we will help.</p>
            <Link
              href="/contact"
              className="me-slide-right mt-5 inline-flex rounded-full bg-[var(--me-red)] px-7 py-3.5 font-bold text-white shadow-[4px_4px_0_0_var(--me-violet)] hover:shadow-[4px_4px_0_0_var(--me-red)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              Contact us
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
