/**
 * Conversations Service - Conversation management
 */

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Conversation, ConversationSummary, GroupMember } from "./types";

export const ConversationsService = {
  /**
   * Get or create a conversation for a specific project.
   */
  async getProjectConversation(projectId: string): Promise<Conversation | null> {
    const supabase = createSupabaseBrowserClient();
    
    const { data: conversationId, error } = await supabase.rpc('get_project_conversation', {
      p_project_id: projectId
    });

    if (error) {
      console.error("Error fetching project conversation:", error);
      return null;
    }

    if (!conversationId) return null;

    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .single();

    if (convError || !conversation) {
      console.error("Error fetching conversation details:", convError);
      return null;
    }

    return conversation as Conversation;
  },

  /**
   * Fetch list of conversations for the current user.
   */
  async getUserConversations(userId: string, supabaseClient?: any): Promise<ConversationSummary[]> {
    const supabase = supabaseClient || createSupabaseBrowserClient();
    
    const { data, error } = await supabase.rpc('get_user_conversations', {
      p_user_id: userId
    });
    
    if (error) {
      console.error("Error fetching conversations:", JSON.stringify(error));
      return [];
    }
    
    return data || [];
  },

  /**
   * Search conversations.
   */
  async searchConversations(userId: string, query: string): Promise<ConversationSummary[]> {
    const supabase = createSupabaseBrowserClient();
    
    const { data, error } = await supabase.rpc('search_user_conversations', {
      p_user_id: userId,
      p_query: query,
      p_limit: 50,
      p_offset: 0
    });

    if (error) {
      if (error.code === '42883') {
        console.warn("search_user_conversations RPC missing");
        return [];
      }
      console.error("Error searching conversations:", error);
      return [];
    }
    
    return data || [];
  },

  /**
   * Create or get existing direct conversation with another user.
   */
  async createDirectConversation(otherUserId: string): Promise<string | null> {
    const supabase = createSupabaseBrowserClient();
    
    const { data: conversationId, error } = await supabase.rpc('create_direct_conversation', {
      p_other_user_id: otherUserId
    });

    if (error) {
      console.error("Error creating direct conversation:", error);
      return null;
    }

    return conversationId;
  },

  /**
   * Get or create a direct conversation with another user.
   */
  async getOrCreateDirectConversation(currentUserId: string, otherUserId: string): Promise<{ id: string }> {
    const supabase = createSupabaseBrowserClient();
    
    // Try RPC first
    const { data: conversationId, error: rpcError } = await supabase.rpc('get_or_create_conversation', {
      current_user_id: currentUserId,
      target_user_id: otherUserId
    });

    if (!rpcError && conversationId) {
      return { id: conversationId };
    }

    // Fallback: manually check for existing conversation
    const { data: participants } = await supabase
      .from('conversation_participants')
      .select('conversation_id, user_id, conversations!inner(type)')
      .in('user_id', [currentUserId, otherUserId])
      .or('conversations.type.eq.direct,conversations.type.is.null');

    if (participants && participants.length >= 2) {
      const conversationMap = new Map<string, Set<string>>();
      participants.forEach((p: any) => {
        const convId = p.conversation_id;
        if (!conversationMap.has(convId)) {
          conversationMap.set(convId, new Set());
        }
        conversationMap.get(convId)!.add(p.user_id);
      });

      for (const [convId, userIds] of conversationMap.entries()) {
        if (userIds.has(currentUserId) && userIds.has(otherUserId)) {
          return { id: convId };
        }
      }
    }

    // Create new conversation
    const newConversationId = await this.createDirectConversation(otherUserId);
    if (!newConversationId) {
      throw new Error('Failed to create direct conversation');
    }
    
    return { id: newConversationId };
  },

  /**
   * Get list of users the current user is connected with.
   */
  async getConnectedUsers(userId: string): Promise<any[]> {
    const supabase = createSupabaseBrowserClient();
    
    const { data, error } = await supabase
      .from("connections")
      .select(`
        id,
        user_id,
        connected_user_id,
        profiles:user_id(id, full_name, username, avatar_url),
        connected_profiles:connected_user_id(id, full_name, username, avatar_url)
      `)
      .or(`user_id.eq.${userId},connected_user_id.eq.${userId}`)
      .eq("status", "accepted");

    if (error) {
      console.error("Error fetching connected users:", error);
      return [];
    }

    return (data || []).map((conn: any) => {
      return conn.user_id === userId ? conn.connected_profiles : conn.profiles;
    }).filter(u => u !== null);
  },

  /**
   * Search for users to chat with.
   */
  async searchUsers(query: string): Promise<any[]> {
    const supabase = createSupabaseBrowserClient();
    if (!query || query.length < 2) return [];

    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url, username')
      .ilike('full_name', `%${query}%`)
      .limit(5);

    if (error) {
      console.warn("User search failed:", error);
      return [];
    }
    
    return data || [];
  },

  /**
   * Join a user to the conversation.
   */
  async joinConversation(conversationId: string, userId: string): Promise<void> {
    const supabase = createSupabaseBrowserClient();
    
    const { data: conversation } = await supabase
      .from('conversations')
      .select('id, type')
      .eq('id', conversationId)
      .single();

    if (!conversation) return;
    
    // Ensure user is in conversation_participants
    await supabase
      .from('conversation_participants')
      .insert({ conversation_id: conversationId, user_id: userId })
      .select()
      .single()
      .then(({ error }) => {
        if (error && error.code !== '23505') {
          console.warn("Failed to add to conversation_participants:", error);
        }
      });
    
    // Add to conversation_members for groups
    if (conversation.type === 'group') {
      const { error } = await supabase
        .from('conversation_members')
        .insert({ conversation_id: conversationId, user_id: userId })
        .select()
        .single();
        
      if (error && error.code !== '23505') {
        console.error("Error joining conversation:", error);
      }
    }
  },

  /**
   * Helper to resolve a project ID from a slug or ID.
   */
  async resolveProjectId(idOrSlug: string): Promise<string | null> {
    const supabase = createSupabaseBrowserClient();
    
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);
    if (isUuid) return idOrSlug;

    const { data, error } = await supabase
      .from('projects')
      .select('id')
      .eq('slug', idOrSlug)
      .single();

    if (error || !data) return null;
    return data.id;
  },

  /**
   * Mark all messages in a conversation as read.
   */
  async markConversationRead(conversationId: string, userId: string): Promise<void> {
    const supabase = createSupabaseBrowserClient();
    
    const { error } = await supabase.rpc('mark_conversation_read', {
      p_conversation_id: conversationId,
      p_user_id: userId
    });

    if (error) {
      console.error("Error marking conversation as read:", error);
      throw error;
    }
  },

  /**
   * Create a group conversation.
   */
  async createGroupConversation(
    creatorId: string,
    name: string,
    description?: string,
    avatarUrl?: string,
    initialMemberIds?: string[]
  ): Promise<string | null> {
    const supabase = createSupabaseBrowserClient();
    
    const { data, error } = await supabase.rpc('create_group_conversation', {
      p_creator_id: creatorId,
      p_name: name,
      p_description: description || null,
      p_avatar_url: avatarUrl || null,
      p_initial_member_ids: initialMemberIds || []
    });

    if (error) {
      console.error("Error creating group conversation:", error);
      throw error;
    }

    return data || null;
  },

  /**
   * Add a member to a group conversation.
   */
  async addGroupMember(
    conversationId: string,
    userId: string,
    role: 'admin' | 'member' = 'member',
    addedBy?: string
  ): Promise<boolean> {
    const supabase = createSupabaseBrowserClient();
    
    const { data, error } = await supabase.rpc('add_group_member', {
      p_conversation_id: conversationId,
      p_user_id: userId,
      p_role: role,
      p_added_by: addedBy || null
    });

    if (error) {
      console.error("Error adding group member:", error);
      throw error;
    }

    return data === true;
  },

  /**
   * Remove a member from a group conversation.
   */
  async removeGroupMember(
    conversationId: string,
    userId: string,
    removedBy?: string
  ): Promise<boolean> {
    const supabase = createSupabaseBrowserClient();
    
    const { data, error } = await supabase.rpc('remove_group_member', {
      p_conversation_id: conversationId,
      p_user_id: userId,
      p_removed_by: removedBy || null
    });

    if (error) {
      console.error("Error removing group member:", error);
      throw error;
    }

    return data === true;
  },

  /**
   * Update group conversation settings.
   */
  async updateGroupSettings(
    conversationId: string,
    name?: string,
    description?: string,
    avatarUrl?: string,
    updatedBy?: string
  ): Promise<boolean> {
    const supabase = createSupabaseBrowserClient();
    
    const { data, error } = await supabase.rpc('update_group_settings', {
      p_conversation_id: conversationId,
      p_name: name || null,
      p_description: description || null,
      p_avatar_url: avatarUrl || null,
      p_updated_by: updatedBy || null
    });

    if (error) {
      console.error("Error updating group settings:", error);
      throw error;
    }

    return data === true;
  },

  /**
   * Get group members for a conversation.
   */
  async getGroupMembers(conversationId: string): Promise<GroupMember[]> {
    const supabase = createSupabaseBrowserClient();
    
    const { data, error } = await supabase
      .from('conversation_members')
      .select(`
        id,
        user_id,
        role,
        joined_at,
        added_by,
        profile:profiles!conversation_members_user_id_fkey (
          full_name,
          username,
          avatar_url
        )
      `)
      .eq('conversation_id', conversationId)
      .order('joined_at', { ascending: true });

    if (error) {
      console.error("Error fetching group members:", error);
      throw error;
    }

    return (data || []).map((member: any) => ({
      id: member.id,
      user_id: member.user_id,
      role: member.role,
      joined_at: member.joined_at,
      added_by: member.added_by,
      profile: member.profile || { full_name: null, username: null, avatar_url: null }
    }));
  }
};
