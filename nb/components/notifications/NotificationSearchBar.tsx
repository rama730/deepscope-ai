"use client";

import { useState, useEffect } from "react";
import { Search, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface NotificationSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function NotificationSearchBar({
  value,
  onChange,
  placeholder = "Search notifications...",
}: NotificationSearchBarProps) {
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      onChange(localValue);
    }, 300); // Debounce

    return () => clearTimeout(timeoutId);
  }, [localValue, onChange]);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
      <input
        type="text"
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-10 pr-10 py-2.5 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-zinc-900 dark:text-zinc-100 placeholder-zinc-500"
        aria-label="Search notifications"
      />
      <AnimatePresence>
        {localValue && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={() => setLocalValue("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded transition-colors"
            aria-label="Clear search"
          >
            <X className="w-4 h-4 text-zinc-400" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
