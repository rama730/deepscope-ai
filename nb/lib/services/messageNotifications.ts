import { Message } from "./messaging";
import { MessageContextType } from "@/contexts/MessageContext";

interface SenderProfile {
  id: string;
  full_name?: string | null;
  username?: string | null;
  avatar_url?: string | null;
}

interface ConversationInfo {
  id: string;
  type?: string | null;
  group_name?: string | null;
  is_group?: boolean;
}

/**
 * Service for handling message notifications with context awareness
 */
export class MessageNotificationService {
  /**
   * Check if a notification should be shown based on current context
   */
  static shouldShowNotification(
    message: Message,
    context: MessageContextType
  ): boolean {
    // Don't show if user is viewing this conversation in Messages page
    if (context.isInMessagesPage && context.activeConversationId === message.conversation_id) {
      return false;
    }
    
    // Don't show if user is viewing this conversation in GlobalChatWidget
    if (context.isGlobalChatOpen && context.globalChatConversationId === message.conversation_id) {
      return false;
    }
    
    // Don't show if user is viewing this conversation in project chat
    if (context.isProjectChatActive && context.projectChatConversationId === message.conversation_id) {
      return false;
    }
    
    // Use the helper function as a fallback check
    if (context.isConversationActive(message.conversation_id)) {
      return false;
    }
    
    return true;
  }
  
  /**
   * Get notification data for a message (used by hooks/components to display toast)
   */
  static getNotificationData(
    message: Message,
    sender: SenderProfile,
    conversation: ConversationInfo
  ) {
    const senderName = sender.full_name || sender.username || "Someone";
    const isGroup = conversation.is_group || conversation.type === "group";
    
    return {
      message,
      senderName,
      senderAvatar: sender.avatar_url,
      conversationName: conversation.group_name || undefined,
      isGroup,
      conversationId: message.conversation_id,
    };
  }
}
