import { useQueryClient } from "@tanstack/react-query";
import { STALE_TIMES } from "@/lib/config/query-config";
import { projectKeys } from "@/lib/queryKeys";
import { ProjectService } from "@/lib/services/projectService";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function useProjectPrefetch() {
  const queryClient = useQueryClient();
  const supabase = createSupabaseBrowserClient();

  const prefetchProject = (projectId: string) => {
    queryClient.prefetchQuery({
      queryKey: projectKeys.detail(projectId),
      queryFn: async () => {
        const { data, error } = await supabase
          .from("projects")
          .select(`
            *,
            profiles:creator_id(full_name, username),
            project_open_roles(*),
            project_collaborators(user_id, role, profiles(full_name, username))
          `)
          .eq("id", projectId)
          .single();

        if (error) throw error;
        return data;
      },
      staleTime: STALE_TIMES.SHORT, // Don't refetch if aggressive hover
    });

    queryClient.prefetchQuery({
      queryKey: projectKeys.activity(projectId),
      queryFn: () => ProjectService.getActivity(supabase, projectId, 100),
      staleTime: STALE_TIMES.VOLATILE,
    });
  };

  return { prefetchProject };
}
