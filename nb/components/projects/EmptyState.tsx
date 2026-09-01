"use client";

import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  children?: ReactNode;
  compact?: boolean;
}

export default function EmptyState({ icon: Icon, title, description, action, children, compact = false }: EmptyStateProps) {
  if (compact) {
    return (
      <div className="flex flex-col items-center justify-center py-6 px-2 text-center h-full">
        <div className="p-2 bg-slate-100 dark:bg-zinc-800 rounded-full mb-2">
          <Icon className="w-4 h-4 text-slate-400 dark:text-zinc-500" />
        </div>
        <h3 className="text-xs font-semibold text-slate-900 dark:text-zinc-100 mb-0.5">
          {title}
        </h3>
        {description && (
          <p className="text-[10px] text-slate-500 dark:text-zinc-400 max-w-[180px] leading-snug">
            {description}
          </p>
        )}
        {action && (
          <button
            onClick={action.onClick}
            className="mt-2 px-3 py-1 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors text-[10px] font-medium"
          >
            {action.label}
          </button>
        )}
        {children}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="p-4 bg-slate-100 dark:bg-zinc-800 rounded-full mb-4">
        <Icon className="w-8 h-8 text-slate-400 dark:text-zinc-500" />
      </div>
      <h3 className="text-lg font-semibold text-slate-900 dark:text-zinc-100 mb-2">
        {title}
      </h3>
      {description && (
        <p className="text-sm text-slate-600 dark:text-zinc-400 max-w-md mb-6">
          {description}
        </p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
        >
          {action.label}
        </button>
      )}
      {children}
    </div>
  );
}
