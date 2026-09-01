import { useState, useEffect, useCallback } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { useToast } from '@/components/ui-custom/Toast';
import { useRealtimeRouterSubscription } from '@/hooks/useRealtimeRouterSubscription';

export interface UnifiedMessage {
  id: string;
  sender_id: string;
  sender_profile?: {
    full_name: string | null;
    username: string | null;
    avatar_url?: string | null;
  };
  content: string;
  message_type: 'text' | 'image' | 'file' | 'audio' | 'video' | 'system';
  created_at: string;
  is_edited: boolean;
  reply_to_id?: string;
  reply_to?: {
    id: string;
    content: string;
    sender_name: string;
  };
  task_id?: string;
  message_metadata?: {
      task_snapshot?: {
          title: string;
          status: string;
      }
      [key: string]: any;
  };
  attachments?: any[];
  reactions?: any[];
}

interface UseUnifiedMessagesProps {
  context: {
    type: 'project' | 'dm';
    id: string;
  } | null;
}

export function useUnifiedMessages({ context }: UseUnifiedMessagesProps) {
  const supabase = createSupabaseBrowserClient();
  const { showToast } = useToast();
  const [messages, setMessages] = useState<UnifiedMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // Load current user
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id || null));
  }, [supabase]);

  const contextType = context?.type;
  const contextId = context?.id;

  // Helper: Normalize Message
  const normalizeMessage = useCallback((m: any, type: 'project' | 'dm'): UnifiedMessage => {
    if (type === 'dm') {
      return {
        ...m,
        sender_profile: {
          full_name: m.sender_name || m.sender_profile?.full_name,
          username: m.sender_username || m.sender_profile?.username,
          avatar_url: m.sender_avatar || m.sender_profile?.avatar_url
        }
      };
    }
    return {
      ...m,
      sender_profile: m.sender_profile || m.profiles,
    };
  }, []);

  // Load messages
  const loadMessages = useCallback(async (isSilent = false) => {
    if (!contextType || !contextId) return;
    if (!isSilent) setLoading(true);

    try {
      let data: any[] = [];
      let error: any = null;

      if (contextType === 'project') {
        const result = await supabase
          .from('project_chat_messages')
          .select(`
            *,
            sender_profile:profiles(full_name, username, avatar_url),
            attachments:project_chat_attachments(*),
            reactions:project_chat_reactions(*)
          `)
          .eq('project_id', contextId)
          .order('created_at', { ascending: false })
          .limit(50);
        
        data = result.data || [];
        error = result.error;

      } else {
        // DM Logic
         const result = await supabase
          .rpc('get_messages_with_details', {
            conv_id: contextId,
            limit_count: 50
          });
         data = result.data || [];
         error = result.error;
      }

      if (error) throw error;

      // Check for missing profiles (DM specifically where RPC might fail to join)
      const missingProfileIds = new Set<string>();
      data.forEach(m => {
          if (contextType === 'dm' && !m.sender_name && !m.sender_username) {
             if (m.sender_id) missingProfileIds.add(m.sender_id);
          }
      });

      let profilesMap: Record<string, any> = {};
      if (missingProfileIds.size > 0) {
          const { data: profiles } = await supabase
              .from('profiles')
              .select('id, full_name, username, avatar_url')
              .in('id', Array.from(missingProfileIds));
          
          profiles?.forEach(p => {
              profilesMap[p.id] = p;
          });
      }

      // Normalize
      const normalized = data.map(m => {
          let msg = m;
          // Apply fallback profile if needed
          if (contextType === 'dm' && missingProfileIds.has(m.sender_id) && profilesMap[m.sender_id]) {
               msg = {
                   ...m,
                   sender_name: profilesMap[m.sender_id].full_name,
                   sender_username: profilesMap[m.sender_id].username,
                   sender_avatar: profilesMap[m.sender_id].avatar_url,
                   sender_profile: profilesMap[m.sender_id] // Also set this for consistency
               };
          }
          return normalizeMessage(msg, contextType);
      }).reverse();

      setMessages(normalized);
    } catch (err: any) {
      console.error("Error loading messages detailed:", JSON.stringify(err, null, 2), {
          type: contextType,
          id: contextId
      });
    } finally {
      setLoading(false);
    }
  }, [contextType, contextId, supabase, normalizeMessage]);

  useEffect(() => {
    // Reset messages when context changes
    setMessages([]);
    loadMessages();
  }, [loadMessages, contextId]); // Add contextId to dependency to ensure reload on switch

  // Send Message
  const sendMessage = useCallback(async (content: string, attachments: File[] = [], linkedTask?: { id: string, title: string }) => {
    if (!context || !userId) return;

    try {
      // 1. Upload Attachments First
      if (attachments.length > 0) {
        // ... upload logic (simplified, assuming handled elsewhere or TODO) ...
      }

      let newMessage: any = null;

      // 2. Insert Message
      if (context.type === 'project') {
          const metadata: any = {};
          if (linkedTask) {
              metadata.task_snapshot = {
                  title: linkedTask.title,
                  status: 'open' 
              };
          }

          const { data, error } = await supabase.from('project_chat_messages').insert({
              project_id: context.id,
              sender_id: userId,
              content,
              message_type: attachments.length > 0 ? 'file' : 'text',
              task_id: linkedTask?.id || null,
              message_metadata: metadata
          })
          .select(`
            *,
            sender_profile:profiles(full_name, username, avatar_url),
            attachments:project_chat_attachments(*),
            reactions:project_chat_reactions(*)
          `)
          .single();

          if (error) throw error;
          newMessage = data;

      } else {
          // Send DM
          const { data, error } = await supabase.from('messages').insert({
              conversation_id: context.id,
              sender_id: userId,
              content
          })
          .select()
          .single();

          if (error) throw error;
          
          // For DMs we might not get the join back immediately without complexity, 
          // so we patch it with current user info since we are the sender
          if (data) {
             // Fetch our own profile from cache or optimistic
             // For now, let's just make sure we display something
             // In a perfect world we fetch the profile, but let's rely on the fact we know who we are
             newMessage = {
                 ...data,
                 sender_profile: {
                     // We can fetch this from an auth hook context if available, 
                     // but for now let's hope the loadMessages catches up or we do a quick hack
                     // better: trigger a silent reload or just push what we have
                 }
             };
             // Actually, simplest is to just reload silent, BUT to be instant:
             // We need our profile. 
          }
      }

      // Optimistic / Immediate Update
      if (newMessage) {
           // If we don't have sender profile in response (common for simple inserts), add it
           if (!newMessage.sender_profile) {
               // Try to find from existing messages or fetch? 
               // Best effort:
               const { data: userProfile } = await supabase.from('profiles').select('*').eq('id', userId).single();
               newMessage.sender_profile = userProfile;
               if (context.type === 'dm') {
                   newMessage.sender_name = userProfile?.full_name;
                   newMessage.sender_username = userProfile?.username;
                   newMessage.sender_avatar = userProfile?.avatar_url;
               }
           }

           const normalized = normalizeMessage(newMessage, context.type);
           setMessages(prev => [...prev, normalized]);
      } else {
          // Fallback if no data returned
          loadMessages(true);
      }

    } catch (err) {
      console.error("Error sending message:", err);
      showToast("Failed to send message", "error");
    }
  }, [context, userId, supabase, showToast, normalizeMessage, loadMessages]);

  const deleteMessage = useCallback(async (messageId: string) => {
      if (!context) return;
      
      // Optimistic Update: Immediately remove from UI
      setMessages(prev => prev.filter(m => m.id !== messageId));

      try {
          if (context.type === 'project') {
             const { error } = await supabase.from('project_chat_messages').delete().eq('id', messageId);
             if (error) throw error;
          } else {
              const { error } = await supabase.from('messages').delete().eq('id', messageId);
              if (error) throw error;
          }
      } catch (error) {
          console.error("Error deleting message:", error);
          showToast("Failed to delete message", "error");
          // Re-fetch to restore state if delete failed
          loadMessages(true);
      }
  }, [context, supabase, showToast, loadMessages]);

  // Realtime
  useRealtimeRouterSubscription({
    table: context?.type === 'project' ? 'project_chat_messages' : 'messages',
    event: 'INSERT', // Focus on INSERTs for new messages
    filter: context 
        ? (context.type === 'project' ? `project_id=eq.${context.id}` : `conversation_id=eq.${context.id}`)
        : undefined,
    enabled: !!context,
    onData: (payload) => {
        // Only handle if it's NOT our own message
        if (payload.new && (payload.new as any).sender_id !== userId) {
            loadMessages(true); 
        }
    }
  });

  return { messages, loading, sendMessage, deleteMessage, currentUserId: userId };
}
