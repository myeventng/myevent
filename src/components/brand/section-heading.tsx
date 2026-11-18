import React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

interface SectionHeadingProps {
  title: string;
  subtitle?: string;
  href?: string;
  linkLabel?: string;
}

export function SectionHeading({
  title,
  subtitle,
  href,
  linkLabel = 'See all',
}: SectionHeadingProps) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4 px-4 lg:px-0">
      <div>
        <h2 className="font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
          {title}
        </h2>
        {subtitle && (
          <p className="mt-1 max-w-xl text-base text-[var(--me-muted)]">
            {subtitle}
          </p>
        )}
      </div>
      {href && (
        <Link
          href={href}
          className="me-slide-right group inline-flex shrink-0 items-center gap-1.5 rounded-full border-2 border-[var(--me-violet)] px-4 py-2 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          {linkLabel}
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      )}
    </div>
  );
}
