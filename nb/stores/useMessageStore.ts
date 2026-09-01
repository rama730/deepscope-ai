import { create } from 'zustand';
import { createConversationSlice } from './slices/conversationSlice';
import { createMessageSlice } from './slices/messageSlice';
import { createUiSlice } from './slices/uiSlice';
import { MessageStoreState } from './slices/types';
import { cacheManager } from '@/lib/utils/cache-manager';

export type { MessageStoreState, PendingMessage } from './slices/types';

const CLEANUP_INTERVAL_MS = 60 * 1000; // Check every minute

export const useMessageStore = create<MessageStoreState>((...a) => ({
  ...createConversationSlice(...a),
  ...createMessageSlice(...a),
  ...createUiSlice(...a),
}));

// Start cleanup interval
if (typeof window !== 'undefined') {
  setInterval(() => {
    useMessageStore.getState().cleanupInactiveConversations();
  }, CLEANUP_INTERVAL_MS);

  // Register with unified cache manager
  cacheManager.register('MessageStore', () => {
    const store = useMessageStore.getState();
    store.clearSenderProfileCache();
    // Also reset conversation activity tracking
    // For a deeper reset, we could wipe 'conversations' but that affects current UI visibility
  }, 10);
}
