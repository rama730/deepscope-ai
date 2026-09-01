"use client";

import { useState, useEffect } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Briefcase, Clock, CheckCircle2, XCircle, MessageCircle, ExternalLink } from "lucide-react";
import { motion } from "framer-motion";
import Image from "next/image";
import { useCSRF } from "@/hooks/useCSRF";
import { MessagingService } from "@/lib/services/messaging/index";
import type { Application } from "@/lib/types/application";


interface ApplicationsBoxProps {
  projectId: string;
  projectSlug?: string;
  isCreator: boolean;
}

export default function ApplicationsBox({ projectId, projectSlug: _projectSlug, isCreator }: ApplicationsBoxProps) {
  const supabase = createSupabaseBrowserClient();
  const router = useRouter();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const { token: csrfToken } = useCSRF();

  useEffect(() => {
    if (projectId && isCreator) {
      loadApplications();

      // Real-time subscription
      const channel = supabase
        .channel(`project_applications_box:${projectId}`)
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, isCreator, supabase]);

  async function loadApplications() {
    setLoading(true);
    try {
      // Load applications for this project
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setCurrentUserId(user.id);

      const { data: apps, error } = await supabase
        .from("project_applications")
        .select(`
          id,
          project_id,
          applicant_id,
          role_applied_for,
          message,
          work_timings,
          portfolio_link,
          status,
          created_at,
          conversation_id,
          profiles:applicant_id(full_name, username, avatar_url)
        `)
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error loading applications:", error);
        setApplications([]);
        return;
      }

      const mapped: Application[] = (apps || []).map((a: any) => ({
        id: a.id,
        project_id: a.project_id,
        applicant_id: a.applicant_id,
        role_applied_for: a.role_applied_for || "General Application",
        message: a.message || "",
        work_timings: a.work_timings || null,
        portfolio_link: a.portfolio_link || null,
        status: a.status || "pending",
        created_at: a.created_at,
        conversation_id: a.conversation_id || undefined,
        rejection_message: a.rejection_message,
        rejected_at: a.rejected_at,
        applicant_profile: Array.isArray(a.profiles) ? a.profiles[0] : a.profiles,
      }));

      setApplications(mapped);
    } catch (err) {
      console.error("Exception loading applications:", err);
      setApplications([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleAccept(app: Application) {
    if (processingId) return;
    setProcessingId(app.id);

    try {
      if (!csrfToken) throw new Error("Missing CSRF token");
      const response = await fetch(`/api/applications/${app.id}/handle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken
        },
        body: JSON.stringify({
          action: 'accept'
        })
      });

      const result = await response.json();

      if (!response.ok) {
        alert(result.error || "Failed to accept application");
        return;
      }

      // Reload applications
      await loadApplications();
    } catch (err) {
      console.error("Error accepting application:", err);
      alert("Failed to accept application. Please try again.");
    } finally {
      setProcessingId(null);
    }
  }

  async function handleReject(app: Application, rejectionMessage?: string) {
    if (processingId) return;
    setProcessingId(app.id);

    try {
      if (!csrfToken) throw new Error("Missing CSRF token");
      const response = await fetch(`/api/applications/${app.id}/handle`, {
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

      // Reload applications
      await loadApplications();
    } catch (err) {
      console.error("Error rejecting application:", err);
      alert("Failed to reject application. Please try again.");
    } finally {
      setProcessingId(null);
    }
  }

  async function handleChat(app: Application) {
    try {
      if (app.conversation_id) {
        router.push(`/messages?conversation=${app.conversation_id}`);
        return;
      }
      if (!currentUserId) return;
      const conv = await MessagingService.getOrCreateDirectConversation(currentUserId, app.applicant_id);
      if (conv?.id) {
        await supabase.from("project_applications").update({ conversation_id: conv.id }).eq("id", app.id);
        router.push(`/messages?conversation=${conv.id}`);
      }
    } catch (e) {
      alert("Failed to open chat");
    }
  }

  if (!isCreator) return null;

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2].map(i => (
          <div key={i} className="h-24 bg-zinc-100 dark:bg-zinc-800 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (applications.length === 0) {
    return (
      <div className="text-center py-8">
        <Briefcase className="w-12 h-12 text-zinc-400 dark:text-zinc-600 mx-auto mb-3" />
        <p className="text-sm text-zinc-500 dark:text-zinc-400">No applications yet</p>
      </div>
    );
  }

  const pendingApps = applications.filter(a => a.status === "pending");
  const processedApps = applications.filter(a => a.status !== "pending");

  return (
    <div className="space-y-4">
      {pendingApps.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-3">
            Pending Applications ({pendingApps.length})
          </h3>
          <div className="space-y-3">
            {pendingApps.map((app) => (
              <ApplicationCard
                key={app.id}
                app={app}
                onAccept={() => handleAccept(app)}
                onReject={(msg) => handleReject(app, msg)}
                onChat={() => handleChat(app)}
                processing={processingId === app.id}
              />
            ))}
          </div>
        </div>
      )}

      {processedApps.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-3">
            Processed Applications
          </h3>
          <div className="space-y-3">
            {processedApps.map((app) => (
              <ApplicationCard
                key={app.id}
                app={app}
                onChat={() => handleChat(app)}
                processing={false}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ApplicationCard({
  app,
  onAccept,
  onReject,
  onChat,
  processing
}: {
  app: Application;
  onAccept?: () => void;
  onReject?: (message?: string) => void;
  onChat: () => void;
  processing: boolean;
}) {
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionMessage, setRejectionMessage] = useState("");

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 bg-white dark:bg-zinc-900 space-y-3"
    >
      {/* Applicant Info */}
      <div className="flex items-start gap-3">
        {app.applicant_profile?.avatar_url ? (
          <Image
            src={app.applicant_profile.avatar_url}
            alt={app.applicant_profile.full_name || app.applicant_profile.username || "User"}
            width={40}
            height={40}
            className="rounded-full object-cover"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-semibold">
            {(app.applicant_profile?.full_name?.[0] || app.applicant_profile?.username?.[0] || "U").toUpperCase()}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-zinc-900 dark:text-zinc-100">
            {app.applicant_profile?.full_name || app.applicant_profile?.username || "Applicant"}
          </div>
          {app.applicant_profile?.username && (
            <div className="text-xs text-zinc-500 dark:text-zinc-400">
              @{app.applicant_profile.username}
            </div>
          )}
        </div>
        <span className={`text-xs px-2 py-1 rounded-full font-medium ${app.status === 'accepted'
          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
          : app.status === 'rejected'
            ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
            : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
          }`}>
          {app.status === 'accepted' ? '✓ Accepted' : app.status === 'rejected' ? '✗ Rejected' : 'Pending'}
        </span>
      </div>

      {/* Application Details */}
      <div className="space-y-2 text-sm">
        {app.role_applied_for && (
          <div className="flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-zinc-400" />
            <span className="text-zinc-600 dark:text-zinc-400">Role: </span>
            <span className="font-medium text-zinc-900 dark:text-zinc-100">{app.role_applied_for}</span>
          </div>
        )}
        {app.work_timings && (
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-zinc-400" />
            <span className="text-zinc-600 dark:text-zinc-400">Availability: </span>
            <span className="text-zinc-900 dark:text-zinc-100">{app.work_timings}</span>
          </div>
        )}
        {app.message && (
          <div className="pt-2 border-t border-zinc-200 dark:border-zinc-700">
            <p className="text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap line-clamp-3">
              {app.message}
            </p>
          </div>
        )}
        {app.portfolio_link && (
          <div className="flex items-center gap-2">
            <ExternalLink className="w-4 h-4 text-zinc-400" />
            <a
              href={app.portfolio_link.startsWith('http') ? app.portfolio_link : `https://${app.portfolio_link}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline truncate"
            >
              {app.portfolio_link}
            </a>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-700">
        <button
          onClick={onChat}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg text-sm font-medium transition-colors"
        >
          <MessageCircle className="w-4 h-4" />
          Chat
        </button>
        {app.status === "pending" && onAccept && onReject && (
          <>
            <button
              onClick={onAccept}
              disabled={processing}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              {processing ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Accept
                </>
              )}
            </button>
            <button
              onClick={() => setShowRejectModal(true)}
              disabled={processing}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              <XCircle className="w-4 h-4" />
              Reject
            </button>
          </>
        )}
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowRejectModal(false)} />
          <div className="relative z-10 w-full max-w-md rounded-lg border bg-white dark:bg-zinc-900 p-6 space-y-4">
            <h3 className="text-lg font-bold">Reject Application</h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Are you sure you want to reject this application? You can optionally add a message.
            </p>
            <textarea
              value={rejectionMessage}
              onChange={(e) => setRejectionMessage(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm resize-none"
              placeholder="Thank you for your interest. We've decided to move forward with other candidates..."
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectionMessage("");
                }}
                className="px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 text-sm font-medium hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onReject?.(rejectionMessage.trim() || undefined);
                  setShowRejectModal(false);
                  setRejectionMessage("");
                }}
                disabled={processing}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors disabled:opacity-50"
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
