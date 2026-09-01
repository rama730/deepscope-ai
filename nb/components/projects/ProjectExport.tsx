"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

interface ProjectExportProps {
  projectId: string;
  projectTitle: string;
}

export default function ProjectExport({ projectId, projectTitle }: ProjectExportProps) {
  const supabase = createSupabaseBrowserClient();
  const [exporting, setExporting] = useState(false);
  const [exportType, setExportType] = useState<"json" | "csv" | "markdown">("json");

  async function handleExport() {
    setExporting(true);

    try {
      // Fetch all project data
      const [projectResult, tasksResult, filesResult, messagesResult, membersResult] = await Promise.all([
        supabase.from("projects").select("*").eq("id", projectId).single(),
        supabase.from("project_tasks").select("*").eq("project_id", projectId),
        supabase.from("project_files").select("*").eq("project_id", projectId),
        supabase.from("project_chat_messages").select("*").eq("project_id", projectId),
        supabase.from("project_collaborators").select("*, profiles(*)").eq("project_id", projectId),
      ]);

      const data = {
        project: projectResult.data,
        tasks: tasksResult.data || [],
        files: filesResult.data || [],
        messages: messagesResult.data || [],
        members: membersResult.data || [],
        exported_at: new Date().toISOString(),
      };

      let content: string;
      let filename: string;
      let mimeType: string;

      if (exportType === "json") {
        content = JSON.stringify(data, null, 2);
        filename = `${projectTitle.replace(/[^a-z0-9]/gi, '_')}_export.json`;
        mimeType = "application/json";
      } else if (exportType === "csv") {
        // Simple CSV export of tasks
        const headers = ["Title", "Status", "Priority", "Assigned To", "Created At"];
        const rows = data.tasks.map(task => [
          task.title,
          task.status,
          task.priority,
          task.assigned_to || "Unassigned",
          new Date(task.created_at).toLocaleDateString("en-US"),
        ]);
        content = [headers, ...rows].map(row => row.join(",")).join("\n");
        filename = `${projectTitle.replace(/[^a-z0-9]/gi, '_')}_tasks.csv`;
        mimeType = "text/csv";
      } else {
        // Markdown export
        content = `# ${data.project.title}\n\n`;
        content += `**Status:** ${data.project.status}\n\n`;
        content += `**Description:** ${data.project.description || "No description"}\n\n`;
        content += `## Tasks\n\n`;
        data.tasks.forEach(task => {
          content += `### ${task.title}\n`;
          content += `- **Status:** ${task.status}\n`;
          content += `- **Priority:** ${task.priority}\n`;
          if (task.description) content += `- **Description:** ${task.description}\n`;
          content += `\n`;
        });
        content += `\n## Files (${data.files.length})\n\n`;
        data.files.forEach(file => {
          content += `- ${file.name}\n`;
        });
        content += `\n---\n*Exported on ${new Date().toLocaleDateString("en-US")}*\n`;
        filename = `${projectTitle.replace(/[^a-z0-9]/gi, '_')}_export.md`;
        mimeType = "text/markdown";
      }

      // Download file
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

    } catch (error) {
      console.error("Export error:", error);
      alert("Failed to export project data");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="rounded-xl border-2 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-sm">
      <div className="flex items-start gap-3 mb-4">
        <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 text-white shadow-md">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-lg mb-1">Export Project</h3>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">Download all project data in your preferred format</p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-semibold mb-2">Export Format</label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: "json", label: "JSON", desc: "Complete data", icon: "{ }" },
              { id: "csv", label: "CSV", desc: "Tasks only", icon: "📊" },
              { id: "markdown", label: "Markdown", desc: "Readable", icon: "📝" },
            ].map(format => (
              <button
                key={format.id}
                onClick={() => setExportType(format.id as any)}
                className={`p-3 rounded-lg border-2 text-left transition-all ${exportType === format.id
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                    : "border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600"
                  }`}
              >
                <div className="text-2xl mb-1">{format.icon}</div>
                <div className="font-bold text-sm">{format.label}</div>
                <div className="text-xs text-zinc-500">{format.desc}</div>
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleExport}
          disabled={exporting}
          className="w-full px-5 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
        >
          {exporting ? (
            <>
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Exporting...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download Export
            </>
          )}
        </button>

        <div className="text-xs text-zinc-500 space-y-1">
          <p>• <strong>JSON:</strong> All data including tasks, files, messages, and members</p>
          <p>• <strong>CSV:</strong> Task list with status, priority, and assignees</p>
          <p>• <strong>Markdown:</strong> Human-readable project documentation</p>
        </div>
      </div>
    </div>
  );
}


