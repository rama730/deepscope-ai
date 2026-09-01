import { create } from "zustand";

type ActiveView = "dashboard" | "tasks" | "files" | "analytics" | "outcomes" | "settings" | "sprints";

interface ProjectUIState {
  // Navigation
  activeView: ActiveView;
  setActiveView: (view: ActiveView) => void;

  // Modals
  modals: {
    apply: boolean;
    edit: boolean;
    manageApplications: boolean;
    manageTeam: boolean;
    finalize: boolean;
    share: boolean;
    export: boolean;
    duplicate: boolean;
    quickSearch: boolean;
    shortcutsHelp: boolean;
  };
  setModal: (modal: keyof ProjectUIState["modals"], isOpen: boolean) => void;

  // Contextual State
  selectedTaskId: string | null;
  setSelectedTaskId: (id: string | null) => void;
  
  editInitialTab: string | undefined;
  setEditInitialTab: (tab: string | undefined) => void;

  selectedRoleId: string | undefined;
  setSelectedRoleId: (roleId: string | undefined) => void;
}

export const useProjectUIStore = create<ProjectUIState>((set) => ({
  activeView: "dashboard",
  setActiveView: (view) => set({ activeView: view }),

  modals: {
    apply: false,
    edit: false,
    manageApplications: false,
    manageTeam: false,
    finalize: false,
    share: false,
    export: false,
    duplicate: false,
    quickSearch: false,
    shortcutsHelp: false,
  },
  setModal: (modal, isOpen) =>
    set((state) => ({
      modals: { ...state.modals, [modal]: isOpen },
    })),

  selectedTaskId: null,
  setSelectedTaskId: (id) => set({ selectedTaskId: id }),

  editInitialTab: undefined,
  setEditInitialTab: (tab) => set({ editInitialTab: tab }),

  selectedRoleId: undefined,
  setSelectedRoleId: (roleId) => set({ selectedRoleId: roleId }),
}));
