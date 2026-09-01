import { create } from "zustand";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Connection } from "@/types/people";
import { toast } from "sonner";
import { useSubscription } from "@/hooks/useSubscription";

interface PaginatedConnections {
  connections: Connection[];
  hasMore: boolean;
  lastCursor: string | null; // accepted_at or created_at timestamp
}

interface ConnectionState {
  // Paginated accepted connections (only loaded pages)
  acceptedConnections: Connection[];
  acceptedHasMore: boolean;
  acceptedLastCursor: string | null;
  acceptedLoading: boolean;
  acceptedLoadingMore: boolean;
  
  // Pending counts (always loaded separately)
  pendingIncomingCount: number;
  pendingOutgoingCount: number;
  countsLoading: boolean;
  
  // Search state
  searchQuery: string;
  searchResults: Connection[];
  searchHasMore: boolean;
  searchLastCursor: string | null;
  searchLoading: boolean;
  
  isInitialized: boolean;
  
  // Actions
  initialize: (userId: string) => Promise<void>;
  fetchPendingCounts: (userId: string) => Promise<void>;
  fetchAcceptedConnectionsPage: (userId: string, limit?: number, cursor?: string | null) => Promise<{ connections: Connection[]; hasMore: boolean; lastCursor: string | null }>;
  searchConnections: (userId: string, query: string, limit?: number, cursor?: string | null) => Promise<{ connections: Connection[]; hasMore: boolean; lastCursor: string | null }>;
  syncRealtimeEvents: (userId: string) => void;
  
  // Optimistic Utils
  addOptimisticConnection: (connection: Connection) => void;
  removeOptimisticConnection: (connectionId: string) => void;
  updateOptimisticStatus: (connectionId: string, status: Connection['status']) => void;
  updateConnectionInList: (connectionId: string, updates: Partial<Connection>) => void;
  getAllConnections: (userId: string) => Promise<Connection[]>;
}

export const useConnectionStore = create<ConnectionState>((set, get) => ({
  acceptedConnections: [],
  acceptedHasMore: false,
  acceptedLastCursor: null,
  acceptedLoading: false,
  acceptedLoadingMore: false,
  
  pendingIncomingCount: 0,
  pendingOutgoingCount: 0,
  countsLoading: false,
  
  searchQuery: "",
  searchResults: [],
  searchHasMore: false,
  searchLastCursor: null,
  searchLoading: false,
  
  isInitialized: false,

  initialize: async (userId: string) => {
    if (get().isInitialized) return;
    
    // Load pending counts first (lightweight)
    await get().fetchPendingCounts(userId);
    // Load first page of accepted connections
    await get().fetchAcceptedConnectionsPage(userId, 30);
    get().syncRealtimeEvents(userId);
    set({ isInitialized: true });
  },

  fetchPendingCounts: async (userId: string) => {
    const supabase = createSupabaseBrowserClient();
    set({ countsLoading: true });
    
    try {
      const [incomingRes, outgoingRes] = await Promise.all([
        supabase
          .from("connections")
          .select("id", { count: "exact", head: true })
          .eq("connected_user_id", userId)
          .eq("status", "pending"),
        supabase
          .from("connections")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
          .eq("status", "pending"),
      ]);

      set({
        pendingIncomingCount: incomingRes.count || 0,
        pendingOutgoingCount: outgoingRes.count || 0,
        countsLoading: false,
      });
    } catch (error) {
      console.error("Error fetching pending counts:", error);
      set({ countsLoading: false });
    }
  },

  fetchAcceptedConnectionsPage: async (userId: string, limit: number = 30, cursor: string | null = null) => {
    const supabase = createSupabaseBrowserClient();
    const isInitialLoad = !cursor;
    
    if (isInitialLoad) {
      set({ acceptedLoading: true, acceptedConnections: [] });
    } else {
      set({ acceptedLoadingMore: true });
    }
    
    try {
      let query = supabase
        .from("connections")
        .select(`
          *,
          profiles:user_id(id, username, full_name, avatar_url, bio, location, headline),
          connected_profiles:connected_user_id(id, username, full_name, avatar_url, bio, location, headline)
        `)
        .or(`user_id.eq.${userId},connected_user_id.eq.${userId}`)
        .eq("status", "accepted")
        .order("accepted_at", { ascending: false, nullsLast: true })
        .order("created_at", { ascending: false })
        .limit(limit + 1); // Fetch one extra to determine hasMore

      // Keyset pagination: if cursor provided, fetch connections before this timestamp
      // Since we order by accepted_at desc (nulls last), then created_at desc,
      // cursor is always an accepted_at value (or created_at fallback)
      // Filter: accepted_at < cursor (this excludes nulls which come after)
      if (cursor) {
        query = query.lt("accepted_at", cursor);
      }

      const { data, error } = await query;

      if (error) throw error;

      const connections = (data || []) as Connection[];
      const hasMore = connections.length > limit;
      const pageConnections = hasMore ? connections.slice(0, limit) : connections;
      
      // Compute otherUser for each connection
      const enrichedConnections = pageConnections.map(conn => ({
        ...conn,
        otherUser: conn.user_id === userId ? conn.connected_profiles : conn.profiles,
      }));

      const lastCursor = enrichedConnections.length > 0
        ? (enrichedConnections[enrichedConnections.length - 1].accepted_at || 
           enrichedConnections[enrichedConnections.length - 1].created_at)
        : null;

      set((state) => ({
        acceptedConnections: isInitialLoad 
          ? enrichedConnections 
          : [...state.acceptedConnections, ...enrichedConnections],
        acceptedHasMore: hasMore,
        acceptedLastCursor: lastCursor,
        acceptedLoading: false,
        acceptedLoadingMore: false,
      }));

      return {
        connections: enrichedConnections,
        hasMore,
        lastCursor,
      };
    } catch (error) {
      console.error("Error fetching accepted connections page:", error);
      set({ acceptedLoading: false, acceptedLoadingMore: false });
      return { connections: [], hasMore: false, lastCursor: null };
    }
  },

  searchConnections: async (userId: string, query: string, limit: number = 30, cursor: string | null = null) => {
    const supabase = createSupabaseBrowserClient();
    const isInitialSearch = !cursor || get().searchQuery !== query;
    
    if (isInitialSearch) {
      set({ searchLoading: true, searchResults: [], searchQuery: query });
    }
    
    try {
      // Server-side search: search in profiles joined with connections
      const searchTerm = `%${query}%`;
      
      let connectionsQuery = supabase
        .from("connections")
        .select(`
          *,
          profiles:user_id(id, username, full_name, avatar_url, bio, location, headline),
          connected_profiles:connected_user_id(id, username, full_name, avatar_url, bio, location, headline)
        `)
        .or(`user_id.eq.${userId},connected_user_id.eq.${userId}`)
        .eq("status", "accepted")
        .order("accepted_at", { ascending: false, nullsLast: true })
        .order("created_at", { ascending: false })
        .limit(limit + 1);

      if (cursor) {
        connectionsQuery = connectionsQuery.lt("accepted_at", cursor);
      }

      const { data: allConnections, error } = await connectionsQuery;

      if (error) throw error;

      // Filter client-side on profile fields (Supabase doesn't easily support OR across joined tables)
      const filtered = (allConnections || []).filter((conn: Connection) => {
        const user = conn.user_id === userId ? conn.connected_profiles : conn.profiles;
        if (!user) return false;
        const searchLower = query.toLowerCase();
        return (
          (user.full_name || "").toLowerCase().includes(searchLower) ||
          (user.username || "").toLowerCase().includes(searchLower) ||
          (user.bio || "").toLowerCase().includes(searchLower) ||
          (user.location || "").toLowerCase().includes(searchLower) ||
          (user.headline || "").toLowerCase().includes(searchLower)
        );
      });

      const hasMore = filtered.length > limit;
      const pageConnections = hasMore ? filtered.slice(0, limit) : filtered;
      
      const enrichedConnections = pageConnections.map(conn => ({
        ...conn,
        otherUser: conn.user_id === userId ? conn.connected_profiles : conn.profiles,
      }));

      const lastCursor = enrichedConnections.length > 0
        ? (enrichedConnections[enrichedConnections.length - 1].accepted_at || 
           enrichedConnections[enrichedConnections.length - 1].created_at)
        : null;

      set((state) => ({
        searchResults: isInitialSearch
          ? enrichedConnections
          : [...state.searchResults, ...enrichedConnections],
        searchHasMore: hasMore,
        searchLastCursor: lastCursor,
        searchLoading: false,
      }));

      return {
        connections: enrichedConnections,
        hasMore,
        lastCursor,
      };
    } catch (error) {
      console.error("Error searching connections:", error);
      set({ searchLoading: false });
      return { connections: [], hasMore: false, lastCursor: null };
    }
  },

  syncRealtimeEvents: (userId: string) => {
    // This will be handled by useSubscription hook in the component
    // Store method kept for backward compatibility but will be called from component
  },
  
  addOptimisticConnection: (conn) => {
    // Add to accepted list if status is accepted, otherwise just update counts
    if (conn.status === "accepted") {
      set(state => {
        const enriched: Connection = {
          ...conn,
          otherUser: conn.user_id === (conn as any).currentUserId 
            ? (conn as any).connected_profiles 
            : (conn as any).profiles,
        } as Connection;
        return { 
          acceptedConnections: [enriched, ...(state.acceptedConnections || [])],
          acceptedLastCursor: conn.accepted_at || conn.created_at || null,
        };
      });
    }
  },
  
  removeOptimisticConnection: (id) => {
    set(state => ({
      acceptedConnections: state.acceptedConnections.filter(c => c.id !== id),
      searchResults: state.searchResults.filter(c => c.id !== id),
    }));
  },
  
  updateOptimisticStatus: (id, status) => {
    set(state => {
      const updateConn = (c: Connection) => c.id === id ? { ...c, status } : c;
      return {
        acceptedConnections: state.acceptedConnections.map(updateConn),
        searchResults: state.searchResults.map(updateConn),
      };
    });
  },

  updateConnectionInList: (connectionId, updates) => {
    set(state => {
      const updateConn = (c: Connection) => c.id === connectionId ? { ...c, ...updates } : c;
      return {
        acceptedConnections: state.acceptedConnections.map(updateConn),
        searchResults: state.searchResults.map(updateConn),
      };
    });
  },

  // Get all connections (accepted + pending) for connection map lookup
  // This is used by PeopleClient for discover page
  getAllConnections: async (userId: string) => {
    const supabase = createSupabaseBrowserClient();
    try {
      const { data } = await supabase
        .from("connections")
        .select(`
          id,
          user_id,
          connected_user_id,
          status,
          accepted_at,
          created_at
        `)
        .or(`user_id.eq.${userId},connected_user_id.eq.${userId}`);
      
      return (data as Connection[]) || [];
    } catch (error) {
      console.error("Error fetching all connections:", error);
      return [];
    }
  }

}));
