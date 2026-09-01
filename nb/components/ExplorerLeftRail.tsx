"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import Link from "next/link";
import ProfileCard from "@/components/rails/left/ProfileCard";
import ActivityCard from "@/components/rails/left/ActivityCard";
import DiscoverCard from "@/components/rails/left/DiscoverCard";

export default function ExplorerLeftRail() {
  const supabase = createSupabaseBrowserClient();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (!user) {
        setLoading(false);
        return;
      }

      const { data: p } = await supabase
        .from("profiles")
        .select("id, full_name, username, avatar_url, headline, availability_status, bio, profile_strength, onboarding_completed, onboarding_step")
        .eq("id", user.id)
        .single();

      setProfile(p || null);
      setLoading(false);
    })();
  }, [supabase]);

  if (loading) {
    return <LeftRailSkeleton />;
  }

  if (!user) {
    return <GuestCard />;
  }

  // Fallback profile details
  const effectiveProfile = profile || {
    id: user.id,
    full_name: user.user_metadata?.full_name || "User",
    username: user.user_metadata?.username || "user",
    avatar_url: user.user_metadata?.avatar_url,
    headline: "",
    bio: "",
    availability_status: "available",
    onboarding_completed: false,
    onboarding_step: "profile",
  };

  return (
    <div className="space-y-6">
      {/* Card 1: Profile Summary */}
      <div className="animate-in fade-in slide-in-from-left-2 duration-500">
        <ProfileCard profile={effectiveProfile} userId={user.id} />
      </div>

      {/* Card 2: Your Activity (Tabbed) */}
      <div
        className="animate-in fade-in slide-in-from-left-2 duration-500"
        style={{ animationDelay: "100ms", animationFillMode: "backwards" }}
      >
        <ActivityCard userId={user.id} />
      </div>

      {/* Card 3: Discover */}
      <div
        className="animate-in fade-in slide-in-from-left-2 duration-500"
        style={{ animationDelay: "200ms", animationFillMode: "backwards" }}
      >
        <DiscoverCard userId={user.id} />
      </div>
    </div>
  );
}

function GuestCard() {
  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-left-2 duration-500">
      <div className="rounded-2xl bg-gradient-to-br from-blue-600/20 via-purple-600/20 to-pink-600/20 border border-zinc-200 dark:border-zinc-800 p-5 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/5">
        <h3 className="font-semibold text-zinc-900 dark:text-white mb-2">Join NB</h3>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">Connect with builders and bring your ideas to life.</p>
        <div className="flex gap-2">
          <Link
            href="/login"
            className="flex-1 py-2 px-3 text-sm font-medium text-center rounded-lg bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-all duration-200 hover:scale-[1.02]"
          >
            Sign in
          </Link>
          <Link
            href="/login?tab=signup"
            className="flex-1 py-2 px-3 text-sm font-medium text-center rounded-lg border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 transition-all duration-200 hover:scale-[1.02]"
          >
            Sign up
          </Link>
        </div>
      </div>
    </div>
  );
}

function LeftRailSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Profile Card Skeleton */}
      <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 pb-4 overflow-hidden relative">
        <div className="h-12 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800" />
        <div className="absolute top-7 left-3 w-12 h-12 rounded-full bg-zinc-300 dark:bg-zinc-800 animate-pulse border-4 border-white dark:border-zinc-900 z-10" />
        <div className="pt-10 px-4 space-y-2.5">
          <div className="h-4 w-32 bg-zinc-300 dark:bg-zinc-800 rounded animate-pulse" />
          <div className="h-3 w-24 bg-zinc-300 dark:bg-zinc-800 rounded animate-pulse" />
          <div className="flex items-center gap-2 mt-4 pt-1">
            <div className="h-2 w-2 rounded-full bg-zinc-300 dark:bg-zinc-800" />
            <div className="h-2 w-16 bg-zinc-300 dark:bg-zinc-800 rounded animate-pulse" />
          </div>
        </div>
      </div>

      {/* Activity Card Skeleton */}
      <div className="rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        <div className="flex border-b border-zinc-200 dark:border-zinc-800 h-9">
          <div className="flex-1 border-b-2 border-transparent" />
          <div className="flex-1 border-b-2 border-transparent" />
          <div className="flex-1 border-b-2 border-transparent" />
        </div>
        <div className="p-2 space-y-2">
          <div className="h-8 w-full bg-zinc-300 dark:bg-zinc-800 rounded animate-pulse" />
          <div className="h-8 w-full bg-zinc-300 dark:bg-zinc-800 rounded animate-pulse" />
          <div className="h-8 w-full bg-zinc-300 dark:bg-zinc-800 rounded animate-pulse" />
        </div>
      </div>

      {/* Discover Card Skeleton */}
      <div className="rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        <div className="px-3 py-2 border-b border-zinc-200 dark:border-zinc-800 flex items-center gap-1.5 h-9">
          <div className="h-3.5 w-3.5 rounded-full bg-zinc-300 dark:bg-zinc-800" />
          <div className="h-3 w-16 bg-zinc-300 dark:bg-zinc-800 rounded animate-pulse" />
        </div>
        <div className="p-2 space-y-2">
          <div className="h-10 w-full bg-zinc-300 dark:bg-zinc-800 rounded animate-pulse" />
          <div className="h-10 w-full bg-zinc-300 dark:bg-zinc-800 rounded animate-pulse" />
        </div>
      </div>
    </div>
  );
}
