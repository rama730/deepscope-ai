"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import Link from "next/link";
import Image from "next/image";
import { UserPlus, Check, Users } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { profileHref } from "@/lib/routing/identifiers";

interface ActivityItem {
  id: string;
  type: "connection_accepted" | "connection_request" | "mutual_connection";
  actor_id: string;
  actor_username?: string | null;
  actor_name: string;
  actor_avatar: string | null;
  target_id?: string;
  target_name?: string;
  timestamp: string;
  message: string;
}

interface ConnectionActivityFeedProps {
  userId: string;
  limit?: number;
}

export default function ConnectionActivityFeed({ userId, limit = 10 }: ConnectionActivityFeedProps) {
  const supabase = createSupabaseBrowserClient();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadActivities();
  }, [userId]);

  async function loadActivities() {
    if (!userId) return;
    setLoading(true);

    try {
      // Get recent connection activities
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      // Get accepted connections in the last week
      const { data: recentConnections } = await supabase
        .from("connections")
        .select(`
          id,
          user_id,
          connected_user_id,
          accepted_at,
          profiles:user_id(id, full_name, username, avatar_url),
          connected_profiles:connected_user_id(id, full_name, username, avatar_url)
        `)
        .or(`user_id.eq.${userId},connected_user_id.eq.${userId}`)
        .eq("status", "accepted")
        .gte("accepted_at", oneWeekAgo.toISOString())
        .order("accepted_at", { ascending: false })
        .limit(limit);

      const activityItems: ActivityItem[] = [];

      if (recentConnections) {
        for (const conn of recentConnections) {
          const c = conn as any;
          const otherUser = c.user_id === userId ? c.connected_profiles : c.profiles;
          const isOtherUserActor = c.user_id !== userId;

          activityItems.push({
            id: c.id,
            type: "connection_accepted",
            actor_id: otherUser?.id || c.user_id,
            actor_username: otherUser?.username || null,
            actor_name: otherUser?.full_name || otherUser?.username || "User",
            actor_avatar: otherUser?.avatar_url || null,
            timestamp: c.accepted_at || new Date().toISOString(),
            message: isOtherUserActor
              ? "accepted your connection request"
              : "You connected with"
          });
        }
      }

      // Get recent connection requests
      const { data: recentRequests } = await supabase
        .from("connections")
        .select(`
          id,
          user_id,
          connected_user_id,
          created_at,
          profiles:user_id(id, full_name, username, avatar_url)
        `)
        .eq("connected_user_id", userId)
        .eq("status", "pending")
        .gte("created_at", oneWeekAgo.toISOString())
        .order("created_at", { ascending: false })
        .limit(5);

      if (recentRequests) {
        for (const req of recentRequests) {
          const r = req as any;
          // Handle potential array response for joined tables
          const profile = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;

          activityItems.push({
            id: r.id,
            type: "connection_request",
            actor_id: profile?.id || r.user_id,
            actor_username: profile?.username || null,
            actor_name: profile?.full_name || profile?.username || "User",
            actor_avatar: profile?.avatar_url || null,
            timestamp: r.created_at,
            message: "sent you a connection request"
          });
        }
      }

      // Sort by timestamp
      activityItems.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      setActivities(activityItems.slice(0, limit));
    } catch (error) {
      console.error("Error loading connection activities:", error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="animate-pulse flex items-center gap-3 p-3 rounded-lg bg-zinc-50 dark:bg-zinc-900">
            <div className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-800" />
            <div className="flex-1 space-y-2">
              <div className="h-3 bg-zinc-200 dark:bg-zinc-800 rounded w-3/4" />
              <div className="h-2 bg-zinc-200 dark:bg-zinc-800 rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-8 text-zinc-500">
        <Users className="w-12 h-12 mx-auto mb-3 text-zinc-400" />
        <p className="text-sm">No recent connection activity</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {activities.map((activity) => (
        <Link
          key={activity.id}
          href={profileHref(activity.actor_username || activity.actor_id || "")}
          className="flex items-center gap-3 p-3 rounded-lg hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-900 transition-colors group"
        >
          <div className="relative flex-shrink-0">
            {activity.actor_avatar ? (
              <Image
                src={activity.actor_avatar}
                alt={activity.actor_name || "User"}
                width={40}
                height={40}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm">
                {((activity.actor_name && activity.actor_name[0]) || "U").toUpperCase()}
              </div>
            )}
            <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-white dark:bg-zinc-900 flex items-center justify-center">
              {activity.type === "connection_accepted" ? (
                <Check className="w-2.5 h-2.5 text-green-600" />
              ) : (
                <UserPlus className="w-2.5 h-2.5 text-blue-600" />
              )}
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-zinc-900 dark:text-zinc-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              <span className="font-medium">{activity.actor_name}</span>{" "}
              <span className="text-zinc-600 dark:text-zinc-400">{activity.message}</span>
            </p>
            <p className="text-xs text-zinc-400 mt-0.5">
              {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
}
