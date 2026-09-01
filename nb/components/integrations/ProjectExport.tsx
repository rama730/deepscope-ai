"use client";

import { useState } from "react";
import { FileText, FileJson, FileSpreadsheet } from "lucide-react";
import { useToast } from "@/components/ui-custom/Toast";

interface ProjectExportProps {
  project: any;
  tasks: any[];
  files: any[];
  members: any[];
  applications: any[];
}

export default function ProjectExport({
  project,
  tasks,
  files,
  members,
  applications,
}: ProjectExportProps) {
  const { showToast } = useToast();
  const [exporting, setExporting] = useState<string | null>(null);

  function exportToJSON() {
    setExporting("json");
    try {
      const data = {
        project,
        tasks,
        files,
        members,
        applications,
        exportedAt: new Date().toISOString(),
      };

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${project.title.replace(/[^a-z0-9]/gi, "_")}_export.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showToast("Project exported to JSON", "success");
    } catch (err) {
      console.error("Export error:", err);
      showToast("Failed to export project", "error");
    } finally {
      setExporting(null);
    }
  }

  function exportToPDF() {
    setExporting("pdf");
    showToast("PDF export coming soon", "info");
    setExporting(null);
    // TODO: Implement PDF export using a library like jsPDF or react-pdf
  }

  function exportToCSV() {
    setExporting("csv");
    try {
      // Export tasks to CSV
      const headers = ["Title", "Status", "Priority", "Assigned To", "Due Date", "Created At"];
      const rows = tasks.map(task => [
        task.title,
        task.status,
        task.priority,
        task.assigned_profile?.full_name || task.assigned_profile?.username || "Unassigned",
        task.due_date || "",
        task.created_at,
      ]);

      const csvContent = [
        headers.join(","),
        ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",")),
      ].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${project.title.replace(/[^a-z0-9]/gi, "_")}_tasks.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showToast("Tasks exported to CSV", "success");
    } catch (err) {
      console.error("Export error:", err);
      showToast("Failed to export", "error");
    } finally {
      setExporting(null);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">Export Project Data</h3>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Download your project data in various formats
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          onClick={exportToJSON}
          disabled={exporting !== null}
          className="p-4 border border-zinc-200 dark:border-zinc-800 rounded-lg hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 transition-all text-left group"
        >
          <FileJson className="w-8 h-8 text-indigo-600 dark:text-indigo-400 mb-2 group-hover:scale-110 transition-transform" />
          <h4 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-1">JSON Export</h4>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Complete project data in JSON format
          </p>
          {exporting === "json" && (
            <div className="mt-2 text-xs text-indigo-600">Exporting...</div>
          )}
        </button>

        <button
          onClick={exportToPDF}
          disabled={exporting !== null}
          className="p-4 border border-zinc-200 dark:border-zinc-800 rounded-lg hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 transition-all text-left group"
        >
          <FileText className="w-8 h-8 text-indigo-600 dark:text-indigo-400 mb-2 group-hover:scale-110 transition-transform" />
          <h4 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-1">PDF Export</h4>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Project summary as PDF document
          </p>
          {exporting === "pdf" && (
            <div className="mt-2 text-xs text-indigo-600">Exporting...</div>
          )}
        </button>

        <button
          onClick={exportToCSV}
          disabled={exporting !== null}
          className="p-4 border border-zinc-200 dark:border-zinc-800 rounded-lg hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 transition-all text-left group"
        >
          <FileSpreadsheet className="w-8 h-8 text-indigo-600 dark:text-indigo-400 mb-2 group-hover:scale-110 transition-transform" />
          <h4 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-1">CSV Export</h4>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Tasks data in CSV format
          </p>
          {exporting === "csv" && (
            <div className="mt-2 text-xs text-indigo-600">Exporting...</div>
          )}
        </button>
      </div>

      <div className="p-4 bg-zinc-50 dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
        <p className="text-xs text-zinc-600 dark:text-zinc-400">
          <strong>Note:</strong> Exported data includes project details, tasks, files, members, and applications.
          Sensitive information is included in the export.
        </p>
      </div>
    </div>
  );
}

