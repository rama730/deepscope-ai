import { useState, useEffect, useCallback } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { logger } from "@/lib/logger";

export interface UseUserProjectIdsReturn {
  projectIds: Set<string>;
  loading: boolean;
  error: Error | null;
  reload: () => Promise<void>;
}

/**
 * Database row type for project collaborators
 */
interface ProjectCollaboratorRow {
  project_id: string;
}

/**
 * Database row type for project applications
 */
interface ProjectApplicationRow {
  project_id: string;
}

/**
 * Hook to fetch user's project IDs (collaborations and applications)
 * 
 * Aggregates project IDs from both collaborators and applications tables
 * to provide a complete set of projects the user is associated with.
 * 
 * @param userId - The user ID to fetch projects for
 * @returns Object containing project IDs set, loading state, error, and reload function
 * @example
 * ```tsx
 * const { projectIds, loading, error, reload } = useUserProjectIds(userId);
 * ```
 */
export function useUserProjectIds(userId: string | null): UseUserProjectIdsReturn {
  const supabase = createSupabaseBrowserClient();
  const [projectIds, setProjectIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const loadUserProjectIds = useCallback(async () => {
    if (!userId) {
      setProjectIds(new Set());
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const [collaboratingResult, appliedResult] = await Promise.all([
        supabase
          .from("project_collaborators")
          .select("project_id")
          .eq("user_id", userId),
        supabase
          .from("project_applications")
          .select("project_id")
          .eq("applicant_id", userId),
      ]);

      if (collaboratingResult.error) {
        throw collaboratingResult.error;
      }
      if (appliedResult.error) {
        throw appliedResult.error;
      }

      const ids = new Set<string>();
      const collaborators = (collaboratingResult.data || []) as ProjectCollaboratorRow[];
      const applications = (appliedResult.data || []) as ProjectApplicationRow[];
      
      collaborators.forEach((p) => ids.add(p.project_id));
      applications.forEach((p) => ids.add(p.project_id));
      setProjectIds(ids);
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Failed to load user project IDs");
      setError(error);
      logger.error("Error loading user project IDs", { error: error.message });
      setProjectIds(new Set());
    } finally {
      setLoading(false);
    }
  }, [supabase, userId]);

  useEffect(() => {
    loadUserProjectIds();
  }, [loadUserProjectIds]);

  return {
    projectIds,
    loading,
    error,
    reload: loadUserProjectIds,
  };
}
