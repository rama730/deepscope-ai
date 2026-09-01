"use client";

import { X } from "lucide-react";
import { PROJECT_STATUS, PROJECT_TYPE } from "@/constants/hub";

interface QuickFilterChipsProps {
  onStatusClick: (status: string) => void;
  onTypeClick: (type: string) => void;
  currentStatus: string;
  currentType: string;
}

export default function QuickFilterChips({
  onStatusClick,
  onTypeClick,
  currentStatus,
  currentType,
}: QuickFilterChipsProps) {
  const quickFilters = [
    { type: "status", value: PROJECT_STATUS.IN_PROGRESS, label: "In Progress" },
    { type: "status", value: PROJECT_STATUS.LAUNCHED, label: "Launched" },
    { type: "type", value: PROJECT_TYPE.WEB_APP, label: "Web Apps" },
    { type: "type", value: PROJECT_TYPE.MOBILE_APP, label: "Mobile Apps" },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">Quick filters:</span>
      {quickFilters.map((filter) => {
        const isActive =
          filter.type === "status" ? currentStatus === filter.value : currentType === filter.value;
        
        return (
          <button
            key={`${filter.type}-${filter.value}`}
            onClick={() => {
              if (filter.type === "status") {
                onStatusClick(isActive ? PROJECT_STATUS.ALL : filter.value);
              } else {
                onTypeClick(isActive ? PROJECT_TYPE.ALL : filter.value);
              }
            }}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              isActive
                ? "bg-blue-600 text-white"
                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700"
            }`}
            aria-pressed={isActive}
          >
            {filter.label}
            {isActive && <X className="w-3 h-3" />}
          </button>
        );
      })}
    </div>
  );
}
