import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { projectKeys } from "@/lib/queryKeys";

export function useToggleProjectBookmark() {
  const supabase = createSupabaseBrowserClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ projectId, currentStatus, userId }: { projectId: string; currentStatus: boolean; userId: string }) => {
      if (currentStatus) {
        const { error } = await supabase.from("bookmarks").delete().eq("user_id", userId).eq("entity_id", projectId).eq("entity_type", "project");
        if (error) throw error;
      } else {
        const { error } = await supabase.from("bookmarks").insert({ user_id: userId, entity_id: projectId, entity_type: "project" });
        if (error) throw error;
      }
    },
    onMutate: async ({ projectId, currentStatus, userId }) => {
      await queryClient.cancelQueries({ queryKey: ['user-bookmarks', userId] });
      const previousBookmarks = queryClient.getQueryData(['user-bookmarks', userId]);

      queryClient.setQueryData(['user-bookmarks', userId], (old: Set<string> | undefined) => {
        const newSet = new Set(old ? Array.from(old) : []);
        if (currentStatus) {
          newSet.delete(projectId);
        } else {
          newSet.add(projectId);
        }
        return newSet;
      });

      return { previousBookmarks };
    },
    onError: (err, { userId }, context) => {
      if (context?.previousBookmarks) {
        queryClient.setQueryData(['user-bookmarks', userId], context.previousBookmarks);
      }
      toast.error("Failed to update bookmark");
    },
    onSettled: (_data, _error, { userId }) => {
      queryClient.invalidateQueries({ queryKey: ['user-bookmarks', userId] });
    },
  });
}

export function useToggleProjectFollow() {
  const supabase = createSupabaseBrowserClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ projectId, currentStatus, userId }: { projectId: string; currentStatus: boolean; userId: string }) => {
      if (currentStatus) {
        const { error } = await supabase.from("project_followers").delete().eq("user_id", userId).eq("project_id", projectId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("project_followers").insert({ user_id: userId, project_id: projectId });
        if (error) throw error;
      }
    },
    onMutate: async ({ projectId, currentStatus, userId }) => {
      // Cancel relevant queries
      await queryClient.cancelQueries({ queryKey: ['user-followed-projects', userId] });
      await queryClient.cancelQueries({ queryKey: projectKeys.detail(projectId) });

      // Snapshot
      const previousFollowed = queryClient.getQueryData(['user-followed-projects', userId]);
      const previousProject = queryClient.getQueryData(projectKeys.detail(projectId));

      // Optimistic Update: List of followed projects
      queryClient.setQueryData(['user-followed-projects', userId], (old: Set<string> | undefined) => {
        const newSet = new Set(old ? Array.from(old) : []);
        if (currentStatus) {
          newSet.delete(projectId);
        } else {
          newSet.add(projectId);
        }
        return newSet;
      });

      // Optimistic Update: Project follower count (if loaded)
      queryClient.setQueryData(projectKeys.detail(projectId), (old: any) => {
        if (!old) return old;
        // Check if followers_count or similar exists. Based on ProjectCard, it might pass prop `followersCount`. 
        // The project object usually has aggregation or we need to check `project_followers` count.
        // If the backend returns a count property, update it.
        // Assuming simple `followers_count` or we skip if unknown.
        return old; // Skip complex deeper update for now unless we know structure, lists handle their own derived state often
      });

      return { previousFollowed, previousProject };
    },
    onError: (err, { userId, projectId }, context) => {
      if (context?.previousFollowed) {
        queryClient.setQueryData(['user-followed-projects', userId], context.previousFollowed);
      }
      if (context?.previousProject) {
        queryClient.setQueryData(projectKeys.detail(projectId), context.previousProject);
      }
      toast.error("Failed to update follow status");
    },
    onSettled: (_data, _error, { userId, projectId }) => {
      queryClient.invalidateQueries({ queryKey: ['user-followed-projects', userId] });
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) });
    },
  });
}
