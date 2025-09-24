'use client';

import { useState, useEffect, useCallback } from 'react';
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
import { PageTitleHero } from '@/components/events/clientside/page-title-hero';
import { EventCard } from '@/components/events/clientside/event-card';
import { EventsFilters } from '@/components/events/clientside/event-filter';
import {
  getEventsWithFilters,
  getEventFilterOptions,
} from '@/actions/event.actions';
import { useDebounce } from '@/hooks/use-debounce';

interface FilterState {
  search: string;
  categoryId: string;
  cityId: string;
  tagIds: string[];
  dateRange: string;
  priceRange: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  featured: boolean;
  eventTypes: string[];
  votingStatus: string;
  votingType: string;
}

export default function EnhancedAllEventsPage() {
  // Data state
  const [events, setEvents] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isError, setIsError] = useState(false);

  // Filter state with new voting contest filters
  const [filters, setFilters] = useState<FilterState>({
    search: '',
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
  const [filterOptions, setFilterOptions] = useState<{
    categories: any[];
    cities: any[];
    tags: any[];
  }>({
    categories: [],
    cities: [],
    tags: [],
  });

  // Debounce search input
  const debouncedSearch = useDebounce(filters.search, 500);

  // Intersection observer for infinite scroll
  const { ref: loadMoreRef, inView } = useInView({
    threshold: 0,
    rootMargin: '100px',
  });

  // Fetch events function with new filters
  const fetchEvents = useCallback(
    async (page: number = 1, reset: boolean = false) => {
      try {
        if (reset) {
          setIsLoading(true);
          setIsError(false);
        } else {
          setIsLoadingMore(true);
        }

        const response = await getEventsWithFilters({
          page,
          limit: 12,
          search: debouncedSearch,
          categoryId: filters.categoryId,
          cityId: filters.cityId,
          tagIds: filters.tagIds,
          dateRange: filters.dateRange,
          priceRange: filters.priceRange,
          sortBy: filters.sortBy,
          sortOrder: filters.sortOrder,
          featured: filters.featured,
          eventTypes: filters.eventTypes,
          votingStatus: filters.votingStatus,
          votingType: filters.votingType,
        });

        if (!response.success) {
          throw new Error(response.message || 'Failed to fetch events');
        }

        const {
          events: newEvents,
          totalCount,
          hasMore: moreAvailable,
        } = response.data!;

        if (reset) {
          setEvents(newEvents);
        } else {
          setEvents((prev) => [...prev, ...newEvents]);
        }

        setTotalCount(totalCount);
        setHasMore(moreAvailable);
        setCurrentPage(page);
        setIsError(false);
      } catch (error) {
        console.error('Error fetching events:', error);
        setIsError(true);
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [
      debouncedSearch,
      filters.categoryId,
      filters.cityId,
      filters.tagIds,
      filters.dateRange,
      filters.priceRange,
      filters.sortBy,
      filters.sortOrder,
      filters.featured,
      filters.eventTypes,
      filters.votingStatus,
      filters.votingType,
    ]
  );

  // Fetch filter options on mount
  useEffect(() => {
    const fetchFilterOptions = async () => {
      try {
        const response = await getEventFilterOptions();
        if (response.success && response.data) {
          setFilterOptions(response.data);
        }
      } catch (error) {
        console.error('Error fetching filter options:', error);
      }
    };

    fetchFilterOptions();
  }, []);

  // Fetch events when filters change
  useEffect(() => {
    fetchEvents(1, true);
  }, [fetchEvents]);

  // Handle infinite scroll
  useEffect(() => {
    if (inView && hasMore && !isLoadingMore && !isLoading) {
      fetchEvents(currentPage + 1, false);
    }
  }, [inView, hasMore, isLoadingMore, isLoading, currentPage, fetchEvents]);

  // Update filter function
  const updateFilter = useCallback((key: keyof FilterState, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  // Clear all filters
  const clearAllFilters = useCallback(() => {
    setFilters({
      search: '',
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
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <PageTitleHero
        title="Discover Amazing Events"
        subtitle="🎉 Find Your Next Adventure"
        description="From concerts and festivals to workshops and voting contests, discover events that match your interests and connect with your community."
        showSearch={true}
        searchPlaceholder="Search events, contests, venues, or organizers..."
        searchValue={filters.search}
        onSearchChange={(value) => updateFilter('search', value)}
        onSearchSubmit={handleHeroSearch}
        stats={{
          totalEvents: totalCount,
          totalLocations: uniqueCities,
          totalAttendees: Math.max(totalAttendees, 1000),
        }}
        height="lg"
        backgroundImage="/assets/images/events-hero-bg.jpg"
      />

      {/* Filter Controls Section */}
      <div className="bg-white border-b sticky top-0 z-40 shadow-sm">
        <div className="container mx-auto px-4 py-4">
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
                      className="text-xs text-purple-600 border-purple-300"
                    >
                      <Trophy className="h-3 w-3 mr-1" />
                      {eventTypeStats.votingContests} Contests
                    </Badge>
                  )}
                  {eventTypeStats.inviteEvents > 0 && (
                    <Badge
                      variant="outline"
                      className="text-xs text-blue-600 border-blue-300"
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
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
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
                <Button variant="outline" className="flex items-center gap-2">
                  <SlidersHorizontal className="h-4 w-4" />
                  Filters
                  {activeFiltersCount > 0 && (
                    <Badge variant="secondary" className="ml-1">
                      {activeFiltersCount}
                    </Badge>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent className="w-full sm:max-w-md">
                <SheetHeader>
                  <SheetTitle>Filter Events</SheetTitle>
                  <SheetDescription>
                    Narrow down events and contests to find exactly what you're
                    looking for
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
      <div className="container mx-auto px-4 py-8">
        {/* Loading State */}
        {isLoading && (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">Loading events...</span>
          </div>
        )}

        {/* Error State */}
        {isError && (
          <Card className="max-w-md mx-auto">
            <CardContent className="p-6 text-center">
              <div className="text-red-500 mb-4">
                <Calendar className="h-12 w-12 mx-auto" />
              </div>
              <h3 className="font-semibold mb-2">Failed to Load Events</h3>
              <p className="text-muted-foreground mb-4">
                Something went wrong while loading events. Please try again.
              </p>
              <Button onClick={() => fetchEvents(1, true)}>Try Again</Button>
            </CardContent>
          </Card>
        )}

        {/* Events Grid */}
        {!isLoading && !isError && (
          <>
            {events.length === 0 ? (
              <Card className="max-w-md mx-auto">
                <CardContent className="p-6 text-center">
                  <div className="text-muted-foreground mb-4">
                    {filters.eventTypes.includes('VOTING_CONTEST') &&
                    filters.eventTypes.length === 1 ? (
                      <Trophy className="h-12 w-12 mx-auto" />
                    ) : (
                      <Calendar className="h-12 w-12 mx-auto" />
                    )}
                  </div>
                  <h3 className="font-semibold mb-2">
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
                    <Button variant="outline" onClick={clearAllFilters}>
                      Clear Filters
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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
                <p>You've reached the end of the events list.</p>
                <p className="text-sm mt-1">
                  Showing all {events.length} events
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
