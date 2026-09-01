"use client";

import { motion, AnimatePresence } from "framer-motion";
import { CheckCheck, Trash2, Archive, RotateCcw, X } from "lucide-react";

interface BulkActionsBarProps {
  selectedCount: number;
  onMarkRead: () => void;
  onMarkUnread: () => void;
  onDelete: () => void;
  onArchive?: () => void;
  onClearSelection: () => void;
}

export default function BulkActionsBar({
  selectedCount,
  onMarkRead,
  onMarkUnread,
  onDelete,
  onArchive,
  onClearSelection,
}: BulkActionsBarProps) {
  if (selectedCount === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -100, opacity: 0 }}
        className="sticky top-0 z-40 bg-blue-600 text-white px-4 py-3 flex items-center justify-between shadow-lg"
      >
        <div className="flex items-center gap-3">
          <span className="font-medium">
            {selectedCount} {selectedCount === 1 ? 'notification' : 'notifications'} selected
          </span>
          <button
            onClick={onClearSelection}
            className="p-1 hover:bg-blue-700 rounded transition-colors"
            aria-label="Clear selection"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onMarkRead}
            className="px-3 py-1.5 bg-blue-700 hover:bg-blue-800 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
          >
            <CheckCheck className="w-4 h-4" />
            Mark Read
          </button>
          <button
            onClick={onMarkUnread}
            className="px-3 py-1.5 bg-blue-700 hover:bg-blue-800 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Mark Unread
          </button>
          {onArchive && (
            <button
              onClick={onArchive}
              className="px-3 py-1.5 bg-blue-700 hover:bg-blue-800 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
            >
              <Archive className="w-4 h-4" />
              Archive
            </button>
          )}
          <button
            onClick={onDelete}
            className="px-3 py-1.5 bg-red-600 hover:bg-red-700 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
