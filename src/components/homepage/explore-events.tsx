// components/homepage/ExploreEventsSection.tsx
'use client';

import React from 'react';
import { Calendar, MapPin, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
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
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
}

export const ExploreEventsSection: React.FC<ExploreEventsSectionProps> = ({
  events,
  categories,
  selectedCategory,
  onCategoryChange,
}) => {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(price);
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMM dd, yyyy');
  };

  const categoryOptions = ['All', ...categories.map((cat) => cat.name)];

  return (
    <section className="py-20 bg-gradient-to-br from-green-400 via-blue-500 to-purple-600">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-white mb-4">Explore Events</h2>
          <p className="text-xl text-white/90">
            Find events that match your interests
          </p>
        </div>

        {/* Category Filter */}
        {categoryOptions.length > 1 && (
          <div className="flex flex-wrap justify-center gap-2 mb-12">
            {categoryOptions.map((category) => (
              <button
                key={category}
                onClick={() => onCategoryChange(category)}
                className={`px-6 py-3 rounded-full transition-all duration-300 ${
                  selectedCategory === category
                    ? 'bg-white text-black shadow-lg'
                    : 'bg-white/20 text-white hover:bg-white/30'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        )}

        {/* Events Grid */}
        {events.length > 0 ? (
          <>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {events.slice(0, 6).map((event) => (
                <Card
                  key={event.id}
                  className="bg-white/10 backdrop-blur-sm border-white/20 overflow-hidden group hover:shadow-2xl hover:bg-white/20 transition-all duration-300"
                >
                  <div className="aspect-[4/3] overflow-hidden">
                    {event.coverImageUrl ? (
                      <Image
                        width={800}
                        height={600}
                        unoptimized
                        priority
                        quality={90}
                        src={event.coverImageUrl}
                        alt={event.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-white/20 to-white/10 flex items-center justify-center">
                        <Calendar className="h-12 w-12 text-white/40" />
                      </div>
                    )}
                  </div>
                  <CardContent className="p-6 text-white">
                    {event.category && (
                      <Badge className="mb-3 bg-white/20 text-white border-white/30">
                        {event.category.name}
                      </Badge>
                    )}
                    <h3 className="text-xl font-bold mb-3 line-clamp-2">
                      {event.title}
                    </h3>

                    {event.description && (
                      <p className="text-white/80 text-sm mb-3 line-clamp-2">
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
                    </div>

                    {event.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-4">
                        {event.tags.slice(0, 2).map((tag) => (
                          <Badge
                            key={tag.name}
                            className="text-xs"
                            style={{ backgroundColor: tag.bgColor }}
                          >
                            {tag.name}
                          </Badge>
                        ))}
                        {event.tags.length > 2 && (
                          <Badge className="text-xs bg-white/20 text-white border-white/30">
                            +{event.tags.length - 2}
                          </Badge>
                        )}
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <span className="font-semibold">
                        {event.isFree
                          ? 'Free'
                          : formatPrice(event.ticketTypes[0]?.price || 0)}
                      </span>
                      <Button
                        size="sm"
                        className="bg-white text-black hover:bg-gray-100"
                        asChild
                      >
                        <Link href={`/events/${event.slug}`}>View Details</Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* View All Events Button */}
            {events.length > 6 && (
              <div className="text-center mt-12">
                <Button
                  size="lg"
                  className="bg-white text-black hover:bg-gray-100"
                  asChild
                >
                  <Link href="/events">
                    View All Events
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12">
            <Calendar className="h-16 w-16 text-white/50 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-white mb-2">
              No Events Found
            </h3>
            <p className="text-white/80 mb-6">
              {selectedCategory === 'All'
                ? 'No events are currently available. Check back soon!'
                : `No events found in the "${selectedCategory}" category. Try selecting a different category.`}
            </p>
            {selectedCategory !== 'All' && (
              <Button
                onClick={() => onCategoryChange('All')}
                className="bg-white text-black hover:bg-gray-100"
              >
                View All Categories
              </Button>
            )}
          </div>
        )}
      </div>
    </section>
  );
};
