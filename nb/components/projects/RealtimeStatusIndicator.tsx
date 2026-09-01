"use client";

import { WifiOff } from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import Image from "next/image";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

interface RealtimeStatusIndicatorProps {
  projectId: string;
  currentUser?: {
    id: string;
    full_name: string | null;
    username: string | null;
    avatar_url?: string | null;
  } | null;
}

export default function RealtimeStatusIndicator({ projectId, currentUser }: RealtimeStatusIndicatorProps) {
  const [isConnected, setIsConnected] = useState(true);
  const [presenceUsers, setPresenceUsers] = useState<any[]>([]);
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  useEffect(() => {
    if (!projectId) return;

    const channel = supabase.channel(`project-${projectId}-presence`, {
      config: {
        presence: {
          key: currentUser?.id || "anonymous",
        },
      },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const users = Object.values(state).flat().map((p: any) => p.user);
        // Filter out current user for the indicator count
        setPresenceUsers(users.filter(u => u?.id !== currentUser?.id));
      })
      .on("presence", { event: "join" }, () => {
        // Handle join if needed
      })
      .on("presence", { event: "leave" }, () => {
        // Handle leave if needed
      })
      .subscribe(async (status) => {
        setIsConnected(status === "SUBSCRIBED");
        if (status === "SUBSCRIBED" && currentUser) {
          await channel.track({
            user: {
              id: currentUser.id,
              name: currentUser.full_name || currentUser.username || "User",
              avatar_url: currentUser.avatar_url
            },
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId, supabase, currentUser]);

  return (
    <div className="fixed bottom-4 right-4 z-40 flex flex-col items-end gap-2">
      {presenceUsers.length > 0 && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-full shadow-lg animate-in fade-in slide-in-from-bottom-2">
          <div className="flex -space-x-2">
            {presenceUsers.slice(0, 3).map((user, idx) => (
              <div
                key={user.id || idx}
                className="w-6 h-6 rounded-full border-2 border-white dark:border-zinc-800 bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center overflow-hidden relative"
                title={user.name}
              >
                {user.avatar_url ? (
                  <Image src={user.avatar_url} alt={user.name} fill className="object-cover" sizes="24px" />
                ) : (
                  <span className="text-[10px] font-bold text-zinc-500">{user.name?.[0]}</span>
                )}
              </div>
            ))}
            {presenceUsers.length > 3 && (
              <div className="w-6 h-6 rounded-full border-2 border-white dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-700 flex items-center justify-center">
                <span className="text-[10px] font-bold text-zinc-500">+{presenceUsers.length - 3}</span>
              </div>
            )}
          </div>
          <span className="text-[10px] font-medium text-zinc-600 dark:text-zinc-400">
            {presenceUsers.length} viewing
          </span>
        </div>
      )}

      {!isConnected && (
        <div className="flex items-center gap-2 px-3 py-2 bg-amber-100 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-lg shadow-lg">
          <WifiOff className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          <span className="text-xs font-medium text-amber-800 dark:text-amber-300">
            Reconnecting...
          </span>
        </div>
      )}
    </div>
  );
}
