import { useEffect, useCallback, useRef } from 'react';
import { useMessageStore } from '@/stores/useMessageStore';
import { useSubscription } from '@/hooks/useSubscription';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { Message, ConversationSummary } from '@/lib/services/messaging/types';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

type MessagePayload = RealtimePostgresChangesPayload<Message>;

export function useConversationListSubscriptions(userId: string | undefined) {
    const { 
        fetchConversations
    } = useMessageStore();
    
    const inFlightFetches = useRef(new Set<string>());

    // Optimized: Update specific conversation instead of full refetch
    const handleMessageChange = useCallback(async (payload: MessagePayload) => {
        if (!userId) return;
        const eventType = payload.eventType;
        const newMessage = payload.new as Message;
        const oldMessage = payload.old as Message; // Partial<Message> would be safer but Message is fine for property checks here

                // HANDLE INSERT
        if (eventType === 'INSERT' && newMessage?.conversation_id) {
            // Check if we have this conversation in our list
            const { conversationList, updateConversationFromMessage, addConversationToSummary } = useMessageStore.getState();
            const exists = conversationList.some(c => c.conversation_id === newMessage.conversation_id);

            if (exists) {
                updateConversationFromMessage(newMessage.conversation_id, newMessage);
            } else {
                // Skip if already fetching this conversation
                if (inFlightFetches.current.has(newMessage.conversation_id)) {
                    return;
                }
                
                // New conversation for this user! Fetch summary and add to list.
                inFlightFetches.current.add(newMessage.conversation_id);

                // Defensive timeout to prevent infinite blocking if fetch hangs
                const timeoutId = setTimeout(() => {
                    inFlightFetches.current.delete(newMessage.conversation_id);
                }, 30000);
                
                try {
                    const supabase = createSupabaseBrowserClient();
                    // We need to fetch the conversation view/rpc matching this ID
                    // Using getUserConversations is heavy, let's try to fetch single row from view if possible
                    // Or reuse getProjectConversation / createDirectConversation logic?
                    // Let's assume we can fetch `user_conversations` view for this specific conversation.
                    // RLS should allow us to see it if we are participant.
                    
                    const { data, error } = await supabase
                        .from('user_conversations')
                        .select('*')
                        .eq('conversation_id', newMessage.conversation_id)
                        .eq('user_id', userId)
                        .maybeSingle();

                    if (error) {
                         console.error('Failed to fetch new conversation summary', error);
                    } else if (data) {
                         addConversationToSummary(data as ConversationSummary);
                    }
                } catch (e) {
                    console.error('Failed to fetch new conversation summary', e);
                } finally {
                    clearTimeout(timeoutId);
                    inFlightFetches.current.delete(newMessage.conversation_id);
                }
            }
        } 
        // HANDLE UPDATE
        else if (eventType === 'UPDATE' && newMessage?.conversation_id) {
             // For updates (edits, etc.), refresh the snippet if this message is the one showing.
             useMessageStore.getState().updateConversationFromMessage(newMessage.conversation_id, newMessage);
        }
        // HANDLE DELETE
        else if (eventType === 'DELETE' && oldMessage?.id) {
             // IMPORTANT: Requires messages table replica identity set to FULL
             // to receive conversation_id in the 'old' payload of the DELETE event.
             // If not available, convId will be undefined.
             const convId = oldMessage.conversation_id;
             if (convId) {
                  // Fetch the latest message for this conversation to see if snippet needs update
                  try {
                       const supabase = createSupabaseBrowserClient();
                       const { data, error } = await supabase
                         .from('messages')
                         .select('*')
                         .eq('conversation_id', convId)
                         .order('created_at', { ascending: false })
                         .limit(1)
                         .maybeSingle(); // Use maybeSingle() instead of single() to avoid error if no messages left
                       
                       if (error) {
                           console.warn('Failed to fetch latest message after deletion', error);
                       } else {
                           // Update conversation snippet with the new "latest" message (or null if empty)
                           if (data) {
                               useMessageStore.getState().updateConversationFromMessage(convId, data as Message); // store method expects Message for message snippet
                           } else {
                               // Handle empty conversation case - remove from list
                               useMessageStore.getState().removeConversation(convId);
                               console.info('Conversation removed from list (no messages left)', { conversationId: convId });
                           }
                       }
                  } catch (e) {
                       console.warn('Failed to update conversation after message deletion', e);
                  }
             } else {
                  // Fallback: If convId is missing, a server-side RPC or resolver would be needed 
                  // to map oldMessage.id to a conversation_id, as the row is already deleted.
                  console.warn('DELETE event received without conversation_id. Ensure REPLICA IDENTITY is set to FULL on messages table.');
             }
        }
    }, [userId]);

    // Single unified subscription for messages table
    useSubscription({
        table: 'messages',
        event: '*', 
        enabled: !!userId,
        onData: handleMessageChange
    });

    // Keep the polling as a backup, but maybe less frequent
    useEffect(() => {
        if (!userId) return;
        const interval = setInterval(() => {
             fetchConversations(userId);
        }, 600000); // 10 minutes
        return () => clearInterval(interval);
    }, [userId, fetchConversations]);
}
