'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, MapPin, Users, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { CompactRating } from '@/components/ui/ratings-display';
import Image from 'next/image';

interface EventCardProps {
  event: {
    id: string;
    title: string;
    slug: string;
    startDateTime: string;
    endDateTime: string;
    coverImageUrl?: string;
    isFree: boolean;
    venue: {
      name: string;
      city?: { name: string };
    };
    ticketTypes: { price: number }[];
    category?: { name: string };
    tags: { id: string; name: string; bgColor: string }[];
    averageRating?: number;
    ratingsCount?: number;
    featured?: boolean;
  };
}

export function EventCard({ event }: EventCardProps) {
  const isEventPast = new Date(event.endDateTime) < new Date();
  const minPrice = event.isFree
    ? 0
    : Math.min(...event.ticketTypes.map((t) => t.price));

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      {/* Event Image */}
      {event.coverImageUrl && (
        <div className="aspect-[16/9] overflow-hidden">
          <Image
            width={800}
            height={450}
            unoptimized
            priority
            quality={90}
            src={event.coverImageUrl}
            alt={event.title}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      <CardContent className="p-4 space-y-3">
        {/* Category and Featured Badge */}
        <div className="flex items-center justify-between">
          {event.category && (
            <Badge variant="secondary" className="text-xs">
              {event.category.name}
            </Badge>
          )}
          {event.featured && (
            <Badge
              variant="outline"
              className="text-xs border-yellow-500 text-yellow-600"
            >
              Featured
            </Badge>
          )}
        </div>

        {/* Title and Rating */}
        <div className="space-y-2">
          <h3 className="font-semibold text-lg line-clamp-2">{event.title}</h3>

          {/* Rating Display */}
          {event.averageRating && event.ratingsCount && (
            <CompactRating
              rating={event.averageRating}
              count={event.ratingsCount}
            />
          )}
        </div>

        {/* Event Details */}
        <div className="space-y-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span>
              {format(new Date(event.startDateTime), 'MMM d, yyyy • h:mm a')}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            <span className="line-clamp-1">
              {event.venue.name}
              {event.venue.city && `, ${event.venue.city.name}`}
            </span>
          </div>

          {isEventPast && (
            <div className="flex items-center gap-2 text-amber-600">
              <Clock className="h-4 w-4" />
              <span>Event Ended</span>
            </div>
          )}
        </div>

        {/* Tags */}
        {event.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {event.tags.slice(0, 3).map((tag) => (
              <Badge
                key={tag.id}
                variant="outline"
                className="text-xs"
                style={{
                  backgroundColor: tag.bgColor + '20',
                  borderColor: tag.bgColor,
                  color: tag.bgColor,
                }}
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

        {/* Price and Action */}
        <div className="flex items-center justify-between pt-2">
          <div className="text-lg font-semibold">
            {event.isFree ? 'Free' : `From ₦${minPrice.toLocaleString()}`}
          </div>

          <Button
            size="sm"
            variant={isEventPast ? 'outline' : 'default'}
            asChild
          >
            <a href={`/events/${event.slug}`}>
              {isEventPast ? 'View Details' : 'Book Now'}
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
