"use client";

import { SectionCard } from "../SectionCard";
import { Plus } from "lucide-react";
import { Reorder } from "framer-motion";
import { useEffect, useState } from "react";
import { reorderSkillsAction } from "@/app/actions/profile";
import { useToast } from "@/components/ui-custom/Toast";

export function SkillsCard({
  skills,
  isOwner,
  onAdd,
}: {
  skills: any[];
  isOwner: boolean;
  onAdd: () => void;
}) {
  const { showToast } = useToast();
  const list = Array.isArray(skills) ? skills : [];

  // Local state for featured skills to handle reordering
  const [featured, setFeatured] = useState<any[]>(list.filter((s) => !!s?.is_featured));
  const rest = list.filter((s) => !s?.is_featured);

  // Sync state when props change
  useEffect(() => {
    setFeatured(list.filter((s) => !!s?.is_featured));
  }, [skills]);

  async function handleReorder(newOrder: any[]) {
    // Optimistic update
    setFeatured(newOrder);

    // Call server action
    const payload = newOrder.map((s, i) => ({ id: s.id, order: i }));
    const res = await reorderSkillsAction(payload);

    if (res.error) {
      // Revert on error (optional, or just show toast)
      showToast("Failed to reorder skills", "error");
      // Could re-sync from props if needed
    }
  }

  const renderChip = (s: any) => (
    <span
      key={s.id || s.skill_name}
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800"
    >
      <span>{s.skill_name}</span>
      {typeof s.endorsement_count === "number" && s.endorsement_count > 0 ? (
        <span className="text-[11px] text-zinc-500 dark:text-zinc-400">({s.endorsement_count})</span>
      ) : null}
    </span>
  );

  return (
    <SectionCard
      title="Skills & tools"
      description="What you’re strong at—used for matching and recommendations."
      action={
        isOwner ? (
          <button
            type="button"
            onClick={onAdd}
            className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-900"
          >
            <Plus className="w-4 h-4" />
            Add
          </button>
        ) : null
      }
    >
      {list.length ? (
        <div className="space-y-4">
          {featured.length ? (
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Top skills</div>
                {isOwner && (
                  <span className="text-[10px] text-zinc-400">Drag to reorder</span>
                )}
              </div>

              {isOwner ? (
                <Reorder.Group
                  axis="y"
                  values={featured}
                  onReorder={handleReorder}
                  className="space-y-1"
                >
                  {featured.map((s) => (
                    <Reorder.Item key={s.id} value={s} className="cursor-grab active:cursor-grabbing">
                      {renderChip(s)}
                    </Reorder.Item>
                  ))}
                </Reorder.Group>
              ) : (
                <div className="flex flex-wrap gap-2">{featured.map(renderChip)}</div>
              )}
            </div>
          ) : null}
          {rest.length ? (
            <div>
              {featured.length ? <div className="mt-4 border-t border-zinc-200 dark:border-zinc-800 pt-4" /> : null}
              <div className="flex flex-wrap gap-2">{rest.map(renderChip)}</div>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4 flex items-start justify-between gap-4">
          <div className="text-sm text-zinc-600 dark:text-zinc-400">
            <div className="font-semibold text-zinc-900 dark:text-zinc-100">No skills yet</div>
            <div className="mt-1">
              {isOwner ? "Add a few skills to get better recommendations and show what you’re strong at." : "This user hasn’t added skills yet."}
            </div>
          </div>
          {isOwner ? (
            <button
              type="button"
              onClick={onAdd}
              className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              <Plus className="w-4 h-4" />
              Add skills
            </button>
          ) : null}
        </div>
      )}
    </SectionCard>
  );
}


