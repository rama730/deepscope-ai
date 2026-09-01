"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

interface TimeLog {
  id: string;
  task_id: string;
  user_id: string;
  hours: number;
  description: string | null;
  logged_at: string;
  created_at: string;
  user_profile?: {
    full_name: string | null;
    username: string | null;
  };
}

interface TimeTrackingModalProps {
  taskId: string;
  projectId: string;
  currentUserId: string | null;
  estimatedHours?: number | null;
  loggedHours?: number | null;
  onClose: () => void;
  onUpdate: () => void;
}

export default function TimeTrackingModal({
  taskId,
  projectId,
  currentUserId,
  estimatedHours,
  loggedHours,
  onClose,
  onUpdate,
}: TimeTrackingModalProps) {
  const supabase = createSupabaseBrowserClient();
  const [timeLogs, setTimeLogs] = useState<TimeLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [hours, setHours] = useState("");
  const [description, setDescription] = useState("");
  const [estimated, setEstimated] = useState(estimatedHours?.toString() || "");

  useEffect(() => {
    loadTimeLogs();
  }, [taskId]);

  async function loadTimeLogs() {
    setLoading(true);
    const { data, error } = await supabase
      .from("time_logs")
      .select(`
        *,
        user_profile:user_id(full_name, username)
      `)
      .eq("task_id", taskId)
      .order("logged_at", { ascending: false });

    if (error) {
      console.error("Error loading time logs:", error);
    } else {
      setTimeLogs(data || []);
    }
    setLoading(false);
  }

  async function handleLogTime(e: React.FormEvent) {
    e.preventDefault();
    if (!hours || !currentUserId || submitting) return;

    const hoursNum = parseFloat(hours);
    if (isNaN(hoursNum) || hoursNum <= 0) {
      alert("Please enter a valid number of hours");
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("time_logs")
        .insert({
          task_id: taskId,
          user_id: currentUserId,
          project_id: projectId,
          hours: hoursNum,
          description: description.trim() || null,
        });

      if (error) {
        console.error("Error logging time:", error);
        alert("Failed to log time");
      } else {
        setHours("");
        setDescription("");
        await loadTimeLogs();
        onUpdate();
      }
    } catch (err) {
      console.error("Exception:", err);
      alert("An error occurred");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdateEstimate() {
    if (!currentUserId) return;

    const estimatedNum = estimated ? parseFloat(estimated) : null;
    if (estimated && (isNaN(estimatedNum!) || estimatedNum! <= 0)) {
      alert("Please enter a valid number of hours");
      return;
    }

    try {
      const { error } = await supabase
        .from("project_tasks")
        .update({ estimated_hours: estimatedNum })
        .eq("id", taskId);

      if (error) {
        console.error("Error updating estimate:", error);
        alert("Failed to update estimate");
      } else {
        onUpdate();
      }
    } catch (err) {
      console.error("Exception:", err);
      alert("An error occurred");
    }
  }

  const totalLogged = timeLogs.reduce((sum, log) => sum + parseFloat(log.hours.toString()), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-2xl max-h-[90vh] rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 border-b border-zinc-200 dark:border-zinc-800 px-6 py-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Time Tracking</h3>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-md hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 p-4">
              <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                {totalLogged.toFixed(1)}
              </div>
              <div className="text-xs text-zinc-500 mt-1">Hours Logged</div>
            </div>
            <div className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 p-4">
              <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                {estimatedHours ? estimatedHours.toFixed(1) : "—"}
              </div>
              <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">Estimated</div>
            </div>
            <div className={`rounded-lg border p-4 ${
              estimatedHours && totalLogged > estimatedHours
                ? "border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30"
                : "border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30"
            }`}>
              <div className={`text-2xl font-bold ${
                estimatedHours && totalLogged > estimatedHours
                  ? "text-red-700 dark:text-red-300"
                  : "text-emerald-700 dark:text-emerald-300"
              }`}>
                {estimatedHours ? ((totalLogged / estimatedHours) * 100).toFixed(0) : "—"}%
              </div>
              <div className={`text-xs mt-1 ${
                estimatedHours && totalLogged > estimatedHours
                  ? "text-red-600 dark:text-red-400"
                  : "text-emerald-600 dark:text-emerald-400"
              }`}>
                Progress
              </div>
            </div>
          </div>

          {/* Log Time Form */}
          <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4">
            <h4 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Log Time</h4>
            <form onSubmit={handleLogTime} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                    Hours *
                  </label>
                  <input
                    type="number"
                    step="0.25"
                    min="0"
                    value={hours}
                    onChange={e => setHours(e.target.value)}
                    required
                    className="w-full px-4 py-2 rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-colors text-sm"
                    placeholder="2.5"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                    Estimated Hours
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      step="0.25"
                      min="0"
                      value={estimated}
                      onChange={e => setEstimated(e.target.value)}
                      className="flex-1 px-4 py-2 rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-colors text-sm"
                      placeholder="8"
                    />
                    <button
                      type="button"
                      onClick={handleUpdateEstimate}
                      className="px-3 py-2 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
                    >
                      Save
                    </button>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                  Description (Optional)
                </label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={2}
                  className="w-full px-4 py-2 rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-colors text-sm resize-none"
                  placeholder="What did you work on?"
                />
              </div>
              <button
                type="submit"
                disabled={submitting || !hours}
                className="w-full px-4 py-2 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? "Logging..." : "Log Time"}
              </button>
            </form>
          </div>

          {/* Time Logs */}
          <div>
            <h4 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Time Log History</h4>
            {loading ? (
              <div className="text-center py-8 text-zinc-500">Loading...</div>
            ) : timeLogs.length === 0 ? (
              <div className="text-center py-8 text-zinc-500">No time logs yet</div>
            ) : (
              <div className="space-y-2">
                {timeLogs.map((log) => (
                  <div
                    key={log.id}
                    className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="h-6 w-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 text-white flex items-center justify-center text-xs font-semibold">
                            {log.user_profile?.full_name?.[0]?.toUpperCase() || 
                             log.user_profile?.username?.[0]?.toUpperCase() || "U"}
                          </div>
                          <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                            {log.user_profile?.full_name || log.user_profile?.username || "Unknown"}
                          </span>
                          <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                            {parseFloat(log.hours.toString()).toFixed(2)}h
                          </span>
                        </div>
                        {log.description && (
                          <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">{log.description}</p>
                        )}
                        <p className="text-xs text-zinc-500 mt-2">
                          {new Date(log.logged_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

