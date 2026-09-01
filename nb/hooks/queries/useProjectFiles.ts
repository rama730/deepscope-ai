import { useQuery } from "@tanstack/react-query";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { ProjectService } from "@/lib/services/projectService";
import { STALE_TIMES } from "@/lib/config/query-config";
import { projectKeys } from "@/lib/queryKeys";

export function useProjectFiles(projectId: string, filters: any = {}, initialData?: any) {
  const supabase = createSupabaseBrowserClient();
  const queryKey = projectKeys.files(projectId);

  const query = useQuery({
    queryKey,
    queryFn: () => ProjectService.getFiles(supabase, projectId, filters),
    initialData,
    staleTime: STALE_TIMES.MEDIUM,
  });

  return query;
}
