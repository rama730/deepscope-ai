import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { projectKeys } from "@/lib/queryKeys";
import { useEffect } from "react";

interface UseProjectDetailsOptions {
  projectId: string;
  initialData?: any;
}

export function useProjectDetails({ projectId, initialData }: UseProjectDetailsOptions) {
  const supabase = createSupabaseBrowserClient();
  const queryClient = useQueryClient();
  const queryKey = projectKeys.detail(projectId);

  const query = useQuery({
    queryKey,
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
    initialData,
    staleTime: 1000 * 60 * 5, // 5 minutes - trust server data/hydration
  });

  // Real-time subscription for Project updates
  useEffect(() => {
    if (!projectId) return;

    const channel = supabase
      .channel(`project-${projectId}-detail`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "projects", filter: `id=eq.${projectId}` },
        (payload) => {
          queryClient.setQueryData(queryKey, (old: any) => {
            if (!old) return old;
            return { ...old, ...payload.new };
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId, queryClient, supabase, queryKey]);

  return query;
}
