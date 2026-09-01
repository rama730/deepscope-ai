"use client";


import Image from "next/image";
import { Post } from "@/components/explorer/types";
import { AvatarWithFallback } from "@/components/ui-custom";

interface PostQuoteProps {
  post: Post;
}

export function PostQuote({ post }: PostQuoteProps) {
  if (!post.is_quote || !post.quoted_post) return null;

  const { quoted_post } = post;

  return (
    <div className="mt-3 px-4 py-3 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors cursor-pointer group/quote">
      <div className="flex items-center gap-2 mb-2">
        <AvatarWithFallback
          src={quoted_post.profiles?.avatar_url || undefined}
          name={quoted_post.profiles?.username || "User"}
          size="xs"
        />
        <span className="font-bold text-sm text-zinc-900 dark:text-zinc-100 group-hover/quote:underline">
          {quoted_post.profiles?.full_name || quoted_post.profiles?.username || "User"}
        </span>
        <span className="text-xs text-zinc-400">@{quoted_post.profiles?.username}</span>
        <span className="text-xs text-zinc-300">·</span>
      </div>

      <p className="text-sm text-zinc-700 dark:text-zinc-300 line-clamp-3 leading-relaxed">
        {quoted_post.content}
      </p>

      {quoted_post.media &&
        quoted_post.media.type === "image" &&
        Array.isArray(quoted_post.media.urls) &&
        quoted_post.media.urls.length > 0 && (
          <div className="mt-3 rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-800">
            <Image
              src={quoted_post.media.urls[0]}
              alt="Quoted post media"
              width={500}
              height={300}
              sizes="(max-width: 768px) 100vw, 500px"
              className="w-full h-40 object-cover"
            />
          </div>
        )}
    </div>
  );
}
