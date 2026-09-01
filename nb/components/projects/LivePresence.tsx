"use client";

import { useEffect, useState, useCallback } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, Users } from "lucide-react";

interface PresenceUser {
  user_id: string;
  current_view: string;
  last_seen_at: string;
  profile?: {
    full_name: string | null;
    username: string | null;
    avatar_url?: string | null;
  };
}

interface LivePresenceProps {
  projectId: string;
  currentUserId: string | null;
  currentView?: string;
}

const viewLabels: Record<string, string> = {
  dashboard: "Dashboard",
  tasks: "Tasks",
  files: "Files",
  chat: "Chat",
  settings: "Settings",
  analytics: "Analytics",
};

export default function LivePresence({ projectId, currentUserId, currentView = "dashboard" }: LivePresenceProps) {
  const supabase = createSupabaseBrowserClient();
  const [activeUsers, setActiveUsers] = useState<PresenceUser[]>([]);
  const [showTooltip, setShowTooltip] = useState(false);

  // Update own presence
  const updatePresence = useCallback(async () => {
    if (!currentUserId) return;

    await supabase
      .from("project_presence")
      .upsert({
        project_id: projectId,
        user_id: currentUserId,
        current_view: currentView,
        last_seen_at: new Date().toISOString(),
        is_active: true,
      }, {
        onConflict: "project_id,user_id",
      });
  }, [projectId, currentUserId, currentView, supabase]);

  // Load active users
  const loadActiveUsers = useCallback(async () => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

    const { data } = await supabase
      .from("project_presence")
      .select(`
        user_id,
        current_view,
        last_seen_at,
        profile:profiles(full_name, username, avatar_url)
      `)
      .eq("project_id", projectId)
      .eq("is_active", true)
      .gte("last_seen_at", fiveMinutesAgo);

    if (data) {
      // Filter out current user and map properly
      const users = data
        .filter((u: any) => u.user_id !== currentUserId)
        .map((u: any) => ({
          user_id: u.user_id,
          current_view: u.current_view,
          last_seen_at: u.last_seen_at,
          profile: u.profile,
        }));
      setActiveUsers(users);
    }
  }, [projectId, currentUserId, supabase]);

  // Set up presence tracking
  useEffect(() => {
    if (!currentUserId) return;

    // Initial presence update
    updatePresence();
    loadActiveUsers();

    // Update presence every 30 seconds
    const presenceInterval = setInterval(updatePresence, 30000);
    
    // Refresh active users every 10 seconds
    const usersInterval = setInterval(loadActiveUsers, 10000);

    // Subscribe to presence changes
    const channel = supabase
      .channel(`presence-${projectId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "project_presence",
          filter: `project_id=eq.${projectId}`,
        },
        () => {
          loadActiveUsers();
        }
      )
      .subscribe();

    // Mark as inactive on unmount
    return () => {
      clearInterval(presenceInterval);
      clearInterval(usersInterval);
      channel.unsubscribe();
      
      // Mark as inactive
      supabase
        .from("project_presence")
        .update({ is_active: false })
        .eq("project_id", projectId)
        .eq("user_id", currentUserId)
        .then(() => {});
    };
  }, [projectId, currentUserId, updatePresence, loadActiveUsers, supabase]);

  // Update presence when view changes
  useEffect(() => {
    updatePresence();
  }, [currentView, updatePresence]);

  if (activeUsers.length === 0) {
    return null;
  }

  const displayedUsers = activeUsers.slice(0, 3);
  const remainingCount = activeUsers.length - displayedUsers.length;

  return (
    <div 
      className="relative"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div className="flex items-center gap-2">
        <div className="flex items-center -space-x-2">
          {displayedUsers.map((user, index) => (
            <motion.div
              key={user.user_id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="relative"
              style={{ zIndex: displayedUsers.length - index }}
            >
              <div className="w-8 h-8 rounded-full border-2 border-white dark:border-zinc-900 bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                {(user.profile?.full_name?.[0] || user.profile?.username?.[0] || "U").toUpperCase()}
              </div>
              {/* Online indicator */}
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white dark:border-zinc-900 rounded-full" />
            </motion.div>
          ))}
          
          {remainingCount > 0 && (
            <div className="w-8 h-8 rounded-full border-2 border-white dark:border-zinc-900 bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-zinc-600 dark:text-zinc-300 text-xs font-bold">
              +{remainingCount}
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">
          <Eye className="w-3.5 h-3.5" />
          <span>{activeUsers.length} viewing</span>
        </div>
      </div>

      {/* Tooltip */}
      <AnimatePresence>
        {showTooltip && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            className="absolute top-full left-0 mt-2 p-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 shadow-lg z-50 min-w-[200px]"
          >
            <div className="flex items-center gap-2 mb-2 pb-2 border-b border-zinc-200 dark:border-zinc-700">
              <Users className="w-4 h-4 text-zinc-500" />
              <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                Active Now
              </span>
            </div>
            <div className="space-y-2">
              {activeUsers.map((user) => (
                <div key={user.user_id} className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-[10px] font-bold">
                    {(user.profile?.full_name?.[0] || user.profile?.username?.[0] || "U").toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                      {user.profile?.full_name || user.profile?.username || "User"}
                    </p>
                    <p className="text-xs text-zinc-500">
                      Viewing {viewLabels[user.current_view] || user.current_view}
                    </p>
                  </div>
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

