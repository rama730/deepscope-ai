import { useState, useEffect, useCallback, useRef } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { logger } from "@/lib/logger";
import { RealtimeChannel } from "@supabase/supabase-js";

export interface UseCollectionProjectsReturn {
  projectIds: Set<string>;
  loading: boolean;
  error: Error | null;
  reload: () => Promise<void>;
}

/**
 * Database response type for collection projects
 */
interface CollectionProjectRow {
  project_id: string;
}

/**
 * Real-time payload for collection projects
 */
interface CollectionProjectPayload {
  new?: { project_id: string };
  old?: { project_id: string };
  eventType: "INSERT" | "UPDATE" | "DELETE";
}

/**
 * Hook to manage collection projects with real-time updates
 * 
 * Fetches and maintains a set of project IDs for a collection,
 * with real-time synchronization when projects are added or removed.
 * 
 * @param collectionId - The collection ID to fetch projects for
 * @returns Object containing project IDs set, loading state, error, and reload function
 * @example
 * ```tsx
 * const { projectIds, loading, error, reload } = useCollectionProjects(collectionId);
 * ```
 */
export function useCollectionProjects(collectionId: string | null): UseCollectionProjectsReturn {
  const supabase = createSupabaseBrowserClient();
  const [projectIds, setProjectIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const loadCollectionProjects = useCallback(async () => {
    if (!collectionId) {
      setProjectIds(new Set());
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const { data, error: fetchError } = await supabase
        .from('collection_projects')
        .select('project_id')
        .eq('collection_id', collectionId);

      if (fetchError) {
        throw fetchError;
      }

      if (data) {
        const rows = data as CollectionProjectRow[];
        setProjectIds(new Set(rows.map((p) => p.project_id)));
      } else {
        setProjectIds(new Set());
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Failed to load collection projects");
      setError(error);
      logger.error("Error loading collection projects", { error: error.message });
      setProjectIds(new Set());
    } finally {
      setLoading(false);
    }
  }, [supabase, collectionId]);

  useEffect(() => {
    loadCollectionProjects();

    // Subscribe to collection changes
    if (collectionId) {
      const channel = supabase
        .channel(`collection-${collectionId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'collection_projects',
            filter: `collection_id=eq.${collectionId}`,
          },
          (payload: any) => {
            try {
              const updatePayload = payload as unknown as CollectionProjectPayload;
              if (updatePayload.eventType === 'INSERT' && updatePayload.new) {
                setProjectIds((prev) => new Set(prev).add(updatePayload.new!.project_id));
              } else if (updatePayload.eventType === 'DELETE' && updatePayload.old) {
                setProjectIds((prev) => {
                  const next = new Set(prev);
                  next.delete(updatePayload.old!.project_id);
                  return next;
                });
              }
            } catch (err) {
              logger.error("Error handling collection update", { 
                error: err instanceof Error ? err.message : String(err) 
              });
            }
          }
        )
        .subscribe((status) => {
          if (status === 'CHANNEL_ERROR') {
            const error = new Error("Failed to subscribe to collection updates");
            setError(error);
            logger.error("Subscription error", { error: error.message });
          }
        });

      channelRef.current = channel;

      return () => {
        if (channelRef.current) {
          supabase.removeChannel(channelRef.current);
        }
      };
    }
  }, [supabase, collectionId, loadCollectionProjects]);

  return {
    projectIds,
    loading,
    error,
    reload: loadCollectionProjects,
  };
}
