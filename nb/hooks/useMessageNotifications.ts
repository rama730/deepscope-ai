"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useMessageContext } from "@/contexts/MessageContext";
import { MessageNotificationService } from "@/lib/services/messageNotifications";
import { Message } from "@/lib/services/messaging/types";
import { MessagingService } from "@/lib/services/messaging/index";
import { MessageToast } from "@/components/messaging/MessageToast";
import { toast } from "sonner";

interface UseMessageNotificationsReturn {
  hasUnread: boolean;
  isLoading: boolean;
}

/**
 * Hook for real-time message notifications with context awareness
 * Subscribes to message INSERT events and updates unread indicator
 */
export function useMessageNotifications(): UseMessageNotificationsReturn {
  const { user } = useAuth();
  const messageContext = useMessageContext();
  const supabase = createSupabaseBrowserClient();
  
  const [hasUnread, setHasUnread] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userConversationIds, setUserConversationIds] = useState<string[]>([]);
  
  // Debounce timer for rapid messages
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pendingMessagesRef = useRef<Message[]>([]);

  // Load user's conversations to filter messages
  const loadUserConversations = useCallback(async () => {
    if (!user?.id) {
      setUserConversationIds([]);
      setIsLoading(false);
      return;
    }

    try {
      const conversations = await MessagingService.getUserConversations(user.id);
      const conversationIds = conversations.map(conv => conv.conversation_id).filter(Boolean) as string[];
      setUserConversationIds(conversationIds);
      
      // Check if there are any unread messages
      const hasUnreadMessages = conversations.some(conv => (conv.unread_count || 0) > 0);
      setHasUnread(hasUnreadMessages);
      setIsLoading(false);
    } catch (error) {
      console.error("Failed to load user conversations:", error);
      setIsLoading(false);
    }
  }, [user?.id]);

  // Process pending messages (debounced)
  const processPendingMessages = useCallback(async () => {
    if (pendingMessagesRef.current.length === 0) return;

    const messages = [...pendingMessagesRef.current];
    pendingMessagesRef.current = [];

    for (const message of messages) {
      // Skip if user is viewing this conversation
      if (!MessageNotificationService.shouldShowNotification(message, messageContext)) {
        continue;
      }

      // Fetch sender and conversation info
      try {
        const [senderResult, conversationResult] = await Promise.all([
          supabase
            .from('profiles')
            .select('id, full_name, username, avatar_url')
            .eq('id', message.sender_id)
            .single(),
          supabase
            .from('conversations')
            .select('id, type, group_name, is_group')
            .eq('id', message.conversation_id)
            .single(),
        ]);

        if (senderResult.data && conversationResult.data) {
          const notificationData = MessageNotificationService.getNotificationData(
            message,
            senderResult.data,
            conversationResult.data
          );
          
          // Create toast component using React.createElement to avoid JSX parsing issues
          const ToastComponent = () => {
            return React.createElement(MessageToast, {
              message: notificationData.message,
              senderName: notificationData.senderName,
              senderAvatar: notificationData.senderAvatar,
              conversationName: notificationData.conversationName,
              isGroup: notificationData.isGroup,
              conversationId: notificationData.conversationId,
            });
          };
          
          toast.custom(ToastComponent, {
            duration: 5000,
            position: "top-right",
          });
        }
      } catch (error) {
        console.error("Failed to fetch message notification data:", error);
      }
    }

    // Update unread status
    setHasUnread(true);
  }, [messageContext, supabase]);

  // Load conversations on mount
  useEffect(() => {
    loadUserConversations();
  }, [loadUserConversations]);

  // Subscribe to message INSERT events
  useEffect(() => {
    if (!user?.id || userConversationIds.length === 0) {
      return;
    }

    // Create filter for user's conversations
    // Note: Supabase Realtime doesn't support IN filters directly, so we'll filter in the callback
    const channel = supabase
      .channel('message-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        async (payload) => {
          const newMessage = payload.new as Message;
          
          // Server-side filter handles the recipient check.
          // We no longer need to check userConversationIds against the list, 
          // as we only receive messages explicitly sent to us.

          // Skip messages from the current user
          if (newMessage.sender_id === user.id) {
            return;
          }

          // Add to pending messages
          pendingMessagesRef.current.push(newMessage);

          // Debounce: process after 500ms of no new messages
          if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
          }

          debounceTimerRef.current = setTimeout(() => {
            processPendingMessages();
          }, 500);
        }
      )
      .subscribe((status, err) => {
        if (err) {
          console.error("Message notification subscription error:", err);
        }
        if (status === 'SUBSCRIBED') {
          console.log("[useMessageNotifications] Successfully subscribed to message notifications");
        }
      });

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      supabase.removeChannel(channel);
    };
  }, [user?.id, userConversationIds, supabase, processPendingMessages]);

  // Refresh conversations periodically to catch new conversations
  useEffect(() => {
    if (!user?.id) return;

    const interval = setInterval(() => {
      loadUserConversations();
    }, 60000); // Every minute

    return () => clearInterval(interval);
  }, [user?.id, loadUserConversations]);

  return {
    hasUnread,
    isLoading,
  };
}
