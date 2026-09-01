"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, MoreVertical, ClipboardList, FolderOpen, BarChart3, Zap, Settings } from "lucide-react";

interface QuickAction {
  id: string;
  label: string;
  icon: React.ElementType;
  onClick: () => void;
  divider?: boolean;
}

interface QuickActionsDropdownProps {
  onCreateTask: () => void;
  onUploadFile: () => void;

  onViewAnalytics: () => void;
  onViewSprints?: () => void;
  onViewSettings?: () => void;
  isCreator?: boolean;
}

export default function QuickActionsDropdown({
  onCreateTask,
  onUploadFile,

  onViewAnalytics,
  onViewSprints,
  onViewSettings,
  isCreator,
}: QuickActionsDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
    return undefined;
  }, [isOpen]);

  const actions: QuickAction[] = [
    { id: "task", label: "New Task", icon: ClipboardList, onClick: () => { onCreateTask(); setIsOpen(false); } },
    { id: "file", label: "Upload File", icon: FolderOpen, onClick: () => { onUploadFile(); setIsOpen(false); } },

    { divider: true },
    { id: "analytics", label: "View Analytics", icon: BarChart3, onClick: () => { onViewAnalytics(); setIsOpen(false); } },
    ...(onViewSprints ? [{ id: "sprints", label: "View Sprints", icon: Zap, onClick: () => { onViewSprints(); setIsOpen(false); } } as QuickAction] : []),
    ...(isCreator && onViewSettings ? [{ id: "settings", label: "Settings", icon: Settings, onClick: () => { onViewSettings(); setIsOpen(false); }, divider: true } as QuickAction] : []),
  ].filter(Boolean) as QuickAction[];

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all flex items-center justify-center"
        aria-label="Quick actions"
      >
        {isOpen ? (
          <motion.div
            initial={{ rotate: 0 }}
            animate={{ rotate: 45 }}
            transition={{ duration: 0.2 }}
          >
            <Plus className="w-6 h-6" />
          </motion.div>
        ) : (
          <MoreVertical className="w-6 h-6" />
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            className="fixed bottom-24 right-6 z-40 bg-white dark:bg-zinc-900 rounded-xl shadow-2xl border border-slate-200 dark:border-zinc-800 py-2 min-w-[200px]"
          >
            {actions.map((action, index) => {
              if (action.divider) {
                return (
                  <div key={`divider-${index}`} className="my-2 border-t border-slate-200 dark:border-zinc-800" />
                );
              }

              if (!action.icon) return null;

              const Icon = action.icon;
              return (
                <button
                  key={action.id}
                  onClick={action.onClick}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:bg-zinc-900 dark:hover:bg-zinc-800 transition-colors"
                >
                  <Icon className="w-4 h-4" />
                  <span>{action.label}</span>
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

