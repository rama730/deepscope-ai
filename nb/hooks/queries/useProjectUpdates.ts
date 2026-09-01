import { useQuery } from "@tanstack/react-query";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { ProjectService } from "@/lib/services/projectService";
import { projectKeys } from "@/lib/queryKeys";

export function useProjectUpdates(projectId: string, limit: number = 10) {
  const supabase = createSupabaseBrowserClient();
  const queryKey = projectKeys.updates(projectId);

  return useQuery({
    queryKey,
    queryFn: () => ProjectService.getUpdates(supabase, projectId, limit),
  });
}
