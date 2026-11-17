'use client';

import React, { memo } from 'react';
import { Calendar } from 'lucide-react';
import { HallBackdrop } from '@/components/brand/hall-backdrop';
import { SectionHeading } from '@/components/brand/section-heading';
import { EventTile } from '@/components/brand/event-tile';
import { MajorCategoryPills } from '@/components/events/major-category-pills';

interface Event {
  id: string;
  slug: string;
  title: string;
  description?: string;
  coverImageUrl?: string;
  imageUrls?: string[];
  startDateTime: string;
  venue: {
    name: string;
    city?: {
      name: string;
    };
  };
  category?: {
    name: string;
  };
  tags: Array<{
    name: string;
    bgColor: string;
  }>;
  isFree: boolean;
  ticketTypes: Array<{
    price: number;
  }>;
}

interface Category {
  id: string;
  name: string;
}

interface ExploreEventsSectionProps {
  events: Event[];
  categories: Category[];
  /** Selected major category id, '' for all. */
  selectedCategoryId: string;
  onCategoryChange: (id: string) => void;
  maxEventsToShow?: number;
}

export const ExploreEventsSection: React.FC<ExploreEventsSectionProps> = memo(
  function ExploreEventsSection({
    events,
    categories,
    selectedCategoryId,
    onCategoryChange,
    maxEventsToShow = 8,
  }) {
    const selectedName = categories.find((c) => c.id === selectedCategoryId)?.name ?? '';
    const displayEvents = events.slice(0, maxEventsToShow);

    return (
      <section className="relative overflow-hidden bg-[var(--me-bg-deep)] py-14 sm:py-20">
        <HallBackdrop />
        <div className="relative mx-auto max-w-7xl lg:px-8">
          <SectionHeading
            title="Explore events"
            subtitle="Pick a category and see what is coming up"
            href="/events"
            linkLabel="All events"
          />

          <MajorCategoryPills
            majorCategories={categories}
            selectedId={selectedCategoryId}
            onSelect={onCategoryChange}
            className="mb-8 px-4 pb-1 lg:px-0"
          />

          {displayEvents.length > 0 ? (
            <div className="me-rail scrollbar-hide me-rail--grid">
              {displayEvents.map((event) => (
                <EventTile key={event.id} event={event} />
              ))}
            </div>
          ) : (
            <div className="mx-4 rounded-2xl border-2 border-dashed border-[var(--me-line)] px-6 py-14 text-center lg:mx-0">
              <Calendar className="mx-auto mb-4 h-12 w-12 text-[var(--me-violet)]" aria-hidden="true" />
              <h3 className="font-display text-2xl font-bold">No events here yet</h3>
              <p className="mx-auto mt-2 max-w-md text-[var(--me-muted)]">
                {selectedCategoryId === ''
                  ? 'New events are added all the time. Check back soon.'
                  : `Nothing is listed under ${selectedName} right now. Try another category.`}
              </p>
              {selectedCategoryId !== '' && (
                <button
                  type="button"
                  onClick={() => onCategoryChange('')}
                  className="mt-6 rounded-full bg-[var(--me-red)] px-6 py-3 font-bold text-white"
                >
                  Show all categories
                </button>
              )}
            </div>
          )}
        </div>
      </section>
    );
  }
);
