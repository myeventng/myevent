'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useInView } from 'react-intersection-observer';
import {
  SlidersHorizontal,
  Calendar,
  Loader2,
  Trophy,
  Vote,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { BrandLoader } from '@/components/brand/brand-loader';
import { EventBackdrop } from '@/components/brand/event-backdrop';
import { PageTitleHero } from '@/components/events/clientside/page-title-hero';
import { EventCard } from '@/components/events/clientside/event-card';
import { EventsFilters } from '@/components/events/clientside/event-filter';
import { MajorCategoryPills } from '@/components/events/major-category-pills';
import { useEventFilterOptions, useEventsInfinite } from '@/lib/queries';
import { useDebounce } from '@/hooks/use-debounce';

interface FilterState {
  search: string;
  majorCategoryId: string;
  categoryId: string;
  cityId: string;
  tagIds: string[];
  dateRange: string;
  priceRange: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  featured: boolean;
  // New filters for voting contests
  eventTypes: string[];
  votingStatus: string;
  votingType: string;
}

const EMPTY_FILTER_OPTIONS = { majorCategories: [], categories: [], cities: [], tags: [] } as {
  majorCategories: any[];
  categories: any[];
  cities: any[];
  tags: any[];
};

export default function EnhancedAllEventsPage() {
  // Filter state with new voting contest filters
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    majorCategoryId: '',
    categoryId: '',
    cityId: '',
    tagIds: [],
    dateRange: '',
    priceRange: '',
    sortBy: 'startDateTime',
    sortOrder: 'asc',
    featured: false,
    eventTypes: [],
    votingStatus: '',
    votingType: '',
  });

  // UI state
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  // Debounce search input
  const debouncedSearch = useDebounce(filters.search, 500);

  // Intersection observer for infinite scroll
  const { ref: loadMoreRef, inView } = useInView({
    threshold: 0,
    rootMargin: '100px',
  });

  // Events and filter options come from the persisted cache: the first visit asks the
  // server, later visits (and refreshes) show saved data straight away. Every filter
  // combination is cached on its own, so going back to a filter you used is instant too.
  const eventsQuery = useEventsInfinite({ ...filters, search: debouncedSearch });
  const filterOptionsQuery = useEventFilterOptions();

  const events = useMemo(
    () => eventsQuery.data?.pages.flatMap((page) => page.events) ?? [],
    [eventsQuery.data]
  );
  const totalCount = eventsQuery.data?.pages[0]?.totalCount ?? 0;
  const hasMore = eventsQuery.hasNextPage;
  const isLoading = eventsQuery.isPending;
  const isLoadingMore = eventsQuery.isFetchingNextPage;
  const isError = eventsQuery.isError;
  const filterOptions = filterOptionsQuery.data ?? EMPTY_FILTER_OPTIONS;
  const { fetchNextPage } = eventsQuery;

  // Handle infinite scroll
  useEffect(() => {
    if (inView && hasMore && !isLoadingMore && !isLoading) {
      fetchNextPage();
    }
  }, [inView, hasMore, isLoadingMore, isLoading, fetchNextPage]);

  // Update filter function
  const updateFilter = useCallback((key: keyof FilterState, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  // Clear all filters
  const clearAllFilters = useCallback(() => {
    setFilters({
      search: '',
      majorCategoryId: '',
      categoryId: '',
      cityId: '',
      tagIds: [],
      dateRange: '',
      priceRange: '',
      sortBy: 'startDateTime',
      sortOrder: 'asc',
      featured: false,
      eventTypes: [],
      votingStatus: '',
      votingType: '',
    });
  }, []);

  // Get active filters count
  const getActiveFiltersCount = useCallback(() => {
    let count = 0;
    if (filters.majorCategoryId) count++;
    if (filters.categoryId) count++;
    if (filters.cityId) count++;
    if (filters.tagIds.length > 0) count++;
    if (filters.dateRange) count++;
    if (filters.priceRange) count++;
    if (filters.featured) count++;
    if (filters.eventTypes.length > 0) count++;
    if (filters.votingStatus) count++;
    if (filters.votingType) count++;
    return count;
  }, [filters]);

  const activeFiltersCount = getActiveFiltersCount();

  // Picking a major category resets the category, which belongs to the previous group
  const selectMajorCategory = useCallback((id: string) => {
    setFilters((prev) => ({ ...prev, majorCategoryId: id, categoryId: '' }));
  }, []);

  // Handle hero search
  const handleHeroSearch = () => {
    // The search will automatically trigger due to the debounced effect
  };

  // Get unique cities and calculate stats
  const uniqueCities = filterOptions.cities?.length || 0;
  const totalAttendees = events.reduce(
    (sum, event) => sum + (event._count?.orders || 0),
    0
  );

  // Get event type counts for better UX
  const getEventTypeStats = () => {
    const standardEvents = events.filter(
      (e) => e.eventType === 'STANDARD'
    ).length;
    const votingContests = events.filter(
      (e) => e.eventType === 'VOTING_CONTEST'
    ).length;
    const inviteEvents = events.filter((e) => e.eventType === 'INVITE').length;

    return { standardEvents, votingContests, inviteEvents };
  };

  const eventTypeStats = getEventTypeStats();

  return (
    <div className="min-h-screen bg-[var(--me-bg)]">
      {/* Hero Section */}
      <PageTitleHero
        title="Find your next event"
        description="Concerts, festivals, workshops and voting contests across Nigeria."
        showSearch={true}
        searchPlaceholder="Search events, contests, venues or organizers"
        searchValue={filters.search}
        onSearchChange={(value) => updateFilter('search', value)}
        onSearchSubmit={handleHeroSearch}
        stats={{
          totalEvents: totalCount,
          totalLocations: uniqueCities,
          totalAttendees: Math.max(totalAttendees, 1000),
        }}
        height="md"
      />

      {/* Filter Controls Section */}
      <div className="sticky top-[72px] z-40 border-y-2 border-[var(--me-line)] bg-[var(--me-bg-deep)]">
        <div className="container mx-auto px-4 py-4">
          <MajorCategoryPills
            majorCategories={filterOptions.majorCategories}
            selectedId={filters.majorCategoryId}
            onSelect={selectMajorCategory}
            className="mb-4 pb-1"
          />
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            {/* Results Info and Sort */}
            <div className="flex items-center gap-4">
              <div className="text-sm text-muted-foreground">
                {isLoading
                  ? 'Loading events...'
                  : isError
                    ? 'Error loading events'
                    : `${totalCount} event${totalCount !== 1 ? 's' : ''} found`}
              </div>

              {/* Event Type Stats */}
              {!isLoading && !isError && totalCount > 0 && (
                <div className="hidden md:flex items-center gap-2">
                  {eventTypeStats.standardEvents > 0 && (
                    <Badge variant="outline" className="text-xs">
                      <Calendar className="h-3 w-3 mr-1" />
                      {eventTypeStats.standardEvents} Events
                    </Badge>
                  )}
                  {eventTypeStats.votingContests > 0 && (
                    <Badge
                      variant="outline"
                      className="text-xs text-white border-[var(--me-violet)]"
                    >
                      <Trophy className="h-3 w-3 mr-1" />
                      {eventTypeStats.votingContests} Contests
                    </Badge>
                  )}
                  {eventTypeStats.inviteEvents > 0 && (
                    <Badge
                      variant="outline"
                      className="text-xs text-white border-[var(--me-magenta)]"
                    >
                      <Calendar className="h-3 w-3 mr-1" />
                      {eventTypeStats.inviteEvents} Invite Only
                    </Badge>
                  )}
                </div>
              )}

              {/* Sort Dropdown */}
              <Select
                value={`${filters.sortBy}-${filters.sortOrder}`}
                onValueChange={(value) => {
                  const [sortBy, sortOrder] = value.split('-');
                  updateFilter('sortBy', sortBy);
                  updateFilter('sortOrder', sortOrder);
                }}
              >
                <SelectTrigger className="w-44 rounded-full border-2 border-[var(--me-line)] bg-transparent text-white sm:w-52">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="me-theme">
                  <SelectItem value="startDateTime-asc">
                    Date: Earliest First
                  </SelectItem>
                  <SelectItem value="startDateTime-desc">
                    Date: Latest First
                  </SelectItem>
                  <SelectItem value="title-asc">Title: A to Z</SelectItem>
                  <SelectItem value="title-desc">Title: Z to A</SelectItem>
                  <SelectItem value="featured-desc">Featured First</SelectItem>
                  <SelectItem value="createdAt-desc">Recently Added</SelectItem>
                  <SelectItem value="votes-desc">
                    Most Votes (Contests)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Filters Button */}
            <Sheet open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2 rounded-full border-2 border-[var(--me-violet)] bg-transparent text-white hover:bg-[var(--me-violet)] hover:text-white">
                  <SlidersHorizontal className="h-4 w-4" />
                  Filters
                  {activeFiltersCount > 0 && (
                    <Badge variant="secondary" className="ml-1">
                      {activeFiltersCount}
                    </Badge>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent className="me-theme w-full overflow-y-auto sm:max-w-md">
                <SheetHeader>
                  <SheetTitle>Filter Events</SheetTitle>
                  <SheetDescription>
                    Narrow down events and contests to find exactly what
                    you&apos;re looking for
                  </SheetDescription>
                </SheetHeader>

                <EventsFilters
                  filters={filters}
                  updateFilter={updateFilter}
                  clearAllFilters={clearAllFilters}
                  filterOptions={filterOptions}
                  onClose={() => setIsFiltersOpen(false)}
                />
              </SheetContent>
            </Sheet>
          </div>

          {/* Active Filters Display */}
          {activeFiltersCount > 0 && (
            <div className="flex flex-wrap gap-2 items-center mt-4 pt-4 border-t">
              <span className="text-sm text-muted-foreground">
                Active filters:
              </span>

              {filters.majorCategoryId && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Type:{' '}
                  {
                    filterOptions.majorCategories.find(
                      (m: any) => m.id === filters.majorCategoryId
                    )?.name
                  }
                  <button
                    onClick={() => selectMajorCategory('')}
                    className="ml-1 hover:bg-red-500 hover:text-white rounded-full w-4 h-4 flex items-center justify-center text-xs"
                  >
                    ×
                  </button>
                </Badge>
              )}

              {filters.categoryId && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Category:{' '}
                  {
                    filterOptions.categories.find(
                      (c: any) => c.id === filters.categoryId
                    )?.name
                  }
                  <button
                    onClick={() => updateFilter('categoryId', '')}
                    className="ml-1 hover:bg-red-500 hover:text-white rounded-full w-4 h-4 flex items-center justify-center text-xs"
                  >
                    ×
                  </button>
                </Badge>
              )}

              {filters.cityId && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  City:{' '}
                  {
                    filterOptions.cities.find(
                      (c: any) => c.id === filters.cityId
                    )?.name
                  }
                  <button
                    onClick={() => updateFilter('cityId', '')}
                    className="ml-1 hover:bg-red-500 hover:text-white rounded-full w-4 h-4 flex items-center justify-center text-xs"
                  >
                    ×
                  </button>
                </Badge>
              )}

              {filters.eventTypes.length > 0 && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Types:{' '}
                  {filters.eventTypes
                    .map((type) =>
                      type === 'VOTING_CONTEST'
                        ? 'Contests'
                        : type === 'INVITE'
                          ? 'Invite Only'
                          : 'Events'
                    )
                    .join(', ')}
                  <button
                    onClick={() => updateFilter('eventTypes', [])}
                    className="ml-1 hover:bg-red-500 hover:text-white rounded-full w-4 h-4 flex items-center justify-center text-xs"
                  >
                    ×
                  </button>
                </Badge>
              )}

              {filters.votingStatus && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Vote className="h-3 w-3" />
                  Voting: {filters.votingStatus.replace('_', ' ')}
                  <button
                    onClick={() => updateFilter('votingStatus', '')}
                    className="ml-1 hover:bg-red-500 hover:text-white rounded-full w-4 h-4 flex items-center justify-center text-xs"
                  >
                    ×
                  </button>
                </Badge>
              )}

              {filters.votingType && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  {filters.votingType === 'FREE' ? 'Free' : 'Paid'} Voting
                  <button
                    onClick={() => updateFilter('votingType', '')}
                    className="ml-1 hover:bg-red-500 hover:text-white rounded-full w-4 h-4 flex items-center justify-center text-xs"
                  >
                    ×
                  </button>
                </Badge>
              )}

              {filters.tagIds.length > 0 && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Tags: {filters.tagIds.length}
                  <button
                    onClick={() => updateFilter('tagIds', [])}
                    className="ml-1 hover:bg-red-500 hover:text-white rounded-full w-4 h-4 flex items-center justify-center text-xs"
                  >
                    ×
                  </button>
                </Badge>
              )}

              {filters.dateRange && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Date: {filters.dateRange.replace('_', ' ')}
                  <button
                    onClick={() => updateFilter('dateRange', '')}
                    className="ml-1 hover:bg-red-500 hover:text-white rounded-full w-4 h-4 flex items-center justify-center text-xs"
                  >
                    ×
                  </button>
                </Badge>
              )}

              {filters.priceRange && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Price: {filters.priceRange.replace('_', ' ')}
                  <button
                    onClick={() => updateFilter('priceRange', '')}
                    className="ml-1 hover:bg-red-500 hover:text-white rounded-full w-4 h-4 flex items-center justify-center text-xs"
                  >
                    ×
                  </button>
                </Badge>
              )}

              {filters.featured && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Featured only
                  <button
                    onClick={() => updateFilter('featured', false)}
                    className="ml-1 hover:bg-red-500 hover:text-white rounded-full w-4 h-4 flex items-center justify-center text-xs"
                  >
                    ×
                  </button>
                </Badge>
              )}

              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllFilters}
                className="text-muted-foreground hover:text-foreground"
              >
                Clear all
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="relative overflow-hidden">
      <EventBackdrop variant="section" />
      <div className="container relative mx-auto px-4 py-10">
        {/* Loading State */}
        {isLoading && (
          <BrandLoader label="Loading events" className="rounded-2xl" />
        )}

        {/* Error State */}
        {isError && (
          <Card className="mx-auto max-w-md border-2 border-[var(--me-line)] bg-[var(--me-surface)] text-white">
            <CardContent className="p-6 text-center">
              <div className="mb-4 text-[var(--me-red)]">
                <Calendar className="h-12 w-12 mx-auto" />
              </div>
              <h3 className="font-display mb-2 text-xl font-bold">We could not load events</h3>
              <p className="text-muted-foreground mb-4">
                Check your connection and try again.
              </p>
              <Button onClick={() => eventsQuery.refetch()} className="rounded-full bg-[var(--me-red)] font-bold">Try again</Button>
            </CardContent>
          </Card>
        )}

        {/* Events Grid */}
        {!isLoading && !isError && (
          <>
            {events.length === 0 ? (
              <Card className="mx-auto max-w-md border-2 border-[var(--me-line)] bg-[var(--me-surface)] text-white">
                <CardContent className="p-6 text-center">
                  <div className="text-muted-foreground mb-4">
                    {filters.eventTypes.includes('VOTING_CONTEST') &&
                    filters.eventTypes.length === 1 ? (
                      <Trophy className="h-12 w-12 mx-auto" />
                    ) : (
                      <Calendar className="h-12 w-12 mx-auto" />
                    )}
                  </div>
                  <h3 className="font-display mb-2 text-xl font-bold">
                    No{' '}
                    {filters.eventTypes.includes('VOTING_CONTEST') &&
                    filters.eventTypes.length === 1
                      ? 'Contests'
                      : 'Events'}{' '}
                    Found
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    {activeFiltersCount > 0
                      ? `No ${filters.eventTypes.includes('VOTING_CONTEST') && filters.eventTypes.length === 1 ? 'contests' : 'events'} match your current filters. Try adjusting your search criteria.`
                      : `No ${filters.eventTypes.includes('VOTING_CONTEST') && filters.eventTypes.length === 1 ? 'contests' : 'events'} are currently available. Check back later for new ones.`}
                  </p>
                  {activeFiltersCount > 0 && (
                    <Button variant="outline" onClick={clearAllFilters} className="rounded-full border-2 border-[var(--me-violet)] bg-transparent text-white hover:bg-[var(--me-violet)] hover:text-white">
                      Clear filters
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {events.map((event, index) => (
                  <EventCard key={`${event.id}-${index}`} event={event} />
                ))}
              </div>
            )}

            {/* Load More Trigger */}
            {hasMore && (
              <div
                ref={loadMoreRef}
                className="flex justify-center items-center py-8"
              >
                {isLoadingMore && (
                  <>
                    <Loader2 className="h-6 w-6 animate-spin mr-2" />
                    <span>Loading more events...</span>
                  </>
                )}
              </div>
            )}

            {/* End of Results */}
            {!hasMore && events.length > 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <p>That is every event for now.</p>
                <p className="text-sm mt-1">
                  {events.length} events shown
                </p>
              </div>
            )}
          </>
        )}
      </div>
      </div>
    </div>
  );
}
