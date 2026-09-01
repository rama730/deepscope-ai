import { useState, useCallback, useEffect, useMemo } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Post, FeedPostTypeFilter, FeedTimeFilter, SortOption } from "@/components/explorer/types";
import { User } from "@/types/hub";
import { explorerKeys } from "@/lib/queryKeys";
import { useInfiniteQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { useDebounce } from "@/hooks/useDebounce";
import { usePostSubscription } from "@/hooks/usePostSubscription";
import { useSubscription } from "@/hooks/useSubscription";
import { useExplorerStore } from "@/stores/useExplorerStore";
import { getErrorMessage } from "@/lib/utils/api-error";
import { ExplorerService } from "@/lib/services/explorerService";

export type { Post, FeedPostTypeFilter, FeedTimeFilter, SortOption };

export interface ExplorerFeedProps {
  initialPosts?: Post[];
  initialUser?: User | null;
  feedType?: "explorer" | "saved";
}

/**
 * Hook for managing the explorer feed with infinite loading and realtime updates.
 * Leverages useExplorerStore for centralized state management.
 */
export function useExplorerFeed({
  initialPosts,
  initialUser,
  feedType = "explorer",
}: ExplorerFeedProps) {
  const supabase = createSupabaseBrowserClient();
  const queryClient = useQueryClient();
  const [engagementRealtimeEnabled, setEngagementRealtimeEnabled] = useState(false);

  // Zustand Store
  const { 
    posts: storePosts, 
    setPosts, 
    prependPost: storePrependPost,
    updatePost: storeUpdatePost, 
    removePost: storeRemovePost,
    filters, 
    setFilter,
    setLoading,
    setLoadingMore,
    setHasMore 
  } = useExplorerStore();

  const { activeTab, postTypeFilter, timeFilter, sortBy, searchQuery, selectedTag } = filters;

  // Debounce search query to avoid excessive API calls
  const debouncedSearchQuery = useDebounce(searchQuery, 500);

  const currentUser = initialUser;

  // Realtime staging logic
  useEffect(() => {
    if (feedType === "saved") {
      setEngagementRealtimeEnabled(false);
      return;
    }

    let cancelled = false;
    const enable = () => {
      if (cancelled) return;
      setEngagementRealtimeEnabled(true);
    };

    if (typeof window !== "undefined") {
      const w = window as any;
      if (typeof w.requestIdleCallback === "function") {
        const id = w.requestIdleCallback(enable, { timeout: 1500 });
        return () => {
          cancelled = true;
          if (typeof w.cancelIdleCallback === "function") w.cancelIdleCallback(id);
        };
      }
      const t = setTimeout(enable, 600);
      return () => {
        cancelled = true;
        clearTimeout(t);
      };
    }

    return () => { cancelled = true; };
  }, [feedType]);

  // --- QUERY FUNCTION ---
  const fetchPosts = async ({ pageParam = null }: { pageParam?: string | null }) => {
    const effectiveTab = feedType === "saved" ? "saved" : activeTab;

    return ExplorerService.getFeed(supabase, {
      userId: currentUser?.id || null,
      tab: effectiveTab,
      typeFilter: postTypeFilter,
      timeFilter: timeFilter,
      searchQuery: debouncedSearchQuery || null,
      tag: selectedTag || null,
      cursor: pageParam,
      limit: 20
    }) as Promise<Post[]>;
  };

  // --- QUERY KEY ---
  const queryKey = useMemo(() => explorerKeys.list({
    feedType,
    tab: activeTab,
    postType: postTypeFilter,
    time: timeFilter,
    sortBy,
    searchQuery: debouncedSearchQuery,
    tag: selectedTag,
  }), [feedType, activeTab, postTypeFilter, timeFilter, sortBy, debouncedSearchQuery, selectedTag]);

  // --- USE INFINITE QUERY ---
  const { data, error, fetchNextPage, hasNextPage, isFetching, isFetchingNextPage, isPending } =
    useInfiniteQuery({
      queryKey,
      queryFn: fetchPosts,
      initialPageParam: null,
      getNextPageParam: (lastPage: Post[]) => {
        if (!lastPage || lastPage.length < 20) return null;
        const lastPost = lastPage[lastPage.length - 1];
        return lastPost ? lastPost.created_at : null;
      },
      initialData: initialPosts 
        ? { pages: [initialPosts.map(p => p._timestamp ? p : ExplorerService.transformPost(p))], pageParams: [null] } 
        : undefined,
      initialDataUpdatedAt: initialPosts ? Date.now() : undefined,
      placeholderData: keepPreviousData,
      staleTime: 30 * 1000, 
    });

  // Sync React Query data to Zustand store
  useEffect(() => {
    if (data?.pages) {
      const flatPosts = data.pages.flatMap((page) => page);
      setPosts(flatPosts);
    }
  }, [data, setPosts]);

  // Sync loading states to store
  useEffect(() => {
    setLoading(isPending);
    setLoadingMore(isFetchingNextPage);
    setHasMore(hasNextPage);
  }, [isPending, isFetchingNextPage, hasNextPage, setLoading, setLoadingMore, setHasMore]);

  // Manual Reload Wrapper
  const loadPosts = useCallback(
    (reset?: boolean) => {
      if (reset) {
        queryClient.invalidateQueries({ queryKey });
      } else {
        fetchNextPage();
      }
    },
    [queryClient, queryKey, fetchNextPage]
  );

  // Subscribe to Posts (Inserts, Updates, Deletes)
  usePostSubscription({
    feedType,
    queryKey: queryKey as unknown as any[],
    onEngagementUpdate: () => {},
  });

  // Subscribe to Post Likes & Reposts
  useSubscription<any>({
    table: "post_likes",
    event: "*",
    enabled: feedType !== "saved" && engagementRealtimeEnabled,
    onData: (payload) => {
      const { eventType, new: newRecord, old: oldRecord } = payload;
      const postId = (eventType === 'INSERT' ? newRecord?.post_id : oldRecord?.post_id);
      
      if (!postId) return;

      if (eventType === 'INSERT') {
          storeUpdatePost(postId, (p) => ({ 
              likes_count: (p.likes_count || 0) + 1,
              user_has_liked: newRecord.user_id === currentUser?.id ? true : p.user_has_liked 
          }));
      } else if (eventType === 'DELETE') {
          storeUpdatePost(postId, (p) => ({ 
              likes_count: Math.max(0, (p.likes_count || 0) - 1),
              user_has_liked: oldRecord.user_id === currentUser?.id ? false : p.user_has_liked 
          }));
      }
    },
  });

  useSubscription<any>({
    table: "post_reposts",
    event: "*",
    enabled: feedType !== "saved" && engagementRealtimeEnabled,
    onData: (payload) => {
       const { eventType, new: newRecord, old: oldRecord } = payload;
       if (eventType === 'INSERT' && newRecord?.post_id) {
           storeUpdatePost(newRecord.post_id, (p) => ({ reposts_count: (p.reposts_count || 0) + 1 }));
       } else if (eventType === 'DELETE' && oldRecord?.post_id) {
           storeUpdatePost(oldRecord.post_id, (p) => ({ reposts_count: Math.max(0, (p.reposts_count || 0) - 1) }));
       }
    },
  });

  return {
    posts: storePosts, // Return from store as source of truth
    prependPost: storePrependPost,
    updatePost: storeUpdatePost,
    removePost: storeRemovePost,
    setPosts,
    loading: isPending,
    loadingMore: isFetchingNextPage,
    hasMore: hasNextPage,
    error: error ? getErrorMessage(error) : null,
    loadPosts,
    // Filter exposures
    activeTab,
    setActiveTab: (tab: any) => setFilter('activeTab', tab),
    postTypeFilter,
    setPostTypeFilter: (filter: any) => setFilter('postTypeFilter', filter),
    timeFilter,
    setTimeFilter: (filter: any) => setFilter('timeFilter', filter),
    sortBy,
    setSortBy: (option: any) => setFilter('sortBy', option),
    searchQuery,
    setSearchQuery: (query: string) => setFilter('searchQuery', query),
    selectedTag,
    setSelectedTag: (tag: string) => setFilter('selectedTag', tag),
    filterCounts: { postTypes: {}, timeRanges: {} },
    filteringLoading: isFetching && !isFetchingNextPage,
  };
}
