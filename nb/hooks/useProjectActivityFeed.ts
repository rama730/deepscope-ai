import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export type ActivityFeedItem = {
  id: string;
  project_id: string;
  type: string;
  description: string;
  actor_id: string | null;
  created_at: string;
  metadata: Record<string, any>;
  actor?: {
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
  } | null;
};

const PAGE_SIZE = 20;

export function useProjectActivityFeed(projectId: string) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!projectId) return;

    const channel = supabase
      .channel(`project-activity-${projectId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "project_tasks",
          filter: `project_id=eq.${projectId}`,
        },
        () => queryClient.invalidateQueries({ queryKey: ["project-activity-feed-v2", projectId] })
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "project_files",
          filter: `project_id=eq.${projectId}`,
        },
        () => queryClient.invalidateQueries({ queryKey: ["project-activity-feed-v2", projectId] })
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "project_updates",
          filter: `project_id=eq.${projectId}`,
        },
        () => queryClient.invalidateQueries({ queryKey: ["project-activity-feed-v2", projectId] })
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "project_collaborators",
          filter: `project_id=eq.${projectId}`,
        },
        () => queryClient.invalidateQueries({ queryKey: ["project-activity-feed-v2", projectId] })
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "project_activity_events",
          filter: `project_id=eq.${projectId}`,
        },
        () => queryClient.invalidateQueries({ queryKey: ["project-activity-feed-v2", projectId] })
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId, queryClient, supabase]);

  return useInfiniteQuery({
    queryKey: ["project-activity-feed-v2", projectId],
    queryFn: async ({ pageParam = 0 }) => {
      // Fetch feed items
      const { data, error } = await supabase
        .from("project_activity_feed")
        .select(`
          id,
          project_id,
          type,
          description,
          actor_id,
          created_at,
          metadata,
          actor
        `)
        .eq("project_id", projectId)
        .order("created_at", { ascending: false })
        .range(pageParam * PAGE_SIZE, (pageParam + 1) * PAGE_SIZE - 1);

      if (error) throw error;
      return data as ActivityFeedItem[];
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < PAGE_SIZE) return undefined;
      return allPages.length;
    },
    staleTime: 1000 * 60, // 1 minute
  });
}
