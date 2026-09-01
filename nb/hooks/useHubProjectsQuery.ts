import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { HubFilters } from "@/types/hub";
import { fetchHubProjects } from "@/lib/services/hub";
import { hubKeys } from "@/lib/queryKeys";

interface UseHubProjectsQueryOptions {
  filters: HubFilters & {
    search?: string;
    includedIds?: string[];
  };
  view: string;
  pageSize?: number;
}

export function useHubProjectsQuery({ filters, view, pageSize = 24 }: UseHubProjectsQueryOptions) {
  const supabase = createSupabaseBrowserClient();

  return useSuspenseInfiniteQuery({
    queryKey: hubKeys.list(view, filters),
    queryFn: ({ pageParam }) => fetchHubProjects({ 
      supabase, 
      filters, 
      pageSize, 
      pageParam 
    }),
    initialPageParam: 0 as any, // Using 0 as default offset/start
    getNextPageParam: (lastPage) => lastPage.nextPage,
    staleTime: 60000, // 1 minute
  });
}
