"use client";

import { useState, useEffect } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import Link from "next/link";
import { Hash, TrendingUp, ArrowRight } from "lucide-react";

interface HashtagExplorationProps {
  hashtag: string;
  onClose?: () => void;
}

export default function HashtagExploration({ hashtag, onClose }: HashtagExplorationProps) {
  const supabase = createSupabaseBrowserClient();
  const [trendingTags, setTrendingTags] = useState<{ tag: string; count: number }[]>([]);
  const [relatedTags, setRelatedTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadHashtagData() {
      try {
        // Fetch posts with this hashtag to find related tags
        const { data: posts } = await supabase
          .from("posts")
          .select("content, tags")
          .or(`content.ilike.%#${hashtag}%,tags.cs.{${hashtag}}`)
          .limit(100);

        if (posts) {
          // Extract all hashtags from these posts
          const tagCounts: Record<string, number> = {};
          const hashtagRegex = /#([\w]+)/g;

          posts.forEach((post: any) => {
            // Count from tags array
            if (post.tags && Array.isArray(post.tags)) {
              post.tags.forEach((tag: string) => {
                if (tag !== hashtag) {
                  tagCounts[tag] = (tagCounts[tag] || 0) + 1;
                }
              });
            }

            // Count from content
            const matches = post.content?.match(hashtagRegex);
            if (matches) {
              matches.forEach((match: string) => {
                const tag = match.slice(1);
                if (tag !== hashtag) {
                  tagCounts[tag] = (tagCounts[tag] || 0) + 1;
                }
              });
            }
          });

          // Get related tags (top 5)
          const related = Object.entries(tagCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([tag]) => tag);

          setRelatedTags(related);
        }

        // Fetch trending tags (all tags from recent posts)
        const { data: recentPosts } = await supabase
          .from("posts")
          .select("content, tags, created_at")
          .not("tags", "is", null)
          .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
          .limit(500);

        if (recentPosts) {
          const trendingCounts: Record<string, number> = {};
          const hashtagRegex = /#([\w]+)/g;

          recentPosts.forEach((post: any) => {
            if (post.tags && Array.isArray(post.tags)) {
              post.tags.forEach((tag: string) => {
                trendingCounts[tag] = (trendingCounts[tag] || 0) + 1;
              });
            }

            const matches = post.content?.match(hashtagRegex);
            if (matches) {
              matches.forEach((match: string) => {
                const tag = match.slice(1);
                trendingCounts[tag] = (trendingCounts[tag] || 0) + 1;
              });
            }
          });

          const trending = Object.entries(trendingCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([tag, count]) => ({ tag, count }));

          setTrendingTags(trending);
        }
      } catch (error) {
        console.error("Error loading hashtag data:", error);
      } finally {
        setLoading(false);
      }
    }

    loadHashtagData();
  }, [hashtag, supabase]);

  return (
    <div className="p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
          <Hash className="w-5 h-5 text-blue-500" />
          #{hashtag}
        </h3>
        {onClose && (
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-600 dark:text-zinc-400 dark:hover:text-zinc-400"
          >
            ×
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-4">
          <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
          <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse w-3/4" />
        </div>
      ) : (
        <div className="space-y-6">
          {relatedTags.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Related Tags
              </h4>
              <div className="flex flex-wrap gap-2">
                {relatedTags.map((tag) => (
                  <Link
                    key={tag}
                    href={`/explorer?tag=${encodeURIComponent(tag)}`}
                    className="px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-sm transition-colors"
                  >
                    #{tag}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {trendingTags.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Trending Now
              </h4>
              <div className="space-y-2">
                {trendingTags.slice(0, 5).map(({ tag, count }) => (
                  <Link
                    key={tag}
                    href={`/explorer?tag=${encodeURIComponent(tag)}`}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800 transition-colors group"
                  >
                    <span className="text-sm text-zinc-900 dark:text-zinc-100 group-hover:text-blue-500">
                      #{tag}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-zinc-500">{count} posts</span>
                      <ArrowRight className="w-3 h-3 text-zinc-400 group-hover:text-blue-500" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
