import { useState, useEffect, useCallback } from "react";
import { logger } from "@/lib/logger";
import { cacheManager } from "@/lib/utils/cache-manager";

const SEARCH_HISTORY_KEY = "hub_search_history";
const MAX_HISTORY_ITEMS = 10;

/**
 * Search history item
 */
export interface SearchHistoryItem {
  query: string;
  timestamp: number;
}

/**
 * Return type for search history hook
 */
interface UseSearchHistoryReturn {
  recentSearches: SearchHistoryItem[];
  addSearch: (query: string) => void;
  clearHistory: () => void;
}

/**
 * Hook to manage search history with localStorage persistence
 * 
 * Maintains a list of recent searches (max 10) with automatic deduplication.
 * Persists to localStorage and is SSR-safe.
 * 
 * @returns Object containing recent searches, add function, and clear function
 * @example
 * ```tsx
 * const { recentSearches, addSearch, clearHistory } = useSearchHistory();
 * addSearch('react hooks');
 * ```
 */
export function useSearchHistory(): UseSearchHistoryReturn {
  const [recentSearches, setRecentSearches] = useState<SearchHistoryItem[]>([]);

  // Load search history from localStorage (SSR safe)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    try {
      const stored = localStorage.getItem(SEARCH_HISTORY_KEY);
      if (stored) {
        const history = JSON.parse(stored) as SearchHistoryItem[];
        setRecentSearches(history);
      }
    } catch (error) {
      logger.error("Error loading search history", { 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  }, []);

  // Add search to history
  const addSearch = useCallback((query: string) => {
    if (!query.trim()) return;

    setRecentSearches((prev) => {
      // Remove duplicates and add to beginning
      const filtered = prev.filter((item) => item.query.toLowerCase() !== query.toLowerCase());
      const updated = [{ query: query.trim(), timestamp: Date.now() }, ...filtered].slice(0, MAX_HISTORY_ITEMS);
      
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updated));
        } catch (error) {
          logger.error("Error saving search history", { 
            error: error instanceof Error ? error.message : String(error) 
          });
        }
      }

      return updated;
    });
  }, []);

  // Clear search history
  const clearHistory = useCallback(() => {
    setRecentSearches([]);
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(SEARCH_HISTORY_KEY);
      } catch (error) {
        logger.error("Error clearing search history", { 
          error: error instanceof Error ? error.message : String(error) 
        });
      }
    }
  }, []);

  // Register with unified cache manager
  useEffect(() => {
    cacheManager.register('SearchHistory', clearHistory, 5);
    return () => cacheManager.unregister('SearchHistory');
  }, [clearHistory]);

  return {
    recentSearches,
    addSearch,
    clearHistory,
  };
}
