"use client";

import { useMemo } from "react";
import { ContextPill } from "@/components/explorer/SmartPostEnhancements";

interface PostContextPillProps {
  postId: string;
  isReply: boolean;
  threadContext?: string;
}

export function PostContextPill({ postId, isReply, threadContext }: PostContextPillProps) {
  const contextText = useMemo(() => {
    if (isReply || threadContext) return null;

    // Deterministic "random" based on post ID hash
    // preventing hydration mismatch
    let hash = 0;
    for (let i = 0; i < postId.length; i++) {
      hash = (hash << 5) - hash + postId.charCodeAt(i);
      hash |= 0;
    }
    const seed = Math.abs(hash) % 100;

    // 20% chance to show pill
    if (seed > 20) return null;

    const options = [
      "Based on your likes",
      "Trending in Tech",
      "Followed by @alex",
      "Popular nearby",
    ];

    return options[seed % options.length] || "Suggested for you";
  }, [postId, isReply, threadContext]);

  if (!contextText) return null;

  return (
    <div className="absolute top-0 right-5 -mt-3 z-10" onClick={(e) => e.stopPropagation()}>
      <ContextPill text={contextText} />
    </div>
  );
}
