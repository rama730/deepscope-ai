import { StateCreator } from 'zustand';
import { Post, FeedPostTypeFilter, FeedTimeFilter, SortOption } from '@/components/explorer/types';

export interface ExplorerFilters {
  activeTab: "for-you" | "following" | "projects-following" | "saved";
  postTypeFilter: FeedPostTypeFilter;
  timeFilter: FeedTimeFilter;
  sortBy: SortOption;
  searchQuery: string;
  selectedTag: string;
}

export interface ExplorerSlice {
  posts: Post[];
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  filters: ExplorerFilters;
  
  // Actions
  setPosts: (posts: Post[]) => void;
  prependPost: (post: Post) => void;
  updatePost: (postId: string, updater: (post: Post) => Partial<Post>) => void;
  removePost: (postId: string) => void;
  setLoading: (loading: boolean) => void;
  setLoadingMore: (loadingMore: boolean) => void;
  setHasMore: (hasMore: boolean) => void;
  
  // Filter Actions
  setFilter: <K extends keyof ExplorerFilters>(key: K, value: ExplorerFilters[K]) => void;
  resetFilters: () => void;
}

export const createExplorerSlice: StateCreator<ExplorerSlice> = (set) => ({
  posts: [],
  loading: false,
  loadingMore: false,
  hasMore: true,
  filters: {
    activeTab: "for-you",
    postTypeFilter: "all",
    timeFilter: "all",
    sortBy: "newest",
    searchQuery: "",
    selectedTag: "",
  },

  setPosts: (posts) => set({ posts }),
  
  prependPost: (post) => set((state) => ({ 
    posts: [post, ...state.posts] 
  })),

  updatePost: (postId, updater) => set((state) => ({
    posts: state.posts.map((p) => 
      p.id === postId ? { ...p, ...updater(p) } : p
    )
  })),

  removePost: (postId) => set((state) => ({
    posts: state.posts.filter((p) => p.id !== postId)
  })),

  setLoading: (loading) => set({ loading }),
  setLoadingMore: (loadingMore) => set({ loadingMore }),
  setHasMore: (hasMore) => set({ hasMore }),

  setFilter: (key, value) => set((state) => ({
    filters: { ...state.filters, [key]: value }
  })),

  resetFilters: () => set({
    filters: {
      activeTab: "for-you",
      postTypeFilter: "all",
      timeFilter: "all",
      sortBy: "newest",
      searchQuery: "",
      selectedTag: "",
    }
  }),
});
