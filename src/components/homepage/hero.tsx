'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  MapPin,
  Clock,
  ArrowRight,
} from 'lucide-react';
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
  endDateTime: string;
  venue: {
    name: string;
    city?: {
      name: string;
    };
  };
  category?: {
    name: string;
  };
  isFree: boolean;
  ticketTypes: Array<{
    price: number;
  }>;
}

interface HeroSectionProps {
  featuredEvents: Event[];
  isLoading?: boolean;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  featuredEvents,
  isLoading = false,
}) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [imageLoadStates, setImageLoadStates] = useState<Map<string, boolean>>(
    new Map()
  );

  // Memoize formatted data to prevent unnecessary recalculations
  const eventData = useMemo(() => {
    return featuredEvents.map((event) => ({
      ...event,
      formattedDate: format(new Date(event.startDateTime), 'MMM dd, yyyy'),
      formattedTime: format(new Date(event.startDateTime), 'h:mm a'),
      formattedPrice: event.isFree
        ? 'Free Event'
        : `From ${new Intl.NumberFormat('en-NG', {
            style: 'currency',
            currency: 'NGN',
          }).format(event.ticketTypes[0]?.price || 0)}`,
    }));
  }, [featuredEvents]);

  // Auto-advance slider only if there are multiple events
  useEffect(() => {
    if (eventData.length <= 1) return;

    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % eventData.length);
    }, 5000);

    return () => clearInterval(timer);
  }, [eventData.length]);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % eventData.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + eventData.length) % eventData.length);
  };

  const handleImageLoad = (eventId: string) => {
    setImageLoadStates((prev) => new Map(prev).set(eventId, true));
  };

  const handleImageError = (eventId: string) => {
    console.warn(`Failed to load image for event: ${eventId}`);
  };

  // Show loading state
  if (isLoading) {
    return (
      <section className="relative h-screen overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 animate-pulse" />
        <div className="absolute inset-0 flex items-center justify-center z-20">
          <div className="container mx-auto px-4 text-center text-white">
            <div className="h-8 bg-white/20 rounded w-64 mx-auto mb-6 animate-pulse" />
            <div className="h-16 bg-white/20 rounded w-96 mx-auto mb-8 animate-pulse" />
            <div className="flex justify-center gap-4 mb-8">
              <div className="h-8 bg-white/20 rounded w-32 animate-pulse" />
              <div className="h-8 bg-white/20 rounded w-32 animate-pulse" />
              <div className="h-8 bg-white/20 rounded w-32 animate-pulse" />
            </div>
            <div className="h-12 bg-white/20 rounded w-48 mx-auto animate-pulse" />
          </div>
        </div>
      </section>
    );
  }

  // If no events, show simple fallback
  if (eventData.length === 0) {
    return (
      <section className="relative h-screen overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400" />
        <div className="absolute inset-0 flex items-center justify-center z-20">
          <div className="container mx-auto px-4 text-center text-white">
            <h1 className="text-4xl md:text-6xl font-bold mb-8">
              Discover Amazing Events
            </h1>
            <p className="text-xl mb-8 max-w-2xl mx-auto">
              Find and join incredible events happening around you
            </p>
            <Button
              size="lg"
              className="bg-white text-black hover:bg-gray-100 font-semibold px-8"
              asChild
            >
              <Link href="/events">
                Explore Events
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    );
  }

  // Get current event data
  const currentEvent = eventData[currentSlide];
  const isImageLoaded = imageLoadStates.get(currentEvent.id) || false;

  return (
    <section className="relative h-screen overflow-hidden">
      {/* Always show gradient background for instant visual feedback */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400" />

      {/* Image layer */}
      {currentEvent.coverImageUrl && (
        <div className="absolute inset-0">
          <Image
            src={currentEvent.coverImageUrl}
            alt={currentEvent.title}
            fill
            className={`object-cover transition-opacity duration-500 ${
              isImageLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            priority
            quality={85}
            sizes="100vw"
            onLoad={() => handleImageLoad(currentEvent.id)}
            onError={() => handleImageError(currentEvent.id)}
          />
          {/* Dark overlay for better text readability */}
          <div className="absolute inset-0 bg-black/40" />
        </div>
      )}

      {/* Content overlay */}
      <div className="absolute inset-0 flex items-center justify-center z-20">
        <div className="container mx-auto px-4 text-center text-white">
          {currentEvent.category && (
            <Badge className="mb-4 bg-white/20 text-white border-white/30 backdrop-blur-sm">
              {currentEvent.category.name}
            </Badge>
          )}

          <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold mb-6 max-w-4xl mx-auto leading-tight">
            {currentEvent.title}
          </h1>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8 flex-wrap">
            <div className="flex items-center gap-2 bg-black/20 backdrop-blur-sm px-3 py-2 rounded-full">
              <Calendar className="h-4 w-4" />
              <span className="text-sm">{currentEvent.formattedDate}</span>
            </div>
            <div className="flex items-center gap-2 bg-black/20 backdrop-blur-sm px-3 py-2 rounded-full">
              <MapPin className="h-4 w-4" />
              <span className="text-sm">
                {currentEvent.venue.name}
                {currentEvent.venue.city
                  ? `, ${currentEvent.venue.city.name}`
                  : ''}
              </span>
            </div>
            <div className="flex items-center gap-2 bg-black/20 backdrop-blur-sm px-3 py-2 rounded-full">
              <Clock className="h-4 w-4" />
              <span className="text-sm">{currentEvent.formattedTime}</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              size="lg"
              className="bg-white text-black hover:bg-gray-100 font-semibold px-8 transition-all duration-200"
              asChild
            >
              <Link href={`/events/${currentEvent.slug}`}>
                View Details
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>

            <div className="text-lg font-semibold bg-white/10 backdrop-blur-sm px-6 py-3 rounded-lg border border-white/20">
              {currentEvent.formattedPrice}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation - Only show if multiple events */}
      {eventData.length > 1 && (
        <>
          <button
            onClick={prevSlide}
            className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 text-white p-3 rounded-full backdrop-blur-sm transition-all duration-200 z-30"
            aria-label="Previous slide"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <button
            onClick={nextSlide}
            className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 text-white p-3 rounded-full backdrop-blur-sm transition-all duration-200 z-30"
            aria-label="Next slide"
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          {/* Slide indicators */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-30">
            {eventData.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentSlide(index)}
                className={`w-2 h-2 rounded-full transition-all duration-200 ${
                  index === currentSlide
                    ? 'bg-white w-6'
                    : 'bg-white/50 hover:bg-white/70'
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
};
