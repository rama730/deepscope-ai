import { useQuery } from "@tanstack/react-query";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function useUserBookmarks(userId: string | undefined) {
  const supabase = createSupabaseBrowserClient();

  return useQuery({
    queryKey: ['user-bookmarks', userId],
    queryFn: async () => {
        if (!userId) return new Set<string>();
        
        const { data, error } = await supabase
            .from('bookmarks')
            .select('entity_id')
            .eq('user_id', userId)
            .eq('entity_type', 'project');

        if (error) throw error;
        
        // Return as Set for O(1) lookup
        return new Set((data || []).map(d => d.entity_id));
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false, 
  });
}

export function useUserFollowedProjects(userId: string | undefined) {
    const supabase = createSupabaseBrowserClient();
  
    return useQuery({
      queryKey: ['user-followed-projects', userId],
      queryFn: async () => {
          if (!userId) return new Set<string>();
          
          const { data, error } = await supabase
              .from('project_followers')
              .select('project_id')
              .eq('user_id', userId);
  
          if (error) throw error;
          
          return new Set((data || []).map(d => d.project_id));
      },
      enabled: !!userId,
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false, 
    });
  }
