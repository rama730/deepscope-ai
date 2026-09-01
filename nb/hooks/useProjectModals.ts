import { useState, useCallback } from "react";

export type ModalType = 
  | "apply" 
  | "edit" 
  | "share" 
  | "manageApplications" 
  | "manageTeam" 
  | "finalize" 
  | "quickSearch"
  | "shortcutsHelp"
  | "export"
  | "duplicate"
  | null;

export function useProjectModals() {
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  
  // Specific state for apply modal
  const [selectedRoleId, setSelectedRoleId] = useState<string | undefined>(undefined);
  
  // Specific state for edit modal
  const [editInitialTab, setEditInitialTab] = useState<string>("essentials");

  const openModal = useCallback((modal: ModalType) => {
    setActiveModal(modal);
  }, []);

  const closeModal = useCallback(() => {
    setActiveModal(null);
  }, []);

  const toggleModal = useCallback((modal: ModalType, isOpen: boolean) => {
    if (isOpen) setActiveModal(modal);
    else if (activeModal === modal) setActiveModal(null);
  }, [activeModal]);

  return {
    activeModal,
    openModal,
    closeModal,
    toggleModal,
    // Helper accessors
    isApplyOpen: activeModal === "apply",
    isEditOpen: activeModal === "edit",
    isShareOpen: activeModal === "share",
    isManageApplicationsOpen: activeModal === "manageApplications",
    isManageTeamOpen: activeModal === "manageTeam",
    isFinalizeOpen: activeModal === "finalize",
    isQuickSearchOpen: activeModal === "quickSearch",
    isShortcutsHelpOpen: activeModal === "shortcutsHelp",
    isExportOpen: activeModal === "export",
    isDuplicateOpen: activeModal === "duplicate",
    
    // Specific states
    selectedRoleId,
    setSelectedRoleId,
    editInitialTab,
    setEditInitialTab
  };
}
