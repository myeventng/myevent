import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Mail, Instagram, MapPin, Phone } from 'lucide-react';
import { CrowdBackdrop } from '@/components/brand/crowd-backdrop';
import { INSTAGRAM_URL, INSTAGRAM_HANDLE } from '@/lib/social';

const linkClass =
  'inline-block py-1 text-[var(--me-muted)] transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white rounded-sm';

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative overflow-hidden bg-[var(--me-bg-deep)] text-white">
      <CrowdBackdrop className="opacity-20" />

      <div className="relative mx-auto max-w-7xl px-4 pb-10 pt-16 sm:px-6 lg:px-8">
        {/* Call to action */}
        <div className="mb-14 flex flex-col items-start justify-between gap-6 rounded-3xl border-2 border-[var(--me-line)] bg-[var(--me-surface)] p-6 shadow-[8px_8px_0_0_var(--me-red)] sm:p-10 md:flex-row md:items-center">
          <div>
            <h2 className="font-display text-3xl font-extrabold sm:text-4xl">
              Got an event? Sell the tickets here.
            </h2>
            <p className="mt-2 max-w-xl text-[var(--me-muted)]">
              Create your event page, sell tickets online and scan guests in at
              the door.
            </p>
          </div>
          <Link
            href="/events/create"
            className="inline-flex shrink-0 items-center rounded-full bg-[var(--me-red)] px-7 py-3.5 text-base font-bold text-white shadow-[4px_4px_0_0_var(--me-violet)] transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            Host your event
          </Link>
        </div>

        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {/* About + social */}
          <div className="sm:col-span-2 lg:col-span-1">
            <Link href="/" aria-label="MyEvent home" className="inline-block">
              <Image
                src="/assets/icons/logo-myevent.png"
                alt="MyEvent"
                width={150}
                height={71}
                className="h-14 w-auto"
              />
            </Link>
            <p className="mt-4 max-w-xs text-[var(--me-muted)]">
              Discover events, buy tickets and vote in contests across Nigeria.
            </p>
            <a
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 inline-flex items-center gap-2 rounded-full border-2 border-[var(--me-line)] px-4 py-2 text-sm font-semibold transition-colors hover:border-[var(--me-magenta)] hover:bg-[var(--me-magenta)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <Instagram className="h-5 w-5" aria-hidden="true" />
              {INSTAGRAM_HANDLE}
            </a>
          </div>

          <nav aria-label="Explore">
            <h3 className="font-display mb-3 text-lg font-bold">Explore</h3>
            <ul>
              <li><Link href="/" className={linkClass}>Home</Link></li>
              <li><Link href="/events" className={linkClass}>Events</Link></li>
              <li><Link href="/blog" className={linkClass}>Blog</Link></li>
              <li><Link href="/events/create" className={linkClass}>Host an event</Link></li>
              <li><Link href="/faqs" className={linkClass}>FAQs</Link></li>
              <li><Link href="/contact" className={linkClass}>Contact</Link></li>
            </ul>
          </nav>

          <nav aria-label="Legal">
            <h3 className="font-display mb-3 text-lg font-bold">Legal</h3>
            <ul>
              <li><Link href="/terms" className={linkClass}>Terms of service</Link></li>
              <li><Link href="/privacy" className={linkClass}>Privacy policy</Link></li>
              <li><Link href="/cookies" className={linkClass}>Cookie policy</Link></li>
            </ul>
          </nav>

          <div>
            <h3 className="font-display mb-3 text-lg font-bold">Contact</h3>
            <ul className="space-y-3 text-[var(--me-muted)]">
              <li className="flex items-start gap-2">
                <MapPin className="mt-1 h-5 w-5 shrink-0 text-[var(--me-red)]" aria-hidden="true" />
                <span>
                  49B Thuja Ville, NNPC Estate,
                  <br />
                  Utako, Abuja, Nigeria
                </span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="h-5 w-5 shrink-0 text-[var(--me-violet)]" aria-hidden="true" />
                <a href="tel:+2349066355861" className="hover:text-white">+234 906 635 5861</a>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="h-5 w-5 shrink-0 text-[var(--me-magenta)]" aria-hidden="true" />
                <a href="mailto:info@myevent.com.ng" className="hover:text-white">info@myevent.com.ng</a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t-2 border-[var(--me-line)] pt-6 text-sm text-[var(--me-muted)]">
          <p>© {currentYear} Myevent.com.ng. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
