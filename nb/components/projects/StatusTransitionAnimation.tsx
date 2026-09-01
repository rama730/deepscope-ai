"use client";

import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, ArrowRight } from "lucide-react";

interface StatusTransitionAnimationProps {
  fromStatus: string;
  toStatus: string;
  isVisible: boolean;
  onComplete: () => void;
}

const statusLabels: Record<string, string> = {
  open: "Planning",
  "in-progress": "In Progress",
  completed: "Completed",
  archived: "Archived",
};

export default function StatusTransitionAnimation({
  fromStatus,
  toStatus,
  isVisible,
  onComplete,
}: StatusTransitionAnimationProps) {
  return (
    <AnimatePresence>
      {isVisible && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-[60]"
            onClick={onComplete}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            className="fixed inset-0 z-[70] flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-2xl p-8 max-w-md w-full border border-slate-200 dark:border-zinc-800">
              <div className="flex flex-col items-center text-center space-y-4">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 15 }}
                  className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center"
                >
                  <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                </motion.div>
                
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-zinc-100">
                    Status Updated
                  </h3>
                  <div className="flex items-center justify-center gap-3 text-sm text-slate-600 dark:text-zinc-400">
                    <span className="font-medium">{statusLabels[fromStatus] || fromStatus}</span>
                    <ArrowRight className="w-4 h-4" />
                    <span className="font-medium text-emerald-600 dark:text-emerald-400">
                      {statusLabels[toStatus] || toStatus}
                    </span>
                  </div>
                </div>

                <button
                  onClick={onComplete}
                  className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
                >
                  Continue
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

