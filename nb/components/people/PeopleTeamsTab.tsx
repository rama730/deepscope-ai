"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { projectHref, profileHref } from "@/lib/routing/identifiers";

export default function PeopleTeamsTab({
  initialUser,
  teamsPromise,
}: {
  initialUser: any;
  teamsPromise?: Promise<any>;
}) {
  const userId = initialUser?.id || null;
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);

  useEffect(() => {
    let alive = true;
    async function load() {
      if (!userId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const data = teamsPromise ? await Promise.resolve(teamsPromise) : { projects: [], members: [] };
        if (!alive) return;
        setProjects(data?.projects || []);
        setMembers(data?.members || []);
      } finally {
        if (alive) setLoading(false);
      }
    }
    load();
    return () => {
      alive = false;
    };
  }, [userId, teamsPromise]);

  if (!userId) {
    return (
      <div className="max-w-7xl mx-auto px-4">
        <div className="rounded-2xl border bg-white dark:bg-zinc-900 p-8 text-center">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">Sign in to view teams.</p>
          <Link href="/login" className="inline-block mt-3 text-sm text-blue-600 hover:underline">
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  const membersByProject = new Map<string, any[]>();
  for (const m of members) {
    const list = membersByProject.get(m.project_id) || [];
    list.push(m);
    membersByProject.set(m.project_id, list);
  }

  return (
    <div className="max-w-7xl mx-auto px-4 pb-10">
      {loading ? (
        <div className="rounded-2xl border bg-white dark:bg-zinc-900 p-6 text-sm text-zinc-600 dark:text-zinc-400">
          Loading teams…
        </div>
      ) : projects.length === 0 ? (
        <div className="rounded-2xl border bg-white dark:bg-zinc-900 p-8 text-center">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            You’re not part of any projects yet.
          </p>
          <div className="mt-3">
            <Link href="/hub" className="text-sm text-blue-600 hover:underline">
              Browse projects
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {projects.map((p) => {
            const team = membersByProject.get(p.id) || [];

            // Group by role
            const byRole = new Map<string, any[]>();
            team.forEach(m => {
              const r = m.role || "Member";
              const normalized = r.charAt(0).toUpperCase() + r.slice(1).toLowerCase();
              const list = byRole.get(normalized) || [];
              list.push(m);
              byRole.set(normalized, list);
            });

            // Sort roles: Owner -> Admin -> Others (Alphabetical)
            const sortedRoles = Array.from(byRole.keys()).sort((a, b) => {
              const priority: Record<string, number> = { "Owner": 3, "Admin": 2, "Maintainer": 1 };
              const pa = priority[a] || 0;
              const pb = priority[b] || 0;
              if (pa !== pb) return pb - pa;
              return a.localeCompare(b);
            });

            return (
              <section key={p.id} className="rounded-2xl border bg-white dark:bg-zinc-900 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link
                      href={projectHref({ id: p.id, slug: p.slug })}
                      className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 hover:underline truncate block"
                    >
                      {p.title}
                    </Link>
                    <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                      Status: {p.status || "open"} • {team.length} member{team.length !== 1 ? "s" : ""}
                    </div>
                  </div>
                  <Link
                    href={projectHref({ id: p.id, slug: p.slug })}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    Open
                  </Link>
                </div>

                <div className="mt-4 space-y-4">
                  {team.length === 0 ? (
                    <div className="text-sm text-zinc-500 dark:text-zinc-400">No collaborators yet.</div>
                  ) : (
                    sortedRoles.map(role => (
                      <div key={role}>
                        <h4 className="text-[10px] uppercase tracking-wider font-bold text-zinc-500 dark:text-zinc-400 mb-2 flex items-center gap-2">
                          {role}
                          <span className="bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 px-1.5 py-0.5 rounded-full text-[9px] font-normal">
                            {byRole.get(role)?.length}
                          </span>
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {byRole.get(role)?.map((m) => {
                            const prof = m.profiles;
                            const name = prof?.full_name || prof?.username || "User";
                            return (
                              <Link
                                key={`${m.project_id}:${m.user_id}`}
                                href={profileHref(prof?.username || prof?.id || m.user_id)}
                                className="inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800 transition-colors"
                              >
                                <span className="h-6 w-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 text-white flex items-center justify-center overflow-hidden text-[10px] font-semibold flex-shrink-0">
                                  {prof?.avatar_url ? (
                                    <Image src={prof.avatar_url} alt={name} width={24} height={24} className="h-6 w-6 object-cover" />
                                  ) : (
                                    name.slice(0, 1).toUpperCase()
                                  )}
                                </span>
                                <span className="max-w-[120px] truncate text-zinc-900 dark:text-zinc-100">{name}</span>
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}


