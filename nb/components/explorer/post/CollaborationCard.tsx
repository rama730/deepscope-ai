"use client";


import { Post } from "@/components/explorer/types";

interface CollaborationCardProps {
  post: Post;
}

export function CollaborationCard({ post }: CollaborationCardProps) {
  if (post.post_type !== "collaboration" || !post.collaboration_data) return null;

  const { collaboration_data } = post;

  return (
    <div className="mt-4 p-5 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-2xl border border-blue-100 dark:border-blue-900/50 backdrop-blur-sm relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-blue-400/10 blur-[50px] rounded-full" />

      <h4 className="relative font-bold text-blue-900 dark:text-blue-100 mb-4 flex items-center gap-2 text-base">
        <span className="text-xl">🤝</span> Open to Collaborate
      </h4>

      {collaboration_data.looking_for && collaboration_data.looking_for.length > 0 && (
        <div className="mb-4 relative">
          <p className="text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-2">
            Looking for
          </p>
          <div className="flex flex-wrap gap-2">
            {collaboration_data.looking_for.map((role: string, i: number) => (
              <span
                key={i}
                className="px-3 py-1.5 bg-white/80 dark:bg-white/10 text-blue-700 dark:text-blue-200 text-sm font-semibold rounded-lg border border-blue-200/50 dark:border-blue-700/30 shadow-sm backdrop-blur-md"
              >
                {role}
              </span>
            ))}
          </div>
        </div>
      )}

      {collaboration_data.skills_needed && collaboration_data.skills_needed.length > 0 && (
        <div className="relative">
          <p className="text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-2">
            Skills needed
          </p>
          <div className="flex flex-wrap gap-2">
            {collaboration_data.skills_needed.map((skill: string, i: number) => (
              <span
                key={i}
                className="px-2.5 py-1 bg-blue-100/50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-xs font-medium rounded-md border border-blue-200/50 dark:border-blue-800/30"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
