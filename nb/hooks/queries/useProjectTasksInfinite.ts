import { useInfiniteQuery } from "@tanstack/react-query";
import { STALE_TIMES } from "@/lib/config/query-config";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { ProjectService } from "@/lib/services/projectService";
import { projectKeys } from "@/lib/queryKeys";

export interface TaskFilters {
  status?: string | string[];
  priority?: string | string[];
  sprint?: string;
  archived?: boolean | string;
  search?: string;
  assigned_to?: string;
  due_date?: string;
  [key: string]: any;
}

export function useProjectTasksInfinite(
  projectId: string,
  filters: TaskFilters = {},
  options: {
    enabled?: boolean;
    pageSize?: number;
  } = {}
) {
  const supabase = createSupabaseBrowserClient();
  const { enabled = true, pageSize = 50 } = options;

  // Ensure query key is under projectKeys.detail(projectId) -> 'tasks' for realtime invalidation
  const queryKey = [...projectKeys.detail(projectId), "tasks", "infinite", filters] as const;

  const query = useInfiniteQuery({
    queryKey,
    queryFn: async ({ pageParam = 1 }) => {
      const result = await ProjectService.getTasks(supabase, projectId, {
        ...filters,
        page: pageParam,
        limit: pageSize,
      });
      return {
        data: result.data || [],
        count: result.count || 0,
        page: pageParam,
        hasMore: result.data ? result.data.length === pageSize : false,
      };
    },
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage.hasMore) return undefined;
      return allPages.length + 1;
    },
    initialPageParam: 1,
    enabled: enabled && !!projectId,
    staleTime: STALE_TIMES.SHORT,
  });

  // Flatten pages into a single array for easier consumption
  const allTasks = query.data?.pages.flatMap((page) => page.data) || [];
  const totalCount = query.data?.pages[0]?.count || 0;

  return {
    ...query,
    tasks: allTasks,
    totalCount,
  };
}
