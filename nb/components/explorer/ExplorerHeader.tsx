"use client";
import { useCallback, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { explorerKeys } from "@/lib/queryKeys";
import { ExplorerService } from "@/lib/services/explorerService";
import { useExplorerStore } from "@/stores/useExplorerStore";

import { FeedPostTypeFilter, FeedTimeFilter, SortOption } from "./types";
import { X } from "lucide-react";


interface ExplorerHeaderProps {
    activeTab: "for-you" | "following" | "projects-following";
    setActiveTab: (tab: "for-you" | "following" | "projects-following") => void;
    postTypeFilter: FeedPostTypeFilter;
    setPostTypeFilter: (type: FeedPostTypeFilter) => void;
    timeFilter: FeedTimeFilter;
    setTimeFilter: (time: FeedTimeFilter) => void;
    sortBy: SortOption;
    setSortBy: (sort: SortOption) => void;
    searchQuery: string;
    setSearchQuery: (query: string) => void;
}

export function ExplorerHeader({
    activeTab,
    setActiveTab,
    postTypeFilter,
    setPostTypeFilter,
    timeFilter,
    setTimeFilter,
    sortBy,
    setSortBy,
    searchQuery,
    setSearchQuery
}: ExplorerHeaderProps) {
    const queryClient = useQueryClient();
    const supabase = createSupabaseBrowserClient();
    const { filters } = useExplorerStore();
    const prefetchedTabs = useRef<Set<string>>(new Set());

    const handlePrefetchTab = useCallback(async (tab: string) => {
        if (prefetchedTabs.current.has(tab) || activeTab === tab) return;

        const queryKey = explorerKeys.list({
            feedType: "explorer",
            tab: tab,
            postType: postTypeFilter,
            time: timeFilter,
            sortBy: sortBy,
            searchQuery: searchQuery,
            tag: filters.selectedTag,
        });

        try {
            prefetchedTabs.current.add(tab);
            await queryClient.prefetchInfiniteQuery({
                queryKey,
                queryFn: () => ExplorerService.getFeed(supabase, {
                    userId: null, // We don't have user ID here easily, but prefetching for-you/following usually needs it. 
                    // However, we can use the current user if we have it.
                    tab: tab,
                    typeFilter: postTypeFilter,
                    timeFilter: timeFilter,
                    searchQuery: searchQuery || null,
                    tag: filters.selectedTag || null,
                    limit: 20
                }),
                initialPageParam: null,
                staleTime: 60 * 1000,
            });
        } catch (error) {
            console.error("Prefetch error:", error);
            prefetchedTabs.current.delete(tab);
        }
    }, [activeTab, postTypeFilter, timeFilter, sortBy, searchQuery, filters.selectedTag, queryClient, supabase]);

    const handleResetFilters = () => {
        setPostTypeFilter("all");
        setTimeFilter("all");
        setSortBy("newest");
        setSearchQuery("");
    };

    const isFiltered = postTypeFilter !== "all" || timeFilter !== "all" || sortBy !== "newest" || searchQuery;

    return (
        <div className="sticky top-12 z-20 bg-white/95 dark:bg-black/95 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800 rounded-t-3xl">
            <div className="px-4">
                <div className="flex items-center justify-between h-14">
                    {/* Tabs */}
                    <div className="flex items-center -mb-px">
                        {(["for-you", "following", "projects-following"] as const).map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                onPointerEnter={() => handlePrefetchTab(tab)}
                                className={`px-4 h-14 text-sm font-medium transition-all ${activeTab === tab
                                    ? "text-zinc-900 dark:text-white font-semibold"
                                    : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                                    }`}
                            >
                                {tab === "for-you" && "For You"}
                                {tab === "following" && "Following"}
                                {tab === "projects-following" && "Project Updates"}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Removed Idea Button */}
                    </div>
                </div>

                {/* Active Filters Pill Row */}
                {isFiltered && (
                    <div className="flex flex-wrap gap-2 mt-3">
                        {postTypeFilter !== 'all' && (
                            <span className="px-2 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-xs rounded-md font-medium flex items-center gap-1">
                                Type: {postTypeFilter}
                                <button onClick={() => setPostTypeFilter('all')}><X className="w-3 h-3" /></button>
                            </span>
                        )}
                        {/* Add other filter pills similarly if needed */}
                        <button onClick={handleResetFilters} className="text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 underline">
                            Clear all
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
