"use client";

import { useMemo } from "react";
import { BarChart2, TrendingUp, Eye, Heart, MessageSquare, Repeat, Bookmark } from "lucide-react";

interface FeedAnalyticsProps {
  posts: any[];
  onClose: () => void;
}

export default function FeedAnalytics({ posts, onClose }: FeedAnalyticsProps) {
  const stats = useMemo(() => {
    if (!posts || posts.length === 0) {
      return {
        totalPosts: 0,
        totalLikes: 0,
        totalComments: 0,
        totalReposts: 0,
        totalSaved: 0,
        totalViews: 0,
        avgEngagement: 0,
        topPostType: null as string | null,
        postsPerDay: {} as Record<string, number>,
      };
    }

    const totalLikes = posts.reduce((sum, p) => sum + (p.likes_count || 0), 0);
    const totalComments = posts.reduce((sum, p) => sum + (p.comments_count || 0), 0);
    const totalReposts = posts.reduce((sum, p) => sum + (p.reposts_count || 0), 0);
    const totalSaved = posts.reduce((sum, p) => sum + (p.saved_count || p.bookmarks_count || 0), 0);
    const totalViews = posts.reduce((sum, p) => sum + (p.views_count || 0), 0);
    const totalEngagement = totalLikes + totalComments + totalReposts + totalSaved;
    const avgEngagement = posts.length > 0 ? totalEngagement / posts.length : 0;

    // Count posts by type
    const typeCounts: Record<string, number> = {};
    posts.forEach((p) => {
      const type = p.post_type || 'standard';
      typeCounts[type] = (typeCounts[type] || 0) + 1;
    });
    const topPostType = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

    // Posts per day
    const postsPerDay: Record<string, number> = {};
    posts.forEach((p) => {
      const date = new Date(p.created_at).toLocaleDateString();
      postsPerDay[date] = (postsPerDay[date] || 0) + 1;
    });

    return {
      totalPosts: posts.length,
      totalLikes,
      totalComments,
      totalReposts,
      totalSaved,
      totalViews,
      avgEngagement: Math.round(avgEngagement * 10) / 10,
      topPostType,
      postsPerDay,
    };
  }, [posts]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
          <BarChart2 className="w-5 h-5 text-blue-500" />
          Feed Analytics
        </h3>
        <button
          onClick={onClose}
          className="text-zinc-400 hover:text-zinc-600 dark:text-zinc-400 dark:hover:text-zinc-400"
        >
          ×
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700">
          <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400 mb-1">
            <Eye className="w-4 h-4" />
            <span className="text-xs">Views</span>
          </div>
          <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{stats.totalViews.toLocaleString()}</p>
        </div>

        <div className="p-4 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700">
          <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400 mb-1">
            <Heart className="w-4 h-4" />
            <span className="text-xs">Likes</span>
          </div>
          <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{stats.totalLikes.toLocaleString()}</p>
        </div>

        <div className="p-4 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700">
          <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400 mb-1">
            <MessageSquare className="w-4 h-4" />
            <span className="text-xs">Comments</span>
          </div>
          <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{stats.totalComments.toLocaleString()}</p>
        </div>

        <div className="p-4 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700">
          <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400 mb-1">
            <TrendingUp className="w-4 h-4" />
            <span className="text-xs">Avg Engagement</span>
          </div>
          <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{stats.avgEngagement}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700">
          <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400 mb-1">
            <Repeat className="w-4 h-4" />
            <span className="text-xs">Reposts</span>
          </div>
          <p className="text-xl font-bold text-zinc-900 dark:text-zinc-100">{stats.totalReposts.toLocaleString()}</p>
        </div>

        <div className="p-4 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700">
          <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400 mb-1">
            <Bookmark className="w-4 h-4" />
            <span className="text-xs">Saved</span>
          </div>
          <p className="text-xl font-bold text-zinc-900 dark:text-zinc-100">{stats.totalSaved.toLocaleString()}</p>
        </div>
      </div>

      {stats.topPostType && (
        <div className="p-4 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700">
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">Most Common Post Type</p>
          <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 capitalize">
            {stats.topPostType.replace('_', ' ')}
          </p>
        </div>
      )}
    </div>
  );
}
