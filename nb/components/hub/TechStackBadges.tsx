"use client";

import { X } from "lucide-react";

interface TechStackBadgesProps {
  selectedTech: string[];
  onRemove: (tech: string) => void;
}

export default function TechStackBadges({ selectedTech, onRemove }: TechStackBadgesProps) {
  if (selectedTech.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">Tech stack:</span>
      {selectedTech.map((tech) => (
        <button
          key={tech}
          onClick={() => onRemove(tech)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-xs font-medium rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label={`Remove ${tech} filter`}
        >
          {tech}
          <X className="w-3 h-3" />
        </button>
      ))}
    </div>
  );
}
