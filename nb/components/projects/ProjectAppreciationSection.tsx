"use client";

import { Heart, MessageSquare } from "lucide-react";

export default function ProjectAppreciationSection() {
  // Placeholder component - can be enhanced with actual appreciation/feedback data
  return (
    <div className="rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
      <h2 className="text-lg font-semibold text-slate-900 dark:text-zinc-100 mb-4 flex items-center gap-2">
        <Heart className="w-5 h-5 text-red-500" />
        Appreciation & Feedback
      </h2>

      <div className="text-center py-8">
        <div className="flex items-center justify-center gap-2 mb-2 text-slate-400 dark:text-zinc-500">
          <MessageSquare className="w-8 h-8" />
        </div>
        <p className="text-sm text-slate-600 dark:text-zinc-400">
          Appreciation and feedback features coming soon
        </p>
      </div>
    </div>
  );
}

