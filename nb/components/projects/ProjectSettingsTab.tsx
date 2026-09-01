"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { TabLoadingScreen } from "@/components/ui-custom/LoadingSkeleton";
import { TabInfoHelp } from "@/components/projects/TabInfoHelp";

interface ProjectSettingsTabProps {
  projectId: string;
  project: any;
  isProjectOwner: boolean;
  onProjectUpdated: (updatedProject: any) => void;
}

export default function ProjectSettingsTab({
  projectId,
  project,
  isProjectOwner,
  onProjectUpdated,
}: ProjectSettingsTabProps) {
  const supabase = createSupabaseBrowserClient();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState<"general" | "visibility" | "notifications" | "export" | "danger">("general");

  // General settings
  const [visibility, setVisibility] = useState(project?.visibility || "public");
  const [autoArchive, setAutoArchive] = useState(false);
  const [defaultAssignee, setDefaultAssignee] = useState<string>("");

  if (!isProjectOwner) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-20 h-20 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-4">
          <svg className="w-10 h-10 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h3 className="text-lg font-bold text-zinc-700 dark:text-zinc-300 mb-2">Access Restricted</h3>
        <p className="text-sm text-zinc-500">Only project owners can access settings.</p>
      </div>
    );
  }

  async function handleSaveVisibility() {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("projects")
        .update({ visibility })
        .eq("id", projectId);

      if (error) {
        console.error("Error updating visibility:", error);
        alert("Failed to update visibility");
      } else {
        onProjectUpdated({ ...project, visibility });
        alert("Visibility updated successfully");
      }
    } catch (err) {
      console.error("Exception:", err);
      alert("An error occurred");
    } finally {
      setSaving(false);
    }
  }

  async function handleExportData() {
    setLoading(true);
    try {
      // Export tasks
      const { data: tasks } = await supabase
        .from("project_tasks")
        .select("*")
        .eq("project_id", projectId);

      // Export files
      const { data: files } = await supabase
        .from("project_files")
        .select("*")
        .eq("project_id", projectId);

      // Export chat messages
      const { data: messages } = await supabase
        .from("project_chat_messages")
        .select("*")
        .eq("project_id", projectId);

      const exportData = {
        project: {
          id: project.id,
          title: project.title,
          description: project.description,
          status: project.status,
          created_at: project.created_at,
        },
        tasks: tasks || [],
        files: files || [],
        messages: messages || [],
        exported_at: new Date().toISOString(),
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `project-${project.title.replace(/[^a-z0-9]/gi, "-")}-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Exception exporting data:", err);
      alert("An error occurred while exporting");
    } finally {
      setLoading(false);
    }
  }

  async function handleArchiveProject() {
    if (!confirm("Are you sure you want to archive this project? It will be hidden from public view but not deleted.")) {
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("projects")
        .update({ status: "archived", visibility: "private" })
        .eq("id", projectId);

      if (error) {
        console.error("Error archiving project:", error);
        alert("Failed to archive project");
      } else {
        onProjectUpdated({ ...project, status: "archived", visibility: "private" });
        alert("Project archived successfully");
      }
    } catch (err) {
      console.error("Exception:", err);
      alert("An error occurred");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteProject() {
    if (!confirm("Are you sure you want to DELETE this project? This action cannot be undone.")) {
      return;
    }

    // Double confirmation
    if (!confirm("Please confirm again: This will permanently delete the project, all tasks, files, and messages. Are you absolutely sure?")) {
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("projects")
        .delete()
        .eq("id", projectId);

      if (error) {
        console.error("Error deleting project:", error);
        alert("Failed to delete project");
      } else {
        alert("Project deleted successfully");
        window.location.href = "/hub";
      }
    } catch (err) {
      console.error("Exception:", err);
      alert("An error occurred");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Settings</h2>
        <TabInfoHelp
          title="Settings"
          description="Manage project configuration, visibility, and team-related preferences."
          bullets={[
            "Only project owners can access settings",
            "Use Danger Zone carefully (permanent changes)",
          ]}
        />
      </div>

      {/* Section Tabs */}
      <div className="flex gap-2 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
        {[
          { id: "general", label: "General", icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" },
          { id: "visibility", label: "Visibility", icon: "M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" },
          { id: "notifications", label: "Notifications", icon: "M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" },
          { id: "export", label: "Export", icon: "M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" },
          { id: "danger", label: "Danger Zone", icon: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" },
        ].map((s) => (
          <button
            key={s.id}
            onClick={() => setActiveSection(s.id as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeSection === s.id
              ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-sm"
              : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
              }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={s.icon} />
            </svg>
            {s.label}
          </button>
        ))}
      </div>

      {/* Settings Content */}
      <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
        {activeSection === "general" && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-4">General Settings</h3>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg border border-zinc-200 dark:border-zinc-700">
                  <div>
                    <p className="font-semibold text-zinc-900 dark:text-zinc-100">Auto-archive completed tasks</p>
                    <p className="text-sm text-zinc-500 mt-1">Automatically move completed tasks to archive after 30 days</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoArchive}
                      onChange={e => setAutoArchive(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-zinc-600 peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeSection === "visibility" && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-4">Project Visibility</h3>

              <div className="space-y-3">
                <label className="flex items-start gap-3 p-4 rounded-lg border border-zinc-200 dark:border-zinc-700 cursor-pointer hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800/50 transition-colors">
                  <input
                    type="radio"
                    name="visibility"
                    value="public"
                    checked={visibility === "public"}
                    onChange={e => setVisibility(e.target.value)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <p className="font-semibold text-zinc-900 dark:text-zinc-100">Public</p>
                    <p className="text-sm text-zinc-500 mt-1">Anyone can view and discover this project</p>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-4 rounded-lg border border-zinc-200 dark:border-zinc-700 cursor-pointer hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800/50 transition-colors">
                  <input
                    type="radio"
                    name="visibility"
                    value="unlisted"
                    checked={visibility === "unlisted"}
                    onChange={e => setVisibility(e.target.value)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <p className="font-semibold text-zinc-900 dark:text-zinc-100">Unlisted</p>
                    <p className="text-sm text-zinc-500 mt-1">Only people with the link can view this project</p>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-4 rounded-lg border border-zinc-200 dark:border-zinc-700 cursor-pointer hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800/50 transition-colors">
                  <input
                    type="radio"
                    name="visibility"
                    value="private"
                    checked={visibility === "private"}
                    onChange={e => setVisibility(e.target.value)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <p className="font-semibold text-zinc-900 dark:text-zinc-100">Private</p>
                    <p className="text-sm text-zinc-500 mt-1">Only project members can view this project</p>
                  </div>
                </label>
              </div>

              <button
                onClick={handleSaveVisibility}
                disabled={saving || visibility === project?.visibility}
                className="mt-4 px-4 py-2 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        )}

        {activeSection === "notifications" && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-4">Notification Preferences</h3>
              <p className="text-sm text-zinc-500 mb-4">Configure how you receive notifications for this project</p>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg border border-zinc-200 dark:border-zinc-700">
                  <div>
                    <p className="font-semibold text-zinc-900 dark:text-zinc-100">New applications</p>
                    <p className="text-sm text-zinc-500 mt-1">Get notified when someone applies to join</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" defaultChecked className="sr-only peer" />
                    <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-zinc-600 peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg border border-zinc-200 dark:border-zinc-700">
                  <div>
                    <p className="font-semibold text-zinc-900 dark:text-zinc-100">Task assignments</p>
                    <p className="text-sm text-zinc-500 mt-1">Get notified when tasks are assigned to you</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" defaultChecked className="sr-only peer" />
                    <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-zinc-600 peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg border border-zinc-200 dark:border-zinc-700">
                  <div>
                    <p className="font-semibold text-zinc-900 dark:text-zinc-100">Chat messages</p>
                    <p className="text-sm text-zinc-500 mt-1">Get notified for new messages in project chat</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" defaultChecked className="sr-only peer" />
                    <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-zinc-600 peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeSection === "export" && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-4">Export Project Data</h3>
              <p className="text-sm text-zinc-500 mb-4">Download all project data as a JSON file for backup or migration</p>

              <button
                onClick={handleExportData}
                disabled={loading}
                className="px-4 py-2 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Exporting...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Export All Data
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {activeSection === "danger" && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-bold text-red-600 dark:text-red-400 mb-4">Danger Zone</h3>

              <div className="space-y-4">
                <div className="p-4 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-red-900 dark:text-red-100">Archive Project</p>
                      <p className="text-sm text-red-800 dark:text-red-200 mt-1">Hide this project from public view. It can be restored later.</p>
                    </div>
                    <button
                      onClick={handleArchiveProject}
                      disabled={saving}
                      className="px-4 py-2 rounded-md border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 text-sm font-medium hover:bg-red-100 dark:hover:bg-red-950/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {saving ? "Archiving..." : "Archive"}
                    </button>
                  </div>
                </div>

                <div className="p-4 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-red-900 dark:text-red-100">Delete Project</p>
                      <p className="text-sm text-red-800 dark:text-red-200 mt-1">Permanently delete this project and all its data. This action cannot be undone.</p>
                    </div>
                    <button
                      onClick={handleDeleteProject}
                      disabled={saving}
                      className="px-4 py-2 rounded-md bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {saving ? "Deleting..." : "Delete Project"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

