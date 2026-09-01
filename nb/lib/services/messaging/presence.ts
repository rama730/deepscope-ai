/**
 * Presence Service - User presence and typing indicators
 */

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { RealtimeManager } from "@/lib/supabase/RealtimeManager";
import { ReadReceipt } from "./types";

export const PresenceService = {
  /**
   * Helper to fetch multiple user profiles in one batch.
   */
  async getUserProfilesBatch(userIds: string[]) {
    if (!userIds || userIds.length === 0) return [];
    
    const supabase = createSupabaseBrowserClient();
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, username, avatar_url, last_active_at')
      .in('id', userIds);

    if (error) {
      console.error("Error fetching batched profiles:", error);
      return [];
    }
    return data || [];
  },

  /**
   * Helper to fetch a sender's profile for real-time enrichment.
   */
  async getSenderProfile(userId: string) {
    const supabase = createSupabaseBrowserClient();
    const { data } = await supabase
      .from('profiles')
      .select('full_name, username, avatar_url')
      .eq('id', userId)
      .single();
    return data;
  },

  /**
   * Set typing indicator for a conversation.
   */
  async setTyping(conversationId: string, userId: string, isTyping: boolean): Promise<void> {
    const supabase = createSupabaseBrowserClient();
    
    const { error } = await supabase
      .from('typing_indicators')
      .upsert({
        conversation_id: conversationId,
        user_id: userId,
        is_typing: isTyping,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'conversation_id,user_id'
      });

    if (error) {
      console.error("Error setting typing indicator:", error);
    }
  },

  /**
   * Subscribe to typing indicators for a conversation.
   */
  subscribeToTyping(conversationId: string, onTypingChange: (userId: string, isTyping: boolean) => void): () => void {
    return RealtimeManager.subscribe(
      {
        event: '*',
        schema: 'public',
        table: 'typing_indicators',
        filter: `conversation_id=eq.${conversationId}`
      },
      (payload) => {
        if (payload.new) {
          onTypingChange((payload.new as any).user_id, (payload.new as any).is_typing);
        } else if (payload.old) {
          onTypingChange((payload.old as any).user_id, false);
        }
      }
    );
  },

  /**
   * Subscribe to typing indicators for ALL conversations (filtered by RLS or client-side).
   */
  subscribeToGlobalTyping(onTypingChange: (conversationId: string, userId: string, isTyping: boolean) => void): () => void {
    return RealtimeManager.subscribe(
      {
        event: '*',
        schema: 'public',
        table: 'typing_indicators'
      },
      (payload) => {
        const newData = payload.new as any;
        const oldData = payload.old as any;
        const conversationId = newData?.conversation_id || oldData?.conversation_id;
        const userId = newData?.user_id || oldData?.user_id;

        if (conversationId && userId) {
           const isTyping = newData?.is_typing ?? false;
           onTypingChange(conversationId, userId, isTyping);
        }
      }
    );
  },

  /**
   * Update user presence (last_active_at).
   */
  async updatePresence(): Promise<void> {
    try {
      const supabase = createSupabaseBrowserClient();
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { error } = await supabase.rpc('update_user_presence');
      if (error && (error.message || error.code)) {
        console.error("Error updating presence:", { message: error.message, code: error.code });
      }
    } catch (err) {
      // Silently catch unexpected errors
    }
  },

  /**
   * Get user profile with presence info.
   */
  async getUserProfile(userId: string): Promise<{ 
    id: string; 
    full_name?: string; 
    username?: string; 
    avatar_url?: string; 
    last_active_at?: string 
  } | null> {
    const supabase = createSupabaseBrowserClient();
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, username, avatar_url, last_active_at')
      .eq('id', userId)
      .single();

    if (error) {
      console.error("Error fetching user profile:", error);
      return null;
    }

    return data;
  },

  /**
   * Subscribe to presence updates for a user.
   */
  subscribeToPresence(userId: string, onPresenceChange: (lastActiveAt: string | null) => void): () => void {
    return RealtimeManager.subscribe(
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'profiles',
        filter: `id=eq.${userId}`
      },
      (payload) => {
        if (payload.new && 'last_active_at' in payload.new) {
          onPresenceChange(payload.new.last_active_at as string | null);
        }
      }
    );
  },

  /**
   * Subscribe to ALL presence updates (profile updates).
   * Useful for lists where we want to track multiple users without opening N channels.
   */
  subscribeToGlobalPresence(onPresenceChange: (userId: string, lastActiveAt: string | null) => void): () => void {
    return RealtimeManager.subscribe(
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'profiles'
      },
      (payload) => {
        if (payload.new && 'id' in payload.new) {
          onPresenceChange(payload.new.id, payload.new.last_active_at as string | null);
        }
      }
    );
  },

  /**
   * Get read receipts for a message.
   */
  async getReadReceipts(messageId: string): Promise<ReadReceipt[]> {
    const supabase = createSupabaseBrowserClient();
    const { data, error } = await supabase
      .from('message_read_receipts')
      .select(`
        user_id,
        read_at,
        profiles:user_id (
          full_name,
          username,
          avatar_url
        )
      `)
      .eq('message_id', messageId)
      .order('read_at', { ascending: false });

    if (error) {
      console.error("Error fetching read receipts:", error);
      return [];
    }

    return (data || []).map((receipt: any) => ({
      user_id: receipt.user_id,
      read_at: receipt.read_at,
      user_profile: receipt.profiles ? {
        full_name: receipt.profiles.full_name,
        username: receipt.profiles.username,
        avatar_url: receipt.profiles.avatar_url
      } : undefined
    }));
  },

  /**
   * Subscribe to read receipts for a message.
   * Uses single '*' event binding to avoid binding mismatch errors.
   */
  subscribeToReadReceipts(
    messageId: string,
    onReadReceiptChange: (receipt: { user_id: string; read_at: string }) => void
  ): () => void {
    return RealtimeManager.subscribe(
      {
        event: '*',
        schema: 'public',
        table: 'message_read_receipts',
        filter: `message_id=eq.${messageId}`
      },
      (payload) => {
        // Handle both INSERT and UPDATE events
        if ((payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') && payload.new) {
          onReadReceiptChange({
            user_id: payload.new.user_id as string,
            read_at: payload.new.read_at as string
          });
        }
      }
    );
  }
};
