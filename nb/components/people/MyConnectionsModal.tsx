"use client";

import { useEffect, useState, useMemo } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { X, Search, MessageSquare, Users, Activity } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { profileHref } from "@/lib/routing/identifiers";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui-custom/Toast";
import ConnectionActivityFeed from "./ConnectionActivityFeed";
import ConnectionReminders from "./ConnectionReminders";

interface Connection {
  id: string;
  user_id: string;
  connected_user_id: string;
  accepted_at: string | null;
  created_at: string;
  profiles?: any;
  connected_profiles?: any;
}

interface MyConnectionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
}

export default function MyConnectionsModal({ isOpen, onClose, userId }: MyConnectionsModalProps) {
  const supabase = createSupabaseBrowserClient();
  const router = useRouter();
  const { showToast } = useToast();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<"connections" | "activity">("connections");
  const [stats, setStats] = useState<{
    total_connections: number;
    pending_incoming: number;
    pending_outgoing: number;
    connections_this_month: number;
  } | null>(null);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadConnections();
      loadStats();
    }
  }, [isOpen, userId]);

  // Real-time subscription for connections
  useEffect(() => {
    if (!isOpen || !userId) return;

    const channel = supabase
      .channel(`connections-modal-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "connections",
        },
        () => {
          loadConnections();
          loadStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isOpen, userId, supabase]);

  async function loadConnections() {
    if (!userId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("connections")
        .select(`
          id,
          user_id,
          connected_user_id,
          accepted_at,
          created_at,
          profiles:user_id(id, username, full_name, avatar_url, bio, location, headline),
          connected_profiles:connected_user_id(id, username, full_name, avatar_url, bio, location, headline)
        `)
        .or(`user_id.eq.${userId},connected_user_id.eq.${userId}`)
        .eq("status", "accepted")
        .order("accepted_at", { ascending: false, nullsFirst: false });

      if (error) throw error;

      const transformed = (data || []).map((conn: Connection) => {
        const otherUser = conn.user_id === userId
          ? conn.connected_profiles
          : conn.profiles;
        return {
          ...conn,
          otherUser,
          currentUserId: userId
        };
      });
      setConnections(transformed);
    } catch (error) {
      console.error("Error loading connections:", error);
      showToast("Failed to load connections", "error");
    } finally {
      setLoading(false);
    }
  }

  async function loadStats() {
    try {
      const { data } = await supabase
        .rpc("get_connection_stats", { user_uuid: userId });
      setStats(data || null);
    } catch (error) {
      console.error("Error loading stats:", error);
    }
  }

  async function handleDisconnect(connectionId: string, otherUserId: string) {
    if (!confirm("Are you sure you want to disconnect from this user?")) return;

    const previousConnections = [...connections];
    setConnections(prev => prev.filter(c => c.id !== connectionId));

    try {
      const { error } = await supabase
        .from("connections")
        .delete()
        .or(`user_id.eq.${userId},user_id.eq.${otherUserId}`)
        .or(`connected_user_id.eq.${userId},connected_user_id.eq.${otherUserId}`);

      if (error) throw error;
      showToast("Disconnected successfully", "success");
      loadStats();
    } catch (error) {
      console.error("Error disconnecting:", error);
      showToast("Failed to disconnect", "error");
      setConnections(previousConnections);
    }
  }

  async function handleMessage(otherUserId: string) {
    const conversationId = [userId, otherUserId].sort().join("-");
    onClose();
    router.push(`/messages?conversation=${conversationId}&user=${otherUserId}`);
  }

  const filteredConnections = useMemo(() => {
    if (!searchQuery.trim()) return connections;
    const query = searchQuery.toLowerCase();
    return connections.filter((conn: any) => {
      const user = conn.otherUser;
      return (
        (user?.full_name || "").toLowerCase().includes(query) ||
        (user?.username || "").toLowerCase().includes(query) ||
        (user?.bio || "").toLowerCase().includes(query) ||
        (user?.location || "").toLowerCase().includes(query)
      );
    });
  }, [connections, searchQuery]);

  const paginatedConnections = useMemo(() => {
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    return filteredConnections.slice(start, end);
  }, [filteredConnections, page, pageSize]);

  const hasMore = useMemo(() => {
    return page * pageSize < filteredConnections.length;
  }, [page, pageSize, filteredConnections.length]);

  if (!isOpen || !mounted) return null;

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm"
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: "spring", duration: 0.3 }}
          className="relative w-full max-w-4xl max-h-[85vh] bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-zinc-200 dark:border-zinc-800">
            <div>
              <h2 className="text-2xl font-bold">My Connections</h2>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                {stats?.total_connections || connections.length} {stats?.total_connections === 1 ? 'connection' : 'connections'}
                {stats?.connections_this_month ? ` • ${stats.connections_this_month} this month` : ''}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 rounded-full transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-zinc-200 dark:border-zinc-800">
            <button
              onClick={() => setActiveTab("connections")}
              className={`flex-1 px-4 py-3 font-medium transition-colors relative ${activeTab === "connections"
                ? "text-blue-600 dark:text-blue-400"
                : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-50 dark:hover:text-zinc-100"
                }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Users className="w-4 h-4" />
                Connections
              </div>
              {activeTab === "connections" && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400" />
              )}
            </button>
            <button
              onClick={() => setActiveTab("activity")}
              className={`flex-1 px-4 py-3 font-medium transition-colors relative ${activeTab === "activity"
                ? "text-blue-600 dark:text-blue-400"
                : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-50 dark:hover:text-zinc-100"
                }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Activity className="w-4 h-4" />
                Activity
              </div>
              {activeTab === "activity" && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400" />
              )}
            </button>
          </div>

          {/* Stats Cards - Only show for connections tab */}
          {activeTab === "connections" && stats && (
            <div className="grid grid-cols-4 gap-4 p-6 border-b border-zinc-200 dark:border-zinc-800">
              <div className="text-center">
                <div className="text-2xl font-bold">{stats.total_connections}</div>
                <div className="text-xs text-zinc-600 dark:text-zinc-400">Total</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{stats.pending_incoming}</div>
                <div className="text-xs text-zinc-600 dark:text-zinc-400">Pending</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{stats.pending_outgoing}</div>
                <div className="text-xs text-zinc-600 dark:text-zinc-400">Sent</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{stats.connections_this_month}</div>
                <div className="text-xs text-zinc-600 dark:text-zinc-400">This Month</div>
              </div>
            </div>
          )}

          {/* Content based on active tab */}
          {activeTab === "connections" ? (
            <>
              {/* Search */}
              <div className="p-6 border-b border-zinc-200 dark:border-zinc-800">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-zinc-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setPage(1);
                    }}
                    placeholder="Search connections by name, username, or bio..."
                    className="w-full pl-10 pr-4 py-2 rounded-xl border bg-white dark:bg-zinc-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    aria-label="Search connections"
                  />
                </div>
              </div>

              {/* Connections List */}
              <div className="flex-1 overflow-y-auto p-6">
                {loading ? (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                      <div key={i} className="animate-pulse rounded-xl border bg-white dark:bg-zinc-900 p-4">
                        <div className="h-12 w-12 rounded-full bg-zinc-200 dark:bg-zinc-800 mb-3" />
                        <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-3/4 mb-2" />
                        <div className="h-3 bg-zinc-200 dark:bg-zinc-800 rounded w-1/2" />
                      </div>
                    ))}
                  </div>
                ) : filteredConnections.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="w-12 h-12 text-zinc-400 mx-auto mb-4" />
                    <p className="text-zinc-600 dark:text-zinc-400">
                      {searchQuery ? "No connections match your search." : "No connections yet."}
                    </p>
                    {!searchQuery && (
                      <button
                        onClick={() => {
                          onClose();
                          router.push("/people");
                        }}
                        className="text-blue-600 hover:underline mt-2"
                      >
                        Discover people to connect with
                      </button>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {paginatedConnections.map((conn: any) => {
                        const user = conn.otherUser;
                        if (!user) return null;

                        return (
                          <div
                            key={conn.id}
                            className="rounded-xl border bg-white dark:bg-zinc-900 p-4 hover:shadow-lg transition-shadow"
                          >
                            <div className="flex items-start gap-3">
                              <a
                                href={profileHref(user)}
                                onClick={(e) => {
                                  e.preventDefault();
                                  onClose();
                                  router.push(profileHref(user));
                                }}
                                className="flex-shrink-0"
                              >
                                {user.avatar_url ? (
                                  <Image
                                    src={user.avatar_url}
                                    alt={user.full_name || user.username || "User"}
                                    width={48}
                                    height={48}
                                    className="w-12 h-12 rounded-full object-cover"
                                  />
                                ) : (
                                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                                    {(user.full_name || user.username || "U")[0].toUpperCase()}
                                  </div>
                                )}
                              </a>
                              <div className="flex-1 min-w-0">
                                <a
                                  href={profileHref(user)}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    onClose();
                                    router.push(profileHref(user));
                                  }}
                                  className="font-semibold hover:text-blue-600 dark:hover:text-blue-400 transition-colors block truncate"
                                >
                                  {user.full_name || user.username || "User"}
                                </a>
                                {user.username && (
                                  <p className="text-sm text-zinc-500 truncate">@{user.username}</p>
                                )}
                                {user.headline && (
                                  <p className="text-sm text-zinc-600 dark:text-zinc-400 line-clamp-1 mt-1">
                                    {user.headline}
                                  </p>
                                )}
                                {conn.accepted_at && (
                                  <p className="text-xs text-zinc-400 mt-1">
                                    Connected {formatDistanceToNow(new Date(conn.accepted_at), { addSuffix: true })}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-2 mt-4">
                              <button
                                onClick={() => handleMessage(user.id)}
                                className="flex-1 px-3 py-1.5 text-sm rounded-lg border hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2"
                              >
                                <MessageSquare className="w-4 h-4" />
                                Message
                              </button>
                              <button
                                onClick={() => handleDisconnect(conn.id, user.id)}
                                className="px-3 py-1.5 text-sm rounded-lg border hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-300 dark:hover:border-red-700 transition-colors"
                                title="Disconnect"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Pagination */}
                    {filteredConnections.length > pageSize && (
                      <div className="mt-6 flex items-center justify-center gap-2">
                        <button
                          onClick={() => setPage(p => Math.max(1, p - 1))}
                          disabled={page === 1}
                          className="px-4 py-2 text-sm rounded-lg border disabled:opacity-50 disabled:cursor-not-allowed hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800 transition-colors"
                        >
                          Previous
                        </button>
                        <span className="text-sm text-zinc-600 dark:text-zinc-400">
                          Page {page} of {Math.ceil(filteredConnections.length / pageSize)}
                        </span>
                        <button
                          onClick={() => setPage(p => p + 1)}
                          disabled={!hasMore}
                          className="px-4 py-2 text-sm rounded-lg border disabled:opacity-50 disabled:cursor-not-allowed hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800 transition-colors"
                        >
                          Next
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </>
          ) : (
            /* Activity Feed Tab */
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Recent Activity */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
                <ConnectionActivityFeed userId={userId} limit={20} />
              </div>

              {/* Connection Reminders */}
              <div className="mt-8 pt-8 border-t border-zinc-200 dark:border-zinc-800">
                <h3 className="text-lg font-semibold mb-4">Connection Reminders</h3>
                <ConnectionReminders userId={userId} limit={5} inactiveDaysThreshold={30} />
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}
