/**
 * Reactions Service - Message reactions
 */

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { RealtimeManager } from "@/lib/supabase/RealtimeManager";
import { MessageReaction } from "./types";

export const ReactionsService = {
  /**
   * Add or remove a reaction to a message.
   */
  async toggleReaction(messageId: string, emoji: string, userId: string): Promise<void> {
    const supabase = createSupabaseBrowserClient();
    
    // Check if reaction already exists
    const { data: existing, error: checkError } = await supabase
      .from('message_reactions')
      .select('id')
      .eq('message_id', messageId)
      .eq('user_id', userId)
      .eq('emoji', emoji)
      .maybeSingle();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error("Error checking existing reaction:", checkError);
      throw checkError;
    }

    if (existing) {
      // Remove reaction
      const { error } = await supabase
        .from('message_reactions')
        .delete()
        .eq('id', existing.id);

      if (error) {
        console.error("Error removing reaction:", error);
        throw error;
      }
    } else {
      // Add reaction
      const { error } = await supabase
        .from('message_reactions')
        .upsert({
          message_id: messageId,
          user_id: userId,
          emoji: emoji
        }, {
          onConflict: 'message_id,user_id,emoji'
        });

      if (error) {
        console.error("Error adding reaction:", error);
        throw error;
      }
    }
  },

  /**
   * Get all reactions for a message.
   */
  async getReactions(messageId: string): Promise<MessageReaction[]> {
    const supabase = createSupabaseBrowserClient();
    
    const { data, error } = await supabase
      .from('message_reactions')
      .select('id, message_id, user_id, emoji, created_at')
      .eq('message_id', messageId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error("Error fetching reactions:", error);
      return [];
    }

    return (data || []) as MessageReaction[];
  },

  /**
   * Subscribe to reactions for a conversation.
   */
  subscribeToReactions(
    conversationId: string,
    onReactionChange: (reaction: MessageReaction, type: 'added' | 'removed') => void
  ): () => void {
    const supabase = createSupabaseBrowserClient();

    return RealtimeManager.subscribe(
      {
        event: '*',
        schema: 'public',
        table: 'message_reactions'
      },
      async (payload) => {
        // Check if the reaction's message belongs to this conversation
        const { data: message } = await supabase
          .from('messages')
          .select('conversation_id')
          .eq('id', (payload.new as any)?.message_id || (payload.old as any)?.message_id)
          .single();

        if (message && message.conversation_id === conversationId) {
          const newData = payload.new as any;
          const oldData = payload.old as any;
          
          if (payload.eventType === 'INSERT' && newData) {
            onReactionChange(newData as MessageReaction, 'added');
          } else if (payload.eventType === 'DELETE' && oldData) {
            onReactionChange(oldData as MessageReaction, 'removed');
          }
        }
      }
    );
  }
};
