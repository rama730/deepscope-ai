"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import Link from "next/link";
import Image from "next/image";

import { Users, Clock, MessageSquare } from "lucide-react";
import { useRouter } from "next/navigation";
import { profileHref } from "@/lib/routing/identifiers";

interface InactiveConnection {
  id: string;
  user_id: string;
  connected_user_id: string;
  accepted_at: string;
  otherUser: {
    id: string;
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
  };
  daysSince: number;
}

interface ConnectionRemindersProps {
  userId: string;
  limit?: number;
  inactiveDaysThreshold?: number;
}

export default function ConnectionReminders({
  userId,
  limit = 5,
  inactiveDaysThreshold = 30
}: ConnectionRemindersProps) {
  const supabase = createSupabaseBrowserClient();
  const router = useRouter();
  const [inactiveConnections, setInactiveConnections] = useState<InactiveConnection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInactiveConnections();
  }, [userId]);

  async function loadInactiveConnections() {
    if (!userId) return;
    setLoading(true);

    try {
      const thresholdDate = new Date();
      thresholdDate.setDate(thresholdDate.getDate() - inactiveDaysThreshold);

      // Get all accepted connections
      const { data: connections, error } = await supabase
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
        .not("accepted_at", "is", null)
        .lt("accepted_at", thresholdDate.toISOString())
        .order("accepted_at", { ascending: true })
        .limit(limit * 2); // Get more to filter out recent message activity

      if (error) throw error;

      // Check for recent message activity to filter out truly inactive connections
      const inactive: InactiveConnection[] = [];

      for (const conn of connections || []) {
        const c = conn as any;
        const rawOtherUser = c.user_id === userId ? c.connected_profiles : c.profiles;
        const otherUser = Array.isArray(rawOtherUser) ? rawOtherUser[0] : rawOtherUser;

        if (!otherUser) continue;

        // Check if there's been any recent messages
        const conversationId = [userId, otherUser.id].sort().join("-");
        const { data: recentMessages } = await supabase
          .from("messages")
          .select("created_at")
          .eq("conversation_id", conversationId)
          .gte("created_at", thresholdDate.toISOString())
          .limit(1);

        // If no recent messages, it's inactive
        if (!recentMessages || recentMessages.length === 0) {
          const acceptedDate = new Date(conn.accepted_at);
          const daysSince = Math.floor((Date.now() - acceptedDate.getTime()) / (1000 * 60 * 60 * 24));

          inactive.push({
            id: conn.id,
            user_id: conn.user_id,
            connected_user_id: conn.connected_user_id,
            accepted_at: conn.accepted_at,
            otherUser: {
              id: otherUser.id,
              full_name: otherUser.full_name,
              username: otherUser.username,
              avatar_url: otherUser.avatar_url
            },
            daysSince
          });

          if (inactive.length >= limit) break;
        }
      }

      setInactiveConnections(inactive);
    } catch (error) {
      console.error("Error loading inactive connections:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleMessage(otherUserId: string) {
    const conversationId = [userId, otherUserId].sort().join("-");
    router.push(`/messages?conversation=${conversationId}&user=${otherUserId}`);
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

  if (inactiveConnections.length === 0) {
    return (
      <div className="text-center py-8 text-zinc-500">
        <Users className="w-12 h-12 mx-auto mb-3 text-zinc-400" />
        <p className="text-sm">All your connections are active!</p>
        <p className="text-xs text-zinc-400 mt-1">You've been engaging with everyone recently.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 px-2 mb-2">
        <Clock className="w-4 h-4 text-amber-500" />
        <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Reconnect with connections you haven't talked to in a while
        </p>
      </div>

      {inactiveConnections.map((conn) => (
        <div
          key={conn.id}
          className="flex items-center gap-3 p-3 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors border border-amber-100 dark:border-amber-900/30 bg-amber-50/50 dark:bg-amber-900/10"
        >
          <Link
            href={profileHref(conn.otherUser)}
            className="flex-shrink-0"
          >
            {conn.otherUser.avatar_url ? (
              <Image
                src={conn.otherUser.avatar_url}
                alt={conn.otherUser.full_name || conn.otherUser.username || "User"}
                width={40}
                height={40}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm">
                {((conn.otherUser?.full_name?.[0]) || 
                  (conn.otherUser?.username?.[0]) || 
                  "U").toUpperCase()}
              </div>
            )}
          </Link>
          <div className="flex-1 min-w-0">
            <Link
              href={profileHref(conn.otherUser)}
              className="font-medium text-sm hover:text-blue-600 dark:hover:text-blue-400 transition-colors block truncate"
            >
              {conn.otherUser.full_name || conn.otherUser.username || "User"}
            </Link>
            <p className="text-xs text-zinc-500 mt-0.5">
              No messages in {conn.daysSince} days
            </p>
          </div>
          <button
            onClick={() => handleMessage(conn.otherUser.id)}
            className="p-2 rounded-lg border hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
            title="Send a message"
            aria-label={`Message ${conn.otherUser.full_name || conn.otherUser.username || 'user'}`}
          >
            <MessageSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </button>
        </div>
      ))}

      <Link
        href="/people/connections"
        className="block text-center text-sm text-blue-600 hover:underline mt-4"
      >
        View all connections
      </Link>
    </div>
  );
}
