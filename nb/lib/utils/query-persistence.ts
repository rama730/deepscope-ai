import { QueryClient, dehydrate, hydrate } from "@tanstack/react-query";
import { get, set, del } from "idb-keyval";
import { cacheManager } from "./cache-manager";

const CACHE_KEY = "REACT_QUERY_OFFLINE_CACHE";

interface DehydratedState {
  mutations: unknown[];
  queries: unknown[];
}

/**
 * Saves the current query cache to IndexedDB
 */
export async function saveCache(client: QueryClient) {
  const state = dehydrate(client, {
    shouldDehydrateQuery: (query) => {
      // Only persist successful queries that are not specialized like "realtime"
      // and have a reasonable stale time.
      const isSuccess = query.state.status === "success";
      // Avoid persisting infinite queries or other complex states if they cause issues,
      // but generally we want them.
      return isSuccess;
    },
  });
  await set(CACHE_KEY, state);
}

/**
 * Restores the query cache from IndexedDB
 */
export async function restoreCache(client: QueryClient) {
  try {
    const state = await get<DehydratedState>(CACHE_KEY);
    if (state) {
      hydrate(client, state);
      // Remove stale queries immediately after hydration if needed,
      // but TanStack Query handles this with staleTime.
    }
  } catch (error) {
    console.error("Failed to restore cache", error);
    // If cache is corrupted, clear it
    await del(CACHE_KEY);
  }
}

/**
 * clears the persisted cache
 */
export async function clearCache() {
    await del(CACHE_KEY);
}

// Register with unified cache manager
if (typeof window !== 'undefined') {
  cacheManager.register('ReactQueryPersistence', clearCache, 20);
}
