/**
 * Messages Service - Message CRUD and subscriptions
 */

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Message, MessageAttachment, AttachmentInput, SearchMessageResult } from "./types";

export const MessagesService = {
  /**
   * Fetch messages for a conversation with pagination support.
   */
  async getMessages(
    conversationId: string,
    options?: {
      limit?: number;
      before?: string;
      after?: string;
      includeDetails?: boolean;
    }
  ): Promise<Message[]> {
    const supabase = createSupabaseBrowserClient();
    const limit = options?.limit || 50;
    
    let rpcData: any[] | null = null;
    
    // Try RPC first
    try {
      const { data, error } = await supabase.rpc('get_messages_with_details', {
        conv_id: conversationId,
        limit_count: limit,
        before_timestamp: options?.before || null,
      });
      
      // Store RPC data to process later if success
      if (!error && data) {
        rpcData = data;
      }
    } catch (rpcError) {
      console.warn("RPC get_messages_with_details failed, falling back:", rpcError);
    }

    // Unified processing of messages (from either RPC or fallback)
    let processedMessages: Message[] = [];
    
    if (rpcData) {
      processedMessages = rpcData.map((msg: any) => ({
        id: msg.id,
        conversation_id: msg.conversation_id,
        sender_id: msg.sender_id,
        content: msg.content,
        created_at: msg.created_at,
        reply_to_message_id: msg.reply_to_id || msg.reply_to_message_id,
        is_edited: msg.is_edited || false,
        edited_at: msg.edited_at,
        deleted_at: msg.deleted_at,
        sender_profile: msg.sender_profile || (msg.sender_avatar ? {
          full_name: msg.sender_name,
          username: msg.sender_username,
          avatar_url: msg.sender_avatar
        } : undefined),
        sender_name: msg.sender_name || msg.sender_profile?.full_name || msg.sender_profile?.username,
        // Carry over task IDs if present in raw RPC
        mentioned_task_ids: msg.mentioned_task_ids
      })) as unknown as Message[]; // cast intermediate type
    } else {
      // Fallback query
      const { data: messages, error: messagesError } = await supabase
        .from('messages')
        .select(`
          id, conversation_id, sender_id, content, created_at, reply_to_message_id, is_edited, edited_at, deleted_at, mentioned_task_ids,
          sender:profiles!messages_sender_id_fkey (
            full_name,
            username,
            avatar_url
          )
        `)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true }); // Fallback usually orders ASC, but Virtuoso likes specific order. 
        // NOTE: The RPC usually handles sorting. For fallback, we'll keep ASC.

      if (messagesError || !messages) return [];
      
      processedMessages = messages.map((msg: any) => ({
        ...msg,
        sender_profile: msg.sender ? {
          full_name: msg.sender.full_name,
          username: msg.sender.username,
          avatar_url: msg.sender.avatar_url
        } : undefined,
        sender_name: msg.sender?.full_name || msg.sender?.username
      })) as unknown as Message[];
    }

    if (processedMessages.length === 0) return [];

    // PARALLEL: Fetch Attachments & Tasks if requested or by default
    // We do this here to avoid the "Waterfall" in the UI component
    const messageIds = processedMessages.map(m => m.id);
    const mentionedTaskIds = new Set<string>();
    processedMessages.forEach((m: any) => {
      if (Array.isArray(m.mentioned_task_ids)) {
        m.mentioned_task_ids.forEach((tid: string) => mentionedTaskIds.add(tid));
      }
    });

    const [attachmentsMap, tasksMap] = await Promise.all([
      this.getMessageAttachmentsBatch(messageIds),
      mentionedTaskIds.size > 0 ? this.getTaskDetailsBatch(Array.from(mentionedTaskIds)) : Promise.resolve(new Map())
    ]);

    // Merge back
    return processedMessages.map(msg => ({
      ...msg,
      attachments: attachmentsMap.get(msg.id) || [],
      mentioned_tasks: (msg as any).mentioned_task_ids?.map((tid: string) => tasksMap.get(tid)).filter(Boolean) || []
    }));
  },

  /**
   * Batch fetch task details.
   */
  async getTaskDetailsBatch(taskIds: string[]): Promise<Map<string, { id: string; title: string; status: string; project_id: string }>> {
    if (taskIds.length === 0) return new Map();
    const supabase = createSupabaseBrowserClient();
    const { data } = await supabase
      .from('project_tasks')
      .select('id, title, status, project_id')
      .in('id', taskIds);
      
    const map = new Map();
    data?.forEach(t => map.set(t.id, t));
    return map;
  },

  /**
   * Send a message to a conversation.
   */
  async sendMessage(
    conversationId: string, 
    content: string, 
    senderId: string, 
    replyToMessageId?: string, 
    mentionedTaskIds?: string[],
    _recipientId?: string // Optional, for backward compatibility
  ): Promise<Message | null> {
    const supabase = createSupabaseBrowserClient();
    const messageContent = content.trim() || "📎 Attachment";
    
    const { data, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        content: messageContent,
        sender_id: senderId,
        reply_to_message_id: replyToMessageId || null,
        mentioned_task_ids: mentionedTaskIds?.length ? mentionedTaskIds : null
      })
      .select()
      .single();

    if (error) {
      console.error("Error sending message:", JSON.stringify(error, null, 2));
      throw error;
    }

    // Create task mentions if provided
    if (data && mentionedTaskIds?.length) {
      const taskMentions = mentionedTaskIds.map(taskId => ({
        message_id: data.id,
        task_id: taskId
      }));

      await supabase.from('message_task_mentions').insert(taskMentions);
    }

    return data as Message;
  },

  /**
   * Send a message with attachments.
   */
  async sendMessageWithAttachments(
    conversationId: string, 
    content: string, 
    senderId: string, 
    attachments: AttachmentInput[],
    replyToMessageId?: string,
    mentionedTaskIds?: string[],
    _recipientId?: string // Optional, for backward compatibility
  ): Promise<Message | null> {
    const supabase = createSupabaseBrowserClient();
    
    const message = await this.sendMessage(conversationId, content, senderId, replyToMessageId, mentionedTaskIds);
    if (!message) return null;

    if (attachments.length > 0) {
      const attachmentsToInsert = attachments.map(att => ({
        message_id: message.id,
        file_name: att.file_name,
        file_type: att.file_type,
        file_size: att.file_size,
        file_url: att.file_url,
        thumbnail_url: att.thumbnail_url || null,
        mime_type: att.mime_type || null
      }));

      const { error: attachError } = await supabase
        .from('message_attachments')
        .insert(attachmentsToInsert);

      if (attachError) {
        console.error("Error creating attachments:", attachError);
        throw new Error(`Failed to create attachments: ${attachError.message}`);
      }
    }

    return message;
  },

  /**
   * Edit a message.
   */
  async editMessage(messageId: string, newContent: string): Promise<Message | null> {
    const supabase = createSupabaseBrowserClient();
    
    const { data, error } = await supabase
      .from('messages')
      .update({
        content: newContent,
        is_edited: true,
        edited_at: new Date().toISOString()
      })
      .eq('id', messageId)
      .select()
      .single();

    if (error) {
      console.error("Error editing message:", error);
      throw error;
    }

    return data as Message;
  },

  /**
   * Delete a message (hard delete).
   */
  async deleteMessage(messageId: string): Promise<void> {
    const supabase = createSupabaseBrowserClient();
    
    const { error } = await supabase
      .from('messages')
      .delete()
      .eq('id', messageId);

    if (error) {
      console.error("Error deleting message:", error);
      throw error;
    }
  },

  /**
   * Get attachments for a message.
   */
  async getMessageAttachments(messageId: string): Promise<MessageAttachment[]> {
    const supabase = createSupabaseBrowserClient();
    
    try {
      const { data, error } = await supabase
        .from('message_attachments')
        .select('id, message_id, file_name, file_type, file_size, file_url, thumbnail_url, mime_type, created_at')
        .eq('message_id', messageId)
        .order('created_at', { ascending: true });

      if (error) {
        console.warn("Error fetching attachments:", error);
        return [];
      }

      return (data || []) as MessageAttachment[];
    } catch (err) {
      console.warn("Exception fetching attachments:", err);
      return [];
    }
  },

  /**
   * Batch fetch attachments for multiple messages.
   */
  async getMessageAttachmentsBatch(messageIds: string[]): Promise<Map<string, MessageAttachment[]>> {
    if (messageIds.length === 0) return new Map();
    
    const supabase = createSupabaseBrowserClient();
    
    try {
      const { data, error } = await supabase
        .from('message_attachments')
        .select('id, message_id, file_name, file_type, file_size, file_url, thumbnail_url, mime_type, created_at')
        .in('message_id', messageIds)
        .order('created_at', { ascending: true });

      if (error) {
        console.warn("Error batch fetching attachments:", error);
        return new Map();
      }

      // Group by message_id
      const result = new Map<string, MessageAttachment[]>();
      for (const att of data || []) {
        const existing = result.get(att.message_id) || [];
        existing.push(att as MessageAttachment);
        result.set(att.message_id, existing);
      }
      
      return result;
    } catch (err) {
      console.warn("Exception batch fetching attachments:", err);
      return new Map();
    }
  },

  /**
   * Forward a message to another conversation.
   */
  async forwardMessage(
    messageId: string,
    targetConversationId: string,
    userId: string,
    context?: string,
    attachments?: AttachmentInput[]
  ): Promise<Message | null> {
    const supabase = createSupabaseBrowserClient();
    
    const { data: originalMessage, error: fetchError } = await supabase
      .from('messages')
      .select('*, message_attachments(*)')
      .eq('id', messageId)
      .single();

    if (fetchError || !originalMessage) {
      console.error("Error fetching original message:", fetchError);
      return null;
    }

    const forwardedContent = context 
      ? `${context}\n\n--- Forwarded message ---\n${originalMessage.content}`
      : `--- Forwarded message ---\n${originalMessage.content}`;

    const { data: forwardedMessage, error: forwardError } = await supabase
      .from('messages')
      .insert({
        conversation_id: targetConversationId,
        sender_id: userId,
        content: forwardedContent,
        forwarded_from_message_id: messageId,
        forwarded_from_conversation_id: originalMessage.conversation_id,
        forwarded_by: userId,
        forward_context: context || null,
        mentioned_task_ids: (originalMessage as any).mentioned_task_ids || null
      })
      .select()
      .single();

    if (forwardError || !forwardedMessage) {
      console.error("Error forwarding message:", forwardError);
      return null;
    }

    // Forward attachments
    const attachmentsToForward = attachments || (originalMessage.message_attachments || []);
    if (attachmentsToForward.length > 0) {
      const attachmentsToInsert = attachmentsToForward.map((att: any) => ({
        message_id: forwardedMessage.id,
        file_name: att.file_name,
        file_type: att.file_type || 'file',
        file_size: att.file_size || null,
        file_url: att.file_url,
        thumbnail_url: att.thumbnail_url || null,
        mime_type: att.mime_type || null
      }));

      await supabase.from('message_attachments').insert(attachmentsToInsert);
    }

    return forwardedMessage as Message;
  },

  /**
   * Search messages with filters.
   */
  async searchMessages(
    userId: string,
    query?: string,
    filters?: {
      conversationId?: string;
      senderId?: string;
      dateFrom?: string;
      dateTo?: string;
      hasAttachments?: boolean;
      hasMentions?: boolean;
      limit?: number;
      offset?: number;
    }
  ): Promise<SearchMessageResult[]> {
    const supabase = createSupabaseBrowserClient();
    
    const { data, error } = await supabase.rpc('search_messages', {
      p_user_id: userId,
      p_query: query || null,
      p_conversation_id: filters?.conversationId || null,
      p_sender_id: filters?.senderId || null,
      p_date_from: filters?.dateFrom || null,
      p_date_to: filters?.dateTo || null,
      p_has_attachments: filters?.hasAttachments ?? null,
      p_has_mentions: filters?.hasMentions ?? null,
      p_limit: filters?.limit || 50,
      p_offset: filters?.offset || 0
    });

    if (error) {
      console.error("Error searching messages:", error);
      throw error;
    }

    return (data || []) as SearchMessageResult[];
  },

  /**
   * Subscribe to messages for a conversation.
   * Uses single '*' event binding to avoid binding mismatch errors.
   */
  subscribeToMessages(
    conversationId: string, 
    callbacks: {
      onNewMessage?: (message: Message) => void;
      onMessageUpdate?: (message: Message) => void;
      onMessageDelete?: (messageId: string) => void;
    }
  ): () => void {
    const supabase = createSupabaseBrowserClient();
    
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'messages', 
          filter: `conversation_id=eq.${conversationId}` 
        },
        (payload) => {
          const eventType = payload.eventType;
          
          if (eventType === 'INSERT' && callbacks.onNewMessage) {
            callbacks.onNewMessage(payload.new as Message);
          } else if (eventType === 'UPDATE' && callbacks.onMessageUpdate) {
            callbacks.onMessageUpdate(payload.new as Message);
          } else if (eventType === 'DELETE' && callbacks.onMessageDelete) {
            // For DELETE, conversation_id may be in old payload or we match all deletes for this channel
            const deletedMessage = payload.old as any;
            if (deletedMessage?.id) {
              callbacks.onMessageDelete(deletedMessage.id);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },

  /**
   * Mark a message as read.
   */
  async markMessageAsRead(messageId: string, userId: string): Promise<void> {
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.rpc('mark_message_read', {
      p_message_id: messageId,
      p_user_id: userId
    });
    if (error) {
      console.error("Error marking message as read:", error);
      throw error;
    }
  }
};
