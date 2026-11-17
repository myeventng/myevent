'use client';

import React from 'react';
import { EventBackdrop } from '@/components/brand/event-backdrop';
import { SectionHeading } from '@/components/brand/section-heading';
import { EventTile, type TileEvent } from '@/components/brand/event-tile';

interface FeaturedEventsSectionProps {
  featuredEvents: TileEvent[];
}

export const FeaturedEventsSection: React.FC<FeaturedEventsSectionProps> = ({
  featuredEvents,
}) => {
  if (featuredEvents.length === 0) return null;

  return (
    <section className="relative overflow-hidden bg-[var(--me-bg)] py-14 sm:py-20">
      <EventBackdrop variant="section" />
      <div className="relative mx-auto max-w-7xl lg:px-8">
        <SectionHeading
          title="On the pulse"
          subtitle="Featured events everyone is talking about"
          href="/events?featured=true"
          linkLabel="Show all"
        />
        <div className="me-rail scrollbar-hide me-rail--grid">
          {featuredEvents.slice(0, 8).map((event, i) => (
            <EventTile key={event.id} event={event} priority={i < 2} />
          ))}
        </div>
      </div>
    </section>
  );
};
