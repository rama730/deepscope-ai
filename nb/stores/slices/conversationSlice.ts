import { StateCreator } from 'zustand';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { ApplicationData } from '@/lib/services/messaging/types';
import { MessagingService } from '@/lib/services/messaging';
import { MessageStoreState, ConversationSlice } from './types';

export const createConversationSlice: StateCreator<
  MessageStoreState,
  [],
  [],
  ConversationSlice
> = (set, get) => ({
  conversationList: [],
  loadingConversations: false,
  conversationPage: 0,
  hasMoreConversations: true,
  applicationCache: {},

  fetchConversations: async (userId: string) => {
    set({ loadingConversations: true });
    try {
      const limit = 20;
      const data = await MessagingService.getUserConversations(userId);
      set({ 
        conversationList: data || [], 
        loadingConversations: false,
        conversationPage: 0,
        hasMoreConversations: (data || []).length >= limit
      });
    } catch (error) {
      console.error('[MessageStore] Failed to fetch conversations', error);
      set({ loadingConversations: false, hasMoreConversations: false });
    }
  },

  loadMoreConversations: async (userId: string) => {
    const state = get();
    if (state.loadingConversations || !state.hasMoreConversations || state.isSearching) return;

    set({ loadingConversations: true });
    try {
      // Note: Pagination not supported by current RPC, will fetch all
      const data = await MessagingService.getUserConversations(userId);
      
      if (data && data.length > 0) {
        set((prev) => {
          const existingIds = new Set(prev.conversationList.map(c => c.conversation_id));
          const newConversations = data.filter(c => !existingIds.has(c.conversation_id));
          
          return { 
            conversationList: [...prev.conversationList, ...newConversations],
            loadingConversations: false,
            conversationPage: prev.conversationPage + 1,
            hasMoreConversations: false 
          };
        });

      } else {
        set({ loadingConversations: false, hasMoreConversations: false });
      }
    } catch (error) {
      console.error('[MessageStore] Failed to load more conversations', error);
      set({ loadingConversations: false });
    }
  },

  searchConversations: async (userId, query) => {
    if (!query.trim()) {
      set({ isSearching: false, searchQuery: '' });
      get().fetchConversations(userId);
      return;
    }

    set({ isSearching: true, loadingConversations: true, searchQuery: query });
    try {
      const data = await MessagingService.searchConversations(userId, query);
      set({ 
        conversationList: data || [], 
        loadingConversations: false,
        hasMoreConversations: false 
      });
    } catch (error) {
      console.error('[MessageStore] Failed to search conversations', error);
      set({ loadingConversations: false });
    }
  },

  updateConversationSummary: (conversationId, updates) => 
    set((state) => {
      const existing = state.conversationList.find(c => c.conversation_id === conversationId);
      if (!existing) return state;

      const updated = { ...existing, ...updates };
      const otherConversations = state.conversationList.filter(c => c.conversation_id !== conversationId);
      
      let newList = [updated, ...otherConversations];
      if (updates.last_message_at) {
        newList = newList.sort((a, b) => 
          new Date(b.last_message_at || b.created_at || 0).getTime() - 
          new Date(a.last_message_at || a.created_at || 0).getTime()
        );
      }

      return { conversationList: newList };
    }),

  addConversationToSummary: (conversation) =>
    set((state) => {
      if (state.conversationList.some(c => c.conversation_id === conversation.conversation_id)) {
        return state;
      }
      return { conversationList: [conversation, ...state.conversationList] };
    }),

  markConversationAsReadInList: (conversationId) => 
    set((state) => ({
      conversationList: state.conversationList.map(c => 
        c.conversation_id === conversationId ? { ...c, unread_count: 0 } : c
      )
    })),

  setConversationList: (conversations) => set({ conversationList: conversations, loadingConversations: false }),

  // Optimized: Update conversation from message event without full refetch
  updateConversationFromMessage: (conversationId: string, message: { content?: string; created_at?: string } | null | undefined) =>
    set((state) => {
      const existing = state.conversationList.find(c => c.conversation_id === conversationId);
      
      if (!existing) {
        return state;
      }

      const updated = {
        ...existing,
        last_message: message?.content || existing.last_message || "",
        last_message_at: message?.created_at || existing.last_message_at,
        // Increment unread if message is not from current user (would need userId passed)
        // For now, just update the timestamp
      };

      const otherConversations = state.conversationList.filter(c => c.conversation_id !== conversationId);
      
      // Re-sort by last_message_at
      const newList = [updated, ...otherConversations].sort((a, b) => 
        new Date(b.last_message_at || b.created_at || 0).getTime() - 
        new Date(a.last_message_at || a.created_at || 0).getTime()
      );

      return { conversationList: newList };
    }),

  removeConversation: (conversationId: string) =>
    set((state) => ({
      conversationList: state.conversationList.filter(c => c.conversation_id !== conversationId)
    })),

  fetchApplication: async (conversationId: string) => {
    const { applicationCache } = get();
    if (applicationCache[conversationId]) return;

    try {
      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase
        .rpc('get_application_for_chat', {
          p_conversation_id: conversationId
        })
        .maybeSingle();

      if (!error && data) {
        const rpcData = data as any;
        const appData: ApplicationData = {
          id: rpcData.id,
          project_id: rpcData.project_id,
          applicant_id: rpcData.applicant_id,
          role_applied_for: rpcData.role_applied_for,
          status: rpcData.status,
          work_timings: rpcData.work_timings,
          portfolio_link: rpcData.portfolio_link,
          project: {
            title: rpcData.project_title,
            creator_id: rpcData.project_creator_id,
            slug: rpcData.project_slug
          },
          applicant_profile: {
            id: rpcData.applicant_id,
            full_name: rpcData.applicant_name,
            username: rpcData.applicant_username,
            avatar_url: null // RPC might not return this yet, use null or update RPC later
          },
          created_at: rpcData.created_at || new Date().toISOString(), // Ensure created_at exists or fallback
          message: rpcData.message || "" // Application type requires message
        };

        set((state) => ({
          applicationCache: {
            ...state.applicationCache,
            [conversationId]: appData
          }
        }));
      }
    } catch (err) {
      console.warn('[MessageStore] Failed to fetch application for chat:', err);
    }
  },

  updateApplicationInCache: (conversationId, updates) => {
    set((state) => {
      const existing = state.applicationCache[conversationId];
      if (!existing) return state;
      
      return {
        applicationCache: {
          ...state.applicationCache,
          [conversationId]: { ...existing, ...updates }
        }
      };
    });
  }
});
