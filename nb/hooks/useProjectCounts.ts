import { useState, useEffect, useCallback } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { logger } from "@/lib/logger";

export interface ProjectCounts {
  [projectId: string]: {
    contributors: number;
    followers: number;
  };
}

/**
 * Database row type for project collaborators
 */
interface CollaboratorRow {
  project_id: string;
}

/**
 * Database row type for project followers
 */
interface FollowerRow {
  project_id: string;
}

/**
 * Return type for project counts hook
 */
interface UseProjectCountsReturn {
  counts: ProjectCounts;
  loading: boolean;
  refetch: () => void;
}

/**
 * Hook to fetch contributor and follower counts for multiple projects
 * 
 * Efficiently batches count queries for multiple projects in a single request.
 * 
 * @param projectIds - Array of project IDs to fetch counts for
 * @returns Object containing counts map, loading state, and refetch function
 * @example
 * ```tsx
 * const { counts, loading, refetch } = useProjectCounts(['project-1', 'project-2']);
 * const contributorCount = counts['project-1']?.contributors || 0;
 * ```
 */
export function useProjectCounts(projectIds: string[]): UseProjectCountsReturn {
  const supabase = createSupabaseBrowserClient();
  const [counts, setCounts] = useState<ProjectCounts>({});
  const [loading, setLoading] = useState(false);

  const fetchCounts = useCallback(async (ids: string[]) => {
    if (ids.length === 0) {
      setCounts({});
      return;
    }

    setLoading(true);
    try {
      // Fetch contributor counts
      const { data: contributorsData } = await supabase
        .from("project_collaborators")
        .select("project_id")
        .in("project_id", ids);

      // Fetch follower counts
      const { data: followersData } = await supabase
        .from("project_followers")
        .select("project_id")
        .in("project_id", ids);

      // Calculate counts
      const contributorCounts: Record<string, number> = {};
      const followerCounts: Record<string, number> = {};

      const collaborators = (contributorsData || []) as CollaboratorRow[];
      const followers = (followersData || []) as FollowerRow[];

      collaborators.forEach((item) => {
        contributorCounts[item.project_id] = (contributorCounts[item.project_id] || 0) + 1;
      });

      followers.forEach((item) => {
        followerCounts[item.project_id] = (followerCounts[item.project_id] || 0) + 1;
      });

      // Combine into counts object
      const newCounts: ProjectCounts = {};
      ids.forEach((id) => {
        newCounts[id] = {
          contributors: contributorCounts[id] || 0,
          followers: followerCounts[id] || 0,
        };
      });

      setCounts(newCounts);
    } catch (error) {
      logger.error("Error fetching project counts", { 
        error: error instanceof Error ? error.message : String(error) 
      });
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    if (projectIds.length > 0) {
      fetchCounts(projectIds);
    }
  }, [projectIds, fetchCounts]);

  return { counts, loading, refetch: () => fetchCounts(projectIds) };
}
