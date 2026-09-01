import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface AuthState {
  rememberedEmail: string | null;
  rememberedName: string | null;
  lastLoginInfo: string | null;
  darkMode: boolean;
  setRememberedEmail: (email: string | null) => void;
  setRememberedName: (name: string | null) => void;
  setLastLoginInfo: (info: string | null) => void;
  setDarkMode: (enabled: boolean) => void;
  clearRemembered: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      rememberedEmail: null,
      rememberedName: null,
      lastLoginInfo: null,
      darkMode: false,
      setRememberedEmail: (email) => set({ rememberedEmail: email }),
      setRememberedName: (name) => set({ rememberedName: name }),
      setLastLoginInfo: (info) => set({ lastLoginInfo: info }),
      setDarkMode: (enabled) => set({ darkMode: enabled }),
      clearRemembered: () => set({ rememberedEmail: null, rememberedName: null }),
    }),
    {
      name: 'nb-auth-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
