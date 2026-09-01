"use client";

import { SectionCard } from "../SectionCard";
import { GraduationCap, Plus } from "lucide-react";
import { EmptyState } from "./empty-states/EmptyState";

function fmtYears(edu: any) {
  const start = edu?.start_date ? new Date(edu.start_date) : null;
  const end = edu?.end_date ? new Date(edu.end_date) : null;
  const a = start ? String(start.getFullYear()) : "";
  const b = end ? String(end.getFullYear()) : "";
  if (a && b) return `${a} — ${b}`;
  return a || b || "";
}

export function EducationCard({
  education,
  isOwner,
  onAdd,
}: {
  education: any[];
  isOwner: boolean;
  onAdd: () => void;
}) {
  const list = Array.isArray(education) ? education : [];

  return (
    <SectionCard
      title="Education"
      description="Formal background and focused learning."
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
          {list.map((edu: any, idx: number) => (
            <div key={edu.id || idx} className="flex gap-4">
              <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center flex-shrink-0">
                <GraduationCap className="w-5 h-5 text-zinc-500 dark:text-zinc-400" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                      {edu.institution || "Institution"}
                    </div>
                    <div className="text-sm text-zinc-600 dark:text-zinc-400 truncate">
                      {[edu.degree, edu.field_of_study].filter(Boolean).join(" • ")}
                    </div>
                  </div>
                  <div className="text-xs text-zinc-500 dark:text-zinc-400 flex-shrink-0">{fmtYears(edu)}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          title="No education yet"
          description={
            isOwner
              ? "Add it to help collaborators understand your background and focus areas."
              : "This user hasn’t added education yet."
          }
          icon={GraduationCap}
          actionLabel="Add Education"
          onAction={isOwner ? onAdd : undefined}
          className="border-none bg-transparent dark:bg-transparent"
        />
      )}
    </SectionCard>
  );
}


