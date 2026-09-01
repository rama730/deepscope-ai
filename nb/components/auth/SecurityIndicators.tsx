"use client";

import { Shield, Lock } from "lucide-react";

export default function SecurityIndicators() {
  return (
    <div className="flex flex-row items-center gap-5 mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-800 w-full justify-center">
      <div className="flex items-center gap-2 color-zinc-500 dark:text-zinc-400 text-xs whitespace-nowrap w-auto">
        <Shield size={14} className="text-emerald-500 shrink-0 min-w-[14px]" />
        <span className="whitespace-nowrap">Secure connection</span>
      </div>
      <div className="flex items-center gap-2 color-zinc-500 dark:text-zinc-400 text-xs whitespace-nowrap w-auto">
        <Lock size={14} className="text-emerald-500 shrink-0 min-w-[14px]" />
        <span className="whitespace-nowrap">Encrypted</span>
      </div>
    </div>
  );
}

