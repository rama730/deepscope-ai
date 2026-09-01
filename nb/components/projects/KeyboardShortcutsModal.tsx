"use client";

import { X, Keyboard } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import React from "react";
import { shortcutsList } from "@/hooks/useProjectShortcuts";

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function KeyboardShortcutsModal({ isOpen, onClose }: KeyboardShortcutsModalProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden border border-slate-200 dark:border-zinc-800">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-zinc-800">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                    <Keyboard className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <h2 className="text-xl font-semibold text-slate-900 dark:text-zinc-100">
                    Keyboard Shortcuts
                  </h2>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-slate-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="overflow-y-auto max-h-[calc(80vh-80px)] p-6">
                <div className="space-y-6">
                  {shortcutsList.map((category, idx) => (
                    <div key={idx}>
                      <h3 className="text-sm font-semibold text-slate-700 dark:text-zinc-300 mb-3 uppercase tracking-wide">
                        {category.category}
                      </h3>
                      <div className="space-y-2">
                        {category.shortcuts.map((shortcut, sIdx) => (
                          <div
                            key={sIdx}
                            className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-slate-50 dark:bg-zinc-900 dark:hover:bg-zinc-800/50 transition-colors"
                          >
                            <span className="text-sm text-slate-600 dark:text-zinc-400">
                              {shortcut.description}
                            </span>
                            <div className="flex items-center gap-1.5">
                              {shortcut.keys.map((key, kIdx) => (
                                <React.Fragment key={kIdx}>
                                  {kIdx > 0 && (
                                    <span className="text-slate-400 dark:text-zinc-600">+</span>
                                  )}
                                  <kbd className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-[10px] font-mono font-medium text-zinc-600 dark:text-zinc-400">
                                    {key}
                                  </kbd>
                                </React.Fragment>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 pt-6 border-t border-slate-200 dark:border-zinc-800">
                  <p className="text-xs text-slate-500 dark:text-zinc-500 text-center">
                    Press <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-[10px] font-mono">Esc</kbd> to close
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
