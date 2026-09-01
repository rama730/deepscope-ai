"use client";


import { Heart, MessageCircle, Repeat2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import Image from "next/image";
import { PostContent } from "@/components/explorer/post/PostContent";

interface Post {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  likes_count: number;
  comments_count: number;
  reposts_count: number;
  media_urls?: any;
  profiles: {
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
  };
}

interface EmbedPostClientProps {
  initialPost: Post | null;
}

export default function EmbedPostClient({
  initialPost,
}: EmbedPostClientProps) {
  const post = initialPost;



  if (!post) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-zinc-50 dark:bg-zinc-900">
        <p className="text-zinc-500">Post not found</p>
      </div>
    );
  }

  const originUrl = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 p-4 flex items-center justify-center">
      <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-lg border border-zinc-200 dark:border-zinc-700 max-w-xl w-full">
        {/* Post Content */}
        <div className="p-4">
          <div className="flex items-start gap-3 mb-3">
            <Image
              src={post.profiles.avatar_url || "/default-avatar.png"}
              alt=""
              width={48}
              height={48}
              className="rounded-full"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-zinc-900 dark:text-zinc-50">
                  {post.profiles.full_name}
                </span>
                <span className="text-zinc-500">
                  @{post.profiles.username}
                </span>
              </div>
              <span className="text-sm text-zinc-500">
                {formatDistanceToNow(new Date(post.created_at), {
                  addSuffix: true,
                })}
              </span>
            </div>
          </div>

          <div className="mb-3">
            <PostContent content={post.content} className="mt-0" />
          </div>

          {/* Media */}
          {post.media_urls && Array.isArray(post.media_urls) && post.media_urls.length > 0 && (
            <div className="grid grid-cols-2 gap-2 mb-3">
              {post.media_urls.slice(0, 4).map((url: string, index: number) => (
                <div key={index} className="relative w-full aspect-square">
                  <Image
                    src={url}
                    alt=""
                    fill
                    className="object-cover rounded-lg"
                    sizes="(max-width: 768px) 50vw, 33vw"
                  />
                </div>
              ))}
            </div>
          )}

          {/* Engagement Stats */}
          <div className="flex items-center gap-6 pt-3 border-t border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400">
            <div className="flex items-center gap-2">
              <Heart className="w-5 h-5" />
              <span className="text-sm">{post.likes_count}</span>
            </div>
            <div className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5" />
              <span className="text-sm">{post.comments_count}</span>
            </div>
            <div className="flex items-center gap-2">
              <Repeat2 className="w-5 h-5" />
              <span className="text-sm">{post.reposts_count}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <a
          href={`${originUrl}/post/${post.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="block p-3 bg-zinc-50 dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-700 text-center hover:bg-zinc-100 transition-colors rounded-b-xl"
        >
          <span className="text-sm text-blue-600 font-medium">
            View on Platform →
          </span>
        </a>
      </div>
    </div>
  );
}


