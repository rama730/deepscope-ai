"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Share2, Download, Trash2 } from "lucide-react";

interface BulkActionBarProps {
  selectedCount: number;
  totalCount: number;
  onSelectAll: () => void;
  onAddToCollection: () => void;
  onBookmark: () => void;
  onCompare: () => void;
  onCancel: () => void;
  onShare?: () => void;
  onExport?: () => void;
  onDelete?: () => void;
  canCompare: boolean;
}

export default function BulkActionBar({
  selectedCount,
  totalCount,
  onSelectAll,
  onAddToCollection,
  onBookmark,
  onCompare,
  onCancel,
  onShare,
  onExport,
  onDelete,
  canCompare,
}: BulkActionBarProps) {
  return (
    <AnimatePresence>
      {selectedCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed bottom-4 sm:bottom-8 left-2 right-2 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 z-50 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-2xl rounded-xl sm:rounded-2xl px-4 sm:px-6 py-3 flex flex-wrap items-center gap-2 sm:gap-4 max-w-max sm:max-w-none mx-auto"
          role="toolbar"
          aria-label="Bulk actions"
        >
          <span className="text-sm font-medium" aria-live="polite">
            {selectedCount} selected
          </span>
          <div className="h-6 w-px bg-slate-200 dark:bg-zinc-800" />
          <button
            onClick={onSelectAll}
            className="text-sm font-medium hover:text-indigo-600 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-2 py-1"
            aria-label={selectedCount === totalCount ? "Deselect All" : "Select All"}
          >
            {selectedCount === totalCount ? "Deselect All" : "Select All"}
          </button>
          <button
            onClick={onAddToCollection}
            className="text-sm font-medium hover:text-indigo-600 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-2 py-1"
            aria-label="Add to Collection"
          >
            Add to Collection
          </button>
          <button
            onClick={onBookmark}
            className="text-sm font-medium hover:text-indigo-600 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-2 py-1"
            aria-label="Bookmark Selected"
          >
            Bookmark
          </button>
          {canCompare && (
            <button
              onClick={onCompare}
              className="text-sm font-medium hover:text-indigo-600 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-2 py-1"
              aria-label="Compare Projects"
            >
              Compare
            </button>
          )}
          {onShare && (
            <button
              onClick={onShare}
              className="text-sm font-medium hover:text-indigo-600 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-2 py-1 flex items-center gap-1"
              aria-label="Share Selected"
            >
              <Share2 className="w-3.5 h-3.5" />
              Share
            </button>
          )}
          {onExport && (
            <button
              onClick={onExport}
              className="text-sm font-medium hover:text-indigo-600 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-2 py-1 flex items-center gap-1"
              aria-label="Export Selected"
            >
              <Download className="w-3.5 h-3.5" />
              Export
            </button>
          )}
          {onDelete && (
            <button
              onClick={onDelete}
              className="text-sm font-medium hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 rounded px-2 py-1 flex items-center gap-1"
              aria-label="Delete Selected"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete
            </button>
          )}
          <div className="h-6 w-px bg-slate-200 dark:bg-zinc-800" />
          <button
            onClick={onCancel}
            className="p-1 hover:bg-slate-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Cancel Selection"
          >
            <X className="w-4 h-4" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
