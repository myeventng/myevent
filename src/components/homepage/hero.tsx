'use client';

import React, { useCallback, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { format } from 'date-fns';
import { ArrowRight, Calendar, ChevronLeft, ChevronRight, MapPin } from 'lucide-react';
import { BrandLoader } from '@/components/brand/brand-loader';

interface HeroEvent {
  id: string;
  slug: string;
  title: string;
  coverImageUrl?: string;
  imageUrls?: string[];
  startDateTime: string;
  venue: { name: string; city?: { name: string } };
}

interface HeroSectionProps {
  featuredEvents: HeroEvent[];
  /** Nothing to show yet: the logo loader covers the whole screen. */
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
}

const SLIDE_MS = 6500;

const MAX_TITLE_LENGTH = 80;

function shortTitle(title: string): string {
  const t = (title ?? '').trim();
  return t.length > MAX_TITLE_LENGTH ? `${t.slice(0, MAX_TITLE_LENGTH - 1).trimEnd()}…` : t;
}

/**
 * Full-bleed featured-event slider (modelled on shoobs.com):
 * the event poster is the section background, with the event title, date and place,
 * one button, side arrows and a row of progress bars at the bottom.
 * The header floats on top of it (transparent until the page scrolls).
 */
export const HeroSection: React.FC<HeroSectionProps> = ({
  featuredEvents,
  isLoading = false,
  isError = false,
  onRetry,
}) => {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchX = useRef<number | null>(null);

  const slides = useMemo(
    () =>
      featuredEvents.map((event) => ({
        id: event.id,
        slug: event.slug,
        // very long titles are shortened (CSS clamping clips the tails of letters like g and y)
        title: shortTitle(event.title),
        image: event.coverImageUrl || event.imageUrls?.[0] || '',
        date: format(new Date(event.startDateTime), 'EEE, d MMM yyyy'),
        place: event.venue.city?.name || event.venue.name,
      })),
    [featuredEvents]
  );

  const count = slides.length;
  const active = count ? Math.min(current, count - 1) : 0;

  const go = useCallback(
    (dir: 1 | -1) => setCurrent((p) => (p + dir + count) % count),
    [count]
  );

  if (isLoading) {
    return <BrandLoader fullScreen label="Loading events" />;
  }

  // Nothing to slide: a plain block that sits under the header
  if (count === 0) {
    return (
      <section className="-mt-[72px] bg-[var(--me-bg)] px-4 pb-20 pt-[160px] text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/assets/brand/logo-myevent.svg"
          alt="MyEvent"
          width={625}
          height={365}
          className="mx-auto h-auto w-[min(70vw,300px)]"
        />
        <h1 className="font-display mt-6 text-2xl font-extrabold sm:text-3xl">
          {isError ? 'We could not load the events' : 'No events are live right now'}
        </h1>
        <p className="mx-auto mt-2 max-w-md text-[var(--me-muted)]">
          {isError
            ? 'Check your connection and try again.'
            : 'New events are added all the time. Check back soon, or host your own.'}
        </p>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          {isError && onRetry ? (
            <button
              type="button"
              onClick={onRetry}
              className="me-slide-right rounded-full bg-[var(--me-red)] px-7 py-3 font-bold text-white shadow-[4px_4px_0_0_var(--me-violet)] hover:shadow-[4px_4px_0_0_var(--me-red)]"
            >
              Try again
            </button>
          ) : (
            <Link
              href="/events/create"
              className="me-slide-right rounded-full bg-[var(--me-red)] px-7 py-3 font-bold text-white shadow-[4px_4px_0_0_var(--me-violet)] hover:shadow-[4px_4px_0_0_var(--me-red)]"
            >
              Host an event
            </Link>
          )}
          <Link
            href="/events"
            className="me-slide-right rounded-full border-2 border-[var(--me-line)] px-7 py-3 font-bold text-white hover:border-[var(--me-violet)]"
          >
            Browse events
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section
      className="relative -mt-[72px] h-[80svh] min-h-[520px] overflow-hidden bg-[var(--me-bg-deep)] lg:h-[calc(100svh-48px)] lg:max-h-[960px]"
      aria-roledescription="carousel"
      aria-label="Featured events"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={(e) => {
        touchX.current = e.touches[0].clientX;
      }}
      onTouchEnd={(e) => {
        if (touchX.current === null || count < 2) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
        touchX.current = null;
      }}
    >
      {/* Slides: poster as background, cross-fading with a slow zoom */}
      {slides.map((slide, i) => {
        const isActive = i === active;
        return (
          <div
            key={slide.id}
            aria-hidden={!isActive}
            className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
              isActive ? 'opacity-100' : 'opacity-0'
            }`}
          >
            {slide.image ? (
              <Image
                src={slide.image}
                alt=""
                fill
                priority={i === 0}
                quality={80}
                sizes="100vw"
                className={`object-cover transition-transform ease-out ${
                  isActive
                    ? 'scale-100 duration-[7000ms]'
                    : 'scale-110 duration-0'
                }`}
              />
            ) : (
              <div className="h-full w-full bg-[var(--me-surface)]" />
            )}
          </div>
        );
      })}

      {/* Flat dark layer so white text stays readable on any poster */}
      <div className="absolute inset-0 bg-[#12061f]/55" aria-hidden="true" />

      {/* Text for each slide */}
      {slides.map((slide, i) => {
        const isActive = i === active;
        return (
          <div
            key={slide.id}
            aria-live={isActive ? 'polite' : undefined}
            aria-hidden={!isActive}
            className={`absolute inset-0 flex flex-col items-center justify-center px-6 pb-16 pt-[72px] text-center transition-all duration-700 ${
              isActive
                ? 'translate-y-0 opacity-100 delay-200'
                : 'pointer-events-none translate-y-4 opacity-0'
            }`}
          >
            <h1 className="font-display max-w-4xl pb-1 text-4xl font-extrabold leading-[1.15] tracking-tight text-white sm:text-5xl lg:text-7xl">
              {slide.title}
            </h1>
            <p className="mt-5 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-base font-semibold text-white sm:text-lg">
              <span className="inline-flex items-center gap-2">
                <Calendar className="h-5 w-5 text-white" aria-hidden="true" />
                {slide.date}
              </span>
              <span className="inline-flex items-center gap-2">
                <MapPin className="h-5 w-5 text-white" aria-hidden="true" />
                {slide.place}
              </span>
            </p>
            <Link
              href={`/events/${slide.slug}`}
              tabIndex={isActive ? 0 : -1}
              className="me-slide-right mt-8 inline-flex items-center gap-2 rounded-full bg-[var(--me-red)] px-9 py-4 text-base font-bold text-white shadow-[4px_4px_0_0_var(--me-violet)] hover:shadow-[4px_4px_0_0_var(--me-red)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              Get tickets
              <ArrowRight className="h-5 w-5" aria-hidden="true" />
            </Link>
          </div>
        );
      })}

      {count > 1 && (
        <>
          <button
            type="button"
            onClick={() => go(-1)}
            aria-label="Previous event"
            className="absolute left-2 top-1/2 z-10 hidden h-11 w-11 sm:inline-flex -translate-y-1/2 items-center justify-center rounded-full text-white transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:left-6 sm:h-14 sm:w-14"
          >
            <ChevronLeft className="h-8 w-8 sm:h-10 sm:w-10" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            aria-label="Next event"
            className="absolute right-2 top-1/2 z-10 hidden h-11 w-11 sm:inline-flex -translate-y-1/2 items-center justify-center rounded-full text-white transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:right-6 sm:h-14 sm:w-14"
          >
            <ChevronRight className="h-8 w-8 sm:h-10 sm:w-10" aria-hidden="true" />
          </button>

          {/* Progress bars: the active one fills, and when it is full the slider advances */}
          <div className="absolute inset-x-0 bottom-6 z-10 flex items-center justify-center gap-2 px-6 sm:bottom-8">
            {slides.map((slide, i) => (
              <button
                key={slide.id}
                type="button"
                onClick={() => setCurrent(i)}
                aria-label={`Show event ${i + 1} of ${count}`}
                aria-current={i === active}
                className="group flex h-6 w-12 items-center focus-visible:outline-none sm:w-16"
              >
                <span className="relative block h-1 w-full overflow-hidden rounded-full bg-white/35 group-focus-visible:ring-2 group-focus-visible:ring-white">
                  {i === active ? (
                    <span
                      key={`${slide.id}-${active}`}
                      className="me-progress absolute inset-0 bg-white"
                      style={{
                        animationDuration: `${SLIDE_MS}ms`,
                        animationPlayState: paused ? 'paused' : 'running',
                      }}
                      onAnimationEnd={() => go(1)}
                    />
                  ) : null}
                </span>
              </button>
            ))}
          </div>
        </>
      )}
    </section>
  );
};
