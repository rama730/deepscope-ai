"use client";

import { useState, useEffect } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui-custom/Toast";

interface Props {
  projectId: string;
  onClose: () => void;
}

export default function NextStepsModal({ projectId, onClose }: Props) {
  const supabase = createSupabaseBrowserClient();
  const { showToast } = useToast();
  const [sharing, setSharing] = useState(false);
  const [projectSlug, setProjectSlug] = useState<string | null>(null);

  // Fetch project slug
  useEffect(() => {
    (async () => {
      const { data: project } = await supabase
        .from("projects")
        .select("slug")
        .eq("id", projectId)
        .single();
      if (project?.slug) {
        setProjectSlug(project.slug);
      }
    })();
  }, [projectId, supabase]);

  const projectUrl = typeof window !== "undefined" 
    ? `${window.location.origin}/projects/${projectSlug || projectId}` 
    : "";

  async function copyInvite() {
    try {
      await navigator.clipboard.writeText(projectUrl);
      showToast("Invite link copied to clipboard!", "success");
    } catch (error) {
      showToast("Failed to copy link. Please try again.", "error");
    }
  }

  async function shareToFeed() {
    setSharing(true);
    try {
      // Fetch minimal project info to craft a nice message
      const { data: proj } = await supabase
        .from("projects")
        .select("title, short_description")
        .eq("id", projectId)
        .single();
      const content = `New project: ${proj?.title || "Check this out"}${proj?.short_description ? ` — ${proj.short_description}` : ""} \n${projectUrl}`;
      await supabase.from("posts").insert({ content });
      onClose();
      // Navigate to explorer so user can see their post
      window.location.href = "/explorer";
    } finally {
      setSharing(false);
    }
  }

  function viewProject() {
    window.location.href = `/projects/${projectSlug || projectId}`;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-2xl border bg-white dark:bg-zinc-900 p-6 space-y-4 unb-modal-enter">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold">Project created</h3>
          <button 
            onClick={onClose} 
            className="text-zinc-500 unb-interactive unb-focus-ring"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">Nice work! What would you like to do next?</p>
        <div className="space-y-2">
          <button 
            onClick={viewProject} 
            className="w-full px-4 py-2.5 rounded-lg bg-blue-600 text-white font-semibold unb-interactive unb-focus-ring"
            aria-label="View project"
          >
            View project
          </button>
          <button 
            onClick={copyInvite} 
            className="w-full px-4 py-2.5 rounded-lg border unb-interactive unb-focus-ring"
            aria-label="Copy invite link to clipboard"
          >
            Copy invite link
          </button>
          <button 
            onClick={shareToFeed} 
            disabled={sharing} 
            className="w-full px-4 py-2.5 rounded-lg border unb-interactive unb-focus-ring disabled:opacity-60"
            aria-label="Share project to feed"
          >
            {sharing ? "Sharing..." : "Share to feed"}
          </button>
        </div>
      </div>
    </div>
  );
}






















