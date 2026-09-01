import { useQuery } from "@tanstack/react-query";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { ProjectService } from "@/lib/services/projectService";
import { STALE_TIMES } from "@/lib/config/query-config";
import { projectKeys } from "@/lib/queryKeys";

export function useProjectActivity(projectId: string, limit: number = 100, initialData?: any[]) {
  const supabase = createSupabaseBrowserClient();
  const queryKey = projectKeys.activity(projectId);

  const query = useQuery({
    queryKey,
    queryFn: () => ProjectService.getActivity(supabase, projectId, limit),
    staleTime: STALE_TIMES.VOLATILE,
    initialData,
  });

  return query;
}
