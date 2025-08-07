'use client';

import React, { useState, useEffect } from 'react';
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
}

export const HeroSection: React.FC<HeroSectionProps> = ({ featuredEvents }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [imagesLoaded, setImagesLoaded] = useState<Set<number>>(new Set());

  // Auto-advance slider
  useEffect(() => {
    if (featuredEvents.length === 0) return;

    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % featuredEvents.length);
    }, 5000);

    return () => clearInterval(timer);
  }, [featuredEvents.length]);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % featuredEvents.length);
  };

  const prevSlide = () => {
    setCurrentSlide(
      (prev) => (prev - 1 + featuredEvents.length) % featuredEvents.length
    );
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(price);
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMM dd, yyyy');
  };

  const formatTime = (dateString: string) => {
    return format(new Date(dateString), 'h:mm a');
  };

  const handleImageLoad = (index: number) => {
    setImagesLoaded((prev) => new Set([...prev, index]));
  };

  // If no events, show simple fallback
  if (featuredEvents.length === 0) {
    return (
      <section className="relative h-screen overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="container mx-auto px-4 text-center text-white">
            <Button
              size="lg"
              className="bg-white text-black hover:bg-gray-100"
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
  const currentEvent = featuredEvents[currentSlide];

  return (
    <section className="relative h-screen overflow-hidden">
      {/* Immediate background gradient - shows instantly */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400" />

      {/* Optimized image loading - only render current and next image */}
      <div className="relative h-full">
        {featuredEvents.map((event, index) => {
          // Only render current slide and preload next slide
          const shouldRender =
            index === currentSlide ||
            index === (currentSlide + 1) % featuredEvents.length ||
            index ===
              (currentSlide - 1 + featuredEvents.length) %
                featuredEvents.length;

          if (!shouldRender) return null;

          return (
            <div
              key={event.id}
              className={`absolute inset-0 transition-all duration-700 ${
                index === currentSlide
                  ? 'opacity-100 scale-100'
                  : 'opacity-0 scale-105'
              }`}
            >
              {/* Dark overlay for better text readability */}
              <div className="absolute inset-0 bg-black/50 z-10" />

              {event.coverImageUrl && (
                <>
                  {/* Show gradient background while image loads */}
                  {!imagesLoaded.has(index) && (
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-600/80 via-pink-500/80 to-orange-400/80 animate-pulse" />
                  )}

                  <Image
                    width={1920}
                    height={1080}
                    src={event.coverImageUrl}
                    alt={event.title}
                    className={`w-full h-full object-cover transition-opacity duration-500 ${
                      imagesLoaded.has(index) ? 'opacity-100' : 'opacity-0'
                    }`}
                    priority={index === 0} // Only prioritize first image
                    quality={75} // Reduced quality for faster loading
                    placeholder="blur"
                    blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q=="
                    onLoad={() => handleImageLoad(index)}
                  />
                </>
              )}
            </div>
          );
        })}

        {/* Content - Always visible, loads instantly */}
        <div className="absolute inset-0 flex items-center justify-center z-20">
          <div className="container mx-auto px-4 text-center text-white">
            {currentEvent.category && (
              <Badge className="mb-4 bg-white/20 text-white border-white/30 backdrop-blur-sm">
                {currentEvent.category.name}
              </Badge>
            )}

            <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold mb-6 max-w-4xl mx-auto">
              {currentEvent.title}
            </h1>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8 flex-wrap">
              <div className="flex items-center gap-2 bg-black/20 backdrop-blur-sm px-3 py-2 rounded-full">
                <Calendar className="h-4 w-4" />
                <span className="text-sm">
                  {formatDate(currentEvent.startDateTime)}
                </span>
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
                <span className="text-sm">
                  {formatTime(currentEvent.startDateTime)}
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                size="lg"
                className="bg-white text-black hover:bg-gray-100 font-semibold px-8"
              >
                <Link
                  href={`/events/${currentEvent.slug}`}
                  className="flex items-center"
                >
                  View Details
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>

              <div className="text-lg font-semibold bg-white/10 backdrop-blur-sm px-6 py-3 rounded-lg border border-white/20">
                {currentEvent.isFree
                  ? 'Free Event'
                  : `From ${formatPrice(currentEvent.ticketTypes[0]?.price || 0)}`}
              </div>
            </div>
          </div>
        </div>

        {/* Navigation - Only show if multiple events */}
        {featuredEvents.length > 1 && (
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

            {/* Compact slide indicators */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-30">
              {featuredEvents.map((_, index) => (
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
      </div>
    </section>
  );
};
