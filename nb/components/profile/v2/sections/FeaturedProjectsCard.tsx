"use client";

import Link from "next/link";
import { SectionCard } from "../SectionCard";
import { ArrowUpRight, Plus } from "lucide-react";

function pickFeatured(projects: any[]) {
  const list = Array.isArray(projects) ? [...projects] : [];
  // Prefer open projects first, then most recent.
  list.sort((a, b) => {
    const aOpen = a?.status === "open" ? 1 : 0;
    const bOpen = b?.status === "open" ? 1 : 0;
    if (aOpen !== bOpen) return bOpen - aOpen;
    const aCreated = new Date(a?.created_at || 0).getTime();
    const bCreated = new Date(b?.created_at || 0).getTime();
    return bCreated - aCreated;
  });
  return list.slice(0, 4);
}

export function FeaturedProjectsCard({
  projects,
  isOwner = false,
}: {
  projects: any[];
  isOwner?: boolean;
}) {
  const featured = pickFeatured(projects);

  return (
    <SectionCard
      title="Featured projects"
      description="The best way to understand a builder is to see what they shipped."
      action={
        <Link
          href="/hub"
          className="text-sm font-semibold text-indigo-600 dark:text-indigo-300 hover:underline inline-flex items-center gap-1"
        >
          View all <ArrowUpRight className="w-4 h-4" />
        </Link>
      }
    >
      {featured.length ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {featured.map((p: any) => {
            const href = `/projects/${p?.slug || p?.id}`;
            return (
              <Link
                key={p.id}
                href={href}
                className="group rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-semibold text-zinc-900 dark:text-zinc-100 truncate">{p.title || "Untitled"}</div>
                    {p.description ? (
                      <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2">{p.description}</div>
                    ) : null}
                  </div>
                  <span className="text-[11px] px-2 py-1 rounded-full border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300">
                    {p.status || "active"}
                  </span>
                </div>
                {p.role ? (
                  <div className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">Role: {p.role}</div>
                ) : null}
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 flex items-start justify-between gap-4">
          <div className="text-sm text-zinc-600 dark:text-zinc-400">
            <div className="font-semibold text-zinc-900 dark:text-zinc-100">No projects yet</div>
            <div className="mt-1">
              {isOwner
                ? "Create your first project to show what you’re building and attract collaborators."
                : "This user hasn’t added projects yet."}
            </div>
          </div>
          {isOwner ? (
            <Link
              href="/hub?view=my_projects"
              className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              <Plus className="w-4 h-4" />
              Create project
            </Link>
          ) : null}
        </div>
      )}
    </SectionCard>
  );
}


