'use client';

import { useState, useEffect, Suspense } from 'react';
import { toast } from 'sonner';
import dynamic from 'next/dynamic';
import {
  getFeaturedEvents,
  getEventsWithFilters,
  getEventFilterOptions,
} from '@/actions/event.actions';
import { getPublishedBlogs } from '@/actions/blog-actions';
import { HeroSection } from '@/components/homepage/hero';

// Lazy load non-critical sections
const FeaturedEventsSection = dynamic(
  () =>
    import('@/components/homepage/featured-events').then((mod) => ({
      default: mod.FeaturedEventsSection,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="h-96 bg-gray-100 animate-pulse rounded-lg" />
    ),
  }
);

const ExploreEventsSection = dynamic(
  () =>
    import('@/components/homepage/explore-events').then((mod) => ({
      default: mod.ExploreEventsSection,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="h-96 bg-gray-100 animate-pulse rounded-lg" />
    ),
  }
);

const BlogSection = dynamic(
  () =>
    import('@/components/homepage/blog-section').then((mod) => ({
      default: mod.BlogSection,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="h-64 bg-gray-100 animate-pulse rounded-lg" />
    ),
  }
);

const NewsletterSection = dynamic(
  () =>
    import('@/components/homepage/newsletter-section').then((mod) => ({
      default: mod.NewsletterSection,
    })),
  { ssr: false }
);

interface Event {
  id: string;
  slug: string;
  title: string;
  description?: string;
  coverImageUrl?: string;
  imageUrls: string[];
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
  tags: Array<{
    name: string;
    bgColor: string;
  }>;
  isFree: boolean;
  ticketTypes: Array<{
    price: number;
  }>;
  featured?: boolean;
}

interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  featuredImage: string;
  publishedAt: string;
  author: {
    name: string;
  };
  category: {
    name: string;
    color: string;
    slug: string;
  };
  slug: string;
  readingTime?: number;
  views: number;
}

interface Category {
  id: string;
  name: string;
}

export function HomepageClient() {
  const [featuredEvents, setFeaturedEvents] = useState<Event[]>([]);
  const [regularEvents, setRegularEvents] = useState<Event[]>([]);
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [isHeroLoading, setIsHeroLoading] = useState(false); // Changed to false for immediate display
  const [sectionsLoaded, setSectionsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch all data immediately but prioritize hero data
  useEffect(() => {
    const fetchAllData = async () => {
      try {
        setError(null);

        // Start all requests in parallel for maximum speed
        const [featuredResponse, eventsResponse, filterResponse, blogResponse] =
          await Promise.all([
            getFeaturedEvents(),
            getEventsWithFilters({
              page: 1,
              limit: 9,
              featured: false,
            }),
            getEventFilterOptions(),
            getPublishedBlogs(1, 3),
          ]);

        // Set featured events immediately for hero
        if (featuredResponse.success && featuredResponse.data) {
          setFeaturedEvents(featuredResponse.data);
        }

        // Set other data
        if (eventsResponse.success && eventsResponse.data) {
          setRegularEvents(eventsResponse.data.events);
        }

        if (filterResponse.success && filterResponse.data) {
          setCategories(filterResponse.data.categories);
        }

        if (blogResponse.success && blogResponse.data) {
          setBlogPosts(blogResponse.data.blogs);
        }

        setSectionsLoaded(true);
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Failed to load content');
        // Even on error, show the hero section
        setSectionsLoaded(true);
      }
    };

    fetchAllData();
  }, []);

  // Fetch filtered events when category changes
  useEffect(() => {
    if (!sectionsLoaded) return;

    const fetchFilteredEvents = async () => {
      if (selectedCategory === 'All') {
        try {
          const eventsResponse = await getEventsWithFilters({
            page: 1,
            limit: 9,
            featured: false,
          });

          if (eventsResponse.success && eventsResponse.data) {
            setRegularEvents(eventsResponse.data.events);
          }
        } catch (error) {
          console.error('Error fetching all events:', error);
        }
        return;
      }

      try {
        const categoryId = categories.find(
          (cat) => cat.name === selectedCategory
        )?.id;
        if (!categoryId) return;

        const eventsResponse = await getEventsWithFilters({
          page: 1,
          limit: 9,
          featured: false,
          categoryId: categoryId,
        });

        if (eventsResponse.success && eventsResponse.data) {
          setRegularEvents(eventsResponse.data.events);
        }
      } catch (error) {
        console.error('Error fetching filtered events:', error);
        toast.error('Failed to filter events');
      }
    };

    if (selectedCategory !== 'All' && categories.length > 0) {
      fetchFilteredEvents();
    }
  }, [selectedCategory, categories, sectionsLoaded]);

  if (error && !sectionsLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto p-6">
          <h2 className="text-2xl font-bold mb-4 text-gray-900">
            Something went wrong
          </h2>
          <p className="mb-6 text-gray-600">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Hero Section - Always shows immediately with welcome content or events */}
      <HeroSection featuredEvents={featuredEvents} isLoading={isHeroLoading} />

      {/* Progressive loading of other sections */}
      <Suspense fallback={<div className="h-96 bg-gray-100 animate-pulse" />}>
        {sectionsLoaded && (
          <>
            {/* Featured Events Section */}
            {featuredEvents.length > 0 && (
              <FeaturedEventsSection featuredEvents={featuredEvents} />
            )}

            {/* Explore Events Section */}
            {(regularEvents.length > 0 || categories.length > 0) && (
              <ExploreEventsSection
                events={regularEvents}
                categories={categories}
                selectedCategory={selectedCategory}
                onCategoryChange={setSelectedCategory}
              />
            )}

            {/* Blog Section */}
            {blogPosts.length > 0 && <BlogSection blogPosts={blogPosts} />}

            {/* Newsletter Section */}
            <NewsletterSection />
          </>
        )}
      </Suspense>
    </div>
  );
}
