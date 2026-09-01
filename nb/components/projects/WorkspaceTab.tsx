"use client";

import { useState } from "react";
import { ClipboardList, FileArchive, Briefcase } from "lucide-react";
import dynamic from "next/dynamic";

// Dynamically import the tabs for better performance
const TasksTab = dynamic(() => import("@/components/projects/TasksTab"), { ssr: false });
const FilesTab = dynamic(() => import("@/components/projects/FilesTab"), { ssr: false });

interface WorkspaceTabProps {
  projectId: string;
  isOwnerOrMember: boolean;
  projectCreatorId?: string;
  currentUserId: string | null;
  initialTasks?: any[];
  totalCount?: number;
  initialPage?: number;
  initialLimit?: number;
  initialFiles?: any[];
}

type WorkspaceView = "tasks" | "files";

export default function WorkspaceTab({
  projectId,
  isOwnerOrMember,
  projectCreatorId,
  currentUserId,
  initialTasks = [],
  totalCount = 0,
  initialPage = 1,
  initialLimit = 20,
  initialFiles = []
}: WorkspaceTabProps) {
  const [workspaceView, setWorkspaceView] = useState<WorkspaceView>("tasks");
  const [activePanel, setActivePanel] = useState<"tasks" | "files">("tasks");

  // Lock access check
  if (!isOwnerOrMember) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-20 h-20 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-4">
          <svg className="w-10 h-10 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h3 className="text-lg font-bold text-zinc-700 dark:text-zinc-300 mb-2">Access Restricted</h3>
        <p className="text-sm text-zinc-500">You must be a project member to access the workspace.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Workspace Header with View Controls */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Briefcase className="w-5 h-5" />
            Workspace
          </h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
            Manage tasks and files in one place
          </p>
        </div>

        {/* View Mode Controls */}
        <div className="flex items-center gap-2">
          {/* Desktop & Mobile View Controls */}
          <div className="flex items-center gap-1 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
            <button
              onClick={() => { setWorkspaceView("tasks"); setActivePanel("tasks"); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${workspaceView === "tasks"
                ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-sm"
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
                }`}
              title="View Tasks"
            >
              <ClipboardList className="w-4 h-4" />
              <span>Tasks</span>
            </button>
            <button
              onClick={() => { setWorkspaceView("files"); setActivePanel("files"); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${workspaceView === "files"
                ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-sm"
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
                }`}
              title="View Files"
            >
              <FileArchive className="w-4 h-4" />
              <span>Files</span>
            </button>
          </div>
        </div>
      </div>

      {/* Info Banner */}
      <div className="rounded-lg border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/30 p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-600 dark:bg-blue-500 flex items-center justify-center">
            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1">
              Workspace Tips
            </h4>
            <p className="text-xs text-blue-800 dark:text-blue-200 leading-relaxed">
              {workspaceView === "tasks" ? (
                <>Focused task view. Use keyboard shortcuts: Ctrl+N for new task, Ctrl+K for search, Ctrl+R to refresh.</>
              ) : (
                <>Organized file management. Filter by category or type, preview files, and bulk actions for efficiency.</>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Workspace Content Area */}
      <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
        <div className="p-6">
          {workspaceView === "tasks" ? (
            <TasksTab
              projectId={projectId}
              isOwnerOrMember={isOwnerOrMember}
              projectCreatorId={projectCreatorId}
              initialTasks={initialTasks}
              totalCount={totalCount}
              initialPage={initialPage}
              initialLimit={initialLimit}
            />
          ) : (
            <FilesTab
              projectId={projectId}
              isOwnerOrMember={isOwnerOrMember}
              initialFiles={initialFiles}
            />
          )}
        </div>
      </div>

      {/* Quick Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/20 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-600 dark:bg-blue-500 flex items-center justify-center">
              <ClipboardList className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-xs text-blue-700 dark:text-blue-300 font-medium">Active Tasks</p>
              <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">-</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950/30 dark:to-emerald-900/20 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-600 dark:bg-emerald-500 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-emerald-700 dark:text-emerald-300 font-medium">Completed</p>
              <p className="text-2xl font-bold text-emerald-900 dark:text-emerald-100">-</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/30 dark:to-purple-900/20 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-600 dark:bg-purple-500 flex items-center justify-center">
              <FileArchive className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-xs text-purple-700 dark:text-purple-300 font-medium">Total Files</p>
              <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">-</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/30 dark:to-amber-900/20 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-600 dark:bg-amber-500 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-amber-700 dark:text-amber-300 font-medium">Hours Logged</p>
              <p className="text-2xl font-bold text-amber-900 dark:text-amber-100">-</p>
            </div>
          </div>
        </div>
      </div>

      {/* Keyboard Shortcuts Hint */}
      <div className="hidden md:block">
        <details className="group">
          <summary className="cursor-pointer list-none">
            <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
              <svg className="w-4 h-4 transition-transform group-open:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <span className="font-medium">Keyboard Shortcuts</span>
            </div>
          </summary>
          <div className="mt-3 p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
              <div className="flex items-center gap-2">
                <kbd className="px-2 py-1 rounded bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 font-mono">Ctrl</kbd>
                <span>+</span>
                <kbd className="px-2 py-1 rounded bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 font-mono">N</kbd>
                <span className="text-zinc-600 dark:text-zinc-400">New Task</span>
              </div>
              <div className="flex items-center gap-2">
                <kbd className="px-2 py-1 rounded bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 font-mono">Ctrl</kbd>
                <span>+</span>
                <kbd className="px-2 py-1 rounded bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 font-mono">K</kbd>
                <span className="text-zinc-600 dark:text-zinc-400">Search</span>
              </div>
              <div className="flex items-center gap-2">
                <kbd className="px-2 py-1 rounded bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 font-mono">Ctrl</kbd>
                <span>+</span>
                <kbd className="px-2 py-1 rounded bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 font-mono">R</kbd>
                <span className="text-zinc-600 dark:text-zinc-400">Refresh</span>
              </div>
            </div>
          </div>
        </details>
      </div>
    </div>
  );
}

