"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { TabLoadingScreen } from "@/components/ui-custom/LoadingSkeleton";
import { MessageCircle } from "lucide-react";
import { logger } from "@/lib/logger";
import { useCSRF } from "@/hooks/useCSRF";
import { MessagingService } from "@/lib/services/messaging/index";
import type { Application } from "@/lib/types/application";


interface ApplicationManagementTabProps {
  projectId: string;
  isProjectOwner: boolean;
}

export default function ApplicationManagementTab({ projectId, isProjectOwner }: ApplicationManagementTabProps) {
  const supabase = createSupabaseBrowserClient();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "accepted" | "rejected">("all");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const { token: csrfToken } = useCSRF();
  const router = useRouter();

  const loadApplications = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setApplications([]);
        return;
      }
      setCurrentUserId(user.id);

      const { data: apps, error } = await supabase
        .from("project_applications")
        .select(`
          id,
          project_id,
          applicant_id,
          role_applied_for,
          message,
          status,
          created_at,
          conversation_id,
          rejection_message,
          rejected_at,
          profiles:applicant_id(full_name, username, id)
        `)
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });

      if (error) {
        logger.error("Error loading applications", { error });
        setApplications([]);
        return;
      }

      const mapped: Application[] = (apps || []).map((a: any) => ({
        id: a.id,
        project_id: a.project_id,
        applicant_id: a.applicant_id,
        role_applied_for: a.role_applied_for,
        message: a.message,
        status: a.status,
        created_at: a.created_at,
        conversation_id: a.conversation_id || undefined,
        rejection_message: a.rejection_message,
        rejected_at: a.rejected_at,
        applicant_profile: Array.isArray(a.profiles) ? a.profiles[0] : a.profiles,
      }));

      setApplications(mapped);
    } catch (err) {
      logger.error("Exception loading applications", { error: err });
      setApplications([]);
    } finally {
      setLoading(false);
    }
  }, [projectId, supabase]);

  useEffect(() => {
    if (projectId && isProjectOwner) {
      loadApplications();

      // Real-time subscription
      const channel = supabase
        .channel(`project_applications_tab:${projectId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "project_applications",
            filter: `project_id=eq.${projectId}`,
          },
          () => {
            loadApplications();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
    return undefined;
  }, [projectId, isProjectOwner, loadApplications, supabase]);

  async function handleAccept(application: Application, acceptMessage?: string) {
    if (processingId || !isProjectOwner) return;
    setProcessingId(application.id);

    try {
      if (!csrfToken) throw new Error("Missing CSRF token");
      const response = await fetch(`/api/applications/${application.id}/handle`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": csrfToken,
        },
        body: JSON.stringify({
          action: "accept",
          message: acceptMessage
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result?.error || "Failed to accept application");
      await loadApplications();
    } catch (err) {
      logger.error("Exception accepting application", { error: err });
      alert("An error occurred");
    } finally {
      setProcessingId(null);
    }
  }

  async function handleReject(application: Application, rejectionMessage?: string) {
    if (processingId || !isProjectOwner) return;
    setProcessingId(application.id);

    try {
      if (!csrfToken) throw new Error("Missing CSRF token");
      const response = await fetch(`/api/applications/${application.id}/handle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken
        },
        body: JSON.stringify({
          action: 'reject',
          message: rejectionMessage,
        })
      });

      const result = await response.json();

      if (!response.ok) {
        alert(result.error || "Failed to reject application");
        return;
      }

      await loadApplications();
    } catch (err) {
      logger.error("Exception rejecting application", { error: err });
      alert("An error occurred");
    } finally {
      setProcessingId(null);
    }
  }

  const handleChat = useCallback(async (application: Application) => {
    try {
      if (application.conversation_id) {
        router.push(`/messages?conversation=${application.conversation_id}`);
        return;
      }
      if (!currentUserId) return;
      const conv = await MessagingService.getOrCreateDirectConversation(currentUserId, application.applicant_id);
      if (conv?.id) {
        // best-effort persist
        await supabase.from("project_applications").update({ conversation_id: conv.id }).eq("id", application.id);
        router.push(`/messages?conversation=${conv.id}`);
      }
    } catch (e) {
      alert("Failed to open chat");
    }
  }, [currentUserId, router, supabase]);

  if (!isProjectOwner) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-20 h-20 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-4">
          <svg className="w-10 h-10 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h3 className="text-lg font-bold text-zinc-700 dark:text-zinc-300 mb-2">Access Restricted</h3>
        <p className="text-sm text-zinc-500">Only project owners can manage applications.</p>
      </div>
    );
  }

  if (loading) {
    return <TabLoadingScreen type="applications" />;
  }

  const filteredApplications = applications.filter(app => {
    if (filter === "all") return true;
    return app.status === filter;
  });

  const stats = {
    total: applications.length,
    pending: applications.filter(a => a.status === "pending").length,
    accepted: applications.filter(a => a.status === "accepted").length,
    rejected: applications.filter(a => a.status === "rejected").length,
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
          <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{stats.total}</div>
          <div className="text-xs text-zinc-500 mt-1">Total Applications</div>
        </div>
        <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-4">
          <div className="text-2xl font-bold text-amber-700 dark:text-amber-300">{stats.pending}</div>
          <div className="text-xs text-amber-600 dark:text-amber-400 mt-1">Pending Review</div>
        </div>
        <div className="rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 p-4">
          <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{stats.accepted}</div>
          <div className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">Accepted</div>
        </div>
        <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 p-4">
          <div className="text-2xl font-bold text-red-700 dark:text-red-300">{stats.rejected}</div>
          <div className="text-xs text-red-600 dark:text-red-400 mt-1">Rejected</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
        {(["all", "pending", "accepted", "rejected"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${filter === f
              ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-sm"
              : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
              }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Applications List */}
      {filteredApplications.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-zinc-900 rounded-xl border">
          <svg className="w-20 h-20 mx-auto text-zinc-300 dark:text-zinc-700 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-lg font-semibold text-zinc-700 dark:text-zinc-300 mb-2">No applications found</p>
          <p className="text-sm text-zinc-500">
            {filter === "all" ? "No one has applied yet." : `No ${filter} applications.`}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredApplications.map((app) => (
            <ApplicationCard
              key={app.id}
              application={app}
              onAccept={(message) => handleAccept(app, message)}
              onReject={(message) => handleReject(app, message)}
              onChat={() => handleChat(app)}
              processing={processingId === app.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ApplicationCard({
  application,
  onAccept,
  onReject,
  onChat,
  processing,
}: {
  application: Application;
  onAccept: (message?: string) => void;
  onReject: (message?: string) => void;
  onChat: () => void;
  processing: boolean;
}) {
  const [activeModal, setActiveModal] = useState<'accept' | 'reject' | null>(null);
  const [message, setMessage] = useState("");

  const statusColors = {
    pending: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-900",
    accepted: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900",
    rejected: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-900",
    withdrawn: "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700",
  };

  return (
    <>
      <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 text-white flex items-center justify-center text-sm font-semibold">
                {application.applicant_profile?.full_name?.[0]?.toUpperCase() ||
                  application.applicant_profile?.username?.[0]?.toUpperCase() || "U"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                  {application.applicant_profile?.full_name || application.applicant_profile?.username || "Unknown User"}
                </p>
                <p className="text-xs text-zinc-500">
                  Applied for <span className="font-medium">{application.role_applied_for}</span>
                </p>
              </div>
              <span className={`px-2.5 py-1 rounded-md text-xs font-medium border ${statusColors[application.status]}`}>
                {application.status.charAt(0).toUpperCase() + application.status.slice(1)}
              </span>
            </div>

            <div className="mb-3 p-3 rounded-md bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700">
              <p className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">{application.message}</p>
            </div>

            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {new Date(application.created_at).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </div>
          </div>
        </div>

        <div className="mt-4 flex gap-2 pt-4 border-t border-zinc-200 dark:border-zinc-700">
          <button
            onClick={() => {
              onChat();
            }}
            className="flex-1 px-4 py-2 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-sm font-medium hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors flex items-center justify-center gap-2"
          >
            <MessageCircle className="w-4 h-4" />
            Chat
          </button>
          {application.status === "pending" && (
            <>
              <button
                onClick={() => {
                  setMessage("Congratulations! Your application has been accepted! Welcome to the team.");
                  setActiveModal('accept');
                }}
                disabled={processing}
                className="flex-1 px-4 py-2 rounded-md bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {processing ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Processing...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Accept
                  </>
                )}
              </button>
              <button
                onClick={() => {
                  setMessage("");
                  setActiveModal('reject');
                }}
                disabled={processing}
                className="flex-1 px-4 py-2 rounded-md border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 text-sm font-medium hover:bg-red-50 dark:hover:bg-red-950/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Reject
              </button>
            </>
          )}
        </div>
      </div>

      {/* Action Modal (Shared for Accept/Reject) */}
      {activeModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50" onClick={() => setActiveModal(null)} />
          <div className="relative z-10 w-full max-w-md rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 space-y-4 shadow-xl">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
              {activeModal === 'accept' ? 'Accept Application' : 'Reject Application'}
            </h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              {activeModal === 'accept'
                ? "Are you sure you want to accept this application?"
                : "Are you sure you want to reject this application?"}
              <br />
              <span className="opacity-80">Optionally add a message below. Leave empty to perform action silently.</span>
            </p>
            <div>
              <label className="block text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                Message (Optional)
              </label>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                rows={3}
                className={`w-full px-4 py-2.5 rounded-md border text-sm resize-none transition-colors focus:ring-1 focus:ring-opacity-50 ${activeModal === 'accept'
                    ? "border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:border-emerald-500 focus:ring-emerald-500"
                    : "border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:border-red-500 focus:ring-red-500"
                  }`}
                placeholder={activeModal === 'accept'
                  ? "Congratulations! Your application has been accepted..."
                  : "Thank you for your interest..."}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setActiveModal(null);
                  setMessage("");
                }}
                className="px-4 py-2 rounded-md border border-zinc-200 dark:border-zinc-700 text-sm font-medium hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (activeModal === 'accept') {
                    onAccept(message.trim() || undefined);
                  } else {
                    onReject(message.trim() || undefined);
                  }
                  setActiveModal(null);
                  setMessage("");
                }}
                className={`px-4 py-2 rounded-md text-white text-sm font-medium transition-colors ${activeModal === 'accept'
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-red-600 hover:bg-red-700"
                  }`}
              >
                {activeModal === 'accept' ? 'Accept' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
