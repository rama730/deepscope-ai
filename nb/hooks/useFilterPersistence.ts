import { useEffect, useRef, useState } from "react";
import { HubFilters } from "@/types/hub";
import { FilterView, ViewMode } from "@/constants/hub";
import { logger } from "@/lib/logger";
import { cacheManager } from "@/lib/utils/cache-manager";

const FILTER_STATE_KEY = "hub_filter_state";

/**
 * Filter state to persist
 */
export interface FilterState {
  view: FilterView;
  filters: HubFilters;
  viewMode: ViewMode;
}

/**
 * Return type for filter persistence hook
 */
interface UseFilterPersistenceReturn {
  persistedState: FilterState | null;
  clearPersistedState: () => void;
}

/**
 * Hook to persist filter state to localStorage
 * 
 * Automatically saves filter state to localStorage with debouncing.
 * Loads persisted state on mount. SSR-safe.
 * 
 * @param filterState - Current filter state to persist
 * @param enabled - Whether persistence is enabled (default: true)
 * @returns Object containing persisted state and clear function
 * @example
 * ```tsx
 * const { persistedState, clearPersistedState } = useFilterPersistence({
 *   view: 'all',
 *   filters: { status: 'active', type: 'web', tech: [], sort: 'newest' },
 *   viewMode: 'grid'
 * });
 * ```
 */
export function useFilterPersistence(
  filterState: FilterState,
  enabled: boolean = true
): UseFilterPersistenceReturn {
  const [persistedState, setPersistedState] = useState<FilterState | null>(null);
  const hasLoadedRef = useRef(false);
  const isInitialMountRef = useRef(true);

  // Load persisted state once on mount (SSR safe)
  useEffect(() => {
    if (!enabled || hasLoadedRef.current || typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem(FILTER_STATE_KEY);
      if (stored) {
        const persisted = JSON.parse(stored) as FilterState;
        setPersistedState(persisted);
      }
    } catch (error) {
      logger.error("Error loading persisted filter state", { 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
    hasLoadedRef.current = true;
  }, [enabled]);

  // Save state to localStorage (debounced)
  useEffect(() => {
    if (!enabled || !hasLoadedRef.current || isInitialMountRef.current) {
      isInitialMountRef.current = false;
      return;
    }

    const timer = setTimeout(() => {
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(FILTER_STATE_KEY, JSON.stringify(filterState));
        } catch (error) {
          logger.error("Error saving filter state", { 
            error: error instanceof Error ? error.message : String(error) 
          });
        }
      }
    }, 500); // Debounce saves

    return () => clearTimeout(timer);
  }, [filterState, enabled]);

  // Clear persisted state
  const clearPersistedState = () => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(FILTER_STATE_KEY);
        setPersistedState(null);
      } catch (error) {
        logger.error("Error clearing persisted filter state", { 
          error: error instanceof Error ? error.message : String(error) 
        });
      }
    }
  };

  // Register with unified cache manager
  useEffect(() => {
    cacheManager.register('HubFilters', clearPersistedState, 5);
    return () => cacheManager.unregister('HubFilters');
  }, [clearPersistedState]);

  return { persistedState, clearPersistedState };
}
