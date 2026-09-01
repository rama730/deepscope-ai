import { useRef, useEffect } from 'react';
import { logger } from '@/lib/logger';
import { MessagingService } from '@/lib/services/messaging/index';
import { Message } from '@/lib/services/messaging/types';
import { useMessageStore } from '@/stores/useMessageStore';
import { useSubscription } from '@/hooks/useSubscription';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

export function useMessageSubscriptions(conversationId: string | null) {
  const { addMessage, updateMessage, removeMessage } = useMessageStore();
  
  // Telemetry: Track message volume
  const messagesReceivedCount = useRef(0);
  
  useEffect(() => {
    // Reset counter for new conversation
    messagesReceivedCount.current = 0;
    
    return () => {
      if (messagesReceivedCount.current > 0) {
        logger.info('MessageSubscriptionCleanup', {
          conversationId: conversationId || 'unknown',
          messagesReceived: messagesReceivedCount.current
        });
      }
    };
  }, [conversationId]);

  useSubscription<Message>({
    table: 'messages',
    // Server-side filtering: strict filter for this conversation
    filter: conversationId ? `conversation_id=eq.${conversationId}` : undefined,
    event: '*',
    enabled: !!conversationId,
    onData: async (payload: RealtimePostgresChangesPayload<Message>) => {
      // Supabase payload structure: has eventType, new, old
      const eventType = (payload as any).eventType || 
        (payload.new && !payload.old ? 'INSERT' : 
         payload.old && !payload.new ? 'DELETE' : 'UPDATE');
      const newItem = payload.new;
      const oldItem = payload.old;
      
      if (!conversationId) return;

      // CLIENT-SIDE FILTERING: Redundant safety check
      const msgConvId = (newItem as any)?.conversation_id || (oldItem as any)?.conversation_id;
      if (msgConvId !== conversationId) return;
      
      messagesReceivedCount.current++;
      
      switch (eventType) {
        case 'INSERT': {
          if (!newItem) break;
          const msg = newItem as Message;
          // Enrich with profile if missing (optimistic or incomplete real-time payload)
          if (!msg.sender_profile && !msg.sender_name && msg.sender_id) {
            const { senderProfileCache, cacheSenderProfile } = useMessageStore.getState();
            const cachedEntry = senderProfileCache[msg.sender_id];
            
            if (cachedEntry) {
               const cachedProfile = cachedEntry.profile;
               // Create enriched message instead of mutating
               const enrichedMsg = {
                 ...msg,
                 sender_profile: cachedProfile as any,
                 sender_name: cachedProfile.full_name || cachedProfile.username
               };
               
               // Update cache access time for LRU
               cacheSenderProfile(msg.sender_id, cachedProfile);
               
               addMessage(enrichedMsg);
               return; // Skip further processing for this message
            } else {
               // Optimistic UI: don't wait for profile to show message
               // But fetch it in background to update
               MessagingService.getSenderProfile(msg.sender_id)
                   .then(profile => {
                       if (profile) {
                           const normalizedProfile = {
                               full_name: profile.full_name || undefined,
                               username: profile.username || undefined,
                               avatar_url: profile.avatar_url || undefined,
                           };
                           cacheSenderProfile(msg.sender_id, normalizedProfile);
                           const { updateMessage } = useMessageStore.getState();
                           updateMessage({ 
                               ...msg, 
                               sender_profile: normalizedProfile,
                               sender_name: normalizedProfile.full_name || normalizedProfile.username
                           });
                       }
                   })
                    .catch(e => {
                        logger.warn('MessageSubscriptionProfileEnrichmentFailed', { 
                            senderId: msg.sender_id, 
                            error: e 
                        });
                    });
            }
          }
          addMessage(msg);
          break;
        }
        case 'UPDATE': {
          if (newItem) {
            updateMessage(newItem as Message);
          }
          break;
        }
        case 'DELETE': {
          // DELETE events might only contain ID in 'old'
          const deletedId = (oldItem as any)?.id;
          if (deletedId) {
             removeMessage(deletedId, conversationId);
          }
          break;
        }
      }
    }
  });
}
