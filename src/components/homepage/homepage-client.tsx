'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
  getFeaturedEvents,
  getEventsWithFilters,
  getEventFilterOptions,
} from '@/actions/event.actions';
import { getPublishedBlogs } from '@/actions/blog-actions';
import { HeroSection } from '@/components/homepage/hero';
import { FeaturedEventsSection } from '@/components/homepage/featured-events';
import { ExploreEventsSection } from '@/components/homepage/explore-events';
import { BlogSection } from '@/components/homepage/blog-section';
import { NewsletterSection } from '@/components/homepage/newsletter-section';
// import { LoadingScreen } from '@/components/homepage/loading-screen';

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
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch data on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch all data in parallel
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

        // Handle featured events
        if (featuredResponse.success && featuredResponse.data) {
          setFeaturedEvents(featuredResponse.data);
        } else {
          console.warn('No featured events found:', featuredResponse.message);
        }

        // Handle regular events
        if (eventsResponse.success && eventsResponse.data) {
          setRegularEvents(eventsResponse.data.events);
        } else {
          console.warn('No regular events found:', eventsResponse.message);
        }

        // Handle filter options for categories
        if (filterResponse.success && filterResponse.data) {
          setCategories(filterResponse.data.categories);
        } else {
          console.warn('No categories found:', filterResponse.message);
        }

        // Handle blog posts
        if (blogResponse.success && blogResponse.data) {
          setBlogPosts(blogResponse.data.blogs);
        } else {
          console.warn('No blog posts found:', blogResponse.message);
        }
      } catch (error) {
        console.error('Error fetching homepage data:', error);
        setError('Failed to load homepage data. Please try again later.');
        toast.error('Failed to load homepage data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Fetch filtered events when category changes
  useEffect(() => {
    const fetchFilteredEvents = async () => {
      if (selectedCategory === 'All') {
        // Reset to original regular events
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
  }, [selectedCategory, categories]);

  //   if (isLoading) {
  //     return <LoadingScreen />;
  //   }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-500 via-pink-500 to-orange-400 flex items-center justify-center">
        <div className="text-center text-white max-w-md mx-auto p-6">
          <h2 className="text-2xl font-bold mb-4">Something went wrong</h2>
          <p className="mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-white text-black px-6 py-3 rounded-lg hover:bg-gray-100 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <HeroSection featuredEvents={featuredEvents} />

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
    </div>
  );
}
