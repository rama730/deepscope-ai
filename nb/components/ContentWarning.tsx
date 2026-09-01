"use client";

import { useState } from "react";
import { AlertTriangle, Eye } from "lucide-react";

interface ContentWarningProps {
  warning: string;
  children: React.ReactNode;
}

export default function ContentWarning({
  warning,
  children,
}: ContentWarningProps) {
  const [revealed, setRevealed] = useState(false);

  if (!warning || revealed) {
    return <>{children}</>;
  }

  return (
    <div className="relative">
      <div className="absolute inset-0 backdrop-blur-xl bg-zinc-100 dark:bg-zinc-900/90 rounded-xl flex flex-col items-center justify-center p-6 z-10">
        <AlertTriangle className="w-12 h-12 text-amber-600 mb-3" />
        <h4 className="font-semibold text-zinc-900 dark:text-zinc-50 mb-2">Content Warning</h4>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 text-center mb-4">{warning}</p>
        <button
          onClick={() => setRevealed(true)}
          className="flex items-center gap-2 px-4 py-2 bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 transition-colors"
        >
          <Eye className="w-4 h-4" />
          Show Content
        </button>
      </div>
      <div className="blur-lg select-none pointer-events-none">{children}</div>
    </div>
  );
}

export function ContentWarningComposer({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [showInput, setShowInput] = useState(!!value);

  const warningOptions = [
    "Sensitive content",
    "Spoilers",
    "NSFW",
    "Violence",
    "Custom...",
  ];

  if (!showInput) {
    return (
      <button
        type="button"
        onClick={() => setShowInput(true)}
        className="flex items-center gap-2 px-3 py-1.5 text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:bg-zinc-900 rounded-lg transition-colors"
      >
        <AlertTriangle className="w-4 h-4" />
        Add content warning
      </button>
    );
  }

  return (
    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
      <div className="flex items-center gap-2 mb-2">
        <AlertTriangle className="w-4 h-4 text-amber-600" />
        <span className="text-sm font-medium text-amber-900">
          Content Warning
        </span>
      </div>
      <div className="flex gap-2 mb-2 flex-wrap">
        {warningOptions.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => {
              if (option === "Custom...") {
                // Keep input empty for custom
              } else {
                onChange(option);
              }
            }}
            className={`px-2 py-1 text-xs rounded ${value === option
                ? "bg-amber-600 text-white"
                : "bg-white dark:bg-zinc-900 text-amber-900 border border-amber-300 hover:border-amber-400"
              }`}
          >
            {option}
          </button>
        ))}
      </div>
      <input
        type="text"
        placeholder="Or enter custom warning..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-amber-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
      />
      <div className="flex justify-end gap-2 mt-2">
        <button
          type="button"
          onClick={() => {
            onChange("");
            setShowInput(false);
          }}
          className="text-xs text-zinc-600 hover:text-zinc-900 dark:text-zinc-50"
        >
          Remove warning
        </button>
      </div>
    </div>
  );
}


