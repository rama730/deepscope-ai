"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { ConfirmDialog } from "@/components/ui-custom/ConfirmDialog";

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
}

interface BulkTaskActionsProps {
  selectedTasks: Task[];
  onClearSelection: () => void;
  onSuccess: () => void;
}

export default function BulkTaskActions({ selectedTasks, onClearSelection, onSuccess }: BulkTaskActionsProps) {
  const supabase = createSupabaseBrowserClient();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  if (selectedTasks.length === 0) return null;

  async function handleBulkStatusChange(newStatus: "todo" | "in_progress" | "done") {
    setIsProcessing(true);
    
    try {
      const { error } = await supabase
        .from("project_tasks")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .in("id", selectedTasks.map(t => t.id));

      if (error) {
        console.error("Error updating tasks:", error);
        alert("Failed to update tasks");
      } else {
        onSuccess();
        onClearSelection();
      }
    } catch (err) {
      console.error("Exception:", err);
      alert("An error occurred");
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleBulkPriorityChange(newPriority: "low" | "medium" | "high") {
    setIsProcessing(true);
    
    try {
      const { error } = await supabase
        .from("project_tasks")
        .update({ priority: newPriority, updated_at: new Date().toISOString() })
        .in("id", selectedTasks.map(t => t.id));

      if (error) {
        console.error("Error updating tasks:", error);
        alert("Failed to update tasks");
      } else {
        onSuccess();
        onClearSelection();
      }
    } catch (err) {
      console.error("Exception:", err);
      alert("An error occurred");
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleBulkDelete() {
    setIsProcessing(true);
    
    try {
      const { error } = await supabase
        .from("project_tasks")
        .delete()
        .in("id", selectedTasks.map(t => t.id));

      if (error) {
        console.error("Error deleting tasks:", error);
        alert("Failed to delete tasks");
      } else {
        onSuccess();
        onClearSelection();
        setShowDeleteConfirm(false);
      }
    } catch (err) {
      console.error("Exception:", err);
      alert("An error occurred");
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <>
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 animate-in slide-in-from-bottom-5 duration-300">
        <div className="rounded-2xl border-2 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xl p-4 min-w-[600px]">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 text-white flex items-center justify-center font-bold shadow-md">
                {selectedTasks.length}
              </div>
              <div>
                <p className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                  {selectedTasks.length} task{selectedTasks.length !== 1 ? 's' : ''} selected
                </p>
                <p className="text-xs text-zinc-500">Choose an action to apply</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Status Actions */}
              <div className="flex gap-1 px-2 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800">
                <button
                  onClick={() => handleBulkStatusChange("todo")}
                  disabled={isProcessing}
                  className="px-3 py-1.5 rounded-md text-xs font-bold hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-50 transition-colors"
                  title="Move to To Do"
                >
                  📋 To Do
                </button>
                <button
                  onClick={() => handleBulkStatusChange("in_progress")}
                  disabled={isProcessing}
                  className="px-3 py-1.5 rounded-md text-xs font-bold hover:bg-yellow-100 dark:hover:bg-yellow-900/30 disabled:opacity-50 transition-colors"
                  title="Move to In Progress"
                >
                  ⚡ Progress
                </button>
                <button
                  onClick={() => handleBulkStatusChange("done")}
                  disabled={isProcessing}
                  className="px-3 py-1.5 rounded-md text-xs font-bold hover:bg-emerald-100 dark:hover:bg-emerald-900/30 disabled:opacity-50 transition-colors"
                  title="Move to Done"
                >
                  ✅ Done
                </button>
              </div>

              {/* Priority Actions */}
              <div className="flex gap-1 px-2 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800">
                <button
                  onClick={() => handleBulkPriorityChange("high")}
                  disabled={isProcessing}
                  className="px-3 py-1.5 rounded-md text-xs font-bold text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 disabled:opacity-50 transition-colors"
                  title="Set High Priority"
                >
                  🔴 High
                </button>
                <button
                  onClick={() => handleBulkPriorityChange("medium")}
                  disabled={isProcessing}
                  className="px-3 py-1.5 rounded-md text-xs font-bold text-yellow-600 hover:bg-yellow-100 dark:hover:bg-yellow-900/30 disabled:opacity-50 transition-colors"
                  title="Set Medium Priority"
                >
                  🟡 Medium
                </button>
                <button
                  onClick={() => handleBulkPriorityChange("low")}
                  disabled={isProcessing}
                  className="px-3 py-1.5 rounded-md text-xs font-bold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-50 transition-colors"
                  title="Set Low Priority"
                >
                  ⚪ Low
                </button>
              </div>

              {/* Delete */}
              <button
                onClick={() => setShowDeleteConfirm(true)}
                disabled={isProcessing}
                className="px-3 py-1.5 rounded-lg text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 disabled:opacity-50 transition-colors border-2 border-red-200 dark:border-red-800"
              >
                🗑️ Delete
              </button>

              {/* Close */}
              <button
                onClick={onClearSelection}
                disabled={isProcessing}
                className="px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 disabled:opacity-50 transition-colors"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleBulkDelete}
        title="Delete Multiple Tasks"
        message={
          <>
            <p>Are you sure you want to delete <strong>{selectedTasks.length} task{selectedTasks.length !== 1 ? 's' : ''}</strong>?</p>
            <p className="mt-2 text-xs text-zinc-500">This action cannot be undone. The following tasks will be permanently deleted:</p>
            <ul className="mt-2 space-y-1 max-h-32 overflow-y-auto text-xs">
              {selectedTasks.slice(0, 5).map(task => (
                <li key={task.id} className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                  <span className="truncate">{task.title}</span>
                </li>
              ))}
              {selectedTasks.length > 5 && (
                <li className="text-zinc-400 italic">... and {selectedTasks.length - 5} more</li>
              )}
            </ul>
          </>
        }
        type="danger"
        confirmText={`Delete ${selectedTasks.length} Task${selectedTasks.length !== 1 ? 's' : ''}`}
        isLoading={isProcessing}
      />
    </>
  );
}


