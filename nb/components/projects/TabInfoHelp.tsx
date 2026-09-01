"use client";

import { useState } from "react";
import { HelpCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function TabInfoHelp({
  label = "What is this?",
  title,
  description,
  bullets,
}: {
  label?: string;
  title: string;
  description: string;
  bullets?: string[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <TooltipProvider>
      <Tooltip open={open} onOpenChange={setOpen}>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="inline-flex items-center justify-center w-8 h-8 rounded-lg hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 transition-colors text-zinc-500 hover:text-zinc-900 dark:text-zinc-50 dark:hover:text-zinc-100"
            aria-label={label}
            onMouseEnter={() => setOpen(true)}
            onMouseLeave={() => setOpen(false)}
            onFocus={() => setOpen(true)}
            onBlur={() => setOpen(false)}
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent align="end" className="w-80">
          <div className="space-y-2">
            <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {title}
            </div>
            <div className="text-sm text-zinc-600 dark:text-zinc-400">
              {description}
            </div>
            {bullets && bullets.length > 0 && (
              <ul className="mt-2 space-y-1 text-sm text-zinc-600 dark:text-zinc-400 list-disc pl-5">
                {bullets.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}


