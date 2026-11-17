'use client';

import { useState } from 'react';
import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import {
  CACHE_MAX_AGE_MS,
  CACHE_STORAGE_KEY,
  CACHE_VERSION,
  PUBLIC_STALE_MS,
} from '@/lib/query-cache';

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: PUBLIC_STALE_MS,
        // must be >= the persister maxAge, otherwise saved data is garbage collected early
        gcTime: CACHE_MAX_AGE_MS,
        refetchOnWindowFocus: false,
        retry: 1,
      },
    },
  });
}

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(makeQueryClient);
  const [persister] = useState(() =>
    createSyncStoragePersister({
      // undefined on the server: the persister then does nothing
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      key: CACHE_STORAGE_KEY,
      throttleTime: 1000,
    })
  );

  return (
    <PersistQueryClientProvider
      client={client}
      persistOptions={{
        persister,
        maxAge: CACHE_MAX_AGE_MS,
        buster: CACHE_VERSION,
        dehydrateOptions: {
          // opt-in only: a query is saved when it sets meta: { persist: true }
          shouldDehydrateQuery: (query) =>
            query.state.status === 'success' && query.meta?.persist === true,
        },
      }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}
