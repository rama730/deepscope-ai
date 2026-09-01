"use client";


import { X } from "lucide-react";
import ApplicationManagementTab from "./ApplicationManagementTab";

interface ManageApplicationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  isProjectOwner: boolean;
  onRefresh?: () => void;
}

export default function ManageApplicationsModal({
  isOpen,
  onClose,
  projectId,
  isProjectOwner,
}: ManageApplicationsModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="relative w-full max-w-4xl max-h-[90vh] rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-zinc-200 dark:border-zinc-800 flex-shrink-0">
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            Manage Applications
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-zinc-500 hover:text-zinc-700 dark:text-zinc-300 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <ApplicationManagementTab
            projectId={projectId}
            isProjectOwner={isProjectOwner}
          />
        </div>
      </div>
    </div>
  );
}

