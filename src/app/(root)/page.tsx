import { Suspense } from 'react';
import { Metadata } from 'next';
import SimpleAllEventsPage from '@/components/events/clientside/all-events';

export const metadata: Metadata = {
  title: 'Discover Events | Your Event Platform',
  description:
    'Find amazing events happening near you. Search, filter, and discover events that match your interests.',
  keywords:
    'events, discover, search, filter, entertainment, conferences, workshops',
  openGraph: {
    title: 'Discover Events',
    description: 'Find amazing events happening near you',
    type: 'website',
  },
};

function EventsPageSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header Skeleton */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="h-8 w-48 bg-muted animate-pulse rounded" />
              <div className="h-4 w-64 bg-muted animate-pulse rounded" />
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 h-10 bg-muted animate-pulse rounded" />
              <div className="w-full sm:w-48 h-10 bg-muted animate-pulse rounded" />
              <div className="w-full sm:w-32 h-10 bg-muted animate-pulse rounded" />
            </div>
          </div>
        </div>
      </div>

      {/* Content Skeleton */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 12 }).map((_, index) => (
            <div key={index} className="space-y-4">
              <div className="aspect-[4/3] bg-muted animate-pulse rounded-lg" />
              <div className="space-y-2">
                <div className="h-4 w-16 bg-muted animate-pulse rounded" />
                <div className="h-6 w-full bg-muted animate-pulse rounded" />
                <div className="h-4 w-3/4 bg-muted animate-pulse rounded" />
                <div className="h-4 w-1/2 bg-muted animate-pulse rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function EventsPage() {
  return (
    <Suspense fallback={<EventsPageSkeleton />}>
      <SimpleAllEventsPage />
    </Suspense>
  );
}
