import { create } from 'zustand';
import { createExplorerSlice, ExplorerSlice } from './slices/explorerSlice';

export const useExplorerStore = create<ExplorerSlice>((...a) => ({
  ...createExplorerSlice(...a),
}));
