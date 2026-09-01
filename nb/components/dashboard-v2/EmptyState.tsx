"use client";

import { memo, ReactNode } from "react";
import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateEnhancedProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: LucideIcon;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  illustration?: "rocket" | "folder" | "team" | "chart" | "tasks" | "none";
  variant?: "default" | "minimal" | "card";
  className?: string;
  children?: ReactNode;
}

// SVG illustrations
const illustrations = {
  rocket: (
    <svg viewBox="0 0 120 120" className="w-full h-full">
      <defs>
        <linearGradient id="rocketGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>
      <circle cx="60" cy="60" r="50" fill="url(#rocketGrad)" opacity="0.1" />
      <motion.g
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <path
          d="M60 25 L70 55 L75 70 L60 65 L45 70 L50 55 Z"
          fill="url(#rocketGrad)"
        />
        <circle cx="60" cy="45" r="6" fill="white" opacity="0.8" />
        <path d="M45 70 L40 85 L50 75 Z" fill="#f59e0b" />
        <path d="M75 70 L80 85 L70 75 Z" fill="#f59e0b" />
        <ellipse cx="60" cy="90" rx="8" ry="4" fill="#f97316" opacity="0.5" />
      </motion.g>
      <motion.circle
        cx="30" cy="40"
        r="3"
        fill="#6366f1"
        opacity="0.3"
        animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 2, repeat: Infinity }}
      />
      <motion.circle
        cx="90" cy="50"
        r="2"
        fill="#8b5cf6"
        opacity="0.3"
        animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
      />
    </svg>
  ),
  folder: (
    <svg viewBox="0 0 120 120" className="w-full h-full">
      <defs>
        <linearGradient id="folderGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#a855f7" />
          <stop offset="100%" stopColor="#6366f1" />
        </linearGradient>
      </defs>
      <circle cx="60" cy="60" r="50" fill="url(#folderGrad)" opacity="0.1" />
      <motion.g
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <path
          d="M25 45 L25 85 L95 85 L95 50 L55 50 L50 45 Z"
          fill="url(#folderGrad)"
          opacity="0.9"
        />
        <path
          d="M25 50 L95 50 L95 85 L25 85 Z"
          fill="url(#folderGrad)"
        />
        <rect x="35" y="60" width="20" height="3" rx="1.5" fill="white" opacity="0.5" />
        <rect x="35" y="68" width="30" height="3" rx="1.5" fill="white" opacity="0.3" />
      </motion.g>
    </svg>
  ),
  team: (
    <svg viewBox="0 0 120 120" className="w-full h-full">
      <defs>
        <linearGradient id="teamGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#10b981" />
          <stop offset="100%" stopColor="#06b6d4" />
        </linearGradient>
      </defs>
      <circle cx="60" cy="60" r="50" fill="url(#teamGrad)" opacity="0.1" />
      <motion.g
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <circle cx="60" cy="45" r="12" fill="url(#teamGrad)" />
        <ellipse cx="60" cy="75" rx="20" ry="12" fill="url(#teamGrad)" />
      </motion.g>
      <motion.g
        initial={{ x: -10, opacity: 0 }}
        animate={{ x: 0, opacity: 0.7 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        <circle cx="30" cy="50" r="8" fill="url(#teamGrad)" opacity="0.7" />
        <ellipse cx="30" cy="72" rx="12" ry="8" fill="url(#teamGrad)" opacity="0.7" />
      </motion.g>
      <motion.g
        initial={{ x: 10, opacity: 0 }}
        animate={{ x: 0, opacity: 0.7 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        <circle cx="90" cy="50" r="8" fill="url(#teamGrad)" opacity="0.7" />
        <ellipse cx="90" cy="72" rx="12" ry="8" fill="url(#teamGrad)" opacity="0.7" />
      </motion.g>
    </svg>
  ),
  chart: (
    <svg viewBox="0 0 120 120" className="w-full h-full">
      <defs>
        <linearGradient id="chartGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#f97316" />
        </linearGradient>
      </defs>
      <circle cx="60" cy="60" r="50" fill="url(#chartGrad)" opacity="0.1" />
      {[0, 1, 2, 3].map((i) => {
        const heights = [35, 50, 40, 60];
        const h = heights[i] || 0;
        return (
          <motion.rect
            key={i}
            x={30 + i * 18}
            y={85 - h}
            width="12"
            height={h}
            rx="2"
            fill="url(#chartGrad)"
            initial={{ scaleY: 0, opacity: 0 }}
            animate={{ scaleY: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 + i * 0.1 }}
            style={{ transformOrigin: "bottom" }}
          />
        );
      })}
    </svg>
  ),
  tasks: (
    <svg viewBox="0 0 120 120" className="w-full h-full">
      <defs>
        <linearGradient id="tasksGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#10b981" />
        </linearGradient>
      </defs>
      <circle cx="60" cy="60" r="50" fill="url(#tasksGrad)" opacity="0.1" />
      {[0, 1, 2].map((i) => (
        <motion.g
          key={i}
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.2 + i * 0.15 }}
        >
          <rect
            x="35"
            y={38 + i * 20}
            width="50"
            height="14"
            rx="4"
            fill="white"
            stroke="url(#tasksGrad)"
            strokeWidth="2"
          />
          <circle
            cx="43"
            cy={45 + i * 20}
            r="4"
            fill={i === 0 ? "#10b981" : "transparent"}
            stroke={i === 0 ? "#10b981" : "#d1d5db"}
            strokeWidth="2"
          />
          {i === 0 && (
            <path
              d="M41 45 L42.5 47 L46 43"
              stroke="white"
              strokeWidth="1.5"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
        </motion.g>
      ))}
    </svg>
  ),
  none: null,
};

function EmptyStateEnhanced({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  illustration = "rocket",
  variant = "default",
  className,
  children,
}: EmptyStateEnhancedProps) {
  const ActionIcon = action?.icon;

  const variantStyles = {
    default: "py-12",
    minimal: "py-8",
    card: cn(
      "py-10 px-6",
      "bg-white dark:bg-zinc-900",
      "rounded-2xl border border-zinc-200 dark:border-zinc-800",
      "shadow-sm"
    ),
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={cn(
        "flex flex-col items-center text-center",
        variantStyles[variant],
        className
      )}
    >
      {/* Illustration */}
      {illustration !== "none" && (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="w-32 h-32 mb-6"
        >
          {illustrations[illustration]}
        </motion.div>
      )}

      {/* Icon (if no illustration) */}
      {illustration === "none" && (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="w-16 h-16 rounded-2xl bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-800 dark:to-zinc-700 flex items-center justify-center mb-6"
        >
          <Icon className="w-8 h-8 text-zinc-500 dark:text-zinc-400" />
        </motion.div>
      )}

      {/* Title */}
      <motion.h3
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2"
      >
        {title}
      </motion.h3>

      {/* Description */}
      {description && (
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-sm text-zinc-500 dark:text-zinc-400 max-w-sm mb-6"
        >
          {description}
        </motion.p>
      )}

      {/* Actions */}
      {(action || secondaryAction) && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex flex-wrap items-center justify-center gap-3"
        >
          {action && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={action.onClick}
              className={cn(
                "inline-flex items-center gap-2 px-5 py-2.5 rounded-xl",
                "bg-gradient-to-r from-indigo-600 to-purple-600",
                "text-white font-medium text-sm",
                "shadow-lg shadow-indigo-500/25",
                "hover:shadow-xl hover:shadow-indigo-500/30",
                "transition-all duration-200"
              )}
            >
              {ActionIcon && <ActionIcon className="w-4 h-4" />}
              {action.label}
            </motion.button>
          )}

          {secondaryAction && (
            <button
              onClick={secondaryAction.onClick}
              className="px-4 py-2.5 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
            >
              {secondaryAction.label}
            </button>
          )}
        </motion.div>
      )}

      {/* Custom children */}
      {children}
    </motion.div>
  );
}

export default memo(EmptyStateEnhanced);

