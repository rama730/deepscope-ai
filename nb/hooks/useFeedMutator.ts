
import { useQueryClient } from "@tanstack/react-query";
import { Post } from "@/components/explorer/types";
import { useCallback } from "react";

export function useFeedMutator(queryKey: any[]) {
  const queryClient = useQueryClient();

  const prependPost = useCallback((newPost: Post) => {
    queryClient.setQueryData(queryKey, (old: any) => {
      if (!old || !old.pages) {
         return {
            pages: [[newPost]],
            pageParams: [null]
         };
      }

      // Deduplication check
      const exists = old.pages.some((page: Post[]) => page.some(p => p.id === newPost.id));
      if (exists) return old;

      const newPages = [...old.pages];
      if (newPages.length > 0) {
        newPages[0] = [newPost, ...newPages[0]];
      } else {
        newPages[0] = [newPost];
      }
      
      return {
        ...old,
        pages: newPages
      };
    });
  }, [queryClient, queryKey]);

  const updatePost = useCallback((postId: string, updates: Partial<Post> | ((post: Post) => Partial<Post>)) => {
    queryClient.setQueryData(queryKey, (old: any) => {
      if (!old || !old.pages) return old;

      return {
        ...old,
        pages: old.pages.map((page: Post[]) =>
          page.map((post: Post) => {
            if (post.id === postId) {
              const newValues = typeof updates === 'function' ? updates(post) : updates;
              return { ...post, ...newValues };
            }
            return post;
          })
        ),
      };
    });
  }, [queryClient, queryKey]);

  const removePost = useCallback((postId: string) => {
    queryClient.setQueryData(queryKey, (old: any) => {
      if (!old || !old.pages) return old;

      return {
        ...old,
        pages: old.pages.map((page: Post[]) => 
            page.filter((post: Post) => post.id !== postId)
        ),
      };
    });
  }, [queryClient, queryKey]);

  const resetFeed = useCallback((initialPosts: Post[]) => {
      queryClient.setQueryData(queryKey, {
          pages: [initialPosts],
          pageParams: [null]
      });
  }, [queryClient, queryKey]);

  return {
    prependPost,
    updatePost,
    removePost,
    resetFeed
  };
}
