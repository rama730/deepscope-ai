import { useState, useEffect, useCallback, useRef } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { UserPreferences, HubFilters } from "@/types/hub";
import { useDebounce } from "./useDebounce";
import { logger } from "@/lib/logger";

export interface UseHubPreferencesReturn {
  preferences: UserPreferences | null;
  loading: boolean;
  error: Error | null;
  updatePreferences: (prefs: Partial<UserPreferences>) => Promise<void>;
}

/**
 * Hook to manage user hub preferences with automatic persistence
 * 
 * Automatically saves preferences to database with debouncing to prevent
 * excessive writes. Loads preferences on mount and syncs changes.
 * 
 * @param userId - The user ID to fetch preferences for
 * @param currentFilters - Current filter state to persist
 * @param viewMode - Current view mode (grid/list) to persist
 * @param sortBy - Current sort option to persist
 * @returns Object containing preferences, loading state, error, and update function
 * @example
 * ```tsx
 * const { preferences, loading, updatePreferences } = useHubPreferences(
 *   userId,
 *   filters,
 *   'grid',
 *   'newest'
 * );
 * await updatePreferences({ hub_view_mode: 'list' });
 * ```
 */
export function useHubPreferences(
  userId: string | null,
  currentFilters: HubFilters,
  viewMode: 'grid' | 'list',
  sortBy: string
): UseHubPreferencesReturn {
  const supabase = createSupabaseBrowserClient();
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Debounce filter changes to avoid excessive saves
  const debouncedFilters = useDebounce(currentFilters, 1000);

  // Load preferences
  useEffect(() => {
    if (!userId) {
      setPreferences(null);
      return;
    }

    async function loadPreferences() {
      try {
        setLoading(true);
        setError(null);
        const { data, error: fetchError } = await supabase
          .from('user_preferences')
          .select('*')
          .eq('user_id', userId)
          .single();

        if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = no rows returned
          throw fetchError;
        }

        if (data) {
          setPreferences(data);
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Failed to load preferences");
        setError(error);
        logger.error("Error loading preferences", { error: error.message });
      } finally {
        setLoading(false);
      }
    }

    loadPreferences();
  }, [supabase, userId]);

  // Save preferences (debounced)
  useEffect(() => {
    if (!userId || loading) return;

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      try {
        const prefsToSave: UserPreferences = {
          hub_view_mode: viewMode,
          hub_sort_by: sortBy,
          hub_filters: {
            status: debouncedFilters.status,
            type: debouncedFilters.type,
            tech: debouncedFilters.tech,
          },
        };

        const { error: saveError } = await supabase
          .from('user_preferences')
          .upsert({
            user_id: userId,
            ...prefsToSave,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'user_id' });

        if (saveError) {
          throw saveError;
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Failed to save preferences");
        setError(error);
        logger.error("Error saving preferences", { error: error.message });
      }
    }, 1000);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [supabase, userId, viewMode, sortBy, debouncedFilters, loading]);

  const updatePreferences = useCallback(async (prefs: Partial<UserPreferences>) => {
    if (!userId) return;

    try {
      setError(null);
      const { error: updateError } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: userId,
          ...prefs,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });

      if (updateError) {
        throw updateError;
      }

      setPreferences((prev) => ({ ...prev, ...prefs } as UserPreferences));
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Failed to update preferences");
      setError(error);
      throw error;
    }
  }, [supabase, userId]);

  return {
    preferences,
    loading,
    error,
    updatePreferences,
  };
}
