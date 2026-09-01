"use client";
// Force rebuild: 2026-01-06 - Removed UserHoverCard

import { memo, useCallback, Suspense, useState, useEffect, useRef } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useExplorerFeed } from "@/hooks/useExplorerFeed";
import { useKeyboardShortcuts } from "@/components/KeyboardShortcuts";
import { useRouter } from "next/navigation";
import { Post } from "./types";
import { RailErrorBoundary } from "../error/RailErrorBoundary";
import { perfTracker } from "@/lib/performance/measure";


// Dynamic imports with code splitting
import dynamic from "next/dynamic";
const PremiumComposer = dynamic(() => import("@/components/explorer/PremiumPostComposer"), {
  loading: () => <div className="h-32 bg-zinc-100 dark:bg-zinc-800 rounded-xl animate-pulse" />,
  ssr: false
});
const ExplorerFeed = dynamic(() => import("@/components/explorer/ExplorerFeed").then(mod => ({ default: mod.ExplorerFeed })), {
  loading: () => <div className="space-y-4 p-4"><div className="h-64 bg-zinc-100 dark:bg-zinc-800 rounded-xl animate-pulse" /></div>
});
const ExplorerHeader = dynamic(() => import("@/components/explorer/ExplorerHeader").then(mod => ({ default: mod.ExplorerHeader })), {
  loading: () => <div className="h-14 bg-zinc-100 dark:bg-zinc-800 rounded-xl animate-pulse" />
});
const MediaLightbox = dynamic(() => import("@/components/explorer/MediaLightbox"), {
  ssr: false
});
const LazyExplorerLeftRail = dynamic(() => import("@/components/ExplorerLeftRail"), {
  loading: () => <div className="h-80 bg-zinc-100 dark:bg-zinc-800 rounded-xl animate-pulse" />,
  ssr: false
});
const LazyTrendingSidebar = dynamic(() => import("@/components/TrendingSidebar"), {
  loading: () => <div className="h-64 bg-zinc-100 dark:bg-zinc-800 rounded-xl animate-pulse" />,
  ssr: false
});
const LazyTrendingProjects = dynamic(() => import("@/components/TrendingProjects"), {
  loading: () => <div className="h-64 bg-zinc-100 dark:bg-zinc-800 rounded-xl animate-pulse" />,
  ssr: false
});
const LazyWhoToFollowWidget = dynamic(() => import("@/components/WhoToFollowWidget"), {
  loading: () => <div className="h-64 bg-zinc-100 dark:bg-zinc-800 rounded-xl animate-pulse" />,
  ssr: false
});

export interface ExplorerClientProps {
  initialUser: any;
  initialPosts: Post[];
  feedType?: "explorer" | "saved";
}
const ExplorerClient = memo(function ExplorerClient(props: ExplorerClientProps) {
  const router = useRouter();
  const readyMarkedRef = useRef(false);
  const [deferRails, setDeferRails] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  // Feed Data & State
  const {
    posts,
    prependPost,
    removePost,
    loading,
    loadingMore,
    hasMore,
    loadPosts,
    activeTab,
    setActiveTab,
    postTypeFilter,
    setPostTypeFilter,
    timeFilter,
    setTimeFilter,
    sortBy,
    setSortBy,
    searchQuery,
    setSearchQuery,
  } = useExplorerFeed(props);

  // Perf: measure page-open + first feed render + readiness
  useEffect(() => {
    perfTracker.start("explore-page-open", {
      initialPosts: props.initialPosts?.length || 0,
      feedType: props.feedType || "explorer",
    });
    perfTracker.start("explore-feed-first-render", {
      initialPosts: props.initialPosts?.length || 0,
      feedType: props.feedType || "explorer",
    });
    perfTracker.start("explore-first-interaction-ready", {
      initialPosts: props.initialPosts?.length || 0,
      feedType: props.feedType || "explorer",
    });
  }, [props.initialPosts?.length, props.feedType]);

  useEffect(() => {
    if (readyMarkedRef.current) return;
    if (loading) return;
    if (!posts || posts.length === 0) return;

    readyMarkedRef.current = true;
    requestAnimationFrame(() => {
      perfTracker.end("explore-first-interaction-ready", { postCount: posts.length });
      perfTracker.end("explore-page-open", { postCount: posts.length });
    });
  }, [loading, posts]);

  // Defer heavy side rails until after first paint/idle
  useEffect(() => {
    let cancelled = false;
    const enable = () => {
      if (cancelled) return;
      setDeferRails(false);
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
      const t = window.setTimeout(enable, 600);
      return () => {
        cancelled = true;
        window.clearTimeout(t);
      };
    }
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Optimistic Update Handler
  const handlePostCreated = useCallback((newPost?: Post) => {
    if (newPost) {
      prependPost(newPost);
      loadPosts(true);
    } else {
      loadPosts(true);
    }
  }, [prependPost, loadPosts]);

  // Lightbox State
  const [lightboxData, setLightboxData] = useState<{ url: string; type: 'image' | 'video' } | null>(null);

  // Handlers
  const handleMediaClick = useCallback((url: string, type: 'image' | 'video', _post?: Post) => {
    setLightboxData({ url, type });
  }, []);

  const handleCommentClick = useCallback((post: Post) => {
    router.push(`/post/${post.id}`);
  }, [router]);

  const handleDeleteClick = useCallback(async (postId: string) => {
    if (!confirm("Are you sure you want to delete this post?")) return;
    removePost(postId);
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.from('posts').delete().eq('id', postId);
    if (error) {
      console.error("Error deleting post:", error);
      alert("Failed to delete post.");
      loadPosts(true);
    }
  }, [removePost, loadPosts]);

  // Keyboard Shortcuts
  useKeyboardShortcuts({
    onNewPost: () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    onSearch: () => { },
  });

  const currentUser = props.initialUser;

  return (
    <div className="min-h-screen bg-zinc-50/50 dark:bg-black">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* Left Rail */}
          <div className="hidden lg:block lg:col-span-3 xl:col-span-3">
            <div className="sticky top-24 space-y-6">
              <RailErrorBoundary fallbackLabel="Navigation unavailable">
                {isMounted && !deferRails && <LazyExplorerLeftRail />}
              </RailErrorBoundary>
            </div>
          </div>

          {/* Middle Column */}
          <div className="lg:col-span-9 xl:col-span-6 min-w-0 border-x border-t border-zinc-200 dark:border-zinc-800/50 bg-white dark:bg-black min-h-screen px-4 sm:px-0 rounded-t-3xl">
            <Suspense fallback={<div className="h-14 bg-zinc-100 dark:bg-zinc-800 rounded-xl animate-pulse" />}>
              <ExplorerHeader
                activeTab={activeTab as any}
                setActiveTab={setActiveTab}
                postTypeFilter={postTypeFilter}
                setPostTypeFilter={setPostTypeFilter}
                timeFilter={timeFilter}
                setTimeFilter={setTimeFilter}
                sortBy={sortBy}
                setSortBy={setSortBy}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
              />
            </Suspense>

            {(activeTab === 'for-you' || activeTab === 'following') && (
              <div className="mb-6 mt-4 px-4">
                <Suspense fallback={<div className="h-32 bg-zinc-100 dark:bg-zinc-800 rounded-xl animate-pulse" />}>
                  <PremiumComposer
                    currentUser={currentUser}
                    onPostCreated={handlePostCreated}
                  />
                </Suspense>
              </div>
            )}

            <Suspense fallback={<div className="space-y-4 p-4"><div className="h-64 bg-zinc-100 dark:bg-zinc-800 rounded-xl animate-pulse" /></div>}>
              <ExplorerFeed
                posts={posts}
                loading={loading}
                loadingMore={loadingMore}
                hasMore={hasMore}
                onLoadMore={() => loadPosts()}
                currentUser={currentUser}
                onMediaClick={handleMediaClick}
                onCommentClick={handleCommentClick}
                onDeleteClick={handleDeleteClick}
              />
            </Suspense>
          </div>

          {/* Right Rail */}
          <div className="hidden xl:block xl:col-span-3">
            <div className="sticky top-24 space-y-6">
              <RailErrorBoundary fallbackLabel="Trending unavailable">
                {isMounted && !deferRails && <LazyTrendingSidebar />}
              </RailErrorBoundary>

              {isMounted && !deferRails && (
                <>
                  <RailErrorBoundary fallbackLabel="Projects unavailable">
                    <LazyTrendingProjects />
                  </RailErrorBoundary>
                  <RailErrorBoundary fallbackLabel="Suggestions unavailable">
                    <LazyWhoToFollowWidget />
                  </RailErrorBoundary>
                </>
              )}
            </div>
          </div>

        </div>
      </div>

      <Suspense fallback={null}>
        <MediaLightbox
          isOpen={!!lightboxData}
          src={lightboxData?.url || null}
          type={lightboxData?.type || 'image'}
          onClose={() => setLightboxData(null)}
        />
      </Suspense>
    </div>
  );
});

export default ExplorerClient;
