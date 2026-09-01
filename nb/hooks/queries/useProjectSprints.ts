import { useQuery } from "@tanstack/react-query";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { STALE_TIMES } from "@/lib/config/query-config";
import { projectKeys } from "@/lib/queryKeys";

export type ProjectSprint = {
  id: string;
  project_id: string;
  name: string;
  status: string;
  start_date?: string | null;
  end_date?: string | null;
};

export function useProjectSprints(projectId: string) {
  const supabase = createSupabaseBrowserClient();

  return useQuery({
    queryKey: projectKeys.sprints(projectId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_sprints")
        .select("id, project_id, name, status, start_date, end_date")
        .eq("project_id", projectId)
        .order("start_date", { ascending: false });
      if (error) throw error;
      return (data || []) as ProjectSprint[];
    },
    staleTime: STALE_TIMES.MEDIUM,
    enabled: !!projectId,
  });
}

