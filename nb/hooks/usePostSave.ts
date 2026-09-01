import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Post } from "@/components/explorer/types";
import { useToast } from "@/components/ui-custom/Toast";

export function usePostSave(post: Post, currentUser: any) {
  const queryClient = useQueryClient();
  const supabase = createSupabaseBrowserClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async () => {
      if (!currentUser) throw new Error("User not authenticated");

      const isSaved = post.user_has_saved;
      
      if (isSaved) {
        const { error } = await supabase
          .from("bookmarks")
          .delete()
          .eq("entity_id", post.id)
          .eq("entity_type", "post")
          .eq("user_id", currentUser.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("bookmarks")
          .insert({
            entity_id: post.id,
            entity_type: "post",
            user_id: currentUser.id,
          });
        // Ignore duplicate key error
        if (error && error.code !== '23505') throw error;
      }
    },
    onMutate: async () => {
      if (!currentUser) return;

      await queryClient.cancelQueries({ queryKey: ["explorer-feed"] });
      await queryClient.cancelQueries({ queryKey: ["post", post.id] });

      const previousPost = post;
      const newIsSaved = !post.user_has_saved;

      // 1. Update the Post object in the Feed Cache
      queryClient.setQueriesData({ queryKey: ["explorer-feed"] }, (oldData: any) => {
        if (!oldData || !oldData.pages) return oldData;
        return {
          ...oldData,
          pages: oldData.pages.map((page: any) => ({
            ...page,
            posts: page.posts.map((p: Post) => {
              if (p.id === post.id) {
                return {
                  ...p,
                  user_has_saved: newIsSaved,
                  saved_count: Math.max(0, (p.saved_count || 0) + (newIsSaved ? 1 : -1)),
                };
              }
              return p;
            }),
          })),
        };
      });

      // 2. Update the Single Post Request Cache (if loaded)
      queryClient.setQueryData(["post", post.id], (oldPost: Post | undefined) => {
        if (!oldPost) return oldPost;
        return {
          ...oldPost,
          user_has_saved: newIsSaved,
          saved_count: Math.max(0, (oldPost.saved_count || 0) + (newIsSaved ? 1 : -1)),
        };
      });

        // 3. Update User Bookmarks Cache
        // This is a Set of IDs, so we add/remove the ID
        const bookmarksKey = ['user-bookmarks', currentUser.id];
        await queryClient.cancelQueries({ queryKey: bookmarksKey });
        
        queryClient.setQueryData(bookmarksKey, (oldSet: Set<string> | undefined) => {
            const newSet = new Set(oldSet || []);
            if (newIsSaved) {
                newSet.add(post.id);
            } else {
                newSet.delete(post.id);
            }
            return newSet;
        });


      return { previousPost };
    },
    onError: (err, _, context) => {
        console.error("Error toggling save:", err);
        showToast("Failed to save post", "error");
        // Revert? simpler to just invalidate
        if (context?.previousPost) {
           queryClient.invalidateQueries({ queryKey: ["explorer-feed"] });
           queryClient.invalidateQueries({ queryKey: ["post", post.id] });
           queryClient.invalidateQueries({ queryKey: ['user-bookmarks', currentUser?.id] });
        }
    },
    onSettled: () => {
      // Ultimately consisteny
    //   queryClient.invalidateQueries({ queryKey: ["explorer-feed"] });
    //   queryClient.invalidateQueries({ queryKey: ["post", post.id] });
      // We generally trust our optimistic update for "Saved" since unique connection is reliable
    },
  });
}
