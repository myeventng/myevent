'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { format } from 'date-fns';
import { Calendar, MapPin, Ticket, Filter, Clock } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { getEvents, getFeaturedEvents } from '@/actions/event.actions';
import { getCategories } from '@/actions/category-actions';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';

export function EventsGrid() {
  const [events, setEvents] = useState<any[]>([]);
  const [featuredEvents, setFeaturedEvents] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [showFreeOnly, setShowFreeOnly] = useState(false);

  // Format currency
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(price);
  };

  // Format date and time
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, 'EEE, MMM d, yyyy • h:mm a');
  };

  // Get minimum ticket price
  const getMinTicketPrice = (ticketTypes: any[]) => {
    if (!ticketTypes || ticketTypes.length === 0) return 0;

    return ticketTypes.reduce(
      (min, ticket) => (ticket.price < min ? ticket.price : min),
      ticketTypes[0].price
    );
  };

  // Fetch events and categories
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);

        // Fetch featured events
        const featuredResponse = await getFeaturedEvents();
        if (featuredResponse.success && featuredResponse.data) {
          setFeaturedEvents(featuredResponse.data);
        }

        // Fetch all published events
        const eventsResponse = await getEvents(true);
        if (eventsResponse.success && eventsResponse.data) {
          setEvents(eventsResponse.data);
        }

        // Fetch categories
        const categoriesResponse = await getCategories();
        if (categoriesResponse.success && categoriesResponse.data) {
          setCategories(categoriesResponse.data);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load events');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Filter events based on search term, category, and free filter
  const getFilteredEvents = () => {
    return events.filter((event) => {
      // Filter by search term
      const matchesSearch =
        searchTerm === '' ||
        event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (event.description &&
          event.description.toLowerCase().includes(searchTerm.toLowerCase()));

      // Filter by category
      const matchesCategory =
        selectedCategory === '' || event.categoryId === selectedCategory;

      // Filter by free status
      const matchesFree = !showFreeOnly || event.isFree;

      return matchesSearch && matchesCategory && matchesFree;
    });
  };

  // Render loading skeleton
  const renderSkeleton = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: 6 }).map((_, index) => (
        <Card key={index} className="overflow-hidden">
          <Skeleton className="h-48 w-full" />
          <CardHeader className="pb-2">
            <Skeleton className="h-5 w-3/4 mb-2" />
            <Skeleton className="h-4 w-1/2" />
          </CardHeader>
          <CardContent className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </CardContent>
          <CardFooter>
            <Skeleton className="h-10 w-full" />
          </CardFooter>
        </Card>
      ))}
    </div>
  );

  return (
    <div className="space-y-8">
      {featuredEvents.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Featured Events</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredEvents.map((event) => (
              <Card key={event.id} className="overflow-hidden">
                <div className="relative h-48">
                  {event.coverImageUrl ? (
                    <Image
                      src={event.coverImageUrl}
                      alt={event.title}
                      layout="fill"
                      objectFit="cover"
                    />
                  ) : (
                    <div className="h-full bg-muted flex items-center justify-center">
                      <Calendar className="h-12 w-12 text-muted-foreground" />
                    </div>
                  )}
                  <div className="absolute top-2 right-2">
                    <Badge variant="outline" className="bg-primary text-white">
                      Featured
                    </Badge>
                  </div>
                </div>
                <CardHeader className="pb-2">
                  <CardTitle className="line-clamp-1">{event.title}</CardTitle>
                  <CardDescription>
                    {event.venue?.name}, {event.venue?.city?.name}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-start gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground mt-1" />
                    <div className="text-sm line-clamp-1">
                      {formatDateTime(event.startDateTime)}
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Ticket className="h-4 w-4 text-muted-foreground mt-1" />
                    <div className="text-sm font-medium">
                      {event.isFree
                        ? 'Free'
                        : `From ${formatPrice(
                            getMinTicketPrice(event.ticketTypes)
                          )}`}
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button asChild className="w-full">
                    <Link href={`/events/${event.id}`}>View Event</Link>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-4">
        <div className="flex flex-col md:flex-row justify-between gap-4 md:items-center">
          <h2 className="text-2xl font-bold">All Events</h2>
          <div className="flex flex-col md:flex-row gap-4">
            <Input
              placeholder="Search events..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="md:w-64"
            />
            <Select
              value={selectedCategory}
              onValueChange={setSelectedCategory}
            >
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem disabled value="placeholder">
                  All Categories
                </SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="free-only"
                checked={showFreeOnly}
                onCheckedChange={() => setShowFreeOnly(!showFreeOnly)}
              />
              <label
                htmlFor="free-only"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Free Events Only
              </label>
            </div>
          </div>
        </div>

        {isLoading ? (
          renderSkeleton()
        ) : getFilteredEvents().length === 0 ? (
          <div className="py-12 text-center">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium">No events found</h3>
            <p className="text-muted-foreground mt-1">
              Try adjusting your filters or check back later for new events.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {getFilteredEvents().map((event) => (
              <Card key={event.id} className="overflow-hidden">
                <div className="relative h-48">
                  {event.coverImageUrl ? (
                    <Image
                      src={event.coverImageUrl}
                      alt={event.title}
                      layout="fill"
                      objectFit="cover"
                    />
                  ) : (
                    <div className="h-full bg-muted flex items-center justify-center">
                      <Calendar className="h-12 w-12 text-muted-foreground" />
                    </div>
                  )}
                  {event.isFree && (
                    <div className="absolute top-2 left-2">
                      <Badge
                        variant="outline"
                        className="bg-green-500 text-white"
                      >
                        Free
                      </Badge>
                    </div>
                  )}
                </div>
                <CardHeader className="pb-2">
                  <CardTitle className="line-clamp-1">{event.title}</CardTitle>
                  <CardDescription>
                    {event.venue?.name}, {event.venue?.city?.name}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-start gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground mt-1" />
                    <div className="text-sm line-clamp-1">
                      {formatDateTime(event.startDateTime)}
                    </div>
                  </div>
                  {!event.isFree && event.ticketTypes.length > 0 && (
                    <div className="flex items-start gap-2">
                      <Ticket className="h-4 w-4 text-muted-foreground mt-1" />
                      <div className="text-sm font-medium">
                        From {formatPrice(getMinTicketPrice(event.ticketTypes))}
                      </div>
                    </div>
                  )}
                  {event.tags && event.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {event.tags.slice(0, 3).map((tag: any) => (
                        <Badge
                          key={tag.id}
                          style={{
                            backgroundColor: tag.bgColor,
                            color: 'white',
                          }}
                          className="text-xs"
                        >
                          {tag.name}
                        </Badge>
                      ))}
                      {event.tags.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{event.tags.length - 3} more
                        </Badge>
                      )}
                    </div>
                  )}
                </CardContent>
                <CardFooter>
                  <Button asChild className="w-full">
                    <Link href={`/events/${event.id}`}>View Event</Link>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
