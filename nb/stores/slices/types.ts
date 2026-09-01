import { Message, ConversationSummary, ApplicationData } from '@/lib/services/messaging/types';

export interface SenderProfile {
  full_name?: string;
  username?: string;
  avatar_url?: string;
}

export interface PendingMessage {
  tempId: string;
  conversationId: string;
  content: string;
  senderId: string;
  status: 'sending' | 'failed' | 'sent';
  createdAt: string;
  attachments?: any[];
  replyToId?: string;
  retryPayload?: {
      content: string, 
      senderId: string, 
      attachments?: any[],
      replyToMessageId?: string,
      mentionedTaskIds?: string[]
  };
}

export interface MessageSlice {
  conversations: Record<string, Message[]>;
  conversationActivity: Record<string, number>;
  pendingMessages: PendingMessage[];
  
  fetchMessages: (conversationId: string) => Promise<void>;
  setMessages: (conversationId: string, messages: Message[]) => void;
  addMessage: (message: Message) => void;
  updateMessage: (message: Message) => void;
  removeMessage: (messageId: string, conversationId?: string) => void;
  
  addPendingMessage: (message: PendingMessage) => void;
  removePendingMessage: (tempId: string) => void;
  updatePendingMessageStatus: (tempId: string, status: 'sending' | 'failed' | 'sent') => void;
  
  cleanupInactiveConversations: () => void;
  touchConversation: (conversationId: string) => void;
  // Caching
  senderProfileCache: Record<string, { profile: SenderProfile, lastAccessed: number }>;
  cacheSenderProfile: (userId: string, profile: SenderProfile) => void;
  getCachedSenderProfile: (userId: string) => SenderProfile | undefined;
  cleanupSenderProfiles: () => void;
  clearSenderProfileCache: () => void;
  removeCachedSenderProfile: (userId: string) => void;
}

export interface ConversationSlice {
  conversationList: ConversationSummary[];
  loadingConversations: boolean;
  conversationPage: number;
  hasMoreConversations: boolean;
  
  fetchConversations: (userId: string) => Promise<void>;
  loadMoreConversations: (userId: string) => Promise<void>;
  searchConversations: (userId: string, query: string) => Promise<void>;
  
  updateConversationSummary: (conversationId: string, updates: Partial<ConversationSummary>) => void;
  addConversationToSummary: (conversation: ConversationSummary) => void;
  markConversationAsReadInList: (conversationId: string) => void;
  setConversationList: (conversations: ConversationSummary[]) => void;
  updateConversationFromMessage: (conversationId: string, message: any) => void;
  removeConversation: (conversationId: string) => void;
  
  // Application Cache
  applicationCache: Record<string, ApplicationData>;
  fetchApplication: (conversationId: string) => Promise<void>;
  updateApplicationInCache: (conversationId: string, updates: Partial<ApplicationData>) => void;
}

export interface UiSlice {
  unreadCounts: Record<string, number>;
  totalUnreadCount: number;
  activeConversationId: string | null;
  currentProjectId: string | null;
  searchQuery: string;
  isSearching: boolean;
  
  setActiveConversationId: (id: string | null) => void;
  setCurrentProjectId: (projectId: string | null) => void;
  setSearchQuery: (query: string) => void;
  setTotalUnreadCount: (count: number) => void;
  incrementTotalUnreadCount: (amount?: number) => void;
}

export type MessageStoreState = MessageSlice & ConversationSlice & UiSlice;
