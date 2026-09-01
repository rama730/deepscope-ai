"use client";

import { useEffect, useState } from "react";
import { logger } from "@/lib/logger";

/**
 * Navigation history item
 */
interface NavigationHistoryItem {
  path: string;
  label: string;
  timestamp: number;
}

/**
 * Return type for navigation history hook
 */
interface UseNavigationHistoryReturn {
  history: NavigationHistoryItem[];
  addToHistory: (path: string, label: string) => void;
  clearHistory: () => void;
}

const STORAGE_KEY = "navigation-history";
const MAX_HISTORY_ITEMS = 10;

/**
 * Hook to manage navigation history with localStorage persistence
 * 
 * Maintains a list of recently visited pages (max 10) with automatic
 * deduplication. Persists to localStorage and is SSR-safe.
 * 
 * @returns Object containing history, add function, and clear function
 * @example
 * ```tsx
 * const { history, addToHistory, clearHistory } = useNavigationHistory();
 * addToHistory('/projects', 'Projects');
 * ```
 */
export function useNavigationHistory(): UseNavigationHistoryReturn {
  const [history, setHistory] = useState<NavigationHistoryItem[]>([]);

  useEffect(() => {
    // Load history from localStorage (SSR safe)
    if (typeof window === 'undefined') return;
    
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setHistory(parsed);
      }
    } catch (error) {
      logger.error("Error loading navigation history", { error: error instanceof Error ? error.message : String(error) });
    }
  }, []);

  const addToHistory = (path: string, label: string) => {
    setHistory((prev) => {
      // Remove duplicates and add to front
      const filtered = prev.filter((item) => item.path !== path);
      const updated = [
        { path, label, timestamp: Date.now() },
        ...filtered,
      ].slice(0, MAX_HISTORY_ITEMS);

      // Save to localStorage (SSR safe)
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        } catch (error) {
          logger.error("Error saving navigation history", { error: error instanceof Error ? error.message : String(error) });
        }
      }

      return updated;
    });
  };

  const clearHistory = () => {
    setHistory([]);
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch (error) {
        logger.error("Error clearing navigation history", { error: error instanceof Error ? error.message : String(error) });
      }
    }
  };

  return { history, addToHistory, clearHistory };
}
