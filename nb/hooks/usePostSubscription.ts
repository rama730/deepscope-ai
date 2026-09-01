import { useQueryClient } from "@tanstack/react-query";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useSubscription } from "@/hooks/useSubscription";
import { Post } from "@/components/explorer/types";

interface UsePostSubscriptionOptions {
  feedType: "explorer" | "saved";
  queryKey: any[];
  onEngagementUpdate?: (postId: string, type: "like" | "repost" | "comment") => void;
}

/**
 * usePostSubscription - Standardized hook for real-time post updates.
 * Uses RealtimeManager via useSubscription to share channels efficiently.
 */
export function usePostSubscription({
  feedType,
  queryKey,
  onEngagementUpdate,
}: UsePostSubscriptionOptions) {
  const queryClient = useQueryClient();
  const supabase = createSupabaseBrowserClient();
  const enabled = feedType !== "saved";

  // Handle New Posts
  useSubscription<any>({
    table: "posts",
    event: "INSERT",
    filter: "is_reply=eq.false",
    enabled,
    onData: (payload) => {
      const newPostStub = payload.new;
      if (!newPostStub?.id) return;

      // "Fetch One and Prepend" Strategy
      // We fetch the full post with relations to ensure strictly correct data
      supabase
        .from("posts")
        .select(
          `
          *,
          profiles:author_id(username, full_name, avatar_url),
          project:project_id(id, title, status, project_type),
          parent_post:parent_post_id(user_id, profiles:author_id(username, full_name)),
          quoted_post:quoted_post_id(id, content, created_at, user_id, media, profiles:author_id(username, full_name, avatar_url))
        `
        )
        .eq("id", newPostStub.id)
        .single()
        .then(({ data }) => {
          if (data) {
            const mappedUser = Array.isArray(data.profiles) ? data.profiles[0] : data.profiles;

            // Map to existing Post type structure
            const mappedPost: Post = {
              ...data,
              profiles: {
                username: mappedUser?.username,
                full_name: mappedUser?.full_name,
                avatar_url: mappedUser?.avatar_url,
              },
              likes_count: data.likes_count || 0,
              comments_count: data.comments_count || 0,
              reposts_count: data.reposts_count || 0,
              saved_count: data.saved_count || 0,
              views_count: data.views_count || 0,
              is_reply: !!data.parent_post_id,
              user_has_liked: false,
              user_has_saved: false,
            } as any;

            queryClient.setQueryData(queryKey, (old: any) => {
              if (!old || !old.pages) return old;

              // Check if post already exists (prevent duplicates from optimistic updates)
              const exists = old.pages.some((page: Post[]) =>
                page.some((p) => p.id === mappedPost.id)
              );
              if (exists) return old;

              // Prepend to first page
              const newPages = [...old.pages];
              if (newPages.length > 0) {
                newPages[0] = [mappedPost, ...newPages[0]];
              } else {
                newPages[0] = [mappedPost];
              }
              return { ...old, pages: newPages };
            });
          }
        });
    },
  });

  // Handle Post Updates (Edits, Engagement counts for comments)
  useSubscription<any>({
    table: "posts",
    event: "UPDATE",
    enabled,
    onData: (payload) => {
      const newPost = payload.new;
      if (!newPost?.id) return;

      // Update in cache
      queryClient.setQueryData(queryKey, (old: any) => {
        if (!old || !old.pages) return old;
        return {
          ...old,
          pages: old.pages.map((page: Post[]) =>
            page.map((post) => {
              if (post.id === newPost.id) {
                // Check if comment count changed to trigger batch update if needed
                if (
                  newPost.comments_count !== undefined &&
                  newPost.comments_count !== post.comments_count
                ) {
                  onEngagementUpdate?.(newPost.id, "comment");
                }
                return { ...post, ...newPost };
              }
              return post;
            })
          ),
        };
      });
    },
  });

  // Handle Deletes
  useSubscription<any>({
    table: "posts",
    event: "DELETE",
    enabled,
    onData: (payload) => {
      const id = (payload.old as any)?.id;
      if (id) {
        queryClient.setQueryData(queryKey, (old: any) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page: Post[]) => page.filter((p) => p.id !== id)),
          };
        });
      }
    },
  });
}
