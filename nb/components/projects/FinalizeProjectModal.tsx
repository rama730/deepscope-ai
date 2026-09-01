"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { CheckCircle, X, Loader2, AlertTriangle } from "lucide-react";

interface FinalizeProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: any;
  tasks: any[];

  currentUser: any;
  onRefresh: () => void;
}

export default function FinalizeProjectModal({
  isOpen,
  onClose,
  project,
  tasks,


  onRefresh,
}: FinalizeProjectModalProps) {
  const supabase = createSupabaseBrowserClient();
  const [finalizing, setFinalizing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const completedTasks = tasks.filter((t: any) => t.status === "done");
  const totalTasks = tasks.length;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks.length / totalTasks) * 100) : 0;

  async function handleFinalize() {
    if (!project) return;

    setFinalizing(true);
    setError(null);

    try {
      // Update project status to completed
      const { error: updateError } = await supabase
        .from("projects")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", project.id);

      if (updateError) {
        throw updateError;
      }

      onRefresh();
      onClose();
    } catch (err: any) {
      console.error("Error finalizing project:", err);
      setError(err.message || "Failed to finalize project. Please try again.");
    } finally {
      setFinalizing(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 w-full max-w-2xl rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 space-y-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-zinc-100">
                Finalize & Publish Project
              </h2>
              <p className="text-sm text-slate-600 dark:text-zinc-400">
                Mark this project as completed and make it publicly visible
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5 text-slate-500 dark:text-zinc-400" />
          </button>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          </div>
        )}

        {/* Project Summary */}
        <div className="space-y-4">
          <div className="rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/50 p-4">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-zinc-100 mb-3">
              Project Summary
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-zinc-400">Total Tasks</span>
                <span className="font-medium text-slate-900 dark:text-zinc-100">{totalTasks}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-zinc-400">Completed Tasks</span>
                <span className="font-medium text-slate-900 dark:text-zinc-100">
                  {completedTasks.length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-zinc-400">Completion Rate</span>
                <span className="font-medium text-slate-900 dark:text-zinc-100">
                  {completionRate}%
                </span>
              </div>

            </div>
          </div>

          {/* Warning */}
          <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-700 dark:text-amber-300">
                <p className="font-medium mb-1">Before finalizing:</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Ensure all important tasks are completed</li>
                  <li>Review project outcomes and deliverables</li>
                  <li>Consider customizing the public view settings</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-zinc-800">
          <button
            onClick={onClose}
            disabled={finalizing}
            className="px-4 py-2 rounded-lg border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleFinalize}
            disabled={finalizing}
            className="px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {finalizing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Finalizing...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                Finalize Project
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

