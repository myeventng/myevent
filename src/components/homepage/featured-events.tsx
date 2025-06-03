// components/homepage/FeaturedEventsSection.tsx
'use client';

import React from 'react';
import { Calendar, MapPin, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { format } from 'date-fns';
import Image from 'next/image';

interface Event {
  id: string;
  slug: string;
  title: string;
  description?: string;
  coverImageUrl?: string;
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
}

interface FeaturedEventsSectionProps {
  featuredEvents: Event[];
}

export const FeaturedEventsSection: React.FC<FeaturedEventsSectionProps> = ({
  featuredEvents,
}) => {
  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMM dd, yyyy');
  };

  const formatTime = (dateString: string) => {
    return format(new Date(dateString), 'h:mm a');
  };

  if (featuredEvents.length === 0) {
    return null;
  }

  return (
    <section className="py-20 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-white mb-4">
            Featured Events
          </h2>
          <p className="text-xl text-white/90">
            Don&apos;t miss these amazing upcoming events
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {featuredEvents.slice(0, 3).map((event) => (
            <div
              key={event.id}
              className="group relative overflow-hidden rounded-2xl bg-white/10 backdrop-blur-sm hover:bg-white/20 transition-all duration-300"
            >
              <div className="aspect-[4/3] overflow-hidden">
                {event.coverImageUrl ? (
                  <Image
                    width={500}
                    height={500}
                    src={event.coverImageUrl}
                    alt={event.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-white/20 to-white/10 flex items-center justify-center">
                    <Calendar className="h-12 w-12 text-white/40" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                {/* Default Content */}
                <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                  {event.category && (
                    <Badge className="mb-2 bg-white/20 text-white border-white/30">
                      {event.category.name}
                    </Badge>
                  )}
                  <h3 className="text-xl font-bold mb-2 line-clamp-2">
                    {event.title}
                  </h3>
                  <div className="flex items-center gap-2 text-sm opacity-90">
                    <Calendar className="h-4 w-4" />
                    <span>{formatDate(event.startDateTime)}</span>
                  </div>
                </div>

                {/* Hover Content */}
                <div className="absolute inset-0 bg-black/90 opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col justify-center p-6 text-white">
                  {event.category && (
                    <Badge className="mb-3 bg-white/20 text-white border-white/30 w-fit">
                      {event.category.name}
                    </Badge>
                  )}
                  <h3 className="text-xl font-bold mb-3 line-clamp-2">
                    {event.title}
                  </h3>

                  {event.description && (
                    <p className="text-sm text-white/80 mb-4 line-clamp-3">
                      {event.description}
                    </p>
                  )}

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4" />
                      <span>{formatDate(event.startDateTime)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4" />
                      <span>
                        {event.venue.name}
                        {event.venue.city ? `, ${event.venue.city.name}` : ''}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4" />
                      <span>{formatTime(event.startDateTime)}</span>
                    </div>
                  </div>

                  {event.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-4">
                      {event.tags.slice(0, 3).map((tag) => (
                        <Badge
                          key={tag.name}
                          className="text-xs"
                          style={{ backgroundColor: tag.bgColor }}
                        >
                          {tag.name}
                        </Badge>
                      ))}
                      {event.tags.length > 3 && (
                        <Badge className="text-xs bg-white/20 text-white border-white/30">
                          +{event.tags.length - 3} more
                        </Badge>
                      )}
                    </div>
                  )}

                  <Button
                    size="sm"
                    className="bg-white text-black hover:bg-gray-100"
                    asChild
                  >
                    <Link href={`/events/${event.slug}`}>View Details</Link>
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Show more button if there are more than 3 featured events */}
        {featuredEvents.length > 3 && (
          <div className="text-center mt-12">
            <Button
              size="lg"
              className="bg-white text-black hover:bg-gray-100"
              asChild
            >
              <Link href="/events?featured=true">View All Featured Events</Link>
            </Button>
          </div>
        )}
      </div>
    </section>
  );
};
