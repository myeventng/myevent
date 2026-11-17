import type { Metadata } from 'next';
import Link from 'next/link';
import { Mail, MapPin, Phone, Instagram, HelpCircle } from 'lucide-react';
import { EventBackdrop } from '@/components/brand/event-backdrop';
import { ContactForm } from '@/components/contact/contact-form';
import { INSTAGRAM_URL, INSTAGRAM_HANDLE } from '@/lib/social';

export const metadata: Metadata = {
  title: 'Contact us | MyEvent.com.ng',
  description:
    'Questions about tickets, hosting an event or voting contests? Send the MyEvent team a message.',
};

const channels = [
  { icon: Mail, color: 'var(--me-magenta)', label: 'Email', value: 'info@myevent.com.ng', href: 'mailto:info@myevent.com.ng' },
  { icon: Phone, color: 'var(--me-violet)', label: 'Phone', value: '+234 906 635 5861', href: 'tel:+2349066355861' },
  { icon: Instagram, color: 'var(--me-red)', label: 'Instagram', value: INSTAGRAM_HANDLE, href: INSTAGRAM_URL, external: true },
];

export default function ContactPage() {
  return (
    <div className="bg-[var(--me-bg)]">
      <section className="relative overflow-hidden py-14 sm:py-20">
        <EventBackdrop variant="hero" />
        <div className="relative mx-auto max-w-3xl px-4 text-center">
          <h1 className="font-display text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
            Talk to us
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-[var(--me-muted)]">
            Tickets, hosting, contests or partnerships. Send a message and the team will get back to you.
          </p>
        </div>
      </section>

      <section className="relative overflow-hidden pb-20">
        <EventBackdrop variant="section" />
        <div className="relative mx-auto grid max-w-6xl gap-8 px-4 sm:px-6 lg:grid-cols-5 lg:px-8">
          <div className="space-y-4 lg:col-span-2">
            {channels.map(({ icon: Icon, color, label, value, href, external }) => (
              <a
                key={label}
                href={href}
                {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                className="me-card flex items-center gap-4 p-5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white"
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: color }}>
                  <Icon className="h-6 w-6 text-white" aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm text-[var(--me-muted)]">{label}</span>
                  <span className="block truncate font-bold">{value}</span>
                </span>
              </a>
            ))}

            <div className="me-card flex items-start gap-4 p-5">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--me-orange)]">
                <MapPin className="h-6 w-6 text-white" aria-hidden="true" />
              </span>
              <span>
                <span className="block text-sm text-[var(--me-muted)]">Office</span>
                <span className="block font-bold">49B Thuja Ville, NNPC Estate, Utako, Abuja, Nigeria</span>
              </span>
            </div>

            <Link
              href="/faqs"
              className="flex items-center gap-3 rounded-2xl border-2 border-dashed border-[var(--me-violet)] p-5 font-semibold hover:bg-[var(--me-surface)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white"
            >
              <HelpCircle className="h-6 w-6 text-[var(--me-violet)]" aria-hidden="true" />
              Check the FAQs for a quick answer
            </Link>
          </div>

          <div className="relative rounded-3xl border-2 border-[var(--me-line)] bg-[var(--me-surface)] p-6 shadow-[8px_8px_0_0_var(--me-red)] sm:p-8 lg:col-span-3">
            <h2 className="font-display mb-6 text-2xl font-extrabold">Send a message</h2>
            <ContactForm />
          </div>
        </div>
      </section>
    </div>
  );
}
