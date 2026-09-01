"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui-custom/Toast";
import { projectHref, profileHref } from "@/lib/routing/identifiers";
import { Check, X, Users, Briefcase, LayoutGrid, CheckCheck } from "lucide-react";
import { cn } from "@/lib/utils";

function ConnectionRequestCard({
  request,
  currentUserId,
  onAccept,
  onIgnore,
}: {
  request: any;
  currentUserId: string | null;
  onAccept: (r: any) => void;
  onIgnore: (r: any) => void;
}) {
  const supabase = createSupabaseBrowserClient();
  const [mutualCount, setMutualCount] = useState<number>(0);
  const p = request.profiles;
  const name = p?.full_name || p?.username || "User";

  useEffect(() => {
    async function loadMutuals() {
      if (!p?.id || !currentUserId) return;
      try {
        const { data, error } = await supabase.rpc("get_mutual_connections_count", {
          user_id: currentUserId,
          target_user_id: p.id,
        });
        if (!error && typeof data === "number") {
          setMutualCount(data);
        }
      } catch (e) {
        // Silently fail if RPC doesn't exist or errors, functionality is additive
      }
    }
    loadMutuals();
  }, [p?.id, currentUserId, supabase]);

  return (
    <div className="flex items-start gap-3 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 bg-white dark:bg-zinc-900 transition-all hover:shadow-sm">
      <Link href={profileHref(p?.username || p?.id || request.user_id)} className="flex-shrink-0">
        <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 text-white text-base font-semibold flex items-center justify-center overflow-hidden">
          {p?.avatar_url ? (
            <Image src={p.avatar_url} alt={name} width={48} height={48} className="h-12 w-12 object-cover" />
          ) : (
            name.slice(0, 1).toUpperCase()
          )}
        </div>
      </Link>

      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start gap-2">
          <div>
            <Link href={profileHref(p?.username || p?.id || request.user_id)} className="font-semibold text-zinc-900 dark:text-zinc-100 truncate block hover:underline text-base">
              {name}
            </Link>
            {p?.headline ? (
              <div className="text-xs text-zinc-600 dark:text-zinc-400 truncate mt-0.5">{p.headline}</div>
            ) : p?.username ? (
              <div className="text-xs text-zinc-500 dark:text-zinc-400 truncate mt-0.5">@{p.username}</div>
            ) : null}

            {/* Context Badges */}
            <div className="flex flex-wrap gap-2 mt-2">
              {mutualCount > 0 && (
                <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full">
                  <Users className="w-3 h-3" />
                  {mutualCount} mutual connection{mutualCount !== 1 ? 's' : ''}
                </span>
              )}
              {/* Could add other signals like 'Same Location' here if available in 'p' */}
            </div>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <button
            onClick={() => onAccept(request)}
            className="flex-1 sm:flex-none inline-flex justify-center items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white transition-colors"
          >
            <Check className="w-4 h-4" />
            Accept
          </button>
          <button
            onClick={() => onIgnore(request)}
            className="flex-1 sm:flex-none inline-flex justify-center items-center gap-1.5 px-4 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
            Ignore
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PeopleInboxTab({
  initialUser,
  inboxPromise,
}: {
  initialUser: any;
  inboxPromise?: Promise<any>;
}) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [incomingConnectionRequests, setIncomingConnectionRequests] = useState<any[]>([]);
  const [incomingProjectInvites, setIncomingProjectInvites] = useState<any[]>([]);
  const [sentProjectInvites, setSentProjectInvites] = useState<any[]>([]);

  const [filter, setFilter] = useState<"all" | "people" | "projects">("all");

  const userId = initialUser?.id || null;

  useEffect(() => {
    let alive = true;
    async function load() {
      if (!userId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        if (inboxPromise) {
          const data = await Promise.resolve(inboxPromise);
          if (!alive) return;
          setIncomingConnectionRequests(data?.incomingConnectionRequests || []);
          setIncomingProjectInvites(data?.incomingProjectInvites || []);
          setSentProjectInvites(data?.sentProjectInvites || []);
          setLoading(false);
          return;
        }

        // Fallback to client fetch
        const [incomingConn, incomingProj, sentProj] = await Promise.all([
          supabase
            .from("connections")
            .select(`id, user_id, connected_user_id, status, created_at, profiles:user_id(id, username, full_name, avatar_url, bio, headline, location)`)
            .eq("connected_user_id", userId)
            .eq("status", "pending")
            .order("created_at", { ascending: false })
            .limit(50),
          supabase
            .from("project_invitations")
            .select(`
              id,
              project_id,
              inviter_id,
              invitee_id,
              role,
              status,
              created_at,
              project:projects!project_invitations_project_id_fkey(id, title, slug),
              inviter:profiles!project_invitations_inviter_id_fkey(id, username, full_name, avatar_url)
            `)
            .eq("invitee_id", userId)
            .eq("status", "pending")
            .order("created_at", { ascending: false })
            .limit(50),
          supabase
            .from("project_invitations")
            .select(`
              id,
              project_id,
              inviter_id,
              invitee_id,
              role,
              status,
              created_at,
              project:projects!project_invitations_project_id_fkey(id, title, slug),
              invitee:profiles!project_invitations_invitee_id_fkey(id, username, full_name, avatar_url)
            `)
            .eq("inviter_id", userId)
            .eq("status", "pending")
            .order("created_at", { ascending: false })
            .limit(25),
        ]);

        if (!alive) return;
        setIncomingConnectionRequests(incomingConn.data || []);
        setIncomingProjectInvites(incomingProj.data || []);
        setSentProjectInvites(sentProj.data || []);
      } finally {
        if (alive) setLoading(false);
      }
    }
    load();
    return () => {
      alive = false;
    };
  }, [userId, inboxPromise, supabase]);

  async function handleAcceptAll() {
    if (!userId || incomingConnectionRequests.length === 0) return;

    const count = incomingConnectionRequests.length;
    const ids = incomingConnectionRequests.map(r => r.id);

    // Optimistic update
    setIncomingConnectionRequests([]);

    const { error } = await supabase
      .from("connections")
      .update({ status: "accepted", accepted_at: new Date().toISOString() })
      .in("id", ids);

    if (error) {
      showToast("Failed to accept all requests", "error");
      // Could revert optimistic update here ideally
    } else {
      showToast(`Accepted ${count} connection request${count !== 1 ? 's' : ''}`, "success");
    }
  }

  async function acceptConnectionRequest(requestRow: any) {
    if (!userId) return;
    const id = requestRow?.id;
    if (!id) return;

    const prev = incomingConnectionRequests;
    setIncomingConnectionRequests((x) => x.filter((r) => r.id !== id));

    const { error } = await supabase
      .from("connections")
      .update({ status: "accepted", accepted_at: new Date().toISOString() })
      .eq("id", id)
      .eq("connected_user_id", userId)
      .eq("status", "pending");

    if (error) {
      setIncomingConnectionRequests(prev);
      showToast(error.message || "Failed to accept request", "error");
      return;
    }
    showToast("Connection request accepted", "success");
  }

  async function ignoreConnectionRequest(requestRow: any) {
    if (!userId) return;
    const id = requestRow?.id;
    if (!id) return;

    const prev = incomingConnectionRequests;
    setIncomingConnectionRequests((x) => x.filter((r) => r.id !== id));

    const { error } = await supabase.from("connections").delete().eq("id", id);
    if (error) {
      setIncomingConnectionRequests(prev);
      showToast(error.message || "Failed to ignore request", "error");
      return;
    }
    showToast("Request ignored", "info");
  }

  // ... Project invite handlers same as before ...
  async function acceptProjectInvite(inviteId: string) {
    const prev = incomingProjectInvites;
    setIncomingProjectInvites((x) => x.filter((r) => r.id !== inviteId));

    // Note: This API endpoint is assumed to exist from previous code
    const res = await fetch(`/api/v1/project-invitations/${inviteId}/accept`, { method: "POST" });
    const json = await res.json().catch(() => null);
    if (!res.ok) {
      setIncomingProjectInvites(prev);
      showToast(json?.message || "Failed to accept project invite", "error");
      return;
    }
    showToast("Project invitation accepted", "success");
  }

  async function declineProjectInvite(inviteId: string) {
    const prev = incomingProjectInvites;
    setIncomingProjectInvites((x) => x.filter((r) => r.id !== inviteId));

    const res = await fetch(`/api/v1/project-invitations/${inviteId}/decline`, { method: "POST" });
    const json = await res.json().catch(() => null);
    if (!res.ok) {
      setIncomingProjectInvites(prev);
      showToast(json?.message || "Failed to decline project invite", "error");
      return;
    }
    showToast("Project invitation declined", "info");
  }

  async function cancelSentInvite(inviteId: string) {
    const prev = sentProjectInvites;
    setSentProjectInvites((x) => x.filter((r) => r.id !== inviteId));

    const res = await fetch(`/api/v1/project-invitations/${inviteId}/cancel`, { method: "POST" });
    const json = await res.json().catch(() => null);
    if (!res.ok) {
      setSentProjectInvites(prev);
      showToast(json?.message || "Failed to cancel invite", "error");
      return;
    }
    showToast("Invitation cancelled", "success");
  }

  if (!userId) {
    return (
      <div className="max-w-7xl mx-auto px-4">
        <div className="rounded-2xl border bg-white dark:bg-zinc-900 p-8 text-center">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">Sign in to view your inbox.</p>
          <Link href="/login" className="inline-block mt-3 text-sm text-blue-600 hover:underline">
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  const showPeople = filter === "all" || filter === "people";
  const showProjects = filter === "all" || filter === "projects";

  return (
    <div className="max-w-7xl mx-auto px-4 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        {/* Filters */}
        <div className="flex items-center gap-1 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg self-start">
          {[
            { id: "all", label: "All", icon: LayoutGrid },
            { id: "people", label: "People", count: incomingConnectionRequests.length, icon: Users },
            { id: "projects", label: "Projects", count: incomingProjectInvites.length, icon: Briefcase },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id as any)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-all",
                filter === tab.id
                  ? "bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 shadow-sm"
                  : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className="ml-0.5 bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-[10px] px-1.5 rounded-full">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl border bg-white dark:bg-zinc-900 p-6 text-sm text-zinc-600 dark:text-zinc-400">
          Loading inbox…
        </div>
      ) : (
        <div className="space-y-6">

          {/* Connection Requests Section */}
          {showPeople && (
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  Connection Requests
                  <span className="text-sm font-normal text-zinc-500 dark:text-zinc-400">
                    {incomingConnectionRequests.length}
                  </span>
                </h2>

                {incomingConnectionRequests.length > 1 && (
                  <button
                    onClick={handleAcceptAll}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 hover:bg-blue-50 dark:hover:bg-blue-900/20 px-2 py-1 rounded-md transition-colors"
                  >
                    <CheckCheck className="w-4 h-4" />
                    Accept All
                  </button>
                )}
              </div>

              {incomingConnectionRequests.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 p-8 text-center text-zinc-500 dark:text-zinc-400 bg-zinc-50/50 dark:bg-zinc-900/50">
                  No pending connection requests.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
                  {incomingConnectionRequests.map((r) => (
                    <ConnectionRequestCard
                      key={r.id}
                      request={r}
                      currentUserId={userId}
                      onAccept={acceptConnectionRequest}
                      onIgnore={ignoreConnectionRequest}
                    />
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Project Invites Section */}
          {showProjects && (
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  Project Invitations
                  <span className="text-sm font-normal text-zinc-500 dark:text-zinc-400">
                    {incomingProjectInvites.length}
                  </span>
                </h2>
              </div>

              {incomingProjectInvites.length === 0 && !showPeople ? ( // Only show empty state here if filtering by projects to avoid double empty
                <div className="rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 p-8 text-center text-zinc-500 dark:text-zinc-400 bg-zinc-50/50 dark:bg-zinc-900/50">
                  No pending project invitations.
                </div>
              ) : null}

              {incomingProjectInvites.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
                  {incomingProjectInvites.map((inv) => {
                    const project = inv.project;
                    const inviter = inv.inviter;
                    const inviterName = inviter?.full_name || inviter?.username || "Someone";
                    return (
                      <div key={inv.id} className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 bg-white dark:bg-zinc-900 flex flex-col justify-between">
                        <div>
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="text-base font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                                {project?.title || "Project"}
                              </div>
                              <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                                Role: <span className="font-medium text-zinc-700 dark:text-zinc-300 capitalize">{inv.role}</span>
                              </div>
                            </div>
                            {project?.id ? (
                              <Link href={projectHref({ id: project.id, slug: project.slug })} className="text-xs font-medium text-blue-600 hover:underline">
                                View Project
                              </Link>
                            ) : null}
                          </div>

                          <div className="mt-3 flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/50 p-2 rounded-lg">
                            <div className="h-6 w-6 rounded-full bg-zinc-200 dark:bg-zinc-700 overflow-hidden flex-shrink-0">
                              {inviter?.avatar_url ? (
                                <Image src={inviter.avatar_url} alt={inviterName} width={24} height={24} className="h-full w-full object-cover" />
                              ) : (
                                <div className="h-full w-full flex items-center justify-center text-[10px]">{inviterName.charAt(0)}</div>
                              )}
                            </div>
                            <span className="truncate">Invited by <strong>{inviterName}</strong></span>
                          </div>
                        </div>

                        <div className="mt-4 flex items-center gap-2">
                          <button
                            onClick={() => acceptProjectInvite(inv.id)}
                            className="flex-1 px-3 py-1.5 rounded-lg text-sm font-medium bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
                          >
                            Accept
                          </button>
                          <button
                            onClick={() => declineProjectInvite(inv.id)}
                            className="flex-1 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-sm font-medium hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800 transition-colors"
                          >
                            Decline
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {/* Sent invites - always show at bottom or separate tab? 
               Let's show only if All or Projects is selected, as it's project related. 
           */}
          {showProjects && sentProjectInvites.length > 0 && (
            <div className="mt-8 pt-8 border-t border-zinc-200 dark:border-zinc-800">
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Sent Invites</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {sentProjectInvites.map((inv) => {
                  const project = inv.project;
                  const invitee = inv.invitee;
                  const inviteeName = invitee?.full_name || invitee?.username || "User";
                  return (
                    <div key={inv.id} className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200 dark:border-zinc-800 p-3 bg-white dark:bg-zinc-900">
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">{project?.title || "Project"}</div>
                        <div className="text-xs text-zinc-500 dark:text-zinc-400 truncate">To {inviteeName} • {inv.role}</div>
                      </div>
                      <button
                        onClick={() => cancelSentInvite(inv.id)}
                        className="px-3 py-1.5 rounded-lg border text-xs font-medium hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 border-zinc-200 dark:border-zinc-700"
                      >
                        Cancel
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}


