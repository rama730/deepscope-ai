"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Download, FileText, FileJson, FileSpreadsheet } from "lucide-react";

interface ExportProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: any;
  tasks: any[];
  files: any[];
  members: any[];
}

export default function ExportProjectModal({
  isOpen,
  onClose,
  project,
  tasks,
  files,
  members,
}: ExportProjectModalProps) {
  const [exporting, setExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<"json" | "markdown" | "csv" | null>(null);

  const exportAsJSON = () => {
    const data = {
      project: {
        title: project.title,
        description: project.description,
        status: project.status,
        project_type: project.project_type,
        created_at: project.created_at,
        updated_at: project.updated_at,
      },
      tasks: tasks.map(t => ({
        title: t.title,
        description: t.description,
        status: t.status,
        assigned_to: t.assigned_to,
        created_at: t.created_at,
      })),
      files: files.map(f => ({
        file_name: f.file_name,
        file_url: f.file_url,
        uploaded_at: f.created_at,
      })),
      members: members.map(m => ({
        user_id: m.user_id,
        role: m.role,
      })),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${project.title.replace(/\s+/g, "_")}_export.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportAsMarkdown = () => {
    let markdown = `# ${project.title}\n\n`;
    markdown += `**Status:** ${project.status}\n`;
    markdown += `**Type:** ${project.project_type || "N/A"}\n`;
    markdown += `**Created:** ${new Date(project.created_at).toLocaleDateString()}\n\n`;

    if (project.description) {
      markdown += `## Description\n\n${project.description}\n\n`;
    }

    if (tasks.length > 0) {
      markdown += `## Tasks (${tasks.length})\n\n`;
      tasks.forEach((task, idx) => {
        markdown += `${idx + 1}. **[${task.status}]** ${task.title}\n`;
        if (task.description) {
          markdown += `   ${task.description}\n`;
        }
      });
      markdown += "\n";
    }

    if (files.length > 0) {
      markdown += `## Files (${files.length})\n\n`;
      files.forEach(file => {
        markdown += `- ${file.file_name || "Untitled"}\n`;
      });
      markdown += "\n";
    }

    if (members.length > 0) {
      markdown += `## Team Members (${members.length})\n\n`;
      members.forEach(member => {
        markdown += `- ${member.profiles?.full_name || member.profiles?.username || "Member"} (${member.role || "Member"})\n`;
      });
    }

    const blob = new Blob([markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${project.title.replace(/\s+/g, "_")}_export.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportAsCSV = () => {
    // Export tasks as CSV
    const headers = ["Title", "Status", "Assigned To", "Created At"];
    const rows = tasks.map(task => [
      task.title || "",
      task.status || "",
      task.assigned_to || "",
      new Date(task.created_at).toLocaleDateString(),
    ]);

    const csv = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(","))
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${project.title.replace(/\s+/g, "_")}_tasks.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExport = async (format: "json" | "markdown" | "csv") => {
    setExporting(true);
    setExportFormat(format);

    try {
      switch (format) {
        case "json":
          exportAsJSON();
          break;
        case "markdown":
          exportAsMarkdown();
          break;
        case "csv":
          exportAsCSV();
          break;
      }
      setTimeout(() => {
        setExporting(false);
        setExportFormat(null);
        onClose();
      }, 500);
    } catch (error) {
      console.error("Export failed:", error);
      setExporting(false);
      setExportFormat(null);
    }
  };

  if (!isOpen) return null;

  const exportOptions = [
    {
      id: "json",
      label: "Export as JSON",
      description: "Complete project data in JSON format",
      icon: FileJson,
      onClick: () => handleExport("json"),
    },
    {
      id: "markdown",
      label: "Export as Markdown",
      description: "Project overview and tasks in Markdown format",
      icon: FileText,
      onClick: () => handleExport("markdown"),
    },
    {
      id: "csv",
      label: "Export Tasks as CSV",
      description: "Tasks list in CSV format for spreadsheets",
      icon: FileSpreadsheet,
      onClick: () => handleExport("csv"),
    },
  ];

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
                  <Download className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  <h2 className="text-xl font-semibold text-slate-900 dark:text-zinc-100">Export Project</h2>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-slate-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-3">
                {exportOptions.map((option) => {
                  const Icon = option.icon;
                  const isExporting = exporting && exportFormat === option.id;
                  return (
                    <button
                      key={option.id}
                      onClick={option.onClick}
                      disabled={exporting}
                      className="w-full flex items-start gap-3 p-4 border border-slate-200 dark:border-zinc-800 rounded-lg hover:bg-slate-50 dark:bg-zinc-900 dark:hover:bg-zinc-800 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Icon className={`w-5 h-5 mt-0.5 ${isExporting ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400 dark:text-zinc-500"}`} />
                      <div className="flex-1 text-left">
                        <div className="font-medium text-slate-900 dark:text-zinc-100">{option.label}</div>
                        <div className="text-sm text-slate-500 dark:text-zinc-400">{option.description}</div>
                      </div>
                      {isExporting && (
                        <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

