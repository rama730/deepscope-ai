"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { X, Briefcase, Send } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui-custom/Toast";
import { projectHref } from "@/lib/routing/identifiers";

type InviteRole = "admin" | "member" | "viewer";

export default function ProjectInviteModal({
  isOpen,
  onClose,
  currentUserId,
  invitee,
}: {
  isOpen: boolean;
  onClose: () => void;
  currentUserId: string;
  invitee: { id: string; username?: string | null; full_name?: string | null; avatar_url?: string | null };
}) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const { showToast } = useToast();

  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [projects, setProjects] = useState<Array<{ id: string; title: string; slug: string | null }>>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [role, setRole] = useState<InviteRole>("member");

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    let alive = true;

    async function load() {
      setLoading(true);
      try {
        const [created, collab] = await Promise.all([
          supabase
            .from("projects")
            .select("id, title, slug")
            .eq("creator_id", currentUserId)
            .order("created_at", { ascending: false }),
          supabase
            .from("project_collaborators")
            .select("project_id, role, projects(id, title, slug)")
            .eq("user_id", currentUserId)
            .in("role", ["owner", "admin"]),
        ]);

        const map = new Map<string, { id: string; title: string; slug: string | null }>();
        (created.data || []).forEach((p: any) => map.set(p.id, { id: p.id, title: p.title, slug: p.slug || null }));
        (collab.data || []).forEach((c: any) => {
          if (c.projects) map.set(c.projects.id, { id: c.projects.id, title: c.projects.title, slug: c.projects.slug || null });
        });

        const list = Array.from(map.values());
        if (alive) {
          setProjects(list);
          setSelectedProjectId(list[0]?.id || "");
        }
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, [isOpen, currentUserId, supabase]);

  async function sendInvite() {
    if (!selectedProjectId) {
      showToast("Select a project first", "info");
      return;
    }
    if (!invitee?.id) return;

    setSending(true);
    try {
      const res = await fetch(`/api/v1/projects/${selectedProjectId}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: invitee.id, role }),
      });

      const json = await res.json().catch(() => null);
      if (!res.ok) {
        showToast(json?.message || "Failed to send invitation", "error");
        return;
      }

      showToast("Invitation sent", "success");
      onClose();
    } finally {
      setSending(false);
    }
  }

  if (!isOpen || !mounted) return null;

  const inviteeName = invitee.full_name || invitee.username || "Builder";

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[220] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }}
          transition={{ type: "spring", duration: 0.3 }}
          className="relative w-full max-w-lg bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-label="Invite to project"
        >
          <div className="p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <h2 className="text-lg font-semibold">Invite to project</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-5 space-y-4">
            <div className="flex items-center gap-3 rounded-xl border border-zinc-200 dark:border-zinc-800 p-3 bg-zinc-50 dark:bg-zinc-950">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 text-white flex items-center justify-center overflow-hidden font-semibold">
                {invitee.avatar_url ? (
                  <Image src={invitee.avatar_url} alt={inviteeName} width={40} height={40} className="h-10 w-10 object-cover" />
                ) : (
                  inviteeName.slice(0, 1).toUpperCase()
                )}
              </div>
              <div className="min-w-0">
                <div className="font-semibold truncate">{inviteeName}</div>
                {invitee.username ? <div className="text-xs text-zinc-500 truncate">@{invitee.username}</div> : null}
              </div>
            </div>

            {loading ? (
              <div className="text-sm text-zinc-600 dark:text-zinc-400">Loading your projects…</div>
            ) : projects.length === 0 ? (
              <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-4">
                <div className="text-sm font-medium">No projects available</div>
                <div className="text-xs text-zinc-500 mt-1">
                  Create a project or become an admin on one to invite collaborators.
                </div>
              </div>
            ) : (
              <>
                <div>
                  <label className="text-xs text-zinc-500">Project</label>
                  <select
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    className="mt-1 w-full px-3 py-2 rounded-xl border bg-white dark:bg-zinc-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  >
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title}
                      </option>
                    ))}
                  </select>
                  {selectedProjectId ? (
                    <div className="mt-1 text-xs text-zinc-500">
                      Link:{" "}
                      <a className="text-blue-600 hover:underline" href={projectHref({ id: selectedProjectId, slug: projects.find(x => x.id === selectedProjectId)?.slug || null })}>
                        {projectHref({ id: selectedProjectId, slug: projects.find(x => x.id === selectedProjectId)?.slug || null })}
                      </a>
                    </div>
                  ) : null}
                </div>

                <div>
                  <label className="text-xs text-zinc-500">Role</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as InviteRole)}
                    className="mt-1 w-full px-3 py-2 rounded-xl border bg-white dark:bg-zinc-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  >
                    <option value="member">Member</option>
                    <option value="viewer">Viewer</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </>
            )}
          </div>

          <div className="p-5 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-end gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl border text-sm hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800"
            >
              Cancel
            </button>
            <button
              onClick={sendInvite}
              disabled={sending || loading || projects.length === 0 || !selectedProjectId}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
              {sending ? "Sending…" : "Send invite"}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}


