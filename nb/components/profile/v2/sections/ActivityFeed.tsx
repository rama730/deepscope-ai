"use client";

import { useState, useMemo } from "react";
import RealtimePost from "@/components/explorer/RealtimePost";
import { SectionCard } from "../SectionCard";
import { Virtuoso } from "react-virtuoso";
import { cn } from "@/lib/utils";

type FilterType = "all" | "media";

export function ActivityFeed({
  posts,
  currentUser,
  interactive,
  onDeletePost,
}: {
  posts: any[];
  currentUser: any | null;
  interactive: boolean;
  onDeletePost: (postId: string) => void;
}) {
  const [filter, setFilter] = useState<FilterType>("all");

  const filteredPosts = useMemo(() => {
    if (filter === "all") return posts;
    if (filter === "media") return posts.filter((p) => p.image_url || p.video_url);
    return posts;
  }, [posts, filter]);

  return (
    <SectionCard
      title="Activity"
      description="Recent posts and updates."
      action={
        <div className="flex bg-zinc-100 dark:bg-zinc-800 rounded-lg p-1">
          <button
            onClick={() => setFilter("all")}
            className={cn(
              "px-3 py-1 text-xs font-medium rounded-md transition-all",
              filter === "all"
                ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm"
                : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
            )}
          >
            All Posts
          </button>
          <button
            onClick={() => setFilter("media")}
            className={cn(
              "px-3 py-1 text-xs font-medium rounded-md transition-all",
              filter === "media"
                ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm"
                : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
            )}
          >
            Media Only
          </button>
        </div>
      }
    >
      {filteredPosts.length ? (
        <Virtuoso
          useWindowScroll
          data={filteredPosts}
          itemContent={(_index, post) => (
            <div key={post.id} className="pb-4">
              <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
                {interactive ? (
                  <RealtimePost post={post} currentUser={currentUser} onDelete={() => onDeletePost(post.id)} />
                ) : (
                  <div className="p-4">
                    <p className="text-sm whitespace-pre-wrap text-zinc-800 dark:text-zinc-200">{post.content}</p>
                    <div className="flex items-center gap-4 mt-3 text-xs text-zinc-500 dark:text-zinc-400">
                      <span>{new Date(post.created_at).toLocaleDateString("en-US")}</span>
                      {post.likes_count > 0 ? <span>❤️ {post.likes_count}</span> : null}
                      {post.comments_count > 0 ? <span>💬 {post.comments_count}</span> : null}
                      {post.reposts_count > 0 ? <span>🔄 {post.reposts_count}</span> : null}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        />
      ) : (
        <div className="text-center py-12 text-sm text-zinc-500 dark:text-zinc-400">
          No posts to show.
        </div>
      )}
    </SectionCard>
  );
}


