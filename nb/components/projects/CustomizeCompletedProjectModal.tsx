"use client";

import { useState, useEffect } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Settings, X, Loader2, CheckCircle, Eye, EyeOff } from "lucide-react";

interface CustomizeCompletedProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: any;
  onSaved: () => void;
}

export default function CustomizeCompletedProjectModal({
  isOpen,
  onClose,
  project,
  onSaved,
}: CustomizeCompletedProjectModalProps) {
  const supabase = createSupabaseBrowserClient();
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    show_tasks: true,
    show_files: true,
    show_analytics: true,
    show_team: true,
  });

  useEffect(() => {
    if (project?.public_view_settings) {
      setSettings({
        show_tasks: project.public_view_settings.show_tasks !== false,
        show_files: project.public_view_settings.show_files !== false,
        show_analytics: project.public_view_settings.show_analytics !== false,
        show_team: project.public_view_settings.show_team !== false,
      });
    }
  }, [project]);

  if (!isOpen) return null;

  async function handleSave() {
    if (!project) return;

    setSaving(true);

    try {
      const { error } = await supabase
        .from("projects")
        .update({
          public_view_settings: settings,
        })
        .eq("id", project.id);

      if (error) {
        throw error;
      }

      onSaved();
      onClose();
    } catch (err: any) {
      console.error("Error saving settings:", err);
      alert("Failed to save settings. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 w-full max-w-2xl rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 space-y-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
              <Settings className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-zinc-100">
                Customize Public View
              </h2>
              <p className="text-sm text-slate-600 dark:text-zinc-400">
                Control what visitors can see in the public completed project view
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

        {/* Settings */}
        <div className="space-y-4">
          <div className="rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/50 p-4">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-zinc-100 mb-4">
              Visibility Settings
            </h3>
            <div className="space-y-3">
              {[
                {
                  key: "show_tasks",
                  label: "Show Tasks",
                  description: "Display project tasks and their completion status",
                },
                {
                  key: "show_files",
                  label: "Show Files",
                  description: "Display project files and documents",
                },
                {
                  key: "show_analytics",
                  label: "Show Analytics",
                  description: "Display project statistics and insights",
                },
                {
                  key: "show_team",
                  label: "Show Team",
                  description: "Display team members and their roles",
                },
              ].map((item) => (
                <div
                  key={item.key}
                  className="flex items-start justify-between p-3 rounded-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {settings[item.key as keyof typeof settings] ? (
                        <Eye className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <EyeOff className="w-4 h-4 text-slate-400 dark:text-zinc-500" />
                      )}
                      <label
                        htmlFor={item.key}
                        className="text-sm font-medium text-slate-900 dark:text-zinc-100 cursor-pointer"
                      >
                        {item.label}
                      </label>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-zinc-400 ml-6">
                      {item.description}
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      setSettings((prev) => ({
                        ...prev,
                        [item.key]: !prev[item.key as keyof typeof prev],
                      }))
                    }
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      settings[item.key as keyof typeof settings]
                        ? "bg-indigo-600"
                        : "bg-slate-300 dark:bg-zinc-700"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white dark:bg-zinc-900 transition-transform ${
                        settings[item.key as keyof typeof settings] ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-zinc-800">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 rounded-lg border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                Save Settings
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

