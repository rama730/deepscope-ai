"use client";

import { SectionCard } from "../SectionCard";
import { Briefcase, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { EmptyState } from "./empty-states/EmptyState";

function fmtRange(exp: any) {
  const start = exp?.start_date ? new Date(exp.start_date) : null;
  const end = exp?.current ? null : exp?.end_date ? new Date(exp.end_date) : null;
  const startLabel = start ? start.toLocaleDateString("en-US", { month: "short", year: "numeric" }) : "";
  const endLabel = exp?.current ? "Present" : end ? end.toLocaleDateString("en-US", { month: "short", year: "numeric" }) : "";
  if (!startLabel && !endLabel) return "";
  if (startLabel && endLabel) return `${startLabel} — ${endLabel}`;
  return startLabel || endLabel;
}

export function ExperienceCard({
  experiences,
  isOwner,
  onAdd,
}: {
  experiences: any[];
  isOwner: boolean;
  onAdd: () => void;
}) {
  const list = Array.isArray(experiences) ? experiences : [];

  return (
    <SectionCard
      title="Experience"
      description="Roles, impact, and proof of work."
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
        <div className="space-y-5">
          {list.map((exp: any, idx: number) => (
            <div key={exp.id || idx} className="flex gap-4">
              <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center flex-shrink-0">
                <Briefcase className="w-5 h-5 text-zinc-500 dark:text-zinc-400" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-semibold text-zinc-900 dark:text-zinc-100 truncate">{exp.title || "Role"}</div>
                    <div className="text-sm text-zinc-600 dark:text-zinc-400 truncate">{exp.company || "Company"}</div>
                  </div>
                  <div className={cn("text-xs text-zinc-500 dark:text-zinc-400 flex-shrink-0", !fmtRange(exp) ? "opacity-0" : "")}>
                    {fmtRange(exp)}
                  </div>
                </div>
                {exp.description ? (
                  <div className="mt-2 text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">
                    {exp.description}
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          title="No experience yet"
          description={
            isOwner
              ? "Add your most relevant roles and impact—this helps people quickly understand your background."
              : "This user hasn’t added experience yet."
          }
          icon={Briefcase}
          actionLabel="Add Experience"
          onAction={isOwner ? onAdd : undefined}
          className="border-none bg-transparent dark:bg-transparent"
        />
      )}
    </SectionCard>
  );
}


