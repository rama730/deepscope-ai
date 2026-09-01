"use client";

import { useEffect, useMemo, useState } from "react";
import { SectionCard } from "../SectionCard";
import { Loader2, Pencil, Plus } from "lucide-react";

export function AboutCard({
  profile,
  isOwner,
  onBioUpdated,
}: {
  profile: any;
  isOwner: boolean;
  onBioUpdated?: (nextBio: string | null) => void;
}) {
  const bioRaw = typeof profile?.bio === "string" ? profile.bio : "";
  const bio = bioRaw.trim();
  const openTo: string[] = Array.isArray(profile?.open_to) ? profile.open_to : [];

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(bio);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!editing) {
      setDraft(bio);
      setError(null);
    }
  }, [bio, editing]);

  const canSave = useMemo(() => {
    if (saving) return false;
    const next = draft.trim();
    if (next.length > 500) return false;
    return next !== bio;
  }, [bio, draft, saving]);

  async function save() {
    if (!canSave) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bio: draft }),
      });
      const json = await res.json();
      if (!res.ok || !json?.success) {
        throw new Error(json?.message || "Failed to update bio");
      }
      const nextBio = typeof json?.data?.bio === "string" ? json.data.bio : null;
      onBioUpdated?.(nextBio);
      setEditing(false);
    } catch (e: any) {
      setError(e?.message || "Failed to update bio");
    } finally {
      setSaving(false);
    }
  }

  return (
    <SectionCard
      title="About"
      description="A quick snapshot of who you are and what you’re building."
      action={
        isOwner ? (
          editing ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setEditing(false);
                  setDraft(bio);
                  setError(null);
                }}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-900 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={save}
                disabled={!canSave}
                className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-60"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Save
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setEditing(true);
                setDraft(bio);
                setError(null);
              }}
              className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-900"
            >
              {bio ? <Pencil className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {bio ? "Edit" : "Add bio"}
            </button>
          )
        ) : null
      }
    >
      <div className="space-y-5">
        {editing ? (
          <div className="space-y-2">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={6}
              placeholder="What you build, what you’ve built, what you want next…"
              className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <div className="flex items-center justify-between text-xs">
              <div className="text-zinc-500 dark:text-zinc-400">500 characters max</div>
              <div className={draft.length > 500 ? "text-red-600 dark:text-red-400" : "text-zinc-500 dark:text-zinc-400"}>
                {draft.length}/500
              </div>
            </div>
            {error ? <div className="text-xs text-red-600 dark:text-red-400">{error}</div> : null}
          </div>
        ) : bio ? (
          <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">{bio}</p>
        ) : (
          <div className="text-sm text-zinc-500 dark:text-zinc-400">
            No bio yet.
            {isOwner ? " Add a few lines to help people understand what you build." : " This user hasn’t added one yet."}
          </div>
        )}

        {openTo.length ? (
          <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800">
            <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Open to</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {openTo.map((x) => (
                <span
                  key={x}
                  className="text-xs px-2.5 py-1 rounded-full bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700"
                >
                  {x}
                </span>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </SectionCard>
  );
}


