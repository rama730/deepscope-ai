"use client";

import { useMemo } from "react";
import RealtimePost from "@/components/explorer/RealtimePost";
import { Post } from "@/components/explorer/types";

export default function ThreadedComment({
  post,
  currentUser,
  depth,
  repliesByParentId,
  collapsedIds,
  onToggleCollapse,
  onReply,
  onMediaClick,
}: {
  post: Post;
  currentUser: any;
  depth: number;
  repliesByParentId: Map<string, Post[]>;
  collapsedIds: Set<string>;
  onToggleCollapse: (postId: string) => void;
  onReply: (post: Post) => void;
  onMediaClick: (url: string, type: "image" | "video", post: Post) => void;
}) {
  const children = useMemo(() => repliesByParentId.get(post.id) || [], [repliesByParentId, post.id]);
  const hasChildren = children.length > 0;
  const isCollapsed = collapsedIds.has(post.id);

  return (
    <div className="px-3 sm:px-4 py-2">
      <div className="flex items-start gap-2">
        {/* Indent / thread line */}
        {depth > 0 && (
          <div className="w-4 flex-shrink-0 flex justify-center">
            <div className="w-[2px] bg-zinc-200 dark:bg-zinc-800 rounded-full h-full" />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            {hasChildren ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleCollapse(post.id);
                }}
                className="text-[11px] text-zinc-500 hover:text-zinc-700 dark:text-zinc-300 dark:hover:text-zinc-200 transition-colors"
              >
                {isCollapsed ? `Show replies (${children.length})` : `Hide replies (${children.length})`}
              </button>
            ) : (
              <div />
            )}

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onReply(post);
                // focus the composer
                document.getElementById("reply-input")?.focus();
              }}
              className="text-[11px] px-2 py-1 rounded-full border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800/50 transition-colors text-zinc-600 dark:text-zinc-300"
            >
              Reply
            </button>
          </div>

          <RealtimePost
            post={post}
            currentUser={currentUser}
            onDelete={() => { }}
            isReplyInThread={true}
            onComment={(p) => onReply(p)}
            onMediaClick={(url, type, p) => onMediaClick(url, type, p || post)}
          />

          {!isCollapsed && hasChildren && (
            <div className="mt-2 pl-3 border-l border-zinc-200 dark:border-zinc-800">
              {children.map((child) => (
                <ThreadedComment
                  key={child.id}
                  post={child}
                  currentUser={currentUser}
                  depth={depth + 1}
                  repliesByParentId={repliesByParentId}
                  collapsedIds={collapsedIds}
                  onToggleCollapse={onToggleCollapse}
                  onReply={onReply}
                  onMediaClick={onMediaClick}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


