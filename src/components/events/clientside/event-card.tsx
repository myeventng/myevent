'use client';

import { format } from 'date-fns';
import Link from 'next/link';
import { Calendar, MapPin, Star, Users, Ticket, Clock } from 'lucide-react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface EventCardProps {
  event: {
    id: string;
    slug: string;
    title: string;
    description?: string;
    coverImageUrl?: string;
    startDateTime: string;
    endDateTime: string;
    isFree: boolean;
    featured: boolean;
    category?: {
      name: string;
    };
    venue: {
      name: string;
      city?: {
        name: string;
      };
    };
    tags: Array<{
      id: string;
      name: string;
      bgColor: string;
    }>;
    ticketTypes: Array<{
      id: string;
      name: string;
      price: number;
      quantity: number;
    }>;
    user?: {
      name: string;
      organizerProfile?: {
        organizationName: string;
      };
    };
    averageRating?: number;
    ratingsCount?: number;
    _count?: {
      orders: number;
    };
  };
}

export function EventCard({ event }: EventCardProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, 'MMM dd');
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, 'h:mm a');
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(price);
  };

  const getMinPrice = () => {
    if (event.isFree) return 0;
    const prices = event.ticketTypes.map((ticket) => ticket.price);
    return prices.length > 0 ? Math.min(...prices) : 0;
  };

  const getAvailableTickets = () => {
    return event.ticketTypes.reduce((sum, ticket) => sum + ticket.quantity, 0);
  };

  const isEventSoon = () => {
    const eventDate = new Date(event.startDateTime);
    const now = new Date();
    const hoursDiff = (eventDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    return hoursDiff > 0 && hoursDiff <= 24; // Within 24 hours
  };

  const isEventToday = () => {
    const eventDate = new Date(event.startDateTime);
    const today = new Date();
    return eventDate.toDateString() === today.toDateString();
  };

  return (
    <Card className="group overflow-hidden hover:shadow-lg transition-all duration-300 border-0 shadow-sm hover:shadow-xl hover:-translate-y-1">
      {/* Event Image */}
      <div className="relative aspect-[4/3] overflow-hidden">
        {event.coverImageUrl ? (
          <img
            src={event.coverImageUrl}
            alt={event.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
            <Calendar className="h-12 w-12 text-primary/40" />
          </div>
        )}

        {/* Overlay Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-2">
          {event.featured && (
            <Badge className="bg-yellow-500 hover:bg-yellow-600 text-white shadow-lg">
              <Star className="h-3 w-3 mr-1" />
              Featured
            </Badge>
          )}

          {isEventToday() && (
            <Badge className="bg-red-500 hover:bg-red-600 text-white shadow-lg animate-pulse">
              Today
            </Badge>
          )}

          {isEventSoon() && !isEventToday() && (
            <Badge className="bg-orange-500 hover:bg-orange-600 text-white shadow-lg">
              <Clock className="h-3 w-3 mr-1" />
              Soon
            </Badge>
          )}
        </div>

        {/* Price Badge */}
        <div className="absolute top-3 right-3">
          <Badge
            variant="secondary"
            className="bg-white/90 text-foreground shadow-lg font-semibold"
          >
            {event.isFree ? 'FREE' : `From ${formatPrice(getMinPrice())}`}
          </Badge>
        </div>

        {/* Rating */}
        {event.averageRating && event.averageRating > 0 && (
          <div className="absolute bottom-3 right-3 bg-black/70 text-white px-2 py-1 rounded-full text-xs flex items-center gap-1">
            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
            <span>{event.averageRating}</span>
            <span className="text-white/70">({event.ratingsCount})</span>
          </div>
        )}
      </div>

      <CardContent className="p-4 space-y-3">
        {/* Category */}
        {event.category && (
          <Badge variant="outline" className="text-xs">
            {event.category.name}
          </Badge>
        )}

        {/* Title */}
        <div>
          <h3 className="font-semibold text-lg line-clamp-2 group-hover:text-primary transition-colors">
            {event.title}
          </h3>
          {event.description && (
            <p className="text-muted-foreground text-sm line-clamp-2 mt-1">
              {event.description}
            </p>
          )}
        </div>

        {/* Date and Time */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4 shrink-0" />
          <span>
            {formatDate(event.startDateTime)} •{' '}
            {formatTime(event.startDateTime)}
          </span>
        </div>

        {/* Location */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4 shrink-0" />
          <span className="truncate">
            {event.venue.name}
            {event.venue.city && ` • ${event.venue.city.name}`}
          </span>
        </div>

        {/* Organizer */}
        {event.user && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="h-4 w-4 shrink-0" />
            <span className="truncate">
              {event.user.organizerProfile?.organizationName || event.user.name}
            </span>
          </div>
        )}

        {/* Tags */}
        {event.tags && event.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {event.tags.slice(0, 3).map((tag) => (
              <Badge
                key={tag.id}
                variant="secondary"
                className="text-xs px-2 py-0.5"
                style={{
                  backgroundColor: `${tag.bgColor}20`,
                  color: tag.bgColor,
                  borderColor: `${tag.bgColor}40`,
                }}
              >
                {tag.name}
              </Badge>
            ))}
            {event.tags.length > 3 && (
              <Badge variant="secondary" className="text-xs px-2 py-0.5">
                +{event.tags.length - 3}
              </Badge>
            )}
          </div>
        )}

        {/* Tickets Available */}
        {getAvailableTickets() > 0 && (
          <div className="flex items-center gap-2 text-sm">
            <Ticket className="h-4 w-4 text-green-600" />
            <span className="text-green-600 font-medium">
              {getAvailableTickets()} tickets available
            </span>
          </div>
        )}

        {getAvailableTickets() === 0 && (
          <div className="flex items-center gap-2 text-sm">
            <Ticket className="h-4 w-4 text-red-500" />
            <span className="text-red-500 font-medium">Sold Out</span>
          </div>
        )}
      </CardContent>

      <CardFooter className="p-4 pt-0">
        <Button
          asChild
          className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
        >
          <Link href={`/events/${event.slug}`}>View Details</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
