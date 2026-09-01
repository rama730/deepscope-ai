import { useState, useEffect, useCallback } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Collection } from "@/types/hub";
import { logger } from "@/lib/logger";
import { SupabaseError } from "@/types/realtime";

export interface UseHubCollectionsReturn {
  collections: Collection[];
  loading: boolean;
  error: Error | null;
  createCollection: (name: string) => Promise<Collection | null>;
  deleteCollection: (id: string) => Promise<void>;
  updateCollectionOrder: (collectionIds: string[]) => Promise<void>;
  reload: () => Promise<void>;
}

/**
 * Database row type for collections
 */
interface CollectionRow {
  id: string;
  name: string;
  is_public: boolean;
  owner_id: string;
  created_at?: string;
  display_order?: number | null;
  description?: string | null;
  [key: string]: unknown;
}

/**
 * Hook to manage user collections with CRUD operations
 * 
 * Provides full collection management including creation, deletion,
 * and reordering. Includes project count fetching for each collection.
 * 
 * @param userId - The user ID to fetch collections for
 * @returns Object containing collections, loading state, error, and CRUD functions
 * @example
 * ```tsx
 * const { collections, createCollection, deleteCollection } = useHubCollections(userId);
 * await createCollection('My Favorites');
 * ```
 */
export function useHubCollections(userId: string | null): UseHubCollectionsReturn {
  const supabase = createSupabaseBrowserClient();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadCollections = useCallback(async () => {
    if (!userId) {
      setCollections([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // First fetch collections - order by display_order if available, else created_at
      // Note: Supabase requires a single order() call, so we'll sort client-side if needed
      const { data: collectionsData, error: collectionsError } = await supabase
        .from('collections')
        .select('*')
        .eq('owner_id', userId)
        .order('created_at', { ascending: false });

      // Sort by display_order client-side if available
      if (collectionsData && collectionsData.length > 0) {
        const rows = collectionsData as CollectionRow[];
        rows.sort((a, b) => {
          const aOrder = a.display_order;
          const bOrder = b.display_order;
          // Items with display_order come first, sorted by order
          if (aOrder !== null && aOrder !== undefined && bOrder !== null && bOrder !== undefined) {
            return aOrder - bOrder;
          }
          if (aOrder !== null && aOrder !== undefined) return -1;
          if (bOrder !== null && bOrder !== undefined) return 1;
          // Both null, keep original order (created_at desc)
          return 0;
        });
      }

      if (collectionsError) {
        const isMissingTable = collectionsError.code === '42P01' || collectionsError.message?.includes('does not exist');
        const isRLSError = collectionsError.code === '42501' || collectionsError.message?.includes('permission denied');
        
        if (isMissingTable || isRLSError) {
          // Silently fail for optional features
          setCollections([]);
          setLoading(false);
          return;
        }
        throw collectionsError;
      }

      if (!collectionsData || collectionsData.length === 0) {
        setCollections([]);
        setLoading(false);
        return;
      }

      // Then fetch project counts for each collection separately
      // This is more reliable than nested count queries
      const collectionsWithCounts = await Promise.all(
        collectionsData.map(async (collection) => {
          try {
            const { count, error: countError } = await supabase
              .from('collection_projects')
              .select('*', { count: 'exact', head: true })
              .eq('collection_id', collection.id);

            // If count query fails (table might not exist), default to 0
            const projectCount = countError ? 0 : (count || 0);
            
            return {
              ...collection,
              project_count: projectCount,
            } as Collection;
          } catch (countErr) {
            // If we can't get the count, default to 0
            return {
              ...collection,
              project_count: 0,
            } as Collection;
          }
        })
      );

      setCollections(collectionsWithCounts);
    } catch (err) {
      logger.error("Error loading collections detailed", { 
        error: err instanceof Error ? err.message : String(err) 
      });
      const error = err instanceof Error ? err : new Error(
        typeof err === 'object' && err !== null && 'message' in err 
          ? (err as SupabaseError).message || "Failed to load collections"
          : JSON.stringify(err) || "Failed to load collections"
      );
      
      const errorMessage = error.message?.toLowerCase() || '';
      const supabaseError = err as SupabaseError;
      const isExpectedError = errorMessage.includes('does not exist') || 
                             errorMessage.includes('permission denied') ||
                             errorMessage.includes('relation') ||
                             supabaseError?.code === '42P01' ||
                             supabaseError?.code === '42501';
      
      // Only log unexpected errors
      if (!isExpectedError) {
        logger.error("Error loading collections", { error: error.message });
      }
      setError(error);
      setCollections([]);
    } finally {
      setLoading(false);
    }
  }, [supabase, userId]);

  useEffect(() => {
    loadCollections();
  }, [loadCollections]);

  const createCollection = useCallback(async (name: string): Promise<Collection | null> => {
    if (!userId || !name.trim()) return null;

    try {
      setError(null);
      // Validate input
      const trimmedName = name.trim();
      if (trimmedName.length < 1 || trimmedName.length > 100) {
        throw new Error("Collection name must be between 1 and 100 characters");
      }

      const { data, error: createError } = await supabase
        .from('collections')
        .insert({
          owner_id: userId,
          name: trimmedName,
          is_public: false,
        })
        .select()
        .single();

      if (createError) {
        throw createError;
      }

      if (data) {
        const newCollection: Collection = { ...data, project_count: 0 };
        setCollections((prev) => [newCollection, ...prev]);
        return newCollection;
      }

      return null;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(`Failed to create collection: ${err}`);
      setError(error);
      throw error;
    }
  }, [supabase, userId]);

  const deleteCollection = useCallback(async (id: string) => {
    try {
      setError(null);
      const { error: deleteError } = await supabase
        .from('collections')
        .delete()
        .eq('id', id);

      if (deleteError) {
        throw deleteError;
      }

      setCollections((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Failed to delete collection");
      setError(error);
      throw error;
    }
  }, [supabase]);

  const updateCollectionOrder = useCallback(async (collectionIds: string[]) => {
    if (!userId) return;

    try {
      setError(null);
      // Update display_order for each collection
      const updates = collectionIds.map((id, index) => ({
        id,
        display_order: index,
      }));

      // Update in batch
      for (const update of updates) {
        const { error: updateError } = await supabase
          .from('collections')
          .update({ display_order: update.display_order })
          .eq('id', update.id)
          .eq('owner_id', userId);

        if (updateError) {
          logger.error("Error updating collection order", { 
            collectionId: update.id, 
            error: updateError.message 
          });
        }
      }

      // Optimistically update local state
      setCollections((prev) => {
        const ordered = collectionIds.map(id => prev.find(c => c.id === id)).filter(Boolean) as Collection[];
        const rest = prev.filter(c => !collectionIds.includes(c.id));
        return [...ordered, ...rest];
      });
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Failed to update collection order");
      setError(error);
      logger.error("Error updating collection order", { error: error.message });
    }
  }, [supabase, userId]);

  return {
    collections,
    loading,
    error,
    createCollection,
    deleteCollection,
    updateCollectionOrder,
    reload: loadCollections,
  };
}
