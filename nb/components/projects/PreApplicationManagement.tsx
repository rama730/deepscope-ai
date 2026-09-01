"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { CheckCircle, X, Clock, Loader2, UserPlus } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

interface PreApplication {
  id: string;
  idea_id: string;
  user_id: string;
  role_name: string | null;
  message: string | null;
  status: "pending" | "accepted" | "rejected";
  created_at: string;
  profiles?: {
    id: string;
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
  };
}

interface Props {
  ideaId: string;
  onClose: () => void;
  onUpdate?: () => void;
}

export default function PreApplicationManagement({ ideaId, onClose, onUpdate }: Props) {
  const supabase = createSupabaseBrowserClient();
  const [applications, setApplications] = useState<PreApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "accepted" | "rejected">("all");
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    loadApplications();
  }, [ideaId]);

  async function loadApplications() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("project_idea_pre_applications")
        .select(`
          *,
          profiles:user_id(id, full_name, username, avatar_url)
        `)
        .eq("idea_id", ideaId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setApplications(data || []);
    } catch (error) {
      console.error("Error loading pre-applications:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleAccept(applicationId: string) {
    setProcessingId(applicationId);
    try {
      const { error } = await supabase
        .from("project_idea_pre_applications")
        .update({ status: "accepted" })
        .eq("id", applicationId);

      if (error) throw error;
      await loadApplications();
      onUpdate?.();
    } catch (error) {
      console.error("Error accepting application:", error);
      alert("Failed to accept application. Please try again.");
    } finally {
      setProcessingId(null);
    }
  }

  async function handleReject(applicationId: string) {
    setProcessingId(applicationId);
    try {
      const { error } = await supabase
        .from("project_idea_pre_applications")
        .update({ status: "rejected" })
        .eq("id", applicationId);

      if (error) throw error;
      await loadApplications();
      onUpdate?.();
    } catch (error) {
      console.error("Error rejecting application:", error);
      alert("Failed to reject application. Please try again.");
    } finally {
      setProcessingId(null);
    }
  }

  const filteredApplications = applications.filter((app) => {
    if (filter === "all") return true;
    return app.status === filter;
  });

  const pendingCount = applications.filter((a) => a.status === "pending").length;
  const acceptedCount = applications.filter((a) => a.status === "accepted").length;
  const rejectedCount = applications.filter((a) => a.status === "rejected").length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-xl">
        {/* Header */}
        <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-indigo-600" />
            <div>
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                Pre-Application Management
              </h2>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                Review and manage applications to your idea
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-600 dark:text-zinc-400 dark:hover:text-zinc-300 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Filters */}
        <div className="px-6 pt-4 flex items-center gap-2 flex-wrap border-b border-zinc-200 dark:border-zinc-800 pb-4">
          <button
            onClick={() => setFilter("all")}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filter === "all"
              ? "bg-indigo-600 text-white"
              : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700"
              }`}
          >
            All ({applications.length})
          </button>
          <button
            onClick={() => setFilter("pending")}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${filter === "pending"
              ? "bg-amber-600 text-white"
              : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700"
              }`}
          >
            <Clock className="w-4 h-4" />
            Pending ({pendingCount})
          </button>
          <button
            onClick={() => setFilter("accepted")}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${filter === "accepted"
              ? "bg-emerald-600 text-white"
              : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700"
              }`}
          >
            <CheckCircle className="w-4 h-4" />
            Accepted ({acceptedCount})
          </button>
          <button
            onClick={() => setFilter("rejected")}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filter === "rejected"
              ? "bg-red-600 text-white"
              : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700"
              }`}
          >
            Rejected ({rejectedCount})
          </button>
        </div>

        {/* Applications List */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
          ) : filteredApplications.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-zinc-600 dark:text-zinc-400">
                {filter === "all"
                  ? "No applications yet"
                  : `No ${filter} applications`}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredApplications.map((app) => (
                <div
                  key={app.id}
                  className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      <Link href={`/profile/${app.user_id}`}>
                        <div className="h-12 w-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-semibold flex-shrink-0">
                          {app.profiles?.avatar_url ? (
                            <Image
                              src={app.profiles.avatar_url}
                              alt=""
                              width={48}
                              height={48}
                              className="rounded-full object-cover"
                            />
                          ) : (
                            (app.profiles?.full_name || app.profiles?.username || "U")[0]?.toUpperCase()
                          )}
                        </div>
                      </Link>
                      <div className="flex-1 min-w-0">
                        <Link
                          href={`/profile/${app.user_id}`}
                          className="font-semibold text-zinc-900 dark:text-zinc-100 hover:text-indigo-600 dark:hover:text-indigo-400"
                        >
                          {app.profiles?.full_name || app.profiles?.username || "User"}
                        </Link>
                        <div className="text-sm text-zinc-500 dark:text-zinc-400">
                          @{app.profiles?.username || "user"}
                        </div>
                        {app.role_name && (
                          <div className="mt-1">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300">
                              {app.role_name}
                            </span>
                          </div>
                        )}
                        {app.message && (
                          <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">
                            {app.message}
                          </p>
                        )}
                        <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-2">
                          Applied {new Date(app.created_at).toLocaleDateString("en-US")}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {app.status === "pending" && (
                        <>
                          <button
                            onClick={() => handleAccept(app.id)}
                            disabled={processingId === app.id}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                          >
                            {processingId === app.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <CheckCircle className="w-4 h-4" />
                            )}
                            Accept
                          </button>
                          <button
                            onClick={() => handleReject(app.id)}
                            disabled={processingId === app.id}
                            className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                          >
                            {processingId === app.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <X className="w-4 h-4" />
                            )}
                            Reject
                          </button>
                        </>
                      )}
                      {app.status === "accepted" && (
                        <span className="px-3 py-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-sm font-medium flex items-center gap-1.5">
                          <CheckCircle className="w-4 h-4" />
                          Accepted
                        </span>
                      )}
                      {app.status === "rejected" && (
                        <span className="px-3 py-1.5 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-sm font-medium flex items-center gap-1.5">
                          <X className="w-4 h-4" />
                          Rejected
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

