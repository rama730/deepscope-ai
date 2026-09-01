/**
 * Offline message support with queue management and sync
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { logger } from '@/lib/logger';

/**
 * Hook to manage offline message queuing and synchronization
 * 
 * Provides offline message support with automatic queuing when offline,
 * retry logic, and synchronization when connection is restored.
 * Includes caching for conversations and messages.
 * 
 * @returns Object containing online status, queue management functions, and cache access
 * @example
 * ```tsx
 * const { isOnline, queueMessage, processMessageQueue, getCachedMessages } = useOfflineMessages();
 * if (isOnline) {
 *   await sendMessage();
 * } else {
 *   queueMessage(messageData);
 * }
 * ```
 */

/**
 * Message attachment type
 */
interface MessageAttachment {
  id?: string;
  type: 'image' | 'file' | 'audio' | 'video';
  url: string;
  name: string;
  size?: number;
  thumbnail_url?: string;
  mime_type?: string;
}

/**
 * Queued message for offline sending
 */
interface QueuedMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  message_type: string;
  reply_to_id?: string;
  attachments?: MessageAttachment[];
  created_at: string;
  retry_count: number;
  status: 'pending' | 'sending' | 'failed' | 'sent';
}

interface CachedMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  message_type: string;
  created_at: string;
  sender_profile?: {
    full_name: string | null;
    username: string | null;
    avatar_url?: string | null;
  };
}

interface CachedConversation {
  conversation_id: string;
  other_user_id: string;
  other_name: string;
  other_username: string;
  last_message: string;
  last_at: string;
  unread_count: number;
  cached_at: string;
}

/**
 * Return type for offline messages hook
 */
interface UseOfflineMessagesReturn {
  isOnline: boolean;
  messageQueue: QueuedMessage[];
  cachedMessages: Record<string, CachedMessage[]>;
  cachedConversations: CachedConversation[];
  queueMessage: (message: Omit<QueuedMessage, 'id' | 'created_at' | 'retry_count' | 'status'>) => string;
  retryFailedMessages: () => void;
  clearQueue: () => void;
  syncWhenOnline: () => void;
  getCachedMessages: (conversationId: string) => CachedMessage[];
  cacheMessage: (message: CachedMessage) => void;
  cacheConversations: (conversations: CachedConversation[]) => void;
}

const STORAGE_KEYS = {
  MESSAGE_QUEUE: 'offline_message_queue',
  CACHED_MESSAGES: 'cached_messages',
  CACHED_CONVERSATIONS: 'cached_conversations',
  LAST_SYNC: 'last_sync_timestamp'
};

const MAX_RETRY_ATTEMPTS = 3;
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
const SYNC_INTERVAL = 30000; // 30 seconds

export function useOfflineMessages(): UseOfflineMessagesReturn {
  const [isOnline, setIsOnline] = useState(true); // Start with true to avoid hydration mismatch
  const [messageQueue, setMessageQueue] = useState<QueuedMessage[]>([]);
  const [cachedMessages, setCachedMessages] = useState<Record<string, CachedMessage[]>>({});
  const [cachedConversations, setCachedConversations] = useState<CachedConversation[]>([]);

  const supabase = createSupabaseBrowserClient();
  const syncIntervalRef = useRef<NodeJS.Timeout | undefined>(undefined);

  // Load data from localStorage on mount
  useEffect(() => {
    loadFromStorage();
  }, []);

  // Monitor online status
  useEffect(() => {
    // Set initial state on client
    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Set up sync interval when online
  useEffect(() => {
    if (isOnline && messageQueue.length > 0) {
      syncIntervalRef.current = setInterval(() => {
        processMessageQueue();
      }, SYNC_INTERVAL);

      // Process immediately
      processMessageQueue();
    } else {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
        syncIntervalRef.current = undefined;
      }
    }

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, [isOnline, messageQueue.length]);

  // Save to localStorage whenever data changes
  useEffect(() => {
    saveToStorage();
  }, [messageQueue, cachedMessages, cachedConversations]);

  const loadFromStorage = useCallback(() => {
    try {
      // Load message queue
      const storedQueue = localStorage.getItem(STORAGE_KEYS.MESSAGE_QUEUE);
      if (storedQueue) {
        setMessageQueue(JSON.parse(storedQueue));
      }

      // Load cached messages
      const storedMessages = localStorage.getItem(STORAGE_KEYS.CACHED_MESSAGES);
      if (storedMessages) {
        const parsed = JSON.parse(storedMessages);
        // Filter out expired cache
        const filtered: Record<string, CachedMessage[]> = {};
        Object.entries(parsed).forEach(([key, messages]: [string, unknown]) => {
          if (Array.isArray(messages)) {
            const messageArray = messages as CachedMessage[];
            filtered[key] = messageArray.filter((msg) => {
              const messageAge = Date.now() - new Date(msg.created_at).getTime();
              return messageAge < CACHE_DURATION;
            });
          }
        });
        setCachedMessages(filtered);
      }

      // Load cached conversations
      const storedConversations = localStorage.getItem(STORAGE_KEYS.CACHED_CONVERSATIONS);
      if (storedConversations) {
        const parsed = JSON.parse(storedConversations);
        // Filter out expired cache
        const filtered = parsed.filter((conv: CachedConversation) => {
          const cacheAge = Date.now() - new Date(conv.cached_at).getTime();
          return cacheAge < CACHE_DURATION;
        });
        setCachedConversations(filtered);
      }
    } catch (error) {
      // Failed to load from storage - will retry
      logger.error('Failed to load from storage', { 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  }, []);

  const saveToStorage = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.MESSAGE_QUEUE, JSON.stringify(messageQueue));
      localStorage.setItem(STORAGE_KEYS.CACHED_MESSAGES, JSON.stringify(cachedMessages));
      localStorage.setItem(STORAGE_KEYS.CACHED_CONVERSATIONS, JSON.stringify(cachedConversations));
      localStorage.setItem(STORAGE_KEYS.LAST_SYNC, Date.now().toString());
    } catch (error) {
      // Failed to save to storage - will retry
      logger.error('Failed to save to storage', { 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  }, [messageQueue, cachedMessages, cachedConversations]);

  const queueMessage = useCallback((messageData: Omit<QueuedMessage, 'id' | 'created_at' | 'retry_count' | 'status'>): string => {
    const queuedMessage: QueuedMessage = {
      ...messageData,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      created_at: new Date().toISOString(),
      retry_count: 0,
      status: 'pending'
    };

    setMessageQueue(prev => [...prev, queuedMessage]);

    // If online, try to send immediately
    if (isOnline) {
      setTimeout(() => processMessageQueue(), 100);
    }

    return queuedMessage.id;
  }, [isOnline]);

  const processMessageQueue = useCallback(async () => {
    if (!isOnline || messageQueue.length === 0) return;

    const pendingMessages = messageQueue.filter(msg => msg.status === 'pending' || msg.status === 'failed');

    for (const message of pendingMessages) {
      if (message.retry_count >= MAX_RETRY_ATTEMPTS) {
        // Mark as permanently failed
        setMessageQueue(prev => prev.map(msg =>
          msg.id === message.id
            ? { ...msg, status: 'failed' as const }
            : msg
        ));
        continue;
      }

      try {
        // Update status to sending
        setMessageQueue(prev => prev.map(msg =>
          msg.id === message.id
            ? { ...msg, status: 'sending' as const }
            : msg
        ));

        // Attempt to send message
        const { error } = await supabase
          .from('messages')
          .insert({
            conversation_id: message.conversation_id,
            sender_id: message.sender_id,
            content: message.content,
            message_type: message.message_type,
            reply_to_id: message.reply_to_id
          });

        if (error) {
          throw error;
        }

        // Success - remove from queue
        setMessageQueue(prev => prev.filter(msg => msg.id !== message.id));

        // Cache the sent message
        const cachedMessage: CachedMessage = {
          id: message.id,
          conversation_id: message.conversation_id,
          sender_id: message.sender_id,
          content: message.content,
          message_type: message.message_type,
          created_at: message.created_at
        };
        cacheMessage(cachedMessage);

      } catch (error) {
        // Failed to send queued message - will retry

        // Increment retry count and mark as failed
        setMessageQueue(prev => prev.map(msg =>
          msg.id === message.id
            ? {
              ...msg,
              status: 'failed' as const,
              retry_count: msg.retry_count + 1
            }
            : msg
        ));
      }
    }
  }, [isOnline, messageQueue, supabase]);

  const retryFailedMessages = useCallback(() => {
    setMessageQueue(prev => prev.map(msg =>
      msg.status === 'failed'
        ? { ...msg, status: 'pending' as const, retry_count: 0 }
        : msg
    ));

    if (isOnline) {
      setTimeout(() => processMessageQueue(), 100);
    }
  }, [isOnline, processMessageQueue]);

  const clearQueue = useCallback(() => {
    setMessageQueue([]);
    localStorage.removeItem(STORAGE_KEYS.MESSAGE_QUEUE);
  }, []);

  const syncWhenOnline = useCallback(async () => {
    if (!isOnline) return;

    try {
      // Process any queued messages
      await processMessageQueue();

      // Sync recent messages for active conversations
      const lastSync = localStorage.getItem(STORAGE_KEYS.LAST_SYNC);
      const lastSyncTime = lastSync ? new Date(parseInt(lastSync)) : new Date(Date.now() - CACHE_DURATION);

      // Get recent messages from server (only for conversations user is part of)
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Get user's conversations first
        interface ConversationParticipantRow {
          conversation_id: string;
        }
        
        const { data: userConversations } = await supabase
          .from('conversation_participants')
          .select('conversation_id')
          .eq('user_id', user.id);

        if (userConversations && userConversations.length > 0) {
          const participants = userConversations as ConversationParticipantRow[];
          const conversationIds = participants.map(c => c.conversation_id);
          
          interface MessageRow {
            id: string;
            conversation_id: string;
            sender_id: string;
            recipient_id: string;
            content: string;
            message_type: string;
            created_at: string;
            sender_profile?: {
              full_name: string | null;
              username: string | null;
              avatar_url: string | null;
            };
            [key: string]: unknown;
          }
          
          const { data: recentMessages } = await supabase
            .from('messages')
            .select(`
              *,
              sender_profile:sender_id(full_name, username, avatar_url)
            `)
            .in('conversation_id', conversationIds)
            .gte('created_at', lastSyncTime.toISOString())
            .order('created_at', { ascending: true });

          if (recentMessages) {
            // Update cached messages, avoiding duplicates
            const messages = recentMessages as MessageRow[];
            messages.forEach((message) => {
              // Check if message already exists in cache to prevent duplicates
              const existing = cachedMessages[message.conversation_id]?.find(m => m.id === message.id);
              if (!existing) {
                cacheMessage({
                  id: message.id,
                  conversation_id: message.conversation_id,
                  sender_id: message.sender_id,
                  content: message.content,
                  message_type: message.message_type,
                  created_at: message.created_at,
                  sender_profile: message.sender_profile
                });
              }
            });
          }
        }
      }

    } catch (error) {
      // Failed to sync when online - will retry on next online event
    }
  }, [isOnline, processMessageQueue, supabase]);

  const getCachedMessages = useCallback((conversationId: string): CachedMessage[] => {
    return cachedMessages[conversationId] || [];
  }, [cachedMessages]);

  const cacheMessage = useCallback((message: CachedMessage) => {
    setCachedMessages(prev => {
      const conversationMessages = prev[message.conversation_id] || [];
      const existingIndex = conversationMessages.findIndex(m => m.id === message.id);

      let updatedMessages;
      if (existingIndex >= 0) {
        // Update existing message
        updatedMessages = [...conversationMessages];
        updatedMessages[existingIndex] = message;
      } else {
        // Add new message
        updatedMessages = [...conversationMessages, message].sort((a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
      }

      return {
        ...prev,
        [message.conversation_id]: updatedMessages
      };
    });
  }, []);

  const cacheConversations = useCallback((conversations: CachedConversation[]) => {
    const conversationsWithTimestamp = conversations.map(conv => ({
      ...conv,
      cached_at: new Date().toISOString()
    }));
    setCachedConversations(conversationsWithTimestamp);
  }, []);

  return useMemo(() => ({
    isOnline,
    messageQueue,
    cachedMessages,
    cachedConversations,
    queueMessage,
    retryFailedMessages,
    clearQueue,
    syncWhenOnline,
    getCachedMessages,
    cacheMessage,
    cacheConversations
  }), [
    isOnline,
    messageQueue,
    cachedMessages,
    cachedConversations,
    queueMessage,
    retryFailedMessages,
    clearQueue,
    syncWhenOnline,
    getCachedMessages,
    cacheMessage,
    cacheConversations
  ]);
}
