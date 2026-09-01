"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Copy, Loader2 } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

interface DuplicateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: any;
  onSuccess?: () => void;
}

export default function DuplicateProjectModal({
  isOpen,
  onClose,
  project,
  onSuccess,
}: DuplicateProjectModalProps) {
  const [projectName, setProjectName] = useState(`${project?.title || "Project"} (Copy)`);
  const [duplicating, setDuplicating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createSupabaseBrowserClient();

  const handleDuplicate = async () => {
    if (!project || !projectName.trim()) return;

    setDuplicating(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError("You must be logged in to duplicate a project");
        return;
      }

      // Create new project with copied data
      const { data: newProject, error: createError } = await supabase
        .from("projects")
        .insert({
          creator_id: user.id,
          title: projectName.trim(),
          description: project.description,
          status: "open", // Start as open
          project_type: project.project_type,
          custom_project_type: project.custom_project_type,
          technologies_used: project.technologies_used,
          tags: project.tags,
          visibility: project.visibility,
          // Don't copy lifecycle_stages or current_stage_index - start fresh
        })
        .select()
        .single();

      if (createError) throw createError;

      // Copy collaborators (optional - you might want to skip this)
      // Copy tasks, files, etc. could be done here too

      if (onSuccess) {
        onSuccess();
      }

      // Navigate to new project
      window.location.href = `/projects/${newProject.id}`;
    } catch (err: any) {
      console.error("Error duplicating project:", err);
      setError(err.message || "Failed to duplicate project");
    } finally {
      setDuplicating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-50"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-2xl max-w-md w-full border border-slate-200 dark:border-zinc-800">
              <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-zinc-800">
                <div className="flex items-center gap-3">
                  <Copy className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  <h2 className="text-xl font-semibold text-slate-900 dark:text-zinc-100">Duplicate Project</h2>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-slate-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                {error && (
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300">
                    {error}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-zinc-300 mb-2">
                    New Project Name
                  </label>
                  <input
                    type="text"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Enter project name"
                    disabled={duplicating}
                  />
                </div>

                <div className="text-sm text-slate-600 dark:text-zinc-400">
                  This will create a copy of the project with all settings, but start fresh with no tasks, files, or collaborators.
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={onClose}
                    disabled={duplicating}
                    className="flex-1 px-4 py-2 border border-slate-300 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 rounded-lg hover:bg-slate-50 dark:bg-zinc-900 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDuplicate}
                    disabled={duplicating || !projectName.trim()}
                    className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {duplicating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Duplicating...
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Duplicate
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

