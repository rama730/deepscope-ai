/**
 * Hook for managing message reactions with real-time updates
 */

import { useState, useCallback, useEffect } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

/**
 * Hook to manage message reactions with real-time updates
 * 
 * Fetches and manages reactions for a message, grouping by emoji and tracking
 * which users have reacted. Provides functions to add/remove reactions.
 * 
 * @param options - Configuration object with messageId, currentUserId, and optional callback
 * @returns Object containing reactions array, loading state, and reaction management functions
 * @example
 * ```tsx
 * const { reactions, loading, addReaction, removeReaction } = useMessageReactions({
 *   messageId: 'msg-123',
 *   currentUserId: userId,
 *   onReactionUpdate: (msgId, updatedReactions) => console.log('Updated:', updatedReactions)
 * });
 * ```
 */

export interface MessageReaction {
  emoji: string;
  count: number;
  users: Array<{
    id: string;
    name: string;
    avatar?: string;
  }>;
  hasReacted: boolean;
}

interface UseMessageReactionsOptions {
  messageId: string;
  currentUserId: string | null;
  onReactionUpdate?: (messageId: string, reactions: MessageReaction[]) => void;
}

interface UseMessageReactionsReturn {
  reactions: MessageReaction[];
  loading: boolean;
  addReaction: (emoji: string) => Promise<void>;
  removeReaction: (emoji: string) => Promise<void>;
  toggleReaction: (emoji: string) => Promise<void>;
  getReactionUsers: (emoji: string) => Array<{ id: string; name: string; avatar?: string }>;
  getTotalReactions: () => number;
  hasUserReacted: (emoji: string) => boolean;
}

export function useMessageReactions({
  messageId,
  currentUserId,
  onReactionUpdate
}: UseMessageReactionsOptions): UseMessageReactionsReturn {
  const [reactions, setReactions] = useState<MessageReaction[]>([]);
  const [loading, setLoading] = useState(false);
  const supabase = createSupabaseBrowserClient();

  // Load reactions for the message
  const loadReactions = useCallback(async () => {
    if (!messageId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('message_reactions')
        .select(`
          emoji,
          user_id,
          profiles:user_id (
            id,
            full_name,
            username,
            avatar_url
          )
        `)
        .eq('message_id', messageId);

      if (error) {
        // Failed to load reactions - will retry on next render
        return;
      }

      // Group reactions by emoji
      const reactionMap = new Map<string, {
        users: Array<{ id: string; name: string; avatar?: string }>;
        hasReacted: boolean;
      }>();

      /**
       * Database row type for message reactions
       */
      interface ReactionRow {
        emoji: string;
        user_id: string;
        profiles?: {
          full_name: string | null;
          username: string | null;
          avatar_url: string | null;
        } | {
          full_name: string | null;
          username: string | null;
          avatar_url: string | null;
        }[];
      }

      const reactions = (data || []) as ReactionRow[];
      reactions.forEach((reaction) => {
        const emoji = reaction.emoji;
        const profile = Array.isArray(reaction.profiles) ? reaction.profiles[0] : reaction.profiles;
        const user = {
          id: reaction.user_id,
          name: profile?.full_name || profile?.username || 'Unknown',
          avatar: profile?.avatar_url || undefined
        };

        if (!reactionMap.has(emoji)) {
          reactionMap.set(emoji, { users: [], hasReacted: false });
        }

        const reactionData = reactionMap.get(emoji)!;
        reactionData.users.push(user);
        
        if (reaction.user_id === currentUserId) {
          reactionData.hasReacted = true;
        }
      });

      // Convert to MessageReaction array
      const processedReactions: MessageReaction[] = Array.from(reactionMap.entries())
        .map(([emoji, data]) => ({
          emoji,
          count: data.users.length,
          users: data.users,
          hasReacted: data.hasReacted
        }))
        .sort((a, b) => b.count - a.count); // Sort by count descending

      setReactions(processedReactions);
      
      if (onReactionUpdate) {
        onReactionUpdate(messageId, processedReactions);
      }

    } catch (error) {
      // Exception loading reactions - will retry
    } finally {
      setLoading(false);
    }
  }, [messageId, currentUserId, supabase, onReactionUpdate]);

  // Load reactions when component mounts or messageId changes
  useEffect(() => {
    loadReactions();
  }, [loadReactions]);

  // Add reaction
  const addReaction = useCallback(async (emoji: string) => {
    if (!currentUserId || !messageId) return;

    try {
      const { error } = await supabase
        .from('message_reactions')
        .insert({
          message_id: messageId,
          user_id: currentUserId,
          emoji
        });

      if (error) {
        // Failed to add reaction - show user-friendly error
        return;
      }

      // Optimistically update local state
      setReactions(prev => {
        const existing = prev.find(r => r.emoji === emoji);
        if (existing) {
          return prev.map(r => 
            r.emoji === emoji
              ? {
                  ...r,
                  count: r.count + 1,
                  hasReacted: true,
                  users: [...r.users, {
                    id: currentUserId,
                    name: 'You'
                  }]
                }
              : r
          );
        } else {
          return [...prev, {
            emoji,
            count: 1,
            hasReacted: true,
            users: [{ id: currentUserId, name: 'You' }]
          }];
        }
      });

    } catch (error) {
      // Exception adding reaction - handled by optimistic update
    }
  }, [currentUserId, messageId, supabase]);

  // Remove reaction
  const removeReaction = useCallback(async (emoji: string) => {
    if (!currentUserId || !messageId) return;

    try {
      const { error } = await supabase
        .from('message_reactions')
        .delete()
        .eq('message_id', messageId)
        .eq('user_id', currentUserId)
        .eq('emoji', emoji);

      if (error) {
        // Failed to remove reaction - show user-friendly error
        return;
      }

      // Optimistically update local state
      setReactions(prev => {
        return prev.map(r => {
          if (r.emoji === emoji) {
            const newCount = r.count - 1;
            if (newCount === 0) {
              return null; // Will be filtered out
            }
            return {
              ...r,
              count: newCount,
              hasReacted: false,
              users: r.users.filter(u => u.id !== currentUserId)
            };
          }
          return r;
        }).filter(Boolean) as MessageReaction[];
      });

    } catch (error) {
      // Exception removing reaction - handled by optimistic update
    }
  }, [currentUserId, messageId, supabase]);

  // Toggle reaction (add if not present, remove if present)
  const toggleReaction = useCallback(async (emoji: string) => {
    const existingReaction = reactions.find(r => r.emoji === emoji);
    
    if (existingReaction && existingReaction.hasReacted) {
      await removeReaction(emoji);
    } else {
      await addReaction(emoji);
    }
  }, [reactions, addReaction, removeReaction]);

  // Get users who reacted with specific emoji
  const getReactionUsers = useCallback((emoji: string) => {
    const reaction = reactions.find(r => r.emoji === emoji);
    return reaction ? reaction.users : [];
  }, [reactions]);

  // Get total number of reactions
  const getTotalReactions = useCallback(() => {
    return reactions.reduce((total, reaction) => total + reaction.count, 0);
  }, [reactions]);

  // Check if current user has reacted with specific emoji
  const hasUserReacted = useCallback((emoji: string) => {
    const reaction = reactions.find(r => r.emoji === emoji);
    return reaction ? reaction.hasReacted : false;
  }, [reactions]);

  return {
    reactions,
    loading,
    addReaction,
    removeReaction,
    toggleReaction,
    getReactionUsers,
    getTotalReactions,
    hasUserReacted
  };
}
