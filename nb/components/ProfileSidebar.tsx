"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import Link from "next/link";
import Image from "next/image";

interface UserProfile {
  id: string;
  username: string | null;
  full_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  banner_url: string | null;
}

export default function ProfileSidebar() {
  const supabase = createSupabaseBrowserClient();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [followersCount, setFollowersCount] = useState(0);
  const [, setFollowingCount] = useState(0);
  const [bookmarksCount, setBookmarksCount] = useState(0);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      // Get profile data
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profileData) {
        setProfile(profileData);

        // Follows removed for MVP
        setFollowersCount(0);

        setFollowingCount(0);

        // Get bookmarks count
        const { count: bookmarksCount } = await supabase
          .from("bookmarks")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id);

        setBookmarksCount(bookmarksCount || 0);
      }
    }
  }

  function getInitials() {
    const name = profile?.full_name || profile?.username || "U";
    return (name?.[0] || "U").toUpperCase();
  }

  if (!profile) {
    return (
      <aside className="sticky top-4">
        <div className="rounded-2xl border bg-white dark:bg-zinc-900 overflow-hidden animate-pulse">
          <div className="h-16 bg-gradient-to-r from-blue-500 to-purple-500" />
          <div className="px-4 pb-4">
            <div className="relative z-10 h-12 w-12 -mt-6 rounded-full bg-zinc-200 dark:bg-zinc-700 border-4 border-white dark:border-zinc-900" />
            <div className="mt-3 space-y-2">
              <div className="h-4 bg-zinc-200 dark:bg-zinc-700 rounded w-3/4" />
              <div className="h-3 bg-zinc-200 dark:bg-zinc-700 rounded w-1/2" />
            </div>
          </div>
        </div>
      </aside>
    );
  }

  return (
    <aside className="sticky top-4 space-y-4">
      {/* Profile Card */}
      <div className="rounded-2xl border bg-white dark:bg-zinc-900 overflow-hidden">
        {/* Banner */}
        <div className="relative z-0 h-16 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500">
          {profile.banner_url && (
            <Image
              src={profile.banner_url}
              alt="Banner"
              fill
              className="object-cover"
            />
          )}
        </div>

        {/* Profile Info */}
        <div className="px-4 pb-4">
          {/* Avatar */}
          <Link href="/profile" className="block">
            <div className="relative z-10 h-12 w-12 -mt-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold border-4 border-white dark:border-zinc-900 cursor-pointer hover:brightness-110 transition-all">
              {profile.avatar_url ? (
                <Image
                  src={profile.avatar_url}
                  alt={profile.full_name || profile.username || "User"}
                  width={48}
                  height={48}
                  className="rounded-full object-cover"
                />
              ) : (
                getInitials()
              )}
            </div>
          </Link>

          {/* Name & Bio */}
          <Link href="/profile" className="block mt-3 hover:underline">
            <h3 className="font-semibold text-sm">
              {profile.full_name || profile.username || "Anonymous"}
            </h3>
          </Link>

          {profile.bio && (
            <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1 line-clamp-2">
              {profile.bio}
            </p>
          )}

          {/* Stats */}
          <div className="mt-3 pt-3 border-t border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center justify-between text-xs">
              <Link
                href="/profile"
                className="hover:underline hover:text-blue-500 transition-colors"
              >
                <span className="text-zinc-600 dark:text-zinc-400">Connections</span>
              </Link>
              <span className="font-semibold">{followersCount}</span>
            </div>
            <Link
              href="/profile"
              className="text-blue-500 hover:text-blue-600 text-xs font-semibold mt-1 block"
            >
              View your network
            </Link>
          </div>

          {/* Quick Stats */}
          <div className="mt-3 pt-3 border-t border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center justify-between text-xs hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800/50 -mx-4 px-4 py-2 cursor-pointer transition-colors">
              <span className="text-zinc-600 dark:text-zinc-400">Profile views</span>
              <span className="font-semibold text-blue-500">{Math.floor(Math.random() * 500) + 50}</span>
            </div>
            <div className="flex items-center justify-between text-xs hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800/50 -mx-4 px-4 py-2 cursor-pointer transition-colors">
              <span className="text-zinc-600 dark:text-zinc-400">Post impressions</span>
              <span className="font-semibold text-blue-500">{Math.floor(Math.random() * 2000) + 200}</span>
            </div>
          </div>
        </div>

        {/* Premium Promo */}
        <div className="border-t border-zinc-200 dark:border-zinc-800 px-4 py-3 hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800/50 cursor-pointer transition-colors">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-amber-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2L9.19 8.63L2 9.24l5.46 4.73L5.82 21L12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2z" />
            </svg>
            <span className="text-xs font-semibold">Try Premium for free</span>
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="rounded-2xl border bg-white dark:bg-zinc-900 overflow-hidden">
        <Link
          href="/bookmarks"
          className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer border-b border-zinc-200 dark:border-zinc-800 last:border-0"
        >
          <svg className="w-5 h-5 text-zinc-600 dark:text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">Saved items</p>
            {bookmarksCount > 0 && (
              <p className="text-xs text-zinc-500 dark:text-zinc-400">{bookmarksCount} saved</p>
            )}
          </div>
        </Link>

        <Link
          href="/people"
          className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer border-b border-zinc-200 dark:border-zinc-800 last:border-0"
        >
          <svg className="w-5 h-5 text-zinc-600 dark:text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">Groups</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Connect with others</p>
          </div>
        </Link>

        <Link
          href="/notifications"
          className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer border-b border-zinc-200 dark:border-zinc-800 last:border-0"
        >
          <svg className="w-5 h-5 text-zinc-600 dark:text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
          </svg>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">Newsletters</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Stay updated</p>
          </div>
        </Link>

        <Link
          href="/hub"
          className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer"
        >
          <svg className="w-5 h-5 text-zinc-600 dark:text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">Events</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Discover happenings</p>
          </div>
        </Link>
      </div>
    </aside>
  );
}

