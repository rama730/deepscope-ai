"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { CheckCircle, MessageCircle } from "lucide-react";
import { useCSRF } from "@/hooks/useCSRF";

interface Props {
  projectId: string;
  onClose: () => void;
  onSuccess?: () => void;
  initialRoleId?: string;
}

interface Role {
  id: string;
  role: string;
  count: number;
  filled: number;
  description?: string;
  skills?: string[];
}

export default function ApplyToProjectModal({ projectId, onClose, onSuccess, initialRoleId }: Props) {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();
  const [roles, setRoles] = useState<Role[]>([]);
  const [roleId, setRoleId] = useState<string>(initialRoleId || "");
  const [messageBody, setMessageBody] = useState("");
  const [portfolioLink, setPortfolioLink] = useState("");
  const [availability, setAvailability] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [projectTitle, setProjectTitle] = useState("");
  const [projectSlug, setProjectSlug] = useState<string>("");
  const [successConversationId, setSuccessConversationId] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const { token: csrfToken } = useCSRF();

  const roleName =
    roleId === "other"
      ? "General Application"
      : (roles.find((r) => r.id === roleId)?.role || "");

  const roleSlug = roleName
    ? roleName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
    : "";

  const projectToken = projectSlug || projectId;
  const messagePrefix = roleSlug ? `/${projectToken} #${roleSlug}` : `/${projectToken}`;

  // Prefill a friendly starter message once role is selected
  useEffect(() => {
    if (!roleName) return;
    if (messageBody.trim().length > 0) return;
    setMessageBody("Hey, I want to join your project. I can help with this role — happy to share more details!");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleName]);

  useEffect(() => {
    async function loadFallback() {
      console.warn("Falling back to legacy client-side data loading...");
      try {
        // Load current user
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase.from('profiles').select('id, display_name, email').eq('id', user.id).single();
          setUserProfile(profile);
        }

        // Load project details
        const { data: project } = await supabase.from('projects').select('title, slug').eq('id', projectId).single();
        if (project) {
          setProjectTitle(project.title);
          setProjectSlug(project.slug || "");
        }

        // Load roles
        const { data: rolesData } = await supabase
          .from("project_open_roles")
          .select("id, role, count, description, skills")
          .eq("project_id", projectId);

        // Load collaborators
        const { data: membersData } = await supabase
          .from("project_collaborators")
          .select("role")
          .eq("project_id", projectId);

        // Count filled positions
        const filledCounts: Record<string, number> = {};
        (membersData || []).forEach((member: any) => {
          const roleKey = (member.role || "").toLowerCase();
          filledCounts[roleKey] = (filledCounts[roleKey] || 0) + 1;
        });

        // Attach filled count
        const rolesWithFilled = (rolesData || []).map(role => ({
          ...role,
          filled: filledCounts[role.role.toLowerCase()] || 0
        }));

        setRoles(rolesWithFilled as Role[]);
      } catch (err) {
        console.error("Error in fallback loading:", err);
      }
    }

    async function load() {
      // Use single-query RPC for all data
      try {
        const { data, error } = await supabase.rpc('get_project_apply_data', {
          p_project_id: projectId
        });

        if (error) {
          console.warn("RPC failed, attempting fallback:", error.message);
          await loadFallback();
          return;
        }

        if (data) {
          // Parse the RPC response which is in JSON format
          // Data structure: { user_profile, project, roles }
          const { user_profile, project, roles: rolesData } = data as any;

          if (user_profile) {
            setUserProfile(user_profile);
          }

          if (project) {
            setProjectTitle(project.title);
            setProjectSlug(project.slug || "");
          }

          if (rolesData) {
            setRoles(rolesData as Role[]);
          }
        }
      } catch (e) {
        console.error("Unexpected error loading data", e);
        await loadFallback();
      }
    }
    load();
  }, [projectId, supabase]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSubmitting(false); return; }

    if (!roleName) {
      alert("Please select a role");
      setSubmitting(false);
      return;
    }

    if (!csrfToken) {
      alert("Security token missing. Please refresh and try again.");
      setSubmitting(false);
      return;
    }

    // Call API route to submit application
    try {
      const rawPortfolio = portfolioLink.trim();
      const normalizedPortfolio =
        rawPortfolio.length === 0
          ? undefined
          : (rawPortfolio.startsWith("http://") || rawPortfolio.startsWith("https://"))
            ? rawPortfolio
            : `https://${rawPortfolio}`;

      const response = await fetch(`/api/projects/${projectId}/apply`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": csrfToken,
        },
        body: JSON.stringify({
          role: roleName,
          message: messageBody.trim(),
          work_timings: availability.trim() || undefined,
          portfolio_link: normalizedPortfolio,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        // According to lib/api/response.ts, the user-facing message is in 'message' field
        const errorMessage = result.message ||
          (typeof result.error === 'string' ? result.error : JSON.stringify(result.error)) ||
          "Failed to submit application";

        alert(errorMessage);
        setSubmitting(false);
        return;
      }

      // Success - API handles everything
      // The API returns the RPC result directly or wrapped. Check for conversation_id.
      const conversationId = result.conversation_id || result.data?.conversation_id;
      if (conversationId) {
        setSuccessConversationId(conversationId);
      }
    } catch (error: any) {
      console.error("Error submitting application:", error);
      alert(error.message || JSON.stringify(error) || "Failed to submit application. Please try again.");
      setSubmitting(false);
      return;
    }

    setSubmitting(false);
    setIsSuccess(true);
    // Auto-close removed in favor of explicit action, or maybe keep it but longer? 
    // User requested "redirect to conversation OR show prominent CTA".
    // We will show CTA on the success modal.
  }

  if (isSuccess) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
        <div className="relative z-10 w-full max-w-sm rounded-2xl border border-emerald-100 bg-white dark:bg-zinc-900 p-8 text-center shadow-xl animate-in zoom-in-95 duration-200">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
            <CheckCircle className="h-8 w-8" />
          </div>
          <h3 className="mb-2 text-xl font-bold text-slate-900 dark:text-white">Application Sent!</h3>
          <p className="text-slate-500 dark:text-zinc-400 mb-6">Good luck! The project owner will review your application soon.</p>

          <div className="flex flex-col gap-3">
            {successConversationId && (
              <button
                onClick={() => {
                  onSuccess?.();
                  router.push(`/messages?conversation=${successConversationId}`);
                  onClose();
                }}
                className="w-full flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-colors shadow-sm hover:shadow-md"
              >
                <MessageCircle className="w-4 h-4" />
                Open Chat
              </button>
            )}
            <button
              onClick={() => {
                onSuccess?.();
                onClose();
              }}
              className="w-full px-5 py-2.5 rounded-lg border border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-400 font-medium hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xl animate-in zoom-in-95 duration-200" style={{ backgroundColor: '#ffffff' }}>

        {/* Header */}
        <div className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-6 py-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Apply to join</h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400">
              {projectTitle ? `Applying to ${projectTitle}` : "Submit your application"}
            </p>
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-slate-400 hover:bg-slate-100 dark:bg-zinc-900 hover:text-slate-600 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-300">
            <span className="sr-only">Close</span>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-8 bg-white dark:bg-zinc-900" style={{ backgroundColor: '#ffffff' }}>
          {/* User Context */}
          {userProfile && (
            <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3 dark:bg-zinc-800/50">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 font-bold">
                {userProfile.display_name?.[0]?.toUpperCase() || userProfile.email?.[0]?.toUpperCase() || "?"}
              </div>
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-white">Applying as {userProfile.display_name || "User"}</p>
                <p className="text-xs text-slate-500 dark:text-zinc-400">Your profile will be shared with the project owner.</p>
              </div>
            </div>
          )}

          {/* Role Selection */}
          <div className="space-y-3">
            <label className="text-sm font-semibold text-slate-900 dark:text-zinc-100">Which role fits you best?</label>
            <div className="grid gap-3 sm:grid-cols-2">
              {roles.map(r => {
                const available = Math.max((r.count || 0) - (r.filled || 0), 0);
                const isFilled = available === 0;
                const isSelected = roleId === r.id;

                return (
                  <button
                    key={r.id}
                    type="button"
                    disabled={isFilled}
                    onClick={() => setRoleId(r.id)}
                    className={`relative flex flex-col items-start rounded-xl border p-4 text-left transition-all ${isSelected
                      ? "border-indigo-600 bg-indigo-50 ring-1 ring-indigo-600 dark:bg-indigo-900/20 dark:border-indigo-500"
                      : "border-slate-200 hover:border-indigo-300 hover:bg-slate-50 dark:border-zinc-700 dark:hover:border-zinc-600 dark:hover:bg-zinc-800 bg-white dark:bg-zinc-900"
                      } ${isFilled ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    <div className="flex w-full items-center justify-between mb-1">
                      <span className={`font-semibold ${isSelected ? "text-indigo-700 dark:text-indigo-300" : "text-slate-900 dark:text-zinc-100"}`}>{r.role}</span>
                      {!isFilled && <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400">{available} left</span>}
                    </div>
                    {r.skills && r.skills.length > 0 && (
                      <div className="text-xs text-slate-500 dark:text-zinc-400 mt-1 line-clamp-1">{r.skills.join(", ")}</div>
                    )}
                  </button>
                );
              })}
              {/* General Application Option */}
              <button
                type="button"
                onClick={() => setRoleId("other")}
                className={`relative flex flex-col items-start rounded-xl border p-4 text-left transition-all ${roleId === "other"
                  ? "border-indigo-600 bg-indigo-50 ring-1 ring-indigo-600 dark:bg-indigo-900/20 dark:border-indigo-500"
                  : "border-slate-200 hover:border-indigo-300 hover:bg-slate-50 dark:border-zinc-700 dark:hover:border-zinc-600 dark:hover:bg-zinc-800 bg-white dark:bg-zinc-900"
                  }`}
              >
                <span className={`font-semibold ${roleId === "other" ? "text-indigo-700 dark:text-indigo-300" : "text-slate-900 dark:text-zinc-100"}`}>General Application</span>
                <span className="text-xs text-slate-500 dark:text-zinc-400 mt-1">Don't see a fit? Apply anyway.</span>
              </button>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Availability */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-900 dark:text-zinc-100">Weekly Availability</label>
              <select
                value={availability}
                onChange={(e) => setAvailability(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-zinc-700 dark:bg-zinc-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              >
                <option value="">Select availability...</option>
                <option value="< 5 hrs/week"> Less than 5 hrs/week</option>
                <option value="5-10 hrs/week">5-10 hrs/week</option>
                <option value="10-20 hrs/week">10-20 hrs/week</option>
                <option value="20+ hrs/week">20+ hrs/week</option>
              </select>
            </div>

            {/* Portfolio Link */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-900 dark:text-zinc-100">Portfolio / Links <span className="font-normal text-slate-400">(Optional)</span></label>
              <input
                type="text"
                value={portfolioLink}
                onChange={(e) => setPortfolioLink(e.target.value)}
                placeholder="github.com/username"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-zinc-700 dark:bg-zinc-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Message */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-900 dark:text-zinc-100">Why would you make a great addition?</label>
            <div className="text-xs text-slate-500 dark:text-zinc-400">
              Message will start with: <span className="font-mono text-slate-700 dark:text-zinc-200">{messagePrefix}</span>
            </div>
            <textarea
              required
              value={messageBody}
              onChange={e => setMessageBody(e.target.value)}
              rows={4}
              className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-zinc-700 dark:bg-zinc-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              placeholder="Tell us about your relevant experience and what excited you about this project..."
            />
          </div>

        </form>

        {/* Footer */}
        <div className="sticky bottom-0 z-20 flex justify-end gap-3 border-t border-slate-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-6 py-4">
          <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:bg-zinc-900 hover:text-slate-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 rounded-lg transition-colors">Cancel</button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="px-5 py-2.5 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md"
          >
            {submitting ? "Sending..." : roleId && roleId !== "other" ? roles.find(r => r.id === roleId)?.role ? `Apply as ${roles.find(r => r.id === roleId)?.role}` : "Submit Application" : "Submit Application"}
          </button>
        </div>
      </div>
    </div>
  );
}



