"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Download, FileText, FileJson, FileSpreadsheet } from "lucide-react";
import { useState } from "react";
import { Notification } from "@/lib/utils/notifications";

interface NotificationExportModalProps {
  notifications: Notification[];
  isOpen: boolean;
  onClose: () => void;
}

export default function NotificationExportModal({
  notifications,
  isOpen,
  onClose,
}: NotificationExportModalProps) {
  const [exporting, setExporting] = useState(false);

  const exportToJSON = () => {
    setExporting(true);
    const dataStr = JSON.stringify(notifications, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `notifications-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setExporting(false);
    onClose();
  };

  const exportToCSV = () => {
    setExporting(true);
    const headers = ['ID', 'Type', 'Message', 'Read', 'Created At', 'Actor'];
    const rows = notifications.map(n => [
      n.id,
      n.type,
      n.message.replace(/,/g, ';'),
      n.is_read ? 'Yes' : 'No',
      new Date(n.created_at).toISOString(),
      n.actor?.full_name || n.actor?.username || 'Unknown',
    ]);
    
    const csv = [
      headers.join(','),
      ...rows.map(r => r.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const dataBlob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `notifications-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    setExporting(false);
    onClose();
  };

  const exportToMarkdown = () => {
    setExporting(true);
    const md = notifications.map(n => {
      const date = new Date(n.created_at).toLocaleString();
      const actor = n.actor?.full_name || n.actor?.username || 'Unknown';
      return `## ${n.type.toUpperCase()} - ${date}\n\n${n.message}\n\n**Actor:** ${actor}\n**Read:** ${n.is_read ? 'Yes' : 'No'}\n\n---\n\n`;
    }).join('\n');

    const dataBlob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `notifications-${new Date().toISOString().split('T')[0]}.md`;
    link.click();
    URL.revokeObjectURL(url);
    setExporting(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200]"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="fixed inset-0 z-[201] flex items-center justify-center p-4 pointer-events-none"
        >
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl max-w-md w-full pointer-events-auto">
            <div className="flex items-center justify-between p-6 border-b border-zinc-200 dark:border-zinc-800">
              <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                Export Notifications
              </h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-3">
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
                Export {notifications.length} notification{notifications.length !== 1 ? 's' : ''} in your preferred format.
              </p>

              <button
                onClick={exportToJSON}
                disabled={exporting}
                className="w-full flex items-center gap-3 p-4 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg transition-colors disabled:opacity-50"
              >
                <FileJson className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
                <div className="flex-1 text-left">
                  <div className="font-medium text-zinc-900 dark:text-zinc-100">JSON</div>
                  <div className="text-xs text-zinc-500">Structured data format</div>
                </div>
                <Download className="w-4 h-4 text-zinc-500" />
              </button>

              <button
                onClick={exportToCSV}
                disabled={exporting}
                className="w-full flex items-center gap-3 p-4 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg transition-colors disabled:opacity-50"
              >
                <FileSpreadsheet className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
                <div className="flex-1 text-left">
                  <div className="font-medium text-zinc-900 dark:text-zinc-100">CSV</div>
                  <div className="text-xs text-zinc-500">Spreadsheet compatible</div>
                </div>
                <Download className="w-4 h-4 text-zinc-500" />
              </button>

              <button
                onClick={exportToMarkdown}
                disabled={exporting}
                className="w-full flex items-center gap-3 p-4 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg transition-colors disabled:opacity-50"
              >
                <FileText className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
                <div className="flex-1 text-left">
                  <div className="font-medium text-zinc-900 dark:text-zinc-100">Markdown</div>
                  <div className="text-xs text-zinc-500">Readable text format</div>
                </div>
                <Download className="w-4 h-4 text-zinc-500" />
              </button>
            </div>
          </div>
        </motion.div>
      </>
    </AnimatePresence>
  );
}
