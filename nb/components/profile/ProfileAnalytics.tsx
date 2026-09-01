"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import Image from "next/image";

interface ProfileAnalyticsProps {
  userId: string;
}

interface ProfileViewer {
  id: string;
  viewer_id: string;
  viewed_at: string;
  profiles: {
    full_name: string;
    username: string;
    avatar_url: string;
  };
}

export default function ProfileAnalytics({ userId }: ProfileAnalyticsProps) {
  const supabase = createSupabaseBrowserClient();
  const [stats, setStats] = useState<any>(null);
  const [recentViewers, setRecentViewers] = useState<ProfileViewer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, [userId]);

  async function loadAnalytics() {
    try {
      // Get profile statistics
      const { data: statsData } = await supabase
        .from("profile_statistics")
        .select("*")
        .eq("id", userId)
        .single();

      setStats(statsData);

      // Get recent profile viewers
      const { data: viewersData } = await supabase
        .from("profile_views")
        .select(`
          id,
          viewer_id,
          viewed_at,
          profiles:viewer_id (
            full_name,
            username,
            avatar_url
          )
        `)
        .eq("profile_id", userId)
        .order("viewed_at", { ascending: false })
        .limit(10);

      const formattedViewers = (viewersData || []).map((v: any) => ({
        ...v,
        profiles: Array.isArray(v.profiles) ? v.profiles[0] : v.profiles
      }));

      setRecentViewers(formattedViewers);
    } catch (error) {
      console.error("Error loading analytics:", error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-xl bg-white dark:bg-zinc-900 border p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-1/4" />
          <div className="h-20 bg-zinc-200 dark:bg-zinc-800 rounded" />
        </div>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-6">
      {/* Profile Strength */}
      <div className="rounded-xl bg-white dark:bg-zinc-900 border p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          Profile Strength
        </h2>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold text-blue-600">{stats.profile_strength}%</span>
            <span className="text-sm text-zinc-600 dark:text-zinc-400">
              {stats.profile_strength < 50 ? "Beginner" : stats.profile_strength < 80 ? "Intermediate" : "All-Star"}
            </span>
          </div>

          <div className="w-full bg-zinc-200 dark:bg-zinc-800 rounded-full h-2.5">
            <div
              className="bg-blue-600 h-2.5 rounded-full transition-all duration-500"
              style={{ width: `${stats.profile_strength}%` }}
            />
          </div>

          {stats.profile_strength < 100 && (
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-sm text-blue-900 dark:text-blue-200 font-medium">
                💡 Complete your profile to attract more opportunities!
              </p>
              <ul className="mt-2 text-xs text-blue-800 dark:text-blue-300 space-y-1">
                {!stats.skills_count && <li>• Add your skills</li>}
                {!stats.projects_count && <li>• Share your projects</li>}
                {stats.connections_count < 5 && <li>• Build your network</li>}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Profile Views */}
      <div className="rounded-xl bg-white dark:bg-zinc-900 border p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          Profile Views
        </h2>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-zinc-900 dark:text-white">{stats.total_views}</div>
            <div className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">All Time</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-zinc-900 dark:text-white">{stats.views_last_30_days}</div>
            <div className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">Last 30 Days</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-zinc-900 dark:text-white">{stats.views_last_7_days}</div>
            <div className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">Last 7 Days</div>
          </div>
        </div>

        {recentViewers.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold mb-3">Recent Viewers</h3>
            <div className="space-y-2">
              {recentViewers.slice(0, 5).map((viewer) => (
                <div key={viewer.id} className="flex items-center gap-3 p-2 hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800 rounded-lg transition-colors">
                  {viewer.profiles?.avatar_url ? (
                    <Image
                      src={viewer.profiles.avatar_url}
                      alt={viewer.profiles.full_name || viewer.profiles.username}
                      width={40}
                      height={40}
                      className="rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold text-sm">
                      {viewer.profiles?.full_name?.[0] || viewer.profiles?.username?.[0] || "?"}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {viewer.profiles?.full_name || viewer.profiles?.username || "Unknown User"}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {new Date(viewer.viewed_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Network Stats */}
      <div className="rounded-xl bg-white dark:bg-zinc-900 border p-6">
        <h2 className="text-xl font-semibold mb-4">Network Activity</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
            <span className="text-sm text-zinc-700 dark:text-zinc-300">Followers</span>
            <span className="font-semibold">{stats.followers_count}</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
            <span className="text-sm text-zinc-700 dark:text-zinc-300">Following</span>
            <span className="font-semibold">{stats.following_count}</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
            <span className="text-sm text-zinc-700 dark:text-zinc-300">Connections</span>
            <span className="font-semibold">{stats.connections_count}</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
            <span className="text-sm text-zinc-700 dark:text-zinc-300">Posts</span>
            <span className="font-semibold">{stats.posts_count}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

























