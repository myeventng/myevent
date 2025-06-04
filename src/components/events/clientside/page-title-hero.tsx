'use client';

import React from 'react';
import { Search, Calendar, MapPin, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface PageTitleHeroProps {
  title: string;
  subtitle?: string;
  description?: string;
  backgroundImage?: string;
  showSearch?: boolean;
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  onSearchSubmit?: () => void;
  stats?: {
    totalEvents?: number;
    totalLocations?: number;
    totalAttendees?: number;
  };
  className?: string;
  height?: 'sm' | 'md' | 'lg' | 'xl';
}

export const PageTitleHero: React.FC<PageTitleHeroProps> = ({
  title,
  subtitle,
  description,
  backgroundImage = '/assets/images/party-background.jpg',
  showSearch = false,
  searchPlaceholder = 'Search events, venues, or organizers...',
  searchValue = '',
  onSearchChange,
  onSearchSubmit,
  stats,
  className = '',
  height = 'lg',
}) => {
  const heightClasses = {
    sm: 'h-[40vh] min-h-[300px]',
    md: 'h-[50vh] min-h-[400px]',
    lg: 'h-[60vh] min-h-[500px]',
    xl: 'h-[70vh] min-h-[600px]',
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearchSubmit?.();
  };

  return (
    <div
      className={`relative ${heightClasses[height]} overflow-hidden ${className} pt-20 md:pt-24 lg:pt-28 xl:pt-32`}
    >
      {/* Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url(${backgroundImage})`,
        }}
      />

      {/* Gradient Overlays for better text readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/70" />
      <div className="absolute inset-0 bg-gradient-to-r from-purple-900/30 via-transparent to-blue-900/30" />

      {/* Animated Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-white/20 rounded-full animate-pulse" />
        <div className="absolute top-3/4 right-1/4 w-1 h-1 bg-white/30 rounded-full animate-ping" />
        <div className="absolute top-1/2 left-1/6 w-1.5 h-1.5 bg-white/25 rounded-full animate-pulse delay-1000" />
        <div className="absolute bottom-1/4 right-1/3 w-1 h-1 bg-white/20 rounded-full animate-ping delay-500" />
      </div>

      {/* Content */}
      <div className="relative z-10 h-full flex items-center">
        <div className="container mx-auto px-4 py-20">
          <div className="max-w-4xl mx-auto text-center">
            {/* Subtitle */}
            {/* {subtitle && (
              <div className="mb-4">
                <span className="inline-block px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-white/90 text-sm font-medium border border-white/20">
                  {subtitle}
                </span>
              </div>
            )} */}

            {/* Main Title */}
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
              {title}
            </h1>

            {/* Description */}
            {description && (
              <p className="text-lg md:text-xl text-white/90 mb-8 max-w-2xl mx-auto leading-relaxed">
                {description}
              </p>
            )}

            {/* Search Bar */}
            {showSearch && (
              <div className="mb-8">
                <form
                  onSubmit={handleSearchSubmit}
                  className="max-w-2xl mx-auto"
                >
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Search className="h-5 w-5 text-gray-400" />
                    </div>
                    <Input
                      type="text"
                      placeholder={searchPlaceholder}
                      value={searchValue}
                      onChange={(e) => onSearchChange?.(e.target.value)}
                      className="pl-12 pr-24 py-4 text-lg bg-white/95 backdrop-blur-sm border-white/20 placeholder:text-gray-500 focus:bg-white focus:border-white/40 transition-all duration-300"
                    />
                    <div className="absolute inset-y-0 right-0 pr-2 flex items-center">
                      <Button
                        type="submit"
                        size="sm"
                        className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-6 py-2 rounded-md transition-all duration-300"
                      >
                        Search
                      </Button>
                    </div>
                  </div>
                </form>
              </div>
            )}

            {/* Stats */}
            {/* {stats && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6 max-w-2xl mx-auto">
                {stats.totalEvents && (
                  <div className="text-center">
                    <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                      <div className="flex items-center justify-center mb-2">
                        <Calendar className="h-6 w-6 text-white/80" />
                      </div>
                      <div className="text-2xl md:text-3xl font-bold text-white">
                        {stats.totalEvents.toLocaleString()}
                      </div>
                      <div className="text-white/80 text-sm font-medium">
                        Events
                      </div>
                    </div>
                  </div>
                )}

                {stats.totalLocations && (
                  <div className="text-center">
                    <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                      <div className="flex items-center justify-center mb-2">
                        <MapPin className="h-6 w-6 text-white/80" />
                      </div>
                      <div className="text-2xl md:text-3xl font-bold text-white">
                        {stats.totalLocations.toLocaleString()}
                      </div>
                      <div className="text-white/80 text-sm font-medium">
                        Locations
                      </div>
                    </div>
                  </div>
                )}

                {stats.totalAttendees && (
                  <div className="text-center">
                    <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                      <div className="flex items-center justify-center mb-2">
                        <Users className="h-6 w-6 text-white/80" />
                      </div>
                      <div className="text-2xl md:text-3xl font-bold text-white">
                        {stats.totalAttendees.toLocaleString()}+
                      </div>
                      <div className="text-white/80 text-sm font-medium">
                        Attendees
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )} */}
          </div>
        </div>
      </div>
    </div>
  );
};
