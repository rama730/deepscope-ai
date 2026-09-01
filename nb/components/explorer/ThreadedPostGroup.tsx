"use client";

import { useState, memo } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import RealtimePost from "./RealtimePost";
import { Post } from "@/components/explorer/types";

interface ThreadedPostGroupProps {
  rootPost: Post;
  replies: Post[];
  currentUser: any;
  onDelete?: (postId: string) => void;
  onComment?: (post: Post) => void;
  onMediaClick?: (url: string, type: 'image' | 'video', post?: Post) => void;
  isFocused?: boolean;
  priority?: boolean;
}

const ThreadedPostGroup = memo(function ThreadedPostGroup({
  rootPost,
  replies,
  currentUser,
  onDelete,
  onComment,
  onMediaClick,
  isFocused = false,
  priority = false,
}: ThreadedPostGroupProps) {
  // Logic: 
  // If rootPost is 'real' (in the feed), we render it + replies.
  // If rootPost is 'virtual' (passed as context for a reply), we render it + replies.
  // The 'threadContext' prop in RealtimePost handles the visual connection lines.



  // We only collapse if there are MANY replies. 
  // For the standard "Parent + Reply" case (length=2), no collapse needed.
  const [isExpanded, setIsExpanded] = useState(replies.length <= 3);

  const visibleReplies = isExpanded ? replies : replies.slice(0, 2);
  const hiddenCount = replies.length - visibleReplies.length;

  return (
    <div className="border-b border-zinc-100 dark:border-zinc-800">
      {/* Root Post */}
      <RealtimePost
        post={rootPost}
        currentUser={currentUser}
        onDelete={onDelete}
        onComment={onComment}
        onMediaClick={onMediaClick}
        isFocused={isFocused}
        // Thread Context: Start of thread only if there are replies
        threadContext={replies.length > 0 ? "start" : undefined}
        priority={priority}
      />

      {/* Replies */}
      {visibleReplies.map((reply, idx) => {
        const isLast = idx === visibleReplies.length - 1 && hiddenCount === 0;
        return (
          <RealtimePost
            key={reply.id}
            post={reply}
            currentUser={currentUser}
            onDelete={onDelete}
            onComment={onComment}
            onMediaClick={onMediaClick}
            // Thread Context: End if last, otherwise Middle
            threadContext={isLast ? "end" : "middle"}
            // Prioritize first reply if group is prioritized
            priority={priority && idx === 0}
          />
        );
      })}

      {/* Expand/Collapse Logic (Preserved) */}
      {!isExpanded && hiddenCount > 0 && (
        <div className="relative pl-[2.25rem]">
          {/* Line continuing down from the last visible reply or root */}
          <div className="absolute left-[2.25rem] top-0 h-4 w-0.5 bg-zinc-200 dark:bg-zinc-800" />

          <button
            onClick={() => setIsExpanded(true)}
            className="ml-8 mt-2 mb-2 flex items-center gap-2 px-3 py-1.5 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
          >
            <ChevronDown className="w-4 h-4" />
            <span>Show {hiddenCount} more {hiddenCount === 1 ? 'reply' : 'replies'}</span>
          </button>
        </div>
      )}

      {isExpanded && replies.length > 3 && (
        <div className="relative pl-[2.25rem]">
          <div className="absolute left-[2.25rem] top-0 h-4 w-0.5 bg-zinc-200 dark:bg-zinc-800" />
          <button
            onClick={() => setIsExpanded(false)}
            className="ml-8 mt-2 mb-2 flex items-center gap-2 px-3 py-1.5 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
          >
            <ChevronUp className="w-4 h-4" />
            <span>Show less</span>
          </button>
        </div>
      )}
    </div>
  );
});

export default ThreadedPostGroup;
