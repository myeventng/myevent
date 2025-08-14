'use client';

import React, { useState, useRef, useEffect, memo } from 'react';
import {
  Calendar,
  MapPin,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
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
  maxEventsToShow?: number;
  slidesToShow?: number;
  autoSlide?: boolean;
  slideInterval?: number;
  showNavigationArrows?: boolean;
  showIndicators?: boolean;
  slidesToScroll?: number;
  responsiveBreakpoints?: {
    mobile: { slidesToShow: number };
    tablet: { slidesToShow: number };
    desktop: { slidesToShow: number };
  };
}

// Memoized EventCard component for better performance
const EventCard = memo(({ event }: { event: Event }) => {
  const [imageLoaded, setImageLoaded] = useState(false);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(price);
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMM dd, yyyy');
  };

  return (
    <Card className="bg-white/10 backdrop-blur-sm border-white/20 overflow-hidden group hover:shadow-2xl hover:bg-white/20 transition-all duration-300 flex-shrink-0 w-full">
      <div className="aspect-[4/3] overflow-hidden relative">
        {event.coverImageUrl ? (
          <>
            {!imageLoaded && (
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-white/10 animate-pulse" />
            )}
            <Image
              width={400}
              height={300}
              src={event.coverImageUrl}
              alt={event.title}
              className={`w-full h-full object-cover group-hover:scale-110 transition-all duration-500 ${
                imageLoaded ? 'opacity-100' : 'opacity-0'
              }`}
              onLoad={() => setImageLoaded(true)}
              loading="lazy"
              quality={75}
            />
          </>
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

        <h3 className="text-xl font-bold mb-3 line-clamp-2">{event.title}</h3>

        {event.description && (
          <p className="text-white/80 text-sm mb-3 line-clamp-2">
            {event.description}
          </p>
        )}

        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">{formatDate(event.startDateTime)}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">
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
          <span className="font-semibold truncate">
            {event.isFree
              ? 'Free'
              : formatPrice(event.ticketTypes[0]?.price || 0)}
          </span>
          <Button
            size="sm"
            className="bg-white text-black hover:bg-gray-100 flex-shrink-0"
            asChild
          >
            <Link href={`/events/${event.slug}`}>View Details</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
});

EventCard.displayName = 'EventCard';

export const ExploreEventsSection: React.FC<ExploreEventsSectionProps> = ({
  events,
  categories,
  selectedCategory,
  onCategoryChange,
  maxEventsToShow = 12,
  slidesToShow = 3,
  autoSlide = true,
  slideInterval = 5000,
  showNavigationArrows = true,
  showIndicators = true,
  slidesToScroll = 1,
  responsiveBreakpoints = {
    mobile: { slidesToShow: 1 },
    tablet: { slidesToShow: 2 },
    desktop: { slidesToShow: 3 },
  },
}) => {
  const categoryScrollRef = useRef<HTMLDivElement>(null);
  const sliderRef = useRef<HTMLDivElement>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [currentSlidesToShow, setCurrentSlidesToShow] = useState(slidesToShow);

  const categoryOptions = ['All', ...categories.map((cat) => cat.name)];
  const displayEvents = events.slice(0, maxEventsToShow);
  const totalSlides = Math.max(
    0,
    displayEvents.length - currentSlidesToShow + 1
  );

  // Responsive logic
  useEffect(() => {
    const updateSlidesToShow = () => {
      const width = window.innerWidth;
      if (width < 768) {
        setCurrentSlidesToShow(responsiveBreakpoints.mobile.slidesToShow);
      } else if (width < 1024) {
        setCurrentSlidesToShow(responsiveBreakpoints.tablet.slidesToShow);
      } else {
        setCurrentSlidesToShow(responsiveBreakpoints.desktop.slidesToShow);
      }
    };

    updateSlidesToShow();
    window.addEventListener('resize', updateSlidesToShow);
    return () => window.removeEventListener('resize', updateSlidesToShow);
  }, [responsiveBreakpoints]);

  // Reset current slide when slidesToShow changes
  useEffect(() => {
    setCurrentSlide(0);
  }, [currentSlidesToShow, selectedCategory]);

  // Auto-slide functionality
  useEffect(() => {
    if (!autoSlide || displayEvents.length <= currentSlidesToShow) return;

    const timer = setInterval(() => {
      setCurrentSlide((prev) => {
        const next = prev + slidesToScroll;
        return next >= totalSlides ? 0 : next;
      });
    }, slideInterval);

    return () => clearInterval(timer);
  }, [
    autoSlide,
    slideInterval,
    displayEvents.length,
    currentSlidesToShow,
    totalSlides,
    slidesToScroll,
  ]);

  // Update scroll navigation state
  useEffect(() => {
    setCanScrollLeft(currentSlide > 0);
    setCanScrollRight(currentSlide < totalSlides - 1);
  }, [currentSlide, totalSlides]);

  const scrollCategories = (direction: 'left' | 'right') => {
    if (!categoryScrollRef.current) return;

    const scrollAmount = 200;
    const newScrollLeft =
      categoryScrollRef.current.scrollLeft +
      (direction === 'right' ? scrollAmount : -scrollAmount);

    categoryScrollRef.current.scrollTo({
      left: newScrollLeft,
      behavior: 'smooth',
    });
  };

  const nextSlide = () => {
    if (currentSlide < totalSlides - 1) {
      setCurrentSlide((prev) =>
        Math.min(prev + slidesToScroll, totalSlides - 1)
      );
    }
  };

  const prevSlide = () => {
    if (currentSlide > 0) {
      setCurrentSlide((prev) => Math.max(prev - slidesToScroll, 0));
    }
  };

  const goToSlide = (index: number) => {
    setCurrentSlide(Math.min(Math.max(0, index), totalSlides - 1));
  };

  // Calculate card width based on current slidesToShow
  const cardWidth = `calc((100% - ${(currentSlidesToShow - 1) * 2}rem) / ${currentSlidesToShow})`;

  return (
    <section className="py-20 bg-gradient-to-br from-green-400 via-blue-500 to-purple-600">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-white mb-4">Explore Events</h2>
          <p className="text-xl text-white/90">
            Find events that match your interests
          </p>
        </div>

        {/* Horizontal Scrollable Category Filter */}
        {categoryOptions.length > 1 && (
          <div className="relative mb-12">
            <div className="flex items-center">
              {/* Left scroll button */}
              <button
                onClick={() => scrollCategories('left')}
                className="hidden md:flex items-center justify-center w-10 h-10 bg-white/20 hover:bg-white/30 text-white rounded-full transition-all duration-200 mr-4 flex-shrink-0"
                aria-label="Scroll categories left"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>

              {/* Scrollable categories container */}
              <div
                ref={categoryScrollRef}
                className="flex gap-3 overflow-x-auto scrollbar-hide scroll-smooth flex-1"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
                <style jsx>{`
                  div::-webkit-scrollbar {
                    display: none;
                  }
                `}</style>
                {categoryOptions.map((category) => (
                  <button
                    key={category}
                    onClick={() => onCategoryChange(category)}
                    className={`px-6 py-3 rounded-full transition-all duration-300 whitespace-nowrap flex-shrink-0 ${
                      selectedCategory === category
                        ? 'bg-white text-black shadow-lg'
                        : 'bg-white/20 text-white hover:bg-white/30'
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>

              {/* Right scroll button */}
              <button
                onClick={() => scrollCategories('right')}
                className="hidden md:flex items-center justify-center w-10 h-10 bg-white/20 hover:bg-white/30 text-white rounded-full transition-all duration-200 ml-4 flex-shrink-0"
                aria-label="Scroll categories right"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}

        {/* Events Slider */}
        {displayEvents.length > 0 ? (
          <div className="relative max-w-7xl mx-auto">
            {/* Slider container */}
            <div className="overflow-hidden">
              <div
                ref={sliderRef}
                className="flex gap-8 transition-transform duration-500 ease-in-out"
                style={{
                  transform: `translateX(-${currentSlide * (100 / currentSlidesToShow + 8 / currentSlidesToShow)}%)`,
                }}
              >
                {displayEvents.map((event) => (
                  <div
                    key={event.id}
                    style={{ width: cardWidth }}
                    className="flex-shrink-0"
                  >
                    <EventCard event={event} />
                  </div>
                ))}
              </div>
            </div>

            {/* Navigation arrows - only show if needed and enabled */}
            {showNavigationArrows &&
              displayEvents.length > currentSlidesToShow && (
                <>
                  <button
                    onClick={prevSlide}
                    disabled={!canScrollLeft}
                    className={`absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/20 hover:bg-white/30 text-white rounded-full backdrop-blur-sm transition-all duration-200 z-10 ${
                      !canScrollLeft ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                    aria-label="Previous events"
                  >
                    <ChevronLeft className="h-6 w-6 mx-auto" />
                  </button>

                  <button
                    onClick={nextSlide}
                    disabled={!canScrollRight}
                    className={`absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/20 hover:bg-white/30 text-white rounded-full backdrop-blur-sm transition-all duration-200 z-10 ${
                      !canScrollRight ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                    aria-label="Next events"
                  >
                    <ChevronRight className="h-6 w-6 mx-auto" />
                  </button>
                </>
              )}

            {/* Slide indicators - only show if enabled */}
            {showIndicators &&
              displayEvents.length > currentSlidesToShow &&
              totalSlides > 1 && (
                <div className="flex justify-center mt-8 gap-2">
                  {Array.from({ length: totalSlides }, (_, index) => (
                    <button
                      key={index}
                      onClick={() => goToSlide(index)}
                      className={`w-3 h-3 rounded-full transition-all duration-200 ${
                        index === currentSlide
                          ? 'bg-white'
                          : 'bg-white/50 hover:bg-white/70'
                      }`}
                      aria-label={`Go to slide ${index + 1}`}
                    />
                  ))}
                </div>
              )}

            {/* View All Events Button */}
            <div className="text-center mt-12">
              <Button
                size="lg"
                className="bg-white text-black hover:bg-gray-100"
                asChild
              >
                <Link href="/events">
                  View All Events ({events.length})
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
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
