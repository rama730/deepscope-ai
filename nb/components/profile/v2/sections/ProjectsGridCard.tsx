"use client";

import Link from "next/link";
import { SectionCard } from "../SectionCard";
import { Folder } from "lucide-react";
import { EmptyState } from "./empty-states/EmptyState";

export function ProjectsGridCard({
  projects,
  title = "Projects",
  description = "Projects you created or contributed to.",
}: {
  projects: any[];
  title?: string;
  description?: string;
}) {
  const list = Array.isArray(projects) ? projects : [];

  return (
    <SectionCard title={title} description={description}>
      {list.length ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {list.map((p: any) => (
            <Link
              key={p.id}
              href={`/projects/${p?.slug || p?.id}`}
              className="group rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-semibold text-zinc-900 dark:text-zinc-100 truncate">{p.title || "Untitled"}</div>
                  {p.description ? (
                    <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2">{p.description}</div>
                  ) : null}
                </div>
                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                  <span className="text-[11px] px-2 py-1 rounded-full border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300">
                    {p.status || "active"}
                  </span>
                  {p.role ? (
                    <span className="text-[11px] px-2 py-1 rounded-full bg-indigo-50 dark:bg-indigo-900/15 text-indigo-700 dark:text-indigo-200 border border-indigo-200 dark:border-indigo-900/40">
                      {p.role}
                    </span>
                  ) : null}
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState
          title="No projects yet"
          description="Projects you create or join will appear here."
          icon={Folder}
          className="border-none bg-transparent dark:bg-transparent"
        />
      )}
    </SectionCard>
  );
}


