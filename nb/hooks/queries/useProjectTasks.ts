import { useQuery } from "@tanstack/react-query";
import { STALE_TIMES } from "@/lib/config/query-config";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { ProjectService } from "@/lib/services/projectService";
import { projectKeys } from "@/lib/queryKeys";

export function useProjectTasks(projectId: string, filters: any = {}, initialData?: any) {
  const supabase = createSupabaseBrowserClient();
  const queryKey = projectKeys.tasks(projectId, filters);

  const query = useQuery({
    queryKey,
    queryFn: () => ProjectService.getTasks(supabase, projectId, filters),
    initialData,
    staleTime: STALE_TIMES.SHORT,
  });

  return query;
}
