"use client";

import { useEffect, useState, useMemo, forwardRef } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import Link from "next/link";
import Image from "next/image";
import { Search, Users, MessageSquare, X, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { profileHref } from "@/lib/routing/identifiers";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui-custom/Toast";
import { VirtuosoGrid } from "react-virtuoso";
import { toast } from "sonner";

import { Connection } from "@/types/people";
import { useConnectionStore } from "@/stores/useConnectionStore";
import { useSubscription } from "@/hooks/useSubscription";

interface ConnectionsClientProps {
  initialUser: any;
  embedded?: boolean;
}

export default function ConnectionsClient({
  initialUser,
  embedded = false
}: ConnectionsClientProps) {
  const supabase = createSupabaseBrowserClient();
  const router = useRouter();
  const { showToast } = useToast();

  // Store state
  const {
    acceptedConnections,
    acceptedHasMore,
    acceptedLastCursor,
    acceptedLoading,
    acceptedLoadingMore,
    pendingIncomingCount,
    pendingOutgoingCount,
    searchResults,
    searchHasMore,
    searchLastCursor,
    searchLoading,
    initialize,
    fetchPendingCounts,
    fetchAcceptedConnectionsPage,
    searchConnections,
    removeOptimisticConnection,
    updateConnectionInList,
    addOptimisticConnection,
  } = useConnectionStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [searchDebounceTimer, setSearchDebounceTimer] = useState<NodeJS.Timeout | null>(null);

  // Initialize store on mount
  useEffect(() => {
    if (initialUser?.id) {
      initialize(initialUser.id);
    }
  }, [initialUser?.id, initialize]);

  // Realtime subscriptions with incremental updates
  // Subscribe to incoming connection requests (user is receiver)
  useSubscription({
    table: 'connections',
    filter: initialUser?.id ? `connected_user_id=eq.${initialUser.id}` : undefined,
    event: '*',
    enabled: !!initialUser?.id,
    onData: async (payload: any) => {
      if (!initialUser?.id) return;

      const eventType = payload.eventType || (payload.new ? 'INSERT' : payload.old ? 'DELETE' : 'UPDATE');
      const newItem = payload.new;
      const oldItem = payload.old;

      if (eventType === 'INSERT' && newItem?.status === 'pending') {
        // Increment pending incoming count
        fetchPendingCounts(initialUser.id);

        // Fetch sender details for toast
        const { data: sender } = await supabase
          .from("profiles")
          .select("full_name, username")
          .eq("id", newItem.user_id)
          .single();

        const name = sender?.full_name || sender?.username || "A user";
        toast.info(`${name} sent you a connection request`, {
          action: {
            label: "View",
            onClick: () => router.push("/people?tab=inbox")
          }
        });
      } else if (eventType === 'UPDATE') {
        const oldStatus = oldItem?.status;
        const newStatus = newItem?.status;

        // Update counts if status changed
        if (oldStatus === 'pending' && newStatus !== 'pending') {
          fetchPendingCounts(initialUser.id);
        }

        // If connection was accepted, add to list if it's in the current view
        if (oldStatus !== 'accepted' && newStatus === 'accepted') {
          // Fetch full connection details
          const { data: fullConn } = await supabase
            .from("connections")
            .select(`
              *,
              profiles:user_id(id, username, full_name, avatar_url, bio, location, headline),
              connected_profiles:connected_user_id(id, username, full_name, avatar_url, bio, location, headline)
            `)
            .eq("id", newItem.id)
            .single();

          if (fullConn) {
            const enriched: Connection = {
              ...fullConn,
              otherUser: fullConn.user_id === initialUser.id ? fullConn.connected_profiles : fullConn.profiles,
            } as Connection;

            // Add to accepted list if we're on the first page (most recent)
            // Otherwise just update counts
            if (acceptedConnections.length < 30) {
              addOptimisticConnection(enriched);
            }
          }
        } else if (newStatus === 'accepted') {
          // Update existing connection in list
          updateConnectionInList(newItem.id, {
            status: newStatus,
            accepted_at: newItem.accepted_at,
          });
        }
      } else if (eventType === 'DELETE') {
        if (oldItem?.status === 'pending') {
          fetchPendingCounts(initialUser.id);
        } else if (oldItem?.status === 'accepted') {
          // Remove from list
          removeOptimisticConnection(oldItem.id);
        }
      }
    }
  });

  // Subscribe to outgoing connection requests (user is sender)
  useSubscription({
    table: 'connections',
    filter: initialUser?.id ? `user_id=eq.${initialUser.id}` : undefined,
    event: '*',
    enabled: !!initialUser?.id,
    onData: async (payload: any) => {
      if (!initialUser?.id) return;

      const eventType = payload.eventType || (payload.new ? 'INSERT' : payload.old ? 'DELETE' : 'UPDATE');
      const newItem = payload.new;
      const oldItem = payload.old;

      if (eventType === 'INSERT' && newItem?.status === 'pending') {
        fetchPendingCounts(initialUser.id);
      } else if (eventType === 'UPDATE') {
        const oldStatus = oldItem?.status;
        const newStatus = newItem?.status;

        if (oldStatus === 'pending' && newStatus !== 'pending') {
          fetchPendingCounts(initialUser.id);

          if (newStatus === 'accepted') {
            toast.success("Your connection request was accepted!");

            // Fetch full connection and add to list
            const { data: fullConn } = await supabase
              .from("connections")
              .select(`
                *,
                profiles:user_id(id, username, full_name, avatar_url, bio, location, headline),
                connected_profiles:connected_user_id(id, username, full_name, avatar_url, bio, location, headline)
              `)
              .eq("id", newItem.id)
              .single();

            if (fullConn) {
              const enriched: Connection = {
                ...fullConn,
                otherUser: fullConn.user_id === initialUser.id ? fullConn.connected_profiles : fullConn.profiles,
              } as Connection;

              if (acceptedConnections.length < 30) {
                addOptimisticConnection(enriched);
              }
            }
          }
        } else if (newStatus === 'accepted') {
          updateConnectionInList(newItem.id, {
            status: newStatus,
            accepted_at: newItem.accepted_at,
          });
        }
      } else if (eventType === 'DELETE') {
        if (oldItem?.status === 'pending') {
          fetchPendingCounts(initialUser.id);
        } else if (oldItem?.status === 'accepted') {
          removeOptimisticConnection(oldItem.id);
        }
      }
    }
  });

  // Debounced server-side search
  useEffect(() => {
    if (searchDebounceTimer) {
      clearTimeout(searchDebounceTimer);
    }

    if (!initialUser?.id) return;

    const timer = setTimeout(() => {
      if (searchQuery.trim()) {
        searchConnections(initialUser.id, searchQuery.trim(), 30);
      } else {
        // Clear search results when query is empty
        setSearchQuery("");
      }
    }, 400); // 400ms debounce

    setSearchDebounceTimer(timer);
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [searchQuery, initialUser?.id, searchConnections]);

  // Determine which connections to display
  const displayConnections = useMemo(() => {
    return searchQuery.trim() ? searchResults : acceptedConnections;
  }, [searchQuery, searchResults, acceptedConnections]);

  const hasMore = searchQuery.trim() ? searchHasMore : acceptedHasMore;
  const loading = searchQuery.trim() ? searchLoading : acceptedLoading;
  const loadingMore = searchQuery.trim() ? false : acceptedLoadingMore; // Search pagination handled separately

  // Derive stats (calculate from loaded connections + counts)
  const stats = useMemo(() => {
    if (!initialUser) return null;

    const now = new Date();
    const thisMonth = acceptedConnections.filter(c => {
      if (!c.accepted_at) return false;
      const d = new Date(c.accepted_at);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;

    // For total, we'd need a separate count query, but for now use loaded count
    // In a real implementation, you'd fetch total count separately
    const total = acceptedConnections.length; // This is approximate until we load all pages

    return {
      total_connections: total,
      pending_incoming: pendingIncomingCount,
      pending_outgoing: pendingOutgoingCount,
      connections_this_month: thisMonth
    };
  }, [acceptedConnections, pendingIncomingCount, pendingOutgoingCount, initialUser]);

  // Load more connections
  const loadMore = async () => {
    if (!initialUser?.id || loadingMore || !hasMore) return;

    if (searchQuery.trim()) {
      // Load more search results
      await searchConnections(initialUser.id, searchQuery.trim(), 30, searchLastCursor);
    } else {
      // Load more accepted connections
      await fetchAcceptedConnectionsPage(initialUser.id, 30, acceptedLastCursor);
    }
  };

  async function handleDisconnect(connectionId: string, otherUserId: string) {
    if (!confirm("Are you sure you want to disconnect from this user?")) return;

    // Optimistic update via store
    removeOptimisticConnection(connectionId);

    try {
      const { error } = await supabase
        .from("connections")
        .delete()
        .or(`user_id.eq.${initialUser.id},user_id.eq.${otherUserId}`)
        .or(`connected_user_id.eq.${initialUser.id},connected_user_id.eq.${otherUserId}`);

      if (error) throw error;
      showToast("Disconnected successfully", "success");

      // Update stats locally if possible
      // Stats update automatically via store subscription
    } catch (error) {
      console.error("Error disconnecting:", error);
      showToast("Failed to disconnect", "error");
      // Store will eventually resync on failure if we re-fetch, 
      // but ideally we should revert. For now, rely on initialize/refresh.
      initialize(initialUser.id);
    }
  }

  async function handleMessage(userId: string) {
    if (!initialUser?.id) return;

    try {
      // Use messaging service to get or create conversation
      const { MessagingService } = await import("@/lib/services/messaging/index");
      const conversation = await MessagingService.getOrCreateDirectConversation(initialUser.id, userId);

      if (conversation?.id) {
        router.push(`/messages?conversation=${conversation.id}`);
      } else {
        showToast("Failed to open conversation", "error");
      }
    } catch (error) {
      console.error("Error opening conversation:", error);
      showToast("Failed to open conversation", "error");
    }
  }

  if (loading && acceptedConnections.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-zinc-200 dark:bg-zinc-800 rounded w-64" />
          <div className="h-10 bg-zinc-200 dark:bg-zinc-800 rounded" />
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 bg-zinc-200 dark:bg-zinc-800 rounded" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="flex items-center gap-4 mb-6">
        {!embedded && (
          <Link href="/people" className="p-2 hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </Link>
        )}
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{embedded ? "Network" : "My Connections"}</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
            {stats?.total_connections ?? acceptedConnections.length} {stats?.total_connections === 1 ? 'connection' : 'connections'}
            {stats?.connections_this_month ? ` • ${stats.connections_this_month} this month` : ''}
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
          <div className="rounded-xl border bg-white dark:bg-zinc-900 p-4">
            <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{stats.total_connections}</div>
            <div className="text-sm text-zinc-600 dark:text-zinc-400">Total Connections</div>
          </div>
          <div className="rounded-xl border bg-white dark:bg-zinc-900 p-4">
            <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{stats.pending_incoming}</div>
            <div className="text-sm text-zinc-600 dark:text-zinc-400">Pending Requests</div>
          </div>
          <div className="rounded-xl border bg-white dark:bg-zinc-900 p-4">
            <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{stats.pending_outgoing}</div>
            <div className="text-sm text-zinc-600 dark:text-zinc-400">Sent Requests</div>
          </div>
          <div className="rounded-xl border bg-white dark:bg-zinc-900 p-4">
            <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{stats.connections_this_month}</div>
            <div className="text-sm text-zinc-600 dark:text-zinc-400">This Month</div>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
            }}
            placeholder="Search connections..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border bg-white dark:bg-zinc-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            aria-label="Search connections"
            role="searchbox"
          />
        </div>
      </div>

      {/* Connections List */}
      {displayConnections.length === 0 && !loading ? (
        <div className="text-center py-12 bg-white dark:bg-zinc-900 rounded-2xl border">
          <Users className="w-12 h-12 text-zinc-400 mx-auto mb-4" />
          <p className="text-zinc-600 dark:text-zinc-400">
            {searchQuery ? "No connections match your search." : "No connections yet."}
          </p>
          {!searchQuery && (
            <Link href="/people" className="text-blue-600 hover:underline mt-2 inline-block">
              Discover people to connect with
            </Link>
          )}
        </div>
      ) : (
        <div style={{ minHeight: '400px' }}>
          <VirtuosoGrid
            useWindowScroll
            data={displayConnections}
            endReached={() => {
              if (hasMore && !loadingMore) {
                loadMore();
              }
            }}
            components={{
              List: forwardRef((props, ref) => (
                <div
                  {...props}
                  ref={ref}
                  className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 pb-8"
                />
              )),
              Item: forwardRef((props, ref) => (
                <div {...props} ref={ref} className="h-full" />
              )),
              Footer: () => (
                loadingMore ? (
                  <div className="col-span-full py-8 text-center">
                    <Loader2 className="w-5 h-5 animate-spin text-zinc-400 mx-auto" />
                    <p className="text-sm text-zinc-500 mt-2">Loading more connections...</p>
                  </div>
                ) : hasMore ? (
                  <div className="col-span-full py-4 text-center">
                    <button
                      onClick={loadMore}
                      className="px-6 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-full text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                    >
                      Load More
                    </button>
                  </div>
                ) : null
              )
            }}
            itemContent={(_, conn) => {
              const user = conn.otherUser || (conn.user_id === initialUser?.id ? conn.connected_profiles : conn.profiles);
              if (!user) return null;

              return (
                <div
                  key={conn.id}
                  className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 hover:shadow-lg transition-shadow h-full"
                >
                  <div className="flex items-start gap-3">
                    <Link href={profileHref(user)} className="flex-shrink-0">
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
                          {(user.full_name || user.username || "U")[0]?.toUpperCase() || "U"}
                        </div>
                      )}
                    </Link>
                    <div className="flex-1 min-w-0">
                      <Link
                        href={profileHref(user)}
                        className="font-semibold text-zinc-900 dark:text-zinc-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors block truncate"
                      >
                        {user.full_name || user.username || "User"}
                      </Link>
                      {user.username && (
                        <p className="text-sm text-zinc-500 dark:text-zinc-400 truncate">@{user.username}</p>
                      )}
                      {user.headline && (
                        <p className="text-sm text-zinc-600 dark:text-zinc-400 line-clamp-1 mt-1">
                          {user.headline}
                        </p>
                      )}
                      {conn.accepted_at && (
                        <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
                          Connected {formatDistanceToNow(new Date(conn.accepted_at), { addSuffix: true })}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => handleMessage(user.id)}
                      className="flex-1 px-3 py-1.5 text-sm rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2"
                      aria-label={`Message ${user.full_name || user.username || 'user'}`}
                    >
                      <MessageSquare className="w-4 h-4" aria-hidden="true" />
                      Message
                    </button>
                    <button
                      onClick={() => handleDisconnect(conn.id, user.id)}
                      className="px-3 py-1.5 text-sm rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-300 dark:hover:border-red-700 transition-colors"
                      title="Disconnect"
                      aria-label={`Disconnect from ${user.full_name || user.username || 'user'}`}
                    >
                      <X className="w-4 h-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              );
            }}
          />
        </div>
      )}
    </div>
  );
}
