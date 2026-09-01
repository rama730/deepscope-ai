"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import {
  ClipboardList,
  FolderOpen,
  MessageCircle,
  Users,
  CheckCircle2,
  TrendingUp
} from "lucide-react";
import { cn } from "@/lib/utils";

interface QuickStatsCardProps {
  tasksTotal: number;
  tasksCompleted: number;
  tasksPending: number;
  filesCount: number;
  chatMessagesCount: number;
  membersCount: number;
}

function QuickStatsCard({
  tasksTotal = 0,
  tasksCompleted = 0,
  tasksPending = 0,
  filesCount = 0,
  chatMessagesCount = 0,
  membersCount = 0,
}: QuickStatsCardProps) {
  const completionRate = tasksTotal > 0 ? Math.round((tasksCompleted / tasksTotal) * 100) : 0;

  const stats = [
    {
      label: "Tasks",
      value: `${tasksCompleted}/${tasksTotal}`,
      icon: ClipboardList,
      color: "text-indigo-600 dark:text-indigo-400",
      bgColor: "bg-indigo-50 dark:bg-indigo-900/20",
      borderColor: "border-indigo-200 dark:border-indigo-800/50",
      subLabel: `${tasksPending} pending`,
    },
    {
      label: "Completion",
      value: `${completionRate}%`,
      icon: CheckCircle2,
      color: "text-emerald-600 dark:text-emerald-400",
      bgColor: "bg-emerald-50 dark:bg-emerald-900/20",
      borderColor: "border-emerald-200 dark:border-emerald-800/50",
      subLabel: `${tasksCompleted} done`,
      showProgress: true,
      progressValue: completionRate,
    },
    {
      label: "Files",
      value: filesCount.toString(),
      icon: FolderOpen,
      color: "text-purple-600 dark:text-purple-400",
      bgColor: "bg-purple-50 dark:bg-purple-900/20",
      borderColor: "border-purple-200 dark:border-purple-800/50",
    },
    {
      label: "Messages",
      value: chatMessagesCount.toString(),
      icon: MessageCircle,
      color: "text-cyan-600 dark:text-cyan-400",
      bgColor: "bg-cyan-50 dark:bg-cyan-900/20",
      borderColor: "border-cyan-200 dark:border-cyan-800/50",
    },
    {
      label: "Members",
      value: membersCount.toString(),
      icon: Users,
      color: "text-amber-600 dark:text-amber-400",
      bgColor: "bg-amber-50 dark:bg-amber-900/20",
      borderColor: "border-amber-200 dark:border-amber-800/50",
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        "rounded-2xl overflow-hidden h-full",
        "bg-white dark:bg-zinc-900",
        "border border-zinc-200 dark:border-zinc-800",
        "shadow-sm hover:shadow-lg transition-shadow duration-300"
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-zinc-100 dark:border-zinc-800">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
          <TrendingUp className="w-4 h-4 text-white" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Quick Stats
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Project overview
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="p-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ scale: 1.02, y: -2 }}
                className={cn(
                  "relative p-3 rounded-xl border transition-all duration-200",
                  "hover:shadow-md",
                  stat.bgColor,
                  stat.borderColor
                )}
              >
                {/* Icon and label */}
                <div className="flex items-center gap-2 mb-2">
                  <div className={cn(
                    "w-7 h-7 rounded-lg flex items-center justify-center",
                    "bg-white/60 dark:bg-zinc-800/60"
                  )}>
                    <Icon className={cn("w-3.5 h-3.5", stat.color)} />
                  </div>
                  <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                    {stat.label}
                  </span>
                </div>

                {/* Value */}
                <div className={cn("text-xl font-bold", stat.color)}>
                  {stat.value}
                </div>

                {/* Sub label */}
                {stat.subLabel && (
                  <div className="text-xs text-zinc-500 dark:text-zinc-500 mt-1">
                    {stat.subLabel}
                  </div>
                )}

                {/* Progress bar for completion */}
                {stat.showProgress && (
                  <div className="mt-2 h-1.5 bg-white/60 dark:bg-zinc-800/60 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${stat.progressValue}%` }}
                      transition={{ delay: 0.5, duration: 0.8, ease: "easeOut" }}
                      className={cn(
                        "h-full rounded-full",
                        stat.progressValue >= 80
                          ? "bg-emerald-500"
                          : stat.progressValue >= 50
                            ? "bg-blue-500"
                            : stat.progressValue >= 20
                              ? "bg-amber-500"
                              : "bg-zinc-400"
                      )}
                    />
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}

export default memo(QuickStatsCard);
