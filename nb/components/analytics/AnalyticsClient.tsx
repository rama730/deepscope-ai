"use client";

import { useEffect, useState, useRef } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import Link from "next/link";

interface PostAnalytics {
  id: string;
  content: string;
  created_at: string;
  views_count: number;
  likes_count: number;
  reposts_count: number;
  comments_count: number;
  bookmarks_count: number;
}

interface ProfileStats {
  total_followers: number;
  total_connections: number;
  profile_views: number;
  post_impressions: number;
}

interface AnalyticsClientProps {
  initialPosts: PostAnalytics[];
  initialProfileStats: ProfileStats;
  currentUser: any;
}

export default function AnalyticsClient({
  initialPosts,
  initialProfileStats,
  currentUser
}: AnalyticsClientProps) {
  const supabase = createSupabaseBrowserClient();
  const [posts, setPosts] = useState<PostAnalytics[]>(initialPosts);
  const [profileStats, setProfileStats] = useState<ProfileStats>(initialProfileStats);
  const [loading, setLoading] = useState(false);
  const [timeRange, setTimeRange] = useState<"7days" | "30days" | "all">("30days");
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    loadAnalytics();
  }, [timeRange]);

  async function loadAnalytics() {
    setLoading(true);

    if (!currentUser) {
      setLoading(false);
      return;
    }

    const user = currentUser;

    // Calculate date filter
    let dateFilter: string | null = null;
    if (timeRange === "7days") {
      const date = new Date();
      date.setDate(date.getDate() - 7);
      dateFilter = date.toISOString();
    } else if (timeRange === "30days") {
      const date = new Date();
      date.setDate(date.getDate() - 30);
      dateFilter = date.toISOString();
    }

    // Load posts with analytics
    let postsQuery = supabase
      .from("posts")
      .select("id, content, created_at, views_count, likes_count, reposts_count, comments_count, bookmarks_count")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (dateFilter) {
      postsQuery = postsQuery.gte("created_at", dateFilter);
    }

    const { data: postsData } = await postsQuery;

    // Load profile stats
    const [
      // followers removed for MVP; keep zero
      { count: connectionsCount },
      { data: profileData }
    ] = await Promise.all([
      // removed follows query
      supabase.from("connections").select("*", { count: "exact", head: true }).or(`user_id.eq.${user.id},connected_user_id.eq.${user.id}`).eq("status", "accepted"),
      supabase.from("profiles").select("profile_views").eq("id", user.id).single()
    ]);

    // Calculate total impressions from posts
    const totalImpressions = (postsData || []).reduce((sum, post) => sum + (post.views_count || 0), 0);

    setProfileStats({
      total_followers: 0,
      total_connections: connectionsCount || 0,
      profile_views: profileData?.profile_views || 0,
      post_impressions: totalImpressions,
    });

    setPosts(postsData || []);
    setLoading(false);
  }

  function calculateEngagementRate(post: PostAnalytics): number {
    if (post.views_count === 0) return 0;
    const totalEngagements = post.likes_count + post.comments_count + post.reposts_count + post.bookmarks_count;
    return (totalEngagements / post.views_count) * 100;
  }

  function formatTimestamp(timestamp: string) {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl">
        <div className="p-8 text-center text-zinc-600 dark:text-zinc-400">
          Loading analytics...
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="mx-auto max-w-6xl">
        <div className="rounded-lg border p-8 text-center">
          <p className="text-zinc-600 dark:text-zinc-400">
            Please sign in to view analytics.
          </p>
        </div>
      </div>
    );
  }

  const totalEngagements = posts.reduce((sum, post) =>
    sum + post.likes_count + post.comments_count + post.reposts_count + post.bookmarks_count, 0
  );

  const avgEngagementRate = posts.length > 0
    ? posts.reduce((sum, post) => sum + calculateEngagementRate(post), 0) / posts.length
    : 0;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Analytics</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
            Track your content performance and audience growth
          </p>
        </div>

        {/* Time Range Filter */}
        <div className="flex items-center gap-2 border rounded-lg p-1">
          <button
            onClick={() => setTimeRange("7days")}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${timeRange === "7days"
              ? "bg-blue-500 text-white"
              : "hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800"
              }`}
          >
            7 Days
          </button>
          <button
            onClick={() => setTimeRange("30days")}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${timeRange === "30days"
              ? "bg-blue-500 text-white"
              : "hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800"
              }`}
          >
            30 Days
          </button>
          <button
            onClick={() => setTimeRange("all")}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${timeRange === "all"
              ? "bg-blue-500 text-white"
              : "hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800"
              }`}
          >
            All Time
          </button>
        </div>
      </div>

      {/* Overview Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-lg border p-4 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/20 border-blue-200 dark:border-blue-900">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-zinc-600 dark:text-zinc-400">Profile Views</span>
            <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </div>
          <div className="text-2xl font-bold">{profileStats.profile_views.toLocaleString("en-US")}</div>
        </div>

        <div className="rounded-lg border p-4 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/20 dark:to-purple-900/20 border-purple-200 dark:border-purple-900">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-zinc-600 dark:text-zinc-400">Followers</span>
            <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <div className="text-2xl font-bold">{profileStats.total_followers.toLocaleString("en-US")}</div>
        </div>

        <div className="rounded-lg border p-4 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/20 dark:to-green-900/20 border-green-200 dark:border-green-900">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-zinc-600 dark:text-zinc-400">Connections</span>
            <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <div className="text-2xl font-bold">{profileStats.total_connections.toLocaleString("en-US")}</div>
        </div>

        <div className="rounded-lg border p-4 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/20 dark:to-orange-900/20 border-orange-200 dark:border-orange-900">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-zinc-600 dark:text-zinc-400">Post Impressions</span>
            <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
            </svg>
          </div>
          <div className="text-2xl font-bold">{profileStats.post_impressions.toLocaleString("en-US")}</div>
        </div>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-lg border p-4">
          <div className="text-sm text-zinc-600 dark:text-zinc-400 mb-1">Total Posts</div>
          <div className="text-xl font-semibold">{posts.length}</div>
        </div>

        <div className="rounded-lg border p-4">
          <div className="text-sm text-zinc-600 dark:text-zinc-400 mb-1">Total Engagements</div>
          <div className="text-xl font-semibold">{totalEngagements.toLocaleString("en-US")}</div>
        </div>

        <div className="rounded-lg border p-4">
          <div className="text-sm text-zinc-600 dark:text-zinc-400 mb-1">Avg Engagement Rate</div>
          <div className="text-xl font-semibold">{avgEngagementRate.toFixed(2)}%</div>
        </div>
      </div>

      {/* Post Performance */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Post Performance</h2>

        {posts.length === 0 ? (
          <div className="rounded-lg border p-8 text-center">
            <svg className="w-12 h-12 mx-auto text-zinc-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <p className="text-sm text-zinc-500">No posts in this time range.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {posts.map((post) => (
              <Link
                key={post.id}
                href={`/post/${post.id}`}
                className="block rounded-lg border p-4 hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-900/50 transition-colors"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <p className="text-sm flex-1 line-clamp-2">{post.content}</p>
                    <span className="text-xs text-zinc-500 whitespace-nowrap">
                      {formatTimestamp(post.created_at)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-6 gap-3 text-sm">
                    <div className="text-center p-2 rounded bg-zinc-50 dark:bg-zinc-900">
                      <div className="font-semibold">{post.views_count.toLocaleString("en-US")}</div>
                      <div className="text-xs text-zinc-500">Views</div>
                    </div>
                    <div className="text-center p-2 rounded bg-zinc-50 dark:bg-zinc-900">
                      <div className="font-semibold">{post.likes_count}</div>
                      <div className="text-xs text-zinc-500">Likes</div>
                    </div>
                    <div className="text-center p-2 rounded bg-zinc-50 dark:bg-zinc-900">
                      <div className="font-semibold">{post.comments_count}</div>
                      <div className="text-xs text-zinc-500">Comments</div>
                    </div>
                    <div className="text-center p-2 rounded bg-zinc-50 dark:bg-zinc-900">
                      <div className="font-semibold">{post.reposts_count}</div>
                      <div className="text-xs text-zinc-500">Reposts</div>
                    </div>
                    <div className="text-center p-2 rounded bg-zinc-50 dark:bg-zinc-900">
                      <div className="font-semibold">{post.bookmarks_count}</div>
                      <div className="text-xs text-zinc-500">Bookmarks</div>
                    </div>
                    <div className="text-center p-2 rounded bg-blue-50 dark:bg-blue-900/20">
                      <div className="font-semibold text-blue-600 dark:text-blue-400">
                        {calculateEngagementRate(post).toFixed(1)}%
                      </div>
                      <div className="text-xs text-zinc-500">Engagement</div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
