'use client';

import React from 'react';
import { Search } from 'lucide-react';
import { CrowdBackdrop } from '@/components/brand/crowd-backdrop';

interface PageTitleHeroProps {
  title: string;
  subtitle?: string;
  description?: string;
  backgroundImage?: string;
  showSearch?: boolean;
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  onSearchSubmit?: () => void;
  stats?: {
    totalEvents?: number;
    totalLocations?: number;
    totalAttendees?: number;
  };
  className?: string;
  height?: 'sm' | 'md' | 'lg' | 'xl';
}

/** Solid dark-purple page header with an event SVG backdrop and search. */
export const PageTitleHero: React.FC<PageTitleHeroProps> = ({
  title,
  description,
  showSearch = false,
  searchPlaceholder = 'Search events, contests, venues or organizers',
  searchValue = '',
  onSearchChange,
  onSearchSubmit,
  className = '',
  height = 'md',
}) => {
  const pad = {
    sm: 'py-10 sm:py-14',
    md: 'py-14 sm:py-20',
    lg: 'py-16 sm:py-24',
    xl: 'py-20 sm:py-28',
  }[height];

  return (
    <div className={`relative overflow-hidden bg-[var(--me-bg)] ${pad} ${className}`}>
      <CrowdBackdrop />
      <div className="relative mx-auto max-w-3xl px-4 text-center">
        <h1 className="font-display text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
          {title}
        </h1>
        {description && (
          <p className="mx-auto mt-4 max-w-2xl text-lg text-[var(--me-muted)]">
            {description}
          </p>
        )}

        {showSearch && (
          <form
            role="search"
            onSubmit={(e) => {
              e.preventDefault();
              onSearchSubmit?.();
            }}
            className="mx-auto mt-8 flex max-w-2xl items-center gap-2 rounded-full border-2 border-[var(--me-violet)] bg-[var(--me-surface)] p-1.5 shadow-[6px_6px_0_0_var(--me-red)]"
          >
            <label htmlFor="events-search" className="sr-only">
              Search events
            </label>
            <Search className="ml-3 h-5 w-5 shrink-0 text-[var(--me-muted)]" aria-hidden="true" />
            <input
              id="events-search"
              type="text"
              placeholder={searchPlaceholder}
              value={searchValue}
              onChange={(e) => onSearchChange?.(e.target.value)}
              className="min-w-0 flex-1 bg-transparent px-1 py-2.5 text-base text-white placeholder:text-[var(--me-muted)] focus:outline-none"
            />
            <button
              type="submit"
              className="me-slide-right shrink-0 rounded-full bg-[var(--me-red)] px-5 py-2.5 text-sm font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              Search
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
