"use client";

import { memo, useMemo, useCallback, useRef, useEffect } from "react";
import { Virtuoso } from "react-virtuoso";
import { Post } from "./types";
import ThreadedPostGroup from "./ThreadedPostGroup";
import PostSkeleton from "./PostSkeleton";
import { groupThreads } from "./utils/threadGrouping";
import { perfTracker } from "@/lib/performance/measure";

interface ExplorerFeedProps {
    posts: Post[];
    loading: boolean;
    loadingMore: boolean;
    hasMore: boolean;
    onLoadMore: () => void;
    currentUser: any;
    onMediaClick: (url: string, type: 'image' | 'video', post?: Post) => void;
    onCommentClick: (post: Post) => void;
    onDeleteClick?: (postId: string) => void;
}

const PostSkeletonList = ({ count }: { count: number }) => (
    <div className="space-y-4 p-4">
        {Array.from({ length: count }).map((_, i) => <PostSkeleton key={i} />)}
    </div>
);

const OVERSCAN_OPTIONS = { main: 1000, reverse: 600 };

export const ExplorerFeed = memo(function ExplorerFeed({
    posts,
    loading,
    loadingMore,
    hasMore,
    onLoadMore,
    currentUser,
    onMediaClick,
    onCommentClick,
    onDeleteClick
}: ExplorerFeedProps) {
    // -- All hooks must be at the top and called unconditionally --
    const firstRenderMarkedRef = useRef<boolean>(false);
    const lastLoadTimeRef = useRef<number>(0);

    // Thread grouping is relatively expensive; avoid re-running it for engagement-only updates
    // (likes/reposts/saved/views) which don't affect thread structure.
    // Perf: Efficient memoization key. 
    // Thread structure only changes if posts are added/removed or first post changes.
    // Engagement updates (likes/reposts) skip this because they don't affect thread layout.
    const threadGroupingKey = useMemo(() => {
        if (!posts || posts.length === 0) return "empty";
        const first = posts[0];
        return `${posts.length}-${first?.id || ''}-${first?._timestamp || first?.created_at || ''}`;
    }, [posts]);

    const threadGroups = useMemo(() => {
        if (!posts || posts.length === 0) return [];
        return groupThreads(posts);
    }, [posts, threadGroupingKey]);

    // Perf: end first feed render once we actually have content grouped and ready
    useEffect(() => {
        if (firstRenderMarkedRef.current) return;
        if (loading) return;
        if (!posts || posts.length === 0) return;

        firstRenderMarkedRef.current = true;
        perfTracker.end("explore-feed-first-render", {
            postCount: posts.length,
            groupCount: threadGroups.length,
        });
    }, [loading, posts, threadGroups.length]);

    const handleLoadMore = useCallback(() => {
        const now = Date.now();
        if (now - lastLoadTimeRef.current < 1000) {
            return; // Throttle: only allow one load per second
        }
        lastLoadTimeRef.current = now;
        if (hasMore && !loadingMore) {
            onLoadMore();
        }
    }, [hasMore, loadingMore, onLoadMore]);

    // Memoize callbacks to prevent re-renders
    const handleEndReached = useCallback(() => {
        handleLoadMore();
    }, [handleLoadMore]);

    // Predictive prefetching: fetch when nearing the end of the list
    const handleRangeChanged = useCallback((range: { startIndex: number; endIndex: number }) => {
        if (!hasMore || loadingMore || !threadGroups.length) return;

        // If we are within 5 items of the end, trigger a fetch
        const threshold = 5;
        if (range.endIndex >= threadGroups.length - threshold) {
            handleLoadMore();
        }
    }, [hasMore, loadingMore, threadGroups.length, handleLoadMore]);


    const renderItem = useCallback((index: number, group: any) => {
        return (
            <div className="pb-4 sm:pb-6 px-0 sm:px-4">
                <ThreadedPostGroup
                    key={group.key}
                    rootPost={group.root}
                    replies={group.replies}
                    currentUser={currentUser}
                    onDelete={onDeleteClick}
                    onComment={onCommentClick}
                    onMediaClick={onMediaClick}
                    priority={index < 2}
                />
            </div>
        );
    }, [currentUser, onDeleteClick, onCommentClick, onMediaClick]);

    const renderFooter = useCallback(() => {
        return loadingMore ? <div className="p-4"><PostSkeleton /></div> : <div className="h-20" />;
    }, [loadingMore]);

    // Conditional returns after hooks
    if (loading && posts.length === 0) {
        return <PostSkeletonList count={5} />;
    }

    if (!loading && posts.length === 0) {
        return (
            <div className="py-20 text-center text-zinc-500">
                <p>No posts found.</p>
            </div>
        );
    }

    return (
        <Virtuoso
            useWindowScroll
            overscan={OVERSCAN_OPTIONS}
            data={threadGroups}
            endReached={handleEndReached}
            rangeChanged={handleRangeChanged}
            itemContent={renderItem}
            components={{
                Footer: renderFooter
            }}
        />
    );
});
