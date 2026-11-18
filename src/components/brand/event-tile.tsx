import React from 'react';
import Link from 'next/link';
import { EventImage } from '@/components/brand/event-image';
import { Calendar } from 'lucide-react';
import { format } from 'date-fns';

export interface TileEvent {
  id: string;
  slug: string;
  title: string;
  coverImageUrl?: string;
  mobileImageUrl?: string | null;
  imageUrls?: string[];
  startDateTime: string;
  venue: { name: string; city?: { name: string } };
  category?: { name: string };
  isFree: boolean;
  ticketTypes: Array<{ price: number }>;
}

/** Compact poster card used in the home page rails. */
export function EventTile({
  event,
  priority = false,
}: {
  event: TileEvent;
  priority?: boolean;
}) {
  const image = event.coverImageUrl || event.imageUrls?.[0];
  const min = event.ticketTypes.length
    ? Math.min(...event.ticketTypes.map((t) => t.price))
    : 0;
  const price = event.isFree
    ? 'Free'
    : `From ${new Intl.NumberFormat('en-NG', {
        style: 'currency',
        currency: 'NGN',
        maximumFractionDigits: 0,
      }).format(min)}`;

  return (
    <Link
      href={`/events/${event.slug}`}
      className="me-card group flex h-full flex-col overflow-hidden focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white"
    >
      <div className="relative aspect-[4/5] w-full overflow-hidden bg-[var(--me-raised)]">
        {image ? (
          <EventImage
            src={image}
            mobileSrc={event.mobileImageUrl}
            sizes="(max-width: 1024px) 72vw, 25vw"
            priority={priority}
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Calendar className="h-12 w-12 text-[var(--me-line)]" aria-hidden="true" />
          </div>
        )}
        {event.category && (
          <span className="absolute left-3 top-3 rounded-full bg-[var(--me-bg-deep)] px-3 py-1 text-xs font-semibold text-white">
            {event.category.name}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <p className="text-sm font-semibold text-[var(--me-red-text)]">
          {format(new Date(event.startDateTime), 'EEE d MMM, h:mm a')}
        </p>
        <h3 className="font-display line-clamp-2 text-xl font-bold leading-snug text-white">
          {event.title}
        </h3>
        <p className="line-clamp-1 text-sm text-[var(--me-muted)]">
          {event.venue.name}
          {event.venue.city ? `, ${event.venue.city.name}` : ''}
        </p>
        <p className="mt-auto pt-3 text-base font-bold text-white">{price}</p>
      </div>
    </Link>
  );
}
