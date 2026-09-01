import { StateCreator } from 'zustand';
import { MessageStoreState, UiSlice } from './types';

export const createUiSlice: StateCreator<
  MessageStoreState,
  [],
  [],
  UiSlice
> = (set) => ({
  totalUnreadCount: 0,
  unreadCounts: {},
  activeConversationId: null,
  currentProjectId: null,
  searchQuery: '',
  isSearching: false,

  setActiveConversationId: (id) => set({ activeConversationId: id }),
  setCurrentProjectId: (projectId) => set({ currentProjectId: projectId }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setTotalUnreadCount: (count) => set({ totalUnreadCount: count }),
  incrementTotalUnreadCount: (amount = 1) => set((state) => ({ totalUnreadCount: state.totalUnreadCount + amount })),
});
