'use client';

import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { keepPreviousData } from '@tanstack/react-query';
import { usePathname } from 'next/navigation';
import {
  getEventsWithFilters,
  getEventFilterOptions,
  getFeaturedEvents,
} from '@/actions/event.actions';
import { getPublishedBlogs } from '@/actions/blog-actions';
import { getCategories, getMajorCategories } from '@/actions/category-actions';
import { getWhatsappWidget } from '@/actions/whatsapp-actions';
import { getCities } from '@/actions/city-actions';
import { getTags } from '@/actions/tag.actions';
import { getVenues } from '@/actions/venue-actions';
import { PERSIST_META, PUBLIC_STALE_MS } from '@/lib/query-cache';

type ActionResult<T> = { success: boolean; data?: T; message?: string };

/** Server actions return { success, data }. React Query wants a thrown error instead. */
function unwrap<T>(result: ActionResult<T>, fallback: string): T {
  if (!result.success || result.data === undefined) {
    throw new Error(result.message || fallback);
  }
  return result.data;
}

/**
 * Public pages trust saved data for 10 minutes. Inside the admin and organizer
 * dashboards the saved copy is shown instantly but always re-checked in the
 * background, so a list someone just edited never stays out of date.
 */
function useFreshness() {
  const pathname = usePathname() ?? '';
  const inDashboard =
    pathname.startsWith('/admin') || pathname.startsWith('/dashboard');
  return inDashboard ? 0 : PUBLIC_STALE_MS;
}

export const queryKeys = {
  featuredEvents: ['events', 'featured'] as const,
  homeEvents: (majorCategoryId: string) => ['events', 'home', 'major', majorCategoryId] as const,
  eventFilters: ['events', 'filter-options'] as const,
  eventsInfinite: (filters: object) => ['events', 'infinite', filters] as const,
  blogs: (page: number, limit: number) => ['blogs', 'published', page, limit] as const,
  categories: ['ref', 'categories'] as const,
  majorCategories: ['ref', 'major-categories'] as const,
  tags: ['ref', 'tags'] as const,
  cities: ['ref', 'cities'] as const,
  venues: ['ref', 'venues'] as const,
  whatsapp: ['site', 'whatsapp'] as const,
};

/* ----------------------------- events ----------------------------- */

export function useFeaturedEvents() {
  const staleTime = useFreshness();
  return useQuery({
    queryKey: queryKeys.featuredEvents,
    queryFn: async () => unwrap(await getFeaturedEvents(), 'Could not load featured events'),
    staleTime,
    meta: PERSIST_META,
  });
}

/** First page of non-featured events for the home page, optionally for one major category. */
export function useHomeEvents(majorCategoryId = '') {
  const staleTime = useFreshness();
  return useQuery({
    queryKey: queryKeys.homeEvents(majorCategoryId),
    queryFn: async () => {
      const data = unwrap(
        await getEventsWithFilters({
          page: 1,
          limit: 9,
          featured: false,
          ...(majorCategoryId ? { majorCategoryId } : {}),
        }),
        'Could not load events'
      );
      return data.events as any[];
    },
    placeholderData: keepPreviousData,
    staleTime,
    meta: PERSIST_META,
  });
}

/** Major categories, categories, cities and tags used by the filters. */
export function useEventFilterOptions() {
  const staleTime = useFreshness();
  return useQuery({
    queryKey: queryKeys.eventFilters,
    queryFn: async () =>
      unwrap(await getEventFilterOptions(), 'Could not load filters') as {
        majorCategories: any[];
        categories: any[];
        cities: any[];
        tags: any[];
      },
    staleTime,
    meta: PERSIST_META,
  });
}

export interface EventListFilters {
  search: string;
  majorCategoryId: string;
  categoryId: string;
  cityId: string;
  tagIds: string[];
  dateRange: string;
  priceRange: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  featured: boolean;
  eventTypes: string[];
  votingStatus: string;
  votingType: string;
}

/** The /events list with infinite scroll. Each filter combination is cached on its own. */
export function useEventsInfinite(filters: EventListFilters) {
  const staleTime = useFreshness();
  return useInfiniteQuery({
    queryKey: queryKeys.eventsInfinite(filters),
    initialPageParam: 1,
    queryFn: async ({ pageParam }) =>
      unwrap(
        await getEventsWithFilters({ page: pageParam, limit: 12, ...filters }),
        'Failed to fetch events'
      ) as { events: any[]; totalCount: number; hasMore: boolean },
    getNextPageParam: (last, pages) => (last.hasMore ? pages.length + 1 : undefined),
    staleTime,
    // searches are one-off, so only filter/sort combinations are saved
    meta: { persist: filters.search.trim() === '' },
  });
}

/* ------------------------------ blog ------------------------------ */

export function usePublishedBlogs(page = 1, limit = 3) {
  const staleTime = useFreshness();
  return useQuery({
    queryKey: queryKeys.blogs(page, limit),
    queryFn: async () => {
      const data = unwrap(await getPublishedBlogs(page, limit), 'Could not load articles');
      return data.blogs as any[];
    },
    staleTime,
    meta: PERSIST_META,
  });
}

/* ------------------- reference lists used by forms ------------------- */

export function useCategories(enabled = true) {
  const staleTime = useFreshness();
  return useQuery({
    queryKey: queryKeys.categories,
    queryFn: async () => unwrap(await getCategories(), 'Could not load categories'),
    enabled,
    staleTime,
    meta: PERSIST_META,
  });
}

export function useMajorCategories(enabled = true) {
  const staleTime = useFreshness();
  return useQuery({
    queryKey: queryKeys.majorCategories,
    queryFn: async () =>
      unwrap(await getMajorCategories(), 'Could not load major categories'),
    enabled,
    staleTime,
    meta: PERSIST_META,
  });
}

export function useTags(enabled = true) {
  const staleTime = useFreshness();
  return useQuery({
    queryKey: queryKeys.tags,
    queryFn: async () => unwrap(await getTags(), 'Could not load tags'),
    enabled,
    staleTime,
    meta: PERSIST_META,
  });
}

export function useCities(enabled = true) {
  const staleTime = useFreshness();
  return useQuery({
    queryKey: queryKeys.cities,
    queryFn: async () => unwrap(await getCities(), 'Could not load cities'),
    enabled,
    staleTime,
    meta: PERSIST_META,
  });
}

export function useVenues(enabled = true) {
  const staleTime = useFreshness();
  return useQuery({
    queryKey: queryKeys.venues,
    queryFn: async () => unwrap(await getVenues(), 'Could not load venues'),
    enabled,
    staleTime,
    meta: PERSIST_META,
  });
}

/** The WhatsApp chat widget settings (null when it is off). Saved in the browser like the rest. */
export function useWhatsappWidget() {
  const staleTime = useFreshness();
  return useQuery({
    queryKey: queryKeys.whatsapp,
    queryFn: async () => unwrap(await getWhatsappWidget(), 'Could not load chat settings'),
    staleTime,
    meta: PERSIST_META,
  });
}
