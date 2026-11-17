'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { HeroSection } from '@/components/homepage/hero';
import {
  useEventFilterOptions,
  useFeaturedEvents,
  useHomeEvents,
  usePublishedBlogs,
} from '@/lib/queries';

// Lazy load non-critical sections
const FeaturedEventsSection = dynamic(
  () =>
    import('@/components/homepage/featured-events').then((mod) => ({
      default: mod.FeaturedEventsSection,
    })),
  { ssr: false }
);

const ExploreEventsSection = dynamic(
  () =>
    import('@/components/homepage/explore-events').then((mod) => ({
      default: mod.ExploreEventsSection,
    })),
  { ssr: false }
);

const BlogSection = dynamic(
  () =>
    import('@/components/homepage/blog-section').then((mod) => ({
      default: mod.BlogSection,
    })),
  { ssr: false }
);

const NewsletterSection = dynamic(
  () =>
    import('@/components/homepage/newsletter-section').then((mod) => ({
      default: mod.NewsletterSection,
    })),
  { ssr: false }
);

const NO_EVENTS: any[] = [];

export function HomepageClient() {
  const [majorCategoryId, setMajorCategoryId] = useState('');

  // All four lists come from the persisted cache (localStorage). They hit the server on the
  // first visit only; after that they render instantly and refresh quietly in the background.
  const featured = useFeaturedEvents();
  const filters = useEventFilterOptions();
  const majorCategories: Array<{ id: string; name: string }> =
    filters.data?.majorCategories ?? NO_EVENTS;
  // `allUpcoming` is the unfiltered list (it also feeds the hero when nothing is featured);
  // `regular` is the list for the selected major category. With "All" selected they are the
  // same query, so nothing extra is fetched.
  const allUpcoming = useHomeEvents('');
  const regular = useHomeEvents(majorCategoryId);
  const blogs = usePublishedBlogs(1, 3);

  const featuredEvents = featured.data ?? NO_EVENTS;
  const regularEvents = regular.data ?? NO_EVENTS;
  const upcomingEvents = allUpcoming.data ?? NO_EVENTS;

  // Hero slides: featured events, or the next upcoming events when nothing is featured
  const heroEvents = useMemo(
    () => (featuredEvents.length > 0 ? featuredEvents : upcomingEvents.slice(0, 5)),
    [featuredEvents, upcomingEvents]
  );

  // The full-screen logo loader shows only while there is nothing to put in the hero yet:
  // the very first visit, before the first response arrives.
  const heroLoading =
    featured.isPending || (featuredEvents.length === 0 && allUpcoming.isPending);

  return (
    <div>
      <HeroSection
        featuredEvents={heroEvents}
        isLoading={heroLoading}
        isError={featured.isError && heroEvents.length === 0}
        onRetry={() => {
          featured.refetch();
          allUpcoming.refetch();
        }}
      />

      {!heroLoading && (
        <>
          {featuredEvents.length > 0 && (
            <FeaturedEventsSection featuredEvents={featuredEvents} />
          )}

          {(regularEvents.length > 0 || majorCategories.length > 0) && (
            <ExploreEventsSection
              events={regularEvents}
              categories={majorCategories}
              selectedCategoryId={majorCategoryId}
              onCategoryChange={setMajorCategoryId}
            />
          )}

          {(blogs.data?.length ?? 0) > 0 && <BlogSection blogPosts={blogs.data ?? []} />}

          <NewsletterSection />
        </>
      )}
    </div>
  );
}
