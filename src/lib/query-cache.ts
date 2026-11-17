/**
 * Settings for the persisted browser cache (TanStack Query + localStorage).
 *
 * How it behaves:
 *  - The first visit fetches from the server and saves the result in localStorage.
 *  - Every later visit or refresh shows the saved data instantly, with no loading screen.
 *  - Saved data is refreshed silently in the background once it is older than
 *    PUBLIC_STALE_MS (or on every visit inside /admin and /dashboard, so admins never
 *    edit against an outdated list).
 *  - Saved data is thrown away after CACHE_MAX_AGE_MS, or when CACHE_VERSION changes.
 *
 * Only public, non-personal data is saved: events, categories, cities, tags, venues
 * and blog posts. Orders, users, subscribers, contact messages and other private
 * data are never written to localStorage.
 */
export const CACHE_STORAGE_KEY = 'myevent-cache';

/** Bump this string after a deploy that changes the shape of cached data. */
export const CACHE_VERSION = '2';

export const PUBLIC_STALE_MS = 10 * 60 * 1000; // refresh in the background after 10 minutes
export const CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000; // drop saved data after 24 hours

/** Add this to a query's `meta` to opt it in to localStorage persistence. */
export const PERSIST_META = { persist: true } as const;

export function clearPersistedCache() {
  try {
    window.localStorage.removeItem(CACHE_STORAGE_KEY);
  } catch {
    // storage can be blocked (private mode, strict settings): nothing to clear
  }
}
