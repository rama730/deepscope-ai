"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { usePathname } from "next/navigation";

interface MessageContextType {
  // Messages page context
  isInMessagesPage: boolean;
  activeConversationId: string | null;
  setActiveConversationId: (id: string | null) => void;
  
  // Global chat widget context
  isGlobalChatOpen: boolean;
  globalChatConversationId: string | null;
  setGlobalChatOpen: (open: boolean) => void;
  setGlobalChatConversationId: (id: string | null) => void;
  
  // Project chat context
  isProjectChatActive: boolean;
  projectChatConversationId: string | null;
  setProjectChatActive: (active: boolean) => void;
  setProjectChatConversationId: (id: string | null) => void;
  
  // Helper function to check if a conversation is currently being viewed
  isConversationActive: (conversationId: string) => boolean;
}

const MessageContext = createContext<MessageContextType | undefined>(undefined);

export function MessageContextProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isInMessagesPage = pathname === '/messages';
  
  // Messages page state
  const [activeConversationId, setActiveConversationIdState] = useState<string | null>(null);
  
  // Global chat widget state
  const [isGlobalChatOpen, setIsGlobalChatOpen] = useState(false);
  const [globalChatConversationId, setGlobalChatConversationIdState] = useState<string | null>(null);
  
  // Project chat state
  const [isProjectChatActive, setIsProjectChatActive] = useState(false);
  const [projectChatConversationId, setProjectChatConversationIdState] = useState<string | null>(null);
  
  // Helper to check if a conversation is currently active in any context
  const isConversationActive = useCallback((conversationId: string): boolean => {
    // Check messages page
    if (isInMessagesPage && activeConversationId === conversationId) {
      return true;
    }
    
    // Check global chat widget
    if (isGlobalChatOpen && globalChatConversationId === conversationId) {
      return true;
    }
    
    // Check project chat
    if (isProjectChatActive && projectChatConversationId === conversationId) {
      return true;
    }
    
    return false;
  }, [
    isInMessagesPage,
    activeConversationId,
    isGlobalChatOpen,
    globalChatConversationId,
    isProjectChatActive,
    projectChatConversationId,
  ]);
  
  const setActiveConversationId = useCallback((id: string | null) => {
    setActiveConversationIdState(id);
  }, []);
  
  const setGlobalChatOpen = useCallback((open: boolean) => {
    setIsGlobalChatOpen(open);
    if (!open) {
      setGlobalChatConversationIdState(null);
    }
  }, []);
  
  const setGlobalChatConversationId = useCallback((id: string | null) => {
    setGlobalChatConversationIdState(id);
    if (id) {
      setIsGlobalChatOpen(true);
    }
  }, []);
  
  const setProjectChatActive = useCallback((active: boolean) => {
    setIsProjectChatActive(active);
    if (!active) {
      setProjectChatConversationIdState(null);
    }
  }, []);
  
  const setProjectChatConversationId = useCallback((id: string | null) => {
    setProjectChatConversationIdState(id);
    if (id) {
      setIsProjectChatActive(true);
    }
  }, []);
  
  return (
    <MessageContext.Provider
      value={{
        isInMessagesPage,
        activeConversationId: activeConversationId,
        setActiveConversationId,
        isGlobalChatOpen,
        globalChatConversationId,
        setGlobalChatOpen,
        setGlobalChatConversationId,
        isProjectChatActive,
        projectChatConversationId,
        setProjectChatActive,
        setProjectChatConversationId,
        isConversationActive,
      }}
    >
      {children}
    </MessageContext.Provider>
  );
}

export function useMessageContext() {
  const context = useContext(MessageContext);
  if (context === undefined) {
    throw new Error('useMessageContext must be used within a MessageContextProvider');
  }
  return context;
}
