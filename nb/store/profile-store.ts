import { create } from "zustand";

interface ProfileState {
  isEditing: boolean;
  draftBio: string | null;
  draftOpenTo: string[];
  setEditing: (editing: boolean) => void;
  setDraftBio: (bio: string | null) => void;
  setDraftOpenTo: (openTo: string[]) => void;
  resetDraft: () => void;
}

export const useProfileStore = create<ProfileState>((set) => ({
  isEditing: false,
  draftBio: null,
  draftOpenTo: [],
  setEditing: (editing) => set({ isEditing: editing }),
  setDraftBio: (bio) => set({ draftBio: bio }),
  setDraftOpenTo: (openTo) => set({ draftOpenTo: openTo }),
  resetDraft: () => set({ draftBio: null, draftOpenTo: [] }),
}));
