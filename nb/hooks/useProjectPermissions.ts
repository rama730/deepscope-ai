import { useQuery } from "@tanstack/react-query";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

interface ProjectPermissions {
  isCreator: boolean;
  isCollaborator: boolean;
  hasAccess: boolean;
  isLoading: boolean;
}

export function useProjectPermissions(projectId: string | null, userId: string | null): ProjectPermissions {
  const supabase = createSupabaseBrowserClient();

  const { data, isLoading } = useQuery({
    queryKey: ['project-permissions', projectId, userId],
    queryFn: async () => {
      if (!projectId || !userId) return null;

      const [projectResult, collaboratorResult] = await Promise.all([
        supabase
          .from('projects')
          .select('creator_id')
          .eq('id', projectId)
          .single(),
        supabase
          .from('project_collaborators')
          .select('user_id')
          .eq('project_id', projectId)
          .eq('user_id', userId)
          .maybeSingle()
      ]);

      const isCreator = projectResult.data?.creator_id === userId;
      const isCollaborator = !!collaboratorResult.data;
      
      return {
        isCreator,
        isCollaborator,
        hasAccess: isCreator || isCollaborator
      };
    },
    enabled: !!projectId && !!userId,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  return {
    isCreator: data?.isCreator ?? false,
    isCollaborator: data?.isCollaborator ?? false,
    hasAccess: data?.hasAccess ?? false,
    isLoading
  };
}
