import { StateCreator } from 'zustand';
import { MessagingService, Message } from '@/lib/services/messaging';
import { MessageStoreState, MessageSlice } from './types';

const CONVERSATION_TTL_MS = 10 * 60 * 1000; // 10 minutes

const MAX_SENDER_PROFILE_CACHE_SIZE = 100;

export const createMessageSlice: StateCreator<
  MessageStoreState,
  [],
  [],
  MessageSlice
> = (set, get) => ({
  conversations: {},
  conversationActivity: {},
  pendingMessages: [],
  senderProfileCache: {},

  cacheSenderProfile: (userId, profile) => {
    set((state) => {
      // 1. Update/Insert current entry
      const newCache = {
        ...state.senderProfileCache,
        [userId]: { profile, lastAccessed: Date.now() }
      };

      // 2. Cleanup if size exceeds limit
      // We do this check here to keep it continuously clean
      const keys = Object.keys(newCache);
      if (keys.length > MAX_SENDER_PROFILE_CACHE_SIZE) {
        // Sort by lastAccessed ascending (oldest first)
        const sortedEntries = Object.entries(newCache).sort(([, a], [, b]) => a.lastAccessed - b.lastAccessed);
        
        // Remove oldest entries until we fit
        const entriesToRemove = sortedEntries.slice(0, keys.length - MAX_SENDER_PROFILE_CACHE_SIZE);
        entriesToRemove.forEach(([key]) => {
          delete newCache[key];
        });
      }

      return { senderProfileCache: newCache };
    });
  },

  getCachedSenderProfile: (userId) => {
    const state = get();
    const entry = state.senderProfileCache[userId];
    if (entry) {
      // Update lastAccessed for true LRU behavior
      set((s) => {
        const currentEntry = s.senderProfileCache[userId];
        if (!currentEntry) return s;
        return {
          senderProfileCache: {
            ...s.senderProfileCache,
            [userId]: { ...currentEntry, lastAccessed: Date.now() }
          }
        };
      });
      return entry.profile;
    }
    return undefined;
  },

  cleanupSenderProfiles: () =>
    set((state) => {
      const entries = Object.entries(state.senderProfileCache);
      if (entries.length <= MAX_SENDER_PROFILE_CACHE_SIZE) return state;

      const sortedEntries = entries.sort(([, a], [, b]) => a.lastAccessed - b.lastAccessed);
      const newCache = { ...state.senderProfileCache };
      
      const toRemove = sortedEntries.slice(0, entries.length - MAX_SENDER_PROFILE_CACHE_SIZE);
      toRemove.forEach(([k]) => delete newCache[k]);
      
      return { senderProfileCache: newCache };
    }),

  clearSenderProfileCache: () => 
    set(() => ({ 
      senderProfileCache: {} 
    })),

  removeCachedSenderProfile: (userId) => 
    set((state) => {
      const newCache = { ...state.senderProfileCache };
      delete newCache[userId];
      return { senderProfileCache: newCache };
    }),

  fetchMessages: async (conversationId: string) => {
    const state = get();
    if (state.conversations[conversationId]) {
      return; 
    }

    try {
      const messages = await MessagingService.getMessages(conversationId, { limit: 50 });
      state.setMessages(conversationId, messages);
    } catch (error) {
      console.error('[MessageStore] Failed to fetch messages', error);
    }
  },

  setMessages: (conversationId, messages) => 
    set((state) => ({
      conversations: {
        ...state.conversations,
        [conversationId]: messages
      },
      conversationActivity: {
        ...state.conversationActivity,
        [conversationId]: Date.now()
      }
    })),

  addMessage: (message) => 
    set((state) => {
      const convId = message.conversation_id;
      const currentMessages = state.conversations[convId] || [];
      
      if (currentMessages.some(m => m.id === message.id)) {
        return state;
      }

      return {
        conversations: {
          ...state.conversations,
          [convId]: [...currentMessages, message]
        }
      };
    }),

  updateMessage: (message) => 
    set((state) => {
      const convId = message.conversation_id;
      const currentMessages = state.conversations[convId] || [];
      
      return {
        conversations: {
          ...state.conversations,
          [convId]: currentMessages.map(m => m.id === message.id ? message : m)
        }
      };
    }),

  removeMessage: (messageId, conversationId) => 
    set((state) => {
      if (conversationId) {
        const currentMessages = state.conversations[conversationId] || [];
        return {
          conversations: {
            ...state.conversations,
            [conversationId]: currentMessages.filter(m => m.id !== messageId)
          }
        };
      }

      const newConversations = { ...state.conversations };
      let found = false;
      
      for (const [convId, msgs] of Object.entries(newConversations)) {
        if (msgs.some(m => m.id === messageId)) {
          newConversations[convId] = msgs.filter(m => m.id !== messageId);
          found = true;
          break;
        }
      }

      return found ? { conversations: newConversations } : state;
    }),

  addPendingMessage: (message) => 
    set((state) => ({
      pendingMessages: [...state.pendingMessages, message]
    })),

  removePendingMessage: (tempId) => 
    set((state) => ({
      pendingMessages: state.pendingMessages.filter(m => m.tempId !== tempId)
    })),

  updatePendingMessageStatus: (tempId, status) => 
    set((state) => ({
      pendingMessages: state.pendingMessages.map(m => 
        m.tempId === tempId ? { ...m, status } : m
      )
    })),

  cleanupInactiveConversations: () =>
    set((state) => {
      const now = Date.now();
      const activeId = state.activeConversationId;
      
      const newConversations: Record<string, Message[]> = {};
      const newActivity: Record<string, number> = {};
      
      for (const [convId, messages] of Object.entries(state.conversations)) {
        const lastActivity = state.conversationActivity[convId] || 0;
        const isActive = convId === activeId;
        const isExpired = now - lastActivity > CONVERSATION_TTL_MS;
        
        if (isActive || !isExpired) {
          newConversations[convId] = messages;
          newActivity[convId] = state.conversationActivity[convId] || now;
        }
      }
      
      return {
        conversations: newConversations,
        conversationActivity: newActivity
      };
    }),

  touchConversation: (conversationId) =>
    set((state) => ({
      conversationActivity: {
        ...state.conversationActivity,
        [conversationId]: Date.now()
      }
    })),
});
