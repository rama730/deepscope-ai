import { useQuery } from "@tanstack/react-query";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { STALE_TIMES } from "@/lib/config/query-config";

export interface TrendingTag {
  tag: string;
  count: number;
}

export function useTrendingTags(limit = 5) {
  const supabase = createSupabaseBrowserClient();

  return useQuery({
    queryKey: ["trending", "tags", limit],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_trending_tags", {
        limit_count: limit,
      });

      if (error) {
        throw error;
      }

      return data as TrendingTag[];
    },
    staleTime: STALE_TIMES.MEDIUM, // Trends don't change second-by-second
  });
}
