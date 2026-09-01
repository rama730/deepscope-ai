"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import TaskDetailContent, { TaskDetailContentProps } from "@/components/tasks/TaskDetailContent";

/**
 * Overlay wrapper for the task detail experience.
 * - Keeps backdrop + slide-in animation consistent across the app
 * - Locks body scroll while open
 *
 * The actual task UI lives in `TaskDetailContent` so it can be reused inside WorkspaceDock.
 */
export default function TaskDetailPanel(props: TaskDetailContentProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Lock body scroll (overlay variant only)
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  // Early return if task is not provided
  if (!props.task) return null;

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-x-0 bottom-0 top-[var(--header-height,64px)] bg-black/50 backdrop-blur-sm z-[200]"
        onClick={props.onClose}
      />

      {/* Panel */}
      <motion.div
        ref={panelRef}
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className="fixed right-0 top-[var(--header-height,64px)] bottom-0 w-full max-w-2xl bg-white dark:bg-zinc-900 shadow-2xl z-[201] flex flex-col"
      >
        <TaskDetailContent {...props} />
      </motion.div>
    </>
  );
}

