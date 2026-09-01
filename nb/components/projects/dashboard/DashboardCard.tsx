"use client";

import { ReactNode, memo } from "react";
import { ChevronRight, LucideIcon } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface DashboardCardProps {
  title: string;
  icon?: LucideIcon;
  iconColor?: string;
  iconGradient?: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
  badge?: {
    count: number;
    variant?: "default" | "warning" | "success" | "danger";
  };
  children: ReactNode;
  className?: string;
  noPadding?: boolean;
  compact?: boolean;
  featured?: boolean;
  glowColor?: "indigo" | "emerald" | "amber" | "rose" | "purple" | "cyan" | "none";
}

const badgeVariants = {
  default: "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300",
  warning: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300",
  success: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300",
  danger: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300",
};

const glowColors = {
  none: "",
  indigo: "hover:shadow-indigo-500/10 dark:hover:shadow-indigo-400/10",
  emerald: "hover:shadow-emerald-500/10 dark:hover:shadow-emerald-400/10",
  amber: "hover:shadow-amber-500/10 dark:hover:shadow-amber-400/10",
  rose: "hover:shadow-rose-500/10 dark:hover:shadow-rose-400/10",
  purple: "hover:shadow-purple-500/10 dark:hover:shadow-purple-400/10",
  cyan: "hover:shadow-cyan-500/10 dark:hover:shadow-cyan-400/10",
};

function DashboardCard({
  title,
  icon: Icon,
  iconColor = "text-zinc-500 dark:text-zinc-400",
  iconGradient = false,
  action,
  badge,
  children,
  className = "",
  noPadding = false,
  compact = false,
  featured = false,
  glowColor = "indigo",
}: DashboardCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={cn(
        "rounded-2xl border overflow-hidden",
        "bg-white dark:bg-zinc-900",
        "border-zinc-200 dark:border-zinc-800",
        "shadow-sm hover:shadow-xl",
        "transition-all duration-300",
        glowColors[glowColor],
        featured && [
          "ring-1 ring-indigo-500/20 dark:ring-indigo-400/20",
          "bg-gradient-to-br from-white via-indigo-50/20 to-purple-50/20",
          "dark:from-zinc-900 dark:via-indigo-900/10 dark:to-purple-900/10",
        ],
        className
      )}
    >
      {/* Header */}
      <div className={cn(
        "flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800",
        compact ? "px-3 py-2.5" : "px-4 py-3"
      )}>
        <div className="flex items-center gap-2.5">
          {Icon && (
            iconGradient ? (
              <div className="w-7 h-7 rounded-md bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                <Icon className="w-3.5 h-3.5 text-white" />
              </div>
            ) : (
              <div className={cn(
                "w-7 h-7 rounded-md flex items-center justify-center",
                "bg-zinc-100 dark:bg-zinc-800"
              )}>
                <Icon className={cn("w-3.5 h-3.5", iconColor)} />
              </div>
            )
          )}
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {title}
            </h3>
            {badge && badge.count > 0 && (
              <span className={cn(
                "px-1.5 py-0.5 rounded-full text-[10px] font-medium",
                badgeVariants[badge.variant || "default"]
              )}>
                {badge.count}
              </span>
            )}
          </div>
        </div>

        {action && (
          <motion.button
            whileHover={{ x: 2 }}
            onClick={action.onClick}
            className="flex items-center gap-1 text-[11px] font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors group"
          >
            {action.label}
            <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </motion.button>
        )}
      </div>

      {/* Content */}
      <div className={cn(
        noPadding ? "" : compact ? "p-3" : "p-4"
      )}>
        {children}
      </div>

      {/* Featured gradient overlay */}
      {featured && (
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-purple-500/5 pointer-events-none" />
      )}
    </motion.div>
  );
}

export default memo(DashboardCard);
