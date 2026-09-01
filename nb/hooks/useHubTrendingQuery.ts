import { useQuery } from "@tanstack/react-query";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

interface TrendingScoreRow {
  project_id: string;
  score: number | string;
}

export function useHubTrendingQuery() {
  const supabase = createSupabaseBrowserClient();

  return useQuery({
    queryKey: ['hub-trending'],
    queryFn: async () => {
      /*
      const { data, error } = await supabase
        .from('project_trending_scores')
        .select('project_id, score')
        .order('score', { ascending: false })
        .limit(50);

      if (error) { ... }
      */
      
      // Feature disabled due to missing view
      return {};

      /*
      const scores: Record<string, number> = {};
      (data as TrendingScoreRow[]).forEach((item) => {
        scores[item.project_id] = Number(item.score) || 0;
      });
      return scores;
      */
      return {};
    },

    retry: 1,
  });
}
